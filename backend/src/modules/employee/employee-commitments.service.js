const { query, getClient } = require('../../config/database');
const logger = require('../../config/logger');

let tablesVerified = false;

/**
 * Ensure employee_tasks table and attendance columns exist idempotently
 */
async function ensureTasksTableExists() {
  if (tablesVerified) return;
  try {
    await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    await query(`
      ALTER TABLE employee_attendance 
      ADD COLUMN IF NOT EXISTS commitments_submitted_at TIMESTAMPTZ NULL,
      ADD COLUMN IF NOT EXISTS check_in TIMESTAMPTZ NULL,
      ADD COLUMN IF NOT EXISTS check_out TIMESTAMPTZ NULL,
      ADD COLUMN IF NOT EXISTS date DATE NULL,
      ADD COLUMN IF NOT EXISTS attendance_type VARCHAR(20) DEFAULT 'FULL_TIME',
      ADD COLUMN IF NOT EXISTS is_re_attendance BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS re_attendance_granted_at TIMESTAMPTZ NULL,
      ADD COLUMN IF NOT EXISTS re_attendance_granted_by UUID NULL;
    `);

    try {
      await query(`ALTER TABLE employee_attendance DROP CONSTRAINT IF EXISTS employee_attendance_status_check;`);
      await query(`
        ALTER TABLE employee_attendance 
        ADD CONSTRAINT employee_attendance_status_check 
        CHECK (status IN ('PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE', 'PART_TIME', 'FULL_TIME'));
      `);
    } catch (e) {}

    await query(`
      CREATE TABLE IF NOT EXISTS employee_tasks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        task_date DATE NOT NULL,
        title VARCHAR(255) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
        completed_at TIMESTAMPTZ NULL,
        carried_from_date DATE NULL,
        carry_count INT NOT NULL DEFAULT 0,
        original_task_id UUID NULL,
        task_type VARCHAR(20) NOT NULL DEFAULT 'STANDARD' CHECK (task_type IN ('STANDARD', 'EXTRA')),
        submitted_at TIMESTAMPTZ NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE employee_tasks 
      ADD COLUMN IF NOT EXISTS task_type VARCHAR(20) NOT NULL DEFAULT 'STANDARD';

      CREATE INDEX IF NOT EXISTS idx_employee_tasks_emp_date ON employee_tasks(employee_id, task_date);
      CREATE INDEX IF NOT EXISTS idx_employee_tasks_status ON employee_tasks(status);
      CREATE INDEX IF NOT EXISTS idx_employee_tasks_submitted ON employee_tasks(submitted_at);
      CREATE INDEX IF NOT EXISTS idx_employee_tasks_type ON employee_tasks(employee_id, task_date, task_type);
    `);

    // One-time backfill: legacy attendance_tasks -> employee_tasks (idempotent)
    try {
      const { rows: [tbl] } = await query(
        `SELECT EXISTS (
           SELECT 1 FROM information_schema.tables
           WHERE table_schema = 'public' AND table_name = 'attendance'
         ) AS exists`
      );
      const { rows: [tasksTbl] } = await query(
        `SELECT EXISTS (
           SELECT 1 FROM information_schema.tables
           WHERE table_schema = 'public' AND table_name = 'attendance_tasks'
         ) AS exists`
      );
      if (tbl?.exists && tasksTbl?.exists) {
        await query(
          `INSERT INTO employee_tasks (employee_id, task_date, title, status, completed_at, task_type, created_at)
           SELECT e.id, att.attendance_date, at.task,
                  CASE WHEN LOWER(at.status) = 'completed' THEN 'completed' ELSE 'pending' END,
                  at.completed_at, 'STANDARD', at.created_at
           FROM attendance_tasks at
           JOIN attendance att ON att.id = at.attendance_id
           JOIN employees e ON (e.id = att.employee_id OR e.user_id = att.employee_id)
           WHERE att.attendance_date IS NOT NULL
             AND NOT EXISTS (
               SELECT 1 FROM employee_tasks et
               WHERE et.employee_id = e.id
                 AND et.task_date = att.attendance_date
                 AND LOWER(et.title) = LOWER(at.task)
             )`
        );
      }
    } catch (backfillErr) {
      logger.warn('[EMPLOYEE COMMITMENTS] Legacy attendance_tasks backfill skipped:', backfillErr.message);
    }

    tablesVerified = true;
  } catch (err) {
    logger.warn('[EMPLOYEE COMMITMENTS] Table auto-creation notice:', err.message);
  }
}

const { resolveEmployeeId } = require('../attendance/resolve-employee.helper');

/**
 * Helper: Server date in Asia/Kolkata (YYYY-MM-DD)
 */
async function getKolkataDateString() {
  try {
    const { rows } = await query(`SELECT (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE::TEXT AS today_date`);
    if (rows && rows[0] && rows[0].today_date) {
      return rows[0].today_date;
    }
  } catch (e) {}
  const now = new Date();
  const kolkataTime = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);
  return kolkataTime;
}

/**
 * Helper: Determine Part-Time vs Full-Time attendance based on Asia/Kolkata check-in time
 * Rule: Check-in at or after 7:00 PM (19:00:00) IST -> PART_TIME
 *       Check-in before 7:00 PM (19:00:00) IST -> FULL_TIME
 */
function evaluateAttendanceType(checkInTimestamp = new Date()) {
  const dateObj = checkInTimestamp instanceof Date ? checkInTimestamp : new Date(checkInTimestamp);
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric'
  });
  const parts = timeFormatter.formatToParts(dateObj);
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value, 10);
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value, 10);
  const isPartTime = !isNaN(hour) && hour >= 19;
  return {
    attendanceType: isPartTime ? 'PART_TIME' : 'FULL_TIME',
    status: isPartTime ? 'PART_TIME' : 'PRESENT',
    hour,
    minute,
    isPartTime
  };
}

/**
 * Helper: format duration in human-readable form (e.g. "2h 30m")
 */
function formatWorkingHours(seconds) {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return '0h 0m';
  const sec = Math.max(0, Math.round(Number(seconds)));
  const hours = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  return `${hours}h ${mins}m`;
}

/**
 * Idempotent Carry-Over Logic
 * On first day-status call of a new day:
 * Find previous tasks where status = 'pending' and submitted_at is not null,
 * and no copy exists for today. Create copies for today with carried_from_date = original date and carry_count + 1.
 */
async function carryOverPendingTasks(employeeId, todayDate) {
  await ensureTasksTableExists();

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Query pending previous submitted tasks
    // If the employee forgot to check out yesterday, yesterday's tasks stayed 'pending' with submitted_at set.
    const { rows: pendingTasks } = await client.query(
      `SELECT t.* 
       FROM employee_tasks t
       WHERE t.employee_id = $1 
         AND t.task_date < $2 
         AND t.status = 'pending' 
         AND t.submitted_at IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM employee_tasks newer 
           WHERE newer.employee_id = t.employee_id 
             AND newer.task_date = $2
             AND (
               newer.original_task_id = COALESCE(t.original_task_id, t.id)
               OR LOWER(TRIM(newer.title)) = LOWER(TRIM(t.title))
             )
         )
       ORDER BY t.task_date ASC, t.created_at ASC`,
      [employeeId, todayDate]
    );

    for (const task of pendingTasks) {
      const origDate = task.carried_from_date || task.task_date;
      const newCarryCount = (parseInt(task.carry_count, 10) || 0) + 1;
      const origTaskId = task.original_task_id || task.id;

      await client.query(
        `INSERT INTO employee_tasks 
         (employee_id, task_date, title, status, carried_from_date, carry_count, original_task_id, submitted_at, created_at)
         VALUES ($1, $2, $3, 'pending', $4, $5, $6, NOW(), NOW())`,
        [employeeId, todayDate, task.title, origDate, newCarryCount, origTaskId]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('[EMPLOYEE COMMITMENTS] Error carrying over pending tasks:', err.message);
  } finally {
    client.release();
  }
}

/**
 * GET Day Status
 * Returns state: "NOT_CHECKED_IN" | "NEEDS_COMMITMENTS" | "UNLOCKED" | "CHECKED_OUT"
 */
async function getDayStatus({ reqUser }) {
  await ensureTasksTableExists();
  const employeeId = await resolveEmployeeId(reqUser);
  if (!employeeId) {
    const error = new Error('Authenticated user is not linked to an active employee profile');
    error.statusCode = 400;
    throw error;
  }

  const todayDate = await getKolkataDateString();

  // 1. Run idempotent carry-over
  await carryOverPendingTasks(employeeId, todayDate);

  // 2. Fetch today's attendance record
  const { rows: [attendance] } = await query(
    `SELECT id, check_in_time, check_out_time, commitments_submitted_at, status, attendance_type 
     FROM employee_attendance 
     WHERE employee_id = $1 AND attendance_date = $2 LIMIT 1`,
    [employeeId, todayDate]
  );

  // 3. Fetch today's tasks
  const { rows: allTasks } = await query(
    `SELECT id, employee_id, task_date, title, status, completed_at, carried_from_date, carry_count, original_task_id, task_type, submitted_at, created_at
     FROM employee_tasks
     WHERE employee_id = $1 AND task_date = $2
     ORDER BY (carried_from_date IS NOT NULL) DESC, created_at ASC`,
    [employeeId, todayDate]
  );

  const carryOverTasks = allTasks.filter(t => (t.carried_from_date !== null || t.carry_count > 0) && t.task_type !== 'EXTRA');
  const todayTasks = allTasks.filter(t => t.carried_from_date === null && (!t.carry_count || t.carry_count === 0) && t.task_type !== 'EXTRA');
  const extraTasks = allTasks.filter(t => t.task_type === 'EXTRA');

  // Determine state
  const hasCheckIn = !!(attendance && attendance.check_in_time);
  const hasCheckOut = !!(attendance && attendance.check_out_time);
  
  // Commitments are submitted if commitments_submitted_at is set OR today's tasks are locked/submitted
  const hasSubmittedCommitments = !!(
    attendance && attendance.commitments_submitted_at
  ) || (
    todayTasks.length > 0 && todayTasks.every(t => t.submitted_at !== null)
  );

  let state = 'NOT_CHECKED_IN';
  if (!hasCheckIn) {
    state = 'NOT_CHECKED_IN';
  } else if (hasCheckOut) {
    state = 'CHECKED_OUT';
  } else if (!hasSubmittedCommitments) {
    state = 'NEEDS_COMMITMENTS';
  } else {
    state = 'UNLOCKED';
  }

  // Calculate 10-minute check-out cancellation window
  const now = new Date();
  const checkOutDate = attendance?.check_out_time ? new Date(attendance.check_out_time) : null;
  const elapsedSeconds = checkOutDate ? Math.floor((now.getTime() - checkOutDate.getTime()) / 1000) : null;
  const cancelWindowSecondsRemaining = elapsedSeconds !== null ? Math.max(0, 600 - elapsedSeconds) : 0;
  const canCancelCheckOut = hasCheckOut && cancelWindowSecondsRemaining > 0;

  const resolvedAttendanceType = attendance?.attendance_type || 
    (attendance?.status === 'PART_TIME' ? 'PART_TIME' : 'FULL_TIME');

  return {
    success: true,
    state,
    todayDate,
    checkInTime: attendance?.check_in_time || null,
    checkOutTime: attendance?.check_out_time || null,
    commitmentsSubmittedAt: attendance?.commitments_submitted_at || null,
    attendanceType: resolvedAttendanceType,
    isPartTime: resolvedAttendanceType === 'PART_TIME',
    canCancelCheckOut,
    cancelWindowSecondsRemaining,
    carryOverTasks,
    todayTasks,
    extraTasks,
    allTasks
  };
}

/**
 * POST Check-In
 * Marks attendance check-in for the day
 * Rule: Check-in at or after 7:00 PM (19:00:00) IST -> PART_TIME
 *       Check-in before 7:00 PM (19:00:00) IST -> FULL_TIME
 */
async function executeCheckIn({ reqUser, body = {} }) {
  await ensureTasksTableExists();
  const employeeId = await resolveEmployeeId(reqUser);
  if (!employeeId) {
    const error = new Error('Authenticated user is not linked to an active employee profile');
    error.statusCode = 400;
    throw error;
  }

  const todayDate = await getKolkataDateString();
  const { attendanceType, status: resolvedStatus, isPartTime } = evaluateAttendanceType(new Date());

  // Upsert attendance record with attendance_type and status
  const { rows: [attendance] } = await query(
    `INSERT INTO employee_attendance 
     (employee_id, attendance_date, check_in_time, check_in, status, attendance_type, verification_status, source, created_at, updated_at)
     VALUES ($1, $2, NOW(), NOW(), $3, $4, 'VERIFIED', 'WEB', NOW(), NOW())
     ON CONFLICT (employee_id, attendance_date) DO UPDATE SET 
       check_in_time = COALESCE(employee_attendance.check_in_time, NOW()),
       check_in = COALESCE(employee_attendance.check_in, NOW()),
       status = $3,
       attendance_type = $4,
       updated_at = NOW()
     RETURNING id, check_in_time, check_out_time, commitments_submitted_at, status, attendance_type`,
    [employeeId, todayDate, resolvedStatus, attendanceType]
  );

  // Trigger carry-over check
  await carryOverPendingTasks(employeeId, todayDate);

  const statusInfo = await getDayStatus({ reqUser });
  return {
    success: true,
    message: isPartTime ? 'Part-Time attendance marked successfully (Evening Shift)' : 'Full-Time attendance marked successfully',
    attendanceId: attendance.id,
    checkInTime: attendance.check_in_time,
    attendanceType,
    isPartTime,
    state: statusInfo.state
  };
}

/**
 * GET Today's Tasks
 * Returns { carryOver: [], today: [] }
 */
async function getTodayTasks({ reqUser }) {
  await ensureTasksTableExists();
  const employeeId = await resolveEmployeeId(reqUser);
  if (!employeeId) {
    const error = new Error('Employee profile not found');
    error.statusCode = 400;
    throw error;
  }

  const todayDate = await getKolkataDateString();
  await carryOverPendingTasks(employeeId, todayDate);

  const { rows: allTasks } = await query(
    `SELECT id, employee_id, task_date, title, status, completed_at, carried_from_date, carry_count, original_task_id, task_type, submitted_at, created_at
     FROM employee_tasks
     WHERE employee_id = $1 AND task_date = $2
     ORDER BY (carried_from_date IS NOT NULL) DESC, created_at ASC`,
    [employeeId, todayDate]
  );

  const carryOver = allTasks.filter(t => (t.carried_from_date !== null || t.carry_count > 0) && t.task_type !== 'EXTRA');
  const today = allTasks.filter(t => t.carried_from_date === null && (!t.carry_count || t.carry_count === 0) && t.task_type !== 'EXTRA');
  const extra = allTasks.filter(t => t.task_type === 'EXTRA');

  return {
    carryOver,
    today,
    extra,
    all: allTasks
  };
}

/**
 * POST Add One Task (draft before submit)
 */
async function addDraftTask({ reqUser, title }) {
  await ensureTasksTableExists();
  const employeeId = await resolveEmployeeId(reqUser);
  if (!employeeId) {
    const error = new Error('Employee profile not found');
    error.statusCode = 400;
    throw error;
  }

  if (!title || typeof title !== 'string' || !title.trim()) {
    const error = new Error('Task title is required');
    error.statusCode = 400;
    throw error;
  }

  const cleanTitle = title.trim();
  if (cleanTitle.length > 255) {
    const error = new Error('Task title cannot exceed 255 characters');
    error.statusCode = 400;
    throw error;
  }

  const todayDate = await getKolkataDateString();

  // Check if commitments are already submitted for today
  const { rows: [attendance] } = await query(
    `SELECT commitments_submitted_at FROM employee_attendance WHERE employee_id = $1 AND attendance_date = $2`,
    [employeeId, todayDate]
  );

  if (attendance && attendance.commitments_submitted_at) {
    const error = new Error("Commitments already submitted for today. You cannot add new tasks now.");
    error.statusCode = 400;
    throw error;
  }

  // Check case-insensitive duplicate for today
  const { rows: existing } = await query(
    `SELECT id FROM employee_tasks 
     WHERE employee_id = $1 AND task_date = $2 AND LOWER(TRIM(title)) = LOWER($3)
     LIMIT 1`,
    [employeeId, todayDate, cleanTitle]
  );

  if (existing.length > 0) {
    const error = new Error('A task with this title has already been added for today');
    error.statusCode = 400;
    throw error;
  }

  const { rows: [newTask] } = await query(
    `INSERT INTO employee_tasks (employee_id, task_date, title, status, submitted_at, created_at)
     VALUES ($1, $2, $3, 'pending', NULL, NOW())
     RETURNING id, employee_id, task_date, title, status, completed_at, carried_from_date, carry_count, submitted_at, created_at`,
    [employeeId, todayDate, cleanTitle]
  );

  return {
    success: true,
    data: newTask
  };
}

/**
 * DELETE Draft Task (only before submit)
 */
async function deleteDraftTask({ reqUser, taskId }) {
  await ensureTasksTableExists();
  const employeeId = await resolveEmployeeId(reqUser);
  if (!employeeId) {
    const error = new Error('Employee profile not found');
    error.statusCode = 400;
    throw error;
  }

  const { rows: [task] } = await query(
    `SELECT id, employee_id, submitted_at, carried_from_date 
     FROM employee_tasks 
     WHERE id = $1 AND employee_id = $2`,
    [taskId, employeeId]
  );

  if (!task) {
    const error = new Error('Task not found or access denied');
    error.statusCode = 404;
    throw error;
  }

  if (task.carried_from_date !== null) {
    const error = new Error('Carried-over pending tasks cannot be deleted');
    error.statusCode = 400;
    throw error;
  }

  if (task.submitted_at !== null) {
    const error = new Error('Cannot delete a task after commitments have been submitted');
    error.statusCode = 400;
    throw error;
  }

  await query(`DELETE FROM employee_tasks WHERE id = $1`, [taskId]);

  return {
    success: true,
    message: 'Task removed successfully'
  };
}

/**
 * POST Submit Commitments
 * Locks list: sets submitted_at and commitments_submitted_at. Requires >= 1 task.
 */
async function submitCommitments({ reqUser }) {
  await ensureTasksTableExists();
  const employeeId = await resolveEmployeeId(reqUser);
  if (!employeeId) {
    const error = new Error('Employee profile not found');
    error.statusCode = 400;
    throw error;
  }

  const todayDate = await getKolkataDateString();

  // Check if attendance exists
  const { rows: [attendance] } = await query(
    `SELECT id, check_in_time, commitments_submitted_at 
     FROM employee_attendance 
     WHERE employee_id = $1 AND attendance_date = $2`,
    [employeeId, todayDate]
  );

  if (!attendance || !attendance.check_in_time) {
    const error = new Error('Please mark attendance check-in before submitting commitments');
    error.statusCode = 400;
    throw error;
  }

  // Count total tasks for today (draft + carried)
  const { rows: countRes } = await query(
    `SELECT COUNT(*)::int AS count FROM employee_tasks WHERE employee_id = $1 AND task_date = $2`,
    [employeeId, todayDate]
  );

  const totalTasks = countRes[0]?.count || 0;
  if (totalTasks < 1) {
    const error = new Error('At least 1 task is required to submit commitments');
    error.statusCode = 400;
    throw error;
  }

  // Lock draft tasks
  await query(
    `UPDATE employee_tasks 
     SET submitted_at = NOW() 
     WHERE employee_id = $1 AND task_date = $2 AND submitted_at IS NULL`,
    [employeeId, todayDate]
  );

  // Update attendance record
  await query(
    `UPDATE employee_attendance 
     SET commitments_submitted_at = NOW(), updated_at = NOW() 
     WHERE id = $1`,
    [attendance.id]
  );

  return {
    success: true,
    message: 'Commitments submitted successfully! Panel is now unlocked.',
    state: 'UNLOCKED'
  };
}

/**
 * POST Add Extra Task (during End-of-Day Review)
 * Saves task with task_type = 'EXTRA'
 */
async function addExtraTask({ reqUser, title, isCompleted = true }) {
  await ensureTasksTableExists();
  const employeeId = await resolveEmployeeId(reqUser);
  if (!employeeId) {
    const error = new Error('Employee profile not found');
    error.statusCode = 400;
    throw error;
  }

  if (!title || typeof title !== 'string' || !title.trim()) {
    const error = new Error('Task title is required');
    error.statusCode = 400;
    throw error;
  }

  const cleanTitle = title.trim();
  if (cleanTitle.length > 255) {
    const error = new Error('Task title cannot exceed 255 characters');
    error.statusCode = 400;
    throw error;
  }

  const todayDate = await getKolkataDateString();

  // Validate employee has checked in today
  const { rows: [attendance] } = await query(
    `SELECT id, check_in_time, check_out_time, commitments_submitted_at 
     FROM employee_attendance 
     WHERE employee_id = $1 AND attendance_date = $2`,
    [employeeId, todayDate]
  );

  if (!attendance || !attendance.check_in_time) {
    const error = new Error('Please mark attendance check-in before adding tasks');
    error.statusCode = 400;
    throw error;
  }

  // Check case-insensitive duplicate for today
  const { rows: existing } = await query(
    `SELECT id FROM employee_tasks 
     WHERE employee_id = $1 AND task_date = $2 AND LOWER(TRIM(title)) = LOWER($3)
     LIMIT 1`,
    [employeeId, todayDate, cleanTitle]
  );

  if (existing.length > 0) {
    const error = new Error('A task with this title has already been added for today');
    error.statusCode = 400;
    throw error;
  }

  const status = isCompleted ? 'completed' : 'pending';
  const completedAt = isCompleted ? new Date() : null;

  const { rows: [newTask] } = await query(
    `INSERT INTO employee_tasks (employee_id, task_date, title, status, completed_at, task_type, submitted_at, created_at)
     VALUES ($1, $2, $3, $4, $5, 'EXTRA', NOW(), NOW())
     RETURNING id, employee_id, task_date, title, status, completed_at, carried_from_date, carry_count, task_type, submitted_at, created_at`,
    [employeeId, todayDate, cleanTitle, status, completedAt]
  );

  return {
    success: true,
    message: 'Extra task added successfully',
    data: newTask
  };
}

/**
 * POST Check-Out
 * Body { completedTaskIds: [], extraTasks: [], verificationSessionId: "" }
 * Enforces mandatory face & building geofence verification before check-out is allowed.
 * Executes atomically in a transaction.
 */
async function executeCheckOut({ reqUser, completedTaskIds = [], extraTasks = [], verificationSessionId }) {
  await ensureTasksTableExists();
  const employeeId = await resolveEmployeeId(reqUser);
  if (!employeeId) {
    const error = new Error('Employee profile not found');
    error.statusCode = 400;
    throw error;
  }

  // 1. Mandatory Attendance Verification Validation (Face + Location Geofence)
  if (!verificationSessionId) {
    const error = new Error('Mandatory face and office location verification required before check-out.');
    error.statusCode = 403;
    error.code = 'VERIFICATION_REQUIRED';
    throw error;
  }

  const todayDate = await getKolkataDateString();
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // 2. Fetch and lock verification session
    const { rows: [session] } = await client.query(
      `SELECT id, employee_id, status, face_status, environment_status, matched_environment_code, expires_at, consumed_at 
       FROM attendance_verification_sessions 
       WHERE id = $1 FOR UPDATE`,
      [verificationSessionId]
    );

    if (!session) {
      await client.query('ROLLBACK');
      const error = new Error('Attendance verification session not found');
      error.statusCode = 404;
      throw error;
    }

    if (session.employee_id !== employeeId) {
      await client.query('ROLLBACK');
      const error = new Error('Unauthorized: Verification session does not belong to authenticated employee');
      error.statusCode = 403;
      throw error;
    }

    if (session.status !== 'PASSED' || session.face_status !== 'PASSED' || session.environment_status !== 'PASSED') {
      await client.query('ROLLBACK');
      const error = new Error(`Verification incomplete or failed (status: ${session.status}, face: ${session.face_status}, location: ${session.environment_status}). Check-out rejected.`);
      error.statusCode = 403;
      throw error;
    }

    if (session.consumed_at) {
      await client.query('ROLLBACK');
      const error = new Error('Verification session has already been consumed. Please perform verification again.');
      error.statusCode = 409;
      error.code = 'VERIFICATION_SESSION_ALREADY_USED';
      throw error;
    }

    if (new Date(session.expires_at) < new Date()) {
      await client.query('ROLLBACK');
      const error = new Error('Verification session has expired. Please perform verification again.');
      error.statusCode = 410;
      throw error;
    }

    // 3. Atomically consume the verification session
    const { rowCount } = await client.query(
      `UPDATE attendance_verification_sessions 
       SET status = 'PASSED', consumed_at = NOW(), updated_at = NOW() 
       WHERE id = $1 AND consumed_at IS NULL`,
      [session.id]
    );

    if (rowCount === 0) {
      await client.query('ROLLBACK');
      const error = new Error('Verification session has already been consumed.');
      error.statusCode = 409;
      error.code = 'VERIFICATION_SESSION_ALREADY_USED';
      throw error;
    }

    // 4. Fetch today's attendance record FOR UPDATE
    const { rows: [attendance] } = await client.query(
      `SELECT id, check_in_time, check_out_time, commitments_submitted_at 
       FROM employee_attendance 
       WHERE employee_id = $1 AND attendance_date = $2 FOR UPDATE`,
      [employeeId, todayDate]
    );

    if (!attendance || !attendance.check_in_time) {
      await client.query('ROLLBACK');
      const error = new Error('Cannot check out without checking in first');
      error.statusCode = 400;
      throw error;
    }

    if (!attendance.commitments_submitted_at) {
      await client.query('ROLLBACK');
      const error = new Error('Submit your commitments first before checking out');
      error.statusCode = 400;
      throw error;
    }

    const mutableCompletedIds = Array.isArray(completedTaskIds) ? [...completedTaskIds] : [];

    // 5. Insert any extra tasks passed in checkout body (if any)
    if (Array.isArray(extraTasks) && extraTasks.length > 0) {
      for (const xtra of extraTasks) {
        if (!xtra || !xtra.title || typeof xtra.title !== 'string') continue;
        const cleanXtra = xtra.title.trim();
        if (!cleanXtra) continue;

        const { rows: existingXtra } = await client.query(
          `SELECT id FROM employee_tasks WHERE employee_id = $1 AND task_date = $2 AND LOWER(TRIM(title)) = LOWER($3) LIMIT 1`,
          [employeeId, todayDate, cleanXtra]
        );

        if (existingXtra.length === 0) {
          const isDone = xtra.isCompleted !== false;
          const { rows: [insXtra] } = await client.query(
            `INSERT INTO employee_tasks (employee_id, task_date, title, status, completed_at, task_type, submitted_at, created_at)
             VALUES ($1, $2, $3, $4, $5, 'EXTRA', NOW(), NOW())
             RETURNING id`,
            [employeeId, todayDate, cleanXtra, isDone ? 'completed' : 'pending', isDone ? new Date() : null]
          );
          if (isDone && insXtra?.id && !mutableCompletedIds.includes(insXtra.id)) {
            mutableCompletedIds.push(insXtra.id);
          }
        }
      }
    }

    // 6. Update tasks marked as completed
    if (mutableCompletedIds.length > 0) {
      await client.query(
        `UPDATE employee_tasks 
         SET status = 'completed', completed_at = NOW() 
         WHERE employee_id = $1 AND task_date = $2 AND id = ANY($3::uuid[])`,
        [employeeId, todayDate, mutableCompletedIds]
      );
    }

    // Tasks NOT in completedIds ensure status = 'pending'
    if (mutableCompletedIds.length > 0) {
      await client.query(
        `UPDATE employee_tasks 
         SET status = 'pending', completed_at = NULL 
         WHERE employee_id = $1 AND task_date = $2 AND NOT (id = ANY($3::uuid[]))`,
        [employeeId, todayDate, mutableCompletedIds]
      );
    } else {
      await client.query(
        `UPDATE employee_tasks 
         SET status = 'pending', completed_at = NULL 
         WHERE employee_id = $1 AND task_date = $2`,
        [employeeId, todayDate]
      );
    }

    // 7. Update attendance check_out_time and link verification session
    const { rows: [updatedAttendance] } = await client.query(
      `UPDATE employee_attendance 
       SET check_out_time = NOW(), 
           check_out = NOW(), 
           verification_session_id = COALESCE(verification_session_id, $2),
           matched_environment_code = COALESCE(matched_environment_code, $3),
           updated_at = NOW() 
       WHERE id = $1
       RETURNING check_in_time, check_out_time`,
      [attendance.id, session.id, session.matched_environment_code || null]
    );

    // 8. Compute stats
    const { rows: stats } = await query(
      `SELECT 
         COUNT(CASE WHEN status = 'completed' THEN 1 END)::int AS completed_count,
         COUNT(CASE WHEN status = 'pending' THEN 1 END)::int AS pending_count,
         COUNT(CASE WHEN task_type = 'EXTRA' THEN 1 END)::int AS extra_count,
         COUNT(*)::int AS total_count
       FROM employee_tasks
       WHERE employee_id = $1 AND task_date = $2`,
      [employeeId, todayDate]
    );

    await client.query('COMMIT');

    const checkIn = new Date(updatedAttendance.check_in_time);
    const checkOut = new Date(updatedAttendance.check_out_time);
    const totalSeconds = Math.max(0, Math.floor((checkOut.getTime() - checkIn.getTime()) / 1000));

    return {
      success: true,
      message: 'Check-out completed successfully',
      state: 'CHECKED_OUT',
      summary: {
        completedCount: stats[0]?.completed_count || 0,
        pendingCount: stats[0]?.pending_count || 0,
        extraCount: stats[0]?.extra_count || 0,
        totalCount: stats[0]?.total_count || 0,
        totalWorkingHours: formatWorkingHours(totalSeconds),
        totalSeconds
      }
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error('[EXECUTE CHECK-OUT ERROR]', { message: err.message, stack: err.stack });
    throw err;
  } finally {
    client.release();
  }
}

/**
 * POST Cancel Check-Out
 * Allows employee to cancel an accidental check-out within a 10-minute (600s) window.
 * Reopens day back to UNLOCKED so the employee can resume working.
 */
async function cancelCheckOut({ reqUser }) {
  await ensureTasksTableExists();
  const employeeId = await resolveEmployeeId(reqUser);
  if (!employeeId) {
    const error = new Error('Employee profile not found');
    error.statusCode = 400;
    throw error;
  }

  const todayDate = await getKolkataDateString();

  const { rows: [attendance] } = await query(
    `SELECT id, check_in_time, check_out_time, commitments_submitted_at 
     FROM employee_attendance 
     WHERE employee_id = $1 AND attendance_date = $2`,
    [employeeId, todayDate]
  );

  if (!attendance || !attendance.check_out_time) {
    const error = new Error('No active check-out found for today to cancel');
    error.statusCode = 400;
    throw error;
  }

  const checkOutTime = new Date(attendance.check_out_time);
  const now = new Date();
  const diffSeconds = (now.getTime() - checkOutTime.getTime()) / 1000;
  const TEN_MINUTES_SEC = 10 * 60; // 600 seconds

  if (diffSeconds > TEN_MINUTES_SEC) {
    const error = new Error(
      'The 10-minute cancellation window has expired. You can no longer cancel today’s check-out. Please contact Super Admin if you need re-attendance.'
    );
    error.statusCode = 400;
    throw error;
  }

  // Clear check_out_time and check_out
  await query(
    `UPDATE employee_attendance 
     SET check_out_time = NULL, check_out = NULL, updated_at = NOW() 
     WHERE id = $1`,
    [attendance.id]
  );

  const statusInfo = await getDayStatus({ reqUser });

  return {
    success: true,
    message: 'Check-out cancelled successfully. Work resumed!',
    state: statusInfo.state,
    statusInfo
  };
}

module.exports = {
  ensureTasksTableExists,
  resolveEmployeeId,
  getKolkataDateString,
  evaluateAttendanceType,
  carryOverPendingTasks,
  getDayStatus,
  executeCheckIn,
  getTodayTasks,
  addDraftTask,
  addExtraTask,
  deleteDraftTask,
  submitCommitments,
  executeCheckOut,
  cancelCheckOut
};
