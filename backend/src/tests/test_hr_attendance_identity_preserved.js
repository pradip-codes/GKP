const assert = require('assert');
const fs = require('fs');
const path = require('path');

const empRoutesPath = path.join(__dirname, '../modules/employee-management/employee-management.routes.js');
const hrRoutesPath = path.join(__dirname, '../modules/hr/hr.routes.js');
const deployYmlPath = path.join(__dirname, '../../../.github/workflows/deploy.yml');

const empSrc = fs.readFileSync(empRoutesPath, 'utf8');
const hrSrc = fs.readFileSync(hrRoutesPath, 'utf8');
const deploySrc = fs.readFileSync(deployYmlPath, 'utf8');

// Extract syncAndSeedEmployees body
const syncStart = empSrc.indexOf('async function syncAndSeedEmployees()');
const syncEnd = empSrc.indexOf('// GET /api/v1/employees ', syncStart);
assert(syncStart !== -1 && syncEnd !== -1, 'syncAndSeedEmployees function must exist');
const syncBody = empSrc.slice(syncStart, syncEnd);

// (a) syncAndSeedEmployees must have no DELETE FROM employees and no hrEmpSubquery
assert(!syncBody.includes('DELETE FROM employees'), 'syncAndSeedEmployees must not contain DELETE FROM employees');
assert(!syncBody.includes('hrEmpSubquery'), 'syncAndSeedEmployees must not contain hrEmpSubquery');

// (b) GET / and GET /stats still contain (u.role IS NULL OR u.role = 'EMPLOYEE') and NOT ILIKE '%Human Resource%'
const getRootStart = empSrc.indexOf("router.get('/', async (req, res, next) =>");
const getStatsStart = empSrc.indexOf("router.get('/stats', async (req, res, next) =>");
assert(getRootStart !== -1 && getStatsStart !== -1, 'GET / and GET /stats routes must exist');
const getRootBody = empSrc.slice(getRootStart, getStatsStart);
const getStatsBody = empSrc.slice(getStatsStart, empSrc.indexOf('router.', getStatsStart + 20));

assert(getRootBody.includes("(u.role IS NULL OR u.role = 'EMPLOYEE')"), "GET / must keep (u.role IS NULL OR u.role = 'EMPLOYEE')");
assert(getRootBody.includes("NOT ILIKE '%Human Resource%'"), "GET / must keep NOT ILIKE '%Human Resource%'");
assert(getStatsBody.includes("(u.role IS NULL OR u.role = 'EMPLOYEE')"), "GET /stats must keep (u.role IS NULL OR u.role = 'EMPLOYEE')");
assert(getStatsBody.includes("NOT ILIKE '%Human Resource%'"), "GET /stats must keep NOT ILIKE '%Human Resource%'");

// (c) both Refcode UPDATEs and the step-4 UPDATE have the NOT EXISTS guard
assert(
  syncBody.includes("AND NOT EXISTS (SELECT 1 FROM employees x WHERE x.employee_id = c.reference_code AND x.id <> e.id)"),
  'employees refcode UPDATE must guard against duplicate employee_id'
);
const userGuardMatches = syncBody.match(/AND NOT EXISTS \(SELECT 1 FROM users x WHERE x\.employee_id = e\.employee_id AND x\.id <> u\.id\)/g) || [];
assert.strictEqual(
  userGuardMatches.length,
  2,
  `Both refcode users UPDATE and step-4 users UPDATE must have the NOT EXISTS guard (found ${userGuardMatches.length})`
);

// Split check: UPDATE employees and UPDATE users must not share a single multi-statement query
assert(
  !/UPDATE employees e[\s\S]*?;\s*UPDATE users u/i.test(syncBody),
  'Refcode employees UPDATE and users UPDATE must be split into separate query calls'
);

// (d) deploy.yml runs migrateEmployeeReferralCode
assert(
  deploySrc.includes('migrate_employee_referral_code') && deploySrc.includes('migrateEmployeeReferralCode'),
  '.github/workflows/deploy.yml must run migrateEmployeeReferralCode'
);

// (e) hr.routes.js select route checks for an existing owner of employee_id
const hrSelectStart = hrSrc.indexOf("router.post('/candidates/:id/select'");
const hrSelectEnd = hrSrc.indexOf("router.post('/candidates/:id/reject'", hrSelectStart);
assert(hrSelectStart !== -1 && hrSelectEnd !== -1, 'HR select route must exist');
const hrSelectBody = hrSrc.slice(hrSelectStart, hrSelectEnd);
assert(
  hrSelectBody.includes('SELECT id FROM users WHERE employee_id = $1 AND ($2::uuid IS NULL OR id <> $2::uuid) LIMIT 1'),
  'HR select route must check users table for an existing owner of employee_id'
);
assert(
  hrSelectBody.includes('SELECT id FROM employees WHERE employee_id = $1'),
  'HR select route must check employees table for an existing owner of employee_id'
);

console.log('✓ All HR attendance identity preservation, refcode guard, and deploy checks passed!');
