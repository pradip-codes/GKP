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

// Mirrors KYC_URL_REGEX_SQL / KYC_LINK_VALUE_SQL / KYC_HAS_LINK_SQL in kyc-operator.controller.js
const isUrl = (v) => /^https?:\/\/\S+$/i.test(String(v ?? '').trim());
const linkValue = (a = {}, pad = {}) => {
  if (isUrl(a.vkyc_link)) return String(a.vkyc_link).trim();
  if (isUrl(a.vkyc_url)) return String(a.vkyc_url).trim();
  if (isUrl(pad.vkyc_url)) return String(pad.vkyc_url).trim();
  return '';
};
const hasLink = (a = {}, pad = {}) => linkValue(a, pad) !== '';
const isHdfc = (a = {}, b = {}) => [b.short_code, b.name].some(v => String(v || '').toLowerCase().includes('hdfc'));
const inQueue = (a, b, pad) => isHdfc(a, b) && hasLink(a, pad);

console.log('Test 1: Queue membership');
const hdfc = { name: 'HDFC Bank', short_code: 'HDFC' };
const sbi = { name: 'State Bank of India', short_code: 'SBI' };
const cases = [
  ['HDFC + https URL in applications.vkyc_link', { vkyc_link: 'https://capture.vkyc.hdfc.bank.in/v2/captures?t=HadEfaUdNaLy' }, {}, hdfc, true],
  ['HDFC + http URL in applications.vkyc_url', { vkyc_url: 'http://x.in/a' }, {}, hdfc, true],
  ['HDFC + only physical_application_details.vkyc_url', {}, { vkyc_url: 'https://vkyc.hdfc/pad' }, hdfc, true],
  ['HDFC, no link anywhere', {}, {}, hdfc, false],
  ['HDFC, link is blank spaces', { vkyc_link: '   ' }, { vkyc_url: '' }, hdfc, false],
  ["HDFC, link is 'N/A'", { vkyc_link: 'N/A' }, {}, hdfc, false],
  ["HDFC, link is 'NA'", { vkyc_link: 'NA' }, {}, hdfc, false],
  ["HDFC, link is '-'", { vkyc_url: '-' }, {}, hdfc, false],
  ["HDFC, link is 'None'", { vkyc_link: 'None' }, {}, hdfc, false],
  ["HDFC, link is 'PROCESS DONE'", { vkyc_link: 'PROCESS DONE' }, {}, hdfc, false],
  ['HDFC, link is bank app no D26K24054720H0N4', { vkyc_link: 'D26K24054720H0N4' }, {}, hdfc, false],
  ['HDFC, link without http/https prefix', { vkyc_link: 'capture.vkyc.hdfc.bank.in/v2' }, {}, hdfc, false],
  ['HDFC, text containing URL plus other words', { vkyc_link: 'vkyc link sent https://x.in' }, {}, hdfc, false],
  ['HDFC, vkyc_link is PROCESS DONE but pad.vkyc_url is valid URL', { vkyc_link: 'PROCESS DONE' }, { vkyc_url: 'https://capture.vkyc.hdfc.bank.in/session' }, hdfc, true],
  ['SBI with a link (must NOT show)', { vkyc_link: 'https://vkyc.sbi/1' }, {}, sbi, false],
  ['SBI, no link', {}, {}, sbi, false],
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
assert(src.includes('KYC_URL_REGEX_SQL'), 'regex for valid URL must be defined');
assert(src.includes("to_jsonb(a)->>'vkyc_executive_code'"), 'vkyc_executive_code must be queried with to_jsonb');
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
