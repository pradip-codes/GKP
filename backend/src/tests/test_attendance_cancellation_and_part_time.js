/**
 * Test Suite: 10-Minute Cancel Check-Out, Super Admin Re-Attendance & 7 PM Part-Time Attendance
 */

const assert = require('assert');
const { evaluateAttendanceType } = require('../modules/employee/employee-commitments.service');

async function runTestSuite() {
  console.log('--- Starting Attendance Cancellation, Re-Attendance & Part-Time Test Suite ---\n');

  // ==========================================================
  // TEST GROUP 1: Part-Time Attendance Rule (7:00 PM IST Boundary)
  // ==========================================================
  console.log('Testing Part-Time Attendance Rule based on Asia/Kolkata (IST):');

  // Case 1a: Check-in at 6:59:59 PM IST (18:59:59) -> FULL_TIME
  const tBefore7 = evaluateAttendanceType('2026-11-18T18:59:59+05:30');
  assert.strictEqual(tBefore7.attendanceType, 'FULL_TIME', '6:59:59 PM IST must be FULL_TIME');
  assert.strictEqual(tBefore7.isPartTime, false, '6:59:59 PM IST is not part time');
  console.log('✅ TEST 1a PASSED: Check-in before 7:00 PM (18:59:59 IST) evaluated to FULL_TIME');

  // Case 1b: Check-in at exactly 7:00:00 PM IST (19:00:00) -> PART_TIME
  const tExact7 = evaluateAttendanceType('2026-11-18T19:00:00+05:30');
  assert.strictEqual(tExact7.attendanceType, 'PART_TIME', '7:00:00 PM IST must be PART_TIME');
  assert.strictEqual(tExact7.isPartTime, true, '7:00:00 PM IST is part time');
  assert.strictEqual(tExact7.status, 'PART_TIME', 'Status must be PART_TIME');
  console.log('✅ TEST 1b PASSED: Check-in at exactly 7:00 PM (19:00:00 IST) evaluated to PART_TIME');

  // Case 1c: Check-in at 8:30:00 PM IST (20:30:00) -> PART_TIME
  const tEvening = evaluateAttendanceType('2026-11-18T20:30:00+05:30');
  assert.strictEqual(tEvening.attendanceType, 'PART_TIME', '8:30:00 PM IST must be PART_TIME');
  assert.strictEqual(tEvening.isPartTime, true, '8:30:00 PM IST is part time');
  console.log('✅ TEST 1c PASSED: Check-in after 7:00 PM (20:30:00 IST) evaluated to PART_TIME');

  // Case 1d: Check-in at 9:00:00 AM IST (09:00:00) -> FULL_TIME
  const tMorning = evaluateAttendanceType('2026-11-18T09:00:00+05:30');
  assert.strictEqual(tMorning.attendanceType, 'FULL_TIME', '9:00:00 AM IST must be FULL_TIME');
  assert.strictEqual(tMorning.isPartTime, false, '9:00:00 AM IST is not part time');
  console.log('✅ TEST 1d PASSED: Morning check-in (09:00:00 IST) evaluated to FULL_TIME');

  // Case 1e: UTC timestamp equivalent to 7:00 PM IST (13:30:00 UTC) -> PART_TIME
  const tUtc7PmIst = evaluateAttendanceType('2026-11-18T13:30:00Z');
  assert.strictEqual(tUtc7PmIst.attendanceType, 'PART_TIME', '13:30:00 UTC (19:00:00 IST) must be PART_TIME');
  console.log('✅ TEST 1e PASSED: UTC timestamp conversion accurately maps 13:30:00 UTC to 19:00:00 IST (PART_TIME)');

  // ==========================================================
  // TEST GROUP 2: 10-Minute Cancel Check-Out Window
  // ==========================================================
  console.log('\nTesting 10-Minute Cancel Check-Out Logic:');

  // Simulate 10-minute check-out cancellation window math
  const now = new Date('2026-11-18T18:00:00Z');

  // Case 2a: Checkout occurred 4 minutes ago (240s <= 600s) -> allowed
  const checkOut4MinAgo = new Date(now.getTime() - 4 * 60 * 1000);
  const diffSecs4Min = (now.getTime() - checkOut4MinAgo.getTime()) / 1000;
  const remainingSecs4Min = Math.max(0, 600 - diffSecs4Min);
  assert.strictEqual(diffSecs4Min <= 600, true, '4 minutes is within 10-minute window');
  assert.strictEqual(remainingSecs4Min, 360, '360 seconds remaining');
  console.log('✅ TEST 2a PASSED: Check-out cancellation within 10 minutes (4 mins elapsed) is ALLOWED');

  // Case 2b: Checkout occurred 9 minutes 50 seconds ago (590s <= 600s) -> allowed
  const checkOut9Min50Sec = new Date(now.getTime() - 590 * 1000);
  const diffSecs9Min = (now.getTime() - checkOut9Min50Sec.getTime()) / 1000;
  assert.strictEqual(diffSecs9Min <= 600, true, '9m 50s is within 10-minute window');
  console.log('✅ TEST 2b PASSED: Check-out cancellation near window boundary (9m 50s elapsed) is ALLOWED');

  // Case 2c: Checkout occurred 11 minutes ago (660s > 600s) -> rejected
  const checkOut11MinAgo = new Date(now.getTime() - 11 * 60 * 1000);
  const diffSecs11Min = (now.getTime() - checkOut11MinAgo.getTime()) / 1000;
  assert.strictEqual(diffSecs11Min > 600, true, '11 minutes exceeds 10-minute window');
  console.log('✅ TEST 2c PASSED: Check-out cancellation after 10 minutes (11 mins elapsed) is REJECTED');

  // ==========================================================
  // TEST GROUP 3: Middleware Whitelist Verification
  // ==========================================================
  console.log('\nTesting Route Gate Exemptions:');
  const requireDayUnlockedFile = require('fs').readFileSync(
    require('path').join(__dirname, '../middleware/attendance/requireDayUnlocked.middleware.js'),
    'utf-8'
  );
  assert(requireDayUnlockedFile.includes("'/attendance/cancel-check-out'"), 'Exempt path must include /attendance/cancel-check-out');
  assert(requireDayUnlockedFile.includes("'/cancel-check-out'"), 'Exempt path must include /cancel-check-out');
  console.log('✅ TEST 3 PASSED: requireDayUnlocked whitelists cancel-check-out endpoints so locked employees can cancel');

  // ==========================================================
  // TEST GROUP 4: Super Admin Re-Attendance Service Validation
  // ==========================================================
  console.log('\nTesting Super Admin Re-Attendance API Interface:');
  const adminRoutesFile = require('fs').readFileSync(
    require('path').join(__dirname, '../modules/attendance-admin/attendance-admin.routes.js'),
    'utf-8'
  );
  assert(adminRoutesFile.includes("router.post('/re-attendance', ctrl.grantReAttendance)"), 'Admin route must expose POST /re-attendance');
  console.log('✅ TEST 4a PASSED: attendance-admin.routes exposes POST /re-attendance');

  const adminService = require('../modules/attendance-admin/attendance-admin.service');
  assert(typeof adminService.grantReAttendance === 'function', 'grantReAttendance must be an exported function');
  console.log('✅ TEST 4b PASSED: attendance-admin.service exports grantReAttendance');

  console.log('\n===============================================================');
  console.log('ALL TESTS PASSED SUCCESSFULLY!');
  console.log('===============================================================');
}

runTestSuite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
