const { query, getClient } = require('../../config/database');
const logger = require('../../config/logger');
const { logAction } = require('../admin/audit.service');

/**
 * Calculate late attendance penalty
 * - If check-out is after 7 PM (19:00)
 * - ₹50 per hour after 7 PM
 * - ₹25 per 30 minutes after 7 PM
 */
const calculateLatePenalty = (checkOutTime) => {
  const checkOut = new Date(checkOutTime);
  const hour = checkOut.getHours();
  const minutes = checkOut.getMinutes();

  // Penalty starts after 7 PM (19:00)
  if (hour < 19) {
    return 0;
  }

  // Calculate minutes past 7 PM
  const minutesPast7PM = (hour - 19) * 60 + minutes;

  if (minutesPast7PM <= 0) {
    return 0;
  }

  // Calculate penalty: ₹50 per hour, ₹25 per 30 minutes
  const fullHours = Math.floor(minutesPast7PM / 60);
  const remainingMinutes = minutesPast7PM % 60;
  const halfHours = Math.floor(remainingMinutes / 30);

  const penalty = (fullHours * 50) + (halfHours * 25);

  return penalty;
};

/**
 * Check if penalty system is enabled globally
 */
const isPenaltySystemEnabled = async () => {
  try {
    const { rows: [config] } = await query(
      `SELECT config_value FROM system_config WHERE config_key = 'attendance_penalty_enabled'`
    );
    return config && config.config_value === 'true';
  } catch (error) {
    logger.error('Error checking penalty system status:', error);
    return false; // Default to disabled if config not found
  }
};

/**
 * Toggle penalty system (super admin only)
 */
const togglePenaltySystem = async (enabled, reqUser) => {
  try {
    await query(`
      INSERT INTO system_config (config_key, config_value, updated_by, updated_at)
      VALUES ('attendance_penalty_enabled', $1, $2, NOW())
      ON CONFLICT (config_key) 
      DO UPDATE SET config_value = $1, updated_by = $2, updated_at = NOW()
    `, [enabled ? 'true' : 'false', reqUser.id]);

    await logAction({
      user_id: reqUser.id,
      action: 'PENALTY_SYSTEM_TOGGLED',
      details: `Penalty system ${enabled ? 'enabled' : 'disabled'}`,
      ip_address: reqUser.ip,
    });

    logger.info(`Penalty system ${enabled ? 'enabled' : 'disabled'} by ${reqUser.id}`);
    return { success: true, enabled };
  } catch (error) {
    logger.error('Error toggling penalty system:', error);
    throw error;
  }
};

/**
 * Process and apply penalty for late attendance
 */
const processAttendancePenalty = async (attendanceId, checkOutTime, employeeId, reqUser) => {
  try {
    // Check if penalty system is enabled
    const enabled = await isPenaltySystemEnabled();
    if (!enabled) {
      logger.info('Penalty system is disabled, skipping penalty calculation');
      return { success: true, penalty_applied: false, reason: 'Penalty system disabled' };
    }

    // Calculate penalty
    const penaltyAmount = calculateLatePenalty(checkOutTime);
    if (penaltyAmount <= 0) {
      return { success: true, penalty_applied: false, reason: 'No late attendance detected' };
    }

    // Check if penalty already applied for this attendance
    const { rows: [existingPenalty] } = await query(
      `SELECT id FROM attendance_penalties WHERE attendance_id = $1`,
      [attendanceId]
    );

    if (existingPenalty) {
      return { success: true, penalty_applied: false, reason: 'Penalty already applied' };
    }

    // Get employee wallet ID
    const { rows: [employee] } = await query(
      `SELECT id, wallet_id FROM employees WHERE id = $1`,
      [employeeId]
    );

    if (!employee || !employee.wallet_id) {
      logger.warn(`Employee ${employeeId} has no wallet, cannot apply penalty`);
      return { success: true, penalty_applied: false, reason: 'Employee wallet not found' };
    }

    // Start transaction
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Create penalty record
      const { rows: [penalty] } = await client.query(
        `INSERT INTO attendance_penalties (attendance_id, employee_id, check_out_time, penalty_amount, calculated_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING id`,
        [attendanceId, employeeId, checkOutTime, penaltyAmount]
      );

      // Deduct from wallet
      await client.query(
        `UPDATE wallets
         SET balance = balance - $1,
             updated_at = NOW()
         WHERE id = $2 AND balance >= $1`,
        [penaltyAmount, employee.wallet_id]
      );

      // Create transaction record
      await client.query(
        `INSERT INTO wallet_transactions (
           wallet_id,
           transaction_type,
           amount,
           balance_after,
           reference_id,
           reference_type,
           description,
           created_at
         )
         VALUES (
           $1,
           'PENALTY_DEDUCTION',
           $2,
           (SELECT balance FROM wallets WHERE id = $1),
           $3,
           'ATTENDANCE_PENALTY',
           'Late attendance penalty',
           NOW()
         )`,
        [employee.wallet_id, penaltyAmount, penalty.id]
      );

      await client.query('COMMIT');

      logger.info(`Penalty of ₹${penaltyAmount} applied to employee ${employeeId} for attendance ${attendanceId}`);

      await logAction({
        user_id: reqUser?.id || employeeId,
        action: 'ATTENDANCE_PENALTY_APPLIED',
        details: `Penalty ₹${penaltyAmount} applied for late attendance (checkout after 7 PM)`,
        ip_address: reqUser?.ip,
      });

      return {
        success: true,
        penalty_applied: true,
        penalty_amount: penaltyAmount,
        penalty_id: penalty.id,
      };
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error processing attendance penalty:', error);
    throw error;
  }
};

/**
 * Get penalty history for an employee
 */
const getEmployeePenaltyHistory = async (employeeId, startDate, endDate) => {
  try {
    const { rows: penalties } = await query(
      `SELECT ap.*, a.attendance_date, a.check_in_time, a.check_out_time
       FROM attendance_penalties ap
       JOIN attendance a ON a.id = ap.attendance_id
       WHERE ap.employee_id = $1
         AND ($2::date IS NULL OR a.attendance_date >= $2::date)
         AND ($3::date IS NULL OR a.attendance_date <= $3::date)
       ORDER BY ap.calculated_at DESC`,
      [employeeId, startDate, endDate]
    );

    return { penalties };
  } catch (error) {
    logger.error('Error fetching penalty history:', error);
    throw error;
  }
};

/**
 * Get all penalties for admin view
 */
const getAllPenalties = async (startDate, endDate, limit = 100) => {
  try {
    const { rows: penalties } = await query(
      `SELECT ap.*, e.full_name, e.employee_id, a.attendance_date, a.check_in_time, a.check_out_time
       FROM attendance_penalties ap
       JOIN employees e ON e.id = ap.employee_id
       JOIN attendance a ON a.id = ap.attendance_id
       WHERE ($1::date IS NULL OR a.attendance_date >= $1::date)
         AND ($2::date IS NULL OR a.attendance_date <= $2::date)
       ORDER BY ap.calculated_at DESC
       LIMIT $3`,
      [startDate, endDate, limit]
    );

    return { penalties };
  } catch (error) {
    logger.error('Error fetching all penalties:', error);
    throw error;
  }
};

module.exports = {
  calculateLatePenalty,
  isPenaltySystemEnabled,
  togglePenaltySystem,
  processAttendancePenalty,
  getEmployeePenaltyHistory,
  getAllPenalties,
};
