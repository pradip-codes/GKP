const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const { query } = require('../../config/database');
const logger = require('../../config/logger');

const migrateEmployeeSearchTrgmIndexes = async () => {
  try {
    logger.info('Running Employee Search Trigram Performance Indexes Migration...');

    // 1. Enable pg_trgm extension
    await query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
    logger.info('pg_trgm extension verified.');

    // 2. GIN Trigram indexes on employees table for fast multi-field search
    await query(`
      CREATE INDEX IF NOT EXISTS idx_employees_trgm_name 
      ON employees USING gin (full_name gin_trgm_ops);
    `);
    logger.info('Created GIN trigram index on employees(full_name)');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_employees_trgm_emp_id 
      ON employees USING gin (employee_id gin_trgm_ops);
    `);
    logger.info('Created GIN trigram index on employees(employee_id)');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_employees_trgm_mobile 
      ON employees USING gin (mobile_number gin_trgm_ops);
    `);
    logger.info('Created GIN trigram index on employees(mobile_number)');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_employees_trgm_email 
      ON employees USING gin (email_id gin_trgm_ops);
    `);
    logger.info('Created GIN trigram index on employees(email_id)');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_employees_trgm_designation 
      ON employees USING gin (designation gin_trgm_ops);
    `);
    logger.info('Created GIN trigram index on employees(designation)');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_employees_trgm_department 
      ON employees USING gin (department gin_trgm_ops);
    `);
    logger.info('Created GIN trigram index on employees(department)');

    logger.info('All Employee Search Trigram indexes successfully ensured.');
  } catch (err) {
    logger.error('Error applying employee search trigram indexes:', err);
    throw err;
  }
};

if (require.main === module) {
  migrateEmployeeSearchTrgmIndexes()
    .then(() => {
      logger.info('Migration finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = migrateEmployeeSearchTrgmIndexes;
