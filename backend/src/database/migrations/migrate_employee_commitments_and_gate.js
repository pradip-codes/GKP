/**
 * Migration: Create employee_tasks table and add commitments_submitted_at to employee_attendance
 * Stack: PostgreSQL
 */

const { query } = require('../../config/database');
const logger = require('../../config/logger');

async function migrateEmployeeCommitments() {
  logger.info('[MIGRATION] Running Employee Commitments and Attendance Gate migration...');

  try {
    // 1. Ensure uuid-ossp extension
    await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // 2. Ensure commitments_submitted_at column exists in employee_attendance
    await query(`
      ALTER TABLE employee_attendance 
      ADD COLUMN IF NOT EXISTS commitments_submitted_at TIMESTAMPTZ NULL,
      ADD COLUMN IF NOT EXISTS check_in TIMESTAMPTZ NULL,
      ADD COLUMN IF NOT EXISTS check_out TIMESTAMPTZ NULL,
      ADD COLUMN IF NOT EXISTS date DATE NULL;
    `);

    // 3. Create employee_tasks table
    await query(`
      CREATE TABLE IF NOT EXISTS employee_tasks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        task_date DATE NOT NULL,
        title VARCHAR(255) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
        completed_at TIMESTAMPTZ NULL,
        carried_from_date DATE NULL,
        carry_count INT NOT NULL DEFAULT 0,
        original_task_id UUID NULL,
        submitted_at TIMESTAMPTZ NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 4. Create performance indexes
    await query(`
      CREATE INDEX IF NOT EXISTS idx_employee_tasks_emp_date 
      ON employee_tasks(employee_id, task_date);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_employee_tasks_status 
      ON employee_tasks(status);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_employee_tasks_submitted 
      ON employee_tasks(submitted_at);
    `);

    // 5. Ensure attendance table or view exists for backward compatibility
    try {
      await query(`
        CREATE VIEW attendance AS 
        SELECT 
          id, 
          employee_id, 
          attendance_date, 
          attendance_date AS date,
          check_in_time, 
          check_in_time AS check_in,
          check_out_time, 
          check_out_time AS check_out,
          status, 
          verification_status, 
          commitments_submitted_at, 
          created_at, 
          updated_at
        FROM employee_attendance;
      `);
    } catch (viewErr) {
      // If table/view already exists, ignore
    }

    logger.info('[MIGRATION COMPLETE] employee_tasks table and attendance columns created successfully.');
    return { success: true };
  } catch (err) {
    logger.error('Employee Commitments Migration Error:', err);
    throw err;
  }
}

async function rollbackEmployeeCommitments() {
  try {
    await query(`DROP TABLE IF EXISTS employee_tasks CASCADE;`);
    await query(`ALTER TABLE employee_attendance DROP COLUMN IF EXISTS commitments_submitted_at;`);
    logger.info('[MIGRATION ROLLBACK] employee_tasks dropped.');
    return { success: true };
  } catch (err) {
    logger.error('Rollback Error:', err);
    throw err;
  }
}

if (require.main === module) {
  migrateEmployeeCommitments()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = {
  migrateEmployeeCommitments,
  up: migrateEmployeeCommitments,
  down: rollbackEmployeeCommitments
};
