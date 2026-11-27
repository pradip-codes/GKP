const { pool } = require('../../config/database');
const logger = require('../../config/logger');

const normalizeMobile10 = (m) => {
  const d = String(m || '').replace(/\D/g, '');
  return d.length >= 10 ? d.slice(-10) : '';
};

const normalizeEmail = (e) => {
  const s = String(e || '').trim().toLowerCase();
  if (!s || s.endsWith('@gharkapaisa.internal') || s.endsWith('@internal.local')) return '';
  return s;
};

/**
 * Safely merge duplicate non-terminated `employees` rows that belong to the same person
 * (matching `user_id`, normalized 10-digit `mobile_number`, or non-internal `email_id`),
 * re-pointing attendance/tasks/child records onto the canonical row.
 * Idempotent - safe to run many times.
 */
async function migrateDeduplicateEmployees() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: allRows } = await client.query(`
      SELECT
        e.id,
        e.employee_id,
        e.user_id,
        e.candidate_id,
        e.full_name,
        e.mobile_number,
        e.email_id,
        e.employee_status,
        e.created_at,
        (SELECT COUNT(*)::INT FROM employee_attendance a WHERE a.employee_id = e.id) AS att_count,
        (SELECT COUNT(*)::INT FROM employee_tasks t WHERE t.employee_id = e.id) AS task_count
      FROM employees e
      WHERE e.employee_status != 'TERMINATED'
    `);

    if (!allRows.length) {
      await client.query('COMMIT');
      logger.info('migrate_deduplicate_employees: no active employees');
      return { mergedGroups: 0, removedRows: 0 };
    }

    // Disjoint-set (Union-Find) so transitive matches (same user_id, phone, or email) group cleanly
    const parent = allRows.map((_, i) => i);
    const find = (i) => {
      while (parent[i] !== i) {
        parent[i] = parent[parent[i]];
        i = parent[i];
      }
      return i;
    };
    const union = (a, b) => {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) parent[rb] = ra;
    };

    const byUser = new Map();
    const byPhone = new Map();
    const byEmail = new Map();

    allRows.forEach((row, idx) => {
      if (row.user_id) {
        if (byUser.has(row.user_id)) union(byUser.get(row.user_id), idx);
        else byUser.set(row.user_id, idx);
      }
      const phone10 = normalizeMobile10(row.mobile_number);
      if (phone10) {
        if (byPhone.has(phone10)) union(byPhone.get(phone10), idx);
        else byPhone.set(phone10, idx);
      }
      const email = normalizeEmail(row.email_id);
      if (email) {
        if (byEmail.has(email)) union(byEmail.get(email), idx);
        else byEmail.set(email, idx);
      }
    });

    const groups = new Map();
    allRows.forEach((row, idx) => {
      const root = find(idx);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root).push(row);
    });

    const dupGroups = Array.from(groups.values()).filter((g) => g.length > 1);
    let mergedGroups = 0;
    let removedRows = 0;

    // Rank canonical row: official code > ACTIVE status > most attendance/tasks > oldest
    const rankRow = (r) => {
      const code = String(r.employee_id || '');
      const statusRank = r.employee_status === 'ACTIVE' ? 0 : (r.employee_status === 'ONBOARDING' ? 1 : 2);
      const codeRank = /^CAND/i.test(code) ? 0 : (/^EMP/i.test(code) ? 1 : (/^(ADM|HR|SA|YOH-)/i.test(code) ? 2 : 3));
      const hasActivity = (Number(r.att_count || 0) + Number(r.task_count || 0)) > 0 ? 0 : 1;
      const createdTs = r.created_at ? new Date(r.created_at).getTime() : Number.MAX_SAFE_INTEGER;
      return [statusRank, codeRank, hasActivity, -(Number(r.att_count || 0) + Number(r.task_count || 0)), createdTs, String(r.id)];
    };

    const compareRank = (a, b) => {
      const ra = rankRow(a);
      const rb = rankRow(b);
      for (let i = 0; i < ra.length; i++) {
        if (ra[i] < rb[i]) return -1;
        if (ra[i] > rb[i]) return 1;
      }
      return 0;
    };

    const safeExec = async (spName, sql, params) => {
      await client.query(`SAVEPOINT ${spName}`);
      try {
        await client.query(sql, params);
        await client.query(`RELEASE SAVEPOINT ${spName}`);
      } catch (err) {
        await client.query(`ROLLBACK TO SAVEPOINT ${spName}`);
        await client.query(`RELEASE SAVEPOINT ${spName}`);
      }
    };

    const oneToOneTables = [
      'employee_onboarding_checklist',
      'employee_joining_details',
      'employee_kyc',
      'employee_terms_acceptance',
      'employee_biometrics',
      'employee_face_profiles',
    ];

    const manyTables = [
      'employee_tasks',
      'employee_documents',
      'employee_product_links',
      'employee_incentive_transactions',
      'employee_penalties',
      'attendance_exemptions',
      'attendance_environment_bypasses',
      'employee_attendance_audit_logs',
      'employee_salary_structures',
      'employee_payslips',
      'applications',
    ];

    for (const group of dupGroups) {
      const sorted = [...group].sort(compareRank);
      const canonical = sorted[0];
      const duplicates = sorted.slice(1);
      mergedGroups++;

      for (const dup of duplicates) {
        // 1. Merge attendance records cleanly without violating (employee_id, attendance_date) unique key
        await safeExec(
          'sp_att_del',
          `DELETE FROM employee_attendance d
           WHERE d.employee_id = $1
             AND EXISTS (SELECT 1 FROM employee_attendance k WHERE k.employee_id = $2 AND k.attendance_date = d.attendance_date)`,
          [dup.id, canonical.id]
        );
        await safeExec(
          'sp_att_upd',
          `UPDATE employee_attendance SET employee_id = $2 WHERE employee_id = $1`,
          [dup.id, canonical.id]
        );

        // 2. Merge 1-to-1 profile/onboarding tables
        for (let i = 0; i < oneToOneTables.length; i++) {
          const tbl = oneToOneTables[i];
          await safeExec(
            `sp_one_upd_${i}`,
            `UPDATE ${tbl} SET employee_id = $2 WHERE employee_id = $1 AND NOT EXISTS (SELECT 1 FROM ${tbl} k WHERE k.employee_id = $2)`,
            [dup.id, canonical.id]
          );
          await safeExec(
            `sp_one_del_${i}`,
            `DELETE FROM ${tbl} WHERE employee_id = $1`,
            [dup.id]
          );
        }

        // 3. Re-point 1-to-many tables
        for (let i = 0; i < manyTables.length; i++) {
          const tbl = manyTables[i];
          await safeExec(
            `sp_many_${i}`,
            `UPDATE ${tbl} SET employee_id = $2 WHERE employee_id = $1`,
            [dup.id, canonical.id]
          );
        }

        // 4. Re-point hierarchy columns
        await safeExec('sp_hier_emp', `UPDATE employee_hierarchy SET employee_id = $2 WHERE employee_id = $1 AND NOT EXISTS (SELECT 1 FROM employee_hierarchy k WHERE k.employee_id = $2)`, [dup.id, canonical.id]);
        await safeExec('sp_hier_tl', `UPDATE employee_hierarchy SET team_leader_id = $2 WHERE team_leader_id = $1`, [dup.id, canonical.id]);
        await safeExec('sp_hier_mgr', `UPDATE employee_hierarchy SET manager_id = $2 WHERE manager_id = $1`, [dup.id, canonical.id]);
        await safeExec('sp_hier_sm', `UPDATE employee_hierarchy SET senior_manager_id = $2 WHERE senior_manager_id = $1`, [dup.id, canonical.id]);
        await safeExec('sp_hier_bh', `UPDATE employee_hierarchy SET branch_head_id = $2 WHERE branch_head_id = $1`, [dup.id, canonical.id]);
        await safeExec('sp_hier_del', `DELETE FROM employee_hierarchy WHERE employee_id = $1`, [dup.id]);

        // 5. Remove duplicate row and backfill any missing link fields on canonical row
        await client.query(`DELETE FROM employees WHERE id = $1`, [dup.id]);
        if (!canonical.user_id && dup.user_id) canonical.user_id = dup.user_id;
        if (!canonical.candidate_id && dup.candidate_id) canonical.candidate_id = dup.candidate_id;
        removedRows++;
      }

      if (canonical.user_id || canonical.candidate_id) {
        await safeExec(
          'sp_backfill_emp',
          `UPDATE employees SET user_id = COALESCE(user_id, $2), candidate_id = COALESCE(candidate_id, $3) WHERE id = $1`,
          [canonical.id, canonical.user_id || null, canonical.candidate_id || null]
        );
      }
    }

    await client.query('COMMIT');
    logger.info(`migrate_deduplicate_employees: merged ${mergedGroups} group(s), removed ${removedRows} duplicate row(s)`);
    return { mergedGroups, removedRows };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error('migrate_deduplicate_employees failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { migrateDeduplicateEmployees };

if (require.main === module) {
  migrateDeduplicateEmployees()
    .then(() => process.exit(0))
    .catch((e) => { console.error(e); process.exit(1); });
}
