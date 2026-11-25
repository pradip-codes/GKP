const { getDayStatus } = require('../../modules/employee/employee-commitments.service');
const logger = require('../../config/logger');

/**
 * Middleware: requireDayUnlocked
 * ─────────────────────────────────────────────────────────────
 * Blocks employee access to any panel APIs until:
 *   Step 1: Attendance check-in marked
 *   Step 2: Today's commitments submitted
 *
 * Exemptions:
 *   - Non-employee supervisory roles (SUPER_ADMIN, ADMIN)
 *   - Day status check (/day-status)
 *   - Attendance check-in & check-out endpoints
 *   - Tasks & commitments management endpoints
 *   - Public / Auth flows (send-otp, verify-otp, login, logout)
 *   - Profile reading (for display name/photo)
 */
const EXEMPT_PATHS = [
  '/day-status',
  '/attendance/check-in',
  '/attendance/check-out',
  '/attendance/cancel-check-out',
  '/check-in',
  '/check-out',
  '/cancel-check-out',
  '/tasks',
  '/tasks/today',
  '/tasks/submit',
  '/tasks/extra',
  '/attendance/tasks/extra',
  '/commitments',
  '/carry-over',
  '/send-otp',
  '/verify-otp',
  '/login',
  '/logout',
  '/profile',
  // Onboarding & KYC must be completable before first attendance check-in
  '/onboarding-status',
  '/joining-form',
  '/terms-acceptance',
  '/kyc',
  '/upload-document',
  '/verification-status',
  '/submit-verification'
];

async function requireDayUnlocked(req, res, next) {
  try {
    const user = req.user;
    if (!user) {
      return next();
    }

    const role = (user.role || '').toUpperCase();
    // Allow super admins and admins to bypass attendance lock if reviewing panels
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
      return next();
    }

    // Check if the current sub-route is exempt
    const path = req.path || req.originalUrl || '';
    const isExempt = EXEMPT_PATHS.some((exempt) => {
      return path === exempt || 
             path.startsWith(`${exempt}/`) || 
             path.endsWith(exempt) || 
             path.includes(exempt);
    });

    if (isExempt) {
      return next();
    }

    // Check Day Status
    const statusInfo = await getDayStatus({ reqUser: user });
    if (statusInfo.state !== 'UNLOCKED') {
      return res.status(403).json({
        success: false,
        code: 'DAY_LOCKED',
        state: statusInfo.state,
        message: statusInfo.state === 'NOT_CHECKED_IN'
          ? 'Please mark attendance check-in to proceed.'
          : statusInfo.state === 'NEEDS_COMMITMENTS'
            ? "Please submit today's commitments to unlock the employee dashboard."
            : 'You have checked out for the day. Panel is locked until tomorrow.'
      });
    }

    return next();
  } catch (err) {
    logger.error('[REQUIRE_DAY_UNLOCKED] Error checking day status:', err.message);
    // If user has no employee profile, fail-safe let downstream handlers return appropriate 400/404
    return next();
  }
}

module.exports = requireDayUnlocked;
