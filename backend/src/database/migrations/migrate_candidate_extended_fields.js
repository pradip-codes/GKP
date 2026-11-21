/**
 * Migration: Add extended fields to employee_candidates for the revamped
 * Interview Registration form (structured address, education cascade,
 * previous salary, HR selection, name parts, age).
 */

const { query } = require('../../config/database');
const logger = require('../../config/logger');

async function migrateCandidateExtendedFields() {
  try {
    logger.info('[Migration] Adding extended fields to employee_candidates...');

    const columns = [
      `ALTER TABLE employee_candidates ADD COLUMN IF NOT EXISTS first_name VARCHAR(100)`,
      `ALTER TABLE employee_candidates ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100)`,
      `ALTER TABLE employee_candidates ADD COLUMN IF NOT EXISTS last_name VARCHAR(100)`,
      `ALTER TABLE employee_candidates ADD COLUMN IF NOT EXISTS age INTEGER`,
      `ALTER TABLE employee_candidates ADD COLUMN IF NOT EXISTS address_flat_no VARCHAR(255)`,
      `ALTER TABLE employee_candidates ADD COLUMN IF NOT EXISTS address_society VARCHAR(255)`,
      `ALTER TABLE employee_candidates ADD COLUMN IF NOT EXISTS address_area VARCHAR(255)`,
      `ALTER TABLE employee_candidates ADD COLUMN IF NOT EXISTS address_state VARCHAR(100)`,
      `ALTER TABLE employee_candidates ADD COLUMN IF NOT EXISTS address_district VARCHAR(100)`,
      `ALTER TABLE employee_candidates ADD COLUMN IF NOT EXISTS address_city VARCHAR(100)`,
      `ALTER TABLE employee_candidates ADD COLUMN IF NOT EXISTS pincode VARCHAR(10)`,
      `ALTER TABLE employee_candidates ADD COLUMN IF NOT EXISTS education_stream VARCHAR(100)`,
      `ALTER TABLE employee_candidates ADD COLUMN IF NOT EXISTS education_detail VARCHAR(255)`,
      `ALTER TABLE employee_candidates ADD COLUMN IF NOT EXISTS pursuing_year VARCHAR(30)`,
      `ALTER TABLE employee_candidates ADD COLUMN IF NOT EXISTS previous_salary DECIMAL(12,2)`,
      `ALTER TABLE employee_candidates ADD COLUMN IF NOT EXISTS selected_hr VARCHAR(100)`,
      `ALTER TABLE employee_candidates ADD COLUMN IF NOT EXISTS hr_reference VARCHAR(255)`,
    ];

    for (const stmt of columns) {
      await query(stmt);
    }

    logger.info('[Migration] employee_candidates extended fields verified.');
    return { success: true };
  } catch (error) {
    logger.error('[Migration] employee_candidates extended fields failed:', error);
    throw error;
  }
}

module.exports = { migrateCandidateExtendedFields };
