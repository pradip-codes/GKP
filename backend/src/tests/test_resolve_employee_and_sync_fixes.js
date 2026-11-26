/**
 * Regression test for:
 * 1. resolve-employee.helper.js querying non-existent `users.name` (must use `full_name`)
 * 2. employee.routes.js triggering `users_employee_id_key` duplicate key error on `UPDATE users SET employee_id`
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.SKIP_DB = 'true';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const EMP_ID = '22222222-2222-4222-8222-222222222222';
const queries = [];

const dbPath = require.resolve('../config/database');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: {
    query: async (sql, params = []) => {
      const s = String(sql);
      queries.push({ sql: s, params });

      if (/\bSELECT\b[\s\S]*\bFROM users\b/i.test(s) && /\bname\b/i.test(s) && !/\bfull_name\b/i.test(s)) {
        throw new Error('column "name" does not exist');
      }
      if (/SELECT id, email, mobile, full_name, role, designation FROM users/i.test(s)) {
        return {
          rows: [{
            id: USER_ID,
            email: 'staff@gkp.in',
            mobile: '9876543210',
            full_name: 'Staff Full Name',
            role: 'ADMIN',
            designation: 'Administrator'
          }]
        };
      }
      if (/INSERT INTO employees/i.test(s)) {
        return { rows: [{ id: EMP_ID }] };
      }
      return { rows: [] };
    },
    pool: { end: async () => {} }
  }
};

const { resolveEmployeeId } = require('../modules/attendance/resolve-employee.helper');

(async () => {
  // 1. resolveEmployeeId auto-provisioning must query users.full_name (never users.name) and pass full_name into employees insert
  const resolvedId = await resolveEmployeeId({ id: USER_ID, role: 'ADMIN' });
  assert.strictEqual(resolvedId, EMP_ID);
  const insertCall = queries.find((q) => /INSERT INTO employees/i.test(q.sql));
  assert(insertCall, 'auto-provisioning should insert into employees');
  assert.strictEqual(insertCall.params[2], 'Staff Full Name', 'empName must come from userRow.full_name');
  console.log('✓ resolveEmployeeId auto-provisioning uses users.full_name cleanly');

  // 2. employee.routes.js must guard UPDATE users SET employee_id against duplicate employee_id on another user
  const empRoutesSrc = fs.readFileSync(path.join(__dirname, '../modules/employee/employee.routes.js'), 'utf8');
  assert(!/UPDATE users SET employee_id = \$1 WHERE id = \$2`/.test(empRoutesSrc), 'unguarded UPDATE users SET employee_id must be removed');
  assert(
    empRoutesSrc.includes('NOT EXISTS (') && empRoutesSrc.includes('u2.employee_id = $1 AND u2.id <> $2'),
    'employee_id sync must skip update when another user row already holds that employee_id'
  );
  assert(
    empRoutesSrc.includes('AND employee_id IS DISTINCT FROM $1'),
    'employee_id sync must skip no-op updates when employee_id already matches'
  );
  console.log('✓ employee.routes.js guards UPDATE users SET employee_id against unique constraint collisions');

  console.log('\n✓ All resolve-employee & employee_id sync regression tests passed!');
  process.exit(0);
})().catch((err) => {
  console.error('✗ TEST FAILED:', err);
  process.exit(1);
});
