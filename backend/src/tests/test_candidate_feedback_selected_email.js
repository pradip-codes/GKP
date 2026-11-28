const assert = require('assert');
const express = require('express');
const http = require('http');

process.env.NODE_ENV = 'test';
process.env.SKIP_DB = 'true';

const sentEmails = [];
const candRow = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  reference_code: 'CAND20261',
  full_name: 'Priya Sharma',
  email_id: 'priya.sharma@example.com',
  target_role: 'TC',
  offered_designation: null,
  interview_status: 'SELECTED',
  interview_feedback: 'Strong communication skills',
};

const dbPath = require.resolve('../config/database');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: {
    query: async (sql, params = []) => {
      if (/UPDATE employee_candidates/i.test(String(sql))) {
        return {
          rows: [{
            ...candRow,
            interview_status: params[0],
            interview_feedback: params[2],
          }],
        };
      }
      return { rows: [] };
    },
    pool: { end: async () => {} },
  },
};

const jwtPath = require.resolve('../middleware/authentication/jwtAuth.middleware');
require.cache[jwtPath] = {
  id: jwtPath,
  filename: jwtPath,
  loaded: true,
  exports: (req, _res, next) => { req.user = { id: '11111111-1111-4111-8111-111111111111', role: 'HR' }; next(); },
};

const rolePath = require.resolve('../middleware/authorization/role.middleware');
require.cache[rolePath] = {
  id: rolePath,
  filename: rolePath,
  loaded: true,
  exports: () => (_req, _res, next) => next(),
};

const emailPath = require.resolve('../services/email/email.service');
require.cache[emailPath] = {
  id: emailPath,
  filename: emailPath,
  loaded: true,
  exports: {
    sendEmployeeInvitationEmail: async () => ({}),
    sendCandidateAssignedToHrEmail: async () => ({}),
    sendCandidateRejectionEmail: async () => ({}),
    sendCandidateSelectedEmail: async (payload) => {
      sentEmails.push(payload);
      return { messageId: 'test-msg-1' };
    },
  },
};

const hrRouter = require('../modules/hr/hr.routes');

function postJson(port, urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: urlPath,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      },
      (res) => {
        let chunks = '';
        res.on('data', (d) => { chunks += d; });
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(chunks) }));
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/hr', hrRouter);

  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = server.address().port;

  try {
    // 1. Setting status to INTERVIEW_PENDING must NOT send a selection email
    const r1 = await postJson(port, `/api/v1/hr/candidates/${candRow.id}/interview`, {
      interview_status: 'INTERVIEW_PENDING',
      interview_feedback: 'Second round pending',
    });
    assert.strictEqual(r1.status, 200);
    assert.strictEqual(sentEmails.length, 0, 'INTERVIEW_PENDING must not trigger selection email');

    // 2. Setting status to SELECTED must trigger sendCandidateSelectedEmail with candidate details
    const r2 = await postJson(port, `/api/v1/hr/candidates/${candRow.id}/interview`, {
      interview_status: 'SELECTED',
      interview_rating: 5,
      interview_feedback: 'Strong communication skills',
    });
    assert.strictEqual(r2.status, 200);
    assert.strictEqual(r2.body.success, true);
    assert.strictEqual(sentEmails.length, 1, 'SELECTED feedback must trigger sendCandidateSelectedEmail');
    assert.strictEqual(sentEmails[0].candidateEmail, 'priya.sharma@example.com');
    assert.strictEqual(sentEmails[0].referenceCode, 'CAND20261');
    assert.strictEqual(sentEmails[0].interviewFeedback, 'Strong communication skills');

    console.log('✓ POST /hr/candidates/:id/interview dispatches selection email cleanly for SELECTED status');
  } finally {
    server.close();
  }
  process.exit(0);
})().catch((err) => {
  console.error('✗ TEST FAILED:', err);
  process.exit(1);
});
