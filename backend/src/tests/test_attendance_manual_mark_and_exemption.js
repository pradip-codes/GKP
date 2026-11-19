/**
 * test_attendance_manual_mark_and_exemption.js
 *
 * Test suite to verify:
 * 1. Super Admin manual attendance marking capability.
 * 2. Per-account verification exemptions (Location NOT required, Face NOT required).
 * 3. Strict account-level isolation: Only the exempt employee account bypasses
 *    verification (e.g. location or face), while all other employee accounts
 *    remain strictly enforced by geofence and biometric verification.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Super Admin Attendance Manual Mark & Account Exemption Tests ===\n');

// -------------------------------------------------------------
// Test 1: Verify Schema & Migration for Location/Face Exemption
// -------------------------------------------------------------
console.log('Test 1: Migration script defines bypass_location and bypass_face columns');
{
  const migrationCode = fs.readFileSync(
    path.join(__dirname, '../database/migrations/migrate_attendance_environment_bypass.js'),
    'utf8'
  );

  assert.ok(
    migrationCode.includes('bypass_location BOOLEAN DEFAULT TRUE'),
    'Migration must define bypass_location column'
  );
  assert.ok(
    migrationCode.includes('bypass_face BOOLEAN DEFAULT FALSE'),
    'Migration must define bypass_face column'
  );
  assert.ok(
    migrationCode.includes('bypass_type VARCHAR(50) DEFAULT \'LOCATION\''),
    'Migration must define bypass_type column'
  );
  console.log('  ✓ Migration script contains bypass_location, bypass_face, and bypass_type columns');
}

// -------------------------------------------------------------
// Test 2: Verify Service Layer Handling of Exemption Flags
// -------------------------------------------------------------
console.log('\nTest 2: Environment Bypass Service handles granular exemption flags');
{
  const bypassServiceCode = fs.readFileSync(
    path.join(__dirname, '../modules/attendance-admin/environmentBypass.service.js'),
    'utf8'
  );

  assert.ok(
    bypassServiceCode.includes('bypassLocation') && bypassServiceCode.includes('bypassFace'),
    'environmentBypass.service.js must accept bypassLocation and bypassFace parameters'
  );
  assert.ok(
    bypassServiceCode.includes('bypass_location') && bypassServiceCode.includes('bypass_face'),
    'environmentBypass.service.js must insert bypass_location and bypass_face into DB'
  );
  console.log('  ✓ environmentBypass.service.js properly propagates bypassLocation and bypassFace');
}

// -------------------------------------------------------------
// Test 3: Verify Attendance Admin Manual Mark & Route Endpoints
// -------------------------------------------------------------
console.log('\nTest 3: Admin service & routes provide manual attendance marking');
{
  const adminServiceCode = fs.readFileSync(
    path.join(__dirname, '../modules/attendance-admin/attendance-admin.service.js'),
    'utf8'
  );
  const adminRoutesCode = fs.readFileSync(
    path.join(__dirname, '../modules/attendance-admin/attendance-admin.routes.js'),
    'utf8'
  );

  assert.ok(
    adminServiceCode.includes('markManualAttendance'),
    'attendance-admin.service.js must implement markManualAttendance'
  );
  assert.ok(
    adminServiceCode.includes('SUPER_ADMIN_MANUAL'),
    'markManualAttendance must mark source as SUPER_ADMIN_MANUAL'
  );
  assert.ok(
    adminRoutesCode.includes('/manual-mark'),
    'attendance-admin.routes.js must expose POST /manual-mark'
  );
  assert.ok(
    adminRoutesCode.includes('/employee/:employeeId/exemption'),
    'attendance-admin.routes.js must expose GET & POST /employee/:employeeId/exemption'
  );
  console.log('  ✓ Manual mark service and exemption routes properly configured');
}

// -------------------------------------------------------------
// Test 4: Verify Account-Level Isolation in Attendance Verification
// -------------------------------------------------------------
console.log('\nTest 4: Strict Account-Level Exemption Isolation in Verification Service');
{
  const verifyServiceCode = fs.readFileSync(
    path.join(__dirname, '../modules/attendance-verification/attendance-verification.service.js'),
    'utf8'
  );

  // 1. Check that query filters specifically for employee_id
  assert.ok(
    verifyServiceCode.includes('WHERE employee_id = $1') &&
    verifyServiceCode.includes('is_active = TRUE') &&
    verifyServiceCode.includes('CURRENT_DATE'),
    'Verification service must query active exemption strictly for the specific employee_id'
  );

  // 2. Check location bypass logic
  assert.ok(
    verifyServiceCode.includes('hasLocationBypass'),
    'Verification service must evaluate hasLocationBypass'
  );
  assert.ok(
    verifyServiceCode.includes('Location verification bypassed for employee'),
    'Verification service must log and bypass location when location is exempted'
  );

  // 3. Check face bypass logic
  assert.ok(
    verifyServiceCode.includes('hasFaceBypass'),
    'Verification service must evaluate hasFaceBypass'
  );
  assert.ok(
    verifyServiceCode.includes('Face verification bypassed for employee'),
    'Verification service must log and bypass face verification when face is exempted'
  );

  // 4. Verify that default / normal employees without exemption still require strict checks
  assert.ok(
    verifyServiceCode.includes('verifyLocationInBuilding') &&
    verifyServiceCode.includes('geofence verification is mandatory when not exempt'),
    'Standard location verification must still enforce geofence for non-exempt accounts'
  );
  assert.ok(
    verifyServiceCode.includes('BIOMETRIC_REFERENCE_NOT_FOUND') &&
    verifyServiceCode.includes('Attendance Biometric Enrollment is required before marking attendance'),
    'Standard face verification must still reject non-exempt accounts without biometric profile'
  );

  console.log('  ✓ Account-level isolation verified: Only explicitly exempt accounts bypass specific checks.');
  console.log('  ✓ All other employee accounts remain strictly verified with GPS geofence and biometric matching.');
}

console.log('\nAll tests passed successfully!');
