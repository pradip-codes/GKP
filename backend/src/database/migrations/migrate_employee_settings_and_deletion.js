/**
 * Migration: Employee Settings & Account Deletion Requests
 * 
 * This migration adds:
 * 1. employee_settings table - stores notification preferences
 * 2. employee_deletion_requests table - tracks account deletion requests
 */

const { query } = require('../../config/database');
const logger = require('../../config/logger');

async function up() {
  try {
    logger.info('[Migration] Starting employee settings and deletion tables migration...');

    // Create employee_settings table
    await query(`
      CREATE TABLE IF NOT EXISTS employee_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        push_notifications_enabled BOOLEAN DEFAULT true,
        email_alerts_enabled BOOLEAN DEFAULT true,
        sms_alerts_enabled BOOLEAN DEFAULT true,
        sound_enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(employee_id)
      )
    `);
    logger.info('[Migration] Created employee_settings table');

    // Create index on employee_settings.employee_id
    await query(`
      CREATE INDEX IF NOT EXISTS idx_employee_settings_employee_id 
      ON employee_settings(employee_id)
    `);
    logger.info('[Migration] Created index on employee_settings.employee_id');

    // Create employee_deletion_requests table
    await query(`
      CREATE TABLE IF NOT EXISTS employee_deletion_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reason TEXT,
        status VARCHAR(50) DEFAULT 'PENDING',
        reviewed_by UUID REFERENCES users(id),
        reviewed_at TIMESTAMP,
        processed_at TIMESTAMP,
        rejection_reason TEXT,
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logger.info('[Migration] Created employee_deletion_requests table');

    // Create indexes on employee_deletion_requests
    await query(`
      CREATE INDEX IF NOT EXISTS idx_employee_deletion_requests_employee_id 
      ON employee_deletion_requests(employee_id)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_employee_deletion_requests_status 
      ON employee_deletion_requests(status)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_employee_deletion_requests_requested_at 
      ON employee_deletion_requests(requested_at)
    `);
    logger.info('[Migration] Created indexes on employee_deletion_requests');

    // Insert default settings for existing employees
    await query(`
      INSERT INTO employee_settings (employee_id, user_id)
      SELECT e.id, e.user_id
      FROM employees e
      WHERE NOT EXISTS (
        SELECT 1 FROM employee_settings es WHERE es.employee_id = e.id
      )
    `);
    logger.info('[Migration] Inserted default settings for existing employees');

    logger.info('[Migration] Employee settings and deletion tables migration completed successfully');
  } catch (error) {
    logger.error('[Migration] Error during migration:', error);
    throw error;
  }
}

async function down() {
  try {
    logger.info('[Migration] Rolling back employee settings and deletion tables migration...');

    await query(`DROP TABLE IF EXISTS employee_deletion_requests CASCADE`);
    logger.info('[Migration] Dropped employee_deletion_requests table');

    await query(`DROP TABLE IF EXISTS employee_settings CASCADE`);
    logger.info('[Migration] Dropped employee_settings table');

    logger.info('[Migration] Rollback completed successfully');
  } catch (error) {
    logger.error('[Migration] Error during rollback:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  up()
    .then(() => {
      logger.info('[Migration] Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('[Migration] Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { up, down };
