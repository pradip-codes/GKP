import React, { useCallback, useEffect, useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import api from '../../../services/api';
import { formatDate } from './useEmployeeHrData';

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonth(value) {
  if (!value) return '—';
  const date = new Date(`${String(value).slice(0, 7)}-01T12:00:00`);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export default function EmployeePayslip() {
  const { C } = useTheme();
  const [requests, setRequests] = useState([]);
  const [salaryMonth, setSalaryMonth] = useState(currentMonthValue);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingId, setDownloadingId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadRequests = useCallback(async ({ showLoading = true } = {}) => {
    if (showLoading) setLoading(true);
    setError('');
    try {
      const response = await api.get('/employee/payslip-requests');
      if (!response.data?.success) throw new Error(response.data?.message || 'Unable to load payslip requests.');
      setRequests(response.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load payslip requests.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
    const refreshTimer = window.setInterval(() => loadRequests({ showLoading: false }), 30000);
    return () => window.clearInterval(refreshTimer);
  }, [loadRequests]);

  const handleRequest = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      const response = await api.post('/employee/payslip-requests', { salary_month: salaryMonth });
      if (!response.data?.success) throw new Error(response.data?.message || 'Unable to submit your request.');
      setMessage('Payslip request submitted to HR.');
      await loadRequests();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to submit your request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async (request) => {
    setDownloadingId(request.id);
    setError('');
    try {
      const response = await api.get(`/employee/payslip-requests/${encodeURIComponent(request.id)}/download`);
      const download = response.data?.data;
      if (!response.data?.success || !download?.url) {
        throw new Error(response.data?.message || 'Approved payslip is unavailable.');
      }
      const link = document.createElement('a');
      link.href = download.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.download = download.fileName || '';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to download this payslip.');
    } finally {
      setDownloadingId('');
    }
  };

  const cardStyle = {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: 20
  };
  const buttonStyle = {
    border: 'none',
    borderRadius: 9,
    padding: '10px 15px',
    background: C.employeePrimary || '#0F766E',
    color: '#fff',
    fontWeight: 800,
    cursor: submitting ? 'wait' : 'pointer',
    opacity: submitting ? 0.7 : 1
  };

  return (
    <div style={{ padding: '28px 30px', maxWidth: 1120, margin: '0 auto', width: '100%', overflowY: 'auto' }}>
      <header style={{ marginBottom: 22 }}>
        <div style={{ color: C.employeePrimary || '#0F766E', fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>HR Department</div>
        <h1 style={{ color: C.text, fontSize: 28, fontWeight: 900, margin: '7px 0' }}>My Payslip Requests</h1>
        <p style={{ color: C.textMid, margin: 0 }}>Request a salary-month payslip and track HR’s decision.</p>
      </header>

      <form onSubmit={handleRequest} style={{ ...cardStyle, display: 'flex', alignItems: 'end', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <label style={{ color: C.textMid, display: 'grid', gap: 7, fontSize: 13, fontWeight: 700 }}>
          Salary month
          <input
            type="month"
            required
            max={currentMonthValue()}
            value={salaryMonth}
            onChange={(event) => setSalaryMonth(event.target.value)}
            style={{ minHeight: 40, padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 9, background: C.bgSecondary, color: C.text }}
          />
        </label>
        <button type="submit" disabled={submitting} style={buttonStyle}>
          {submitting ? 'Submitting...' : 'Request Payslip'}
        </button>
      </form>

      {error && <div role="alert" style={{ ...cardStyle, color: '#B91C1C', marginBottom: 16 }}>{error}</div>}
      {message && <div role="status" style={{ ...cardStyle, color: '#047857', marginBottom: 16 }}>{message}</div>}

      <section style={cardStyle}>
        <h2 style={{ color: C.text, fontSize: 18, fontWeight: 900, margin: '0 0 15px' }}>Request history</h2>
        {loading ? (
          <p style={{ color: C.textMid }}>Loading your requests...</p>
        ) : requests.length === 0 ? (
          <div style={{ padding: '28px 10px', textAlign: 'center', color: C.textMid }}>You have not requested a payslip yet.</div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {requests.map((request) => {
              const status = String(request.status || '').toUpperCase();
              const statusColor = status === 'APPROVED' ? '#047857' : status === 'REJECTED' ? '#B91C1C' : '#B45309';
              return (
                <article key={request.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', padding: 14, border: `1px solid ${C.border}`, borderRadius: 12 }}>
                  <div>
                    <div style={{ color: C.text, fontWeight: 800 }}>{formatMonth(request.salary_month)}</div>
                    <div style={{ color: C.textMid, fontSize: 12, marginTop: 5 }}>
                      Requested {formatDate(request.requested_at)}
                      {request.reviewed_at ? ` · Reviewed ${formatDate(request.reviewed_at)}` : ''}
                    </div>
                    <div style={{ color: statusColor, fontSize: 12, fontWeight: 900, marginTop: 5 }}>{status || 'UNKNOWN'}</div>
                    {status === 'REJECTED' && request.review_note && (
                      <div style={{ color: C.textMid, fontSize: 12, marginTop: 5 }}>HR note: {request.review_note}</div>
                    )}
                  </div>
                  {status === 'APPROVED' && (
                    <button
                      type="button"
                      onClick={() => handleDownload(request)}
                      disabled={downloadingId === request.id}
                      style={{ ...buttonStyle, cursor: downloadingId === request.id ? 'wait' : 'pointer', opacity: downloadingId === request.id ? 0.7 : 1 }}
                    >
                      {downloadingId === request.id ? 'Preparing...' : 'Download Payslip'}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
