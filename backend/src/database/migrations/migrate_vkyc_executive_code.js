const db = require('../../config/database');
const logger = require('../../config/logger');

/**
 * Adds applications.vkyc_executive_code, applications.process_executive_code, and applications.curable_executive_code
 * (manually editable role-wise Executive Codes) and a partial index for the KYC operator queue.
 * Idempotent - safe to run many times.
 * Run: node src/database/migrations/migrate_vkyc_executive_code.js
 */
async function migrateVkycExecutiveCode() {
  await db.query(`ALTER TABLE applications ADD COLUMN IF NOT EXISTS vkyc_executive_code VARCHAR(100)`);
  await db.query(`ALTER TABLE applications ADD COLUMN IF NOT EXISTS process_executive_code VARCHAR(100)`);
  await db.query(`ALTER TABLE applications ADD COLUMN IF NOT EXISTS curable_executive_code VARCHAR(100)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_apps_vkyc_executive_code ON applications(vkyc_executive_code) WHERE vkyc_executive_code IS NOT NULL`);
  logger.info('migrate_vkyc_executive_code: done');
}

module.exports = { migrateVkycExecutiveCode };

if (require.main === module) {
  migrateVkycExecutiveCode()
    .then(() => process.exit(0))
    .catch((e) => { console.error(e); process.exit(1); });
}
