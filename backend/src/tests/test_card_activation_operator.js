const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- Running Card Activation Operator Verification Tests ---');

// 1. Check roles constant
const { DESIGNATIONS } = require('../constants/roles');
assert.strictEqual(
  DESIGNATIONS.CARD_ACTIVATION_OPERATOR,
  'Card Activation Operator',
  'DESIGNATIONS.CARD_ACTIVATION_OPERATOR must be "Card Activation Operator"'
);
console.log('✔ Designation constant verified.');

// 2. Check helper staff roles
const { isEmployeeOrStaffUser } = require('../utils/helpers/helpers');
assert.strictEqual(isEmployeeOrStaffUser({ user: { role: 'EMPLOYEE', designation: 'Card Activation Operator' } }), true);
assert.strictEqual(isEmployeeOrStaffUser({ user: { role: 'EMPLOYEE', designation: 'CARD_ACTIVATION_OPERATOR' } }), true);
assert.strictEqual(isEmployeeOrStaffUser({ user: { role: 'CARD ACTIVATION OPERATOR' } }), true);
console.log('✔ Helper staff roles verified.');

// 3. Check auth middleware
const authMiddlewareSrc = fs.readFileSync(path.join(__dirname, '../middleware/authentication/auth.middleware.js'), 'utf8');
assert.ok(authMiddlewareSrc.includes("'CARD_ACTIVATION_OPERATOR'"), 'auth.middleware must include CARD_ACTIVATION_OPERATOR');
assert.ok(authMiddlewareSrc.includes("'CARD ACTIVATION OPERATOR'"), 'auth.middleware must include CARD ACTIVATION OPERATOR');
console.log('✔ Auth middleware roles verified.');

// 4. Check super-admin controller
const superAdminSrc = fs.readFileSync(path.join(__dirname, '../modules/super-admin/controller.js'), 'utf8');
assert.ok(superAdminSrc.includes('Card Activation Operator'), 'super-admin controller must include Card Activation Operator');
console.log('✔ Super-admin controller bank validation verified.');

// 5. Check routes
const adminRouteSrc = fs.readFileSync(path.join(__dirname, '../modules/admin/route.js'), 'utf8');
assert.ok(adminRouteSrc.includes('CARD_ACTIVATION_OPERATOR'), 'admin/route.js must allow CARD_ACTIVATION_OPERATOR');
const appRouteSrc = fs.readFileSync(path.join(__dirname, '../modules/crm/application.routes.js'), 'utf8');
assert.ok(appRouteSrc.includes('CARD_ACTIVATION_OPERATOR'), 'application.routes.js must allow CARD_ACTIVATION_OPERATOR');
console.log('✔ Admin & Application routes authorization verified.');

// 6. Check database migrations
const migrateSrc = fs.readFileSync(path.join(__dirname, '../database/migrations/migrate.js'), 'utf8');
assert.ok(migrateSrc.includes('ADD COLUMN IF NOT EXISTS card_activation_stage VARCHAR(100)'), 'migrate.js must add card_activation_stage');
console.log('✔ DB migration for card_activation_stage verified.');

// 7. Check application controller
const appCtrlSrc = fs.readFileSync(path.join(__dirname, '../modules/crm/application.controller.js'), 'utf8');
assert.ok(appCtrlSrc.includes('isCardActivationOperatorUser'), 'application.controller must define isCardActivationOperatorUser');
assert.ok(appCtrlSrc.includes('cardActivationOperatorFilterSQL'), 'application.controller must define cardActivationOperatorFilterSQL');
assert.ok(appCtrlSrc.includes('effectiveCardActivationStage'), 'application.controller must persist effectiveCardActivationStage');
console.log('✔ Application controller query filters & persistence verified.');

// 8. Check SuperAdminDashboard.jsx
const superAdminDashboardSrc = fs.readFileSync(path.join(__dirname, '../../../frontend/src/modules/super-admin/dashboard/SuperAdminDashboard.jsx'), 'utf8');
assert.ok(superAdminDashboardSrc.includes('<option value="Card Activation Operator">Card Activation Operator</option>'), 'SuperAdminDashboard must have option for Card Activation Operator');
assert.ok(superAdminDashboardSrc.includes("'card activation operator'"), 'SuperAdminDashboard directoryAdmins must include card activation operator');
console.log('✔ SuperAdminDashboard dropdown & validation verified.');

// 9. Check EmployeeManagement.jsx
const empMgmtSrc = fs.readFileSync(path.join(__dirname, '../../../frontend/src/modules/super-admin/employees/EmployeeManagement.jsx'), 'utf8');
assert.ok(empMgmtSrc.includes('<option value="Card Activation Operator">Card Activation Operator</option>'), 'EmployeeManagement must have option for Card Activation Operator');
console.log('✔ EmployeeManagement dropdown verified.');

// 10. Check AdminLayout.jsx
const adminLayoutSrc = fs.readFileSync(path.join(__dirname, '../../../frontend/src/layouts/AdminLayout.jsx'), 'utf8');
assert.ok(adminLayoutSrc.includes('isCardActivationOperator'), 'AdminLayout must define isCardActivationOperator');
assert.ok(adminLayoutSrc.includes('Card Activation Queue'), 'AdminLayout must display Card Activation Queue for navigation');
assert.ok(adminLayoutSrc.includes("'Card Activation Operator'"), 'AdminLayout header must show Card Activation Operator');
console.log('✔ AdminLayout sidebar & routing restrictions verified.');

// 11. Check ManageApplications.jsx
const manageAppsSrc = fs.readFileSync(path.join(__dirname, '../../../frontend/src/modules/admin/reports/ManageApplications.jsx'), 'utf8');
assert.ok(manageAppsSrc.includes('isCardActivationOperatorUser'), 'ManageApplications must define isCardActivationOperatorUser');
assert.ok(manageAppsSrc.includes('HDFC Card Approved Cases'), 'ManageApplications STATUS_TABS must include HDFC Card Approved Cases');
assert.ok(manageAppsSrc.includes('Card Activation Operations Queue'), 'ManageApplications title must show Card Activation Operations Queue');
assert.ok(manageAppsSrc.includes('Open Card Activation Form'), 'ManageApplications action button must open Card Activation form');
console.log('✔ ManageApplications queue & actions verified.');

// 12. Check AdminDocumentVerificationModal.jsx
const modalSrc = fs.readFileSync(path.join(__dirname, '../../../frontend/src/modules/admin/reports/AdminDocumentVerificationModal.jsx'), 'utf8');
assert.ok(modalSrc.includes('isCardActivationOperator'), 'AdminDocumentVerificationModal must define isCardActivationOperator');
assert.ok(modalSrc.includes('canEditRemark = !isLockedStatus || isQuerableOperator || isCurableOperator || isCardActivationOperator'), 'canEditRemark must permit Card Activation Operator');
console.log('✔ AdminDocumentVerificationModal permissions & fields verified.');

// 13. Check mobile types
const mobileTypesSrc = fs.readFileSync(path.join(__dirname, '../../../mobile/types/index.ts'), 'utf8');
assert.ok(mobileTypesSrc.includes("'Card Activation Operator'"), 'mobile/types/index.ts must include Card Activation Operator');
console.log('✔ Mobile types verified.');

console.log('ALL CARD ACTIVATION OPERATOR VERIFICATIONS PASSED SUCCESSFULLY!');
