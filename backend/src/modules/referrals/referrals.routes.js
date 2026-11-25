const express = require('express');
const router = express.Router();
const { query, getClient } = require('../../config/database');
const jwtAuth = require('../../middleware/authentication/jwtAuth.middleware');
const roleCheck = require('../../middleware/authorization/role.middleware');
const { createNotification } = require('../notifications/service');
const { success, created, error, notFound } = require('../../utils/response/response');
const logger = require('../../config/logger');
const { listActiveHrAccounts } = require('../../services/hrDirectory.service');
const {
  ALLOWED_RELATIONSHIPS,
  normalizeIndianMobile,
  computeLinkStatus,
  computeRecruitmentStatus,
  mapReferralRow,
  summarizeReferrals
} = require('./referrals.service');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.use(jwtAuth);
router.use(roleCheck('EMPLOYEE', 'HR', 'ADMIN', 'SUPER_ADMIN'));

async function resolveCurrentEmployee(userId) {
  const { rows } = await query(
    `SELECT id, employee_id, full_name, mobile_number, user_id, referral_code FROM employees WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

const BASE_REFERRAL_SELECT = `
  SELECT
    r.id,
    r.referring_employee_id,
    r.candidate_name,
    r.mobile_number,
    r.relationship,
    COALESCE(r.assigned_hr_id, r.preferred_hr_id) AS preferred_hr_id,
    pref_hr.full_name AS preferred_hr_name,
    r.referral_code,
    ref_emp.full_name AS referring_employee_name,
    r.bonus_status AS db_bonus_status,
    r.bonus_credited_at,
    r.created_at,
    cand.id AS cand_id,
    cand.referred_by_employee_id AS cand_referred_by_employee_id,
    cand.hr_name AS cand_hr_name,
    cand.hr_reference AS cand_hr_reference,
    cand.interview_status AS cand_interview_status
  FROM employee_referrals r
  JOIN employees ref_emp ON ref_emp.id = r.referring_employee_id
  LEFT JOIN users pref_hr ON pref_hr.id = COALESCE(r.assigned_hr_id, r.preferred_hr_id)
  LEFT JOIN LATERAL (
    SELECT c.id, c.referred_by_employee_id, c.hr_name, c.hr_reference, c.interview_status
    FROM employee_candidates c
    WHERE RIGHT(REGEXP_REPLACE(COALESCE(c.mobile_number, ''), '\\D', '', 'g'), 10)
        = RIGHT(REGEXP_REPLACE(COALESCE(r.mobile_number, ''), '\\D', '', 'g'), 10)
    ORDER BY c.created_at DESC
    LIMIT 1
  ) cand ON TRUE
`;

// GET /api/v1/employee-referrals?search
// Combines manually added referrals (employee_referrals) and direct referral-link registrations
// (employee_candidates.referred_by_employee_id IS NOT NULL not already tracked in employee_referrals).
router.get('/', async (req, res, next) => {
  try {
    const userRole = String(req.user?.role || '').toUpperCase();
    const search = String(req.query.search || '').trim().slice(0, 100);

    const refConditions = ['1=1'];
    const candConditions = ['ec.referred_by_employee_id IS NOT NULL'];
    const params = [];

    if (userRole === 'EMPLOYEE') {
      const emp = await resolveCurrentEmployee(req.user.id);
      if (!emp) {
        return res.json({
          success: true,
          data: [],
          summary: { total: 0, verified: 0, inPipeline: 0, bonusEligible: 0, bonusCredited: 0 }
        });
      }
      params.push(emp.id);
      refConditions.push(`r.referring_employee_id = $${params.length}`);
      candConditions.push(`ec.referred_by_employee_id = $${params.length}`);
    } else if (userRole === 'HR') {
      params.push(req.user.id);
      refConditions.push(`COALESCE(r.assigned_hr_id, r.preferred_hr_id) = $${params.length}`);
      candConditions.push(`ec.assigned_hr_id = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      const idx = `$${params.length}`;
      refConditions.push(
        `(r.candidate_name ILIKE ${idx} OR r.mobile_number ILIKE ${idx} OR r.referral_code ILIKE ${idx} OR ref_emp.full_name ILIKE ${idx})`
      );
      candConditions.push(
        `(ec.full_name ILIKE ${idx} OR ec.mobile_number ILIKE ${idx} OR ec.reference_code ILIKE ${idx} OR e.employee_id ILIKE ${idx} OR e.full_name ILIKE ${idx})`
      );
    }

    const [manualRes, directCandRes] = await Promise.all([
      query(
        `${BASE_REFERRAL_SELECT}
         WHERE ${refConditions.join(' AND ')}
         ORDER BY r.created_at DESC
         LIMIT 500`,
        params
      ),
      query(
        `SELECT ec.id, ec.full_name AS candidate_name, ec.mobile_number, ec.interview_status,
                ec.assigned_hr_id, ec.assigned_hr_name, ec.created_at,
                ec.referred_by_employee_id, e.employee_id AS referral_code, e.full_name AS referring_employee_name
         FROM employee_candidates ec
         JOIN employees e ON e.id = ec.referred_by_employee_id
         WHERE ${candConditions.join(' AND ')}
           AND NOT EXISTS (
             SELECT 1 FROM employee_referrals r2
             WHERE r2.referring_employee_id = ec.referred_by_employee_id
               AND RIGHT(REGEXP_REPLACE(COALESCE(r2.mobile_number, ''), '\\D', '', 'g'), 10)
                 = RIGHT(REGEXP_REPLACE(COALESCE(ec.mobile_number, ''), '\\D', '', 'g'), 10)
           )
         ORDER BY ec.created_at DESC
         LIMIT 500`,
        params
      )
    ]);

    const manualRows = manualRes.rows.map((r) => ({
      ...mapReferralRow(r),
      created_at: r.created_at || null
    }));

    const seenKeys = new Set(
      manualRes.rows.map(
        (r) => `${r.referring_employee_id}:${normalizeIndianMobile(r.mobile_number) || r.mobile_number}`
      )
    );

    const directRows = [];
    for (const c of directCandRes.rows) {
      const key = `${c.referred_by_employee_id}:${normalizeIndianMobile(c.mobile_number) || c.mobile_number}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      const recruitmentStatus = computeRecruitmentStatus({
        cand_id: c.id,
        cand_interview_status: c.interview_status
      });

      directRows.push({
        id: c.id,
        candidate_name: c.candidate_name,
        mobile_number: c.mobile_number,
        relationship: 'Referral link',
        preferred_hr_id: c.assigned_hr_id || null,
        preferred_hr_name: c.assigned_hr_name || null,
        referral_code: c.referral_code,
        referring_employee_name: c.referring_employee_name,
        link_status: 'Verified',
        recruitment_status: recruitmentStatus,
        bonus_status: recruitmentStatus === 'Selected' ? 'eligible' : 'not_eligible',
        bonus_credited_at: null,
        created_at: c.created_at || null
      });
    }

    const data = [...manualRows, ...directRows].sort(
      (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
    const summary = summarizeReferrals(data);

    return res.json({ success: true, data, summary });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/employee-referrals/meta
router.get('/meta', async (req, res, next) => {
  try {
    const employee = await resolveCurrentEmployee(req.user.id);
    // Share the opaque hashed referral code — never expose the raw employee_id
    let referralCode = String(employee?.referral_code || '').trim();
    if (!referralCode && employee?.id) {
      const { createHash } = require('crypto');
      referralCode = 'REF-' + createHash('md5').update(`${employee.employee_id || ''}:${employee.user_id || employee.id}`).digest('hex').slice(0, 10).toUpperCase();
      await query(`UPDATE employees SET referral_code = $1 WHERE id = $2 AND referral_code IS NULL`, [referralCode, employee.id]).catch(() => {});
    }
    if (!referralCode) referralCode = String(req.user?.employee_id || '').trim();

    const hrRows = await listActiveHrAccounts().catch((e) => {
      logger.warn(`employee-referrals/meta hr list failed: ${e.message}`);
      return [];
    });

    const hrOptions = hrRows.map((hr) => ({
      id: hr.id,
      name: hr.full_name,
      full_name: hr.full_name
    }));

    return success(res, { referralCode, hrOptions });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/employee-referrals
router.post('/', roleCheck('EMPLOYEE'), async (req, res, next) => {
  try {
    const candidateName = String(req.body?.candidate_name || '').trim();
    const rawMobile = req.body?.mobile_number;
    const relationship = String(req.body?.relationship || '').trim();
    const rawPreferredHr = String(req.body?.preferred_hr_id || '').trim();

    if (!candidateName || candidateName.length > 100) {
      return error(res, 'Candidate name is required (max 100 characters)', 400);
    }

    const cleanMobile = normalizeIndianMobile(rawMobile);
    if (!cleanMobile) {
      return error(res, 'Please enter a valid 10-digit Indian mobile number', 400);
    }

    if (!ALLOWED_RELATIONSHIPS.includes(relationship)) {
      return error(res, `Relationship must be one of: ${ALLOWED_RELATIONSHIPS.join(', ')}`, 400);
    }

    const emp = await resolveCurrentEmployee(req.user.id);
    if (!emp) {
      return error(res, 'Employee profile record not found', 404);
    }

    const ownEmpMobile = normalizeIndianMobile(emp.mobile_number);
    const ownUserMobile = normalizeIndianMobile(req.user.mobile);
    if (cleanMobile === ownEmpMobile || cleanMobile === ownUserMobile) {
      return error(res, 'You cannot refer your own mobile number', 400);
    }

    let preferredHrUuid = null;
    if (rawPreferredHr && !['unassigned', 'other'].includes(rawPreferredHr.toLowerCase())) {
      if (!UUID_REGEX.test(rawPreferredHr)) {
        return error(res, 'Invalid HR representative selected', 400);
      }
      const { rows: hrCheck } = await query(
        `SELECT id FROM users WHERE id = $1 AND UPPER(role) = 'HR' AND status = 'active' LIMIT 1`,
        [rawPreferredHr]
      );
      if (hrCheck.length === 0) {
        return error(res, 'Selected HR representative is invalid or inactive', 400);
      }
      preferredHrUuid = hrCheck[0].id;
    }

    const { rows: dupRows } = await query(
      `SELECT id FROM employee_referrals WHERE referring_employee_id = $1 AND mobile_number = $2 LIMIT 1`,
      [emp.id, cleanMobile]
    );
    if (dupRows.length > 0) {
      return error(res, 'You have already referred a candidate with this mobile number', 409);
    }

    const { rows: inserted } = await query(
      `INSERT INTO employee_referrals
         (referring_employee_id, candidate_name, mobile_number, relationship, preferred_hr_id, assigned_hr_id, referral_code, bonus_status)
       VALUES ($1, $2, $3, $4, $5, $5, $6, 'pending')
       RETURNING id, candidate_name, mobile_number, relationship, preferred_hr_id, referral_code, bonus_status, created_at`,
      [emp.id, candidateName, cleanMobile, relationship, preferredHrUuid, emp.referral_code || emp.employee_id]
    );

    if (preferredHrUuid) {
      createNotification(
        preferredHrUuid,
        'New Employee Referral Assigned',
        `${emp.full_name || emp.employee_id} referred ${candidateName} (${cleanMobile}).`,
        'info',
        '/hr/referrals',
        { category: 'hr' }
      ).catch((nErr) => logger.warn('[REFERRALS] HR notification failed:', nErr.message));
    }

    return created(res, inserted[0], 'Referral saved successfully');
  } catch (err) {
    next(err);
  }
});

// Helper: materialize an employee_referrals row when Super Admin acts on a direct link-registered candidate
async function materializeDirectCandidateReferral(client, candidateId) {
  const { rows: candRows } = await client.query(
    `SELECT ec.id, ec.full_name, ec.mobile_number, ec.referred_by_employee_id,
            ec.assigned_hr_id, e.employee_id AS referral_code
     FROM employee_candidates ec
     JOIN employees e ON e.id = ec.referred_by_employee_id
     WHERE ec.id = $1 AND ec.referred_by_employee_id IS NOT NULL
     LIMIT 1`,
    [candidateId]
  );
  if (candRows.length === 0) return null;

  const cand = candRows[0];
  const normalizedMob = normalizeIndianMobile(cand.mobile_number) || String(cand.mobile_number).trim();
  const { rows: upserted } = await client.query(
    `INSERT INTO employee_referrals
       (referring_employee_id, candidate_name, mobile_number, relationship, preferred_hr_id, assigned_hr_id, referral_code, bonus_status)
     VALUES ($1, $2, $3, 'Referral link', $4, $4, $5, 'pending')
     ON CONFLICT (referring_employee_id, mobile_number) DO UPDATE
       SET updated_at = NOW()
     RETURNING *`,
    [cand.referred_by_employee_id, cand.full_name, normalizedMob, cand.assigned_hr_id || null, cand.referral_code]
  );
  return upserted[0] || null;
}

// POST /api/v1/employee-referrals/:id/assign (SUPER_ADMIN)
router.post('/:id/assign', roleCheck('SUPER_ADMIN'), async (req, res, next) => {
  const referralId = String(req.params.id || '').trim();
  if (!UUID_REGEX.test(referralId)) {
    return error(res, 'Invalid referral ID', 400);
  }

  const hrId = String(req.body?.preferred_hr_id || req.body?.assigned_hr_id || req.body?.hr_id || '').trim();
  if (!UUID_REGEX.test(hrId)) {
    return error(res, 'Valid HR ID is required', 400);
  }

  let client = null;
  try {
    const { rows: hrRows } = await query(
      `SELECT id, full_name FROM users WHERE id = $1 AND UPPER(role) = 'HR' AND status = 'active' LIMIT 1`,
      [hrId]
    );
    if (hrRows.length === 0) {
      return error(res, 'Selected HR representative is invalid or inactive', 400);
    }

    client = await getClient();
    await client.query('BEGIN');

    let targetId = referralId;
    const { rows: existing } = await client.query(
      `SELECT id FROM employee_referrals WHERE id = $1 FOR UPDATE`,
      [referralId]
    );
    if (existing.length === 0) {
      const materialized = await materializeDirectCandidateReferral(client, referralId);
      if (!materialized) {
        await client.query('ROLLBACK');
        return notFound(res, 'Referral record not found');
      }
      targetId = materialized.id;
      await client.query(
        `UPDATE employee_candidates
         SET assigned_hr_id = COALESCE(assigned_hr_id, $2),
             assigned_hr_name = COALESCE(assigned_hr_name, $3),
             hr_name = COALESCE(hr_name, $3)
         WHERE id = $1`,
        [referralId, hrId, hrRows[0].full_name]
      );
    }

    const { rows } = await client.query(
      `UPDATE employee_referrals
       SET preferred_hr_id = $2, assigned_hr_id = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING id, candidate_name, preferred_hr_id, assigned_hr_id`,
      [targetId, hrId]
    );

    await client.query('COMMIT');

    createNotification(
      hrId,
      'Referral Assigned to You',
      `Super Admin assigned candidate referral ${rows[0].candidate_name} to you.`,
      'info',
      '/hr/referrals',
      { category: 'hr' }
    ).catch((nErr) => logger.warn('[REFERRALS] Assign HR notification failed:', nErr.message));

    return success(res, { ...rows[0], preferred_hr_name: hrRows[0].full_name }, 'Referral assigned to HR');
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    if (client) client.release();
  }
});

// POST /api/v1/employee-referrals/:id/bonus-credit (SUPER_ADMIN only, idempotent, row-locked, status-only)
router.post('/:id/bonus-credit', roleCheck('SUPER_ADMIN'), async (req, res, next) => {
  const referralId = String(req.params.id || '').trim();
  if (!UUID_REGEX.test(referralId)) {
    return error(res, 'Invalid referral ID', 400);
  }

  let client = null;
  try {
    client = await getClient();
    await client.query('BEGIN');

    let { rows: lockedRows } = await client.query(
      `SELECT r.*, e.user_id AS emp_user_id
       FROM employee_referrals r
       JOIN employees e ON e.id = r.referring_employee_id
       WHERE r.id = $1
       FOR UPDATE OF r`,
      [referralId]
    );

    if (lockedRows.length === 0) {
      const materialized = await materializeDirectCandidateReferral(client, referralId);
      if (materialized) {
        const reLocked = await client.query(
          `SELECT r.*, e.user_id AS emp_user_id
           FROM employee_referrals r
           JOIN employees e ON e.id = r.referring_employee_id
           WHERE r.id = $1
           FOR UPDATE OF r`,
          [materialized.id]
        );
        lockedRows = reLocked.rows;
      }
    }

    if (lockedRows.length === 0) {
      await client.query('ROLLBACK');
      return notFound(res, 'Referral record not found');
    }

    const referral = lockedRows[0];

    if (String(referral.bonus_status || '').toLowerCase() === 'credited') {
      await client.query('COMMIT');
      return success(
        res,
        {
          id: referral.id,
          bonus_status: 'credited',
          bonus_credited_at: referral.bonus_credited_at,
          already_credited: true
        },
        'Referral bonus already marked as credited'
      );
    }

    // Verify eligibility inside transaction
    const { rows: candRows } = await client.query(
      `SELECT c.id AS cand_id, c.referred_by_employee_id AS cand_referred_by_employee_id,
              c.hr_name AS cand_hr_name, c.hr_reference AS cand_hr_reference,
              c.interview_status AS cand_interview_status
       FROM employee_candidates c
       WHERE RIGHT(REGEXP_REPLACE(COALESCE(c.mobile_number, ''), '\\D', '', 'g'), 10)
           = RIGHT(REGEXP_REPLACE(COALESCE($1, ''), '\\D', '', 'g'), 10)
       ORDER BY c.created_at DESC
       LIMIT 1`,
      [referral.mobile_number]
    );

    const cand = candRows[0] || {};
    const combinedRow = { ...referral, ...cand };
    const linkStatus = computeLinkStatus(combinedRow);
    const recruitmentStatus = computeRecruitmentStatus(combinedRow);

    if (linkStatus !== 'Verified' || recruitmentStatus !== 'Selected') {
      await client.query('ROLLBACK');
      return error(res, 'Referral is not eligible for bonus credit yet', 400);
    }

    const { rows: updatedRows } = await client.query(
      `UPDATE employee_referrals
       SET bonus_status = 'credited',
           bonus_credited_at = NOW(),
           bonus_credited_by = $2,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, bonus_status, bonus_credited_at, bonus_credited_by`,
      [referral.id, req.user.id]
    );

    await client.query(
      `INSERT INTO audit_logs (user_id, role, module, action, old_data, new_data, ip, device)
       VALUES ($1, $2, 'employee_referrals', 'BONUS_MANUALLY_CREDITED', $3, $4, $5, $6)`,
      [
        req.user.id,
        req.user.role,
        JSON.stringify({ id: referral.id, bonus_status: referral.bonus_status }),
        JSON.stringify({ id: referral.id, bonus_status: 'credited', note: 'Manual ₹1,000 bonus status recorded (no wallet/payroll txn)' }),
        req.ip || null,
        req.headers['user-agent'] || null
      ]
    );

    await client.query('COMMIT');

    if (referral.emp_user_id) {
      createNotification(
        referral.emp_user_id,
        'Referral Bonus Marked Credited',
        `Your ₹1,000 referral bonus for ${referral.candidate_name} was marked manually credited.`,
        'success',
        '/employee/referrals',
        { category: 'referrals' }
      ).catch((nErr) => logger.warn('[REFERRALS] Employee bonus notification failed:', nErr.message));
    }

    return success(res, updatedRows[0], 'Referral bonus marked as manually credited');
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    if (client) client.release();
  }
});

module.exports = router;
