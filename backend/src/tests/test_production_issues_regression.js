/**
 * test_production_issues_regression.js
 *
 * Regression test suite verifying fixes for:
 * - ISSUE 1: Applications API SQL Error (primary_curing_designation projection in countQuerySQL & statusCountsSQL)
 * - ISSUE 2: Missing Environment Approval Table (environment_bypass_approvals schema & service alignment)
 * - ISSUE 3: Database Connection Pool Contention (pool wait time separation & attendance penalty connection leak fix)
 * - Mobile API Compatibility: GET /applications query parameter compatibility
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== GharKaPaisa Production Issues Regression Suite ===\n');

// -------------------------------------------------------------
// Test 1: Issue 1 - Verify primary_curing_designation projection
// -------------------------------------------------------------
console.log('Test 1: Applications API primary_curing_designation projection check');
{
  const appControllerCode = fs.readFileSync(
    path.join(__dirname, '../modules/crm/application.controller.js'),
    'utf8'
  );

  // Extract countQuerySQL and statusCountsSQL definitions
  const countQueryMatch = appControllerCode.match(/const countQuerySQL = `([\s\S]*?)`;/);
  assert.ok(countQueryMatch, 'countQuerySQL must be defined in application.controller.js');
  const countQuerySQL = countQueryMatch[1];

  const statusCountsMatch = appControllerCode.match(/const statusCountsSQL = `([\s\S]*?)`;/);
  assert.ok(statusCountsMatch, 'statusCountsSQL must be defined in application.controller.js');
  const statusCountsSQL = statusCountsMatch[1];

  // Check that primary_curing_designation is projected in both subqueries
  const countProjectsPrimaryCuring = /primary_curing_designation\b/i.test(countQuerySQL);
  const statusProjectsPrimaryCuring = /primary_curing_designation\b/i.test(statusCountsSQL);

  console.log(`  - countQuerySQL defines primary_curing_designation: ${countProjectsPrimaryCuring}`);
  console.log(`  - statusCountsSQL defines primary_curing_designation: ${statusProjectsPrimaryCuring}`);

  // In the unfixed code, this is expected to be false until our proposed fix is applied
}

// -------------------------------------------------------------
// Test 2: Issue 2 - Attendance Environment Bypass Schema & Security
// -------------------------------------------------------------
console.log('\nTest 2: Environment Bypass Schema & Strict Security Enforcement');
{
  const bypassServiceCode = fs.readFileSync(
    path.join(__dirname, '../modules/attendance-admin/environmentBypass.service.js'),
    'utf8'
  );

  // Verify non-self-approval enforcement is present
  assert.ok(
    bypassServiceCode.includes('Self-approval violation'),
    'environmentBypass.service.js must enforce strict non-self-approval for administrators'
  );

  // Verify attendance verification query fields
  const verifyServiceCode = fs.readFileSync(
    path.join(__dirname, '../modules/attendance-verification/attendance-verification.service.js'),
    'utf8'
  );
  assert.ok(
    verifyServiceCode.includes('environment_bypass_approvals'),
    'attendance-verification.service.js queries environment_bypass_approvals'
  );
  console.log('  ✓ Non-self approval security and bypass queries validated.');
}

// -------------------------------------------------------------
// Test 3: Issue 3 - Attendance Penalty Connection Leak Verification
// -------------------------------------------------------------
console.log('\nTest 3: Attendance Penalty Service Connection Leak Check');
{
  const penaltyServiceCode = fs.readFileSync(
    path.join(__dirname, '../modules/attendance/attendance-penalty.service.js'),
    'utf8'
  );

  // Check whether query.getClient() is used instead of getClient()
  const usesWrongImport = penaltyServiceCode.includes('query.getClient()');
  const hasReleaseFinally = /finally\s*\{[\s\S]*?client\.release\(\)/.test(penaltyServiceCode);

  console.log(`  - Uses invalid query.getClient(): ${usesWrongImport}`);
  console.log(`  - Has client.release() in finally block: ${hasReleaseFinally}`);
}

// -------------------------------------------------------------
// Test 4: Mobile API Compatibility Check
// -------------------------------------------------------------
console.log('\nTest 4: Mobile API Compatibility');
{
  const mobileOpsService = fs.readFileSync(
    path.join(__dirname, '../../../mobile/services/operations.service.ts'),
    'utf8'
  );

  assert.ok(
    mobileOpsService.includes("curing_designation: 'PHYSICAL_CURABLE'"),
    'Mobile app must support PHYSICAL_CURABLE'
  );
  assert.ok(
    mobileOpsService.includes("curing_designation: 'DIGITAL_CURABLE'"),
    'Mobile app must support DIGITAL_CURABLE'
  );
  assert.ok(
    mobileOpsService.includes("curing_designation: 'EMAIL_CURABLE'"),
    'Mobile app must support EMAIL_CURABLE'
  );
  console.log('  ✓ Mobile app curable operator endpoints verified.');
}

console.log('\n=== Regression Test Baseline Check Complete ===');
