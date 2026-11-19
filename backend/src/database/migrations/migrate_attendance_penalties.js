/**
 * Migration: Create attendance_penalties and system_config tables for penalty system
 * Version: 1.0
 * Date: 2026-11-16
 */

const { query } = require('../../config/database');
const logger = require('../../config/logger');

async function migrateAttendancePenalties() {
  try {
    logger.info('Starting attendance penalties migration...');

    // Create system_config table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS system_config (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        config_key VARCHAR(100) UNIQUE NOT NULL,
        config_value TEXT NOT NULL,
        description TEXT,
        updated_by UUID REFERENCES users(id),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    // Create attendance_penalties table
    await query(`
      CREATE TABLE IF NOT EXISTS attendance_penalties (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        attendance_id UUID NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        check_out_time TIMESTAMP WITH TIME ZONE NOT NULL,
        penalty_amount DECIMAL(10, 2) NOT NULL,
        calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        UNIQUE(attendance_id)
      )
    `);

    // Create indexes
    await query(`
      CREATE INDEX IF NOT EXISTS idx_attendance_penalties_attendance_id 
      ON attendance_penalties(attendance_id)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_attendance_penalties_employee_id 
      ON attendance_penalties(employee_id)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_attendance_penalties_calculated_at 
      ON attendance_penalties(calculated_at)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_system_config_key 
      ON system_config(config_key)
    `);

    // Initialize penalty system as disabled by default
    await query(`
      INSERT INTO system_config (config_key, config_value, description)
      VALUES ('attendance_penalty_enabled', 'false', 'Enable/disable late attendance penalty system')
      ON CONFLICT (config_key) DO NOTHING
    `);

    logger.info('Attendance penalties migration completed successfully');
    return { success: true, message: 'Attendance penalties tables created' };
  } catch (error) {
    logger.error('Error creating attendance penalties tables:', error);
    throw error;
  }
}

async function rollbackAttendancePenalties() {
  try {
    logger.info('Rolling back attendance penalties tables...');
    await query(`DROP TABLE IF EXISTS attendance_penalties CASCADE`);
    await query(`DROP TABLE IF EXISTS system_config CASCADE`);
    logger.info('Attendance penalties tables dropped successfully');
    return { success: true, message: 'Attendance penalties tables dropped' };
  } catch (error) {
    logger.error('Error dropping attendance penalties tables:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateAttendancePenalties()
    .then(() => {
      logger.info('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = {
  up: migrateAttendancePenalties,
  down: rollbackAttendancePenalties,
};
