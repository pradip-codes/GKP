const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { query, getClient } = require('../../config/database');
const roleCheck = require('../../middleware/authorization/role.middleware');
const { uploadToS3 } = require('../../services/aws/s3.service');
const { createNotification } = require('../notifications/service');
const { success, error, notFound } = require('../../utils/response/response');
const logger = require('../../config/logger');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SALARY_MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

const payslipUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(String(file.originalname || '')).toLowerCase();
    const mime = String(file.mimetype || '').toLowerCase();
    if (mime === 'application/pdf' && ext === '.pdf') {
      return cb(null, true);
    }
    const err = new Error('Invalid file type. Only PDF files (.pdf) are allowed.');
    err.statusCode = 400;
    return cb(err, false);
  }
});

function formatDurationDisplay(durationMinutes, checkInTime, checkOutTime) {
  if (durationMinutes !== null && durationMinutes !== undefined && !Number.isNaN(Number(durationMinutes)) && Number(durationMinutes) >= 0) {
    const mins = parseInt(durationMinutes, 10);
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${String(remMins).padStart(2, '0')}m`;
  }
  if (checkInTime && !checkOutTime) return 'In Progress';
  return '—';
}

async function storeOfficialPayslipPdf(file) {
  if (process.env.AWS_S3_BUCKET && process.env.AWS_ACCESS_KEY_ID) {
    return await uploadToS3(file.buffer, file.originalname, 'official-payslips');
  }
  logger.warn('[HR PAYSLIP] AWS_S3_BUCKET not configured, using local uploads fallback');
  const uploadsDir = path.join(__dirname, '../../../public/uploads/official-payslips');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  const filename = `${uuidv4()}.pdf`;
  fs.writeFileSync(path.join(uploadsDir, filename), file.buffer);
  return { url: `/uploads/official-payslips/${filename}`, key: null, originalFilename: file.originalname };
}

// GET /api/v1/hr/attendance-history?month&year&search&page&limit
router.get('/attendance-history', roleCheck('HR', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month || (now.getMonth() + 1), 10);
    const year = parseInt(req.query.year || now.getFullYear(), 10);
    const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '50', 10) || 50));
    const offset = (page - 1) * limit;
    const search = String(req.query.search || '').trim();

    if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2000 || year > 2100) {
      return error(res, 'Invalid month or year', 400);
    }

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const conditions = ['att.attendance_date BETWEEN $1::date AND $2::date'];
    const params = [startDate, endDate];

    if (search) {
      params.push(`%${search}%`);
      const pIdx = `$${params.length}`;
      conditions.push(`(e.full_name ILIKE ${pIdx} OR e.employee_id ILIKE ${pIdx} OR e.email_id ILIKE ${pIdx})`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const [countRes, rowsRes] = await Promise.all([
      query(
        `SELECT COUNT(att.id)::INT AS total
         FROM employee_attendance att
         JOIN employees e ON e.id = att.employee_id
         ${whereClause}`,
        params
      ),
      query(
        `SELECT
           att.id AS attendance_id,
           att.attendance_date AS date,
           e.employee_id AS employee_code,
           e.full_name AS employee_name,
           e.department,
           att.check_in_time,
           att.check_out_time,
           CASE
             WHEN att.check_in_time IS NOT NULL AND att.check_out_time IS NOT NULL AND att.check_out_time >= att.check_in_time
             THEN ROUND(EXTRACT(EPOCH FROM (att.check_out_time - att.check_in_time)) / 60)::INT
             ELSE NULL
           END AS duration_minutes,
           att.status
         FROM employee_attendance att
         JOIN employees e ON e.id = att.employee_id
         ${whereClause}
         ORDER BY att.attendance_date DESC, att.check_in_time DESC NULLS LAST, e.full_name ASC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      )
    ]);

    const total = countRes.rows[0]?.total || 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const data = rowsRes.rows.map((r) => ({
      attendance_id: r.attendance_id,
      date: r.date,
      employee_code: r.employee_code,
      employee_name: r.employee_name,
      department: r.department,
      check_in_time: r.check_in_time,
      check_out_time: r.check_out_time,
      duration_display: formatDurationDisplay(r.duration_minutes, r.check_in_time, r.check_out_time),
      status: r.status
    }));

    return success(res, {
      data,
      pagination: { page, limit, total, total_pages: totalPages }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/hr/payslip-requests?status&month&search&page&limit
router.get('/payslip-requests', roleCheck('HR', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const rawStatus = String(req.query.status || 'PENDING').trim().toUpperCase();
    const rawMonth = String(req.query.month || '').trim();
    const search = String(req.query.search || '').trim();
    const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '30', 10) || 30));
    const offset = (page - 1) * limit;

    const conditions = ['1=1'];
    const params = [];

    if (rawStatus && rawStatus !== 'ALL') {
      if (!['PENDING', 'APPROVED', 'REJECTED'].includes(rawStatus)) {
        return error(res, 'Invalid status filter', 400);
      }
      params.push(rawStatus);
      conditions.push(`pr_req.status = $${params.length}`);
    }

    if (rawMonth) {
      if (!SALARY_MONTH_REGEX.test(rawMonth)) {
        return error(res, 'month filter must be in YYYY-MM format', 400);
      }
      const [yStr, mStr] = rawMonth.split('-');
      params.push(rawMonth, parseInt(yStr, 10), parseInt(mStr, 10));
      conditions.push(`(pr_req.salary_month = $${params.length - 2} OR (pr_req.year = $${params.length - 1} AND pr_req.month = $${params.length}))`);
    }

    if (search) {
      params.push(`%${search}%`);
      const pIdx = `$${params.length}`;
      conditions.push(`(e.full_name ILIKE ${pIdx} OR e.employee_id ILIKE ${pIdx} OR e.email_id ILIKE ${pIdx} OR u.email ILIKE ${pIdx})`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const [countRes, rowsRes] = await Promise.all([
      query(
        `SELECT COUNT(pr_req.id)::INT AS total
         FROM payslip_requests pr_req
         JOIN employees e ON e.id = pr_req.employee_id
         LEFT JOIN users u ON u.id = e.user_id
         ${whereClause}`,
        params
      ),
      query(
        `SELECT
           pr_req.id,
           pr_req.employee_id,
           e.full_name,
           e.employee_id AS employee_code,
           COALESCE(e.email_id, u.email) AS email_id,
           e.department,
           e.designation,
           COALESCE(pr_req.salary_month, LPAD(pr_req.year::text, 4, '0') || '-' || LPAD(pr_req.month::text, 2, '0')) AS salary_month,
           pr_req.status,
           COALESCE(pr_req.requested_at, pr_req.created_at) AS requested_at,
           COALESCE(pr_req.review_note, pr_req.rejection_reason) AS review_note,
           pr_req.reviewed_at,
           pr_req.payroll_verified,
           pr_req.payslip_file_name
         FROM payslip_requests pr_req
         JOIN employees e ON e.id = pr_req.employee_id
         LEFT JOIN users u ON u.id = e.user_id
         ${whereClause}
         ORDER BY COALESCE(pr_req.requested_at, pr_req.created_at) DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      )
    ]);

    const total = countRes.rows[0]?.total || 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return success(res, {
      requests: rowsRes.rows,
      pagination: { total, page, limit, totalPages }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/hr/payslip-requests/:id/review
router.post(
  '/payslip-requests/:id/review',
  roleCheck('HR', 'SUPER_ADMIN'),
  payslipUpload.single('payslip'),
  async (req, res, next) => {
    const reqId = String(req.params.id || '').trim();
    if (!UUID_REGEX.test(reqId)) {
      return error(res, 'Invalid payslip request ID', 400);
    }

    const action = String(req.body?.action || '').trim().toUpperCase();
    if (!['APPROVE', 'REJECT'].includes(action)) {
      return error(res, 'action must be APPROVE or REJECT', 400);
    }

    const payrollVerified =
      req.body?.payroll_verified === true ||
      String(req.body?.payroll_verified || '').trim().toLowerCase() === 'true';
    const reviewNote = String(req.body?.review_note || '').trim();

    if (action === 'APPROVE') {
      if (!payrollVerified) {
        return error(res, 'You must confirm payroll verification before approving', 400);
      }
      if (!reviewNote) {
        return error(res, 'Payroll verification note is required when approving', 400);
      }
      if (!req.file) {
        return error(res, 'An official payslip PDF file is required when approving', 400);
      }
      const ext = path.extname(String(req.file.originalname || '')).toLowerCase();
      const mime = String(req.file.mimetype || '').toLowerCase();
      if (mime !== 'application/pdf' || ext !== '.pdf') {
        return error(res, 'Only valid PDF files are accepted for official payslips', 400);
      }
    } else if (!reviewNote) {
      return error(res, 'A rejection reason is required when rejecting', 400);
    }

    let client = null;
    try {
      client = await getClient();
      await client.query('BEGIN');

      const { rows: lockedRows } = await client.query(
        `SELECT pr_req.*, e.user_id AS emp_user_id, e.full_name AS emp_full_name
         FROM payslip_requests pr_req
         JOIN employees e ON e.id = pr_req.employee_id
         WHERE pr_req.id = $1
         FOR UPDATE`,
        [reqId]
      );

      if (lockedRows.length === 0) {
        await client.query('ROLLBACK');
        return notFound(res, 'Payslip request not found');
      }

      const existing = lockedRows[0];
      if (String(existing.status || '').toUpperCase() !== 'PENDING') {
        await client.query('ROLLBACK');
        return error(res, 'Only PENDING payslip requests can be reviewed', 409);
      }

      let storedFile = null;
      if (action === 'APPROVE') {
        storedFile = await storeOfficialPayslipPdf(req.file);
      }

      const nextStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
      const { rows: updatedRows } = await client.query(
        `UPDATE payslip_requests
         SET status = $2,
             payroll_verified = $3,
             review_note = $4,
             rejection_reason = CASE WHEN $2 = 'REJECTED' THEN $4 ELSE NULL END,
             reviewed_by = $5,
             reviewed_at = NOW(),
             payslip_file_key = COALESCE($6, payslip_file_key),
             payslip_file_name = COALESCE($7, payslip_file_name),
             payslip_file_url = COALESCE($8, payslip_file_url),
             updated_at = NOW()
         WHERE id = $1
         RETURNING id, employee_id, salary_month, status, payroll_verified, review_note, reviewed_at, payslip_file_name`,
        [
          reqId,
          nextStatus,
          action === 'APPROVE' ? true : false,
          reviewNote,
          req.user.id,
          storedFile?.key || null,
          storedFile ? req.file.originalname : null,
          storedFile?.url || null
        ]
      );

      await client.query(
        `INSERT INTO audit_logs (user_id, role, module, action, old_data, new_data, ip, device)
         VALUES ($1, $2, 'payslip_requests', $3, $4, $5, $6, $7)`,
        [
          req.user.id,
          req.user.role,
          action === 'APPROVE' ? 'PAYSLIP_REQUEST_APPROVED' : 'PAYSLIP_REQUEST_REJECTED',
          JSON.stringify({ id: existing.id, status: existing.status, salary_month: existing.salary_month }),
          JSON.stringify(updatedRows[0]),
          req.ip || null,
          req.headers['user-agent'] || null
        ]
      );

      await client.query('COMMIT');

      if (existing.emp_user_id) {
        const monthText = existing.salary_month || `${existing.year}-${String(existing.month).padStart(2, '0')}`;
        createNotification(
          existing.emp_user_id,
          action === 'APPROVE' ? 'Payslip Approved' : 'Payslip Request Rejected',
          action === 'APPROVE'
            ? `Your payslip for ${monthText} has been approved and is ready to download.`
            : `Your payslip request for ${monthText} was rejected: ${reviewNote}`,
          action === 'APPROVE' ? 'success' : 'warning',
          '/employee/hr/payslips',
          { category: 'payroll' }
        ).catch((nErr) => logger.warn('[HR PAYSLIP] Employee notification failed:', nErr.message));
      }

      return success(res, updatedRows[0], `Payslip request ${nextStatus.toLowerCase()}`);
    } catch (err) {
      if (client) await client.query('ROLLBACK').catch(() => {});
      next(err);
    } finally {
      if (client) client.release();
    }
  }
);

module.exports = router;
