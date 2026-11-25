/**
 * One-off guarded script: link existing candidates to the HR they selected at registration.
 *
 * Why: candidates who picked an HR while the dropdown/lookup was broken were stored with selected_hr / hr_name
 * (a name) but assigned_hr_id = NULL, so they never appear in that HR's panel.
 *
 * Rule: only when assigned_hr_id IS NULL and the stored HR name matches EXACTLY ONE active HR account
 * (case-insensitive, trimmed). Ambiguous or unknown names are left untouched for Super Admin assignment.
 *
 *   node backend/src/database/scripts/backfill_candidate_hr_assignment.js          # dry-run (ROLLBACK)
 *   node backend/src/database/scripts/backfill_candidate_hr_assignment.js --apply  # COMMIT
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const { getClient } = require('../../config/database');

const MATCH_SQL = `
  WITH hr AS (
    SELECT id, full_name, LOWER(TRIM(full_name)) AS norm
      FROM users
     WHERE UPPER(role::text) = 'HR' AND LOWER(status::text) = 'active' AND NULLIF(TRIM(full_name), '') IS NOT NULL
  ), unique_hr AS (
    SELECT norm, MIN(id::text)::uuid AS id, MIN(full_name) AS full_name
      FROM hr GROUP BY norm HAVING COUNT(*) = 1
  )
  SELECT ec.id AS candidate_id, ec.reference_code, ec.full_name AS candidate_name,
         COALESCE(NULLIF(TRIM(ec.selected_hr), ''), NULLIF(TRIM(ec.hr_name), '')) AS stored_hr_name,
         uh.id AS hr_user_id, uh.full_name AS hr_full_name
    FROM employee_candidates ec
    JOIN unique_hr uh
      ON uh.norm = LOWER(COALESCE(NULLIF(TRIM(ec.selected_hr), ''), NULLIF(TRIM(ec.hr_name), '')))
   WHERE ec.assigned_hr_id IS NULL
`;

(async () => {
  const apply = process.argv.includes('--apply');
  console.log(`[backfill_candidate_hr_assignment] Mode: ${apply ? 'APPLY (COMMIT)' : 'DRY-RUN (ROLLBACK)'}`);
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(MATCH_SQL);
    console.log(`Candidates to link: ${rows.length}`);
    rows.slice(0, 50).forEach((r) => console.log(` - ${r.reference_code || r.candidate_id} | ${r.candidate_name} -> ${r.hr_full_name}`));
    if (rows.length) {
      const res = await client.query(
        `UPDATE employee_candidates ec
            SET assigned_hr_id = m.hr_user_id, assigned_hr_name = m.hr_full_name
           FROM (${MATCH_SQL}) m
          WHERE ec.id = m.candidate_id AND ec.assigned_hr_id IS NULL`
      );
      console.log(`Rows updated: ${res.rowCount}`);
    }
    await client.query(apply ? 'COMMIT' : 'ROLLBACK');
    console.log(apply ? 'Committed.' : 'Rolled back (dry-run). Re-run with --apply to commit.');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Failed:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    process.exit();
  }
})();

