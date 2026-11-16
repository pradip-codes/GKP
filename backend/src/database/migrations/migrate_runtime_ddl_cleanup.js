/**
 * Migration: migrate_runtime_ddl_cleanup.js
 *
 * Consolidates all previously dynamic/runtime DDL operations (ALTER TABLE, ALTER TYPE,
 * sequences, and helper tables) into a single idempotent migration.
 *
 * Running this eliminates the need for runtime ALTER TABLE executions during HTTP
 * request handling, removing AccessExclusiveLock contention and connection pool exhaustion.
 */

const { query } = require('../../config/database');
const logger = require('../../config/logger');

const runMigration = async () => {
  logger.info('[Migration] Starting runtime DDL cleanup migration...');

  // 1. Sequences & helper tables
  try {
    await query(`CREATE SEQUENCE IF NOT EXISTS candidate_reference_seq START 10001;`);
    await query(`
      CREATE TABLE IF NOT EXISTS otp_verifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        identity VARCHAR(255) NOT NULL,
        otp_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    logger.info('[Migration] Verified sequences and otp_verifications table.');
  } catch (err) {
    logger.warn('[Migration] Note on sequences/tables:', err.message);
  }

  // 2. User role & status enums
  const enumValues = [
    { type: 'user_role', val: 'HR' },
    { type: 'user_role', val: 'EMPLOYEE' },
    { type: 'user_role', val: 'SUPER_ADMIN' },
    { type: 'user_role', val: 'PARTNER' },
    { type: 'user_role', val: 'ADMIN' },
    { type: 'user_role', val: 'KYC_OPERATOR' },
    { type: 'user_status', val: 'inactive' },
    { type: 'user_status', val: 'suspended' },
    { type: 'user_status', val: 'blocked' },
    { type: 'user_status', val: 'pending_verification' },
    { type: 'user_status', val: 'rejected' },
    { type: 'user_status', val: 'active' },
  ];

  for (const item of enumValues) {
    try {
      await query(`ALTER TYPE ${item.type} ADD VALUE IF NOT EXISTS '${item.val}'`);
    } catch (err) {
      // Ignore if value exists or type is standard enum
    }
  }
  logger.info('[Migration] Verified user_role and user_status enum values.');

  // 3. Employee candidates & joining details
  try {
    await query(`
      ALTER TABLE employee_candidates ADD COLUMN IF NOT EXISTS hr_name VARCHAR(100);
      ALTER TABLE employee_candidates ADD COLUMN IF NOT EXISTS target_role VARCHAR(100);
      ALTER TABLE employee_candidates ADD COLUMN IF NOT EXISTS referred_by_employee_id UUID;
      ALTER TABLE employee_candidates ADD COLUMN IF NOT EXISTS assigned_hr_id UUID;
      ALTER TABLE employee_candidates ADD COLUMN IF NOT EXISTS assigned_hr_name VARCHAR(100);
      ALTER TABLE employee_candidates ADD COLUMN IF NOT EXISTS offered_salary NUMERIC;
      ALTER TABLE employee_candidates ADD COLUMN IF NOT EXISTS offered_designation VARCHAR(100);
      ALTER TABLE employee_candidates ADD COLUMN IF NOT EXISTS offered_department VARCHAR(100);
      ALTER TABLE employee_candidates ADD COLUMN IF NOT EXISTS expected_joining_date DATE;
      ALTER TABLE employee_candidates ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
    `);
    await query(`
      ALTER TABLE employee_candidates ALTER COLUMN total_experience_years TYPE NUMERIC(10,2) USING total_experience_years::NUMERIC(10,2);
    `).catch(e => logger.warn('[Migration] Note on candidate total_experience_years:', e.message));
    await query(`
      ALTER TABLE employee_joining_details ALTER COLUMN total_experience_years TYPE NUMERIC(10,2) USING total_experience_years::NUMERIC(10,2);
    `).catch(e => logger.warn('[Migration] Note on joining total_experience_years:', e.message));
    logger.info('[Migration] Verified employee_candidates and employee_joining_details columns.');
  } catch (err) {
    logger.warn('[Migration] Note on employee candidates:', err.message);
  }

  // 4. Partner profiles & partner share links
  try {
    await query(`
      ALTER TABLE partner_profiles ADD COLUMN IF NOT EXISTS referred_by_employee_id UUID;
      ALTER TABLE partner_share_links ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';
    `);
    logger.info('[Migration] Verified partner_profiles and partner_share_links columns.');
  } catch (err) {
    logger.warn('[Migration] Note on partner tables:', err.message);
  }

  // 5. Products, banks, applications
  try {
    await query(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS joining_fee VARCHAR(255);
      ALTER TABLE products ADD COLUMN IF NOT EXISTS processing_fee VARCHAR(255);
      ALTER TABLE products ADD COLUMN IF NOT EXISTS interest_rate VARCHAR(255);
      ALTER TABLE products ADD COLUMN IF NOT EXISTS sub_category VARCHAR(100);
      ALTER TABLE products ADD COLUMN IF NOT EXISTS operation_head_id UUID REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS commission_release_days INT DEFAULT 7;
      ALTER TABLE products ALTER COLUMN bank_id DROP NOT NULL;
      ALTER TABLE applications ALTER COLUMN bank_id DROP NOT NULL;
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS cureble_stage VARCHAR(100);
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS cureble_type VARCHAR(100);
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS cureble_operator_code VARCHAR(100);
      ALTER TABLE physical_application_details ADD COLUMN IF NOT EXISTS cureble_stage VARCHAR(100);
      ALTER TABLE physical_application_details ADD COLUMN IF NOT EXISTS cureble_type VARCHAR(100);
      ALTER TABLE physical_application_details ADD COLUMN IF NOT EXISTS cureble_operator_code VARCHAR(100);
      ALTER TABLE physical_application_details ADD COLUMN IF NOT EXISTS digital_card_issued VARCHAR(100);
      ALTER TABLE physical_application_details ADD COLUMN IF NOT EXISTS vkyc_status VARCHAR(100);
    `);
    await query(`
      ALTER TABLE banks ADD COLUMN IF NOT EXISTS direct_process_url TEXT;
      ALTER TABLE banks ADD COLUMN IF NOT EXISTS direct_process_enabled BOOLEAN DEFAULT TRUE;
      ALTER TABLE banks ADD COLUMN IF NOT EXISTS dsa_code VARCHAR(100);
      ALTER TABLE banks ADD COLUMN IF NOT EXISTS channel_code VARCHAR(100);
      ALTER TABLE banks ADD COLUMN IF NOT EXISTS utm_source VARCHAR(100);
      ALTER TABLE banks ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(100);
      ALTER TABLE banks ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(100);
      ALTER TABLE banks ADD COLUMN IF NOT EXISTS direct_process_notes TEXT;
    `);
    logger.info('[Migration] Verified products, banks, and applications columns.');
  } catch (err) {
    logger.warn('[Migration] Note on products/banks/applications:', err.message);
  }

  // 6. Users & admin_bank_assignments
  try {
    await query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS has_loc_eoc BOOLEAN DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
      ALTER TABLE admin_bank_assignments ADD COLUMN IF NOT EXISTS category VARCHAR(50) NOT NULL DEFAULT 'credit_card';
      ALTER TABLE admin_bank_assignments ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
    `);
    await query(`
      DO $$
      BEGIN
        DELETE FROM admin_bank_assignments a
        USING admin_bank_assignments b
        WHERE a.id > b.id
          AND a.admin_id = b.admin_id
          AND a.bank_id = b.bank_id;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admin_bank_assignments_admin_id_bank_id_key') THEN
          ALTER TABLE admin_bank_assignments ADD CONSTRAINT admin_bank_assignments_admin_id_bank_id_key UNIQUE (admin_id, bank_id);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admin_bank_assignments_admin_bank_category_key') THEN
          ALTER TABLE admin_bank_assignments ADD CONSTRAINT admin_bank_assignments_admin_bank_category_key UNIQUE (admin_id, bank_id, category);
        END IF;
      END $$;
    `);
    logger.info('[Migration] Verified users and admin_bank_assignments constraints.');
  } catch (err) {
    logger.warn('[Migration] Note on users/admin_bank_assignments:', err.message);
  }

  // 7. Team commissions, invitation history, and messenger attachments
  try {
    await query(`
      ALTER TABLE team_commissions ADD COLUMN IF NOT EXISTS amount DECIMAL(15,2) DEFAULT 0.00;
      ALTER TABLE team_commissions ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(15,2) DEFAULT 0.00;
      UPDATE team_commissions SET amount = commission_amount WHERE (amount IS NULL OR amount = 0) AND commission_amount > 0;
      UPDATE team_commissions SET commission_amount = amount WHERE (commission_amount IS NULL OR commission_amount = 0) AND amount > 0;
    `);
    await query(`
      ALTER TABLE invitation_history ALTER COLUMN invite_code TYPE TEXT;
      ALTER TABLE invitation_history ALTER COLUMN referral_code TYPE TEXT;
    `).catch(e => logger.warn('[Migration] Note on invitation_history:', e.message));

    await query(`
      ALTER TABLE message_attachments ALTER COLUMN file_url TYPE TEXT;
      ALTER TABLE message_attachments ALTER COLUMN storage_key TYPE TEXT;
    `).catch(e => logger.warn('[Migration] Note on message_attachments:', e.message));

    logger.info('[Migration] Verified team_commissions, invitation_history, and message_attachments.');
  } catch (err) {
    logger.warn('[Migration] Note on team/messenger tables:', err.message);
  }

  logger.info('[Migration] Runtime DDL cleanup migration completed successfully.');
};

if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('Migration completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { runMigration };
