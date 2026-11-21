const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- Testing Curable Operator Form Enhancements ---');

// Test 1: Frontend Modal Verification
console.log('Test 1: Verify AdminDocumentVerificationModal contains all 4 requirements');
const modalPath = path.resolve(__dirname, '../../../frontend/src/modules/admin/reports/AdminDocumentVerificationModal.jsx');
const modalContent = fs.readFileSync(modalPath, 'utf8');

// 1.1 Remove Complete & Complete Digital Journey, and show only the 5 options
assert.ok(!modalContent.includes('<option value="Complete">Complete</option>'), 'Must NOT include Complete option in Cureable Remark');
assert.ok(!modalContent.includes('<option value="Complete Digital Journey">Complete Digital Journey</option>'), 'Must NOT include Complete Digital Journey option in Cureable Remark');
assert.ok(modalContent.includes('<option value="PHYSICAL PENDING">PHYSICAL PENDING</option>'), 'Must include PHYSICAL PENDING option');
assert.ok(modalContent.includes('<option value="PHYSICAL SOLVED">PHYSICAL SOLVED</option>'), 'Must include PHYSICAL SOLVED option');
assert.ok(modalContent.includes('<option value="DIGITAL PENDING">DIGITAL PENDING</option>'), 'Must include DIGITAL PENDING option');
assert.ok(modalContent.includes('<option value="DIGITAL SOLVED">DIGITAL SOLVED</option>'), 'Must include DIGITAL SOLVED option');
assert.ok(modalContent.includes('<option value="NOT REQUIRED">NOT REQUIRED</option>'), 'Must include NOT REQUIRED option');

// 1.2 Address selectable buttons & manual text input field
assert.ok(modalContent.includes('CURRENT ADDRESS'), 'Must render CURRENT ADDRESS button');
assert.ok(modalContent.includes('OFFICE ADDRESS'), 'Must render OFFICE ADDRESS button');
assert.ok(modalContent.includes("setAddressType('Current Address')"), 'Must allow selecting Current Address');
assert.ok(modalContent.includes("setAddressType('Office Address')"), 'Must allow selecting Office Address');
assert.ok(modalContent.includes('addressType'), 'Must use addressType state');
assert.ok(modalContent.includes('details manually...'), 'Must provide manual text input field for address');
assert.ok(modalContent.includes('activeAddressText'), 'Must use activeAddressText for manual address');
assert.ok(modalContent.includes('setActiveAddressText'), 'Must provide setActiveAddressText handler');

// 1.3 Final Form displays and saves Cureable Remark & Address
assert.ok(modalContent.includes('Cureable Remark: '), 'Final form must display Cureable Remark in summary');
assert.ok(modalContent.includes('Address: '), 'Final form must display Address in summary');
assert.ok(modalContent.includes("queryable_remark: queryableRemark || 'NOT REQUIRED'"), 'Must save queryable_remark');
assert.ok(modalContent.includes("address_type: addressType || 'Current Address'"), 'Must save address_type');
assert.ok(modalContent.includes("curing_address: activeAddressText || ''"), 'Must save manual curing_address');

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
assert.ok(controllerContent.includes('effectiveAddressText'), 'Backend must extract effectiveAddressText');
assert.ok(controllerContent.includes('curing_address'), 'Backend must handle curing_address');

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
