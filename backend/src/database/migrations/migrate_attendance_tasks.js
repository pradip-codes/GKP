/**
 * Migration: Create attendance_tasks table for task management
 * Version: 1.0
 * Date: 2026-11-16
 */

const { query } = require('../../config/database');
const logger = require('../../config/logger');

async function migrateAttendanceTasks() {
  try {
    logger.info('Starting attendance_tasks table migration...');

    // Create attendance_tasks table
    await query(`
      CREATE TABLE IF NOT EXISTS attendance_tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        attendance_id UUID NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
        task TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED')),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE
      )
    `);

    // Create index for faster queries
    await query(`
      CREATE INDEX IF NOT EXISTS idx_attendance_tasks_attendance_id 
      ON attendance_tasks(attendance_id)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_attendance_tasks_status 
      ON attendance_tasks(status)
    `);

    logger.info('attendance_tasks table created successfully');
    return { success: true, message: 'attendance_tasks table created' };
  } catch (error) {
    logger.error('Error creating attendance_tasks table:', error);
    throw error;
  }
}

async function rollbackAttendanceTasks() {
  try {
    logger.info('Rolling back attendance_tasks table...');
    await query(`DROP TABLE IF EXISTS attendance_tasks CASCADE`);
    logger.info('attendance_tasks table dropped successfully');
    return { success: true, message: 'attendance_tasks table dropped' };
  } catch (error) {
    logger.error('Error dropping attendance_tasks table:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateAttendanceTasks()
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
  up: migrateAttendanceTasks,
  down: rollbackAttendanceTasks,
};
