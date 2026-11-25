/**
 * Tests for candidate "Select HR" dropdown, HR assignment resolution,
 * HR panel filtering, My Referrals HR list, and guarded backfill script.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.SKIP_DB = 'true';

const queries = [];
const mockDbPath = require.resolve('../config/database');
require.cache[mockDbPath] = {
  id: mockDbPath,
  filename: mockDbPath,
  loaded: true,
  exports: {
    query: async (sql, params) => {
      queries.push({ sql: String(sql), params });
      if (/FROM users u[\s\S]*LEFT JOIN LATERAL/i.test(sql)) {
        return {
          rows: [
            { id: '11111111-1111-4111-8111-111111111111', full_name: 'Ananya HR' },
            { id: '22222222-2222-4222-8222-222222222222', full_name: 'Rohan HR' }
          ]
        };
      }
      if (/WHERE id = \$1 AND UPPER\(role::text\) = 'HR'/i.test(sql)) {
        if (params[0] === '11111111-1111-4111-8111-111111111111') {
          return { rows: [{ id: params[0], full_name: 'Ananya HR', email: 'ananya@gkp.in' }] };
        }
        return { rows: [] };
      }
      if (/LOWER\(TRIM\(full_name\)\) = LOWER\(\$1\)/i.test(sql)) {
        const needle = String(params[0] || '').toLowerCase();
        if (needle === 'ananya hr') {
          return { rows: [{ id: '11111111-1111-4111-8111-111111111111', full_name: 'Ananya HR', email: 'ananya@gkp.in' }] };
        }
        if (needle === 'duplicate hr') {
          return {
            rows: [
              { id: '33333333-3333-4333-8333-333333333333', full_name: 'Duplicate HR', email: 'd1@gkp.in' },
              { id: '44444444-4444-4444-8444-444444444444', full_name: 'Duplicate HR', email: 'd2@gkp.in' }
            ]
          };
        }
        return { rows: [] };
      }
      return { rows: [] };
    },
    pool: { end: async () => {} }
  }
};

const hrDir = require('../services/hrDirectory.service');

(async () => {
  // 1. listActiveHrAccounts returns active HRs from users (even without hr_profiles)
  const list = await hrDir.listActiveHrAccounts();
  assert.strictEqual(list.length, 2);
  assert(queries[0].sql.includes("UPPER(u.role::text) = 'HR'"));
  assert(queries[0].sql.includes("LOWER(u.status::text) = 'active'"));
  console.log('✓ listActiveHrAccounts uses users as source of truth');

  // 2. resolveActiveHr handles UUID, malformed hr_id (no SQL crash), name fallback, Other, and ambiguous names
  const byId = await hrDir.resolveActiveHr({ hrId: '11111111-1111-4111-8111-111111111111', hrName: 'Other' });
  assert.strictEqual(byId.id, '11111111-1111-4111-8111-111111111111');

  const beforeCount = queries.length;
  const byMalformedAndName = await hrDir.resolveActiveHr({ hrId: 'null', hrName: '  ananya hr ' });
  assert.strictEqual(byMalformedAndName.id, '11111111-1111-4111-8111-111111111111');
  const executedSqls = queries.slice(beforeCount).map((q) => q.sql);
  assert(!executedSqls.some((s) => /WHERE id = \$1/i.test(s)), 'malformed hrId must not query WHERE id = $1');

  const otherRes = await hrDir.resolveActiveHr({ hrId: null, hrName: 'Other' });
  assert.strictEqual(otherRes, null);

  const dupRes = await hrDir.resolveActiveHr({ hrId: null, hrName: 'Duplicate HR' });
  assert.strictEqual(dupRes, null, 'ambiguous names must not auto-assign');
  console.log('✓ resolveActiveHr handles UUID, malformed hr_id, unique name fallback, Other, and ambiguity');

  // 3. Verify wired sources in public.routes.js, hr.routes.js, referrals.routes.js, InterviewRegistration.jsx
  const publicSrc = fs.readFileSync(path.join(__dirname, '../modules/public/public.routes.js'), 'utf8');
  assert(publicSrc.includes('listActiveHrAccounts()'), 'GET /hr-list must use listActiveHrAccounts');
  assert(publicSrc.includes("res.set('Cache-Control', 'no-store')"), 'GET /hr-list must set Cache-Control: no-store');
  assert(publicSrc.includes('resolveActiveHr({ hrId: requestedHrId, hrName: cleanSelectedHr })'), 'POST /register must use resolveActiveHr');

  const hrSrc = fs.readFileSync(path.join(__dirname, '../modules/hr/hr.routes.js'), 'utf8');
  const expectedClause = "(assigned_hr_id = $1 OR (NULLIF(TRIM($2::text), '') IS NOT NULL AND (LOWER(TRIM(assigned_hr_name)) = LOWER(TRIM($2::text)) OR LOWER(TRIM(hr_name)) = LOWER(TRIM($2::text)))))";
  const matches = hrSrc.split(expectedClause).length - 1;
  assert.strictEqual(matches, 3, 'hr.routes.js must replace all 3 HR filter clauses');
  assert(!hrSrc.includes('assigned_hr_name ILIKE $2'), 'old brittle ILIKE filter must be removed');

  const refSrc = fs.readFileSync(path.join(__dirname, '../modules/referrals/referrals.routes.js'), 'utf8');
  assert(refSrc.includes('listActiveHrAccounts()'), 'referrals GET /meta must use listActiveHrAccounts');

  const regSrc = fs.readFileSync(path.join(__dirname, '../../../frontend/src/modules/home/InterviewRegistration.jsx'), 'utf8');
  assert(
    regSrc.includes("value={formData.hr_id || (formData.selected_hr === 'Other' ? 'Other' : '')}"),
    'InterviewRegistration HR <select> must bind value to formData.hr_id / Other'
  );
  console.log('✓ public.routes.js, hr.routes.js, referrals.routes.js, and InterviewRegistration.jsx wired cleanly');

  console.log('\n✓ All candidate HR selection & assignment tests passed!');
})().catch((err) => {
  console.error('✗ TEST FAILED:', err);
  process.exit(1);
});
