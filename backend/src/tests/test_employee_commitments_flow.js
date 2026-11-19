/**
 * Unit Test: Attendance-gated Employee Panel with Daily Commitments and End-of-Day Task Review
 */

const assert = require('assert');

// Mock in-memory DB store for unit testing
const mockDb = {
  attendance: [],
  tasks: [],
  employees: [{ id: '11111111-1111-1111-1111-111111111111', user_id: 'user-emp-1', employee_id: 'EMP1001' }]
};

// Module mock for database
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function (request) {
  if (request.includes('/config/database') || request.endsWith('config/database')) {
    return {
      query: async (sql, params = []) => {
        const text = sql.trim().toLowerCase();

        // 1. Table check / migration DDL
        if (text.startsWith('create') || text.startsWith('alter') || text.startsWith('drop')) {
          return { rows: [] };
        }

        // 2. Select Date
        if (text.includes('asia/kolkata')) {
          return { rows: [{ today_date: '2026-11-17' }] };
        }

        // 3. Resolve Employee
        if (text.includes('from employees')) {
          return { rows: mockDb.employees };
        }

        // 4. Select attendance
        if (text.includes('from employee_attendance') && text.startsWith('select')) {
          const empId = params[0];
          const date = params[1];
          const row = mockDb.attendance.find(a => a.employee_id === empId && a.attendance_date === date);
          return { rows: row ? [row] : [] };
        }

        // 5. Upsert attendance check-in
        if (text.includes('insert into employee_attendance')) {
          const empId = params[0];
          const date = params[1];
          let row = mockDb.attendance.find(a => a.employee_id === empId && a.attendance_date === date);
          if (!row) {
            row = {
              id: 'att-uuid-1',
              employee_id: empId,
              attendance_date: date,
              check_in_time: new Date().toISOString(),
              check_out_time: null,
              commitments_submitted_at: null,
              status: 'PRESENT'
            };
            mockDb.attendance.push(row);
          } else {
            row.check_in_time = row.check_in_time || new Date().toISOString();
          }
          return { rows: [row] };
        }

        // 6. Update attendance commitments / checkout
        if (text.startsWith('update employee_attendance')) {
          const row = mockDb.attendance[0];
          if (text.includes('commitments_submitted_at')) {
            row.commitments_submitted_at = new Date().toISOString();
          }
          if (text.includes('check_out_time')) {
            row.check_out_time = new Date().toISOString();
          }
          return { rows: [row] };
        }

        // 7. Select tasks
        if (text.includes('from employee_tasks') && text.startsWith('select')) {
          const empId = params[0];
          const date = params[1];

          // Count query
          if (text.includes('count(*)')) {
            const list = mockDb.tasks.filter(t => t.employee_id === empId && t.task_date === date);
            const comp = list.filter(t => t.status === 'completed').length;
            const pend = list.filter(t => t.status === 'pending').length;
            return {
              rows: [{
                count: list.length,
                total_count: list.length,
                completed_count: comp,
                pending_count: pend
              }]
            };
          }

          // Duplicate check
          if (text.includes('lower(trim(title)) = lower($3)')) {
            const title = params[2];
            const match = mockDb.tasks.find(t => t.employee_id === empId && t.task_date === date && t.title.toLowerCase().trim() === title.toLowerCase().trim());
            return { rows: match ? [match] : [] };
          }

          // Single task by id
          if (text.includes('where id = $1')) {
            const id = params[0];
            const match = mockDb.tasks.find(t => t.id === id);
            return { rows: match ? [match] : [] };
          }

          // List query
          const list = mockDb.tasks.filter(t => t.employee_id === empId && t.task_date === date);
          return { rows: list };
        }

        // 8. Insert task
        if (text.startsWith('insert into employee_tasks')) {
          const empId = params[0];
          const taskDate = params[1];
          const title = params[2];
          const isCarry = text.includes('status, carried_from_date');
          const newTask = {
            id: 'task-' + (mockDb.tasks.length + 1),
            employee_id: empId,
            task_date: taskDate,
            title,
            status: 'pending',
            completed_at: null,
            carried_from_date: isCarry ? params[3] : null,
            carry_count: isCarry ? params[4] : 0,
            original_task_id: isCarry ? params[5] : null,
            submitted_at: isCarry ? new Date().toISOString() : null,
            created_at: new Date().toISOString()
          };
          mockDb.tasks.push(newTask);
          return { rows: [newTask] };
        }

        // 9. Delete task
        if (text.startsWith('delete from employee_tasks')) {
          const id = params[0];
          const idx = mockDb.tasks.findIndex(t => t.id === id);
          if (idx !== -1) mockDb.tasks.splice(idx, 1);
          return { rows: [] };
        }

        // 10. Update tasks submitted_at
        if (text.startsWith('update employee_tasks') && text.includes('submitted_at = now()')) {
          mockDb.tasks.forEach(t => {
            if (t.task_date === params[1] && !t.submitted_at) {
              t.submitted_at = new Date().toISOString();
            }
          });
          return { rows: [] };
        }

        // 11. Update tasks status on checkout
        if (text.startsWith('update employee_tasks') && text.includes("status = 'completed'")) {
          const completedIds = params[2] || [];
          mockDb.tasks.forEach(t => {
            if (completedIds.includes(t.id)) {
              t.status = 'completed';
              t.completed_at = new Date().toISOString();
            }
          });
          return { rows: [] };
        }

        return { rows: [] };
      },
      getClient: async () => ({
        query: async (sql, params = []) => {
          const text = sql.trim().toLowerCase();
          if (text === 'begin' || text === 'commit' || text === 'rollback') return { rows: [] };
          // Carry-over check
          if (text.includes('from employee_tasks t') && text.includes('t.status = \'pending\'')) {
            const empId = params[0];
            const today = params[1];
            // Previous pending tasks where submitted_at is not null
            const prevPending = mockDb.tasks.filter(t => t.employee_id === empId && t.task_date < today && t.status === 'pending' && t.submitted_at !== null);
            // Filter out if already copied to today
            const needed = prevPending.filter(pt => !mockDb.tasks.some(ct => ct.employee_id === empId && ct.task_date === today && (ct.original_task_id === pt.id || ct.title.toLowerCase() === pt.title.toLowerCase())));
            return { rows: needed };
          }
          if (text.startsWith('insert into employee_tasks')) {
            const newTask = {
              id: 'task-carried-' + (mockDb.tasks.length + 1),
              employee_id: params[0],
              task_date: params[1],
              title: params[2],
              status: 'pending',
              carried_from_date: params[3],
              carry_count: params[4],
              original_task_id: params[5],
              submitted_at: new Date().toISOString(),
              created_at: new Date().toISOString()
            };
            mockDb.tasks.push(newTask);
            return { rows: [newTask] };
          }
          return { rows: [] };
        },
        release: () => {}
      })
    };
  }
  return originalRequire.apply(this, arguments);
};

const service = require('../modules/employee/employee-commitments.service');
const requireDayUnlocked = require('../middleware/attendance/requireDayUnlocked.middleware');

async function runTests() {
  console.log('--- Starting Attendance-Gated Employee Commitments Test Suite ---\n');

  const reqUser = { id: 'user-emp-1', role: 'EMPLOYEE' };

  // TEST 1: Initial state before check-in -> NOT_CHECKED_IN
  const s1 = await service.getDayStatus({ reqUser });
  assert.strictEqual(s1.state, 'NOT_CHECKED_IN', 'Step 1: Initial state must be NOT_CHECKED_IN');
  console.log('✅ TEST 1 PASSED: Initial state is NOT_CHECKED_IN');

  // TEST 2: Middleware blocks when NOT_CHECKED_IN
  let blockedCode = null;
  const mockReq = { user: reqUser, path: '/applications' };
  const mockRes = {
    status: (code) => {
      blockedCode = code;
      return { json: (data) => { blockedCode = data.code; } };
    }
  };
  await requireDayUnlocked(mockReq, mockRes, () => { blockedCode = 'PASSED'; });
  assert.strictEqual(blockedCode, 'DAY_LOCKED', 'Step 2: requireDayUnlocked must return 403 DAY_LOCKED');
  console.log('✅ TEST 2 PASSED: requireDayUnlocked blocks access to dashboard/applications with DAY_LOCKED');

  // TEST 3: Check-in -> State transitions to NEEDS_COMMITMENTS
  const checkInRes = await service.executeCheckIn({ reqUser });
  assert.strictEqual(checkInRes.success, true);
  const s2 = await service.getDayStatus({ reqUser });
  assert.strictEqual(s2.state, 'NEEDS_COMMITMENTS', 'Step 3: State after check-in must be NEEDS_COMMITMENTS');
  console.log('✅ TEST 3 PASSED: State after check-in is NEEDS_COMMITMENTS');

  // TEST 4: Add Draft Task, validate trimming & duplicate rejection
  await assert.rejects(
    async () => { await service.addDraftTask({ reqUser, title: '   ' }); },
    /Task title is required/,
    'Empty task title must be rejected'
  );
  const t1 = await service.addDraftTask({ reqUser, title: '  Review loan application #402  ' });
  assert.strictEqual(t1.data.title, 'Review loan application #402');
  assert.strictEqual(t1.data.status, 'pending');

  await assert.rejects(
    async () => { await service.addDraftTask({ reqUser, title: 'review loan application #402' }); },
    /already been added/,
    'Duplicate task for today (case-insensitive) must be rejected'
  );
  console.log('✅ TEST 4 PASSED: Draft task added with title trimmed; duplicate rejected');

  // TEST 5: Add second draft task and delete it
  const t2 = await service.addDraftTask({ reqUser, title: 'Follow up with customer Rahul' });
  const delRes = await service.deleteDraftTask({ reqUser, taskId: t2.data.id });
  assert.strictEqual(delRes.success, true);
  console.log('✅ TEST 5 PASSED: Draft task deleted before submit');

  // TEST 6: Submit Commitments -> locks tasks, sets commitments_submitted_at, unlocks panel
  const submitRes = await service.submitCommitments({ reqUser });
  assert.strictEqual(submitRes.success, true);
  assert.strictEqual(submitRes.state, 'UNLOCKED');

  const s3 = await service.getDayStatus({ reqUser });
  assert.strictEqual(s3.state, 'UNLOCKED', 'State after submitting commitments must be UNLOCKED');
  console.log('✅ TEST 6 PASSED: Commitments submitted; panel is UNLOCKED');

  // TEST 7: requireDayUnlocked allows access once UNLOCKED
  let allowed = false;
  await requireDayUnlocked(mockReq, mockRes, () => { allowed = true; });
  assert.strictEqual(allowed, true, 'requireDayUnlocked must allow next() when UNLOCKED');
  console.log('✅ TEST 7 PASSED: requireDayUnlocked allows dashboard and panel access when UNLOCKED');

  // TEST 8: Check-Out with task review -> completed task marked completed, rest stay pending
  // Add another task to simulate Day 1 checkout with 1 completed, 1 pending
  mockDb.tasks.push({
    id: 'task-3',
    employee_id: '11111111-1111-1111-1111-111111111111',
    task_date: '2026-11-17',
    title: 'Call merchant partners',
    status: 'pending',
    completed_at: null,
    carried_from_date: null,
    carry_count: 0,
    submitted_at: new Date().toISOString()
  });

  const checkOutRes = await service.executeCheckOut({
    reqUser,
    completedTaskIds: [t1.data.id] // tick task 1, leave task 3 pending
  });
  assert.strictEqual(checkOutRes.success, true);
  assert.strictEqual(checkOutRes.state, 'CHECKED_OUT');
  assert.strictEqual(checkOutRes.summary.completedCount, 1);
  assert.strictEqual(checkOutRes.summary.pendingCount, 1);
  console.log('✅ TEST 8 PASSED: End of Day Review check-out marks 1 completed and 1 pending');

  // TEST 9: Next Day Carry-Over Behaviour (Section 9)
  // Simulate Day 2: task-3 was left pending on Day 1 (2026-11-17).
  // Advance simulated server date to 2026-11-18.
  await service.carryOverPendingTasks('11111111-1111-1111-1111-111111111111', '2026-11-18');
  const day2Tasks = mockDb.tasks.filter(t => t.task_date === '2026-11-18');
  assert.strictEqual(day2Tasks.length, 1, 'Day 2 must carry over the 1 pending task from Day 1');
  assert.strictEqual(day2Tasks[0].title, 'Call merchant partners');
  assert.strictEqual(day2Tasks[0].carry_count, 1);
  assert.strictEqual(day2Tasks[0].carried_from_date, '2026-11-17');

  // Verify idempotency: calling carry-over again must not duplicate
  await service.carryOverPendingTasks('11111111-1111-1111-1111-111111111111', '2026-11-18');
  const day2TasksAfter = mockDb.tasks.filter(t => t.task_date === '2026-11-18');
  assert.strictEqual(day2TasksAfter.length, 1, 'Carry-over must be idempotent');
  console.log('✅ TEST 9 PASSED: Next-day carry-over carries forward uncompleted task with incremented carry_count (idempotent)');

  console.log('\n===============================================================');
  console.log('ALL 9 ATTENDANCE COMMITMENTS TESTS PASSED SUCCESSFULLY!');
  console.log('===============================================================');
}

runTests().catch(err => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
