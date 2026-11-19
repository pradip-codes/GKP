const { query } = require('../../config/database');
const logger = require('../../config/logger');

/**
 * Get current Asia/Kolkata date string (YYYY-MM-DD)
 */
const getKolkataTodayDate = async () => {
  const { rows } = await query(`SELECT (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE::TEXT AS today_date`);
  return rows[0].today_date;
};

/**
 * Helper to validate date format (YYYY-MM-DD)
 */
const isValidDateFormat = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim());
};

/**
 * 1. Get Today's Admin Attendance Overview and List
 */
const getTodayAdminAttendance = async ({
  date,
  search,
  status,
  department,
  page = 1,
  limit = 20,
}) => {
  const targetDate = isValidDateFormat(date) ? date.trim() : await getKolkataTodayDate();

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  // 1. Overview summary metrics across active employee population for targetDate
  const summaryQuery = `
    SELECT
      COUNT(e.id)::INT AS total_employees,
      COUNT(att.id) FILTER (WHERE att.status = 'PRESENT' OR att.status = 'PART_TIME' OR att.status = 'FULL_TIME')::INT AS total_present,
      COUNT(att.id) FILTER (WHERE att.status = 'LATE')::INT AS total_late,
      COUNT(att.id) FILTER (WHERE att.status = 'HALF_DAY')::INT AS total_half_day,
      COUNT(att.id) FILTER (WHERE att.status = 'LEAVE')::INT AS total_leave,
      COUNT(att.id) FILTER (WHERE att.status = 'ABSENT')::INT AS total_absent,
      COUNT(att.id) FILTER (WHERE att.attendance_type = 'PART_TIME' OR att.status = 'PART_TIME')::INT AS total_part_time,
      COUNT(att.id) FILTER (WHERE att.attendance_type = 'FULL_TIME' OR (att.status = 'PRESENT' AND (att.attendance_type IS NULL OR att.attendance_type = 'FULL_TIME')))::INT AS total_full_time,
      COUNT(att.id) FILTER (WHERE att.is_re_attendance = TRUE)::INT AS total_re_attendance
    FROM employees e
    LEFT JOIN users u ON u.id = e.user_id
    LEFT JOIN employee_attendance att ON att.employee_id = e.id AND att.attendance_date = $1
    WHERE e.employee_status != 'TERMINATED'
      AND (u.role IS NULL OR u.role = 'EMPLOYEE')
      AND (e.designation NOT ILIKE '%HR%' AND e.designation NOT ILIKE '%Human Resource%')
  `;
  const { rows: [summaryRow] } = await query(summaryQuery, [targetDate]);

  const totalEmployees = summaryRow ? summaryRow.total_employees : 0;
  const totalPresent = summaryRow ? summaryRow.total_present : 0;
  const totalLate = summaryRow ? summaryRow.total_late : 0;
  const totalHalfDay = summaryRow ? summaryRow.total_half_day : 0;
  const totalLeave = summaryRow ? summaryRow.total_leave : 0;
  const totalAbsent = summaryRow ? summaryRow.total_absent : 0;
  const totalPartTime = summaryRow ? summaryRow.total_part_time : 0;
  const totalFullTime = summaryRow ? summaryRow.total_full_time : 0;
  const totalReAttendance = summaryRow ? summaryRow.total_re_attendance : 0;

  const totalMarked = totalPresent + totalLate + totalHalfDay + totalLeave + totalAbsent;
  const totalNotMarked = Math.max(0, totalEmployees - totalMarked);

  // 2. Build filtered employee attendance list for targetDate
  const params = [targetDate];
  let paramIdx = 2;

  let baseWhere = `
    WHERE e.employee_status != 'TERMINATED'
      AND (u.role IS NULL OR u.role = 'EMPLOYEE')
      AND (e.designation NOT ILIKE '%HR%' AND e.designation NOT ILIKE '%Human Resource%')
  `;

  if (search && search.trim()) {
    const searchPattern = `%${search.trim()}%`;
    baseWhere += ` AND (e.full_name ILIKE $${paramIdx} OR e.employee_id ILIKE $${paramIdx} OR e.email_id ILIKE $${paramIdx} OR e.mobile_number ILIKE $${paramIdx})`;
    params.push(searchPattern);
    paramIdx++;
  }

  if (department && department.trim() && department.toUpperCase() !== 'ALL') {
    baseWhere += ` AND e.department = $${paramIdx}`;
    params.push(department.trim());
    paramIdx++;
  }

  if (status && status.trim() && status.toUpperCase() !== 'ALL') {
    const normalizedStatus = status.trim().toUpperCase();
    if (normalizedStatus === 'NOT_MARKED') {
      baseWhere += ` AND att.id IS NULL`;
    } else if (normalizedStatus === 'PART_TIME') {
      baseWhere += ` AND (att.attendance_type = 'PART_TIME' OR att.status = 'PART_TIME')`;
    } else if (normalizedStatus === 'FULL_TIME') {
      baseWhere += ` AND (att.attendance_type = 'FULL_TIME' OR (att.status = 'PRESENT' AND (att.attendance_type IS NULL OR att.attendance_type = 'FULL_TIME')))`;
    } else {
      baseWhere += ` AND att.status = $${paramIdx}`;
      params.push(normalizedStatus);
      paramIdx++;
    }
  }

  // Count query for pagination
  const countQuery = `
    SELECT COUNT(e.id)::INT AS total
    FROM employees e
    LEFT JOIN users u ON u.id = e.user_id
    LEFT JOIN employee_attendance att ON att.employee_id = e.id AND att.attendance_date = $1
    ${baseWhere}
  `;
  const { rows: [countRow] } = await query(countQuery, params);
  const totalFiltered = countRow ? countRow.total : 0;

  // Records query
  const listParams = [...params, limitNum, offset];
  const recordsQuery = `
    SELECT
      e.id AS employee_id,
      e.employee_id AS employee_code,
      e.full_name,
      e.email_id,
      e.mobile_number,
      e.department,
      e.designation,
      e.work_location,
      att.id AS attendance_id,
      att.attendance_date,
      att.check_in_time,
      att.check_out_time,
      COALESCE(att.status, 'NOT_MARKED') AS attendance_status,
      att.attendance_type,
      att.is_re_attendance,
      att.re_attendance_granted_at,
      att.commitments_submitted_at,
      att.verification_status,
      att.verification_reference,
      att.source,
      att.matched_environment_code,
      att.liveness_status,
      att.face_status,
      att.environment_status,
      att.created_at AS marked_at,
      COALESCE((SELECT COUNT(*)::INT FROM employee_tasks et WHERE et.employee_id = e.id AND et.task_date = $1), 0) AS total_tasks,
      COALESCE((SELECT COUNT(*)::INT FROM employee_tasks et WHERE et.employee_id = e.id AND et.task_date = $1 AND et.status = 'completed'), 0) AS completed_tasks,
      COALESCE((SELECT COUNT(*)::INT FROM employee_tasks et WHERE et.employee_id = e.id AND et.task_date = $1 AND et.task_type = 'EXTRA'), 0) AS extra_tasks_count,
      COALESCE((SELECT COUNT(*)::INT FROM employee_tasks et WHERE et.employee_id = e.id AND et.task_date = $1 AND (et.carried_from_date IS NOT NULL OR et.carry_count > 0 OR et.task_type = 'CARRY_OVER')), 0) AS carry_forward_tasks_count
    FROM employees e
    LEFT JOIN users u ON u.id = e.user_id
    LEFT JOIN employee_attendance att ON att.employee_id = e.id AND att.attendance_date = $1
    ${baseWhere}
    ORDER BY e.employee_id ASC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;

  const { rows: records } = await query(recordsQuery, listParams);

  // Get list of distinct departments for filtering dropdown
  const { rows: deptRows } = await query(`
    SELECT DISTINCT department 
    FROM employees 
    WHERE department IS NOT NULL AND employee_status != 'TERMINATED' 
    ORDER BY department ASC
  `);

  return {
    date: targetDate,
    summary: {
      totalEmployees,
      totalPresent,
      totalLate,
      totalHalfDay,
      totalLeave,
      totalAbsent,
      totalNotMarked,
      totalPartTime,
      totalFullTime,
      totalReAttendance,
    },
    departments: deptRows.map(d => d.department),
    pagination: {
      totalRecords: totalFiltered,
      currentPage: pageNum,
      totalPages: Math.ceil(totalFiltered / limitNum) || 1,
      limit: limitNum,
    },
    records,
  };
};

/**
 * 2. Get Admin Attendance History with Pagination & Filters
 */
const getAdminAttendanceHistory = async ({
  startDate,
  endDate,
  search,
  status,
  department,
  employeeId,
  page = 1,
  limit = 20,
}) => {
  const kolkataToday = await getKolkataTodayDate();

  const validEndDate = isValidDateFormat(endDate) ? endDate.trim() : kolkataToday;
  let validStartDate = isValidDateFormat(startDate) ? startDate.trim() : null;

  if (!validStartDate) {
    // Default to 30 days prior to validEndDate
    const endD = new Date(validEndDate);
    endD.setDate(endD.getDate() - 30);
    validStartDate = endD.toISOString().split('T')[0];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const params = [validStartDate, validEndDate];
  let paramIdx = 3;

  let baseWhere = `
    WHERE att.attendance_date >= $1 AND att.attendance_date <= $2
      AND e.employee_status != 'TERMINATED'
      AND (u.role IS NULL OR u.role = 'EMPLOYEE')
      AND (e.designation NOT ILIKE '%HR%' AND e.designation NOT ILIKE '%Human Resource%')
  `;

  if (search && search.trim()) {
    const searchPattern = `%${search.trim()}%`;
    baseWhere += ` AND (e.full_name ILIKE $${paramIdx} OR e.employee_id ILIKE $${paramIdx} OR e.email_id ILIKE $${paramIdx} OR e.mobile_number ILIKE $${paramIdx})`;
    params.push(searchPattern);
    paramIdx++;
  }

  if (department && department.trim() && department.toUpperCase() !== 'ALL') {
    baseWhere += ` AND e.department = $${paramIdx}`;
    params.push(department.trim());
    paramIdx++;
  }

  if (status && status.trim() && status.toUpperCase() !== 'ALL') {
    baseWhere += ` AND att.status = $${paramIdx}`;
    params.push(status.trim().toUpperCase());
    paramIdx++;
  }

  if (employeeId && employeeId.trim()) {
    const isEmpUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(employeeId.trim());
    if (isEmpUuid) {
      baseWhere += ` AND (att.employee_id = $${paramIdx} OR e.employee_id = $${paramIdx} OR e.user_id = $${paramIdx})`;
    } else {
      baseWhere += ` AND (e.employee_id = $${paramIdx} OR e.mobile_number = $${paramIdx})`;
    }
    params.push(employeeId.trim());
    paramIdx++;
  }

  // Count query
  const countQuery = `
    SELECT COUNT(att.id)::INT AS total
    FROM employee_attendance att
    JOIN employees e ON e.id = att.employee_id
    LEFT JOIN users u ON u.id = e.user_id
    ${baseWhere}
  `;
  const { rows: [countRow] } = await query(countQuery, params);
  const totalFiltered = countRow ? countRow.total : 0;

  // History list query
  const listParams = [...params, limitNum, offset];
  const listQuery = `
    SELECT
      att.id AS attendance_id,
      att.employee_id,
      e.employee_id AS employee_code,
      e.full_name,
      e.email_id,
      e.mobile_number,
      e.department,
      e.designation,
      e.work_location,
      att.attendance_date,
      att.check_in_time,
      att.check_out_time,
      att.status AS attendance_status,
      att.verification_status,
      att.verification_reference,
      att.source,
      att.matched_environment_code,
      att.liveness_status,
      att.face_status,
      att.environment_status,
      att.created_at,
      att.updated_at,
      COALESCE((SELECT COUNT(*)::INT FROM employee_tasks et WHERE et.employee_id = att.employee_id AND et.task_date = att.attendance_date), 0) AS total_tasks,
      COALESCE((SELECT COUNT(*)::INT FROM employee_tasks et WHERE et.employee_id = att.employee_id AND et.task_date = att.attendance_date AND et.status = 'completed'), 0) AS completed_tasks,
      COALESCE((SELECT COUNT(*)::INT FROM employee_tasks et WHERE et.employee_id = att.employee_id AND et.task_date = att.attendance_date AND et.task_type = 'EXTRA'), 0) AS extra_tasks_count,
      COALESCE((SELECT COUNT(*)::INT FROM employee_tasks et WHERE et.employee_id = att.employee_id AND et.task_date = att.attendance_date AND (et.carried_from_date IS NOT NULL OR et.carry_count > 0 OR et.task_type = 'CARRY_OVER')), 0) AS carry_forward_tasks_count
    FROM employee_attendance att
    JOIN employees e ON e.id = att.employee_id
    LEFT JOIN users u ON u.id = e.user_id
    ${baseWhere}
    ORDER BY att.attendance_date DESC, att.check_in_time DESC NULLS LAST
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;

  const { rows: records } = await query(listQuery, listParams);

  // Aggregated summary for history date range
  const summaryQuery = `
    SELECT
      COUNT(att.id)::INT AS total_records,
      COUNT(att.id) FILTER (WHERE att.status = 'PRESENT')::INT AS total_present,
      COUNT(att.id) FILTER (WHERE att.status = 'LATE')::INT AS total_late,
      COUNT(att.id) FILTER (WHERE att.status = 'HALF_DAY')::INT AS total_half_day,
      COUNT(att.id) FILTER (WHERE att.status = 'LEAVE')::INT AS total_leave,
      COUNT(att.id) FILTER (WHERE att.status = 'ABSENT')::INT AS total_absent,
      COALESCE(SUM(EXTRACT(EPOCH FROM (att.check_out_time - att.check_in_time))), 0)::BIGINT AS total_working_seconds
    FROM employee_attendance att
    JOIN employees e ON e.id = att.employee_id
    LEFT JOIN users u ON u.id = e.user_id
    ${baseWhere}
  `;
  const { rows: [rangeSummaryRow] } = await query(summaryQuery, params);

  const rangeSummary = rangeSummaryRow || {};
  const totalSeconds = Number(rangeSummary.total_working_seconds || 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return {
    startDate: validStartDate,
    endDate: validEndDate,
    summary: {
      totalRecords: rangeSummary.total_records || 0,
      totalPresent: rangeSummary.total_present || 0,
      totalLate: rangeSummary.total_late || 0,
      totalHalfDay: rangeSummary.total_half_day || 0,
      totalLeave: rangeSummary.total_leave || 0,
      totalAbsent: rangeSummary.total_absent || 0,
      totalWorkingHoursFormatted: `${hours}h ${minutes}m`,
    },
    pagination: {
      totalRecords: totalFiltered,
      currentPage: pageNum,
      totalPages: Math.ceil(totalFiltered / limitNum) || 1,
      limit: limitNum,
    },
    records,
  };
};

/**
 * 3. Get Single Employee Attendance Details, Daily Work Report & Monthly Breakdown
 */
const getEmployeeAttendanceDetails = async (employeeId, month, year, date) => {
  const kolkataToday = await getKolkataTodayDate();

  const targetDate = isValidDateFormat(date) ? date.trim() : kolkataToday;
  const dateParts = targetDate.split('-');

  const targetMonth = month ? parseInt(month, 10) : parseInt(dateParts[1], 10);
  const targetYear = year ? parseInt(year, 10) : parseInt(dateParts[0], 10);

  const cleanEmpId = String(employeeId || '').trim();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanEmpId);

  // Fetch employee details
  let empQuery;
  let empParams;
  if (isUuid) {
    empQuery = `
      SELECT id, employee_id, full_name, email_id, mobile_number, designation, department, work_location, joining_date, employee_status
      FROM employees 
      WHERE (id = $1 OR user_id = $1 OR candidate_id = $1) AND employee_status != 'TERMINATED'
      LIMIT 1
    `;
    empParams = [cleanEmpId];
  } else {
    empQuery = `
      SELECT id, employee_id, full_name, email_id, mobile_number, designation, department, work_location, joining_date, employee_status
      FROM employees 
      WHERE (employee_id = $1 OR mobile_number = $1) AND employee_status != 'TERMINATED'
      LIMIT 1
    `;
    empParams = [cleanEmpId];
  }

  const { rows: [emp] } = await query(empQuery, empParams);

  if (!emp) {
    const error = new Error('Employee not found or terminated');
    error.statusCode = 404;
    throw error;
  }

  // 1. Fetch Specific Daily Attendance Record for targetDate
  const { rows: [dailyAtt] } = await query(
    `SELECT
       id AS attendance_id,
       attendance_date,
       check_in_time,
       check_out_time,
       status AS attendance_status,
       attendance_type,
       is_re_attendance,
       verification_status,
       verification_reference,
       source,
       matched_environment_code,
       liveness_status,
       face_status,
       environment_status,
       commitments_submitted_at,
       created_at,
       updated_at
     FROM employee_attendance
     WHERE employee_id = $1 AND attendance_date = $2
     LIMIT 1`,
    [emp.id, targetDate]
  );

  // 2. Fetch Tasks for targetDate
  const { rows: dailyTasks } = await query(
    `SELECT id, title, task_type, status, task_date, carried_from_date, carry_count, submitted_at, created_at
     FROM employee_tasks
     WHERE employee_id = $1 AND task_date = $2
     ORDER BY created_at ASC`,
    [emp.id, targetDate]
  );

  // Categorize tasks into Morning Commitments, Extra Tasks, and Carry-Forward Tasks
  const morningCommitments = [];
  const extraTasks = [];
  const carryForwardTasks = [];

  (dailyTasks || []).forEach(t => {
    const isCarry = Boolean(t.carried_from_date || (t.carry_count && Number(t.carry_count) > 0) || (t.task_type && String(t.task_type).toUpperCase() === 'CARRY_OVER'));
    const isExtra = Boolean(t.task_type && String(t.task_type).toUpperCase() === 'EXTRA');
    const taskStatus = (t.status && String(t.status).toLowerCase() === 'completed') ? 'COMPLETED' : 'PENDING';
    const taskType = isExtra ? 'EXTRA' : (isCarry ? 'CARRY_OVER' : 'STANDARD');
    const category = isExtra ? 'EXTRA' : (isCarry ? 'CARRY_FORWARD' : 'MORNING_COMMITMENT');

    const formattedTask = {
      id: t.id,
      title: t.title,
      task_type: taskType,
      category,
      status: taskStatus,
      carried_from_date: t.carried_from_date || null,
      carry_count: Number(t.carry_count) || 0,
      submitted_at: t.submitted_at,
      created_at: t.created_at,
    };

    if (isExtra) {
      extraTasks.push(formattedTask);
    } else if (isCarry) {
      carryForwardTasks.push(formattedTask);
    } else {
      morningCommitments.push(formattedTask);
    }
  });

  const totalTasksCount = dailyTasks ? dailyTasks.length : 0;
  const completedTasksCount = (dailyTasks || []).filter(t => t.status && String(t.status).toLowerCase() === 'completed').length;
  const pendingTasksCount = Math.max(0, totalTasksCount - completedTasksCount);
  const completionPercentage = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  // Working duration
  let workingDurationFormatted = '-';
  let durationMinutes = null;
  if (dailyAtt?.check_in_time) {
    const cin = new Date(dailyAtt.check_in_time);
    const cout = dailyAtt.check_out_time ? new Date(dailyAtt.check_out_time) : null;
    if (cout && cout >= cin) {
      const diffMins = Math.round((cout - cin) / 60000);
      durationMinutes = diffMins;
      const hrs = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      workingDurationFormatted = `${hrs}h ${mins < 10 ? '0' : ''}${mins}m`;
    } else if (!cout) {
      workingDurationFormatted = 'In Progress';
    }
  }

  // End-of-Day submission status
  let endOfDaySubmissionStatus = 'NOT_MARKED';
  if (dailyAtt) {
    if (dailyAtt.check_out_time) {
      endOfDaySubmissionStatus = 'COMPLETED';
    } else if (dailyAtt.check_in_time) {
      endOfDaySubmissionStatus = 'PENDING'; // Active session / incomplete checkout
    }
  }

  // Face & location verification status
  const faceVerificationStatus = dailyAtt?.face_status 
    || (dailyAtt?.verification_status === 'VERIFIED' ? 'PASSED' : (dailyAtt?.verification_status || '-'));

  const locationVerificationStatus = dailyAtt?.environment_status
    || (dailyAtt?.matched_environment_code ? `MATCHED (${dailyAtt.matched_environment_code})` : (dailyAtt?.verification_status === 'VERIFIED' ? 'PASSED' : '-'));

  const dailyReport = {
    date: targetDate,
    attendance_date: targetDate,
    employee_id: emp.id,
    employee_code: emp.employee_id,
    employee_name: emp.full_name,
    department: emp.department,
    designation: emp.designation,
    work_location: emp.work_location,
    check_in_time: dailyAtt?.check_in_time || null,
    check_out_time: dailyAtt?.check_out_time || null,
    total_working_duration: workingDurationFormatted,
    duration_minutes: durationMinutes,
    attendance_status: dailyAtt?.attendance_status || (dailyAtt ? 'PRESENT' : 'NOT_MARKED'),
    attendance_type: dailyAtt?.attendance_type || 'FULL_TIME',
    is_re_attendance: Boolean(dailyAtt?.is_re_attendance),
    total_tasks: totalTasksCount,
    completed_tasks: completedTasksCount,
    pending_tasks: pendingTasksCount,
    extra_tasks: extraTasks.length,
    carry_forward_tasks: carryForwardTasks.length,
    task_completion_percentage: completionPercentage,
    end_of_day_submission_status: endOfDaySubmissionStatus,
    face_verification_status: faceVerificationStatus,
    location_verification_status: locationVerificationStatus,
    office_environment: dailyAtt?.matched_environment_code || '-',
    source: dailyAtt?.source || 'WEB',
    verification_reference: dailyAtt?.verification_reference || null,
    tasks: {
      morning_commitments: morningCommitments,
      extra_tasks: extraTasks,
      carry_forward_tasks: carryForwardTasks,
      all_tasks: [...morningCommitments, ...extraTasks, ...carryForwardTasks]
    }
  };

  // 3. Monthly records
  const { rows: monthlyRecords } = await query(
    `SELECT
       id AS attendance_id,
       attendance_date,
       check_in_time,
       check_out_time,
       status AS attendance_status,
       attendance_type,
       is_re_attendance,
       verification_status,
       verification_reference,
       source,
       matched_environment_code,
       liveness_status,
       face_status,
       environment_status,
       created_at
     FROM employee_attendance
     WHERE employee_id = $1
       AND EXTRACT(MONTH FROM attendance_date) = $2
       AND EXTRACT(YEAR FROM attendance_date) = $3
     ORDER BY attendance_date DESC`,
    [emp.id, targetMonth, targetYear]
  );

  // 4. Monthly summary
  const { rows: [monthlySummaryRow] } = await query(
    `SELECT
       COUNT(*)::INT AS total_marked,
       COUNT(*) FILTER (WHERE status = 'PRESENT' OR status = 'PART_TIME' OR status = 'FULL_TIME')::INT AS total_present,
       COUNT(*) FILTER (WHERE status = 'LATE')::INT AS total_late,
       COUNT(*) FILTER (WHERE status = 'HALF_DAY')::INT AS total_half_day,
       COUNT(*) FILTER (WHERE status = 'LEAVE')::INT AS total_leave,
       COUNT(*) FILTER (WHERE status = 'ABSENT')::INT AS total_absent,
       COALESCE(SUM(EXTRACT(EPOCH FROM (check_out_time - check_in_time))), 0)::BIGINT AS total_working_seconds
     FROM employee_attendance
     WHERE employee_id = $1
       AND EXTRACT(MONTH FROM attendance_date) = $2
       AND EXTRACT(YEAR FROM attendance_date) = $3`,
    [emp.id, targetMonth, targetYear]
  );

  const summary = monthlySummaryRow || {};
  const totalSeconds = Number(summary.total_working_seconds || 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  // 5. Monthly tasks
  const { rows: taskRecords } = await query(
    `SELECT id, title, task_type, status, task_date, carried_from_date, carry_count, submitted_at, created_at
     FROM employee_tasks
     WHERE employee_id = $1
       AND EXTRACT(MONTH FROM task_date) = $2
       AND EXTRACT(YEAR FROM task_date) = $3
     ORDER BY task_date DESC, created_at ASC`,
    [emp.id, targetMonth, targetYear]
  );

  return {
    employee: emp,
    date: targetDate,
    selected_date: targetDate,
    daily_report: dailyReport,
    month: targetMonth,
    year: targetYear,
    summary: {
      totalMarkedDays: summary.total_marked || 0,
      totalPresent: summary.total_present || 0,
      totalLate: summary.total_late || 0,
      totalHalfDay: summary.total_half_day || 0,
      totalLeave: summary.total_leave || 0,
      totalAbsent: summary.total_absent || 0,
      totalWorkingHoursFormatted: `${hours}h ${minutes}m`,
    },
    records: monthlyRecords,
    tasks: taskRecords,
  };
};

/**
 * 4. Super Admin: Grant Re-Attendance for an employee on a specified date
 * Modes:
 * - 'RESET_CHECKOUT': Reopens the work day by clearing check_out_time (best for mistaken checkout past 10m).
 * - 'FULL_RESET': Clears check_in, check_out, and commitments so employee can check in fresh.
 */
const grantReAttendance = async ({ employeeId, date, mode = 'RESET_CHECKOUT', reason = '', adminUser }) => {
  if (!employeeId) {
    const error = new Error('employeeId is required to grant re-attendance');
    error.statusCode = 400;
    throw error;
  }

  const targetDate = isValidDateFormat(date) ? date.trim() : await getKolkataTodayDate();

  const { rows: [emp] } = await query(
    `SELECT id, full_name, employee_id FROM employees WHERE id = $1 LIMIT 1`,
    [employeeId]
  );

  if (!emp) {
    const error = new Error('Employee not found');
    error.statusCode = 404;
    throw error;
  }

  const { rows: [attendance] } = await query(
    `SELECT * FROM employee_attendance WHERE employee_id = $1 AND attendance_date = $2 LIMIT 1`,
    [employeeId, targetDate]
  );

  if (!attendance) {
    const error = new Error(`No attendance record found for ${emp.full_name} on ${targetDate}`);
    error.statusCode = 404;
    throw error;
  }

  if (mode === 'FULL_RESET') {
    // Full Reset: Clear check-in, check-out, commitments so employee starts fresh
    await query(
      `UPDATE employee_attendance 
       SET check_in_time = NULL,
           check_in = NULL,
           check_out_time = NULL,
           check_out = NULL,
           commitments_submitted_at = NULL,
           status = 'NOT_MARKED',
           is_re_attendance = TRUE,
           re_attendance_granted_at = NOW(),
           re_attendance_granted_by = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [adminUser?.id || null, attendance.id]
    );

    // Reopen draft tasks so they can be modified/resubmitted
    await query(
      `UPDATE employee_tasks 
       SET submitted_at = NULL 
       WHERE employee_id = $1 AND task_date = $2`,
      [employeeId, targetDate]
    );
  } else {
    // Default: RESET_CHECKOUT (reopen work day for mistaken check-out)
    await query(
      `UPDATE employee_attendance 
       SET check_out_time = NULL,
           check_out = NULL,
           is_re_attendance = TRUE,
           re_attendance_granted_at = NOW(),
           re_attendance_granted_by = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [adminUser?.id || null, attendance.id]
    );
  }

  logger.info(`[RE-ATTENDANCE] Super Admin ${adminUser?.id || 'ADMIN'} granted ${mode} re-attendance for ${emp.full_name} (${emp.employee_id}) on ${targetDate}`);

  return {
    success: true,
    message: mode === 'FULL_RESET'
      ? `Full re-attendance granted for ${emp.full_name}. Fresh check-in unlocked.`
      : `Check-out cleared for ${emp.full_name}. Work day reopened.`,
    mode,
    employeeId,
    employeeName: emp.full_name,
    date: targetDate
  };
};

/**
 * 5. Super Admin / Admin: Mark Attendance Manually for an employee record
 */
const markManualAttendance = async ({
  employeeId,
  date,
  status = 'PRESENT',
  attendanceType = 'FULL_TIME',
  checkInTime,
  checkOutTime,
  remarks,
  adminUser
}) => {
  if (!employeeId) {
    const error = new Error('employeeId is required to mark manual attendance');
    error.statusCode = 400;
    throw error;
  }

  const targetDate = isValidDateFormat(date) ? date.trim() : await getKolkataTodayDate();

  const { rows: [emp] } = await query(
    `SELECT id, full_name, employee_id AS employee_code FROM employees WHERE (id::text = $1 OR employee_id = $1) AND employee_status != 'TERMINATED' LIMIT 1`,
    [employeeId]
  );

  if (!emp) {
    const error = new Error('Target employee record not found or terminated');
    error.statusCode = 404;
    throw error;
  }

  const normalizedStatus = (status || 'PRESENT').toUpperCase();
  const normalizedType = (attendanceType || 'FULL_TIME').toUpperCase();

  // Compute check_in and check_out timestamps
  let inTimeSql = `NOW()`;
  let outTimeSql = `NULL`;
  const queryParams = [emp.id, targetDate, normalizedStatus, normalizedType];
  let pIdx = 5;

  if (checkInTime && String(checkInTime).trim()) {
    const cleanIn = String(checkInTime).trim();
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(cleanIn)) {
      inTimeSql = `($${pIdx}::text)::TIMESTAMPTZ`;
      queryParams.push(`${targetDate} ${cleanIn}:00+05:30`);
      pIdx++;
    } else {
      inTimeSql = `$${pIdx}::TIMESTAMPTZ`;
      queryParams.push(cleanIn);
      pIdx++;
    }
  }

  if (checkOutTime && String(checkOutTime).trim()) {
    const cleanOut = String(checkOutTime).trim();
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(cleanOut)) {
      outTimeSql = `($${pIdx}::text)::TIMESTAMPTZ`;
      queryParams.push(`${targetDate} ${cleanOut}:00+05:30`);
      pIdx++;
    } else {
      outTimeSql = `$${pIdx}::TIMESTAMPTZ`;
      queryParams.push(cleanOut);
      pIdx++;
    }
  }

  const noteText = remarks ? String(remarks).trim() : 'Manual attendance marked by Super Admin';

  const upsertQuery = `
    INSERT INTO employee_attendance (
      employee_id,
      attendance_date,
      check_in_time,
      check_in,
      check_out_time,
      check_out,
      status,
      attendance_type,
      verification_status,
      verification_reference,
      source,
      liveness_status,
      face_status,
      environment_status,
      matched_environment_code,
      created_at,
      updated_at
    )
    VALUES (
      $1,
      $2,
      ${inTimeSql},
      ${inTimeSql},
      ${outTimeSql},
      ${outTimeSql},
      $3,
      $4,
      'VERIFIED',
      'MANUAL-SUPERADMIN',
      'SUPER_ADMIN_MANUAL',
      'PASSED',
      'PASSED',
      'PASSED',
      'MANUAL_OVERRIDE',
      NOW(),
      NOW()
    )
    ON CONFLICT (employee_id, attendance_date) DO UPDATE SET
      check_in_time = COALESCE(${inTimeSql}, employee_attendance.check_in_time, NOW()),
      check_in = COALESCE(${inTimeSql}, employee_attendance.check_in, NOW()),
      check_out_time = CASE WHEN ${outTimeSql} IS NOT NULL THEN ${outTimeSql} ELSE employee_attendance.check_out_time END,
      check_out = CASE WHEN ${outTimeSql} IS NOT NULL THEN ${outTimeSql} ELSE employee_attendance.check_out END,
      status = $3,
      attendance_type = $4,
      verification_status = 'VERIFIED',
      source = 'SUPER_ADMIN_MANUAL',
      updated_at = NOW()
    RETURNING *;
  `;

  const { rows: [record] } = await query(upsertQuery, queryParams);

  const { logAction } = require('../admin/audit.service');
  await logAction(adminUser, 'ATTENDANCE_MANUAL_MARK', emp.id, {
    date: targetDate,
    status: normalizedStatus,
    attendance_type: normalizedType,
    check_in_time: checkInTime || 'NOW',
    check_out_time: checkOutTime || null,
    remarks: noteText,
    marked_by_admin: adminUser?.id || null
  });

  logger.info(`[MANUAL ATTENDANCE] Admin ${adminUser?.id || 'ADMIN'} manually marked attendance for ${emp.full_name} (${emp.employee_code}) on ${targetDate} as ${normalizedStatus}`);

  return {
    success: true,
    message: `Manual attendance marked successfully for ${emp.full_name} (${normalizedStatus})`,
    data: record
  };
};

module.exports = {
  getKolkataTodayDate,
  getTodayAdminAttendance,
  getAdminAttendanceHistory,
  getEmployeeAttendanceDetails,
  grantReAttendance,
  markManualAttendance,
};
