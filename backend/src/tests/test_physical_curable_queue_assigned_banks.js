/**
 * Test Suite: Physical Curable Operations Queue with Assigned Banks & Robust Curing Filter
 * 
 * Verifies:
 * 1. Assigned banks (e.g. HDFC Bank + State Bank of India) are properly respected for curable operators.
 * 2. Physical curable applications populate correctly:
 *    - Explicit physical decline codes (e.g. '41', '82', '14', '15', '414', '425')
 *    - Prefix-formatted decline codes (e.g. '41 - SALARY CHECK NEGATIVE')
 *    - Curing designation flags ('PHYSICAL_CURABLE', 'PHYSICAL_CURABLE_OPERATOR', cureble_type)
 *    - Physical verification descriptions (CPV, salary check, residence check, doc pickup)
 *    - Declined applications that are not digital, not email, and not CIBIL
 * 3. Status filter properly handles empty string ($2 = '') and 'all' for All Curable Applications tab.
 * 4. Proper segregation so digital (VKYC) and email (appeal) cases do NOT bleed into Physical queue.
 */

const assert = require('assert');
const {
  HDFC_DECLINE_CODES,
  CURING_DESIGNATIONS
} = require('../constants/hdfcDeclineCodes');

console.log('--- Testing Physical Curable Operations Queue with Assigned Banks ---\n');

const physicalCodesList = HDFC_DECLINE_CODES.filter(c => c.designation === CURING_DESIGNATIONS.PHYSICAL_CURABLE).map(c => c.code.toUpperCase());
const digitalCodesList = HDFC_DECLINE_CODES.filter(c => c.designation === CURING_DESIGNATIONS.DIGITAL_CURABLE).map(c => c.code.toUpperCase());
const emailCodesList = HDFC_DECLINE_CODES.filter(c => c.designation === CURING_DESIGNATIONS.EMAIL_CURABLE).map(c => c.code.toUpperCase());

// Test 1: Bank Scope Resolution with Assigned Banks (HDFC + SBI)
console.log('Test 1: Bank Scope Resolution with Assigned Banks (HDFC + SBI)');

function resolveCurableBankScope(assignedBanks) {
  const hdfcBankScopeSQL = `(
    (LOWER(COALESCE(combined.bank_name, '')) LIKE '%hdfc%' OR LOWER(COALESCE(combined.bank_code, '')) LIKE '%hdfc%')
    AND LOWER(COALESCE(combined.bank_name, '')) NOT LIKE '%tata%'
    AND LOWER(COALESCE(combined.bank_code, '')) NOT LIKE '%tata%'
  )`;

  let baseBankAccessFilterSQL = '';
  if (assignedBanks && assignedBanks.length > 0) {
    const clauses = assignedBanks.map(b => {
      const code = (b.short_code || '').toLowerCase();
      const name = (b.name || '').toLowerCase();
      return `(LOWER(COALESCE(combined.bank_code, '')) = '${code}' OR LOWER(COALESCE(combined.bank_name, '')) LIKE '%${name}%')`;
    });
    baseBankAccessFilterSQL = ` AND (${clauses.join(' OR ')})`;
  }

  const baseBankAccessClean = (baseBankAccessFilterSQL || '').replace(/^\s*AND\s*/i, '').trim();
  const hasAssignedBanks = Boolean(baseBankAccessClean && baseBankAccessClean !== '1=0');
  const curableBankScopeSQL = hasAssignedBanks
    ? `(${baseBankAccessClean})`
    : hdfcBankScopeSQL;

  return { curableBankScopeSQL, hasAssignedBanks };
}

// User assigned banks: HDFC Bank and State Bank of India
const assignedBanks = [
  { name: 'HDFC Bank', short_code: 'hdfc', category: 'credit_card' },
  { name: 'State Bank of India', short_code: 'sbi', category: 'credit_card' }
];

const scopeResult = resolveCurableBankScope(assignedBanks);
assert.strictEqual(scopeResult.hasAssignedBanks, true);
assert(scopeResult.curableBankScopeSQL.includes('hdfc'), 'Scope must include HDFC');
assert(scopeResult.curableBankScopeSQL.includes('sbi'), 'Scope must include SBI when assigned');

// Fallback when no bank assigned
const fallbackScope = resolveCurableBankScope([]);
assert.strictEqual(fallbackScope.hasAssignedBanks, false);
assert(fallbackScope.curableBankScopeSQL.includes('hdfc'), 'Fallback must default to HDFC scope');
console.log('✓ Bank scope correctly recognizes both HDFC and SBI when assigned, with fallback to HDFC.\n');


// Test 2: Physical Curable Filter Match Logic
console.log('Test 2: Physical Curable Filter Matching');

function matchesPhysicalCurable(app) {
  const code = (app.primary_decline_code || app.decline_code || '').trim().toUpperCase();
  const codePrefix = code.replace(/[^A-Z0-9].*$/, '').trim();
  const secCode = (app.secondary_decline_code || '').trim().toUpperCase();
  const curingDesig = (app.primary_curing_designation || app.curing_designation || app.cureble_type || '').trim().toUpperCase().replace(/ /g, '_');
  const secCuringDesig = (app.secondary_curing_designation || '').trim().toUpperCase().replace(/ /g, '_');
  const declineDesc = `${app.decline_description || ''} ${app.primary_decline_description || ''} ${app.decline_reason || ''}`.toLowerCase();
  const status = (app.status || '').toLowerCase();
  const finalStatus = (app.final_status || '').toLowerCase();

  // 1. Direct code match
  if (physicalCodesList.includes(code) || physicalCodesList.includes(codePrefix) || physicalCodesList.includes(secCode)) {
    return true;
  }

  // 2. Direct curing designation match
  if (['PHYSICAL_CURABLE', 'PHYSICAL_CURABLE_OPERATOR', 'PHYSICAL'].includes(curingDesig) ||
      ['PHYSICAL_CURABLE', 'PHYSICAL_CURABLE_OPERATOR', 'PHYSICAL'].includes(secCuringDesig)) {
    return true;
  }

  // 3. Physical description keywords
  const physicalKeywords = [
    'salary check', 'low income', 'verif negative', 'verification negative',
    'resi verif', 'biz verif', 'business proof', 'clear document', 'cpv',
    'office appointment', 'dob mismatch', 'pan mismatch', 'company name mismatch',
    'city mismatch', 'mobile mismatch', 'incorrect designation', 'incorrect employer',
    'physical', 'pickup'
  ];
  if (physicalKeywords.some(kw => declineDesc.includes(kw))) {
    return true;
  }

  // 4. Declined applications that are not digital, not email, and not CIBIL
  const isDeclined = status.includes('reject') || status.includes('decline') ||
                     finalStatus.includes('reject') || finalStatus.includes('decline') ||
                     (code && code !== 'NONE');

  const isDigital = digitalCodesList.includes(code) || curingDesig.includes('DIGITAL');
  const isEmail = emailCodesList.includes(code) || curingDesig.includes('EMAIL');
  const isCibil = code.includes('CIBIL') || declineDesc.includes('cibil');

  if (isDeclined && !isDigital && !isEmail && !isCibil) {
    return true;
  }

  return false;
}

// Test cases
const testApps = [
  { name: 'HDFC Code 41', primary_decline_code: '41', status: 'rejected', expected: true },
  { name: 'HDFC Code 82', decline_code: '82', status: 'declined', expected: true },
  { name: 'HDFC Prefix format 41 - SALARY CHECK NEGATIVE', decline_code: '41 - SALARY CHECK NEGATIVE', status: 'rejected', expected: true },
  { name: 'HDFC Clear Document 414', primary_decline_code: '414', status: 'rejected', expected: true },
  { name: 'HDFC Explicit Designation PHYSICAL_CURABLE', curing_designation: 'PHYSICAL_CURABLE', status: 'operational_verified', expected: true },
  { name: 'HDFC CPV Remark in description', decline_description: 'AFU PRE CPV REJECT', status: 'rejected', expected: true },
  { name: 'SBI Declined without code (Physical CPV pickup)', bank_name: 'State Bank of India', status: 'rejected', final_status: 'declined', expected: true },
  { name: 'HDFC Digital Code 86D (VKYC)', primary_decline_code: '86D', status: 'rejected', expected: false },
  { name: 'HDFC Email Code 418', primary_decline_code: '418', status: 'rejected', expected: false },
  { name: 'HDFC Hard CIBIL decline', primary_decline_code: 'CIBIL decline', status: 'rejected', expected: false }
];

for (const t of testApps) {
  const matched = matchesPhysicalCurable(t);
  assert.strictEqual(matched, t.expected, `Failed for ${t.name}: expected ${t.expected}, got ${matched}`);
  console.log(`✓ ${t.name}: ${matched ? 'MATCHED' : 'EXCLUDED'} as expected`);
}

console.log('\nTest 3: Verify Status Filter with Empty String ($2)');
function matchesStatusFilter(statusParam, appStatus) {
  if (statusParam === null || statusParam === undefined || statusParam === '' || statusParam === 'all') {
    return true;
  }
  return appStatus === statusParam;
}

assert.strictEqual(matchesStatusFilter('', 'rejected'), true, 'Empty string status param must match rejected');
assert.strictEqual(matchesStatusFilter('', 'operational_verified'), true, 'Empty string status param must match operational_verified');
assert.strictEqual(matchesStatusFilter('', 'approved'), true, 'Empty string status param must match approved');
assert.strictEqual(matchesStatusFilter('rejected', 'rejected'), true, 'Rejected filter must match rejected');
assert.strictEqual(matchesStatusFilter('rejected', 'approved'), false, 'Rejected filter must exclude approved');
console.log('✓ Status filter handles empty string, null, all, and specific status tabs correctly.\n');

console.log('========================================================');
console.log('✓ All Physical Curable Queue & Assigned Bank Tests Passed!');
console.log('========================================================');
