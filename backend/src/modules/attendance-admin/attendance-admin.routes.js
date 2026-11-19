const express = require('express');
const router = express.Router();
const { authenticate, syncUser, authorize } = require('../../middleware/authentication/auth.middleware');
const ctrl = require('./attendance-admin.controller');
const penaltyCtrl = require('./attendance-penalty.controller');

// Enforce authentication & SUPER_ADMIN / ADMIN authorization for admin attendance endpoints
router.use(authenticate, syncUser, authorize('SUPER_ADMIN', 'ADMIN', 'OPERATIONAL_HEAD', 'OPERATIONS_HEAD'));

/**
 * GET /api/v1/attendance/admin/today
 * Retrieve summary metrics and employee attendance records for today (Asia/Kolkata)
 */
router.get('/today', ctrl.getTodayAttendance);

/**
 * GET /api/v1/attendance/admin/history and /reports
 * Retrieve historical attendance records with date range filtering, search, and pagination
 */
router.get(['/history', '/reports'], ctrl.getAttendanceHistory);
router.get(['/history/export', '/reports/export'], ctrl.exportAttendanceReports);

/**
 * GET /api/v1/attendance/admin/employee/:employeeId
 * Retrieve detailed monthly attendance breakdown for a specific employee
 */
router.get('/employee/:employeeId', ctrl.getEmployeeAttendanceDetails);

/**
 * POST /api/v1/attendance/admin/re-attendance
 * Super Admin: Grant re-attendance (reopen day or full reset)
 */
router.post('/re-attendance', ctrl.grantReAttendance);

/**
 * POST /api/v1/attendance/admin/manual-mark
 * Super Admin / Admin: Mark attendance manually for an employee record
 */
router.post('/manual-mark', ctrl.markManualAttendance);

/**
 * Verification Exemption Configuration (Per-Account Exemption)
 */
router.get('/employee/:employeeId/exemption', ctrl.getEmployeeExemption);
router.post('/employee/:employeeId/exemption', ctrl.setEmployeeExemption);

/**
 * Office Building Geofences Management (Super Admin)
 */
router.get('/buildings', ctrl.listBuildings);
router.post('/buildings', ctrl.createBuilding);
router.put('/buildings/:id', ctrl.updateBuilding);
router.delete('/buildings/:id', ctrl.deleteBuilding);

/**
 * Environment Bypass Admin Management
 */
router.post('/environment-bypass', ctrl.createEnvironmentBypass);
router.get('/environment-bypass', ctrl.listEnvironmentBypasses);
router.delete('/environment-bypass/:bypassId', ctrl.revokeEnvironmentBypass);

/**
 * Attendance Penalty System Management (Super Admin only)
 */
router.post('/penalty/toggle', authorize('SUPER_ADMIN'), penaltyCtrl.togglePenaltySystem);
router.get('/penalty/status', penaltyCtrl.getPenaltySystemStatus);
router.get('/penalties', penaltyCtrl.getAllPenalties);
router.get('/penalties/employee/:employeeId', penaltyCtrl.getEmployeePenaltyHistory);

module.exports = router;
