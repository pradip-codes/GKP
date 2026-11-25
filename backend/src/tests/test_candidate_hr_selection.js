/**
 * Tests for candidate "Select HR" dropdown, HR assignment resolution,
 * HR panel filtering, My Referrals HR list, guarded backfill script,
 * and HR lifecycle (transfer, rename sync trigger, deletion unassign).
 */
const assert = require('assert');
const express = require('express');
const fs = require('fs');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.SKIP_DB = 'true';

const HR1 = '11111111-1111-4111-8111-111111111111';
const HR2 = '22222222-2222-4222-8222-222222222222';
const INACTIVE_HR = '33333333-3333-4333-8333-333333333333';
const DUP_HR1 = '44444444-4444-4444-8444-444444444444';
const DUP_HR2 = '55555555-5555-4555-8555-555555555555';
const CAND1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CAND2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const SUPER_ADMIN_ID = '99999999-9999-4999-8999-999999999999';

const queries = [];
const mockDbPath = require.resolve('../config/database');
require.cache[mockDbPath] = {
  id: mockDbPath,
  filename: mockDbPath,
  loaded: true,
  exports: {
    query: async (sql, params = []) => {
      const s = String(sql);
      queries.push({ sql: s, params });

      if (/FROM users u[\s\S]*LEFT JOIN LATERAL/i.test(s)) {
        return {
          rows: [
            { id: HR1, full_name: 'Ananya HR' },
            { id: HR2, full_name: 'Rohan HR' }
          ]
        };
      }
      if (/WHERE id = \$1 AND UPPER\(role::text\) = 'HR'/i.test(s)) {
        if (params[0] === HR1) return { rows: [{ id: HR1, full_name: 'Ananya HR', email: 'ananya@gkp.in' }] };
        if (params[0] === HR2) return { rows: [{ id: HR2, full_name: 'Rohan HR', email: 'rohan@gkp.in' }] };
        return { rows: [] };
      }
      if (/LOWER\(TRIM\(full_name\)\) = LOWER\(\$1\)/i.test(s)) {
        const needle = String(params[0] || '').toLowerCase();
        if (needle === 'ananya hr') {
          return { rows: [{ id: HR1, full_name: 'Ananya HR', email: 'ananya@gkp.in' }] };
        }
        if (needle === 'duplicate hr') {
          return {
            rows: [
              { id: DUP_HR1, full_name: 'Duplicate HR', email: 'd1@gkp.in' },
              { id: DUP_HR2, full_name: 'Duplicate HR', email: 'd2@gkp.in' }
            ]
          };
        }
        return { rows: [] };
      }
      if (/SELECT COUNT\(\*\)::int AS n FROM employee_candidates ec WHERE/i.test(s)) {
        return { rows: [{ n: 3 }] };
      }
      if (/UPDATE employee_candidates ec[\s\S]*RETURNING ec\.id/i.test(s)) {
        return { rows: [{ id: CAND1 }, { id: CAND2 }] };
      }
      if (/SELECT id, assigned_hr_id, selected_hr FROM employee_candidates WHERE id = \$1/i.test(s)) {
        // Simulates a candidate whose former HR was deleted (assigned_hr_id IS NULL, selected_hr still holds former HR name)
        return { rows: [{ id: CAND1, assigned_hr_id: null, selected_hr: 'Former HR Name' }] };
      }
      if (/SELECT full_name, email FROM users WHERE id = \$1 AND UPPER\(role\) = 'HR'/i.test(s)) {
        return { rows: [{ full_name: 'Rohan HR', email: 'rohan@gkp.in' }] };
      }
      if (/UPDATE employee_candidates SET assigned_hr_id = \$1/i.test(s)) {
        return { rows: [{ id: CAND1, assigned_hr_id: params[0], assigned_hr_name: params[1], full_name: 'Cand One' }] };
      }
      return { rows: [] };
    },
    pool: { end: async () => {} }
  }
};

// Mock jwtAuth and roleCheck so we can test hr.routes.js endpoints with explicit caller roles
let currentUser = { id: SUPER_ADMIN_ID, role: 'SUPER_ADMIN', full_name: 'Super Admin' };
const jwtAuthPath = require.resolve('../middleware/authentication/jwtAuth.middleware');
require.cache[jwtAuthPath] = {
  id: jwtAuthPath,
  filename: jwtAuthPath,
  loaded: true,
  exports: (req, _res, next) => { req.user = currentUser; next(); }
};
const rolePath = require.resolve('../middleware/authorization/role.middleware');
require.cache[rolePath] = {
  id: rolePath,
  filename: rolePath,
  loaded: true,
  exports: (...allowed) => (req, res, next) => {
    const r = String(req.user?.role || '').toUpperCase();
    if (!allowed.map((x) => x.toUpperCase()).includes(r)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    next();
  }
};
const emailPath = require.resolve('../services/email/email.service');
require.cache[emailPath] = {
  id: emailPath,
  filename: emailPath,
  loaded: true,
  exports: {
    sendEmployeeInvitationEmail: async () => ({}),
    sendCandidateAssignedToHrEmail: async () => ({}),
    sendCandidateRejectionEmail: async () => ({})
  }
};

const hrDir = require('../services/hrDirectory.service');
const hrRouter = require('../modules/hr/hr.routes');

(async () => {
  // 1. listActiveHrAccounts returns active HRs from users and prefers users.full_name
  const list = await hrDir.listActiveHrAccounts();
  assert.strictEqual(list.length, 2);
  assert(queries[0].sql.includes("COALESCE(NULLIF(TRIM(u.full_name), ''), NULLIF(TRIM(hp.full_name), ''))"));
  assert(queries[0].sql.includes("UPPER(u.role::text) = 'HR'"));
  assert(queries[0].sql.includes("LOWER(u.status::text) = 'active'"));
  console.log('✓ listActiveHrAccounts uses users as source of truth and prefers u.full_name');

  // 2. resolveActiveHr handles UUID, malformed hr_id (no SQL crash), name fallback, Other, and ambiguous names
  const byId = await hrDir.resolveActiveHr({ hrId: HR1, hrName: 'Other' });
  assert.strictEqual(byId.id, HR1);

  const beforeCount = queries.length;
  const byMalformedAndName = await hrDir.resolveActiveHr({ hrId: 'null', hrName: '  ananya hr ' });
  assert.strictEqual(byMalformedAndName.id, HR1);
  const executedSqls = queries.slice(beforeCount).map((q) => q.sql);
  assert(!executedSqls.some((s) => /WHERE id = \$1/i.test(s)), 'malformed hrId must not query WHERE id = $1');

  assert.strictEqual(await hrDir.resolveActiveHr({ hrId: null, hrName: 'Other' }), null);
  assert.strictEqual(await hrDir.resolveActiveHr({ hrId: null, hrName: 'Duplicate HR' }), null, 'ambiguous names must not auto-assign');
  console.log('✓ resolveActiveHr handles UUID, malformed hr_id, unique name fallback, Other, and ambiguity');

  // 3. Express HTTP tests for /hr/candidates/transfer and /hr/candidates/:id/assign-hr
  const app = express();
  app.use(express.json());
  app.use('/hr', hrRouter);
  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const postJson = async (p, body) => {
    const r = await fetch(`${baseUrl}${p}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Connection: 'close' },
      body: JSON.stringify(body)
    });
    return { status: r.status, json: await r.json() };
  };

  try {
    // 3a. HR role must get 403 on transfer
    currentUser = { id: HR1, role: 'HR', full_name: 'Ananya HR' };
    const r403 = await postJson('/hr/candidates/transfer', { from_hr_id: HR1, to_hr_id: HR2 });
    assert.strictEqual(r403.status, 403);

    // 3b. Validation errors -> 400
    currentUser = { id: SUPER_ADMIN_ID, role: 'SUPER_ADMIN', full_name: 'Super Admin' };
    assert.strictEqual((await postJson('/hr/candidates/transfer', { from_hr_id: HR1, to_hr_id: INACTIVE_HR })).status, 400, 'inactive to_hr_id -> 400');
    assert.strictEqual((await postJson('/hr/candidates/transfer', { from_hr_id: HR1, to_hr_id: 'not-a-uuid' })).status, 400, 'non-UUID to_hr_id -> 400');
    assert.strictEqual((await postJson('/hr/candidates/transfer', { from_hr_id: HR2, to_hr_id: HR2 })).status, 400, 'same from/to -> 400');
    assert.strictEqual((await postJson('/hr/candidates/transfer', { from_hr_id: 'bad', to_hr_id: HR2 })).status, 400, 'non-UUID from_hr_id -> 400');
    assert.strictEqual((await postJson('/hr/candidates/transfer', { candidate_ids: ['bad'], to_hr_id: HR2 })).status, 400, 'non-UUID candidate_ids -> 400');

    // 3c. dry_run preview -> 200 with would_transfer
    const dry = await postJson('/hr/candidates/transfer', { from_hr_id: INACTIVE_HR, to_hr_id: HR2, dry_run: true });
    assert.strictEqual(dry.status, 200);
    assert.strictEqual(dry.json.data.dry_run, true);
    assert.strictEqual(dry.json.data.would_transfer, 3);
    assert.strictEqual(dry.json.data.to_hr.id, HR2);

    // 3d. real transfer + orphaned_only -> 200 with transferred
    const real = await postJson('/hr/candidates/transfer', { from_hr_id: INACTIVE_HR, to_hr_id: HR2 });
    assert.strictEqual(real.status, 200);
    assert.strictEqual(real.json.data.transferred, 2);

    const orphan = await postJson('/hr/candidates/transfer', { orphaned_only: true, to_hr_id: HR2 });
    assert.strictEqual(orphan.status, 200);
    assert.strictEqual(orphan.json.data.transferred, 2);

    // 3e. assign-hr on unassigned candidate whose former selected_hr was a real HR must NOT return 409
    const assign = await postJson(`/hr/candidates/${CAND1}/assign-hr`, { hr_id: HR2 });
    assert.strictEqual(assign.status, 200);
    console.log('✓ /hr/candidates/transfer (403, 400s, dry_run, transfer, orphaned_only) & deleted-HR assign-hr work cleanly');
  } finally {
    server.close();
  }

  // 4. Static checks across public, hr, referrals, user-deletion, migrations, server, and frontend
  const publicSrc = fs.readFileSync(path.join(__dirname, '../modules/public/public.routes.js'), 'utf8');
  assert(publicSrc.includes('listActiveHrAccounts()'), 'GET /hr-list must use listActiveHrAccounts');
  assert(publicSrc.includes("res.set('Cache-Control', 'no-store')"), 'GET /hr-list must set Cache-Control: no-store');
  assert(publicSrc.includes('resolveActiveHr({ hrId: requestedHrId, hrName: cleanSelectedHr })'), 'POST /register must use resolveActiveHr');

  const hrSrc = fs.readFileSync(path.join(__dirname, '../modules/hr/hr.routes.js'), 'utf8');
  const expectedClause = "(assigned_hr_id = $1 OR (assigned_hr_id IS NULL AND NULLIF(TRIM($2::text), '') IS NOT NULL AND (LOWER(TRIM(assigned_hr_name)) = LOWER(TRIM($2::text)) OR LOWER(TRIM(hr_name)) = LOWER(TRIM($2::text)))))";
  assert.strictEqual(hrSrc.split(expectedClause).length - 1, 3, 'hr.routes.js must use id-first HR scope in all 3 places');
  assert(hrSrc.indexOf("router.post('/candidates/transfer'") < hrSrc.indexOf("router.post('/candidates/:id/assign-hr'"), '/candidates/transfer must precede /candidates/:id/... routes');
  assert(!hrSrc.includes("const UNASSIGNED_HR = ['Other'"), 'assign-hr must allow reassigning candidates whose HR account was removed');

  const delSrc = fs.readFileSync(path.join(__dirname, '../modules/auth/user-deletion.service.js'), 'utf8');
  assert(delSrc.includes('UPDATE employee_candidates SET assigned_hr_id = NULL WHERE assigned_hr_id = $1'), 'deleting HR must clear assigned_hr_id');

  const migSyncPath = path.join(__dirname, '../database/migrations/migrate_hr_candidate_name_sync.js');
  const migSyncSrc = fs.readFileSync(migSyncPath, 'utf8');
  assert(migSyncSrc.includes('trg_sync_hr_name_to_candidates') && migSyncSrc.includes('idx_employee_candidates_assigned_hr_id'));
  const migrateSrc = fs.readFileSync(path.join(__dirname, '../database/migrations/migrate.js'), 'utf8');
  assert(migrateSrc.includes('migrate_hr_candidate_name_sync'), 'migrate.js must wire migrateHrCandidateNameSync');
  const serverSrc = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
  assert(serverSrc.includes('migrate_hr_candidate_name_sync'), 'server.js must wire migrateHrCandidateNameSync');

  const refSrc = fs.readFileSync(path.join(__dirname, '../modules/referrals/referrals.routes.js'), 'utf8');
  assert(refSrc.includes('listActiveHrAccounts()'), 'referrals GET /meta must use listActiveHrAccounts');

  const regSrc = fs.readFileSync(path.join(__dirname, '../../../frontend/src/modules/home/InterviewRegistration.jsx'), 'utf8');
  assert(regSrc.includes("value={formData.hr_id || (formData.selected_hr === 'Other' ? 'Other' : '')}"));

  const hrDashSrc = fs.readFileSync(path.join(__dirname, '../../../frontend/src/modules/hr/HRDashboard.jsx'), 'utf8');
  assert(hrDashSrc.includes('/hr/candidates/transfer') && hrDashSrc.includes('Fix orphaned candidates'));
  console.log('✓ All lifecycle wiring checks passed');

  console.log('\n✓ All candidate HR selection & HR lifecycle tests passed!');
  process.exit(0);
})().catch((err) => {
  console.error('✗ TEST FAILED:', err);
  process.exit(1);
});
