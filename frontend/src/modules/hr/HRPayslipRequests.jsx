import React, { useEffect, useState } from 'react';
import { FaSearch, FaFileInvoiceDollar } from 'react-icons/fa';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../services/api';

function formatMonth(value) {
  if (!value) return '—';
  const date = new Date(`${String(value).slice(0, 7)}-01T12:00:00`);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function HRPayslipRequests() {
  const { C } = useTheme();
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState('PENDING');
  const [month, setMonth] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reviewingId, setReviewingId] = useState('');
  const [action, setAction] = useState('APPROVE');
  const [payrollVerified, setPayrollVerified] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [payslipFile, setPayslipFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.get('/hr/payslip-requests', {
      params: { status, month: month || undefined, search, page, limit: 30 }
    })
      .then((response) => {
        if (active && response.data?.success) {
          setRequests(response.data.data?.requests || []);
          setPagination(response.data.data?.pagination || { total: 0, totalPages: 1 });
        } else if (active) setError(response.data?.message || 'Unable to load payslip requests.');
      })
      .catch((err) => {
        if (active) setError(err.response?.data?.message || 'Unable to load payslip requests.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [status, month, search, page, refreshKey]);

  const openReview = (requestId) => {
    setReviewingId(requestId);
    setAction('APPROVE');
    setPayrollVerified(false);
    setReviewNote('');
    setPayslipFile(null);
    setError('');
  };

  const handleReview = async (event, requestId) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      const body = new FormData();
      body.append('action', action);
      body.append('payroll_verified', String(payrollVerified));
      body.append('review_note', reviewNote);
      if (payslipFile) body.append('payslip', payslipFile);

      const response = await api.post(`/hr/payslip-requests/${encodeURIComponent(requestId)}/review`, body, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (!response.data?.success) throw new Error(response.data?.message || 'Unable to update this request.');
      setMessage(`Payslip request ${action === 'APPROVE' ? 'approved' : 'rejected'}.`);
      setReviewingId('');
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to update this request.');
    } finally {
      setSubmitting(false);
    }
  };

  const cardStyle = {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: 18
  };
  const inputStyle = {
    minHeight: 40,
    padding: '8px 11px',
    border: `1px solid ${C.border}`,
    borderRadius: 9,
    background: C.bgSecondary,
    color: C.text,
    fontSize: 13
  };

  return (
    <div style={{ background: C.bg, minHeight: '100%', padding: '22px 24px', color: C.text }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <header style={{ marginBottom: 20 }}>
          <div style={{ color: C.employeePrimary || C.teal || '#0F766E', fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>HR Department</div>
          <h1 style={{ fontSize: 27, fontWeight: 900, margin: '6px 0' }}>Payslip Requests</h1>
          <p style={{ color: C.textMid, margin: 0 }}>Review payroll records and attach an official payslip before approving a request.</p>
        </header>

        <section style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          <label style={{ position: 'relative', flex: '1 1 260px' }}>
            <FaSearch style={{ position: 'absolute', left: 12, top: 13, color: C.textMid }} />
            <input
              aria-label="Search payslip requests"
              placeholder="Search employee name, ID, or email"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
              style={{ ...inputStyle, width: '100%', paddingLeft: 36 }}
            />
          </label>
          <select aria-label="Request status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} style={inputStyle}>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="ALL">All statuses</option>
          </select>
          <input aria-label="Filter by salary month" type="month" value={month} onChange={(event) => { setMonth(event.target.value); setPage(1); }} style={inputStyle} />
          <span style={{ color: C.textMid, fontSize: 13, fontWeight: 700 }}>{pagination.total || 0} requests</span>
        </section>

        {error && <div role="alert" style={{ ...cardStyle, color: '#B91C1C', marginBottom: 14 }}>{error}</div>}
        {message && <div role="status" style={{ ...cardStyle, color: '#047857', marginBottom: 14 }}>{message}</div>}

        <section style={{ display: 'grid', gap: 12 }}>
          {loading ? (
            <div style={cardStyle}>Loading payslip requests...</div>
          ) : requests.length === 0 ? (
            <div style={{ ...cardStyle, textAlign: 'center', color: C.textMid, padding: 36 }}>No payslip requests match these filters.</div>
          ) : requests.map((request) => {
            const isPending = String(request.status).toUpperCase() === 'PENDING';
            const isReviewing = reviewingId === request.id;
            return (
              <article key={request.id} style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <FaFileInvoiceDollar style={{ color: C.employeePrimary || '#0F766E', fontSize: 22, marginTop: 3 }} />
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 16 }}>{request.full_name || 'Employee'}</div>
                      <div style={{ color: C.textMid, fontSize: 12, marginTop: 4 }}>
                        {request.employee_code || 'No employee ID'}{request.email_id ? ` · ${request.email_id}` : ''}
                      </div>
                      <div style={{ color: C.textMid, fontSize: 13, marginTop: 9 }}>
                        Requested payslip: <strong style={{ color: C.text }}>{formatMonth(request.salary_month)}</strong>
                        {' · '}Submitted {formatDate(request.requested_at)}
                      </div>
                      {request.department && <div style={{ color: C.textMid, fontSize: 12, marginTop: 4 }}>{request.department}{request.designation ? ` · ${request.designation}` : ''}</div>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 900, color: request.status === 'APPROVED' ? '#047857' : request.status === 'REJECTED' ? '#B91C1C' : '#B45309' }}>{request.status}</div>
                    {request.reviewed_at && <div style={{ color: C.textMid, fontSize: 11, marginTop: 4 }}>Reviewed {formatDate(request.reviewed_at)}</div>}
                    {isPending && (
                      <button type="button" onClick={() => isReviewing ? setReviewingId('') : openReview(request.id)} style={{ ...inputStyle, marginTop: 8, cursor: 'pointer', fontWeight: 800 }}>
                        {isReviewing ? 'Close review' : 'Review request'}
                      </button>
                    )}
                  </div>
                </div>

                {request.review_note && !isReviewing && (
                  <div style={{ color: C.textMid, fontSize: 12, marginTop: 10 }}>HR note: {request.review_note}</div>
                )}

                {isReviewing && (
                  <form onSubmit={(event) => handleReview(event, request.id)} style={{ display: 'grid', gap: 12, marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
                    <label style={{ display: 'grid', gap: 6, color: C.textMid, fontSize: 13, fontWeight: 700 }}>
                      Decision
                      <select value={action} onChange={(event) => setAction(event.target.value)} style={inputStyle}>
                        <option value="APPROVE">Approve</option>
                        <option value="REJECT">Reject</option>
                      </select>
                    </label>
                    {action === 'APPROVE' && (
                      <>
                        <label style={{ display: 'flex', gap: 9, alignItems: 'flex-start', color: C.text, fontSize: 13 }}>
                          <input type="checkbox" checked={payrollVerified} onChange={(event) => setPayrollVerified(event.target.checked)} required />
                          I verified this employee’s payroll record for the requested month.
                        </label>
                        <label style={{ display: 'grid', gap: 6, color: C.textMid, fontSize: 13, fontWeight: 700 }}>
                          Payroll verification note
                          <textarea required minLength={5} maxLength={2000} value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} rows={3} placeholder="Record the payroll source or verification details" style={{ ...inputStyle, resize: 'vertical' }} />
                        </label>
                        <label style={{ display: 'grid', gap: 6, color: C.textMid, fontSize: 13, fontWeight: 700 }}>
                          Official payslip PDF
                          <input type="file" accept="application/pdf,.pdf" required onChange={(event) => setPayslipFile(event.target.files?.[0] || null)} style={{ ...inputStyle, height: 'auto' }} />
                        </label>
                      </>
                    )}
                    {action === 'REJECT' && (
                      <label style={{ display: 'grid', gap: 6, color: C.textMid, fontSize: 13, fontWeight: 700 }}>
                        Rejection reason
                        <textarea required minLength={3} maxLength={2000} value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} rows={3} placeholder="Explain why this request is rejected" style={{ ...inputStyle, resize: 'vertical' }} />
                      </label>
                    )}
                    <div>
                      <button type="submit" disabled={submitting} style={{ border: 0, borderRadius: 9, padding: '10px 16px', background: action === 'APPROVE' ? '#047857' : '#B91C1C', color: '#fff', fontWeight: 800, cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
                        {submitting ? 'Saving...' : action === 'APPROVE' ? 'Verify and Approve' : 'Reject Request'}
                      </button>
                    </div>
                  </form>
                )}
              </article>
            );
          })}
        </section>

        {!loading && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 4px', color: C.textMid, fontSize: 13 }}>
            <span>Page {page} of {pagination.totalPages || 1}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} style={{ ...inputStyle, cursor: 'pointer' }}>Previous</button>
              <button type="button" disabled={page >= (pagination.totalPages || 1)} onClick={() => setPage((value) => value + 1)} style={{ ...inputStyle, cursor: 'pointer' }}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
