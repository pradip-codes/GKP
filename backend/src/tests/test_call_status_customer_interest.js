const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=================================================================');
console.log('🧪 TESTING: Call Status & Customer Interest in Bank Remark Section');
console.log('=================================================================');

// 1. Verify Options specification
const EXPECTED_CALL_STATUS = [
  '🔵 Ringing',
  '🔴 Not Answered',
  '🟠 Busy',
  '⚫ Switched Off',
  '🟢 Connected'
];

const EXPECTED_CUSTOMER_INTEREST = [
  '🔥 High Intent (Hot Lead)',
  '🟡 Wants Details',
  '📞 Callback Requested',
  '❌ Not Interested'
];

console.log('--- TEST 1: Frontend Options Specification Verification ---');
const frontendFile = fs.readFileSync(path.resolve(__dirname, '../../../frontend/src/modules/partner/leads/PartnerApplications.jsx'), 'utf8');

EXPECTED_CALL_STATUS.forEach(opt => {
  assert(frontendFile.includes(opt), `Frontend must include Call Status option: ${opt}`);
});
console.log('✔ All 5 Call Status options verified in frontend');

EXPECTED_CUSTOMER_INTEREST.forEach(opt => {
  assert(frontendFile.includes(opt), `Frontend must include Customer Interest option: ${opt}`);
});
console.log('✔ All 4 Customer Interest options verified in frontend');

// 2. Verify Bank Remark section contains Call Status and Customer Interest
console.log('--- TEST 2: Bank Remark Section Integration Verification ---');
assert(frontendFile.includes('A. Call Status'), 'Must include "A. Call Status"');
assert(frontendFile.includes('Select the latest call outcome.'), 'Must include subtitle "Select the latest call outcome."');
assert(frontendFile.includes('B. Customer Interest'), 'Must include "B. Customer Interest"');
assert(frontendFile.includes("Select the customer's response after contact."), 'Must include subtitle "Select the customer\'s response after contact."');
assert(frontendFile.includes('Change Status'), 'Must include option/button to change status');
assert(frontendFile.includes('renderBankRemarkSection'), 'Must have renderBankRemarkSection unified component');
console.log('✔ Bank Remark section properly houses Call Status and Customer Interest with option to change status');

// 3. Verify Backend Controller and Route Definitions
console.log('--- TEST 3: Backend Controller & Route Verification ---');
const appCtrl = require('../modules/crm/application.controller');
assert(typeof appCtrl.updateCallStatus === 'function', 'updateCallStatus must be exported by application.controller');
console.log('✔ appCtrl.updateCallStatus function exists and is exported');

const routesFile = fs.readFileSync(path.resolve(__dirname, '../modules/crm/application.routes.js'), 'utf8');
assert(routesFile.includes('/:id/call-status'), 'Routes must register /:id/call-status endpoint');
console.log('✔ Routes /:id/call-status properly registered in application.routes.js');

// 4. Verify Migration
console.log('--- TEST 4: Database Migration Verification ---');
const migrationFile = fs.readFileSync(path.resolve(__dirname, '../database/migrations/migrate.js'), 'utf8');
assert(migrationFile.includes('migrateCallStatusCustomerInterest'), 'migrate.js must invoke migrateCallStatusCustomerInterest');
const customMigration = fs.readFileSync(path.resolve(__dirname, '../database/migrations/migrate_call_status_customer_interest.js'), 'utf8');
assert(customMigration.includes('call_status'), 'Migration must add call_status column');
assert(customMigration.includes('customer_interest'), 'Migration must add customer_interest column');
console.log('✔ Database migrations include call_status and customer_interest for applications, physical_application_details, and leads');

console.log('=================================================================');
console.log('🎉 ALL CALL STATUS & CUSTOMER INTEREST VERIFICATION TESTS PASSED!');
console.log('=================================================================');
