const db = require('../../config/database');
const logger = require('../../config/logger');

/**
 * Adds employees.referral_code — an opaque hashed referral token
 * (REF-XXXXXXXXXX derived from employee_id + user_id) so employees can
 * share a referral code that cannot be guessed or mapped back to their
 * employee_id. Backfills existing rows. Idempotent - safe on every boot.
 */
async function migrateEmployeeReferralCode() {
  await db.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS referral_code VARCHAR(40)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_employees_referral_code ON employees (referral_code)`);

  // Backfill: deterministic hash of employee identity -> opaque REF- code
  await db.query(`
    UPDATE employees e
    SET referral_code = 'REF-' || UPPER(SUBSTRING(MD5(COALESCE(e.employee_id,'') || ':' || COALESCE(e.user_id::text,'')) FROM 1 FOR 10))
    WHERE e.referral_code IS NULL
  `);

  logger.info('[MIGRATION] employees.referral_code ready');
}

module.exports = { migrateEmployeeReferralCode };
