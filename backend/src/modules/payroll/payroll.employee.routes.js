const express = require('express');
const router = express.Router();
const { query } = require('../../config/database');
const payrollService = require('./payroll.service');
const logger = require('../../config/logger');

// This router is mounted inside employee.routes.js AFTER jwtAuth + resolveEmployee,
// so req.employee (employees row) and req.user are already populated.

function parseMonthYear(req, res) {
  const now = new Date();
  const year = parseInt(req.query.year || req.body?.year || now.getFullYear(), 10);
  const month = parseInt(req.query.month || req.body?.month || (now.getMonth() + 1), 10);
  if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
    res.status(400).json({ success: false, message: 'Invalid month/year' });
    return null;
  }
  return { year, month };
}

// GET /api/v1/employee/payroll/salary?month=&year=
// Live-computed salary view + persisted payroll record status (if generated)
router.get('/salary', async (req, res, next) => {
  try {
    const ym = parseMonthYear(req, res);
    if (!ym) return;
    const view = await payrollService.getEmployeeMonthView(req.employee.id, ym.year, ym.month);

    // Available months = months that have a payroll record OR current month
    const { rows: periodRows } = await query(
      `SELECT DISTINCT year, month FROM payroll_records WHERE employee_id = $1 ORDER BY year DESC, month DESC LIMIT 12`,
      [req.employee.id]
    );
    const months = periodRows.map((r) => ({ year: r.year, month: r.month }));
    const now = new Date();
    if (!months.some((m) => m.year === now.getFullYear() && m.month === now.getMonth() + 1)) {
      months.unshift({ year: now.getFullYear(), month: now.getMonth() + 1 });
    }

    res.json({ success: true, data: { ...view, availableMonths: months } });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/employee/payroll/payslips — approved/paid payroll records + request status
router.get('/payslips', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT pr.id, pr.month, pr.year, pr.gross_earnings, pr.total_deductions, pr.net_pay,
              pr.status AS payroll_status, pr.approved_at, pr.paid_at,
              ps.id AS request_id, ps.status AS request_status, ps.rejection_reason AS request_rejection_reason,
              ps.reviewed_at
       FROM payroll_records pr
       LEFT JOIN payslip_requests ps ON ps.payroll_record_id = pr.id
       WHERE pr.employee_id = $1 AND pr.status IN ('APPROVED','PAID')
       ORDER BY pr.year DESC, pr.month DESC`,
      [req.employee.id]
    );
    res.json({
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        month: r.month,
        year: r.year,
        monthName: new Date(r.year, r.month - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' }),
        grossEarnings: parseFloat(r.gross_earnings),
        totalDeductions: parseFloat(r.total_deductions),
        netPay: parseFloat(r.net_pay),
        payrollStatus: r.payroll_status,
        approvedAt: r.approved_at,
        paidAt: r.paid_at,
        requestId: r.request_id,
        requestStatus: r.request_status,
        requestRejectionReason: r.request_rejection_reason,
        downloadable: r.payroll_status === 'PAID' || r.request_status === 'APPROVED'
      }))
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/employee/payroll/payslips/:id — payslip detail
router.get('/payslips/:id', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT * FROM payroll_records WHERE id = $1 AND employee_id = $2`,
      [req.params.id, req.employee.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Payslip not found' });
    const r = rows[0];
    if (!['APPROVED', 'PAID'].includes(r.status)) {
      return res.status(403).json({ success: false, message: 'Payslip is not approved yet' });
    }
    const { rows: emp } = await query(
      `SELECT e.employee_id AS emp_code, e.full_name, e.designation, e.department, u.email
       FROM employees e LEFT JOIN users u ON u.id = e.user_id WHERE e.id = $1`,
      [req.employee.id]
    );
    res.json({
      success: true,
      data: {
        id: r.id,
        month: r.month,
        year: r.year,
        monthName: new Date(r.year, r.month - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' }),
        periodStart: `${r.year}-${String(r.month).padStart(2, '0')}-01`,
        workingDays: r.working_days,
        presentDays: parseFloat(r.present_days),
        leaveDays: parseFloat(r.leave_days),
        lopDays: parseFloat(r.lop_days),
        lateCount: r.late_count,
        paidOn: r.paid_at || r.approved_at,
        earnings: r.earnings,
        deductions: r.deductions,
        employerContributions: r.employer_contributions,
        grossEarnings: parseFloat(r.gross_earnings),
        totalDeductions: parseFloat(r.total_deductions),
        netPay: parseFloat(r.net_pay),
        status: r.status,
        employee: emp[0] || {}
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/employee/payroll/payslips/:id/request — request payslip download
router.post('/payslips/:id/request', async (req, res, next) => {
  try {
    const { rows: rec } = await query(
      `SELECT * FROM payroll_records WHERE id = $1 AND employee_id = $2`,
      [req.params.id, req.employee.id]
    );
    if (rec.length === 0) return res.status(404).json({ success: false, message: 'Payslip not found' });
    if (!['APPROVED', 'PAID'].includes(rec[0].status)) {
      return res.status(403).json({ success: false, message: 'Payroll is not approved yet' });
    }

    const { rows } = await query(
      `INSERT INTO payslip_requests (employee_id, payroll_record_id, month, year, status)
       VALUES ($1,$2,$3,$4,'PENDING')
       ON CONFLICT (payroll_record_id) DO UPDATE SET
         status = CASE WHEN payslip_requests.status = 'REJECTED' THEN 'PENDING' ELSE payslip_requests.status END,
         rejection_reason = NULL, reviewed_by = NULL, reviewed_at = NULL, updated_at = NOW()
       RETURNING *`,
      [req.employee.id, rec[0].id, rec[0].month, rec[0].year]
    );
    res.json({ success: true, message: 'Payslip request submitted', data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/employee/payroll/payslips/:id/download — PDF (requires approved request or PAID)
router.get('/payslips/:id/download', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT pr.*, ps.status AS request_status
       FROM payroll_records pr
       LEFT JOIN payslip_requests ps ON ps.payroll_record_id = pr.id
       WHERE pr.id = $1 AND pr.employee_id = $2`,
      [req.params.id, req.employee.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Payslip not found' });
    const r = rows[0];
    const allowed = r.status === 'PAID' || r.request_status === 'APPROVED';
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: r.request_status === 'REJECTED'
          ? `Payslip request rejected${r.rejection_reason ? ': ' + r.rejection_reason : ''}`
          : 'Payslip download is not approved yet. Please request a payslip.'
      });
    }

    const PDFDocument = require('pdfkit');
    const { rows: emp } = await query(
      `SELECT e.employee_id AS emp_code, e.full_name, e.designation, e.department
       FROM employees e WHERE e.id = $1`,
      [req.employee.id]
    );
    const e = emp[0] || {};
    const monthName = new Date(r.year, r.month - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const fmt = (n) => `Rs.${Number(n || 0).toLocaleString('en-IN')}`;

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="payslip-${r.year}-${String(r.month).padStart(2, '0')}.pdf"`);
    doc.pipe(res);

    doc.fontSize(20).fillColor('#008A60').text('GharKaPaisa', { align: 'center' });
    doc.fontSize(11).fillColor('#6B7280').text('Employee Payroll Statement', { align: 'center' });
    doc.fontSize(12).fillColor('#111827').text(`Salary Slip for ${monthName}`, { align: 'center' });
    doc.moveDown(1);

    doc.fontSize(10).fillColor('#374151');
    const info = [
      ['Employee Name', e.full_name || ''], ['Employee ID', e.emp_code || ''],
      ['Designation', e.designation || ''], ['Department', e.department || ''],
      ['Pay Period', `${r.year}-${String(r.month).padStart(2, '0')}-01 to month end`],
      ['Working Days', String(r.working_days)], ['Days Present', String(parseFloat(r.present_days))],
      ['LOP Days', String(parseFloat(r.lop_days))], ['Late Marks', String(r.late_count)]
    ];
    info.forEach(([k, v]) => doc.text(`${k}: ${v}`));
    doc.moveDown(1);

    const table = (title, rows, color) => {
      doc.fontSize(12).fillColor(color).text(title);
      doc.moveDown(0.3);
      rows.forEach((row) => {
        doc.fontSize(10).fillColor('#374151')
          .text(row.label, 50, doc.y, { width: 300 })
          .text(fmt(row.amount), 380, doc.y - 12, { width: 150, align: 'right' });
        doc.moveDown(0.4);
      });
      doc.moveDown(0.5);
    };

    table('EARNINGS', Array.isArray(r.earnings) ? r.earnings : [], '#065F46');
    table('DEDUCTIONS', (Array.isArray(r.deductions) ? r.deductions : []).filter(d => d.amount > 0), '#991B1B');

    doc.fontSize(13).fillColor('#111827')
      .text(`Gross Earnings: ${fmt(r.gross_earnings)}`)
      .text(`Total Deductions: - ${fmt(r.total_deductions)}`)
      .fontSize(16).fillColor('#008A60').text(`NET PAY: ${fmt(r.net_pay)}`);
    doc.moveDown(0.5);
    const er = Array.isArray(r.employer_contributions) ? r.employer_contributions : [];
    if (er.length) {
      doc.fontSize(11).fillColor('#374151').text('Employer Contributions (not deducted):');
      er.forEach((c) => doc.fontSize(10).text(`  ${c.label}: ${fmt(c.amount)}`));
    }
    doc.fontSize(8).fillColor('#9CA3AF').text('Generated by GharKaPaisa Payroll', 40, 780, { align: 'center' });
    doc.end();
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/employee/payroll/documents — employee's official documents
router.get('/documents', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, doc_type, name, period, issued_on, file_url, file_size, mime_type, status, created_at
       FROM employee_official_documents
       WHERE employee_id = $1 AND status != 'ARCHIVED'
       ORDER BY created_at DESC`,
      [req.employee.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/employee/payroll/documents/:id/download — signed URL or local file
router.get('/documents/:id/download', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT * FROM employee_official_documents WHERE id = $1 AND employee_id = $2`,
      [req.params.id, req.employee.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Document not found' });
    const doc = rows[0];
    if (!doc.file_url) return res.status(404).json({ success: false, message: 'File not available' });

    // S3 objects → signed URL; local uploads → redirect to static path
    if (doc.file_url.includes('.amazonaws.com/') || doc.file_key) {
      try {
        const { getSignedDownloadUrl } = require('../../services/aws/s3.service');
        const key = doc.file_key || doc.file_url.split('.amazonaws.com/')[1];
        const url = await getSignedDownloadUrl(key.split('?')[0], 3600);
        return res.redirect(url);
      } catch (e) {
        logger.warn(`[PAYROLL] signed URL failed for doc ${doc.id}: ${e.message}`);
      }
    }
    if (doc.file_url.startsWith('http')) return res.redirect(doc.file_url);
    return res.redirect(doc.file_url);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/employee/payroll/pf-summary — YTD PF/ESI from approved payroll records
router.get('/pf-summary', async (req, res, next) => {
  try {
    const year = parseInt(req.query.year || new Date().getFullYear(), 10);
    const ytd = await payrollService.getEmployeePfYtd(req.employee.id, year);
    const { rows: emp } = await query(
      `SELECT pan_number, aadhaar_number FROM employee_joining_details WHERE employee_id = $1`,
      [req.employee.id]
    ).catch(() => ({ rows: [] }));
    res.json({
      success: true,
      data: {
        year,
        pan: emp[0]?.pan_number || null,
        employeePfYtd: ytd.employee_pf_ytd || 0,
        employeeEsiYtd: ytd.employee_esi_ytd || 0,
        employerPfYtd: ytd.employer_pf_ytd || 0,
        employerEsiYtd: ytd.employer_esi_ytd || 0,
        grossYtd: ytd.gross_ytd || 0,
        netYtd: ytd.net_ytd || 0,
        monthsCount: ytd.months_count || 0
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
