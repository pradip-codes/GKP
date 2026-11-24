/**
 * Test Suite: KYC Operator queue — HDFC only + KYC link required
 *
 * 1. Queue (list) shows ONLY HDFC applications that carry a KYC/VKYC link
 *    (applications.vkyc_link, applications.vkyc_url or physical_application_details.vkyc_url).
 * 2. The old SBI soft-approval / HDFC IPA-stage eligibility rule is gone from the list.
 * 3. Every direct-by-id endpoint (detail, documents, verify, reject, request-info, update-stage)
 *    is guarded by ensureKycAppAccess (HDFC + assigned banks), so an operator can't act on other banks by id.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- Testing KYC Operator scope (HDFC + KYC link) ---\n');

// Mirrors KYC_HAS_LINK_SQL / KYC_HDFC_BANK_SQL in kyc-operator.controller.js
const linkValue = (a, pad) => [a.vkyc_link, a.vkyc_url, pad.vkyc_url].map(v => String(v ?? '').trim()).find(v => v !== '') || '';
const hasLink = (a = {}, pad = {}) => {
  const v = linkValue(a, pad);
  if (!v || ['N/A', 'NA', '-'].includes(v.toUpperCase())) return false;
  if (/\s/.test(v)) return false;
  return /^(https?:\/\/[^\s]+|([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}([\/?#][^\s]*)?)$/i.test(v);
};
const isHdfc = (a = {}, b = {}) => [b.short_code, b.name].some(v => String(v || '').toLowerCase().includes('hdfc'));
const inQueue = (a, b, pad) => isHdfc(a, b) && hasLink(a, pad);

console.log('Test 1: Queue membership');
const hdfc = { name: 'HDFC Bank', short_code: 'HDFC' };
const sbi = { name: 'State Bank of India', short_code: 'SBI' };
const cases = [
  ['HDFC + applications.vkyc_link', { vkyc_link: 'https://vkyc.hdfc/xyz' }, {}, hdfc, true],
  ['HDFC + applications.vkyc_url', { vkyc_url: 'https://vkyc.hdfc/abc' }, {}, hdfc, true],
  ['HDFC + only physical_application_details.vkyc_url', {}, { vkyc_url: 'https://vkyc.hdfc/pad' }, hdfc, true],
  ['HDFC, no link anywhere', {}, {}, hdfc, false],
  ['HDFC, link is blank spaces', { vkyc_link: '   ' }, { vkyc_url: '' }, hdfc, false],
  ["HDFC, link is 'N/A'", { vkyc_link: 'N/A' }, {}, hdfc, false],
  ["HDFC, link is '-'", { vkyc_url: '-' }, {}, hdfc, false],
  ['SBI with a link (must NOT show)', { vkyc_link: 'https://vkyc.sbi/1' }, {}, sbi, false],
  ['SBI, no link', {}, {}, sbi, false],
  ['bank identified only by banks.name containing HDFC', { vkyc_link: 'x.com/v' }, {}, { name: 'HDFC Bank Ltd' }, true],
  ['HDFC with plain text "pending" (must NOT show)', { vkyc_link: 'pending' }, {}, hdfc, false],
  ['HDFC with plain text "link sent" (must NOT show)', { vkyc_link: 'link sent' }, {}, hdfc, false],
  ['HDFC with plain text "approval income 25k" (must NOT show)', { vkyc_link: 'approval income 25k' }, {}, hdfc, false],
];
for (const [name, a, pad, b, expected] of cases) {
  assert.strictEqual(inQueue(a, b, pad), expected, name);
  console.log(`✓ ${name} -> ${expected ? 'shown' : 'hidden'}`);
}

console.log('\nTest 2: Controller source implements the rules');
const src = fs.readFileSync(path.join(__dirname, '../modules/kyc-operator/kyc-operator.controller.js'), 'utf8');
const listStart = src.indexOf('const getKycApplications = async');
const listEnd = src.indexOf('const getKycApplicationById = async');
const listFn = src.slice(listStart, listEnd);
assert(listFn.includes('whereConditions.push(KYC_HDFC_BANK_SQL)'), 'list must apply HDFC-only');
assert(listFn.includes('whereConditions.push(KYC_HAS_LINK_SQL)'), 'list must require a KYC link');
assert(!/approval income 25k|approval nsdp cibil base|ipa approval cibil/i.test(listFn), 'old SBI/IPA eligibility must be gone from list');
assert(!/LIKE '%sbi%'/i.test(listFn), 'no SBI branch in list');
assert(src.includes("NULLIF(TRIM(a.vkyc_url), '')") && src.includes("NULLIF(TRIM(pad.vkyc_url), '')") && src.includes("NULLIF(TRIM(a.vkyc_link), '')"), 'link detection must cover all 3 columns');
const hasLinkSqlStart = src.indexOf('const KYC_HAS_LINK_SQL');
const hasLinkSql = src.slice(hasLinkSqlStart, src.indexOf('`;', hasLinkSqlStart));
assert(/https\?:\/\//.test(hasLinkSql), 'KYC_HAS_LINK_SQL must check for valid URL schema');
// Regression: applications.bank_name does not exist in the production DB (caused 'column a.bank_name does not exist')
const hdfcSqlStart = src.indexOf('const KYC_HDFC_BANK_SQL');
const hdfcSql = src.slice(hdfcSqlStart, src.indexOf('`;', hdfcSqlStart));
assert(!/a\.bank_name/.test(hdfcSql), 'KYC_HDFC_BANK_SQL must not reference a.bank_name');
assert(!/a\.bank_name/.test(listFn), 'list query must not reference a.bank_name');
console.log('✓ list: HDFC-only + link required, SBI/IPA rule removed');

const guarded = ['getKycApplicationById', 'getKycApplicationDocuments', 'verifyKycApplication', 'rejectKycApplication', 'requestInfoKycApplication', 'updateKycStageAndDetails'];
for (const fn of guarded) {
  const i = src.indexOf(`const ${fn} = async`);
  assert(i > -1, `${fn} must exist`);
  const head = src.slice(i, i + 400);
  assert(head.includes('ensureKycAppAccess(req, res, id)'), `${fn} must call ensureKycAppAccess`);
}
console.log(`✓ ${guarded.length} direct-by-id endpoints are guarded by ensureKycAppAccess`);

const guardFn = src.slice(src.indexOf('const ensureKycAppAccess'), src.indexOf('const recordOperatorAudit'));
assert(guardFn.includes('KYC_HDFC_BANK_SQL') && guardFn.includes('admin_bank_assignments'), 'guard must enforce HDFC + assigned banks');
assert(/SUPER_ADMIN/.test(guardFn), 'guard must exempt super admin');
console.log('✓ guard enforces HDFC + assigned banks, super admin exempt');

console.log('\n========================================================');
console.log('✓ All KYC Operator (HDFC + KYC link) tests passed!');
console.log('========================================================');
