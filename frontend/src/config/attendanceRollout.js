/**
 * Employee Attendance Feature Rollout Gate Configuration
 * Enables attendance functionality across all employee accounts.
 */

export const ATTENDANCE_ENABLED_EMPLOYEE_CODES = [];

/**
 * Determine if Attendance functionality is enabled for the provided employee code or user context.
 * Returns true for all authenticated employees.
 * 
 * @param {string|object} userOrCode - Employee code string or authenticated user/employee profile object
 * @returns {boolean}
 */
export const isAttendanceEnabled = (userOrCode) => {
  return true;
};

/**
 * Staff (Admin panel / HR panel) attendance gate
 * ─────────────────────────────────────────────────────────────
 * Admin and HR panel users must mark attendance (face + office verification)
 * before the panel opens, exactly like the Employee panel's first screen.
 *
 *  - STAFF_ATTENDANCE_GATE_ROLES: roles that are gated. SUPER_ADMIN is intentionally NOT gated.
 *  - STAFF_ATTENDANCE_GATE_EXCLUDED_DESIGNATIONS: designations (case-insensitive) that are exempt,
 *    e.g. ['Operational Head']. Use this for a staged rollout.
 *  - Kill switch: set VITE_STAFF_ATTENDANCE_GATE=off in the frontend env and rebuild to disable.
 */
export const STAFF_ATTENDANCE_GATE_ROLES = ['ADMIN', 'HR'];
export const STAFF_ATTENDANCE_GATE_EXCLUDED_DESIGNATIONS = [];

export const isStaffAttendanceGateRequired = (user) => {
  try {
    if (import.meta.env?.VITE_STAFF_ATTENDANCE_GATE === 'off') return false;
  } catch (_) { /* import.meta.env not available */ }
  if (!user) return false;
  const role = String(user.role || '').toUpperCase();
  if (!STAFF_ATTENDANCE_GATE_ROLES.includes(role)) return false;
  const designation = String(user.designation || '').trim().toLowerCase();
  if (designation && STAFF_ATTENDANCE_GATE_EXCLUDED_DESIGNATIONS.some(d => String(d).trim().toLowerCase() === designation)) {
    return false;
  }
  return true;
};

