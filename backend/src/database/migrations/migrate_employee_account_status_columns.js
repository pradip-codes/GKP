const db = require('../../config/database');
const logger = require('../../config/logger');

/**
 * Super Admin "Suspend / Activate Employee" (POST /employees/:id/activate) and Temporary Delete write
 * employees.is_active, users.is_active, users.activated_at and users.deactivated_at.
 * employees.is_active had no DDL anywhere in the migrations, which makes the UPDATE fail with
 * "column is_active of relation employees does not exist" (HTTP 500). Idempotent - safe on every boot.
 */
async function migrateEmployeeAccountStatusColumns() {
  await db.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`);
  await db.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ`);
  await db.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ`);
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`);
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ`);
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ`);
  // Keep the flag consistent for rows that already exist
  await db.query(`UPDATE employees SET is_active = FALSE
                   WHERE is_active IS DISTINCT FROM FALSE
                     AND (UPPER(COALESCE(activation_status, '')) = 'SUSPENDED' OR UPPER(COALESCE(employee_status, '')) IN ('INACTIVE', 'TERMINATED'))`);
  logger.info('migrate_employee_account_status_columns: done');
}

module.exports = { migrateEmployeeAccountStatusColumns };

if (require.main === module) {
  migrateEmployeeAccountStatusColumns().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
