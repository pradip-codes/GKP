const { query, getClient } = require('../../config/database');
const logger = require('../../config/logger');

let migrationRunning = null;
let migrationDone = false;

/**
 * Idempotent migration for:
 * - Extending payslip_requests for monthly employee requests & HR PDF review
 * - Creating employee_referrals table with indexes & unique constraint
 */
async function migrateHrReferralsPayslips() {
  if (migrationDone) return { success: true };
  if (migrationRunning) return migrationRunning;

  migrationRunning = (async () => {
    let client = null;
    let lockAcquired = false;
    try {
      client = await getClient();
      const { rows: lockRows } = await client
        .query('SELECT pg_try_advisory_lock(948291055) AS acquired')
        .catch(() => ({ rows: [] }));
      lockAcquired = Boolean(lockRows && lockRows[0] && lockRows[0].acquired);
      if (!lockAcquired) {
        logger.info('[MIGRATION] HR Referrals & Payslips migration already running elsewhere. Skipping.');
        migrationDone = true;
        return { success: true };
      }

      await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

      // 1. Ensure payslip_requests exists & extend columns idempotently
      await client.query(`
        CREATE TABLE IF NOT EXISTS payslip_requests (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
          payroll_record_id UUID REFERENCES payroll_records(id) ON DELETE CASCADE,
          month INTEGER NOT NULL,
          year INTEGER NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (
            status IN ('PENDING','APPROVED','REJECTED')
          ),
          rejection_reason TEXT,
          reviewed_by UUID REFERENCES users(id),
          reviewed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await client.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'payslip_requests'
              AND column_name = 'payroll_record_id'
              AND is_nullable = 'NO'
          ) THEN
            ALTER TABLE payslip_requests ALTER COLUMN payroll_record_id DROP NOT NULL;
          END IF;
        EXCEPTION WHEN OTHERS THEN NULL;
        END $$;
      `);

      await client.query(`
        ALTER TABLE payslip_requests
          ADD COLUMN IF NOT EXISTS salary_month VARCHAR(7),
          ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          ADD COLUMN IF NOT EXISTS review_note TEXT,
          ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id),
          ADD COLUMN IF NOT EXISTS payroll_verified BOOLEAN NOT NULL DEFAULT false,
          ADD COLUMN IF NOT EXISTS payslip_file_key VARCHAR(500),
          ADD COLUMN IF NOT EXISTS payslip_file_name VARCHAR(255),
          ADD COLUMN IF NOT EXISTS payslip_file_url TEXT;
      `);

      await client.query(`
        UPDATE payslip_requests
        SET salary_month = COALESCE(salary_month, LPAD(year::text, 4, '0') || '-' || LPAD(month::text, 2, '0')),
            requested_at = COALESCE(requested_at, created_at, NOW()),
            review_note = COALESCE(review_note, rejection_reason)
        WHERE salary_month IS NULL;
      `);

      await client.query(`CREATE INDEX IF NOT EXISTS idx_payslip_req_emp ON payslip_requests(employee_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_payslip_req_status ON payslip_requests(status)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_payslip_req_emp_month ON payslip_requests(employee_id, salary_month, status)`);

      // 2. Create employee_referrals table
      await client.query(`
        CREATE TABLE IF NOT EXISTS employee_referrals (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          referring_employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
          candidate_name VARCHAR(120) NOT NULL,
          mobile_number VARCHAR(20) NOT NULL,
          relationship VARCHAR(60) NOT NULL,
          preferred_hr_id UUID REFERENCES users(id) ON DELETE SET NULL,
          assigned_hr_id UUID REFERENCES users(id) ON DELETE SET NULL,
          referral_code VARCHAR(50) NOT NULL,
          bonus_status VARCHAR(30) NOT NULL DEFAULT 'pending',
          bonus_credited_at TIMESTAMPTZ,
          bonus_credited_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT uq_emp_referral_emp_mobile UNIQUE (referring_employee_id, mobile_number)
        )
      `);

      await client.query(`CREATE INDEX IF NOT EXISTS idx_emp_referrals_mobile ON employee_referrals(mobile_number)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_emp_referrals_referring_emp ON employee_referrals(referring_employee_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_emp_referrals_assigned_hr ON employee_referrals(assigned_hr_id)`);

      logger.info('[MIGRATION COMPLETE] HR Referrals & Payslips schema verified.');
      migrationDone = true;
      return { success: true };
    } catch (err) {
      logger.error('[MIGRATION] HR Referrals & Payslips error:', err);
      throw err;
    } finally {
      if (client) {
        if (lockAcquired) {
          await client.query('SELECT pg_advisory_unlock(948291055)').catch(() => {});
        }
        client.release();
      }
      migrationRunning = null;
    }
  })();

  return migrationRunning;
}

if (require.main === module) {
  migrateHrReferralsPayslips()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { migrateHrReferralsPayslips };
