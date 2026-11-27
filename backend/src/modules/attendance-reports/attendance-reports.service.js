const { query } = require('../../config/database');
const logger = require('../../config/logger');
const security = require('../auth/security.service');
const ExcelJS = require('exceljs');

/**
 * Get current Asia/Kolkata date string (YYYY-MM-DD)
 */
const getKolkataTodayDate = async () => {
  const { rows } = await query(`SELECT (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE::TEXT AS today_date`);
  return rows[0].today_date;
};

/**
 * Helper to validate YYYY-MM-DD date format
 */
const isValidDateFormat = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim());
};

/**
 * Format minutes into display string e.g. "8h 32m"
 */
const formatDurationDisplay = (durationMinutes) => {
  if (durationMinutes === null || durationMinutes === undefined || isNaN(durationMinutes) || durationMinutes < 0) {
    return null;
  }
  const mins = parseInt(durationMinutes, 10);
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs}h ${remMins < 10 ? '0' : ''}${remMins}m`;
};

/**
 * Sanitize text fields against CSV formula injection
 */
const sanitizeCsvField = (val) => {
  if (typeof val !== 'string') return val;
  const trimmed = val.trim();
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    return `'${val}`;
  }
  return val;
};

/**
 * Format ISO time into Asia/Kolkata time string HH:mm:ss
 */
const formatKolkataTime = (isoString) => {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (e) {
    return '-';
  }
};

/**
 * 1. Get Attendance Reports (Paginated with Aggregations)
 */
const getAttendanceReports = async ({
  startDate,
  endDate,
  employeeId,
  department,
  status,
  source,
  search,
  sortBy = 'attendance_date',
  sortOrder = 'DESC',
  page = 1,
  limit = 25,
}) => {
  const kolkataToday = await getKolkataTodayDate();
  const validEndDate = isValidDateFormat(endDate) ? endDate.trim() : kolkataToday;
  let validStartDate = isValidDateFormat(startDate) ? startDate.trim() : null;

  if (!validStartDate) {
    const endD = new Date(validEndDate);
    endD.setDate(endD.getDate() - 30);
    validStartDate = endD.toISOString().split('T')[0];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
  const offset = (pageNum - 1) * limitNum;

  // Build parameterized WHERE conditions
  const params = [validStartDate, validEndDate];
  let paramIdx = 3;

  let baseWhere = `
    WHERE att.attendance_date >= $1 AND att.attendance_date <= $2
      AND e.employee_status != 'TERMINATED'
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
    } else {
      baseWhere += ` AND att.status = $${paramIdx}`;
      params.push(normalizedStatus);
      paramIdx++;
    }
  }

  if (source && source.trim() && source.toUpperCase() !== 'ALL') {
    baseWhere += ` AND att.source = $${paramIdx}`;
    params.push(source.trim().toUpperCase());
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

  // Count total filtered records
  const countQuery = `
    SELECT COUNT(att.id)::INT AS total
    FROM employee_attendance att
    JOIN employees e ON e.id = att.employee_id
    LEFT JOIN users u ON u.id = e.user_id
    ${baseWhere}
  `;
  const { rows: [countRow] } = await query(countQuery, params);
  const totalFiltered = countRow ? countRow.total : 0;

  // Validate sort parameters
  const allowedSortFields = {
    attendance_date: 'att.attendance_date',
    check_in_time: 'att.check_in_time',
    check_out_time: 'att.check_out_time',
    status: 'att.status',
    source: 'att.source',
    full_name: 'e.full_name'
  };
  const sortColumn = allowedSortFields[sortBy] || 'att.attendance_date';
  const sortDirection = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  // Fetch paginated report records
  const listParams = [...params, limitNum, offset];
  const listQuery = `
    SELECT
      att.id AS attendance_id,
      att.attendance_date::TEXT AS attendance_date,
      e.id AS employee_uuid,
      e.employee_id AS employee_code,
      e.full_name AS employee_name,
      e.email_id,
      e.mobile_number,
      e.department,
      e.designation,
      e.work_location,
      att.check_in_time,
      att.check_out_time,
      CASE 
        WHEN att.check_in_time IS NOT NULL AND att.check_out_time IS NOT NULL AND att.check_out_time >= att.check_in_time
        THEN ROUND(EXTRACT(EPOCH FROM (att.check_out_time - att.check_in_time)) / 60)::INT
        ELSE NULL 
      END AS duration_minutes,
      att.status,
      att.attendance_type,
      att.is_re_attendance,
      att.source,
      att.verification_status,
      att.verification_reference,
      att.matched_environment_code,
      att.liveness_status,
      att.face_status,
      att.environment_status,
      att.created_at,
      COALESCE((SELECT COUNT(*)::INT FROM employee_tasks et WHERE et.employee_id = att.employee_id AND et.task_date = att.attendance_date), 0) AS total_tasks,
      COALESCE((SELECT COUNT(*)::INT FROM employee_tasks et WHERE et.employee_id = att.employee_id AND et.task_date = att.attendance_date AND et.status = 'completed'), 0) AS completed_tasks,
      COALESCE((SELECT COUNT(*)::INT FROM employee_tasks et WHERE et.employee_id = att.employee_id AND et.task_date = att.attendance_date AND et.task_type = 'EXTRA'), 0) AS extra_tasks_count,
      COALESCE((SELECT COUNT(*)::INT FROM employee_tasks et WHERE et.employee_id = att.employee_id AND et.task_date = att.attendance_date AND (et.carried_from_date IS NOT NULL OR et.carry_count > 0 OR et.task_type = 'CARRY_OVER')), 0) AS carry_forward_tasks_count
    FROM employee_attendance att
    JOIN employees e ON e.id = att.employee_id
    LEFT JOIN users u ON u.id = e.user_id
    ${baseWhere}
    ORDER BY ${sortColumn} ${sortDirection}, att.check_in_time DESC NULLS LAST
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;

  const { rows: rawRecords } = await query(listQuery, listParams);

  const data = rawRecords.map(r => {
    const totalTasks = r.total_tasks || 0;
    const completedTasks = r.completed_tasks || 0;
    const pendingTasks = Math.max(0, totalTasks - completedTasks);
    const extraTasks = r.extra_tasks_count || 0;
    const carryForwardTasks = r.carry_forward_tasks_count || 0;
    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const endOfDayStatus = r.check_out_time ? 'COMPLETED' : (r.check_in_time ? 'PENDING' : 'NOT_MARKED');
    const faceVerificationStatus = r.face_status || (r.verification_status === 'VERIFIED' ? 'PASSED' : (r.verification_status || '-'));
    const locationVerificationStatus = r.environment_status || (r.matched_environment_code ? `MATCHED (${r.matched_environment_code})` : (r.verification_status === 'VERIFIED' ? 'PASSED' : '-'));

    return {
      attendance_id: r.attendance_id,
      date: r.attendance_date,
      attendance_date: r.attendance_date,
      employee_id: r.employee_uuid,
      employee_name: r.employee_name,
      employee_code: r.employee_code,
      department: r.department,
      designation: r.designation,
      work_location: r.work_location,
      check_in_time: r.check_in_time,
      check_out_time: r.check_out_time,
      duration_minutes: r.duration_minutes,
      duration_display: formatDurationDisplay(r.duration_minutes) || (r.check_in_time && !r.check_out_time ? 'In Progress' : '-'),
      status: r.status,
      attendance_status: r.status,
      attendance_type: r.attendance_type || 'FULL_TIME',
      is_re_attendance: Boolean(r.is_re_attendance),
      source: r.source,
      verification_status: r.verification_status,
      verification_reference: r.verification_reference,
      environment_code: r.matched_environment_code,
      matched_environment_code: r.matched_environment_code,
      face_status: r.face_status,
      environment_status: r.environment_status,
      liveness_status: r.liveness_status,
      total_tasks: totalTasks,
      completed_tasks: completedTasks,
      pending_tasks: pendingTasks,
      extra_tasks: extraTasks,
      extra_tasks_count: extraTasks,
      carry_forward_tasks: carryForwardTasks,
      carry_forward_tasks_count: carryForwardTasks,
      task_completion_percentage: completionPercentage,
      end_of_day_submission_status: endOfDayStatus,
      face_verification_status: faceVerificationStatus,
      location_verification_status: locationVerificationStatus,
    };
  });

  // Summary aggregated stats for the selected date range and filters
  const summaryQuery = `
    SELECT
      COUNT(att.id)::INT AS total_records,
      COUNT(att.id) FILTER (WHERE att.status = 'PRESENT')::INT AS present_count,
      COUNT(att.id) FILTER (WHERE att.status = 'LATE')::INT AS late_count,
      COUNT(att.id) FILTER (WHERE att.status = 'HALF_DAY')::INT AS half_day_count,
      COUNT(att.id) FILTER (WHERE att.status = 'LEAVE')::INT AS leave_count,
      COUNT(att.id) FILTER (WHERE att.status = 'ABSENT')::INT AS absent_count,
      COALESCE(SUM(
        CASE WHEN att.check_in_time IS NOT NULL AND att.check_out_time IS NOT NULL AND att.check_out_time >= att.check_in_time
        THEN EXTRACT(EPOCH FROM (att.check_out_time - att.check_in_time))
        ELSE 0 END
      ), 0)::BIGINT AS total_working_seconds
    FROM employee_attendance att
    JOIN employees e ON e.id = att.employee_id
    LEFT JOIN users u ON u.id = e.user_id
    ${baseWhere}
  `;
  const { rows: [summaryRow] } = await query(summaryQuery, params);

  const totalSeconds = Number(summaryRow?.total_working_seconds || 0);
  const totalHours = Math.floor(totalSeconds / 3600);
  const totalMins = Math.floor((totalSeconds % 3600) / 60);

  // Fetch departments list for filtering dropdown
  const { rows: deptRows } = await query(`
    SELECT DISTINCT department 
    FROM employees 
    WHERE department IS NOT NULL AND employee_status != 'TERMINATED' 
    ORDER BY department ASC
  `);

  return {
    startDate: validStartDate,
    endDate: validEndDate,
    summary: {
      total_records: summaryRow?.total_records || 0,
      present_count: summaryRow?.present_count || 0,
      late_count: summaryRow?.late_count || 0,
      half_day_count: summaryRow?.half_day_count || 0,
      leave_count: summaryRow?.leave_count || 0,
      absent_count: summaryRow?.absent_count || 0,
      total_working_duration: `${totalHours}h ${totalMins}m`
    },
    departments: deptRows.map(d => d.department),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: totalFiltered,
      total_pages: Math.ceil(totalFiltered / limitNum) || 1,
    },
    data,
  };
};

/**
 * 2. Export Attendance Reports (CSV or XLSX format)
 */
const exportAttendanceReports = async ({
  format = 'csv',
  startDate,
  endDate,
  employeeId,
  department,
  status,
  source,
  search,
  reqUser,
  req,
}) => {
  const kolkataToday = await getKolkataTodayDate();
  const validEndDate = isValidDateFormat(endDate) ? endDate.trim() : kolkataToday;
  let validStartDate = isValidDateFormat(startDate) ? startDate.trim() : null;

  if (!validStartDate) {
    const endD = new Date(validEndDate);
    endD.setDate(endD.getDate() - 30);
    validStartDate = endD.toISOString().split('T')[0];
  }

  // Build parameterized WHERE conditions
  const params = [validStartDate, validEndDate];
  let paramIdx = 3;

  let baseWhere = `
    WHERE att.attendance_date >= $1 AND att.attendance_date <= $2
      AND e.employee_status != 'TERMINATED'
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
    } else {
      baseWhere += ` AND att.status = $${paramIdx}`;
      params.push(normalizedStatus);
      paramIdx++;
    }
  }

  if (source && source.trim() && source.toUpperCase() !== 'ALL') {
    baseWhere += ` AND att.source = $${paramIdx}`;
    params.push(source.trim().toUpperCase());
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

  // Fetch all matching attendance records up to 10,000 for safe export
  const exportQuery = `
    SELECT
      att.id AS attendance_id,
      att.employee_id,
      att.attendance_date::TEXT AS attendance_date,
      e.full_name AS employee_name,
      e.employee_id AS employee_code,
      e.department,
      e.designation,
      att.check_in_time,
      att.check_out_time,
      CASE 
        WHEN att.check_in_time IS NOT NULL AND att.check_out_time IS NOT NULL AND att.check_out_time >= att.check_in_time
        THEN ROUND(EXTRACT(EPOCH FROM (att.check_out_time - att.check_in_time)) / 60)::INT
        ELSE NULL 
      END AS duration_minutes,
      att.status AS attendance_status,
      att.attendance_type,
      att.is_re_attendance,
      att.source,
      att.verification_status,
      att.face_status,
      att.environment_status,
      att.matched_environment_code,
      COALESCE((SELECT COUNT(*)::INT FROM employee_tasks et WHERE et.employee_id = att.employee_id AND et.task_date = att.attendance_date), 0) AS total_tasks,
      COALESCE((SELECT COUNT(*)::INT FROM employee_tasks et WHERE et.employee_id = att.employee_id AND et.task_date = att.attendance_date AND et.status = 'completed'), 0) AS completed_tasks,
      COALESCE((SELECT COUNT(*)::INT FROM employee_tasks et WHERE et.employee_id = att.employee_id AND et.task_date = att.attendance_date AND et.task_type = 'EXTRA'), 0) AS extra_tasks_count,
      COALESCE((SELECT COUNT(*)::INT FROM employee_tasks et WHERE et.employee_id = att.employee_id AND et.task_date = att.attendance_date AND (et.carried_from_date IS NOT NULL OR et.carry_count > 0 OR et.task_type = 'CARRY_OVER')), 0) AS carry_forward_tasks_count
    FROM employee_attendance att
    JOIN employees e ON e.id = att.employee_id
    LEFT JOIN users u ON u.id = e.user_id
    ${baseWhere}
    ORDER BY att.attendance_date DESC, att.check_in_time DESC NULLS LAST
    LIMIT 10000
  `;

  const { rows: rawRecords } = await query(exportQuery, params);

  // Fetch individual tasks for the matching date range and filters in a single query (Zero N+1)
  const taskParams = [validStartDate, validEndDate];
  let taskParamIdx = 3;
  let taskBaseWhere = `
    WHERE et.task_date >= $1 AND et.task_date <= $2
      AND e.employee_status != 'TERMINATED'
  `;

  if (search && search.trim()) {
    const searchPattern = `%${search.trim()}%`;
    taskBaseWhere += ` AND (e.full_name ILIKE $${taskParamIdx} OR e.employee_id ILIKE $${taskParamIdx} OR e.email_id ILIKE $${taskParamIdx} OR et.title ILIKE $${taskParamIdx})`;
    taskParams.push(searchPattern);
    taskParamIdx++;
  }

  if (department && department.trim() && department.toUpperCase() !== 'ALL') {
    taskBaseWhere += ` AND e.department = $${taskParamIdx}`;
    taskParams.push(department.trim());
    taskParamIdx++;
  }

  if (employeeId && employeeId.trim()) {
    const isEmpUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(employeeId.trim());
    if (isEmpUuid) {
      taskBaseWhere += ` AND (et.employee_id = $${taskParamIdx} OR e.employee_id = $${taskParamIdx} OR e.user_id = $${taskParamIdx})`;
    } else {
      taskBaseWhere += ` AND (e.employee_id = $${taskParamIdx} OR e.mobile_number = $${taskParamIdx})`;
    }
    taskParams.push(employeeId.trim());
    taskParamIdx++;
  }

  const taskQuery = `
    SELECT
      et.id AS task_id,
      et.employee_id,
      et.task_date::TEXT AS task_date,
      et.title,
      et.status AS task_status,
      et.task_type,
      et.carried_from_date::TEXT AS carried_from_date,
      et.carry_count,
      et.submitted_at,
      et.created_at,
      e.employee_id AS employee_code,
      e.full_name AS employee_name,
      e.department,
      e.designation
    FROM employee_tasks et
    JOIN employees e ON e.id = et.employee_id
    LEFT JOIN users u ON u.id = e.user_id
    ${taskBaseWhere}
    ORDER BY et.task_date DESC, e.employee_id ASC, et.created_at ASC
    LIMIT 50000
  `;

  const { rows: rawTasks } = await query(taskQuery, taskParams);

  // Group tasks by employee_id + '_' + task_date for fast lookup
  const tasksByEmpAndDate = new Map();
  const matchedTaskIds = new Set();

  (rawTasks || []).forEach(t => {
    const key = `${t.employee_id}_${t.task_date}`;
    if (!tasksByEmpAndDate.has(key)) {
      tasksByEmpAndDate.set(key, []);
    }
    tasksByEmpAndDate.get(key).push(t);
  });

  // Audit export execution
  if (reqUser && reqUser.id) {
    await security.audit(reqUser.id, 'ATTENDANCE_REPORT_EXPORT', req, {
      export_format: format.toUpperCase(),
      record_count: rawRecords.length,
      task_count: (rawTasks || []).length,
      filters: {
        startDate: validStartDate,
        endDate: validEndDate,
        department: department || 'ALL',
        status: status || 'ALL',
        source: source || 'ALL',
        search: search || null,
      },
      timestamp: new Date().toISOString()
    }).catch(err => logger.error('Export audit error:', err.message));
  }

  let buffer;
  const filename = `attendance-report-${validStartDate}-to-${validEndDate}.${format === 'xlsx' ? 'xlsx' : 'csv'}`;

  if (format === 'xlsx') {
    // ── EXCEL EXPORT: 2 SEPARATE SHEETS ──
    // Sheet 1: Daily Summary
    // Sheet 2: Individual Task Details
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'GharKaPaisa Super Admin Attendance System';
    workbook.lastModifiedBy = 'Super Admin';
    workbook.created = new Date();

    // ── SHEET 1: Daily Summary ──
    const summarySheet = workbook.addWorksheet('Daily Summary', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    summarySheet.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Employee ID', key: 'employee_code', width: 16 },
      { header: 'Employee Name', key: 'employee_name', width: 24 },
      { header: 'Department', key: 'department', width: 20 },
      { header: 'Designation', key: 'designation', width: 22 },
      { header: 'Check In', key: 'check_in', width: 14 },
      { header: 'Check Out', key: 'check_out', width: 14 },
      { header: 'Total Duration', key: 'duration', width: 15 },
      { header: 'Attendance Status', key: 'status', width: 18 },
      { header: 'Attendance Type', key: 'attendance_type', width: 16 },
      { header: 'Total Tasks', key: 'total_tasks', width: 13 },
      { header: 'Completed Tasks', key: 'completed_tasks', width: 15 },
      { header: 'Pending Tasks', key: 'pending_tasks', width: 14 },
      { header: 'Extra Tasks', key: 'extra_tasks', width: 13 },
      { header: 'Carry-Forward Tasks', key: 'carry_forward_tasks', width: 18 },
      { header: 'Task Completion %', key: 'completion_pct', width: 18 },
      { header: 'End-of-Day Status', key: 'eod_status', width: 18 },
      { header: 'Face Verification Status', key: 'face_verification', width: 22 },
      { header: 'Location Verification Status', key: 'location_verification', width: 24 },
      { header: 'Office Environment', key: 'office_environment', width: 18 },
      { header: 'Source', key: 'source', width: 12 }
    ];

    // Format Sheet 1 Header Row
    const headerRow1 = summarySheet.getRow(1);
    headerRow1.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow1.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F172A' } // Dark Slate
    };
    headerRow1.alignment = { vertical: 'middle', horizontal: 'center' };

    rawRecords.forEach(r => {
      const durDisp = formatDurationDisplay(r.duration_minutes) || (r.check_in_time && !r.check_out_time ? 'In Progress' : '-');
      const checkInStr = formatKolkataTime(r.check_in_time);
      const checkOutStr = formatKolkataTime(r.check_out_time);
      const totalTasks = r.total_tasks || 0;
      const completedTasks = r.completed_tasks || 0;
      const pendingTasks = Math.max(0, totalTasks - completedTasks);
      const extraTasks = r.extra_tasks_count || 0;
      const carryForwardTasks = r.carry_forward_tasks_count || 0;
      const completionPct = totalTasks > 0 ? `${Math.round((completedTasks / totalTasks) * 100)}%` : '0%';
      const eodStatus = r.check_out_time ? 'COMPLETED' : (r.check_in_time ? 'PENDING' : 'NOT_MARKED');
      const faceStatus = r.face_status || (r.verification_status === 'VERIFIED' ? 'PASSED' : (r.verification_status || '-'));
      const locStatus = r.environment_status || (r.matched_environment_code ? `MATCHED (${r.matched_environment_code})` : (r.verification_status === 'VERIFIED' ? 'PASSED' : '-'));

      summarySheet.addRow({
        date: r.attendance_date,
        employee_code: sanitizeCsvField(r.employee_code || '-'),
        employee_name: sanitizeCsvField(r.employee_name || '-'),
        department: sanitizeCsvField(r.department || '-'),
        designation: sanitizeCsvField(r.designation || '-'),
        check_in: checkInStr,
        check_out: checkOutStr,
        duration: durDisp,
        status: r.attendance_status || 'NOT_MARKED',
        attendance_type: r.attendance_type || 'FULL_TIME',
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        pending_tasks: pendingTasks,
        extra_tasks: extraTasks,
        carry_forward_tasks: carryForwardTasks,
        completion_pct: completionPct,
        eod_status: eodStatus,
        face_verification: faceStatus,
        location_verification: locStatus,
        office_environment: sanitizeCsvField(r.matched_environment_code || '-'),
        source: r.source || 'WEB'
      });
    });

    // ── SHEET 2: Individual Task Details ──
    const taskSheet = workbook.addWorksheet('Individual Task Details', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    taskSheet.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Employee ID', key: 'employee_code', width: 16 },
      { header: 'Employee Name', key: 'employee_name', width: 24 },
      { header: 'Department', key: 'department', width: 20 },
      { header: 'Designation', key: 'designation', width: 22 },
      { header: 'Task Title', key: 'task_title', width: 36 },
      { header: 'Task Type', key: 'task_type', width: 16 },
      { header: 'Task Category', key: 'task_category', width: 22 },
      { header: 'Task Status', key: 'task_status', width: 15 },
      { header: 'Carried From Date', key: 'carried_from_date', width: 18 },
      { header: 'Created At (IST)', key: 'created_at', width: 18 },
      { header: 'Submitted At (IST)', key: 'submitted_at', width: 18 }
    ];

    // Format Sheet 2 Header Row
    const headerRow2 = taskSheet.getRow(1);
    headerRow2.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow2.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0D9488' } // Teal
    };
    headerRow2.alignment = { vertical: 'middle', horizontal: 'center' };

    (rawTasks || []).forEach(t => {
      const isCarry = Boolean(t.carried_from_date || (t.carry_count && Number(t.carry_count) > 0) || (t.task_type && String(t.task_type).toUpperCase() === 'CARRY_OVER'));
      const isExtra = Boolean(t.task_type && String(t.task_type).toUpperCase() === 'EXTRA');
      const taskType = isExtra ? 'EXTRA' : (isCarry ? 'CARRY_OVER' : 'STANDARD');
      const taskCategory = isExtra ? 'Extra Task' : (isCarry ? 'Carry-Forward Task' : 'Morning Commitment');
      const taskStatus = (t.task_status && String(t.task_status).toLowerCase() === 'completed') ? 'COMPLETED' : 'PENDING';

      taskSheet.addRow({
        date: t.task_date,
        employee_code: sanitizeCsvField(t.employee_code || '-'),
        employee_name: sanitizeCsvField(t.employee_name || '-'),
        department: sanitizeCsvField(t.department || '-'),
        designation: sanitizeCsvField(t.designation || '-'),
        task_title: sanitizeCsvField(t.title || '-'),
        task_type: taskType,
        task_category: taskCategory,
        task_status: taskStatus,
        carried_from_date: t.carried_from_date || '-',
        created_at: formatKolkataTime(t.created_at),
        submitted_at: formatKolkataTime(t.submitted_at)
      });
    });

    buffer = await workbook.xlsx.writeBuffer();
  } else {
    // ── CSV EXPORT: UNIFIED COMPREHENSIVE DATA (SUMMARY + INDIVIDUAL TASKS) ──
    const csvHeaders = [
      'Date',
      'Employee ID',
      'Employee Name',
      'Department',
      'Designation',
      'Check In',
      'Check Out',
      'Total Duration',
      'Attendance Status',
      'Attendance Type',
      'Total Tasks',
      'Completed Tasks',
      'Pending Tasks',
      'Extra Tasks',
      'Carry-Forward Tasks',
      'Task Completion %',
      'End-of-Day Status',
      'Face Verification Status',
      'Location Verification Status',
      'Office Environment',
      'Source',
      'Task Title',
      'Task Type',
      'Task Category',
      'Task Status',
      'Carried From Date'
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      let str = String(val).trim();
      // Guard against CSV formula injection
      if (/^[=+\-@\t\r]/.test(str)) {
        str = `'${str}`;
      }
      str = str.replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvRows = [];

    // Iterate through attendance records and emit row for each task, or 1 row if 0 tasks
    rawRecords.forEach(r => {
      const durDisp = formatDurationDisplay(r.duration_minutes) || (r.check_in_time && !r.check_out_time ? 'In Progress' : '-');
      const checkInStr = formatKolkataTime(r.check_in_time);
      const checkOutStr = formatKolkataTime(r.check_out_time);
      const totalTasks = r.total_tasks || 0;
      const completedTasks = r.completed_tasks || 0;
      const pendingTasks = Math.max(0, totalTasks - completedTasks);
      const extraTasks = r.extra_tasks_count || 0;
      const carryForwardTasks = r.carry_forward_tasks_count || 0;
      const completionPct = totalTasks > 0 ? `${Math.round((completedTasks / totalTasks) * 100)}%` : '0%';
      const eodStatus = r.check_out_time ? 'COMPLETED' : (r.check_in_time ? 'PENDING' : 'NOT_MARKED');
      const faceStatus = r.face_status || (r.verification_status === 'VERIFIED' ? 'PASSED' : (r.verification_status || '-'));
      const locStatus = r.environment_status || (r.matched_environment_code ? `MATCHED (${r.matched_environment_code})` : (r.verification_status === 'VERIFIED' ? 'PASSED' : '-'));

      const summaryFields = [
        escapeCsv(r.attendance_date),
        escapeCsv(r.employee_code || '-'),
        escapeCsv(r.employee_name || '-'),
        escapeCsv(r.department || '-'),
        escapeCsv(r.designation || '-'),
        escapeCsv(checkInStr),
        escapeCsv(checkOutStr),
        escapeCsv(durDisp),
        escapeCsv(r.attendance_status || 'NOT_MARKED'),
        escapeCsv(r.attendance_type || 'FULL_TIME'),
        escapeCsv(totalTasks),
        escapeCsv(completedTasks),
        escapeCsv(pendingTasks),
        escapeCsv(extraTasks),
        escapeCsv(carryForwardTasks),
        escapeCsv(completionPct),
        escapeCsv(eodStatus),
        escapeCsv(faceStatus),
        escapeCsv(locStatus),
        escapeCsv(r.matched_environment_code || '-'),
        escapeCsv(r.source || 'WEB')
      ];

      const empTasks = tasksByEmpAndDate.get(`${r.employee_id}_${r.attendance_date}`) || [];

      if (empTasks.length > 0) {
        empTasks.forEach(t => {
          matchedTaskIds.add(t.task_id);
          const isCarry = Boolean(t.carried_from_date || (t.carry_count && Number(t.carry_count) > 0) || (t.task_type && String(t.task_type).toUpperCase() === 'CARRY_OVER'));
          const isExtra = Boolean(t.task_type && String(t.task_type).toUpperCase() === 'EXTRA');
          const taskType = isExtra ? 'EXTRA' : (isCarry ? 'CARRY_OVER' : 'STANDARD');
          const taskCategory = isExtra ? 'Extra Task' : (isCarry ? 'Carry-Forward Task' : 'Morning Commitment');
          const taskStatus = (t.task_status && String(t.task_status).toLowerCase() === 'completed') ? 'COMPLETED' : 'PENDING';

          csvRows.push([
            ...summaryFields,
            escapeCsv(t.title || '-'),
            escapeCsv(taskType),
            escapeCsv(taskCategory),
            escapeCsv(taskStatus),
            escapeCsv(t.carried_from_date || '-')
          ].join(','));
        });
      } else {
        // Attendance record with no tasks: output 1 row with '-' for task fields
        csvRows.push([
          ...summaryFields,
          escapeCsv('-'),
          escapeCsv('-'),
          escapeCsv('-'),
          escapeCsv('-'),
          escapeCsv('-')
        ].join(','));
      }
    });

    // Check if any tasks were not matched to an attendance record
    (rawTasks || []).forEach(t => {
      if (!matchedTaskIds.has(t.task_id)) {
        const isCarry = Boolean(t.carried_from_date || (t.carry_count && Number(t.carry_count) > 0) || (t.task_type && String(t.task_type).toUpperCase() === 'CARRY_OVER'));
        const isExtra = Boolean(t.task_type && String(t.task_type).toUpperCase() === 'EXTRA');
        const taskType = isExtra ? 'EXTRA' : (isCarry ? 'CARRY_OVER' : 'STANDARD');
        const taskCategory = isExtra ? 'Extra Task' : (isCarry ? 'Carry-Forward Task' : 'Morning Commitment');
        const taskStatus = (t.task_status && String(t.task_status).toLowerCase() === 'completed') ? 'COMPLETED' : 'PENDING';

        csvRows.push([
          escapeCsv(t.task_date),
          escapeCsv(t.employee_code || '-'),
          escapeCsv(t.employee_name || '-'),
          escapeCsv(t.department || '-'),
          escapeCsv(t.designation || '-'),
          escapeCsv('-'), // Check in
          escapeCsv('-'), // Check out
          escapeCsv('-'), // Duration
          escapeCsv('NOT_MARKED'),
          escapeCsv('FULL_TIME'),
          escapeCsv(1),
          escapeCsv(taskStatus === 'COMPLETED' ? 1 : 0),
          escapeCsv(taskStatus === 'PENDING' ? 1 : 0),
          escapeCsv(isExtra ? 1 : 0),
          escapeCsv(isCarry ? 1 : 0),
          escapeCsv(taskStatus === 'COMPLETED' ? '100%' : '0%'),
          escapeCsv('NOT_MARKED'),
          escapeCsv('-'),
          escapeCsv('-'),
          escapeCsv('-'),
          escapeCsv('WEB'),
          escapeCsv(t.title || '-'),
          escapeCsv(taskType),
          escapeCsv(taskCategory),
          escapeCsv(taskStatus),
          escapeCsv(t.carried_from_date || '-')
        ].join(','));
      }
    });

    // Prepend UTF-8 BOM so Excel on Windows recognizes UTF-8 cleanly
    const csvContent = '\uFEFF' + [csvHeaders.join(','), ...csvRows].join('\r\n');
    buffer = Buffer.from(csvContent, 'utf-8');
  }

  return {
    buffer,
    filename,
    contentType: format === 'xlsx'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'text/csv'
  };
};

module.exports = {
  getKolkataTodayDate,
  getAttendanceReports,
  exportAttendanceReports,
};
