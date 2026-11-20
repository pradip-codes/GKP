/**
 * Migration: Update employee_attendance source CHECK constraint to include SUPER_ADMIN_MANUAL
 * Fixes 500 error on POST /api/v1/attendance/admin/manual-mark
 */

const { query } = require('../../config/database');
const logger = require('../../config/logger');

async function migrateAttendanceManualMarkSource() {
  logger.info('[MIGRATION] Running Attendance Manual Mark Source fix...');

  try {
    // Drop existing source check constraint and recreate with SUPER_ADMIN_MANUAL included
    await query(`
      ALTER TABLE employee_attendance
      DROP CONSTRAINT IF EXISTS employee_attendance_source_check;
    `);

    await query(`
      ALTER TABLE employee_attendance
      ADD CONSTRAINT employee_attendance_source_check
      CHECK (source IN ('WEB', 'MOBILE', 'SUPER_ADMIN_MANUAL', 'ADMIN_MANUAL', 'SYSTEM'));
    `);

    logger.info('[MIGRATION COMPLETE] employee_attendance source constraint updated successfully.');
  } catch (err) {
    logger.error('Attendance Manual Mark Source Migration Error:', err);
    throw err;
  }
}

if (require.main === module) {
  migrateAttendanceManualMarkSource()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { migrateAttendanceManualMarkSource };
