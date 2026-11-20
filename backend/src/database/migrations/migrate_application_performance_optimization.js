/**
 * Performance Optimization Migration
 * Adds missing indexes for slow application/lead queries and optimizes JSONB field access
 * Addresses 4-7 second query latencies on applications listing endpoints
 */

const { query } = require('../../config/database');
const logger = require('../../config/logger');

async function migrateApplicationPerformanceOptimization() {
  logger.info('[MIGRATION] Running Application Performance Optimization...');

  try {
    // 1. Add composite indexes for common query patterns
    const indexes = [
      // Applications listing with status + created_at (most common pattern)
      `CREATE INDEX IF NOT EXISTS idx_apps_status_created ON applications(status, created_at DESC)`,
      
      // Applications with partner + status
      `CREATE INDEX IF NOT EXISTS idx_apps_partner_status_created ON applications(partner_id, status, created_at DESC)`,
      
      // Applications with submitted_by + status
      `CREATE INDEX IF NOT EXISTS idx_apps_submitted_status_created ON applications(submitted_by, status, created_at DESC)`,
      
      // Applications with employee_id + status
      `CREATE INDEX IF NOT EXISTS idx_apps_employee_status_created ON applications(employee_id, status, created_at DESC)`,
      
      // Applications with bank_id + status
      `CREATE INDEX IF NOT EXISTS idx_apps_bank_status_created ON applications(bank_id, status, created_at DESC)`,
      
      // Applications with product_id + status
      `CREATE INDEX IF NOT EXISTS idx_apps_product_status_created ON applications(product_id, status, created_at DESC)`,
      
      // Assigned_to columns (if they exist)
      `CREATE INDEX IF NOT EXISTS idx_apps_assigned_to_emp ON applications(assigned_to_employee_id) WHERE assigned_to_employee_id IS NOT NULL`,
      `CREATE INDEX IF NOT EXISTS idx_apps_assigned_to_user ON applications(assigned_to_user_id) WHERE assigned_to_user_id IS NOT NULL`,
      
      // Physical application details
      `CREATE INDEX IF NOT EXISTS idx_pad_app_id_status ON physical_application_details(application_id, status)`,
      
      // Leads table indexes
      `CREATE INDEX IF NOT EXISTS idx_leads_status_created ON leads(status, created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_leads_partner_status ON leads(partner_id, status)`,
      `CREATE INDEX IF NOT EXISTS idx_leads_employee_status ON leads(employee_id, status)`,
      
      // Customers table indexes
      `CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers(mobile)`,
      `CREATE INDEX IF NOT EXISTS idx_customers_pan ON customers(pan_number)`,
      
      // Admin bank assignments
      `CREATE INDEX IF NOT EXISTS idx_aba_admin_bank_category ON admin_bank_assignments(admin_id, bank_id, category)`,
      
      // Partner profiles
      `CREATE INDEX IF NOT EXISTS idx_pp_user_status ON partner_profiles(user_id, status)`,
      `CREATE INDEX IF NOT EXISTS idx_pp_parent_status ON partner_profiles(parent_partner_id, status)`,
    ];

    for (const sql of indexes) {
      try {
        await query(sql);
        logger.debug(`[Migration] Created index: ${sql.substring(0, 80)}...`);
      } catch (err) {
        // Index might already exist or column might not exist - log but continue
        logger.debug(`[Migration] Index note: ${err.message}`);
      }
    }

    // 2. Add covering index for applications listing (includes commonly selected columns)
    await query(`
      CREATE INDEX IF NOT EXISTS idx_apps_listing_covering 
      ON applications(id, app_number, status, partner_id, submitted_by, employee_id, 
                     product_id, bank_id, created_at DESC, updated_at DESC)
      INCLUDE (loan_amount, approved_amount, commission_amount, commission_status)
    `).catch(err => logger.debug(`[Migration] Covering index note: ${err.message}`));

    // 3. Optimize JSONB metadata access with expression indexes
    await query(`
      CREATE INDEX IF NOT EXISTS idx_apps_metadata_product_type 
      ON applications((metadata->>'product_type')) 
      WHERE metadata IS NOT NULL
    `).catch(err => logger.debug(`[Migration] Metadata index note: ${err.message}`));

    await query(`
      CREATE INDEX IF NOT EXISTS idx_apps_metadata_assigned_to 
      ON applications((metadata->>'assigned_to')) 
      WHERE metadata IS NOT NULL
    `).catch(err => logger.debug(`[Migration] Metadata assigned_to index note: ${err.message}`));

    // 4. Add index on physical_application_details for common joins
    await query(`
      CREATE INDEX IF NOT EXISTS idx_pad_bank_app_number 
      ON physical_application_details(bank_application_number) 
      WHERE bank_application_number IS NOT NULL
    `).catch(err => logger.debug(`[Migration] PAD bank app number index note: ${err.message}`));

    await query(`
      CREATE INDEX IF NOT EXISTS idx_pad_bank_ref_number 
      ON physical_application_details(bank_ref_number) 
      WHERE bank_ref_number IS NOT NULL
    `).catch(err => logger.debug(`[Migration] PAD bank ref number index note: ${err.message}`));

    // 5. Analyze tables to update statistics
    logger.info('[MIGRATION] Running ANALYZE on applications and related tables...');
    await query(`ANALYZE applications`).catch(err => logger.debug(`[Migration] ANALYZE applications: ${err.message}`));
    await query(`ANALYZE physical_application_details`).catch(err => logger.debug(`[Migration] ANALYZE pad: ${err.message}`));
    await query(`ANALYZE leads`).catch(err => logger.debug(`[Migration] ANALYZE leads: ${err.message}`));
    await query(`ANALYZE customers`).catch(err => logger.debug(`[Migration] ANALYZE customers: ${err.message}`));
    await query(`ANALYZE partner_profiles`).catch(err => logger.debug(`[Migration] ANALYZE partner_profiles: ${err.message}`));
    await query(`ANALYZE admin_bank_assignments`).catch(err => logger.debug(`[Migration] ANALYZE aba: ${err.message}`));

    logger.info('[MIGRATION COMPLETE] Application Performance Optimization completed successfully.');
    logger.info('[MIGRATION] Added composite indexes, covering indexes, and JSONB expression indexes.');
  } catch (err) {
    logger.error('Application Performance Optimization Migration Error:', err);
    throw err;
  }
}

if (require.main === module) {
  migrateApplicationPerformanceOptimization()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { migrateApplicationPerformanceOptimization };
