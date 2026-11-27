const assert = require('assert');

process.env.NODE_ENV = 'test';
process.env.SKIP_DB = 'true';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const EXISTING_EMP_ID = '22222222-2222-4222-8222-222222222222';
const queries = [];

let customHandler = null;
const dbPath = require.resolve('../config/database');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: {
    query: async (sql, params = []) => {
      if (customHandler) return customHandler(sql, params);
      const s = String(sql);
      queries.push({ sql: s, params });

      // Simulate existing employee found only by normalized 10-digit mobile
      if (/FROM employees/i.test(s) && /RIGHT\(REGEXP_REPLACE/i.test(s)) {
        if (params.includes('9876543210')) {
          return { rows: [{ id: EXISTING_EMP_ID, user_id: null }] };
        }
      }
      if (/SELECT id, email, mobile, full_name, role, designation FROM users/i.test(s)) {
        return {
          rows: [{
            id: USER_ID,
            email: 'admin@gkp.in',
            mobile: '+91 9876543210',
            full_name: 'Admin User',
            role: 'ADMIN',
            designation: 'Admin',
          }],
        };
      }
      return { rows: [] };
    },
    pool: { end: async () => {}, connect: async () => ({ query: async () => ({ rows: [] }), release: () => {} }) },
  },
};

const { resolveEmployeeId } = require('../modules/attendance/resolve-employee.helper');
const adminService = require('../modules/attendance-admin/attendance-admin.service');
const reportsService = require('../modules/attendance-reports/attendance-reports.service');

(async () => {
  // 1. resolveEmployeeId must match existing employee by normalized 10-digit phone and NEVER insert a duplicate row
  const resolved = await resolveEmployeeId({ id: USER_ID, mobile: '+91 9876543210', email: 'admin@gkp.in' });
  assert.strictEqual(resolved, EXISTING_EMP_ID);
  assert(!queries.some((q) => /INSERT INTO employees/i.test(q.sql)), 'must not insert duplicate employee when normalized phone matches');
  console.log('✓ resolveEmployeeId links existing employee by normalized 10-digit phone without inserting duplicates');

  // 2. Verify getTodayAdminAttendance queries use ranked/deduped_employees CTE & ::TEXT date casts
  queries.length = 0;
  customHandler = async (sql, params = []) => {
    const s = String(sql);
    queries.push({ sql: s, params });
    if (/AS today_date/i.test(s)) return { rows: [{ today_date: '2026-11-27' }] };
    return { rows: [] };
  };

  await adminService.getTodayAdminAttendance({ date: '2026-11-27' });
  const todaySql = queries.map((q) => q.sql).join('\n');
  assert(todaySql.includes('deduped_employees'), 'getTodayAdminAttendance must deduplicate employees via deduped_employees CTE');
  assert(todaySql.includes('att.attendance_date::TEXT AS attendance_date'), 'getTodayAdminAttendance must cast attendance_date::TEXT');
  console.log('✓ getTodayAdminAttendance uses deduped_employees CTE and casts attendance_date::TEXT');

  // 3. Verify history & reports select ::TEXT dates
  queries.length = 0;
  await adminService.getAdminAttendanceHistory({ startDate: '2026-11-01', endDate: '2026-11-27' });
  const histSql = queries.map((q) => q.sql).join('\n');
  assert(histSql.includes('att.attendance_date::TEXT AS attendance_date'), 'getAdminAttendanceHistory must cast attendance_date::TEXT');
  console.log('✓ getAdminAttendanceHistory casts attendance_date::TEXT');

  queries.length = 0;
  await reportsService.getAttendanceReports({ startDate: '2026-11-01', endDate: '2026-11-27' });
  const repSql = queries.map((q) => q.sql).join('\n');
  assert(repSql.includes('att.attendance_date::TEXT AS attendance_date'), 'getAttendanceReports must cast attendance_date::TEXT');
  console.log('✓ getAttendanceReports casts attendance_date::TEXT');

  customHandler = null;
  console.log('\n✓ All attendance Invalid Date & Duplicate ID regression checks passed!');
  process.exit(0);
})().catch((err) => {
  console.error('✗ TEST FAILED:', err);
  process.exit(1);
});
