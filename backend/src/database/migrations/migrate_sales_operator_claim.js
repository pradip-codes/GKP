const { query, getClient } = require('../../config/database');
const logger = require('../../config/logger');

let migrationRunning = null;
let migrationDone = false;

const migrateSalesOperatorClaim = async () => {
  if (migrationDone) return { success: true };
  if (migrationRunning) return migrationRunning;

  migrationRunning = (async () => {
    let client = null;
    let lockAcquired = false;
    try {
      client = await getClient();
      const { rows: lockRows } = await client.query('SELECT pg_try_advisory_lock(839218301) as acquired').catch(() => ({ rows: [] }));
      lockAcquired = Boolean(lockRows && lockRows[0] && lockRows[0].acquired);
      if (!lockAcquired) {
        logger.info('Sales Operator Claim migration already running in another process/worker. Skipping.');
        migrationDone = true;
        return { success: true };
      }

      logger.info('Running Administrative Sales Operator Claim Schema Migration...');

      // 1. Check if column already exists on applications before attempting ALTER TABLE
      const { rows: appCols } = await query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'applications' AND column_name = 'sales_claimed_by'
      `).catch(() => ({ rows: [] }));

      if (appCols.length === 0) {
        await query(`
          ALTER TABLE applications
            ADD COLUMN IF NOT EXISTS sales_claimed_by VARCHAR(100),
            ADD COLUMN IF NOT EXISTS sales_claimed_by_name VARCHAR(255),
            ADD COLUMN IF NOT EXISTS sales_claimed_by_code VARCHAR(100),
            ADD COLUMN IF NOT EXISTS sales_claimed_at TIMESTAMPTZ
        `);
      }

      // 2. Check if column already exists on physical_application_details before attempting ALTER TABLE
      const { rows: padCols } = await query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'physical_application_details' AND column_name = 'sales_claimed_by'
      `).catch(() => ({ rows: [] }));

      if (padCols.length === 0) {
        await query(`
          ALTER TABLE physical_application_details
            ADD COLUMN IF NOT EXISTS sales_claimed_by VARCHAR(100),
            ADD COLUMN IF NOT EXISTS sales_claimed_by_name VARCHAR(255),
            ADD COLUMN IF NOT EXISTS sales_claimed_by_code VARCHAR(100),
            ADD COLUMN IF NOT EXISTS sales_claimed_at TIMESTAMPTZ
        `);
      }

      // 3. Check if index already exists before CREATE INDEX
      const { rows: idxRows } = await query(`
        SELECT indexname FROM pg_indexes
        WHERE tablename = 'applications' AND indexname = 'idx_applications_sales_claimed_by'
      `).catch(() => ({ rows: [] }));

      if (idxRows.length === 0) {
        await query(`
          CREATE INDEX IF NOT EXISTS idx_applications_sales_claimed_by
            ON applications (sales_claimed_by)
            WHERE sales_claimed_by IS NOT NULL;
        `);
      }

      // 4. (removed) This migration used to auto-insert HDFC + SBI bank assignments for EVERY Administrative
      //    Sales Executive on each server start / deploy. That silently re-added banks (e.g. SBI) that the Super
      //    Admin had NOT selected. Bank access is now ONLY what is saved in Super Admin > Bank Assignment
      //    (admin_bank_assignments). Do not auto-assign banks here.

      logger.info('Administrative Sales Operator Claim Schema Migration completed successfully.');
      migrationDone = true;
      return { success: true };
    } catch (err) {
      logger.error('Error during Administrative Sales Operator Claim Schema Migration:', err.message || err);
      return { success: false, error: err.message };
    } finally {
      if (client) {
        if (lockAcquired) {
          await client.query('SELECT pg_advisory_unlock(839218301)').catch(() => {});
        }
        client.release();
      }
      migrationRunning = null;
    }
  })();

  return migrationRunning;
};

module.exports = { migrateSalesOperatorClaim };
