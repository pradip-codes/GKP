/* Regression guard for Super Admin delete / suspend / HR assign fixes.  Run: node src/tests/test_super_admin_delete_suspend_fix.js */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

// 1. Dynamic SQL placeholders must be "$$" + index (rendering "$1::..."), never bare "${...}::" or "{...}::"
const del = read('modules/auth/user-deletion.service.js');
const bare = del.match(/(?<!\$)\$\{\s*\w+\.length\s*\}\s*::/g) || [];
assert.strictEqual(bare.length, 0, `Found ${bare.length} bare placeholder(s) in user-deletion.service.js`);
const stripped = del.match(/ANY\(\s*\{\s*\w+\.length\s*\}\s*::/g) || [];
assert.strictEqual(stripped.length, 0, `Found ${stripped.length} stripped placeholder(s) in user-deletion.service.js`);

// 2. role / status are enums in users: never call UPPER() on them without a ::text cast
for (const rel of ['modules/hr/hr.routes.js', 'modules/employee/employee.hr.routes.js', 'modules/referrals/referrals.routes.js', 'modules/super-admin/accountStatus.service.js']) {
  const src = read(rel);
  assert.ok(!/UPPER\(\s*role\s*\)/.test(src), `${rel}: UPPER(role) on enum column`);
}

// 3. employees.is_active must have DDL
const mig = read('database/migrations/migrate_employee_account_status_columns.js');
assert.ok(/ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_active/.test(mig), 'employees.is_active DDL missing');
console.log('test_super_admin_delete_suspend_fix: all checks passed');
