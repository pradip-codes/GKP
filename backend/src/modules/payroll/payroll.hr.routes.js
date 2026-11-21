const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../../config/database');
const payrollService = require('./payroll.service');
const logger = require('../../config/logger');

// Mounted inside hr.routes.js — jwtAuth + roleCheck('HR','ADMIN','SUPER_ADMIN') already applied.

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Invalid file type. Allowed: PDF, JPG, PNG, DOC, DOCX'));
  }
});

async function saveDocumentFile(file) {
  try {
    const { uploadToS3 } = require('../../services/aws/s3.service');
    if (process.env.AWS_S3_BUCKET && process.env.AWS_ACCESS_KEY_ID) {
      return await uploadToS3(file.buffer, file.originalname, 'employee-documents');
    }
  } catch (e) {
    logger.warn(`[PAYROLL] S3 upload fallback to local: ${e.message}`);
  }
  const uploadsDir = path.join(__dirname, '../../../public/uploads/employee-documents');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  const ext = path.extname(file.originalname) || '.pdf';
  const filename = `${uuidv4()}${ext}`;
  fs.writeFileSync(path.join(uploadsDir, filename), file.buffer);
  return { url: `/uploads/employee-documents/${filename}`, key: filename };
}

// ── Salary Structures ─────────────────────────────────────────────────────────

// GET /api/v1/hr/payroll/salary-structure/:employeeId
router.get('/salary-structure/:employeeId', async (req, res, next) => {
  try {
    const structure = await payrollService.resolveSalaryStructure(req.params.employeeId);
    const { rows } = await query(
      `SELECT * FROM employee_salary_structures WHERE employee_id = $1 ORDER BY effective_from DESC LIMIT 1`,
      [req.params.employeeId]
    );
    res.json({ success: true, data: { resolved: structure, record: rows[0] || null } });
  } catch (err) { next(err); }
});

// PUT /api/v1/hr/payroll/salary-structure/:employeeId — upsert active structure
router.put('/salary-structure/:employeeId', async (req, res, next) => {
  try {
    const { basic, da, hra, special_allowance, effective_from } = req.body;
    const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };

    await query(
      `UPDATE employee_salary_structures SET is_active = false, updated_at = NOW()
       WHERE employee_id = $1 AND is_active = true`,
      [req.params.employeeId]
    );

    const { rows } = await query(
      `INSERT INTO employee_salary_structures
         (employee_id, basic, da, hra, special_allowance, effective_from, created_by)
       VALUES ($1,$2,$3,$4,$5,COALESCE($6::date, CURRENT_DATE),$7)
       RETURNING *`,
      [req.params.employeeId, num(basic), num(da), num(hra), num(special_allowance), effective_from || null, req.user.id]
    );
    res.json({ success: true, message: 'Salary structure saved', data: rows[0] });
  } catch (err) { next(err); }
});

// ── Payroll Generation & Records ──────────────────────────────────────────────

// POST /api/v1/hr/payroll/generate { month, year, employee_ids? }
router.post('/generate', async (req, res, next) => {
  try {
    const now = new Date();
    const year = parseInt(req.body.year || now.getFullYear(), 10);
    const month = parseInt(req.body.month || (now.getMonth() + 1), 10);
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return res.status(400).json({ success: false, message: 'Invalid month' });
    }
    const result = await payrollService.generateMonthlyPayroll(year, month, req.body.employee_ids || null, req.user.id);
    res.json({ success: true, message: `Payroll generated for ${result.generated}/${result.total} employees`, data: result });
  } catch (err) { next(err); }
});

// GET /api/v1/hr/payroll/records?month=&year=&status=
router.get('/records', async (req, res, next) => {
  try {
    const now = new Date();
    const year = parseInt(req.query.year || now.getFullYear(), 10);
    const month = parseInt(req.query.month || (now.getMonth() + 1), 10);
    const status = req.query.status || null;

    const conditions = ['pr.year = $1', 'pr.month = $2'];
    const params = [year, month];
    if (status) { params.push(status); conditions.push(`pr.status = $${params.length}`); }

    const { rows } = await query(
      `SELECT pr.*, e.employee_id AS emp_code, e.full_name, e.designation, e.department,
              u.email
       FROM payroll_records pr
       JOIN employees e ON e.id = pr.employee_id
       LEFT JOIN users u ON u.id = e.user_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY e.full_name ASC`,
      params
    );
    res.json({
      success: true,
      data: rows.map((r) => ({
        ...r,
        gross_earnings: parseFloat(r.gross_earnings),
        total_deductions: parseFloat(r.total_deductions),
        net_pay: parseFloat(r.net_pay),
        incentive_amount: parseFloat(r.incentive_amount)
      }))
    });
  } catch (err) { next(err); }
});

// POST /api/v1/hr/payroll/records/:id/approve
router.post('/records/:id/approve', async (req, res, next) => {
  try {
    const { rows } = await query(
      `UPDATE payroll_records SET status = 'APPROVED', approved_by = $2, approved_at = NOW(),
              rejection_reason = NULL, updated_at = NOW()
       WHERE id = $1 AND status IN ('PENDING_APPROVAL','DRAFT','REJECTED')
       RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Record not found or already finalized' });
    res.json({ success: true, message: 'Payroll approved', data: rows[0] });
  } catch (err) { next(err); }
});

// POST /api/v1/hr/payroll/records/:id/reject { reason }
router.post('/records/:id/reject', async (req, res, next) => {
  try {
    const reason = (req.body.reason || '').trim();
    if (!reason) return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    const { rows } = await query(
      `UPDATE payroll_records SET status = 'REJECTED', rejection_reason = $2, updated_at = NOW()
       WHERE id = $1 AND status IN ('PENDING_APPROVAL','DRAFT','APPROVED')
       RETURNING *`,
      [req.params.id, reason]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Record not found or already paid' });
    res.json({ success: true, message: 'Payroll rejected', data: rows[0] });
  } catch (err) { next(err); }
});

// POST /api/v1/hr/payroll/records/bulk-approve { month, year }
router.post('/records/bulk-approve', async (req, res, next) => {
  try {
    const year = parseInt(req.body.year, 10);
    const month = parseInt(req.body.month, 10);
    const { rows } = await query(
      `UPDATE payroll_records SET status = 'APPROVED', approved_by = $3, approved_at = NOW(), updated_at = NOW()
       WHERE year = $1 AND month = $2 AND status = 'PENDING_APPROVAL'
       RETURNING id`,
      [year, month, req.user.id]
    );
    res.json({ success: true, message: `${rows.length} payroll records approved`, data: { count: rows.length } });
  } catch (err) { next(err); }
});

// POST /api/v1/hr/payroll/records/:id/mark-paid
router.post('/records/:id/mark-paid', async (req, res, next) => {
  try {
    const { rows } = await query(
      `UPDATE payroll_records SET status = 'PAID', paid_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND status = 'APPROVED' RETURNING *`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Record not found or not approved' });
    res.json({ success: true, message: 'Marked as paid', data: rows[0] });
  } catch (err) { next(err); }
});

// ── Payslip Requests ──────────────────────────────────────────────────────────

// GET /api/v1/hr/payroll/payslip-requests?status=PENDING
router.get('/payslip-requests', async (req, res, next) => {
  try {
    const status = req.query.status || 'PENDING';
    const { rows } = await query(
      `SELECT ps.*, e.employee_id AS emp_code, e.full_name, e.designation, u.email,
              pr.month, pr.year, pr.net_pay, pr.gross_earnings, pr.status AS payroll_status
       FROM payslip_requests ps
       JOIN employees e ON e.id = ps.employee_id
       LEFT JOIN users u ON u.id = e.user_id
       JOIN payroll_records pr ON pr.id = ps.payroll_record_id
       WHERE ps.status = $1
       ORDER BY ps.created_at DESC`,
      [status]
    );
    res.json({
      success: true,
      data: rows.map((r) => ({ ...r, net_pay: parseFloat(r.net_pay || 0), gross_earnings: parseFloat(r.gross_earnings || 0) }))
    });
  } catch (err) { next(err); }
});

// POST /api/v1/hr/payroll/payslip-requests/:id/approve
router.post('/payslip-requests/:id/approve', async (req, res, next) => {
  try {
    const { rows } = await query(
      `UPDATE payslip_requests SET status = 'APPROVED', reviewed_by = $2, reviewed_at = NOW(),
              rejection_reason = NULL, updated_at = NOW()
       WHERE id = $1 AND status = 'PENDING' RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Request not found or already reviewed' });
    res.json({ success: true, message: 'Payslip request approved — employee can now download', data: rows[0] });
  } catch (err) { next(err); }
});

// POST /api/v1/hr/payroll/payslip-requests/:id/reject { reason }
router.post('/payslip-requests/:id/reject', async (req, res, next) => {
  try {
    const reason = (req.body.reason || '').trim();
    if (!reason) return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    const { rows } = await query(
      `UPDATE payslip_requests SET status = 'REJECTED', rejection_reason = $2,
              reviewed_by = $3, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND status = 'PENDING' RETURNING *`,
      [req.params.id, reason, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Request not found or already reviewed' });
    res.json({ success: true, message: 'Payslip request rejected', data: rows[0] });
  } catch (err) { next(err); }
});

// ── Employee Documents ────────────────────────────────────────────────────────

const DOC_TYPES = ['PAYSLIP', 'PF_STATEMENT', 'FORM16', 'SALARY_CERT', 'EMPLOYMENT_CERT', 'BANK_PROOF', 'OTHER'];

// GET /api/v1/hr/payroll/documents?employee_id=
router.get('/documents', async (req, res, next) => {
  try {
    const params = [];
    let where = '';
    if (req.query.employee_id) { params.push(req.query.employee_id); where = `WHERE d.employee_id = $1`; }
    const { rows } = await query(
      `SELECT d.*, e.employee_id AS emp_code, e.full_name
       FROM employee_official_documents d
       JOIN employees e ON e.id = d.employee_id
       ${where}
       ORDER BY d.created_at DESC LIMIT 200`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// POST /api/v1/hr/payroll/documents — upload document for an employee
router.post('/documents', upload.single('file'), async (req, res, next) => {
  try {
    const { employee_id, doc_type, name, period, issued_on } = req.body;
    if (!employee_id || !doc_type || !name) {
      return res.status(400).json({ success: false, message: 'employee_id, doc_type and name are required' });
    }
    if (!DOC_TYPES.includes(doc_type)) {
      return res.status(400).json({ success: false, message: `doc_type must be one of: ${DOC_TYPES.join(', ')}` });
    }
    const { rows: emp } = await query(`SELECT id FROM employees WHERE id = $1`, [employee_id]);
    if (emp.length === 0) return res.status(404).json({ success: false, message: 'Employee not found' });

    let fileUrl = null, fileKey = null, fileSize = null, mimeType = null;
    if (req.file) {
      const saved = await saveDocumentFile(req.file);
      fileUrl = saved.url; fileKey = saved.key || null;
      fileSize = req.file.size; mimeType = req.file.mimetype;
    }

    const { rows } = await query(
      `INSERT INTO employee_official_documents
         (employee_id, doc_type, name, period, issued_on, file_url, file_key, file_size, mime_type, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [employee_id, doc_type, name, period || null, issued_on || null,
       fileUrl, fileKey, fileSize, mimeType, req.user.id]
    );
    res.json({ success: true, message: 'Document uploaded', data: rows[0] });
  } catch (err) { next(err); }
});

// DELETE /api/v1/hr/payroll/documents/:id
router.delete('/documents/:id', async (req, res, next) => {
  try {
    const { rows } = await query(
      `UPDATE employee_official_documents SET status = 'ARCHIVED', updated_at = NOW()
       WHERE id = $1 RETURNING id`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Document not found' });
    res.json({ success: true, message: 'Document archived' });
  } catch (err) { next(err); }
});

// GET /api/v1/hr/payroll/employees — lightweight employee list for pickers
router.get('/employees', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT e.id, e.employee_id AS emp_code, e.full_name, e.designation, e.department, e.offered_salary
       FROM employees e
       WHERE e.employee_status IN ('ACTIVE','ONBOARDING')
       ORDER BY e.full_name ASC LIMIT 500`
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

module.exports = router;
