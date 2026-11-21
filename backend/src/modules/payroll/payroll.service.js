const { query } = require('../../config/database');
const logger = require('../../config/logger');

// ── Config helpers (system_config with defaults) ──────────────────────────────
async function getPayrollConfig() {
  let rows = [];
  try {
    const res = await query(
      `SELECT config_key, config_value FROM system_config WHERE config_key LIKE 'payroll_%'`
    );
    rows = res.rows;
  } catch (e) {
    logger.warn(`[PAYROLL] system_config unavailable, using defaults: ${e.message}`);
  }
  const map = {};
  rows.forEach((r) => { map[r.config_key] = r.config_value; });
  const num = (k, d) => {
    const v = parseFloat(map[k]);
    return Number.isFinite(v) ? v : d;
  };
  return {
    minSalary: num('payroll_min_salary_for_statutory', 16000),
    pfRate: num('payroll_pf_rate', 0.12),
    pfCeiling: num('payroll_pf_wage_ceiling', 15000),
    esiEmployeeRate: num('payroll_esi_employee_rate', 0.0075),
    esiEmployerRate: num('payroll_esi_employer_rate', 0.0325),
    esiCeiling: num('payroll_esi_wage_ceiling', 21000),
    professionalTax: num('payroll_professional_tax', 200),
    lateFine: num('payroll_late_fine_per_day', 50)
  };
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function monthRange(year, month) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end, lastDay };
}

// Working days = Monday–Saturday in the month, prorated from joining_date if mid-month
function countWorkingDays(year, month, joiningDate = null) {
  const { start, end, lastDay } = monthRange(year, month);
  let count = 0;
  const join = joiningDate ? new Date(joiningDate) : null;
  for (let d = 1; d <= lastDay; d++) {
    const date = new Date(year, month - 1, d);
    if (join && date < new Date(join.getFullYear(), join.getMonth(), join.getDate())) continue;
    const day = date.getDay(); // 0=Sun
    if (day !== 0) count++;
  }
  return count;
}

// ── Salary structure resolution ───────────────────────────────────────────────
// Priority: active employee_salary_structures → employees.offered_salary fallback
async function resolveSalaryStructure(employeeId) {
  const { rows } = await query(
    `SELECT * FROM employee_salary_structures
     WHERE employee_id = $1 AND is_active = true
     ORDER BY effective_from DESC LIMIT 1`,
    [employeeId]
  );
  if (rows.length > 0) {
    const s = rows[0];
    return {
      source: 'structure',
      basic: parseFloat(s.basic) || 0,
      da: parseFloat(s.da) || 0,
      hra: parseFloat(s.hra) || 0,
      specialAllowance: parseFloat(s.special_allowance) || 0,
      fixedGross: null
    };
  }
  const { rows: emp } = await query(
    `SELECT offered_salary FROM employees WHERE id = $1`,
    [employeeId]
  );
  const offered = parseFloat(emp[0]?.offered_salary) || 0;
  return {
    source: 'offered_salary',
    basic: offered,
    da: 0,
    hra: 0,
    specialAllowance: 0,
    fixedGross: offered
  };
}

// ── Attendance summary for the month ──────────────────────────────────────────
async function getAttendanceSummary(employeeId, year, month, joiningDate = null) {
  const { start, end } = monthRange(year, month);
  const { rows } = await query(
    `SELECT status, COUNT(*)::int AS cnt
     FROM employee_attendance
     WHERE employee_id = $1 AND attendance_date BETWEEN $2::date AND $3::date
     GROUP BY status`,
    [employeeId, start, end]
  );
  const summary = { PRESENT: 0, LATE: 0, HALF_DAY: 0, LEAVE: 0, ABSENT: 0 };
  rows.forEach((r) => { summary[r.status] = (summary[r.status] || 0) + r.cnt; });
  const hasAttendanceData = rows.length > 0;

  const workingDays = countWorkingDays(year, month, joiningDate);
  const presentDays = summary.PRESENT + summary.LATE + summary.HALF_DAY * 0.5;
  const leaveDays = summary.LEAVE;
  const paidDays = presentDays + leaveDays;
  // LOP only applies when the employee actually has attendance records for the month;
  // months with zero attendance data are treated as "not yet marked", not fully absent.
  const lopDays = hasAttendanceData ? Math.max(0, workingDays - paidDays) : 0;

  return { workingDays, presentDays, leaveDays, lopDays, lateCount: summary.LATE, hasAttendanceData, raw: summary };
}

// ── Incentive earned in the month (from incentive transactions) ───────────────
async function getMonthIncentive(employeeId, year, month) {
  const { start, end } = monthRange(year, month);
  const { rows } = await query(
    `SELECT COALESCE(SUM(amount),0)::float AS total, COUNT(*)::int AS cnt
     FROM employee_incentive_transactions
     WHERE employee_id = $1
       AND transaction_type = 'EARNED'
       AND status NOT IN ('CANCELLED','REVERSED','FAILED')
       AND created_at::date BETWEEN $2::date AND $3::date`,
    [employeeId, start, end]
  );
  return { amount: rows[0]?.total || 0, count: rows[0]?.cnt || 0 };
}

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// ── Core computation ──────────────────────────────────────────────────────────
// Returns the full payroll computation for one employee/month (not persisted).
async function computePayroll(employeeId, year, month) {
  const cfg = await getPayrollConfig();
  const structure = await resolveSalaryStructure(employeeId);
  const { rows: empRows } = await query(`SELECT joining_date FROM employees WHERE id = $1`, [employeeId]);
  const attendance = await getAttendanceSummary(employeeId, year, month, empRows[0]?.joining_date || null);
  const incentive = await getMonthIncentive(employeeId, year, month);

  const basic = structure.basic;
  const da = structure.da;
  const hra = structure.hra;
  const special = structure.specialAllowance;
  const incentives = incentive.amount;

  const grossEarnings = round2(basic + da + hra + special + incentives);
  const statutoryApplies = grossEarnings >= cfg.minSalary;

  // PF: 12% of (Basic + DA) capped at wage ceiling → max ₹1,800 employee side
  const pfBase = Math.min(basic + da, cfg.pfCeiling);
  const employeePF = statutoryApplies ? round2(pfBase * cfg.pfRate) : 0;
  const employerPF = statutoryApplies ? round2(pfBase * cfg.pfRate) : 0;

  // ESI: employee 0.75% / employer 3.25% of gross, only within wage ceiling
  const esiEligible = statutoryApplies && grossEarnings <= cfg.esiCeiling && grossEarnings > 0;
  const employeeESI = esiEligible ? round2(grossEarnings * cfg.esiEmployeeRate) : 0;
  const employerESI = esiEligible ? round2(grossEarnings * cfg.esiEmployerRate) : 0;

  // Professional tax (flat monthly slab)
  const professionalTax = grossEarnings > 0 ? round2(cfg.professionalTax) : 0;

  // LOP: per-day basic rate × unpaid days
  const perDayBasic = attendance.workingDays > 0 ? (basic + da) / attendance.workingDays : 0;
  const lopAmount = round2(perDayBasic * attendance.lopDays);

  // Late fine
  const lateFine = round2(attendance.lateCount * cfg.lateFine);

  const earnings = [
    { label: 'Basic Salary', amount: round2(basic) },
    ...(da > 0 ? [{ label: 'Dearness Allowance', amount: round2(da) }] : []),
    ...(hra > 0 ? [{ label: 'House Rent Allowance', amount: round2(hra) }] : []),
    ...(special > 0 ? [{ label: 'Special Allowance', amount: round2(special) }] : []),
    { label: 'Incentives', amount: round2(incentives) }
  ];

  const deductions = [
    { label: 'Employee Provident Fund (PF)', amount: employeePF, note: statutoryApplies ? '12% of Basic+DA (ceiling ₹15,000)' : 'Below statutory threshold' },
    { label: 'Employee ESI', amount: employeeESI, note: esiEligible ? '0.75% of gross wages' : (grossEarnings > cfg.esiCeiling ? 'Above ESI wage ceiling' : 'Not applicable') },
    { label: 'Professional Tax', amount: professionalTax },
    ...(attendance.lopDays > 0 ? [{ label: `Loss of Pay (${attendance.lopDays} day${attendance.lopDays > 1 ? 's' : ''})`, amount: lopAmount }] : []),
    ...(attendance.lateCount > 0 ? [{ label: `Late Arrival Fine (${attendance.lateCount} mark${attendance.lateCount > 1 ? 's' : ''})`, amount: lateFine }] : [])
  ];

  const employerContributions = [
    { label: 'Employer PF', amount: employerPF },
    { label: 'Employer ESI', amount: employerESI }
  ];

  const totalDeductions = round2(deductions.reduce((t, d) => t + d.amount, 0));
  const netPay = round2(grossEarnings - totalDeductions);

  return {
    employeeId,
    year,
    month,
    monthName: `${MONTH_NAMES[month - 1]} ${year}`,
    salarySource: structure.source,
    workingDays: attendance.workingDays,
    presentDays: round2(attendance.presentDays),
    leaveDays: round2(attendance.leaveDays),
    lopDays: round2(attendance.lopDays),
    lateCount: attendance.lateCount,
    incentiveCount: incentive.count,
    earnings,
    deductions,
    employerContributions,
    grossEarnings,
    totalDeductions,
    netPay,
    statutoryApplied: statutoryApplies
  };
}

// ── Persist / upsert a payroll record ─────────────────────────────────────────
async function upsertPayrollRecord(employeeId, computation, generatedBy, status = 'PENDING_APPROVAL') {
  const { rows } = await query(
    `INSERT INTO payroll_records (
      employee_id, month, year, working_days, present_days, leave_days, lop_days, late_count,
      incentive_amount, earnings, deductions, employer_contributions,
      gross_earnings, total_deductions, net_pay, status, generated_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
    ON CONFLICT (employee_id, year, month) DO UPDATE SET
      working_days = EXCLUDED.working_days,
      present_days = EXCLUDED.present_days,
      leave_days = EXCLUDED.leave_days,
      lop_days = EXCLUDED.lop_days,
      late_count = EXCLUDED.late_count,
      incentive_amount = EXCLUDED.incentive_amount,
      earnings = EXCLUDED.earnings,
      deductions = EXCLUDED.deductions,
      employer_contributions = EXCLUDED.employer_contributions,
      gross_earnings = EXCLUDED.gross_earnings,
      total_deductions = EXCLUDED.total_deductions,
      net_pay = EXCLUDED.net_pay,
      status = CASE WHEN payroll_records.status IN ('APPROVED','PAID') THEN payroll_records.status ELSE EXCLUDED.status END,
      rejection_reason = CASE WHEN payroll_records.status IN ('APPROVED','PAID') THEN payroll_records.rejection_reason ELSE NULL END,
      generated_by = EXCLUDED.generated_by,
      updated_at = NOW()
    RETURNING *`,
    [
      employeeId, computation.month, computation.year,
      computation.workingDays, computation.presentDays, computation.leaveDays,
      computation.lopDays, computation.lateCount, computation.earnings.find(e => e.label === 'Incentives')?.amount || 0,
      JSON.stringify(computation.earnings), JSON.stringify(computation.deductions),
      JSON.stringify(computation.employerContributions),
      computation.grossEarnings, computation.totalDeductions, computation.netPay,
      status, generatedBy || null
    ]
  );
  return rows[0];
}

// Generate payroll for all active employees (or a subset) for a month
async function generateMonthlyPayroll(year, month, employeeIds = null, generatedBy = null) {
  let empQuery = `SELECT id FROM employees WHERE employee_status IN ('ACTIVE','ONBOARDING')`;
  const params = [];
  if (Array.isArray(employeeIds) && employeeIds.length > 0) {
    params.push(employeeIds);
    empQuery += ` AND id = ANY($1::uuid[])`;
  }
  const { rows: employees } = await query(empQuery, params);

  const results = { total: employees.length, generated: 0, failed: 0, errors: [] };
  for (const emp of employees) {
    try {
      const comp = await computePayroll(emp.id, year, month);
      await upsertPayrollRecord(emp.id, comp, generatedBy, 'PENDING_APPROVAL');
      results.generated++;
    } catch (e) {
      results.failed++;
      results.errors.push({ employee_id: emp.id, error: e.message });
      logger.warn(`[PAYROLL] compute failed for employee ${emp.id}: ${e.message}`);
    }
  }
  return results;
}

// Employee-facing: latest approved/paid record or live computation
async function getEmployeeMonthView(employeeId, year, month) {
  const comp = await computePayroll(employeeId, year, month);
  const { rows } = await query(
    `SELECT * FROM payroll_records WHERE employee_id = $1 AND year = $2 AND month = $3`,
    [employeeId, year, month]
  );
  const record = rows[0] || null;
  const { rows: reqRows } = record ? await query(
    `SELECT * FROM payslip_requests WHERE payroll_record_id = $1`, [record.id]
  ) : { rows: [] };

  return {
    month,
    year,
    monthName: comp.monthName,
    record: record ? {
      id: record.id,
      status: record.status,
      rejection_reason: record.rejection_reason,
      gross_earnings: parseFloat(record.gross_earnings),
      total_deductions: parseFloat(record.total_deductions),
      net_pay: parseFloat(record.net_pay),
      approved_at: record.approved_at,
      paid_at: record.paid_at
    } : null,
    payslipRequest: reqRows[0] ? {
      id: reqRows[0].id,
      status: reqRows[0].status,
      rejection_reason: reqRows[0].rejection_reason,
      reviewed_at: reqRows[0].reviewed_at
    } : null,
    computed: comp
  };
}

// YTD PF/ESI summary for Documents & Reports PF tab
async function getEmployeePfYtd(employeeId, year) {
  const { rows } = await query(
    `SELECT
       COALESCE(SUM((SELECT COALESCE(SUM((d->>'amount')::numeric),0) FROM jsonb_array_elements(deductions) d WHERE d->>'label' ILIKE '%Provident%')),0)::float AS employee_pf_ytd,
       COALESCE(SUM((SELECT COALESCE(SUM((d->>'amount')::numeric),0) FROM jsonb_array_elements(deductions) d WHERE d->>'label' ILIKE '%ESI%')),0)::float AS employee_esi_ytd,
       COALESCE(SUM((SELECT COALESCE(SUM((e->>'amount')::numeric),0) FROM jsonb_array_elements(employer_contributions) e WHERE e->>'label' ILIKE '%PF%')),0)::float AS employer_pf_ytd,
       COALESCE(SUM((SELECT COALESCE(SUM((e->>'amount')::numeric),0) FROM jsonb_array_elements(employer_contributions) e WHERE e->>'label' ILIKE '%ESI%')),0)::float AS employer_esi_ytd,
       COALESCE(SUM(gross_earnings),0)::float AS gross_ytd,
       COALESCE(SUM(net_pay),0)::float AS net_ytd,
       COUNT(*)::int AS months_count
     FROM payroll_records
     WHERE employee_id = $1 AND year = $2 AND status IN ('APPROVED','PAID')`,
    [employeeId, year]
  );
  return rows[0] || {};
}

module.exports = {
  getPayrollConfig,
  monthRange,
  countWorkingDays,
  resolveSalaryStructure,
  getAttendanceSummary,
  getMonthIncentive,
  computePayroll,
  upsertPayrollRecord,
  generateMonthlyPayroll,
  getEmployeeMonthView,
  getEmployeePfYtd
};
