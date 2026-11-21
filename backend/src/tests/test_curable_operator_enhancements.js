const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- Testing Curable Operator Form Enhancements ---');

// Test 1: Frontend Modal Verification
console.log('Test 1: Verify AdminDocumentVerificationModal contains all 4 requirements');
const modalPath = path.resolve(__dirname, '../../../frontend/src/modules/admin/reports/AdminDocumentVerificationModal.jsx');
const modalContent = fs.readFileSync(modalPath, 'utf8');

// 1.1 Complete & Complete Digital Journey in Cureable Remark
assert.ok(modalContent.includes('<option value="Complete">Complete</option>'), 'Must include Complete option');
assert.ok(modalContent.includes('<option value="Complete Digital Journey">Complete Digital Journey</option>'), 'Must include Complete Digital Journey option');
assert.ok(modalContent.includes("setQueryableRemark('Complete Digital Journey')"), 'Must update Cureable Remark on Complete Digital Journey');

// 1.2 Address field
assert.ok(modalContent.includes('4. ADDRESS'), 'Must render ADDRESS label');
assert.ok(modalContent.includes('<option value="Current Address">Current Address</option>'), 'Must include Current Address option');
assert.ok(modalContent.includes('<option value="Office Address">Office Address</option>'), 'Must include Office Address option');
assert.ok(modalContent.includes('addressType'), 'Must use addressType state');

// 1.3 Save Remarks & Stage moves to Cured & Approved
assert.ok(modalContent.includes("payload.status = 'approved'"), 'Must set status to approved for curable operator');
assert.ok(modalContent.includes("payload.final_status = 'Approved'"), 'Must set final_status to Approved');

// 1.4 Digital Journey Button available for PHYSICAL and NOT REQUIRED
assert.ok(modalContent.includes("'physical'"), 'Must allow physical in digital journey condition');
assert.ok(modalContent.includes("'not required'"), 'Must allow not required in digital journey condition');

console.log('✓ AdminDocumentVerificationModal frontend checks passed.');

// Test 2: Backend Controller & Filter Verification
console.log('Test 2: Verify application.controller.js backend logic');
const controllerPath = path.resolve(__dirname, '../modules/crm/application.controller.js');
const controllerContent = fs.readFileSync(controllerPath, 'utf8');

// Status filter excludes approved from rejected tab
assert.ok(controllerContent.includes("combined.status IN ('approved', 'sanctioned', 'super_admin_approved', 'disbursed')"), 'statusFilterBlockSQL must exclude approved from rejected tab');
assert.ok(controllerContent.includes("LOWER(COALESCE(combined.final_status, '')) = 'approved'"), 'statusFilterBlockSQL must handle final_status approved');

// Selects address_type and curing_address_type
assert.ok(controllerContent.includes('as address_type'), 'listApplications must select address_type');
assert.ok(controllerContent.includes('as queryable_remark'), 'listApplications must select queryable_remark');

// Curable operator can approve
assert.ok(controllerContent.includes('isCurableOperatorLocal'), 'Must recognize curable operator in updateApplicationDetails');

console.log('✓ application.controller.js backend checks passed.');

// Test 3: ManageApplications UI Tab & Count Verification
console.log('Test 3: Verify ManageApplications.jsx statusCounts & onRefresh');
const managePath = path.resolve(__dirname, '../../../frontend/src/modules/admin/reports/ManageApplications.jsx');
const manageContent = fs.readFileSync(managePath, 'utf8');

assert.ok(manageContent.includes("acc['approved'] = (acc['approved'] || 0) + 1"), 'Must accurately count approved');
assert.ok(manageContent.includes("setStatus('approved')"), 'Must switch to approved tab on modal refresh for curable operator');

console.log('✓ ManageApplications.jsx checks passed.');

console.log('\n========================================');
console.log('✓ All Curable Operator Enhancement Tests Passed Successfully!');
console.log('========================================');
