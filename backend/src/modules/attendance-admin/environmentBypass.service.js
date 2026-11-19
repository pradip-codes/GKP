const { query } = require('../../config/database');
const logger = require('../../config/logger');
const { logAction } = require('../admin/audit.service');

// Helper to safely ensure environment_bypass_approvals table exists
const ensureBypassTableExists = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS environment_bypass_approvals (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        approved_by UUID NOT NULL REFERENCES users(id),
        bypass_reason TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        bypass_start_date DATE,
        bypass_end_date DATE,
        bypass_location BOOLEAN DEFAULT TRUE,
        bypass_face BOOLEAN DEFAULT FALSE,
        bypass_type VARCHAR(50) DEFAULT 'LOCATION',
        status VARCHAR(20) DEFAULT 'APPROVED',
        approved_at TIMESTAMPTZ DEFAULT NOW(),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await query(`
      ALTER TABLE environment_bypass_approvals
        ADD COLUMN IF NOT EXISTS bypass_start_date DATE,
        ADD COLUMN IF NOT EXISTS bypass_end_date DATE,
        ADD COLUMN IF NOT EXISTS bypass_location BOOLEAN DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS bypass_face BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS bypass_type VARCHAR(50) DEFAULT 'LOCATION',
        ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'APPROVED',
        ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
    `).catch(() => {});
    return true;
  } catch (err) {
    logger.warn('environment_bypass_approvals table check/create warning:', err.message);
    return false;
  }
};

/**
 * 1. Create Controlled Environment / Verification Bypass Approval
 * Strictly enforces that Super Admin / Admin cannot approve an exemption for themselves.
 */
const createEnvironmentBypass = async ({
  employeeId,
  bypassReason,
  startDate,
  endDate,
  bypassLocation = true,
  bypassFace = false,
  bypassType,
  reqUser
}) => {
  await ensureBypassTableExists();

  if (!employeeId) {
    const error = new Error('employeeId is required');
    error.statusCode = 400;
    throw error;
  }

  const reason = (bypassReason && String(bypassReason).trim()) ? String(bypassReason).trim() : 'Super Admin verification exemption';

  const todayStr = new Date().toISOString().split('T')[0];
  const sDate = startDate || todayStr;
  const eDate = endDate || sDate;

  const startD = new Date(sDate);
  const endD = new Date(eDate);
  if (isNaN(startD.getTime()) || isNaN(endD.getTime()) || endD < startD) {
    const error = new Error('Invalid start_date or end_date range');
    error.statusCode = 400;
    throw error;
  }

  const adminUserId = reqUser?.id || reqUser?.userId;

  // 1. Resolve Target Employee
  const { rows: [targetEmp] } = await query(
    `SELECT id, user_id, full_name, employee_id AS employee_code FROM employees WHERE (id::text = $1 OR employee_id = $1) AND employee_status != 'TERMINATED' LIMIT 1`,
    [employeeId]
  );

  if (!targetEmp) {
    const error = new Error('Target employee record not found or terminated');
    error.statusCode = 404;
    throw error;
  }

  // 2. Resolve Admin's Employee Profile (if any)
  let adminEmp = null;
  if (adminUserId) {
    const { rows: [aEmp] } = await query(
      `SELECT id FROM employees WHERE user_id = $1 LIMIT 1`,
      [adminUserId]
    );
    adminEmp = aEmp;
  }

  // 3. STRICT NON-SELF-APPROVAL ENFORCEMENT
  const isSelfUserMatch = adminUserId && targetEmp.user_id && String(targetEmp.user_id) === String(adminUserId);
  const isSelfEmployeeMatch = adminEmp && String(adminEmp.id) === String(targetEmp.id);

  if (isSelfUserMatch || isSelfEmployeeMatch) {
    const error = new Error('Self-approval violation: Administrators are strictly forbidden from approving an exemption for themselves.');
    error.statusCode = 403;
    throw error;
  }

  // Determine bypass flags
  const locBypass = Boolean(bypassLocation);
  const faceBypass = Boolean(bypassFace);
  let resolvedType = bypassType;
  if (!resolvedType) {
    if (locBypass && faceBypass) resolvedType = 'BOTH';
    else if (faceBypass) resolvedType = 'FACE';
    else resolvedType = 'LOCATION';
  }

  // Deactivate prior active bypass for this employee so only the latest is active
  await query(
    `UPDATE environment_bypass_approvals 
     SET is_active = FALSE, updated_at = NOW() 
     WHERE employee_id = $1 AND is_active = TRUE`,
    [targetEmp.id]
  );

  // 4. Create Bypass Record
  const { rows: [bypass] } = await query(
    `INSERT INTO environment_bypass_approvals 
     (employee_id, approved_by, bypass_reason, start_date, end_date, bypass_start_date, bypass_end_date, bypass_location, bypass_face, bypass_type, is_active, status, approved_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $4, $5, $6, $7, $8, TRUE, 'APPROVED', NOW(), NOW(), NOW())
     RETURNING *`,
    [targetEmp.id, adminUserId, reason, sDate, eDate, locBypass, faceBypass, resolvedType]
  );

  await logAction(reqUser, 'ATTENDANCE_ENVIRONMENT_BYPASS_CREATED', targetEmp.id, {
    bypass_id: bypass.id,
    employee_code: targetEmp.employee_code,
    approved_by_user_id: adminUserId,
    reason: reason,
    start_date: sDate,
    end_date: eDate,
    bypass_location: locBypass,
    bypass_face: faceBypass,
    bypass_type: resolvedType
  });

  logger.info(`[VERIFICATION EXEMPTION] Admin ${adminUserId} created ${resolvedType} exemption for employee ${targetEmp.id} (${sDate} to ${eDate}) - Location: ${locBypass}, Face: ${faceBypass}`);

  return bypass;
};

/**
 * 2. Check if active environment bypass exists for employee today
 */
const getEnvironmentBypassStatus = async (employeeId) => {
  await ensureBypassTableExists();

  if (!employeeId) return { hasBypass: false };

  const { rows: [activeBypass] } = await query(
    `SELECT b.*, u.full_name AS approver_name
     FROM environment_bypass_approvals b
     LEFT JOIN users u ON u.id = b.approved_by
     WHERE (b.employee_id = $1::uuid OR b.employee_id IN (SELECT id FROM employees WHERE employee_id = $1::text))
       AND b.is_active = TRUE
       AND (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE BETWEEN b.start_date AND b.end_date
     ORDER BY b.created_at DESC LIMIT 1`,
    [employeeId]
  );

  if (activeBypass) {
    return {
      hasBypass: true,
      bypassLocation: activeBypass.bypass_location !== false,
      bypassFace: Boolean(activeBypass.bypass_face),
      bypassType: activeBypass.bypass_type || (activeBypass.bypass_face ? 'BOTH' : 'LOCATION'),
      startDate: activeBypass.start_date,
      endDate: activeBypass.end_date,
      reason: activeBypass.bypass_reason,
      bypassRecord: activeBypass
    };
  }

  return { 
    hasBypass: false,
    bypassLocation: false,
    bypassFace: false,
    bypassType: null
  };
};

  if (activeBypass) {
    return {
      hasBypass: true,
      bypassRecord: activeBypass
    };
  }

  return { hasBypass: false };
};

/**
 * 3. List Environment Bypasses with Pagination
 */
const listEnvironmentBypasses = async ({ page = 1, limit = 20, employeeId, activeOnly = false }) => {
  await ensureBypassTableExists();

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const params = [];
  let paramIdx = 1;
  let whereClause = `WHERE 1=1`;

  if (employeeId) {
    whereClause += ` AND (b.employee_id = $${paramIdx} OR e.employee_id = $${paramIdx})`;
    params.push(employeeId);
    paramIdx++;
  }

  if (activeOnly) {
    whereClause += ` AND b.is_active = TRUE AND (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE BETWEEN b.start_date AND b.end_date`;
  }

  const countQuery = `
    SELECT COUNT(b.id)::INT AS total
    FROM environment_bypass_approvals b
    JOIN employees e ON e.id = b.employee_id
    ${whereClause}
  `;
  const { rows: [countRow] } = await query(countQuery, params);
  const totalRecords = countRow ? countRow.total : 0;

  const listParams = [...params, limitNum, offset];
  const listQuery = `
    SELECT 
      b.*,
      e.employee_id AS employee_code,
      e.full_name AS employee_name,
      e.department,
      u.full_name AS approver_name,
      u.email AS approver_email
    FROM environment_bypass_approvals b
    JOIN employees e ON e.id = b.employee_id
    LEFT JOIN users u ON u.id = b.approved_by
    ${whereClause}
    ORDER BY b.created_at DESC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;

  const { rows: records } = await query(listQuery, listParams);

  return {
    pagination: {
      totalRecords,
      currentPage: pageNum,
      totalPages: Math.ceil(totalRecords / limitNum) || 1,
      limit: limitNum
    },
    records
  };
};

/**
 * 4. Revoke / Deactivate Environment Bypass
 */
const revokeEnvironmentBypass = async ({ bypassId, reqUser }) => {
  await ensureBypassTableExists();

  const { rows: [existing] } = await query(
    `SELECT * FROM environment_bypass_approvals WHERE id = $1 LIMIT 1`,
    [bypassId]
  );

  if (!existing) {
    const error = new Error('Bypass approval record not found');
    error.statusCode = 404;
    throw error;
  }

  const { rows: [updated] } = await query(
    `UPDATE environment_bypass_approvals
     SET is_active = FALSE, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [bypassId]
  );

  await logAction(reqUser, 'ATTENDANCE_ENVIRONMENT_BYPASS_REVOKED', existing.employee_id, {
    bypass_id: bypassId,
    revoked_by: reqUser.id
  });

  return updated;
};

module.exports = {
  createEnvironmentBypass,
  getEnvironmentBypassStatus,
  listEnvironmentBypasses,
  revokeEnvironmentBypass
};
