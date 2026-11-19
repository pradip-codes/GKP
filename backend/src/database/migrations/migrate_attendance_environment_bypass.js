const { query } = require('../../config/database');
const logger = require('../../config/logger');

async function migrateAttendanceEnvironmentBypass() {
  logger.info('[MIGRATION] Running Attendance Environment Bypass table creation...');

  try {
    await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await query(`
      CREATE TABLE IF NOT EXISTS environment_bypass_approvals (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        requested_by UUID REFERENCES users(id),
        approved_by UUID NOT NULL REFERENCES users(id),
        bypass_reason TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        bypass_start_date DATE,
        bypass_end_date DATE,
        bypass_location BOOLEAN DEFAULT TRUE,
        bypass_face BOOLEAN DEFAULT FALSE,
        bypass_type VARCHAR(50) DEFAULT 'LOCATION',
        status VARCHAR(20) DEFAULT 'APPROVED',
        approved_at TIMESTAMPTZ DEFAULT NOW(),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await query(`
      ALTER TABLE environment_bypass_approvals
        ADD COLUMN IF NOT EXISTS requested_by UUID REFERENCES users(id),
        ADD COLUMN IF NOT EXISTS bypass_start_date DATE,
        ADD COLUMN IF NOT EXISTS bypass_end_date DATE,
        ADD COLUMN IF NOT EXISTS bypass_location BOOLEAN DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS bypass_face BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS bypass_type VARCHAR(50) DEFAULT 'LOCATION',
        ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'APPROVED',
        ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
    `).catch(() => {});

    await query(`
      UPDATE environment_bypass_approvals
      SET bypass_start_date = start_date
      WHERE bypass_start_date IS NULL AND start_date IS NOT NULL;

      UPDATE environment_bypass_approvals
      SET bypass_end_date = end_date
      WHERE bypass_end_date IS NULL AND end_date IS NOT NULL;
    `).catch(() => {});

    await query(`
      CREATE INDEX IF NOT EXISTS idx_env_bypass_emp_dates 
      ON environment_bypass_approvals(employee_id, is_active, start_date, end_date);
      CREATE INDEX IF NOT EXISTS idx_env_bypass_approved_by 
      ON environment_bypass_approvals(approved_by);
      CREATE INDEX IF NOT EXISTS idx_env_bypass_dates 
      ON environment_bypass_approvals(bypass_start_date, bypass_end_date);
    `);

    logger.info('[MIGRATION COMPLETE] Environment bypass approvals table setup successfully.');
  } catch (err) {
    logger.error('Attendance Environment Bypass Migration Error:', err);
    throw err;
  }
}

if (require.main === module) {
  migrateAttendanceEnvironmentBypass()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { migrateAttendanceEnvironmentBypass };
