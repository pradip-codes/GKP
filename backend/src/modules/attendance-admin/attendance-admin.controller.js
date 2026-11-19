const attendanceAdminService = require('./attendance-admin.service');
const attendanceReportsService = require('../attendance-reports/attendance-reports.service');
const environmentBypassService = require('./environmentBypass.service');
const logger = require('../../config/logger');

/**
 * GET /api/v1/attendance/admin/today
 * Returns today's attendance summary and active employee status list
 */
const getTodayAttendance = async (req, res, next) => {
  try {
    const { date, search, status, department, page, limit } = req.query;

    const data = await attendanceAdminService.getTodayAdminAttendance({
      date,
      search,
      status,
      department,
      page,
      limit,
    });

    res.json({
      success: true,
      message: "Today's attendance overview retrieved successfully",
      data,
    });
  } catch (error) {
    logger.error(`[ATTENDANCE-ADMIN] getTodayAttendance error: ${error.message}`);
    next(error);
  }
};

/**
 * GET /api/v1/attendance/admin/history
 * Returns historical attendance records with server-side pagination, search & filters
 */
const getAttendanceHistory = async (req, res, next) => {
  try {
    const startDate = req.query.startDate || req.query.start_date;
    const endDate = req.query.endDate || req.query.end_date;
    const search = req.query.search;
    const status = req.query.status;
    const department = req.query.department;
    const employeeId = req.query.employeeId;
    const page = req.query.page;
    const limit = req.query.limit;

    const data = await attendanceAdminService.getAdminAttendanceHistory({
      startDate,
      endDate,
      search,
      status,
      department,
      employeeId,
      page,
      limit,
    });

    res.json({
      success: true,
      message: 'Attendance history retrieved successfully',
      data,
    });
  } catch (error) {
    logger.error(`[ATTENDANCE-ADMIN] getAttendanceHistory error: ${error.message}`);
    next(error);
  }
};

/**
 * GET /api/v1/attendance/admin/reports/export
 * Exports attendance records and task details as Excel or CSV
 */
const exportAttendanceReports = async (req, res, next) => {
  try {
    const format = (req.query.format || 'csv').toLowerCase();
    const startDate = req.query.startDate || req.query.start_date;
    const endDate = req.query.endDate || req.query.end_date;
    const search = req.query.search;
    const status = req.query.status;
    const department = req.query.department;
    const employeeId = req.query.employeeId;
    const source = req.query.source;

    const { buffer, filename, contentType } = await attendanceReportsService.exportAttendanceReports({
      format,
      startDate,
      endDate,
      employeeId,
      department,
      status,
      source,
      search,
      reqUser: req.user,
      req,
    });

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(buffer);
  } catch (error) {
    logger.error(`[ATTENDANCE-ADMIN] exportAttendanceReports error: ${error.message}`);
    next(error);
  }
};

/**
 * GET /api/v1/attendance/admin/employee/:employeeId
 * Returns detailed attendance, daily work report & monthly breakdown for a specific employee
 */
const getEmployeeAttendanceDetails = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const { month, year, date } = req.query;

    const data = await attendanceAdminService.getEmployeeAttendanceDetails(employeeId, month, year, date);

    res.json({
      success: true,
      message: 'Employee attendance details retrieved successfully',
      data,
    });
  } catch (error) {
    logger.error(`[ATTENDANCE-ADMIN] getEmployeeAttendanceDetails error: ${error.message}`);
    next(error);
  }
};

/**
 * POST /api/v1/attendance/admin/environment-bypass
 * Creates controlled environment bypass with non-self-approval enforcement
 */
const createEnvironmentBypass = async (req, res, next) => {
  try {
    const { employeeId, bypassReason, startDate, endDate } = req.body;

    const data = await environmentBypassService.createEnvironmentBypass({
      employeeId,
      bypassReason,
      startDate,
      endDate,
      reqUser: req.user
    });

    res.status(201).json({
      success: true,
      message: 'Environment bypass approval created successfully',
      data
    });
  } catch (error) {
    logger.error(`[ATTENDANCE-ADMIN] createEnvironmentBypass error: ${error.message}`);
    next(error);
  }
};

/**
 * GET /api/v1/attendance/admin/environment-bypass
 * Lists active & historical environment bypasses
 */
const listEnvironmentBypasses = async (req, res, next) => {
  try {
    const { page, limit, employeeId, activeOnly } = req.query;

    const data = await environmentBypassService.listEnvironmentBypasses({
      page,
      limit,
      employeeId,
      activeOnly: activeOnly === 'true'
    });

    res.json({
      success: true,
      message: 'Environment bypass approvals retrieved successfully',
      data
    });
  } catch (error) {
    logger.error(`[ATTENDANCE-ADMIN] listEnvironmentBypasses error: ${error.message}`);
    next(error);
  }
};

/**
 * DELETE /api/v1/attendance/admin/environment-bypass/:bypassId
 * Revokes / deactivates an environment bypass approval
 */
const revokeEnvironmentBypass = async (req, res, next) => {
  try {
    const { bypassId } = req.params;

    const data = await environmentBypassService.revokeEnvironmentBypass({
      bypassId,
      reqUser: req.user
    });

    res.json({
      success: true,
      message: 'Environment bypass approval revoked successfully',
      data
    });
  } catch (error) {
    logger.error(`[ATTENDANCE-ADMIN] revokeEnvironmentBypass error: ${error.message}`);
    next(error);
  }
};

const buildingGeofenceService = require('../../services/geofence/buildingGeofence.service');

/**
 * GET /api/v1/attendance/admin/buildings
 * List all office building geofences
 */
const listBuildings = async (req, res, next) => {
  try {
    const data = await buildingGeofenceService.getAllBuildings();
    res.json({
      success: true,
      message: 'Office building geofences loaded successfully',
      data
    });
  } catch (error) {
    logger.error(`[ATTENDANCE-ADMIN] listBuildings error: ${error.message}`);
    next(error);
  }
};

/**
 * POST /api/v1/attendance/admin/buildings
 * Create a new office building geofence
 */
const createBuilding = async (req, res, next) => {
  try {
    const { name, code, address, polygon_coordinates, tolerance_meters, is_active } = req.body;
    const data = await buildingGeofenceService.createBuilding({
      name,
      code,
      address,
      polygon_coordinates,
      tolerance_meters,
      is_active
    });
    res.status(201).json({
      success: true,
      message: 'Office building geofence created successfully',
      data
    });
  } catch (error) {
    logger.error(`[ATTENDANCE-ADMIN] createBuilding error: ${error.message}`);
    next(error);
  }
};

/**
 * PUT /api/v1/attendance/admin/buildings/:id
 * Update an existing building geofence
 */
const updateBuilding = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, address, polygon_coordinates, tolerance_meters, is_active } = req.body;
    const data = await buildingGeofenceService.updateBuilding(id, {
      name,
      code,
      address,
      polygon_coordinates,
      tolerance_meters,
      is_active
    });
    res.json({
      success: true,
      message: 'Office building geofence updated successfully',
      data
    });
  } catch (error) {
    logger.error(`[ATTENDANCE-ADMIN] updateBuilding error: ${error.message}`);
    next(error);
  }
};

/**
 * DELETE /api/v1/attendance/admin/buildings/:id
 * Delete a building geofence
 */
const deleteBuilding = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await buildingGeofenceService.deleteBuilding(id);
    res.json({
      success: true,
      message: 'Office building geofence deleted successfully',
      data
    });
  } catch (error) {
    logger.error(`[ATTENDANCE-ADMIN] deleteBuilding error: ${error.message}`);
    next(error);
  }
};

/**
 * POST /api/v1/attendance/admin/re-attendance
 * Super Admin grants re-attendance to an employee
 */
const grantReAttendance = async (req, res, next) => {
  try {
    const { employeeId, date, mode, reason } = req.body;
    const result = await attendanceAdminService.grantReAttendance({
      employeeId,
      date,
      mode,
      reason,
      adminUser: req.user
    });

    res.json(result);
  } catch (error) {
    logger.error(`[ATTENDANCE-ADMIN] grantReAttendance error: ${error.message}`);
    next(error);
  }
};

/**
 * POST /api/v1/attendance/admin/manual-mark
 * Super Admin manually marks attendance for an employee
 */
const markManualAttendance = async (req, res, next) => {
  try {
    const { employeeId, date, status, attendanceType, checkInTime, checkOutTime, remarks } = req.body;
    const result = await attendanceAdminService.markManualAttendance({
      employeeId,
      date,
      status,
      attendanceType,
      checkInTime,
      checkOutTime,
      remarks,
      adminUser: req.user
    });

    res.json(result);
  } catch (error) {
    logger.error(`[ATTENDANCE-ADMIN] markManualAttendance error: ${error.message}`);
    next(error);
  }
};

/**
 * GET /api/v1/attendance/admin/employee/:employeeId/exemption
 * Get active verification exemption configuration for an employee
 */
const getEmployeeExemption = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const data = await environmentBypassService.getEnvironmentBypassStatus(employeeId);
    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error(`[ATTENDANCE-ADMIN] getEmployeeExemption error: ${error.message}`);
    next(error);
  }
};

/**
 * POST /api/v1/attendance/admin/employee/:employeeId/exemption
 * Configure which verification is NOT required (face, location, or both) for a specific employee account
 */
const setEmployeeExemption = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const { bypassLocation, bypassFace, bypassType, startDate, endDate, bypassReason } = req.body;

    const data = await environmentBypassService.createEnvironmentBypass({
      employeeId,
      bypassReason: bypassReason || 'Super Admin verification exemption',
      startDate,
      endDate,
      bypassLocation,
      bypassFace,
      bypassType,
      reqUser: req.user
    });

    res.status(201).json({
      success: true,
      message: 'Verification exemption access granted successfully',
      data
    });
  } catch (error) {
    logger.error(`[ATTENDANCE-ADMIN] setEmployeeExemption error: ${error.message}`);
    next(error);
  }
};

module.exports = {
  getTodayAttendance,
  getAttendanceHistory,
  exportAttendanceReports,
  getEmployeeAttendanceDetails,
  createEnvironmentBypass,
  listEnvironmentBypasses,
  revokeEnvironmentBypass,
  listBuildings,
  createBuilding,
  updateBuilding,
  deleteBuilding,
  grantReAttendance,
  markManualAttendance,
  getEmployeeExemption,
  setEmployeeExemption
};
