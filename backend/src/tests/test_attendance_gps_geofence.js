const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (request) {
  if (request.includes('database') || request.endsWith('/config/database')) {
    return { query: async () => ({ rows: [] }) };
  }
  return originalRequire.apply(this, arguments);
};

const buildingGeofenceService = require('../services/geofence/buildingGeofence.service');

// Mock DB functions to avoid waiting for database connection in unit test
buildingGeofenceService.ensureGeofenceTableExists = async () => {};
buildingGeofenceService.getActiveBuildings = async () => buildingGeofenceService.DEFAULT_BUILDINGS;

const { isPointInPolygon, verifyLocationInBuilding, DEFAULT_BUILDINGS } = buildingGeofenceService;

async function runGpsGeofenceTests() {
  console.log('--- Starting Attendance GPS & Building Geofence Tests ---\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // Polygon definitions
  const building1Polygon = DEFAULT_BUILDINGS[0].polygon_coordinates;
  const building2Polygon = DEFAULT_BUILDINGS[1].polygon_coordinates;

  // Test 1: Inside the center of the Pune main office building polygon
  const b1Center = [18.6194950, 73.8748080];
  assert(
    isPointInPolygon(b1Center[0], b1Center[1], building1Polygon) === true,
    'Point inside Building 1 polygon evaluates to true'
  );
  assert(
    JSON.stringify(building1Polygon) === JSON.stringify([
      [18.6194840, 73.8747250],
      [18.6195630, 73.8748690],
      [18.6194760, 73.8748440],
      [18.6194570, 73.8747940]
    ]),
    'Pune main office polygon uses the four supplied corner coordinates'
  );
  assert(
    building1Polygon.every(([latitude, longitude]) => isPointInPolygon(latitude, longitude, building1Polygon)),
    'All four building corners are included on the geofence boundary'
  );

  // Test 2: Inside Building 2 center with accuracy = 20m (<= 50m)
  const b2Center = [19.38141, 75.46761];
  assert(
    isPointInPolygon(b2Center[0], b2Center[1], building2Polygon) === true,
    'Point inside Building 2 polygon evaluates to true'
  );

  // Test 3: Location verification with accuracy 42m (<= 50m) inside Building 1
  const resB1Acc42 = await verifyLocationInBuilding(b1Center[0], b1Center[1], 42);
  assert(
    resB1Acc42.matched === true && resB1Acc42.status === 'LOCATION_VERIFIED',
    'Accuracy 42m (<=50m) inside Building 1 is ACCEPTED'
  );

  // Test 3b: The former office location is no longer accepted by the new building boundary
  const oldOfficePoint = [18.6197370, 73.8747380];
  const resOldOffice = await verifyLocationInBuilding(oldOfficePoint[0], oldOfficePoint[1], 10);
  assert(
    resOldOffice.matched === false && resOldOffice.status === 'LOCATION_MISMATCH',
    'Former Pune office coordinates outside the new polygon are rejected'
  );

  // Test 3c: Allow a small GPS boundary buffer, but not locations beyond it
  const reportedPoint = [18.6195302, 73.8747686];
  const resReportedPoint = await verifyLocationInBuilding(reportedPoint[0], reportedPoint[1], 5.358);
  assert(
    resReportedPoint.matched === true && resReportedPoint.status === 'LOCATION_VERIFIED',
    'Reported GPS point 2m outside the polygon is accepted within the 3m boundary tolerance'
  );
  const beyondTolerancePoint = [18.6195450, 73.8747686];
  const resBeyondTolerance = await verifyLocationInBuilding(
    beyondTolerancePoint[0],
    beyondTolerancePoint[1],
    10
  );
  assert(
    resBeyondTolerance.matched === false && resBeyondTolerance.status === 'LOCATION_MISMATCH',
    'GPS points more than 3m outside the polygon are rejected'
  );

  // Test 3d: Patna branch office geofence verification
  const patnaCenter = [25.6137628, 85.1431463];
  const resPatna = await verifyLocationInBuilding(patnaCenter[0], patnaCenter[1], 15);
  assert(
    resPatna.matched === true && resPatna.status === 'LOCATION_VERIFIED' && resPatna.building.code === 'PATNA_BRANCH_OFFICE',
    'Patna branch office inside point is ACCEPTED'
  );

  const patnaNearPoint = [25.613807, 85.1431130]; // ~2m outside perimeter
  const resPatnaNear = await verifyLocationInBuilding(patnaNearPoint[0], patnaNearPoint[1], 8);
  assert(
    resPatnaNear.matched === true && resPatnaNear.status === 'LOCATION_VERIFIED',
    'Patna branch office point within 3m boundary tolerance is ACCEPTED'
  );

  const patnaFarPoint = [25.620000, 85.150000];
  const resPatnaFar = await verifyLocationInBuilding(patnaFarPoint[0], patnaFarPoint[1], 10);
  assert(
    resPatnaFar.matched === false && resPatnaFar.status === 'LOCATION_MISMATCH',
    'Point far outside Patna office is REJECTED'
  );

  // Test 4: Location verification with accuracy 103m (> 50m threshold) inside Building 1
  const resB1Acc103 = await verifyLocationInBuilding(b1Center[0], b1Center[1], 103);
  assert(
    resB1Acc103.matched === false && resB1Acc103.status === 'LOW_ACCURACY',
    'Accuracy 103m (>50m threshold) inside Building 1 is REJECTED as LOW_ACCURACY'
  );

  // Test 5: Location verification with accuracy 51m (> 50m threshold) inside Building 1
  const resB1Acc51 = await verifyLocationInBuilding(b1Center[0], b1Center[1], 51);
  assert(
    resB1Acc51.matched === false && resB1Acc51.status === 'LOW_ACCURACY',
    'Accuracy 51m (>50m threshold) is REJECTED as LOW_ACCURACY'
  );

  // Test 6: Location verification with accuracy 50m (exact boundary) inside Building 1
  const resB1Acc50 = await verifyLocationInBuilding(b1Center[0], b1Center[1], 50);
  assert(
    resB1Acc50.matched === true && resB1Acc50.status === 'LOCATION_VERIFIED',
    'Accuracy 50m (exact <=50m threshold) is ACCEPTED'
  );

  // Test 7: Point outside Building 1 with accuracy 10m (<= 50m)
  const outsidePoint = [18.63000, 73.88000];
  const resOutside = await verifyLocationInBuilding(outsidePoint[0], outsidePoint[1], 10);
  assert(
    resOutside.matched === false && resOutside.status === 'LOCATION_MISMATCH',
    'Point outside building with accurate GPS (10m) is REJECTED as LOCATION_MISMATCH'
  );

  // Test 8: Invalid coordinates (out of lat/lng bounds)
  const resInvalid = await verifyLocationInBuilding(999, 999, 10);
  assert(
    resInvalid.matched === false && resInvalid.status === 'INVALID_COORDINATES',
    'Out of bounds coordinates (999, 999) are REJECTED as INVALID_COORDINATES'
  );

  // Test 9: Zero or negative accuracy value
  const resZeroAcc = await verifyLocationInBuilding(b1Center[0], b1Center[1], 0);
  assert(
    resZeroAcc.matched === false && resZeroAcc.status === 'LOW_ACCURACY',
    'Accuracy 0m is REJECTED as LOW_ACCURACY'
  );

  // Test 10: Non-numeric / missing accuracy value
  const resNaNAcc = await verifyLocationInBuilding(b1Center[0], b1Center[1], 'undefined');
  assert(
    resNaNAcc.matched === false && resNaNAcc.status === 'LOW_ACCURACY',
    'Undefined / non-numeric accuracy is REJECTED as LOW_ACCURACY'
  );

  console.log(`\n--- Test Results: ${passed} PASSED, ${failed} FAILED ---`);
  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runGpsGeofenceTests().catch((err) => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
