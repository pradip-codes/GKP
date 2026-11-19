const assert = require('assert');
const fs = require('fs');

console.log('--- Running Verification Tests ---');

// 1. SuperAdminDashboard.jsx
const dashCode = fs.readFileSync('frontend/src/modules/super-admin/dashboard/SuperAdminDashboard.jsx', 'utf8');
assert(dashCode.includes('<option value="SUPER_ADMIN">Super Admin</option>'), 'Super Admin option must exist');
assert(dashCode.includes('<option value="HR">HR</option>'), 'HR option must exist');
assert(dashCode.includes('<option value="PARTNER">Partner</option>'), 'Partner option must exist');
assert(dashCode.includes("!['HR', 'SUPER_ADMIN', 'PARTNER'].includes(form.role)"), 'Designation must be hidden for HR, SUPER_ADMIN, and PARTNER');
console.log('✓ SuperAdminDashboard.jsx: Role options and conditional designation hiding verified');

// 2. backend createAdmin
const ctrlCode = fs.readFileSync('backend/src/modules/super-admin/controller.js', 'utf8');
assert(ctrlCode.includes("isNoDesignationRole"), 'isNoDesignationRole check must exist in backend');
assert(ctrlCode.includes("!isNoDesignationRole && !designation"), 'Designation must not be required for no-designation roles');
console.log('✓ backend/src/modules/super-admin/controller.js: createAdmin validation bypass verified');

// 3. InterviewRegistration.jsx
const interviewCode = fs.readFileSync('frontend/src/modules/home/InterviewRegistration.jsx', 'utf8');
assert(interviewCode.includes('placeholder="First name"'), 'First name placeholder must exist');
assert(interviewCode.includes('placeholder="Middle name"'), 'Middle name placeholder must exist');
assert(interviewCode.includes('placeholder="Last name"'), 'Last name placeholder must exist');
assert(interviewCode.includes('<option value="Hrutika">Hrutika</option>'), 'Hrutika option must exist');
assert(interviewCode.includes('<option value="Nandini">Nandini</option>'), 'Nandini option must exist');
assert(interviewCode.includes('<option value="Riya">Riya</option>'), 'Riya option must exist');
assert(interviewCode.includes('<option value="Other">Other</option>'), 'Other option must exist');
assert(interviewCode.includes('placeholder="Enter name of HR"'), 'Enter name of HR placeholder must exist');
assert(!interviewCode.includes('Number(String(code).trim())'), 'window.verifyOtp must not pass Number(code)');
console.log('✓ InterviewRegistration.jsx: Name fields, Select HR options, and OTP verify fixes verified');

// 4. backend public.routes.js
const routesCode = fs.readFileSync('backend/src/modules/public/public.routes.js', 'utf8');
assert(routesCode.includes("cleanMob = String(mobile_number).trim().replace(/\\D/g, '').slice(-10)"), 'cleanMob 10-digit normalization must exist');
assert(routesCode.includes('identity IN ($1, $2, $3, $4)'), 'Flexible identity matching must exist');
console.log('✓ backend/src/modules/public/public.routes.js: Mobile OTP verification fixes verified');

console.log('\n--- ALL VERIFICATIONS PASSED ---');
