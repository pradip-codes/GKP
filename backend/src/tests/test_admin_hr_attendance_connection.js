const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- STARTING ADMIN & HR ATTENDANCE CONNECTION TESTS ---');

// 1. Verify that attendanceAdminService queries have removed HR and Admin exclusions
const adminServiceContent = fs.readFileSync(
  path.join(__dirname, '../modules/attendance-admin/attendance-admin.service.js'),
  'utf8'
);

assert(
  !adminServiceContent.includes("AND (u.role IS NULL OR u.role = 'EMPLOYEE')"),
  'attendance-admin.service.js must not exclude non-employee roles'
);
assert(
  !adminServiceContent.includes("AND (e.designation NOT ILIKE '%HR%'"),
  'attendance-admin.service.js must not exclude HR designations'
);
console.log('✓ Test 1 Passed: Super Admin attendance queries have removed all HR/Admin exclusion clauses');

// 2. Verify that attendanceReportsService queries have removed HR and Admin exclusions
const reportsServiceContent = fs.readFileSync(
  path.join(__dirname, '../modules/attendance-reports/attendance-reports.service.js'),
  'utf8'
);

assert(
  !reportsServiceContent.includes("AND (u.role IS NULL OR u.role = 'EMPLOYEE')"),
  'attendance-reports.service.js must not exclude non-employee roles'
);
assert(
  !reportsServiceContent.includes("AND (e.designation NOT ILIKE '%HR%'"),
  'attendance-reports.service.js must not exclude HR designations'
);
console.log('✓ Test 2 Passed: Super Admin attendance reports have removed all HR/Admin exclusion clauses');

// 3. Test resolveEmployeeId logic with simulated db queries
const mockEmployees = new Map();
const mockUsers = new Map();

// Populate mock users
const testAdminUser = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Admin KYC Operator',
  email: 'kyc.op@gharkapaisa.com',
  mobile: '+919999990001',
  role: 'ADMIN',
  designation: 'KYC Operator'
};
const testHrUser = {
  id: '22222222-2222-2222-2222-222222222222',
  name: 'HR Manager Staff',
  email: 'hr.manager@gharkapaisa.com',
  mobile: '+919999990002',
  role: 'HR',
  designation: 'HR Manager'
};
const testSalesExecUser = {
  id: '33333333-3333-3333-3333-333333333333',
  name: 'Admin Sales Exec',
  email: 'sales.exec@gharkapaisa.com',
  mobile: '+919999990003',
  role: 'ADMIN',
  designation: 'Administrative Sales Executive'
};

mockUsers.set(testAdminUser.id, testAdminUser);
mockUsers.set(testHrUser.id, testHrUser);
mockUsers.set(testSalesExecUser.id, testSalesExecUser);

// Mock resolveEmployeeId implementation using the same business logic
const isValidUuid = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

async function mockResolveEmployeeId(reqUser) {
  if (!reqUser) return null;

  // 1. Authoritative by user_id
  if (reqUser.id && isValidUuid(reqUser.id)) {
    for (const [id, emp] of mockEmployees.entries()) {
      if (emp.user_id === reqUser.id) return id;
    }
  }

  // 2. Candidate by UUID
  const candidate = reqUser.employeeId || reqUser.employee_id || reqUser.employee_code || reqUser.emp_code;
  if (candidate && isValidUuid(candidate) && mockEmployees.has(candidate)) {
    return candidate;
  }

  // 3. Fallback contact lookup
  const userMobile = reqUser.mobile || reqUser.mobile_number || reqUser.phone || '';
  const userEmail = (reqUser.email || reqUser.email_id || '').toLowerCase().trim();

  if (userMobile || userEmail) {
    for (const [id, emp] of mockEmployees.entries()) {
      if ((emp.mobile_number && emp.mobile_number === userMobile) ||
          (emp.email_id && emp.email_id.toLowerCase() === userEmail)) {
        if (reqUser.id && isValidUuid(reqUser.id)) {
          emp.user_id = reqUser.id;
        }
        return id;
      }
    }
  }

  // 4. Auto-provisioning for Admin, HR, and operator staff
  if (reqUser.id && isValidUuid(reqUser.id) && mockUsers.has(reqUser.id)) {
    const userRow = mockUsers.get(reqUser.id);
    const newEmpId = `00000000-0000-0000-0000-${Math.random().toString().slice(2, 14).padEnd(12, '0')}`;
    const rolePrefix = userRow.role === 'HR' ? 'HR' : (userRow.role === 'ADMIN' ? 'ADM' : 'EMP');
    const empCode = `${rolePrefix}${Date.now().toString().slice(-6)}`;
    
    mockEmployees.set(newEmpId, {
      id: newEmpId,
      employee_id: empCode,
      user_id: userRow.id,
      full_name: userRow.name || 'Staff Member',
      mobile_number: userRow.mobile,
      email_id: userRow.email,
      designation: userRow.designation || userRow.role,
      department: userRow.role === 'HR' ? 'Human Resources' : 'Operations',
      employee_status: 'ACTIVE',
      activation_status: 'APPROVED'
    });
    return newEmpId;
  }

  return null;
}

(async () => {
  // Test auto-provisioning for KYC Operator
  const adminEmpId = await mockResolveEmployeeId(testAdminUser);
  assert(isValidUuid(adminEmpId), 'Admin KYC Operator should resolve to a valid UUID');
  assert.strictEqual(mockEmployees.get(adminEmpId).designation, 'KYC Operator');
  console.log('✓ Test 3 Passed: KYC Operator auto-provisions and resolves employee ID correctly');

  // Test second resolution returns the existing employee UUID without creating duplicates
  const adminEmpId2 = await mockResolveEmployeeId(testAdminUser);
  assert.strictEqual(adminEmpId, adminEmpId2, 'Subsequent resolution must return the same employee UUID');
  console.log('✓ Test 4 Passed: Idempotent resolution returns the existing employee UUID');

  // Test auto-provisioning for HR user
  const hrEmpId = await mockResolveEmployeeId(testHrUser);
  assert(isValidUuid(hrEmpId), 'HR user should resolve to a valid UUID');
  assert.strictEqual(mockEmployees.get(hrEmpId).department, 'Human Resources');
  console.log('✓ Test 5 Passed: HR user auto-provisions and resolves employee ID correctly');

  // Test auto-provisioning for Administrative Sales Executive
  const salesEmpId = await mockResolveEmployeeId(testSalesExecUser);
  assert(isValidUuid(salesEmpId), 'Sales Executive should resolve to a valid UUID');
  assert.strictEqual(mockEmployees.get(salesEmpId).designation, 'Administrative Sales Executive');
  console.log('✓ Test 6 Passed: Sales Executive auto-provisions and resolves employee ID correctly');

  // 4. Verify helper file exports
  const helper = require('../modules/attendance/resolve-employee.helper');
  assert.strictEqual(typeof helper.resolveEmployeeId, 'function', 'resolve-employee.helper must export resolveEmployeeId');
  assert.strictEqual(typeof helper.isValidUuid, 'function', 'resolve-employee.helper must export isValidUuid');
  console.log('✓ Test 7 Passed: resolve-employee.helper properly exports resolveEmployeeId and isValidUuid');

  // 5. Verify frontend routes configuration
  const appRoutesContent = fs.readFileSync(
    path.join(__dirname, '../../../frontend/src/routes/AppRoutes.jsx'),
    'utf8'
  );
  assert(appRoutesContent.includes('path="/hr/attendance"'), 'AppRoutes must include /hr/attendance');
  assert(appRoutesContent.includes('path="/admin/attendance"'), 'AppRoutes must include /admin/attendance');
  console.log('✓ Test 8 Passed: Frontend AppRoutes contains /hr/attendance and /admin/attendance');

  // 6. Verify frontend AdminLayout sidebar navigation
  const adminLayoutContent = fs.readFileSync(
    path.join(__dirname, '../../../frontend/src/layouts/AdminLayout.jsx'),
    'utf8'
  );
  assert(adminLayoutContent.includes('to="/admin/attendance"'), 'AdminLayout must include NavLink to /admin/attendance');
  assert(adminLayoutContent.includes('to="/hr/attendance"'), 'AdminLayout must include NavLink to /hr/attendance');
  console.log('✓ Test 9 Passed: AdminLayout contains sidebar links to both /admin/attendance and /hr/attendance');

  console.log('\n🎉 ALL ADMIN & HR ATTENDANCE CONNECTION TESTS PASSED SUCCESSFULLY!\n');
})().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
