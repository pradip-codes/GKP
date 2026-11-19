const { query } = require('../../config/database');
const logger = require('../../config/logger');

async function migrateOfficeBuildingGeofences() {
  logger.info('[MIGRATION] Running Office Building Geofences migration...');

  try {
    await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // 1. Create office_building_geofences table
    await query(`
      CREATE TABLE IF NOT EXISTS office_building_geofences (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(150) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        address TEXT,
        latitude NUMERIC,
        longitude NUMERIC,
        radius_meters INTEGER DEFAULT 10,
        polygon_coordinates JSONB NOT NULL,
        tolerance_meters INTEGER NOT NULL DEFAULT 10,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE office_building_geofences ADD COLUMN IF NOT EXISTS latitude NUMERIC;
      ALTER TABLE office_building_geofences ADD COLUMN IF NOT EXISTS longitude NUMERIC;
      ALTER TABLE office_building_geofences ADD COLUMN IF NOT EXISTS radius_meters INTEGER DEFAULT 10;
    `);

    // 2. Add indexes
    await query(`
      CREATE INDEX IF NOT EXISTS idx_office_buildings_code ON office_building_geofences(code);
      CREATE INDEX IF NOT EXISTS idx_office_buildings_active ON office_building_geofences(is_active);
    `);

    // 3. Add location and building tracking columns to attendance_verification_sessions
    await query(`
      ALTER TABLE attendance_verification_sessions 
      ADD COLUMN IF NOT EXISTS location_lat NUMERIC,
      ADD COLUMN IF NOT EXISTS location_lng NUMERIC,
      ADD COLUMN IF NOT EXISTS location_accuracy NUMERIC,
      ADD COLUMN IF NOT EXISTS location_status VARCHAR(40) DEFAULT 'PENDING',
      ADD COLUMN IF NOT EXISTS matched_building_id UUID REFERENCES office_building_geofences(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS matched_building_name VARCHAR(150);
    `);

    // 4. Add matched_building columns to employee_attendance
    await query(`
      ALTER TABLE employee_attendance
      ADD COLUMN IF NOT EXISTS matched_building_name VARCHAR(150),
      ADD COLUMN IF NOT EXISTS location_status VARCHAR(40) DEFAULT 'PASSED';
    `);

    // 5. Remove old main company entry if present
    await query(`
      DELETE FROM office_building_geofences 
      WHERE code = 'MAIN_OFFICE_HQ' 
         OR (name ILIKE '%Main Office Building (Pune)%' AND code != 'PUNE_OFFICE_10M');
    `);

    // 6. Seed the Pune main office building polygon
    const defaultCoordinates = [
      [18.6194840, 73.8747250],
      [18.6195630, 73.8748690],
      [18.6194760, 73.8748440],
      [18.6194570, 73.8747940]
    ];

    await query(
      `INSERT INTO office_building_geofences (name, code, address, latitude, longitude, radius_meters, polygon_coordinates, tolerance_meters, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (code) DO UPDATE SET 
         name = EXCLUDED.name,
         address = EXCLUDED.address,
         latitude = EXCLUDED.latitude,
         longitude = EXCLUDED.longitude,
         radius_meters = EXCLUDED.radius_meters,
         polygon_coordinates = EXCLUDED.polygon_coordinates,
         tolerance_meters = EXCLUDED.tolerance_meters,
         is_active = TRUE,
         updated_at = NOW()`,
      [
        'Main Office Building (Pune)',
        'PUNE_OFFICE_10M',
        'Main Office Building Premises, Pune',
        18.6194950,
        73.8748080,
        0,
        JSON.stringify(defaultCoordinates),
        3,
        true
      ]
    );
    logger.info('[MIGRATION] Seeded Pune main office building polygon.');

    // 7. Seed the Patna branch office building polygon
    const patnaCoordinates = [
      [25.6137890, 85.1431130],
      [25.6137780, 85.1431670],
      [25.6137460, 85.1431590],
      [25.6137380, 85.1431460]
    ];

    await query(
      `INSERT INTO office_building_geofences (name, code, address, latitude, longitude, radius_meters, polygon_coordinates, tolerance_meters, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (code) DO UPDATE SET 
         name = EXCLUDED.name,
         address = EXCLUDED.address,
         latitude = EXCLUDED.latitude,
         longitude = EXCLUDED.longitude,
         radius_meters = EXCLUDED.radius_meters,
         polygon_coordinates = EXCLUDED.polygon_coordinates,
         tolerance_meters = EXCLUDED.tolerance_meters,
         is_active = TRUE,
         updated_at = NOW()`,
      [
        'Patna Branch Office',
        'PATNA_BRANCH_OFFICE',
        'Patna Branch Office Building Premises, Bihar',
        25.6137628,
        85.1431463,
        0,
        JSON.stringify(patnaCoordinates),
        3,
        true
      ]
    );
    logger.info('[MIGRATION] Seeded Patna branch office building polygon.');

    logger.info('[MIGRATION COMPLETE] Office building geofences table and columns created successfully.');
  } catch (err) {
    logger.error('Office Building Geofences Migration Error:', err);
    throw err;
  }
}

if (require.main === module) {
  migrateOfficeBuildingGeofences()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { migrateOfficeBuildingGeofences };
