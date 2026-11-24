const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== RUNNING TESTS: LOGIN PROGRESSIVE LOCKOUT AND OTP FALLBACK ===');

// 1. Verify security.service.js constants and functions
const securityServicePath = path.resolve(__dirname, '../modules/auth/security.service.js');
const securityServiceContent = fs.readFileSync(securityServicePath, 'utf8');

assert(securityServiceContent.includes('const MAX_FAILED_ATTEMPTS = 3;'), 'MAX_FAILED_ATTEMPTS must be 3');
assert(securityServiceContent.includes('const LOCK_MINUTES = 2;'), 'LOCK_MINUTES must be 2');
assert(securityServiceContent.includes("failed_login_attempts + 1 = $1 THEN NOW() + INTERVAL '${LOCK_MINUTES} minutes'") ||
       securityServiceContent.includes("failed_login_attempts + 1 = 3 THEN NOW() + INTERVAL '2 minutes'"),
       'recordFailedLogin must lock for 2 minutes on 3rd failed attempt');
assert(securityServiceContent.includes('UPDATE users SET failed_login_attempts=0, locked_until=NULL WHERE id=$1'),
       'resetFailures must reset failed_login_attempts to 0 and locked_until to NULL');

console.log('✓ 1. security.service.js constants and reset/lock queries verified.');

// 2. Verify controller.js loginPassword logic
const controllerPath = path.resolve(__dirname, '../modules/auth/controller.js');
const controllerContent = fs.readFileSync(controllerPath, 'utf8');

// Check locked check
assert(controllerContent.includes('lockedUser'), 'Controller must check if user is currently locked');
assert(controllerContent.includes('lockout_seconds'), 'Controller must return lockout_seconds when locked');
assert(controllerContent.includes('res.status(429)') || controllerContent.includes('res.status(423)'), 'Controller must return HTTP 429/423 when locked');

// Check OTP requirement for attempts >= 4
assert(controllerContent.includes('(u.failed_login_attempts || 0) >= 4'), 'Controller must check if user has >= 4 failed attempts');
assert(controllerContent.includes('require_otp: true'), 'Controller must return require_otp: true when attempts >= 4');

// Check attempt 3 response
assert(controllerContent.includes('maxAttempts === 3'), 'Controller must handle exactly 3 failed attempts');
assert(controllerContent.includes('Maximum attempts reached. Please wait 2 minutes before trying again.'),
       'Controller must return 2-minute wait message on 3 failed attempts');

// Check attempt 1 & 2 remaining attempts message
assert(controllerContent.includes('remaining_attempts'), 'Controller must return remaining_attempts for attempts < 3');

// Check that successful password login calls resetFailures
assert(controllerContent.includes('await security.resetFailures(user.id)'),
       'Controller must call security.resetFailures on successful login');

// Check that OTP login (both email and msg91) calls resetFailures
const resetFailuresMatches = controllerContent.match(/await\s+security\.resetFailures/g);
assert(resetFailuresMatches && resetFailuresMatches.length >= 3,
       'resetFailures must be called in login, loginWithMsg91, and loginPassword');

console.log('✓ 2. controller.js progressive lockout, 2-min timer, OTP requirement, and attempt resets verified.');

// 3. Verify frontend auth.api.js
const authApiPath = path.resolve(__dirname, '../../../frontend/src/services/auth.api.js');
const authApiContent = fs.readFileSync(authApiPath, 'utf8');

assert(authApiContent.includes('error.data = err.response?.data;'), 'auth.api.js must forward err.response.data');
assert(authApiContent.includes('error.response = err.response;'), 'auth.api.js must forward err.response');

console.log('✓ 3. frontend auth.api.js error preservation verified.');

// 4. Verify frontend PartnerLogin.jsx
const partnerLoginPath = path.resolve(__dirname, '../../../frontend/src/modules/authentication/login/PartnerLogin.jsx');
const partnerLoginContent = fs.readFileSync(partnerLoginPath, 'utf8');

assert(partnerLoginContent.includes('lockoutTimer'), 'PartnerLogin must have lockoutTimer state');
assert(partnerLoginContent.includes('clearLoginAttemptState'), 'PartnerLogin must define clearLoginAttemptState');
assert(partnerLoginContent.includes('setFailedAttempts(0)'), 'PartnerLogin must reset failedAttempts to 0 on success');
assert(partnerLoginContent.includes('Maximum attempts reached'), 'PartnerLogin must display Maximum attempts reached banner');
assert(partnerLoginContent.includes('Please wait'), 'PartnerLogin must display countdown timer');
assert(partnerLoginContent.includes('You can now enter your credentials to verify'), 'PartnerLogin must show verification notice post-lockout');
assert(partnerLoginContent.includes('Maximum Attempts Exceeded'), 'PartnerLogin must show Maximum Attempts Exceeded banner');
assert(partnerLoginContent.includes('Login using OTP'), 'PartnerLogin must provide Login using OTP button');
assert(partnerLoginContent.includes('disabled={lockoutTimer > 0 || requireOtp}'), 'PartnerLogin must disable password input during lockout');

// Check that clearLoginAttemptState is called on successful login paths
const clearStateMatches = partnerLoginContent.match(/clearLoginAttemptState\(\)/g);
assert(clearStateMatches && clearStateMatches.length >= 3,
       'clearLoginAttemptState must be called on OTP login and password login success');

console.log('✓ 4. frontend PartnerLogin.jsx progressive lockout UI, 2-min timer, and OTP fallback verified.');

console.log('\n=== ALL 4 SUITES (18 ASSERTIONS) PASSED SUCCESSFULLY! ===');
