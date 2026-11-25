/**
 * Bank-wise application access must be STRICT.
 *
 * Bug: an Administrative Sales Executive with only HDFC selected still saw SBI applications, because
 *  1. migrate_sales_operator_claim.js (run on every server start + deploy) auto-INSERTed HDFC + SBI bank
 *     assignments for every Administrative Sales Executive, silently re-adding banks the Super Admin never chose;
 *  2. an assignment row that could not be resolved to a bank became `1=1` (= every bank);
 *  3. cached assignments (5 min) were not dropped when the Super Admin changed them.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Module = require('module');

const read = (rel) => fs.readFileSync(path.join(__dirname, rel), 'utf8');

// 1. The claim migration must never write admin_bank_assignments (run it with stubbed config modules).
const dbPath = path.join(__dirname, '../config/database.js');
const logPath = path.join(__dirname, '../config/logger.js');
const executed = [];
const fakeQuery = async (sql) => { executed.push(String(sql)); return { rows: [], rowCount: 0 }; };
const fakeClient = { query: async (sql) => { executed.push(String(sql)); return { rows: [{ acquired: true }] }; }, release() {} };
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { query: fakeQuery, getClient: async () => fakeClient } };
require.cache[logPath] = { id: logPath, filename: logPath, loaded: true, exports: { info() {}, warn() {}, error() {} } };
const { migrateSalesOperatorClaim } = require('../database/migrations/migrate_sales_operator_claim');

(async () => {
  const res = await migrateSalesOperatorClaim();
  assert.strictEqual(res.success, true);
  assert(executed.length > 0, 'migration should still run its schema steps');
  assert(!executed.some((s) => /admin_bank_assignments/i.test(s)), 'migration must NOT touch admin_bank_assignments');
  assert(!/INSERT INTO admin_bank_assignments/i.test(read('../database/migrations/migrate_sales_operator_claim.js')), 'no auto-assignment code may remain');
  console.log('✓ migrate_sales_operator_claim no longer auto-assigns HDFC/SBI to Sales Executives');

  // 2. unresolved assignment row must grant nothing
  const app = read('../modules/crm/application.controller.js');
  const fn = app.slice(app.indexOf('const buildSingleBankMatchSQL'), app.indexOf('if (!abRows || abRows.length === 0)'));
  assert(fn.includes("matchParts.push('1=0')"), 'unresolved bank must match nothing');
  assert(!/matchParts\.length === 0\) matchParts\.push\('1=1'\)/.test(fn), 'the 1=1 fallback must be gone');
  assert(fn.includes("return '1=1'"), 'the virtual LOC/EOC bank must still be allowed (intended)');
  console.log('✓ unresolved assignment row -> 1=0 (no access), LOC/EOC virtual bank unchanged');

  // 3. cache invalidation on both assignment-write paths
  const sa = read('../modules/super-admin/controller.js');
  assert(/require\('\.\.\/\.\.\/services\/cache\.service'\)/.test(sa));
  assert(sa.includes('cache.del(`admin_bank_assignments:${userRec.id}`)'), 'updateAdminBanks must drop the cached assignments');
  assert(sa.includes('cache.del(`admin_bank_assignments:${existing.id}`)'), 'updateAdmin must drop the cached assignments');
  const iCommit = sa.indexOf("await client.query('COMMIT');", sa.indexOf('[BANK ASSIGNMENT] COMMIT'));
  assert(iCommit > -1 && sa.indexOf('cache.del(`admin_bank_assignments:${userRec.id}`)') > iCommit, 'cache must be dropped AFTER the commit');
  console.log('✓ cached bank assignments are dropped (after commit) whenever the Super Admin changes them');

  // 4. the Sales Executive filter itself stays strictly "assigned banks only, none = nothing"
  const se = app.slice(app.indexOf('let salesExecFilterSQL'), app.indexOf('let panCheckerFilterSQL'));
  assert(se.includes('salesExecFilterSQL = ` AND (${baseBankAccessClean})') && se.includes("salesExecFilterSQL = ' AND 1=0'"));
  console.log('✓ Sales Executive filter: assigned banks only; no assignment -> nothing');

  console.log('\n✓ All strict bank-assignment tests passed!');
})().catch((e) => { console.error('✗ TEST FAILED:', e.message); process.exit(1); });
