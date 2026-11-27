const { query } = require('../../config/database');
const logger = require('../../config/logger');

const isValidUuid = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

/**
 * Normalize a phone string to its last 10 digits when possible.
 */
const normalizeMobile10 = (mobile) => {
  const digits = String(mobile || '').replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : '';
};

const CANONICAL_EMP_ORDER = `
  ORDER BY
    CASE WHEN employee_status = 'ACTIVE' THEN 0 WHEN employee_status != 'TERMINATED' THEN 1 ELSE 2 END,
    CASE WHEN employee_id ~ '^CAND' THEN 0 WHEN employee_id ~ '^EMP' THEN 1 ELSE 2 END,
    created_at ASC NULLS LAST,
    id ASC
`;

/**
 * Robust helper to resolve employee UUID from reqUser or user_id mapping.
 * Handles Admin, HR, Super Admin, Operators, and Employees.
 * Automatically provisions an active employees profile for staff who do not have one yet.
 */
const resolveEmployeeId = async (reqUser) => {
  if (!reqUser) return null;

  // 1. Authoritative: resolve employee by authenticated user_id
  if (reqUser.id && isValidUuid(reqUser.id)) {
    try {
      const { rows: [emp] } = await query(
        `SELECT id FROM employees WHERE user_id = $1 AND employee_status != 'TERMINATED' ${CANONICAL_EMP_ORDER} LIMIT 1`,
        [reqUser.id]
      );
      if (emp && isValidUuid(emp.id)) return emp.id;
    } catch (e) {
      logger.error('Error looking up employee by user_id:', e.message);
    }
  }

  const candidate = reqUser.employeeId || reqUser.employee_id || reqUser.employee_code || reqUser.emp_code;

  // 2. If candidate is already a valid UUID format and exists in employees table, return it
  if (candidate && isValidUuid(candidate)) {
    try {
      const { rows: [emp] } = await query(
        `SELECT id FROM employees WHERE id = $1 LIMIT 1`,
        [candidate]
      );
      if (emp && isValidUuid(emp.id)) return emp.id;
    } catch (e) {
      logger.error('Error looking up employee by candidate UUID:', e.message);
    }
  }

  // 3. If candidate string code like "CAND10001" or "EMP1001", query employee_id explicitly
  if (candidate && typeof candidate === 'string') {
    try {
      const cleanCandidate = candidate.trim();
      const { rows: [emp] } = await query(
        `SELECT id FROM employees WHERE (employee_id = $1 OR candidate_id::text = $1) AND employee_status != 'TERMINATED' ${CANONICAL_EMP_ORDER} LIMIT 1`,
        [cleanCandidate]
      );
      if (emp && isValidUuid(emp.id)) return emp.id;
    } catch (e) {
      logger.error('Error resolving employee code to UUID:', e.message);
    }
  }

  // 4. Fallback: try to resolve employee by normalized mobile or email
  const userMobile = String(reqUser.mobile || reqUser.mobile_number || reqUser.phone || '').trim();
  const userMobile10 = normalizeMobile10(userMobile);
  const userEmail = (reqUser.email || reqUser.email_id || '').toLowerCase().trim();

  if (userMobile || userMobile10 || userEmail) {
    try {
      const { rows: [emp] } = await query(
        `SELECT id, user_id
         FROM employees
         WHERE employee_status != 'TERMINATED'
           AND (
             (mobile_number = $1 AND $1 != '')
             OR ($2 != '' AND LENGTH(REGEXP_REPLACE(COALESCE(mobile_number, ''), '[^0-9]', '', 'g')) >= 10 AND RIGHT(REGEXP_REPLACE(COALESCE(mobile_number, ''), '[^0-9]', '', 'g'), 10) = $2)
             OR (email_id IS NOT NULL AND email_id != '' AND LOWER(TRIM(email_id)) = $3 AND $3 != '')
           )
         ${CANONICAL_EMP_ORDER}
         LIMIT 1`,
        [userMobile, userMobile10, userEmail]
      );
      if (emp && isValidUuid(emp.id)) {
        if (reqUser.id && isValidUuid(reqUser.id) && emp.user_id !== reqUser.id) {
          await query(`UPDATE employees SET user_id = $1 WHERE id = $2 AND (user_id IS NULL OR user_id = $1)`, [reqUser.id, emp.id]).catch(() => {});
        }
        return emp.id;
      }
    } catch (e) {
      logger.error('Error looking up employee by contact info:', e.message);
    }
  }

  // 5. Auto-provisioning / linking fallback for Admin, HR, Super Admin, and Operator staff
  if (reqUser.id && isValidUuid(reqUser.id)) {
    try {
      const { rows: [userRow] } = await query(
        `SELECT id, email, mobile, full_name, role, designation FROM users WHERE id = $1 LIMIT 1`,
        [reqUser.id]
      );
      if (userRow) {
        const effectiveMobile = String(userRow.mobile || userMobile || '').trim();
        const effectiveMobile10 = normalizeMobile10(effectiveMobile);
        const effectiveEmail = (userRow.email || userEmail || '').toLowerCase().trim();

        // Check again if employee record already exists with matching user_id, normalized mobile, or email
        const { rows: [existingEmp] } = await query(
          `SELECT id, user_id
           FROM employees
           WHERE employee_status != 'TERMINATED'
             AND (
               user_id = $1
               OR (mobile_number = $2 AND $2 != '')
               OR ($3 != '' AND LENGTH(REGEXP_REPLACE(COALESCE(mobile_number, ''), '[^0-9]', '', 'g')) >= 10 AND RIGHT(REGEXP_REPLACE(COALESCE(mobile_number, ''), '[^0-9]', '', 'g'), 10) = $3)
               OR (email_id IS NOT NULL AND email_id != '' AND LOWER(TRIM(email_id)) = $4 AND $4 != '')
             )
           ${CANONICAL_EMP_ORDER}
           LIMIT 1`,
          [userRow.id, effectiveMobile, effectiveMobile10, effectiveEmail]
        );
        if (existingEmp && isValidUuid(existingEmp.id)) {
          if (!existingEmp.user_id) {
            await query(`UPDATE employees SET user_id = $1 WHERE id = $2 AND user_id IS NULL`, [userRow.id, existingEmp.id]).catch(() => {});
          }
          return existingEmp.id;
        }

        // Provision a linked employee record for staff (reusing existing user employee_id if available)
        const rolePrefix = userRow.role === 'HR' ? 'HR' : (userRow.role === 'ADMIN' ? 'ADM' : (userRow.role === 'SUPER_ADMIN' ? 'SA' : 'EMP'));
        const existingCode = (typeof candidate === 'string' && candidate.trim()) ? candidate.trim() : '';
        const empCode = existingCode || `${rolePrefix}${Date.now().toString().slice(-6)}`;
        const empName = userRow.full_name || reqUser.full_name || reqUser.name || 'Staff Member';
        const empDesignation = userRow.designation || (userRow.role === 'HR' ? 'HR Manager' : (userRow.role === 'ADMIN' ? 'Administrator' : (userRow.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Employee')));
        const empDepartment = userRow.role === 'HR' ? 'Human Resources' : 'Operations';
        const safeMobile = effectiveMobile || `+91${Date.now().toString().slice(-10)}`;
        const safeEmail = effectiveEmail || `${userRow.id}@gharkapaisa.internal`;

        const { rows: [newEmp] } = await query(`
          INSERT INTO employees (
            employee_id, user_id, full_name, mobile_number, email_id, designation, department, joining_date, employment_type, offered_salary, employee_status, activation_status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, 'Full-time', 0, 'ACTIVE', 'APPROVED')
          ON CONFLICT (mobile_number) DO UPDATE SET
            user_id = COALESCE(employees.user_id, EXCLUDED.user_id),
            full_name = COALESCE(NULLIF(employees.full_name, ''), EXCLUDED.full_name),
            designation = COALESCE(NULLIF(employees.designation, ''), EXCLUDED.designation),
            department = COALESCE(NULLIF(employees.department, ''), EXCLUDED.department)
          RETURNING id
        `, [empCode, userRow.id, empName, safeMobile, safeEmail, empDesignation, empDepartment]);

        if (newEmp && isValidUuid(newEmp.id)) {
          logger.info(`Auto-provisioned employee profile ${newEmp.id} for user ${userRow.id} (${userRow.role} - ${empDesignation})`);
          return newEmp.id;
        }
      }
    } catch (err) {
      logger.warn(`Failed auto-provisioning employee profile: ${err.message}`);
      // Secondary check in case of concurrent insert
      try {
        const { rows: [emp] } = await query(`SELECT id FROM employees WHERE user_id = $1 AND employee_status != 'TERMINATED' ${CANONICAL_EMP_ORDER} LIMIT 1`, [reqUser.id]);
        if (emp && isValidUuid(emp.id)) return emp.id;
      } catch (_) {}
    }
  }

  return null;
};

module.exports = {
  isValidUuid,
  resolveEmployeeId,
};
