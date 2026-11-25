const express = require('express');
const router = express.Router();
const { query } = require('../../config/database');
const roleCheck = require('../../middleware/authorization/role.middleware');
const { getSignedDownloadUrl } = require('../../services/aws/s3.service');
const { createNotification } = require('../notifications/service');
const { success, created, error, forbidden, notFound } = require('../../utils/response/response');
const logger = require('../../config/logger');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SALARY_MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

function extractS3Key(rawUrl, rawKey) {
  if (rawKey && typeof rawKey === 'string' && !rawKey.startsWith('/uploads/')) {
    return rawKey.replace(/^\/+/, '').split('?')[0];
  }
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  if (rawUrl.includes('.amazonaws.com/')) {
    return rawUrl.split('.amazonaws.com/')[1].split('?')[0].replace(/^\/+/, '');
  }
  if (rawUrl.includes('.cloudfront.net/')) {
    return rawUrl.split('.cloudfront.net/')[1].split('?')[0].replace(/^\/+/, '');
  }
  return null;
}

async function resolveDownloadUrl(req, fileUrl, fileKey) {
  if (fileUrl && typeof fileUrl === 'string' && fileUrl.startsWith('/uploads/')) {
    const base = `${req.protocol}://${req.get('host')}`;
    return `${base}${fileUrl}`;
  }
  const s3Key = extractS3Key(fileUrl, fileKey);
  if (s3Key) {
    return await getSignedDownloadUrl(s3Key, 300);
  }
  if (fileUrl && (fileUrl.startsWith('http://') || fileUrl.startsWith('https://'))) {
    return fileUrl;
  }
  return null;
}

function getCurrentKolkataYearMonth() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit'
  }).format(new Date()).split('-');
  return { year: parseInt(parts[0], 10), month: parseInt(parts[1], 10) };
}

// GET /api/v1/employee/hr-data — Employee profile salary, incentive summary/transactions, documents
router.get('/hr-data', roleCheck('EMPLOYEE'), async (req, res, next) => {
  try {
    const empId = req.employee.id;

    const [incSummaryRes, incTxRes, empDocsRes, officialDocsRes] = await Promise.all([
      query(
        `SELECT
           COALESCE(SUM(amount) FILTER (WHERE UPPER(status) IN ('RELEASE','RELEASED','PAID','COMPLETED')), 0)::float AS paid_incentives,
           COALESCE(SUM(amount) FILTER (WHERE UPPER(status) IN ('PENDING','HOLD','ON_HOLD','HELD')), 0)::float AS pending_incentives
         FROM employee_incentive_transactions
         WHERE employee_id = $1`,
        [empId]
      ),
      query(
        `SELECT id, paid_at, created_at, incentive_type, transaction_type, status, amount::float AS amount
         FROM employee_incentive_transactions
         WHERE employee_id = $1
         ORDER BY created_at DESC
         LIMIT 100`,
        [empId]
      ),
      query(
        `SELECT id, created_at, document_file_name, document_type, verification_status
         FROM employee_documents
         WHERE employee_id = $1
         ORDER BY created_at DESC`,
        [empId]
      ),
      query(
        `SELECT id, created_at, name AS document_file_name, doc_type AS document_type, status AS verification_status
         FROM employee_official_documents
         WHERE employee_id = $1 AND status != 'ARCHIVED'
         ORDER BY created_at DESC`,
        [empId]
      ).catch(() => ({ rows: [] }))
    ]);

    const documents = [...officialDocsRes.rows, ...empDocsRes.rows]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return success(res, {
      employee: {
        employee_id: req.employee.employee_id,
        designation: req.employee.designation || null,
        department: req.employee.department || null,
        offered_salary: req.employee.offered_salary != null ? Number(req.employee.offered_salary) : null
      },
      incentiveSummary: {
        paid_incentives: Number(incSummaryRes.rows[0]?.paid_incentives || 0),
        pending_incentives: Number(incSummaryRes.rows[0]?.pending_incentives || 0)
      },
      incentiveTransactions: incTxRes.rows,
      documents
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/employee/hr-documents/:id/download — Short-lived signed URL for own document
router.get('/hr-documents/:id/download', roleCheck('EMPLOYEE'), async (req, res, next) => {
  try {
    const docId = String(req.params.id || '').trim();
    if (!UUID_REGEX.test(docId)) {
      return error(res, 'Invalid document ID', 400);
    }

    const empId = req.employee.id;
    let fileUrl = null;
    let fileKey = null;
    let fileName = null;

    const { rows: empDocs } = await query(
      `SELECT id, document_url, document_key, document_file_name, document_type
       FROM employee_documents
       WHERE id = $1 AND employee_id = $2
       LIMIT 1`,
      [docId, empId]
    );

    if (empDocs.length > 0) {
      fileUrl = empDocs[0].document_url;
      fileKey = empDocs[0].document_key;
      fileName = empDocs[0].document_file_name || `${empDocs[0].document_type || 'document'}`;
    } else {
      const { rows: officialDocs } = await query(
        `SELECT id, file_url, file_key, name, doc_type
         FROM employee_official_documents
         WHERE id = $1 AND employee_id = $2 AND status != 'ARCHIVED'
         LIMIT 1`,
        [docId, empId]
      ).catch(() => ({ rows: [] }));

      if (officialDocs.length > 0) {
        fileUrl = officialDocs[0].file_url;
        fileKey = officialDocs[0].file_key;
        fileName = officialDocs[0].name || `${officialDocs[0].doc_type || 'document'}`;
      }
    }

    if (!fileUrl && !fileKey) {
      return notFound(res, 'Document not found');
    }

    const url = await resolveDownloadUrl(req, fileUrl, fileKey);
    if (!url) {
      return notFound(res, 'Document file is unavailable');
    }

    return success(res, { url, fileName });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/employee/payslip-requests — Own payslip requests newest first
router.get('/payslip-requests', roleCheck('EMPLOYEE'), async (req, res, next) => {
  try {
    const empId = req.employee.id;
    const { rows } = await query(
      `SELECT id,
              COALESCE(salary_month, LPAD(year::text, 4, '0') || '-' || LPAD(month::text, 2, '0')) AS salary_month,
              status,
              COALESCE(requested_at, created_at) AS requested_at,
              COALESCE(review_note, rejection_reason) AS review_note,
              reviewed_at
       FROM payslip_requests
       WHERE employee_id = $1
       ORDER BY COALESCE(requested_at, created_at) DESC`,
      [empId]
    );

    return success(res, rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/employee/payslip-requests — Submit new payslip request for YYYY-MM
router.post('/payslip-requests', roleCheck('EMPLOYEE'), async (req, res, next) => {
  try {
    const rawMonth = String(req.body?.salary_month || '').trim();
    if (!SALARY_MONTH_REGEX.test(rawMonth)) {
      return error(res, 'salary_month must be in YYYY-MM format', 400);
    }

    const [yearStr, monthStr] = rawMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const nowYm = getCurrentKolkataYearMonth();

    if (year * 12 + month > nowYm.year * 12 + nowYm.month) {
      return error(res, 'Cannot request a payslip for a future month', 400);
    }

    const empId = req.employee.id;

    // Reject duplicate PENDING request for the same month
    const { rows: existingPending } = await query(
      `SELECT id FROM payslip_requests
       WHERE employee_id = $1
         AND status = 'PENDING'
         AND (salary_month = $2 OR (year = $3 AND month = $4))
       LIMIT 1`,
      [empId, rawMonth, year, month]
    );
    if (existingPending.length > 0) {
      return error(res, 'A pending payslip request already exists for this salary month', 409);
    }

    // Link matching payroll_record_id if one exists and isn't already linked
    const { rows: payrollRecs } = await query(
      `SELECT pr.id
       FROM payroll_records pr
       LEFT JOIN payslip_requests ps ON ps.payroll_record_id = pr.id
       WHERE pr.employee_id = $1 AND pr.year = $2 AND pr.month = $3 AND ps.id IS NULL
       LIMIT 1`,
      [empId, year, month]
    ).catch(() => ({ rows: [] }));

    const payrollRecordId = payrollRecs[0]?.id || null;

    const { rows: inserted } = await query(
      `INSERT INTO payslip_requests
         (employee_id, payroll_record_id, month, year, salary_month, status, requested_at)
       VALUES ($1, $2, $3, $4, $5, 'PENDING', NOW())
       RETURNING id, salary_month, status, requested_at, review_note, reviewed_at`,
      [empId, payrollRecordId, month, year, rawMonth]
    );

    // Notify active HR users (non-blocking)
    query(`SELECT id FROM users WHERE UPPER(role) = 'HR' AND status = 'active'`)
      .then(async ({ rows: hrUsers }) => {
        const empName = req.employee.full_name || req.employee.employee_id || 'An employee';
        for (const hr of hrUsers) {
          await createNotification(
            hr.id,
            'Payslip Request Submitted',
            `${empName} requested an official payslip for ${rawMonth}.`,
            'info',
            '/hr/payslip-requests',
            { category: 'payroll' }
          );
        }
      })
      .catch((notifyErr) => logger.warn('[PAYSLIP REQUEST] HR notification failed:', notifyErr.message));

    return created(res, inserted[0], 'Payslip request submitted to HR');
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/employee/payslip-requests/:id/download — Signed URL only when APPROVED + attached PDF + owned
router.get('/payslip-requests/:id/download', roleCheck('EMPLOYEE'), async (req, res, next) => {
  try {
    const reqId = String(req.params.id || '').trim();
    if (!UUID_REGEX.test(reqId)) {
      return error(res, 'Invalid payslip request ID', 400);
    }

    const { rows } = await query(
      `SELECT id, salary_month, year, month, status, payslip_file_key, payslip_file_name, payslip_file_url
       FROM payslip_requests
       WHERE id = $1 AND employee_id = $2
       LIMIT 1`,
      [reqId, req.employee.id]
    );

    if (rows.length === 0) {
      return notFound(res, 'Payslip request not found');
    }

    const reqRow = rows[0];
    if (String(reqRow.status || '').toUpperCase() !== 'APPROVED') {
      return forbidden(res, 'Payslip download is only available after HR approval');
    }

    if (!reqRow.payslip_file_key && !reqRow.payslip_file_url) {
      return notFound(res, 'Official payslip file is not attached to this request');
    }

    const url = await resolveDownloadUrl(req, reqRow.payslip_file_url, reqRow.payslip_file_key);
    if (!url) {
      return notFound(res, 'Official payslip file is unavailable');
    }

    const monthLabel = reqRow.salary_month || `${reqRow.year}-${String(reqRow.month).padStart(2, '0')}`;
    const fileName = reqRow.payslip_file_name || `payslip-${monthLabel}.pdf`;
    return success(res, { url, fileName });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
