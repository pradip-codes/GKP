const penaltyService = require('../attendance/attendance-penalty.service');
const { success, error } = require('../../utils/response/response');
const logger = require('../../config/logger');

/**
 * Toggle attendance penalty system (Super Admin only)
 */
const togglePenaltySystem = async (req, res) => {
  try {
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return error(res, 'enabled must be a boolean', 400);
    }

    const result = await penaltyService.togglePenaltySystem(enabled, req.user);
    return success(res, result, `Penalty system ${enabled ? 'enabled' : 'disabled'} successfully`);
  } catch (err) {
    logger.error('Error toggling penalty system:', err);
    return error(res, err.message, err.statusCode || 500);
  }
};

/**
 * Get penalty system status
 */
const getPenaltySystemStatus = async (req, res) => {
  try {
    const enabled = await penaltyService.isPenaltySystemEnabled();
    return success(res, { enabled }, 'Penalty system status retrieved');
  } catch (err) {
    logger.error('Error getting penalty system status:', err);
    return error(res, err.message, err.statusCode || 500);
  }
};

/**
 * Get all penalties for admin view
 */
const getAllPenalties = async (req, res) => {
  try {
    const { start_date, end_date, limit } = req.query;
    const result = await penaltyService.getAllPenalties(
      start_date,
      end_date,
      limit ? parseInt(limit) : 100
    );
    return success(res, result, 'Penalties retrieved successfully');
  } catch (err) {
    logger.error('Error fetching penalties:', err);
    return error(res, err.message, err.statusCode || 500);
  }
};

/**
 * Get employee penalty history
 */
const getEmployeePenaltyHistory = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { start_date, end_date } = req.query;
    const result = await penaltyService.getEmployeePenaltyHistory(
      employeeId,
      start_date,
      end_date
    );
    return success(res, result, 'Employee penalty history retrieved');
  } catch (err) {
    logger.error('Error fetching employee penalty history:', err);
    return error(res, err.message, err.statusCode || 500);
  }
};

module.exports = {
  togglePenaltySystem,
  getPenaltySystemStatus,
  getAllPenalties,
  getEmployeePenaltyHistory,
};
