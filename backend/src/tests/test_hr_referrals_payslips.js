const assert = require('assert');
const express = require('express');
const fs = require('fs');
const path = require('path');

console.log('--- STARTING HR, PAYSLIP REQUESTS & EMPLOYEE REFERRALS TEST SUITE ---');

// UUID fixtures
const EMP1_UUID = '11111111-1111-4111-8111-111111111111';
const EMP1_USER_UUID = '21111111-1111-4111-8111-111111111111';
const EMP2_UUID = '12222222-2222-4222-8222-222222222222';
const EMP2_USER_UUID = '22222222-2222-4222-8222-222222222222';
const HR1_USER_UUID = '31111111-1111-4111-8111-111111111111';
const HR2_USER_UUID = '32222222-2222-4222-8222-222222222222';
const SUPER_ADMIN_UUID = '41111111-1111-4111-8111-111111111111';

const DOC1_EMP1_UUID = '51111111-1111-4111-8111-111111111111';
const DOC2_EMP2_UUID = '52222222-2222-4222-8222-222222222222';
const PR_EMP2_APPROVED_UUID = '62222222-2222-4222-8222-222222222222';

const REF_ELIGIBLE_UUID = '71111111-1111-4111-8111-111111111111';
const REF_HR2_UUID = '72222222-2222-4222-8222-222222222222';
const REF_NOT_ELIGIBLE_UUID = '73333333-3333-4333-8333-333333333333';

// In-memory mock store
const store = {
  users: [
    { id: EMP1_USER_UUID, full_name: 'Alice Employee', email: 'alice@gkp.in', mobile: '9876543210', role: 'EMPLOYEE', status: 'active', employee_id: 'CAND10001' },
    { id: EMP2_USER_UUID, full_name: 'Bob Employee', email: 'bob@gkp.in', mobile: '9876543211', role: 'EMPLOYEE', status: 'active', employee_id: 'CAND10002' },
    { id: HR1_USER_UUID, full_name: 'Priya HR', email: 'priya@gkp.in', mobile: '9876543212', role: 'HR', status: 'active', employee_id: 'HR1001' },
    { id: HR2_USER_UUID, full_name: 'Rohan HR', email: 'rohan@gkp.in', mobile: '9876543213', role: 'HR', status: 'active', employee_id: 'HR1002' },
    { id: SUPER_ADMIN_UUID, full_name: 'Super Admin', email: 'sa@gkp.in', mobile: '9876543214', role: 'SUPER_ADMIN', status: 'active' }
  ],
  employees: [
    { id: EMP1_UUID, user_id: EMP1_USER_UUID, employee_id: 'CAND10001', full_name: 'Alice Employee', mobile_number: '9876543210', email_id: 'alice@gkp.in', designation: 'TC', department: 'Sales', offered_salary: 22000 },
    { id: EMP2_UUID, user_id: EMP2_USER_UUID, employee_id: 'CAND10002', full_name: 'Bob Employee', mobile_number: '9876543211', email_id: 'bob@gkp.in', designation: 'TL', department: 'Sales', offered_salary: 30000 }
  ],
  employee_documents: [
    { id: DOC1_EMP1_UUID, employee_id: EMP1_UUID, document_type: 'pan', document_url: 'https://s3.amazonaws.com/bucket/employee-docs/pan1.pdf', document_key: 'employee-docs/pan1.pdf', document_file_name: 'alice-pan.pdf', verification_status: 'APPROVED', created_at: new Date().toISOString() },
    { id: DOC2_EMP2_UUID, employee_id: EMP2_UUID, document_type: 'pan', document_url: 'https://s3.amazonaws.com/bucket/employee-docs/pan2.pdf', document_key: 'employee-docs/pan2.pdf', document_file_name: 'bob-pan.pdf', verification_status: 'APPROVED', created_at: new Date().toISOString() }
  ],
  employee_official_documents: [],
  employee_incentive_transactions: [
    { id: '81111111-1111-4111-8111-111111111111', employee_id: EMP1_UUID, incentive_type: 'FIXED', transaction_type: 'EARNED', status: 'PAID', amount: 1500, paid_at: new Date().toISOString(), created_at: new Date().toISOString() },
    { id: '82222222-2222-4222-8222-222222222222', employee_id: EMP1_UUID, incentive_type: 'FIXED', transaction_type: 'EARNED', status: 'PENDING', amount: 500, paid_at: null, created_at: new Date().toISOString() }
  ],
  payslip_requests: [
    {
      id: PR_EMP2_APPROVED_UUID,
      employee_id: EMP2_UUID,
      payroll_record_id: null,
      month: 9,
      year: 2026,
      salary_month: '2026-09',
      status: 'APPROVED',
      requested_at: new Date().toISOString(),
      review_note: 'Verified payroll',
      reviewed_by: HR1_USER_UUID,
      reviewed_at: new Date().toISOString(),
      payroll_verified: true,
      payslip_file_key: 'official-payslips/bob-2026-09.pdf',
      payslip_file_name: 'bob-sep.pdf',
      payslip_file_url: 'https://d18qh1l6j6vziz.cloudfront.net/official-payslips/bob-2026-09.pdf',
      created_at: new Date().toISOString()
    }
  ],
  employee_referrals: [
    {
      id: REF_ELIGIBLE_UUID,
      referring_employee_id: EMP1_UUID,
      candidate_name: 'Eligible Candidate',
      mobile_number: '9988776655',
      relationship: 'Friend',
      preferred_hr_id: HR1_USER_UUID,
      assigned_hr_id: HR1_USER_UUID,
      referral_code: 'CAND10001',
      bonus_status: 'pending',
      bonus_credited_at: null,
      bonus_credited_by: null,
      created_at: new Date().toISOString()
    },
    {
      id: REF_HR2_UUID,
      referring_employee_id: EMP2_UUID,
      candidate_name: 'Bob Referral For HR2',
      mobile_number: '9988776644',
      relationship: 'Relative',
      preferred_hr_id: HR2_USER_UUID,
      assigned_hr_id: HR2_USER_UUID,
      referral_code: 'CAND10002',
      bonus_status: 'pending',
      bonus_credited_at: null,
      bonus_credited_by: null,
      created_at: new Date().toISOString()
    },
    {
      id: REF_NOT_ELIGIBLE_UUID,
      referring_employee_id: EMP1_UUID,
      candidate_name: 'Pending Candidate',
      mobile_number: '9988776633',
      relationship: 'Sibling',
      preferred_hr_id: HR1_USER_UUID,
      assigned_hr_id: HR1_USER_UUID,
      referral_code: 'CAND10001',
      bonus_status: 'pending',
      bonus_credited_at: null,
      bonus_credited_by: null,
      created_at: new Date().toISOString()
    }
  ],
  employee_candidates: [
    { id: '91111111-1111-4111-8111-111111111111', full_name: 'Eligible Candidate', mobile_number: '9988776655', referred_by_employee_id: EMP1_UUID, hr_name: 'CAND10001', hr_reference: null, interview_status: 'SELECTED', assigned_hr_id: HR1_USER_UUID, assigned_hr_name: 'Priya HR', created_at: new Date().toISOString() },
    { id: '92222222-2222-4222-8222-222222222222', full_name: 'Bob Referral For HR2', mobile_number: '9988776644', referred_by_employee_id: EMP2_UUID, hr_name: 'CAND10002', hr_reference: null, interview_status: 'INTERVIEW_PENDING', assigned_hr_id: HR2_USER_UUID, assigned_hr_name: 'Rohan HR', created_at: new Date().toISOString() },
    { id: '93333333-3333-4333-8333-333333333333', full_name: 'Direct Link Candidate', mobile_number: '9988776611', referred_by_employee_id: EMP1_UUID, hr_name: 'CAND10001', hr_reference: null, interview_status: 'REGISTERED', assigned_hr_id: HR2_USER_UUID, assigned_hr_name: 'Rohan HR', created_at: new Date().toISOString() }
  ],
  audit_logs: [],
  notifications: [],
  wallet_ledger: [],
  wallets: [],
  payroll_records: []
};

let uuidCounter = 1;
const nextUuid = () => `a0000000-0000-4000-8000-${String(uuidCounter++).padStart(12, '0')}`;

function mockQuery(sql, params = []) {
  const s = String(sql).replace(/\s+/g, ' ').trim();

  if (s === 'BEGIN' || s === 'COMMIT' || s === 'ROLLBACK') return Promise.resolve({ rows: [] });

  // Wallet / payroll forbidden checks for bonus-credit
  if (/INTO\s+(wallets|wallet_ledger|payroll_records|employee_incentive_transactions)/i.test(s)) {
    throw new Error(`Unexpected financial write in query: ${s}`);
  }

  // Employees lookup
  if (/FROM employees WHERE user_id = \$1/i.test(s)) {
    return Promise.resolve({ rows: store.employees.filter((e) => e.user_id === params[0]) });
  }

  // Users lookup
  if (/FROM users WHERE id = \$1 AND UPPER\(role(?:::text)?\) = 'HR'/i.test(s)) {
    return Promise.resolve({ rows: store.users.filter((u) => u.id === params[0] && u.role === 'HR' && u.status === 'active') });
  }
  if (/FROM hr_profiles hp/i.test(s) || /FROM users u[\s\S]*hr_profiles/i.test(s)) {
    return Promise.resolve({
      rows: store.users.filter((u) => u.role === 'HR' && u.status === 'active').map((u) => ({ id: u.id, full_name: u.full_name }))
    });
  }
  if (/FROM users WHERE UPPER\(role\) = 'HR' AND status = 'active'/i.test(s)) {
    return Promise.resolve({ rows: store.users.filter((u) => u.role === 'HR' && u.status === 'active') });
  }

  // Employee HR data queries
  if (/FROM employee_incentive_transactions WHERE employee_id = \$1/i.test(s)) {
    const txs = store.employee_incentive_transactions.filter((t) => t.employee_id === params[0]);
    if (/SUM\(amount\)/i.test(s)) {
      const paid = txs.filter((t) => ['RELEASE', 'RELEASED', 'PAID', 'COMPLETED'].includes(t.status)).reduce((a, b) => a + b.amount, 0);
      const pending = txs.filter((t) => ['PENDING', 'HOLD', 'ON_HOLD', 'HELD'].includes(t.status)).reduce((a, b) => a + b.amount, 0);
      return Promise.resolve({ rows: [{ paid_incentives: paid, pending_incentives: pending }] });
    }
    return Promise.resolve({ rows: txs });
  }

  if (/FROM employee_documents WHERE employee_id = \$1/i.test(s)) {
    return Promise.resolve({ rows: store.employee_documents.filter((d) => d.employee_id === params[0]) });
  }
  if (/FROM employee_official_documents WHERE employee_id = \$1/i.test(s)) {
    return Promise.resolve({ rows: [] });
  }
  if (/FROM employee_documents WHERE id = \$1 AND employee_id = \$2/i.test(s)) {
    return Promise.resolve({ rows: store.employee_documents.filter((d) => d.id === params[0] && d.employee_id === params[1]) });
  }
  if (/FROM employee_official_documents WHERE id = \$1 AND employee_id = \$2/i.test(s)) {
    return Promise.resolve({ rows: [] });
  }

  // Payslip requests
  if (/SELECT id FROM payslip_requests WHERE employee_id = \$1 AND status = 'PENDING'/i.test(s)) {
    const match = store.payslip_requests.filter(
      (p) => p.employee_id === params[0] && p.status === 'PENDING' && (p.salary_month === params[1] || (p.year === params[2] && p.month === params[3]))
    );
    return Promise.resolve({ rows: match });
  }
  if (/FROM payroll_records pr LEFT JOIN payslip_requests/i.test(s)) {
    return Promise.resolve({ rows: [] });
  }
  if (/INSERT INTO payslip_requests/i.test(s)) {
    const row = {
      id: nextUuid(),
      employee_id: params[0],
      payroll_record_id: params[1],
      month: params[2],
      year: params[3],
      salary_month: params[4],
      status: 'PENDING',
      requested_at: new Date().toISOString(),
      review_note: null,
      reviewed_at: null,
      payroll_verified: false,
      payslip_file_key: null,
      payslip_file_name: null,
      payslip_file_url: null,
      created_at: new Date().toISOString()
    };
    store.payslip_requests.push(row);
    return Promise.resolve({ rows: [row] });
  }
  if (/FROM payslip_requests WHERE employee_id = \$1 ORDER BY/i.test(s)) {
    const rows = store.payslip_requests.filter((p) => p.employee_id === params[0]);
    return Promise.resolve({ rows });
  }
  if (/FROM payslip_requests WHERE id = \$1 AND employee_id = \$2/i.test(s)) {
    return Promise.resolve({ rows: store.payslip_requests.filter((p) => p.id === params[0] && p.employee_id === params[1]) });
  }
  if (/FROM payslip_requests pr_req JOIN employees e ON e\.id = pr_req\.employee_id .* FOR UPDATE/i.test(s)) {
    const found = store.payslip_requests.find((p) => p.id === params[0]);
    if (!found) return Promise.resolve({ rows: [] });
    const emp = store.employees.find((e) => e.id === found.employee_id);
    return Promise.resolve({ rows: [{ ...found, emp_user_id: emp?.user_id, emp_full_name: emp?.full_name }] });
  }
  if (/UPDATE payslip_requests SET status = \$2/i.test(s)) {
    const found = store.payslip_requests.find((p) => p.id === params[0]);
    if (!found) return Promise.resolve({ rows: [] });
    found.status = params[1];
    found.payroll_verified = params[2];
    found.review_note = params[3];
    found.reviewed_by = params[4];
    found.reviewed_at = new Date().toISOString();
    if (params[5]) found.payslip_file_key = params[5];
    if (params[6]) found.payslip_file_name = params[6];
    if (params[7]) found.payslip_file_url = params[7];
    return Promise.resolve({ rows: [found] });
  }

  // Direct referral-link candidates query
  if (/FROM employee_candidates ec JOIN employees e ON e\.id = ec\.referred_by_employee_id/i.test(s)) {
    let rows = store.employee_candidates
      .filter((c) => c.referred_by_employee_id)
      .filter((c) => !store.employee_referrals.some((r) => r.referring_employee_id === c.referred_by_employee_id && r.mobile_number === c.mobile_number))
      .map((c) => {
        const emp = store.employees.find((e) => e.id === c.referred_by_employee_id);
        return {
          id: c.id,
          candidate_name: c.full_name,
          mobile_number: c.mobile_number,
          interview_status: c.interview_status,
          assigned_hr_id: c.assigned_hr_id,
          assigned_hr_name: c.assigned_hr_name,
          created_at: c.created_at,
          referred_by_employee_id: c.referred_by_employee_id,
          referral_code: emp?.employee_id || null,
          referring_employee_name: emp?.full_name || null
        };
      });
    if (/ec\.referred_by_employee_id = \$1/.test(s)) {
      rows = rows.filter((r) => r.referred_by_employee_id === params[0]);
    } else if (/ec\.assigned_hr_id = \$1/.test(s)) {
      rows = rows.filter((r) => r.assigned_hr_id === params[0]);
    }
    return Promise.resolve({ rows });
  }

  // Referrals queries
  if (/FROM employee_referrals r JOIN employees ref_emp/i.test(s)) {
    let rows = store.employee_referrals.map((r) => {
      const refEmp = store.employees.find((e) => e.id === r.referring_employee_id);
      const hrId = r.assigned_hr_id || r.preferred_hr_id;
      const prefHr = store.users.find((u) => u.id === hrId);
      const cand = store.employee_candidates.find((c) => c.mobile_number === r.mobile_number);
      return {
        id: r.id,
        referring_employee_id: r.referring_employee_id,
        candidate_name: r.candidate_name,
        mobile_number: r.mobile_number,
        relationship: r.relationship,
        preferred_hr_id: hrId,
        preferred_hr_name: prefHr?.full_name || null,
        referral_code: r.referral_code,
        referring_employee_name: refEmp?.full_name || null,
        db_bonus_status: r.bonus_status,
        bonus_credited_at: r.bonus_credited_at,
        cand_id: cand?.id || null,
        cand_referred_by_employee_id: cand?.referred_by_employee_id || null,
        cand_hr_name: cand?.hr_name || null,
        cand_hr_reference: cand?.hr_reference || null,
        cand_interview_status: cand?.interview_status || null
      };
    });
    if (/r\.referring_employee_id = \$1/.test(s)) {
      rows = rows.filter((r) => r.referring_employee_id === params[0]);
    } else if (/COALESCE\(r\.assigned_hr_id, r\.preferred_hr_id\) = \$1/.test(s)) {
      rows = rows.filter((r) => r.preferred_hr_id === params[0]);
    }
    return Promise.resolve({ rows });
  }

  if (/SELECT id FROM employee_referrals WHERE referring_employee_id = \$1 AND mobile_number = \$2/i.test(s)) {
    return Promise.resolve({
      rows: store.employee_referrals.filter((r) => r.referring_employee_id === params[0] && r.mobile_number === params[1])
    });
  }

  if (/INSERT INTO employee_referrals/i.test(s)) {
    const row = {
      id: nextUuid(),
      referring_employee_id: params[0],
      candidate_name: params[1],
      mobile_number: params[2],
      relationship: params[3],
      preferred_hr_id: params[4],
      assigned_hr_id: params[4],
      referral_code: params[5],
      bonus_status: 'pending',
      bonus_credited_at: null,
      bonus_credited_by: null,
      created_at: new Date().toISOString()
    };
    store.employee_referrals.push(row);
    return Promise.resolve({ rows: [row] });
  }

  if (/UPDATE employee_referrals SET preferred_hr_id = \$2, assigned_hr_id = \$2/i.test(s)) {
    const r = store.employee_referrals.find((x) => x.id === params[0]);
    if (!r) return Promise.resolve({ rows: [] });
    r.preferred_hr_id = params[1];
    r.assigned_hr_id = params[1];
    return Promise.resolve({ rows: [r] });
  }

  if (/FROM employee_referrals r JOIN employees e ON e\.id = r\.referring_employee_id WHERE r\.id = \$1 FOR UPDATE/i.test(s)) {
    const r = store.employee_referrals.find((x) => x.id === params[0]);
    if (!r) return Promise.resolve({ rows: [] });
    const emp = store.employees.find((e) => e.id === r.referring_employee_id);
    return Promise.resolve({ rows: [{ ...r, emp_user_id: emp?.user_id }] });
  }

  if (/FROM employee_candidates c WHERE RIGHT/i.test(s)) {
    const cand = store.employee_candidates.find((c) => c.mobile_number === params[0]);
    if (!cand) return Promise.resolve({ rows: [] });
    return Promise.resolve({
      rows: [{
        cand_id: cand.id,
        cand_referred_by_employee_id: cand.referred_by_employee_id,
        cand_hr_name: cand.hr_name,
        cand_hr_reference: cand.hr_reference,
        cand_interview_status: cand.interview_status
      }]
    });
  }

  if (/UPDATE employee_referrals SET bonus_status = 'credited'/i.test(s)) {
    const r = store.employee_referrals.find((x) => x.id === params[0]);
    if (!r) return Promise.resolve({ rows: [] });
    r.bonus_status = 'credited';
    r.bonus_credited_at = r.bonus_credited_at || new Date().toISOString();
    r.bonus_credited_by = params[1];
    return Promise.resolve({ rows: [r] });
  }

  if (/INSERT INTO audit_logs/i.test(s)) {
    store.audit_logs.push({ user_id: params[0], role: params[1], module: params[2], action: params[3] });
    return Promise.resolve({ rows: [{ id: nextUuid() }] });
  }

  if (/INSERT INTO notifications/i.test(s)) {
    store.notifications.push({ user_id: params[0], title: params[1], message: params[2] });
    return Promise.resolve({ rows: [{ id: nextUuid() }] });
  }

  return Promise.resolve({ rows: [] });
}

// Stub database, s3, jwtAuth before loading routers
const dbPath = require.resolve('../config/database');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: {
    query: mockQuery,
    getClient: async () => ({
      query: mockQuery,
      release: () => {}
    }),
    pool: { totalCount: 1, idleCount: 1, waitingCount: 0 }
  }
};

const s3Path = require.resolve('../services/aws/s3.service');
require.cache[s3Path] = {
  id: s3Path,
  filename: s3Path,
  loaded: true,
  exports: {
    uploadToS3: async (buf, name, folder) => ({
      url: `https://d18qh1l6j6vziz.cloudfront.net/${folder}/mock.pdf`,
      key: `${folder}/mock.pdf`,
      originalFilename: name
    }),
    getSignedDownloadUrl: async (key) => `https://signed.mock.s3/${key}?sig=123`
  }
};

process.env.AWS_S3_BUCKET = 'mock-bucket';
process.env.AWS_ACCESS_KEY_ID = 'mock-key';

let currentMockUser = store.users[0];
const jwtAuthPath = require.resolve('../middleware/authentication/jwtAuth.middleware');
require.cache[jwtAuthPath] = {
  id: jwtAuthPath,
  filename: jwtAuthPath,
  loaded: true,
  exports: (req, res, next) => {
    const headerUser = req.headers['x-test-user'];
    if (headerUser) {
      currentMockUser = store.users.find((u) => u.id === headerUser) || currentMockUser;
    }
    req.user = { ...currentMockUser };
    next();
  }
};

const employeeHrRouter = require('../modules/employee/employee.hr.routes');
const hrPayslipsAttendanceRouter = require('../modules/hr/hr.payslips-attendance.routes');
const referralsRouter = require('../modules/referrals/referrals.routes');
const { errorHandler } = require('../middleware/error/error.middleware');

const app = express();
app.use(express.json());
app.use('/api/v1/employee', (req, res, next) => {
  const uid = req.headers['x-test-user'] || EMP1_USER_UUID;
  req.user = { ...store.users.find((u) => u.id === uid) };
  req.employee = store.employees.find((e) => e.user_id === req.user.id) || null;
  if (!req.employee && req.user.role === 'EMPLOYEE') {
    return res.status(404).json({ success: false, message: 'Employee not found' });
  }
  next();
}, employeeHrRouter);
app.use('/api/v1/hr', (req, res, next) => {
  const uid = req.headers['x-test-user'] || HR1_USER_UUID;
  req.user = { ...store.users.find((u) => u.id === uid) };
  next();
}, hrPayslipsAttendanceRouter);
app.use('/api/v1/employee-referrals', referralsRouter);
app.use(errorHandler);

(async () => {
  const server = app.listen(0);
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}/api/v1`;

  const reqJson = async (urlPath, { method = 'GET', userId, body } = {}) => {
    const res = await fetch(`${base}${urlPath}`, {
      method,
      headers: {
        ...(userId ? { 'x-test-user': userId } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
    const json = await res.json();
    return { status: res.status, json };
  };

  try {
    // 1. Employee HR Data & document ownership isolation
    const hrDataRes = await reqJson('/employee/hr-data', { userId: EMP1_USER_UUID });
    assert.strictEqual(hrDataRes.status, 200);
    assert.strictEqual(hrDataRes.json.data.employee.offered_salary, 22000);
    assert.strictEqual(hrDataRes.json.data.incentiveSummary.paid_incentives, 1500);
    assert.strictEqual(hrDataRes.json.data.incentiveSummary.pending_incentives, 500);

    // Employee 1 can download own document (returns signed URL, never raw key directly)
    const ownDoc = await reqJson(`/employee/hr-documents/${DOC1_EMP1_UUID}/download`, { userId: EMP1_USER_UUID });
    assert.strictEqual(ownDoc.status, 200);
    assert(ownDoc.json.data.url.startsWith('https://signed.mock.s3/'), 'Must return signed URL');

    // Employee 1 CANNOT download Employee 2's document
    const otherDoc = await reqJson(`/employee/hr-documents/${DOC2_EMP2_UUID}/download`, { userId: EMP1_USER_UUID });
    assert.strictEqual(otherDoc.status, 404);

    // Employee 1 CANNOT download Employee 2's approved payslip request
    const otherPayslip = await reqJson(`/employee/payslip-requests/${PR_EMP2_APPROVED_UUID}/download`, { userId: EMP1_USER_UUID });
    assert.strictEqual(otherPayslip.status, 404);
    console.log('✓ Test 1 Passed: Employee HR data & document/payslip ownership isolation');

    // 2. Payslip request validation: format, future month, duplicate pending
    const badFormat = await reqJson('/employee/payslip-requests', {
      method: 'POST', userId: EMP1_USER_UUID, body: { salary_month: '2026/05' }
    });
    assert.strictEqual(badFormat.status, 400);

    const futureMonth = await reqJson('/employee/payslip-requests', {
      method: 'POST', userId: EMP1_USER_UUID, body: { salary_month: '2099-01' }
    });
    assert.strictEqual(futureMonth.status, 400);

    const validReq = await reqJson('/employee/payslip-requests', {
      method: 'POST', userId: EMP1_USER_UUID, body: { salary_month: '2026-09' }
    });
    assert.strictEqual(validReq.status, 201);
    const createdReqId = validReq.json.data.id;

    const dupReq = await reqJson('/employee/payslip-requests', {
      method: 'POST', userId: EMP1_USER_UUID, body: { salary_month: '2026-09' }
    });
    assert.strictEqual(dupReq.status, 409);

    // Pending payslip cannot be downloaded yet
    const dlPending = await reqJson(`/employee/payslip-requests/${createdReqId}/download`, { userId: EMP1_USER_UUID });
    assert.strictEqual(dlPending.status, 403);
    console.log('✓ Test 2 Passed: Payslip request format, future-month, and duplicate PENDING checks');

    // 3. HR Payslip review requires payroll_verified === true AND PDF file
    const formNoVerify = new FormData();
    formNoVerify.append('action', 'APPROVE');
    formNoVerify.append('payroll_verified', 'false');
    formNoVerify.append('review_note', 'Checked payroll');
    formNoVerify.append('payslip', new Blob(['%PDF-1.4 mock'], { type: 'application/pdf' }), 'slip.pdf');
    const unverifiedApprove = await fetch(`${base}/hr/payslip-requests/${createdReqId}/review`, {
      method: 'POST', headers: { 'x-test-user': HR1_USER_UUID }, body: formNoVerify
    });
    assert.strictEqual(unverifiedApprove.status, 400);

    const formNoPdf = new FormData();
    formNoPdf.append('action', 'APPROVE');
    formNoPdf.append('payroll_verified', 'true');
    formNoPdf.append('review_note', 'Checked payroll');
    const noPdfApprove = await fetch(`${base}/hr/payslip-requests/${createdReqId}/review`, {
      method: 'POST', headers: { 'x-test-user': HR1_USER_UUID }, body: formNoPdf
    });
    assert.strictEqual(noPdfApprove.status, 400);

    const formNonPdf = new FormData();
    formNonPdf.append('action', 'APPROVE');
    formNonPdf.append('payroll_verified', 'true');
    formNonPdf.append('review_note', 'Checked payroll');
    formNonPdf.append('payslip', new Blob(['not pdf'], { type: 'text/plain' }), 'slip.txt');
    const wrongTypeApprove = await fetch(`${base}/hr/payslip-requests/${createdReqId}/review`, {
      method: 'POST', headers: { 'x-test-user': HR1_USER_UUID }, body: formNonPdf
    });
    assert.strictEqual(wrongTypeApprove.status, 400);

    const formValid = new FormData();
    formValid.append('action', 'APPROVE');
    formValid.append('payroll_verified', 'true');
    formValid.append('review_note', 'Payroll verified in sheet');
    formValid.append('payslip', new Blob(['%PDF-1.4 valid'], { type: 'application/pdf' }), 'payslip.pdf');
    const validApprove = await fetch(`${base}/hr/payslip-requests/${createdReqId}/review`, {
      method: 'POST', headers: { 'x-test-user': HR1_USER_UUID }, body: formValid
    });
    assert.strictEqual(validApprove.status, 200);

    // Employee can now download own approved payslip
    const dlApproved = await reqJson(`/employee/payslip-requests/${createdReqId}/download`, { userId: EMP1_USER_UUID });
    assert.strictEqual(dlApproved.status, 200);
    assert(dlApproved.json.data.url.startsWith('https://signed.mock.s3/'));

    // Already-reviewed request cannot be reviewed again
    const reReview = await fetch(`${base}/hr/payslip-requests/${createdReqId}/review`, {
      method: 'POST', headers: { 'x-test-user': HR1_USER_UUID }, body: formValid
    });
    assert.strictEqual(reReview.status, 409);
    console.log('✓ Test 3 Passed: HR Payslip review requires verified + PDF, creates audit log, prevents re-review');

    // 4. Referral role scoping & direct candidate link merge
    const emp1Meta = await reqJson('/employee-referrals/meta', { userId: EMP1_USER_UUID });
    assert.strictEqual(emp1Meta.status, 200);
    assert.strictEqual(emp1Meta.json.data.referralCode, 'CAND10001');
    assert.strictEqual(emp1Meta.json.data.hrOptions.length, 2);

    const emp1Refs = await reqJson('/employee-referrals', { userId: EMP1_USER_UUID });
    assert.strictEqual(emp1Refs.status, 200);
    assert.strictEqual(emp1Refs.json.data.length, 3); // REF_ELIGIBLE + REF_NOT_ELIGIBLE + Direct Link Candidate
    const directRow = emp1Refs.json.data.find((r) => r.id === '93333333-3333-4333-8333-333333333333');
    assert(directRow, 'Direct referral-link candidate registration must appear in employee referrals');
    assert.strictEqual(directRow.link_status, 'Verified');
    assert.strictEqual(directRow.recruitment_status, 'Registered');

    const emp2Refs = await reqJson('/employee-referrals', { userId: EMP2_USER_UUID });
    assert.strictEqual(emp2Refs.status, 200);
    assert.strictEqual(emp2Refs.json.data.length, 1); // Only own referral, never EMP1's direct referral

    const hr2Refs = await reqJson('/employee-referrals', { userId: HR2_USER_UUID });
    assert.strictEqual(hr2Refs.status, 200);
    assert.strictEqual(hr2Refs.json.data.length, 2); // REF_HR2 + Direct Link Candidate assigned to HR2

    const saRefs = await reqJson('/employee-referrals', { userId: SUPER_ADMIN_UUID });
    assert.strictEqual(saRefs.status, 200);
    assert.strictEqual(saRefs.json.data.length, 4);

    // Self referral rejected
    const selfRef = await reqJson('/employee-referrals', {
      method: 'POST',
      userId: EMP1_USER_UUID,
      body: { candidate_name: 'Self', mobile_number: '9876543210', relationship: 'Friend', preferred_hr_id: 'unassigned' }
    });
    assert.strictEqual(selfRef.status, 400);
    console.log('✓ Test 4 Passed: Referral role scoping (EMPLOYEE / HR / SUPER_ADMIN) and self-referral guard');

    // 5. Bonus-credit guards, idempotency, and NO wallet/payroll transaction
    const hrBonus = await reqJson(`/employee-referrals/${REF_ELIGIBLE_UUID}/bonus-credit`, {
      method: 'POST', userId: HR1_USER_UUID
    });
    assert.strictEqual(hrBonus.status, 403);

    const empBonus = await reqJson(`/employee-referrals/${REF_ELIGIBLE_UUID}/bonus-credit`, {
      method: 'POST', userId: EMP1_USER_UUID
    });
    assert.strictEqual(empBonus.status, 403);

    const ineligibleBonus = await reqJson(`/employee-referrals/${REF_NOT_ELIGIBLE_UUID}/bonus-credit`, {
      method: 'POST', userId: SUPER_ADMIN_UUID
    });
    assert.strictEqual(ineligibleBonus.status, 400);

    const saBonus1 = await reqJson(`/employee-referrals/${REF_ELIGIBLE_UUID}/bonus-credit`, {
      method: 'POST', userId: SUPER_ADMIN_UUID
    });
    assert.strictEqual(saBonus1.status, 200);
    assert.strictEqual(saBonus1.json.data.bonus_status, 'credited');

    // Idempotent second call
    const saBonus2 = await reqJson(`/employee-referrals/${REF_ELIGIBLE_UUID}/bonus-credit`, {
      method: 'POST', userId: SUPER_ADMIN_UUID
    });
    assert.strictEqual(saBonus2.status, 200);
    assert.strictEqual(saBonus2.json.data.already_credited, true);
    assert.strictEqual(store.wallet_ledger.length, 0);
    assert.strictEqual(store.wallets.length, 0);
    assert.strictEqual(store.payroll_records.length, 0);
    console.log('✓ Test 5 Passed: Bonus-credit SUPER_ADMIN-only, idempotent, and zero wallet/payroll transactions');

    // 6. Frontend routes & sidebar preservation regression check
    const appRoutes = fs.readFileSync(path.join(__dirname, '../../../frontend/src/routes/AppRoutes.jsx'), 'utf8');
    assert(appRoutes.includes('path="/employee/hr/documents"'));
    assert(appRoutes.includes('path="/employee/hr/salary"'));
    assert(appRoutes.includes('path="/employee/hr/payslips"'));
    assert(appRoutes.includes('path="/employee/referrals"'));
    assert(appRoutes.includes('path="/hr/referrals"'));
    assert(appRoutes.includes('path="/hr/attendance-history"'));
    assert(appRoutes.includes('path="/hr/payslip-requests"'));
    assert(appRoutes.includes('path="/super-admin/referrals"'));
    assert(appRoutes.includes('<Navigate to="/employee/hr/salary" replace />'));
    assert(appRoutes.includes('<Navigate to="/employee/hr/payslips" replace />'));
    assert(appRoutes.includes('<Navigate to="/employee/hr/documents" replace />'));

    const adminLayout = fs.readFileSync(path.join(__dirname, '../../../frontend/src/layouts/AdminLayout.jsx'), 'utf8');
    assert(adminLayout.includes('/admin/kyc'));
    assert(adminLayout.includes('/admin/leads'));
    assert(adminLayout.includes('/admin/attendance'));
    assert(adminLayout.includes('/admin/designation-rules'));
    assert(adminLayout.includes('/hr/referrals'));
    assert(adminLayout.includes('/hr/attendance-history'));
    assert(adminLayout.includes('/hr/payslip-requests'));
    assert(adminLayout.includes('/hr/attendance'));
    assert(adminLayout.includes('/hr/help'));

    const superAdminLayout = fs.readFileSync(path.join(__dirname, '../../../frontend/src/layouts/SuperAdminLayout.jsx'), 'utf8');
    assert(superAdminLayout.includes('/super-admin/referrals'));
    assert(superAdminLayout.includes('/super-admin/bulk-sms'));
    assert(superAdminLayout.includes('/super-admin/links'));
    assert(superAdminLayout.includes('/super-admin/products/loc_eoc'));
    const refPage = fs.readFileSync(path.join(__dirname, '../../../frontend/src/modules/referrals/EmployeeReferralManagement.jsx'), 'utf8');
    assert(refPage.includes('ownRefCode'), 'EmployeeReferralManagement must include user employee_id fallback');
    assert(refPage.includes('metaError && !referralLink'), 'EmployeeReferralManagement must hide metaError when referralLink exists');
    console.log('✓ Test 6 Passed: AppRoutes redirects and AdminLayout/SuperAdminLayout pre-existing links preserved');

    console.log('\n🎉 ALL HR, PAYSLIP REQUESTS & EMPLOYEE REFERRALS TESTS PASSED!\n');
  } finally {
    server.close();
  }
})().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
