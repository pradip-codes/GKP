const db = require('../../config/database');
const logger = require('../../config/logger');

/**
 * Keeps employee_candidates.assigned_hr_name / hr_name / selected_hr in sync when an HR account is renamed,
 * and indexes assigned_hr_id (HR panel filter). Idempotent - safe to run on every boot.
 * Candidates are linked by assigned_hr_id (users.id); the name columns are display snapshots only.
 */
async function migrateHrCandidateNameSync() {
  await db.query(`CREATE INDEX IF NOT EXISTS idx_employee_candidates_assigned_hr_id ON employee_candidates(assigned_hr_id) WHERE assigned_hr_id IS NOT NULL`);
  await db.query(`
    CREATE OR REPLACE FUNCTION sync_hr_name_to_candidates() RETURNS trigger AS $$
    BEGIN
      IF NEW.full_name IS DISTINCT FROM OLD.full_name AND UPPER(NEW.role::text) = 'HR' THEN
        UPDATE employee_candidates
           SET assigned_hr_name = NEW.full_name, hr_name = NEW.full_name, selected_hr = NEW.full_name
         WHERE assigned_hr_id = NEW.id;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  await db.query(`DROP TRIGGER IF EXISTS trg_sync_hr_name_to_candidates ON users`);
  await db.query(`
    CREATE TRIGGER trg_sync_hr_name_to_candidates
    AFTER UPDATE OF full_name ON users
    FOR EACH ROW EXECUTE PROCEDURE sync_hr_name_to_candidates()
  `);
  logger.info('migrate_hr_candidate_name_sync: done');
}

module.exports = { migrateHrCandidateNameSync };

if (require.main === module) {
  migrateHrCandidateNameSync().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
