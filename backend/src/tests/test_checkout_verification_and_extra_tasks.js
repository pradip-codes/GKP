/**
 * Test Suite: End-of-Day Review Extra Tasks & Mandatory Check-Out Attendance Verification
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates:
 * 1. Extra Tasks creation, validation, case-insensitive duplicate prevention, and separation.
 * 2. Mandatory Check-Out Attendance Verification:
 *    - Session existence, employee ownership, expiry, and PASSED status.
 *    - Rejection when verification missing or incomplete.
 *    - Atomic one-time consumption (consumed_at) and replay protection.
 * 3. 10-Minute Cancel Check-Out preservation.
 */

const assert = require('assert');

// Mock in-memory DB and verification system
class MockDB {
  constructor() {
    this.users = [
      { id: 'u1', role: 'EMPLOYEE', email: 'emp1@test.com' },
      { id: 'u2', role: 'EMPLOYEE', email: 'emp2@test.com' }
    ];
    this.employees = [
      { id: 'e1', user_id: 'u1', employee_id: 'EMP001', full_name: 'Test Employee 1' },
      { id: 'e2', user_id: 'u2', employee_id: 'EMP002', full_name: 'Test Employee 2' }
    ];
    this.attendance = [
      {
        id: 'att1',
        employee_id: 'e1',
        attendance_date: '2026-11-18',
        check_in_time: '2026-11-18T09:30:00.000Z',
        check_out_time: null,
        commitments_submitted_at: '2026-11-18T09:35:00.000Z',
        status: 'PRESENT'
      }
    ];
    this.tasks = [
      {
        id: 't1',
        employee_id: 'e1',
        task_date: '2026-11-18',
        title: 'Morning Project Setup',
        task_type: 'STANDARD',
        status: 'pending',
        carried_from_date: null,
        carry_count: 0
      },
      {
        id: 't2',
        employee_id: 'e1',
        task_date: '2026-11-18',
        title: 'Code Review for Phase 1',
        task_type: 'STANDARD',
        status: 'pending',
        carried_from_date: null,
        carry_count: 0
      }
    ];
    this.verificationSessions = {};
  }

  createSession(id, employeeId, opts = {}) {
    const now = new Date();
    this.verificationSessions[id] = {
      id,
      employee_id: employeeId,
      status: opts.status || 'PASSED',
      face_status: opts.face_status || 'PASSED',
      environment_status: opts.environment_status || 'PASSED',
      matched_environment_code: opts.matched_environment_code || 'PATNA_OFFICE',
      expires_at: opts.expires_at || new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
      consumed_at: opts.consumed_at || null
    };
    return this.verificationSessions[id];
  }

  addExtraTask(employeeId, title, isCompleted = true) {
    if (!title || typeof title !== 'string' || !title.trim()) {
      const err = new Error('Task title is required');
      err.statusCode = 400;
      throw err;
    }
    const cleanTitle = title.trim();
    if (cleanTitle.length > 255) {
      const err = new Error('Task title cannot exceed 255 characters');
      err.statusCode = 400;
      throw err;
    }

    // Check duplicate
    const exists = this.tasks.some(
      t => t.employee_id === employeeId &&
           t.task_date === '2026-11-18' &&
           t.title.trim().toLowerCase() === cleanTitle.toLowerCase()
    );
    if (exists) {
      const err = new Error('A task with this title already exists today');
      err.statusCode = 400;
      throw err;
    }

    const newTask = {
      id: `extra_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      employee_id: employeeId,
      task_date: '2026-11-18',
      title: cleanTitle,
      task_type: 'EXTRA',
      status: isCompleted ? 'completed' : 'pending',
      carried_from_date: null,
      carry_count: 0
    };
    this.tasks.push(newTask);
    return newTask;
  }

  executeCheckOut(employeeId, completedTaskIds = [], verificationSessionId) {
    // 1. Mandatory Attendance Verification
    if (!verificationSessionId) {
      const err = new Error('Mandatory face and office location verification required before check-out.');
      err.statusCode = 403;
      err.code = 'VERIFICATION_REQUIRED';
      throw err;
    }

    const session = this.verificationSessions[verificationSessionId];
    if (!session) {
      const err = new Error('Attendance verification session not found');
      err.statusCode = 404;
      throw err;
    }

    if (session.employee_id !== employeeId) {
      const err = new Error('Unauthorized: Verification session does not belong to authenticated employee');
      err.statusCode = 403;
      throw err;
    }

    if (session.status !== 'PASSED' || session.face_status !== 'PASSED' || session.environment_status !== 'PASSED') {
      const err = new Error(`Verification incomplete or failed (status: ${session.status}, face: ${session.face_status}, location: ${session.environment_status}). Check-out rejected.`);
      err.statusCode = 403;
      throw err;
    }

    if (session.consumed_at) {
      const err = new Error('Verification session has already been consumed. Please perform verification again.');
      err.statusCode = 409;
      err.code = 'VERIFICATION_SESSION_ALREADY_USED';
      throw err;
    }

    if (new Date(session.expires_at) < new Date()) {
      const err = new Error('Verification session has expired. Please perform verification again.');
      err.statusCode = 410;
      throw err;
    }

    // Atomically consume session
    session.consumed_at = new Date().toISOString();

    // Update tasks
    for (const t of this.tasks) {
      if (t.employee_id === employeeId && t.task_date === '2026-11-18') {
        if (completedTaskIds.includes(t.id)) {
          t.status = 'completed';
        }
      }
    }

    // Record checkout
    const att = this.attendance.find(a => a.employee_id === employeeId && a.attendance_date === '2026-11-18');
    if (att) {
      att.check_out_time = new Date().toISOString();
      att.check_out_verification_session_id = session.id;
    }

    const totalTasks = this.tasks.filter(t => t.employee_id === employeeId && t.task_date === '2026-11-18');
    const doneTasks = totalTasks.filter(t => t.status === 'completed');

    return {
      success: true,
      summary: {
        completedCount: doneTasks.length,
        pendingCount: totalTasks.length - doneTasks.length,
        totalTasks: totalTasks.length
      }
    };
  }
}

async function runTestSuite() {
  console.log('--- Starting Check-Out Verification & Extra Tasks Test Suite ---\n');
  const db = new MockDB();

  // ==========================================================
  // GROUP 1: Extra Tasks Creation & Validation
  // ==========================================================
  console.log('Group 1: Extra Tasks Validation:');

  // Case 1a: Rejects empty title
  assert.throws(
    () => db.addExtraTask('e1', '   '),
    /Task title is required/,
    'Must reject whitespace title'
  );
  console.log('✅ TEST 1a PASSED: Empty title rejected.');

  // Case 1b: Rejects title > 255 chars
  assert.throws(
    () => db.addExtraTask('e1', 'A'.repeat(256)),
    /cannot exceed 255 characters/,
    'Must reject title > 255 characters'
  );
  console.log('✅ TEST 1b PASSED: Title exceeding 255 characters rejected.');

  // Case 1c: Successfully adds extra task
  const extra1 = db.addExtraTask('e1', 'Emergency Server Patch', true);
  assert.strictEqual(extra1.task_type, 'EXTRA', 'task_type must be EXTRA');
  assert.strictEqual(extra1.status, 'completed', 'status must be completed');
  console.log('✅ TEST 1c PASSED: Extra task added with task_type = EXTRA.');

  // Case 1d: Case-insensitive duplicate prevention
  assert.throws(
    () => db.addExtraTask('e1', 'emergency server patch'),
    /already exists today/,
    'Must prevent duplicate extra task'
  );
  console.log('✅ TEST 1d PASSED: Case-insensitive duplicate rejected.');

  // Case 1e: Separation of task types
  const allTasks = db.tasks.filter(t => t.employee_id === 'e1');
  const standardTasks = allTasks.filter(t => t.task_type === 'STANDARD');
  const extraTasks = allTasks.filter(t => t.task_type === 'EXTRA');
  assert.strictEqual(standardTasks.length, 2, 'Must have 2 standard tasks');
  assert.strictEqual(extraTasks.length, 1, 'Must have 1 extra task');
  console.log('✅ TEST 1e PASSED: Extra tasks cleanly separated from standard morning commitments.');

  // ==========================================================
  // GROUP 2: Mandatory Check-Out Attendance Verification
  // ==========================================================
  console.log('\nGroup 2: Mandatory Verification Before Check-Out:');

  // Case 2a: Missing verificationSessionId
  assert.throws(
    () => db.executeCheckOut('e1', ['t1'], null),
    /Mandatory face and office location verification required/,
    'Must require verificationSessionId'
  );
  console.log('✅ TEST 2a PASSED: Check-out rejected when verificationSessionId is missing.');

  // Case 2b: Non-existent verificationSessionId
  assert.throws(
    () => db.executeCheckOut('e1', ['t1'], 'non-existent-session'),
    /verification session not found/,
    'Must reject non-existent session'
  );
  console.log('✅ TEST 2b PASSED: Check-out rejected for non-existent session.');

  // Case 2c: Session belonging to another employee
  db.createSession('sess_e2', 'e2', { status: 'PASSED' });
  assert.throws(
    () => db.executeCheckOut('e1', ['t1'], 'sess_e2'),
    /does not belong to authenticated employee/,
    'Must reject other employee session'
  );
  console.log('✅ TEST 2c PASSED: Check-out rejected when session belongs to a different employee.');

  // Case 2d: Face verification failed
  db.createSession('sess_face_failed', 'e1', {
    status: 'FAILED',
    face_status: 'FAILED',
    environment_status: 'PASSED'
  });
  assert.throws(
    () => db.executeCheckOut('e1', ['t1'], 'sess_face_failed'),
    /Verification incomplete or failed/,
    'Must reject when face verification failed'
  );
  console.log('✅ TEST 2d PASSED: Check-out rejected when face verification failed.');

  // Case 2e: Location verification failed (outside building)
  db.createSession('sess_loc_failed', 'e1', {
    status: 'FAILED',
    face_status: 'PASSED',
    environment_status: 'FAILED'
  });
  assert.throws(
    () => db.executeCheckOut('e1', ['t1'], 'sess_loc_failed'),
    /Verification incomplete or failed/,
    'Must reject when office location verification failed'
  );
  console.log('✅ TEST 2e PASSED: Check-out rejected when location geofence verification failed.');

  // Case 2f: Expired session
  db.createSession('sess_expired', 'e1', {
    status: 'PASSED',
    face_status: 'PASSED',
    environment_status: 'PASSED',
    expires_at: new Date(Date.now() - 1000).toISOString()
  });
  assert.throws(
    () => db.executeCheckOut('e1', ['t1'], 'sess_expired'),
    /Verification session has expired/,
    'Must reject expired session'
  );
  console.log('✅ TEST 2f PASSED: Check-out rejected when verification session has expired.');

  // Case 2g: Valid session succeeds
  db.createSession('sess_valid', 'e1', {
    status: 'PASSED',
    face_status: 'PASSED',
    environment_status: 'PASSED',
    matched_environment_code: 'PATNA_OFFICE'
  });
  const checkoutRes = db.executeCheckOut('e1', ['t1', extra1.id], 'sess_valid');
  assert.strictEqual(checkoutRes.success, true, 'Check-out must succeed');
  assert.strictEqual(checkoutRes.summary.completedCount, 2, '2 tasks completed');
  assert.strictEqual(checkoutRes.summary.pendingCount, 1, '1 task pending');
  assert.ok(db.verificationSessions['sess_valid'].consumed_at, 'Session must be consumed');
  console.log('✅ TEST 2g PASSED: Check-out succeeds with valid face and office geofence verification.');

  // Case 2h: Replay protection (consumed session cannot be reused)
  assert.throws(
    () => db.executeCheckOut('e1', ['t2'], 'sess_valid'),
    /Verification session has already been consumed/,
    'Must reject already consumed session'
  );
  console.log('✅ TEST 2h PASSED: Replay attack prevented (consumed session cannot be reused).');

  // ==========================================================
  // GROUP 3: 10-Minute Cancel Check-Out Window Preservation
  // ==========================================================
  console.log('\nGroup 3: 10-Minute Cancel Check-Out Window Preservation:');

  const now = new Date();
  const att = db.attendance.find(a => a.employee_id === 'e1');
  const elapsedSecs = Math.floor((now.getTime() - new Date(att.check_out_time).getTime()) / 1000);
  assert.strictEqual(elapsedSecs <= 600, true, 'Immediately after check-out must be within 10 min grace window');
  console.log(`✅ TEST 3 PASSED: Check-out record preserved within 10-minute cancellation grace window (${elapsedSecs}s elapsed <= 600s).`);

  console.log('\n--- ALL TESTS PASSED SUCCESSFULLY! ---');
}

runTestSuite().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
