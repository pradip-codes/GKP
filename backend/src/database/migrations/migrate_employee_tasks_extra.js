/**
 * Migration: Add task_type column to employee_tasks for Extra Tasks during End-of-Day Review
 * Stack: PostgreSQL
 */

const { query } = require('../../config/database');
const logger = require('../../config/logger');

async function migrateEmployeeTasksExtra() {
  logger.info('[MIGRATION] Running Employee Tasks Extra Tasks migration...');

  try {
    // 1. Add task_type column with default 'STANDARD'
    await query(`
      ALTER TABLE employee_tasks 
      ADD COLUMN IF NOT EXISTS task_type VARCHAR(20) NOT NULL DEFAULT 'STANDARD';
    `);

    // 2. Ensure task_type check constraint allows 'STANDARD' and 'EXTRA'
    try {
      await query(`ALTER TABLE employee_tasks DROP CONSTRAINT IF EXISTS employee_tasks_type_check;`);
      await query(`
        ALTER TABLE employee_tasks 
        ADD CONSTRAINT employee_tasks_type_check 
        CHECK (task_type IN ('STANDARD', 'EXTRA'));
      `);
    } catch (constraintErr) {
      logger.warn('[MIGRATION] Task type constraint notice:', constraintErr.message);
    }

    // 3. Create index for fast employee, task_date and task_type filtering
    await query(`
      CREATE INDEX IF NOT EXISTS idx_employee_tasks_type 
      ON employee_tasks(employee_id, task_date, task_type);
    `);

    logger.info('[MIGRATION COMPLETE] employee_tasks task_type column and index created successfully.');
  } catch (err) {
    logger.error('Employee Tasks Extra Migration Error:', err);
    throw err;
  }
}

if (require.main === module) {
  migrateEmployeeTasksExtra()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = migrateEmployeeTasksExtra;
