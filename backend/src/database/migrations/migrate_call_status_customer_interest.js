const path = require('path');
const fs = require('fs');

const envPaths = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env'),
];
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    require('dotenv').config({ path: p });
    break;
  }
}

const { query } = require('../../config/database');
const logger = require('../../config/logger');

const migrateCallStatusCustomerInterest = async () => {
  logger.info('Running Call Status & Customer Interest Schema Migration...');

  try {
    // 1. Ensure columns on applications table
    await query(`
      ALTER TABLE applications 
        ADD COLUMN IF NOT EXISTS call_status VARCHAR(100),
        ADD COLUMN IF NOT EXISTS customer_interest VARCHAR(100)
    `);

    // 2. Ensure columns on physical_application_details table
    await query(`
      ALTER TABLE physical_application_details 
        ADD COLUMN IF NOT EXISTS call_status VARCHAR(100),
        ADD COLUMN IF NOT EXISTS customer_interest VARCHAR(100)
    `);

    // 3. Ensure columns on leads table
    await query(`
      ALTER TABLE leads 
        ADD COLUMN IF NOT EXISTS call_status VARCHAR(100),
        ADD COLUMN IF NOT EXISTS customer_interest VARCHAR(100)
    `);

    // 4. Create indexes for quick filtering & analytics
    await query(`
      CREATE INDEX IF NOT EXISTS idx_applications_call_status 
        ON applications (call_status) 
        WHERE call_status IS NOT NULL;
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_applications_customer_interest 
        ON applications (customer_interest) 
        WHERE customer_interest IS NOT NULL;
    `);

    logger.info('Call Status & Customer Interest Schema Migration completed successfully.');
  } catch (err) {
    logger.error('Call Status & Customer Interest Migration error:', err.message);
  }
};

if (require.main === module) {
  migrateCallStatusCustomerInterest()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { migrateCallStatusCustomerInterest };
