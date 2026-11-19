/**
 * Migration: Support Part-Time attendance after 7 PM IST and Super Admin Re-Attendance
 * Stack: PostgreSQL
 */

const { query } = require('../../config/database');
const logger = require('../../config/logger');

async function migrateAttendancePartTimeReAttendance() {
  logger.info('[MIGRATION] Running Part-Time Attendance & Re-Attendance migration...');

  try {
    // 1. Add attendance_type and re_attendance tracking columns to employee_attendance
    await query(`
      ALTER TABLE employee_attendance 
      ADD COLUMN IF NOT EXISTS attendance_type VARCHAR(20) DEFAULT 'FULL_TIME',
      ADD COLUMN IF NOT EXISTS is_re_attendance BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS re_attendance_granted_at TIMESTAMPTZ NULL,
      ADD COLUMN IF NOT EXISTS re_attendance_granted_by UUID NULL;
    `);

    // 2. Update status check constraint to include PART_TIME and FULL_TIME
    try {
      await query(`ALTER TABLE employee_attendance DROP CONSTRAINT IF EXISTS employee_attendance_status_check;`);
      await query(`
        ALTER TABLE employee_attendance 
        ADD CONSTRAINT employee_attendance_status_check 
        CHECK (status IN ('PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE', 'PART_TIME', 'FULL_TIME'));
      `);
    } catch (constraintErr) {
      logger.warn('[MIGRATION] Status constraint update notice:', constraintErr.message);
    }

    // 3. Create index for fast attendance_type queries
    await query(`
      CREATE INDEX IF NOT EXISTS idx_emp_att_type ON employee_attendance(attendance_type);
    `);

    logger.info('[MIGRATION COMPLETE] Part-Time Attendance & Re-Attendance migration finished successfully.');
  } catch (err) {
    logger.error('Attendance Part-Time & Re-Attendance Migration Error:', err);
    throw err;
  }
}

if (require.main === module) {
  migrateAttendancePartTimeReAttendance()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = migrateAttendancePartTimeReAttendance;
