import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import api from '../../../services/api';
import {
  FaRupeeSign, FaSyncAlt, FaCheck, FaTimes, FaUpload, FaFileAlt,
  FaMoneyBillWave, FaUserClock, FaFileInvoice
} from 'react-icons/fa';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const STATUS_COLORS = {
  PENDING_APPROVAL: { bg: '#FEF3C7', color: '#92400E', label: 'Pending' },
  APPROVED: { bg: '#D1FAE5', color: '#065F46', label: 'Approved' },
  PAID: { bg: '#DBEAFE', color: '#1E40AF', label: 'Paid' },
  REJECTED: { bg: '#FEE2E2', color: '#991B1B', label: 'Rejected' },
  DRAFT: { bg: '#F3F4F6', color: '#4B5563', label: 'Draft' }
};

export default function HRPayroll() {
  const { C } = useTheme();
  const now = new Date();

  const [tab, setTab] = useState('records'); // records | requests | documents | structure
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [records, setRecords] = useState([]);
  const [requests, setRequests] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [genResult, setGenResult] = useState(null);

  // structure form
  const [structEmp, setStructEmp] = useState('');
  const [structForm, setStructForm] = useState({ basic: '', da: '', hra: '', special_allowance: '' });

  // document form
  const [docForm, setDocForm] = useState({ employee_id: '', doc_type: 'FORM16', name: '', period: '', issued_on: '' });
  const [docFile, setDocFile] = useState(null);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const card = { background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px', padding: isMobile ? '14px' : '18px' };

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/hr/payroll/records', { params: { year, month } });
      if (res.data?.success) setRecords(res.data.data || []);
    } catch (e) { showMsg(e.response?.data?.message || 'Failed to load records'); }
    setLoading(false);
  }, [year, month]);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await api.get('/hr/payroll/payslip-requests', { params: { status: 'PENDING' } });
      if (res.data?.success) setRequests(res.data.data || []);
    } catch { /* ignore */ }
  }, []);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await api.get('/hr/payroll/documents');
      if (res.data?.success) setDocuments(res.data.data || []);
    } catch { /* ignore */ }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await api.get('/hr/payroll/employees');
      if (res.data?.success) setEmployees(res.data.data || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchRecords(); fetchRequests(); fetchDocuments(); fetchEmployees(); }, [fetchRecords, fetchRequests, fetchDocuments, fetchEmployees]);

  const handleGenerate = async () => {
    setLoading(true); setGenResult(null);
    try {
      const res = await api.post('/hr/payroll/generate', { year, month });
      if (res.data?.success) {
        setGenResult(res.data.data);
        showMsg(res.data.message);
        fetchRecords();
      }
    } catch (e) { showMsg(e.response?.data?.message || 'Generation failed'); }
    setLoading(false);
  };

  const handleRecordAction = async (id, action, reason) => {
    try {
      const res = await api.post(`/hr/payroll/records/${id}/${action}`, action === 'reject' ? { reason } : {});
      if (res.data?.success) { showMsg(res.data.message); fetchRecords(); }
    } catch (e) { showMsg(e.response?.data?.message || 'Action failed'); }
  };

  const handleBulkApprove = async () => {
    try {
      const res = await api.post('/hr/payroll/records/bulk-approve', { year, month });
      if (res.data?.success) { showMsg(res.data.message); fetchRecords(); }
    } catch (e) { showMsg(e.response?.data?.message || 'Bulk approve failed'); }
  };

  const handleRequestAction = async (id, action) => {
    let reason;
    if (action === 'reject') {
      reason = window.prompt('Rejection reason (shown to employee):');
      if (reason === null) return;
      if (!reason.trim()) { showMsg('Reason is required'); return; }
    }
    try {
      const res = await api.post(`/hr/payroll/payslip-requests/${id}/${action}`, action === 'reject' ? { reason } : {});
      if (res.data?.success) { showMsg(res.data.message); fetchRequests(); }
    } catch (e) { showMsg(e.response?.data?.message || 'Action failed'); }
  };

  const handleSaveStructure = async () => {
    if (!structEmp) { showMsg('Select an employee'); return; }
    try {
      const res = await api.put(`/hr/payroll/salary-structure/${structEmp}`, structForm);
      if (res.data?.success) { showMsg('Salary structure saved'); setStructForm({ basic: '', da: '', hra: '', special_allowance: '' }); }
    } catch (e) { showMsg(e.response?.data?.message || 'Save failed'); }
  };

  const handleDocUpload = async () => {
    if (!docForm.employee_id || !docForm.name) { showMsg('Employee and document name required'); return; }
    const fd = new FormData();
    fd.append('employee_id', docForm.employee_id);
    fd.append('doc_type', docForm.doc_type);
    fd.append('name', docForm.name);
    if (docForm.period) fd.append('period', docForm.period);
    if (docForm.issued_on) fd.append('issued_on', docForm.issued_on);
    if (docFile) fd.append('file', docFile);
    try {
      const res = await api.post('/hr/payroll/documents', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.data?.success) {
        showMsg('Document uploaded');
        setDocForm({ employee_id: '', doc_type: 'FORM16', name: '', period: '', issued_on: '' });
        setDocFile(null);
        fetchDocuments();
      }
    } catch (e) { showMsg(e.response?.data?.message || 'Upload failed'); }
  };

  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: '9px', border: `1px solid ${C.border}`, background: C.bgSecondary, color: C.text, fontSize: '13px', boxSizing: 'border-box' };
  const labelStyle = { fontSize: '11px', fontWeight: 700, color: C.textMid, display: 'block', marginBottom: '4px' };

  const TABS = [
    { id: 'records', label: 'Payroll Records', icon: <FaMoneyBillWave /> },
    { id: 'requests', label: `Payslip Requests${requests.length ? ` (${requests.length})` : ''}`, icon: <FaFileInvoice /> },
    { id: 'documents', label: 'Documents', icon: <FaFileAlt /> },
    { id: 'structure', label: 'Salary Structure', icon: <FaUserClock /> }
  ];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: isMobile ? '12px 10px 60px' : '0 0 48px', fontFamily: "'Inter', sans-serif", color: C.text }}>
      <div style={{ ...card, marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(0,138,96,0.12)', color: '#008A60', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}><FaRupeeSign /></div>
            <div>
              <h1 style={{ margin: 0, fontSize: isMobile ? '19px' : '22px', fontWeight: 900 }}>Payroll Management</h1>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: C.textMid }}>Generate monthly payroll, approve payslips, manage documents</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={month} onChange={(e) => setMonth(parseInt(e.target.value, 10))} style={{ ...inputStyle, width: 'auto' }}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select value={year} onChange={(e) => setYear(parseInt(e.target.value, 10))} style={{ ...inputStyle, width: 'auto' }}>
              {[now.getFullYear(), now.getFullYear() - 1].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={handleGenerate} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '9px', border: 'none', background: '#008A60', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
              <FaSyncAlt /> {loading ? 'Working…' : 'Generate Payroll'}
            </button>
            {tab === 'records' && records.some((r) => r.status === 'PENDING_APPROVAL') && (
              <button onClick={handleBulkApprove} style={{ padding: '9px 14px', borderRadius: '9px', border: '1px solid #10B981', background: '#D1FAE5', color: '#065F46', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                Approve All Pending
              </button>
            )}
          </div>
        </div>
        {msg && <p style={{ margin: '10px 0 0', fontSize: '13px', fontWeight: 600, color: '#2875D0' }}>{msg}</p>}
        {genResult && (
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: C.textMid }}>
            Generated: {genResult.generated}/{genResult.total} · Failed: {genResult.failed}
            {genResult.errors?.length > 0 && ` · ${genResult.errors[0].error}`}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 16px', borderRadius: '10px', border: `1px solid ${tab === t.id ? '#008A60' : C.border}`, background: tab === t.id ? '#008A60' : C.card, color: tab === t.id ? '#fff' : C.textMid, fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── RECORDS TAB ── */}
      {tab === 'records' && (
        <div style={card}>
          {loading ? <p style={{ color: C.textMid, textAlign: 'center', padding: '30px 0' }}>Loading…</p> :
           records.length === 0 ? <p style={{ color: C.textMid, textAlign: 'center', padding: '30px 0' }}>No payroll records for {MONTHS[month - 1]} {year}. Click "Generate Payroll" to compute salaries.</p> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: C.textMid, borderBottom: `1px solid ${C.border}` }}>
                    <th style={{ padding: '8px' }}>Employee</th>
                    <th style={{ padding: '8px' }}>Gross</th>
                    <th style={{ padding: '8px' }}>Deductions</th>
                    <th style={{ padding: '8px' }}>Net Pay</th>
                    <th style={{ padding: '8px' }}>LOP/Late</th>
                    <th style={{ padding: '8px' }}>Status</th>
                    <th style={{ padding: '8px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => {
                    const sc = STATUS_COLORS[r.status] || STATUS_COLORS.DRAFT;
                    return (
                      <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: '9px 8px' }}>
                          <strong>{r.full_name}</strong>
                          <div style={{ fontSize: '11px', color: C.textMid }}>{r.emp_code} • {r.designation}</div>
                        </td>
                        <td style={{ padding: '9px 8px' }}>{fmt(r.gross_earnings)}</td>
                        <td style={{ padding: '9px 8px', color: '#DC5555' }}>{fmt(r.total_deductions)}</td>
                        <td style={{ padding: '9px 8px', fontWeight: 800, color: '#008A60' }}>{fmt(r.net_pay)}</td>
                        <td style={{ padding: '9px 8px', fontSize: '11px', color: C.textMid }}>{r.lop_days}d / {r.late_count} late</td>
                        <td style={{ padding: '9px 8px' }}>
                          <span style={{ background: sc.bg, color: sc.color, padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>{sc.label}</span>
                          {r.status === 'REJECTED' && r.rejection_reason && <div style={{ fontSize: '10px', color: '#DC5555', marginTop: 3 }}>{r.rejection_reason}</div>}
                        </td>
                        <td style={{ padding: '9px 8px' }}>
                          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                            {['PENDING_APPROVAL', 'DRAFT', 'REJECTED'].includes(r.status) && (
                              <button onClick={() => handleRecordAction(r.id, 'approve')} title="Approve" style={{ padding: '5px 10px', borderRadius: '7px', border: 'none', background: '#10B981', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><FaCheck /> OK</button>
                            )}
                            {r.status === 'APPROVED' && (
                              <button onClick={() => handleRecordAction(r.id, 'mark-paid')} style={{ padding: '5px 10px', borderRadius: '7px', border: 'none', background: '#3B82F6', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>Mark Paid</button>
                            )}
                            {!['PAID', 'REJECTED'].includes(r.status) && (
                              <button onClick={() => { const reason = window.prompt('Rejection reason:'); if (reason !== null) handleRecordAction(r.id, 'reject', reason); }} title="Reject" style={{ padding: '5px 10px', borderRadius: '7px', border: 'none', background: '#EF4444', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><FaTimes /> No</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── REQUESTS TAB ── */}
      {tab === 'requests' && (
        <div style={card}>
          {requests.length === 0 ? <p style={{ color: C.textMid, textAlign: 'center', padding: '30px 0' }}>No pending payslip requests.</p> : (
            <div style={{ display: 'grid', gap: '10px' }}>
              {requests.map((r) => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', padding: '12px 14px', border: `1px solid ${C.border}`, borderRadius: '11px' }}>
                  <div>
                    <strong style={{ fontSize: '13px' }}>{r.full_name}</strong>
                    <span style={{ fontSize: '12px', color: C.textMid, marginLeft: '8px' }}>{r.emp_code} • {MONTHS[r.month - 1]} {r.year}</span>
                    <div style={{ fontSize: '12px', color: C.textMid, marginTop: 3 }}>Net pay: <strong style={{ color: '#008A60' }}>{fmt(r.net_pay)}</strong> • Requested {new Date(r.created_at).toLocaleDateString('en-IN')}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleRequestAction(r.id, 'approve')} style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', background: '#10B981', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}><FaCheck /> Approve</button>
                    <button onClick={() => handleRequestAction(r.id, 'reject')} style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', background: '#EF4444', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}><FaTimes /> Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── DOCUMENTS TAB ── */}
      {tab === 'documents' && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
          <div style={card}>
            <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 800 }}>Upload Document</h3>
            <div style={{ display: 'grid', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Employee</label>
                <select value={docForm.employee_id} onChange={(e) => setDocForm({ ...docForm, employee_id: e.target.value })} style={inputStyle}>
                  <option value="">Select employee…</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name} ({e.emp_code})</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Document Type</label>
                <select value={docForm.doc_type} onChange={(e) => setDocForm({ ...docForm, doc_type: e.target.value })} style={inputStyle}>
                  {['FORM16', 'PF_STATEMENT', 'SALARY_CERT', 'EMPLOYMENT_CERT', 'BANK_PROOF', 'PAYSLIP', 'OTHER'].map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Document Name</label>
                <input value={docForm.name} onChange={(e) => setDocForm({ ...docForm, name: e.target.value })} placeholder="e.g. Form 16 — FY 2025-26" style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Period</label>
                  <input value={docForm.period} onChange={(e) => setDocForm({ ...docForm, period: e.target.value })} placeholder="FY 2025-26" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Issued On</label>
                  <input type="date" value={docForm.issued_on} onChange={(e) => setDocForm({ ...docForm, issued_on: e.target.value })} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>File (PDF/JPG/PNG/DOC)</label>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => setDocFile(e.target.files?.[0] || null)} style={{ fontSize: '12px', color: C.textMid }} />
              </div>
              <button onClick={handleDocUpload} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '10px', borderRadius: '9px', border: 'none', background: '#008A60', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                <FaUpload /> Upload Document
              </button>
            </div>
          </div>

          <div style={card}>
            <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 800 }}>Uploaded Documents ({documents.length})</h3>
            {documents.length === 0 ? <p style={{ color: C.textMid, fontSize: '13px' }}>No documents uploaded yet.</p> : (
              <div style={{ display: 'grid', gap: '8px', maxHeight: '480px', overflowY: 'auto' }}>
                {documents.map((d) => (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: '9px' }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '12.5px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '11px', color: C.textMid }}>{d.full_name} • {d.doc_type.replace(/_/g, ' ')}{d.period ? ` • ${d.period}` : ''}</p>
                    </div>
                    {d.file_url && (
                      <a href={d.file_url} target="_blank" rel="noreferrer" style={{ fontSize: '11px', fontWeight: 700, color: '#008A60', flexShrink: 0 }}>View</a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STRUCTURE TAB ── */}
      {tab === 'structure' && (
        <div style={{ ...card, maxWidth: '560px' }}>
          <h3 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 800 }}>Set Salary Structure</h3>
          <p style={{ margin: '0 0 16px', fontSize: '12px', color: C.textMid }}>
            If no structure is set, payroll uses the employee's <strong>offered salary</strong> as Basic.
            PF = 12% of (Basic + DA) up to ₹15,000 · ESI = 0.75% gross up to ₹21,000 (applies when gross ≥ ₹16,000).
          </p>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Employee</label>
              <select value={structEmp} onChange={(e) => setStructEmp(e.target.value)} style={inputStyle}>
                <option value="">Select employee…</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name} ({e.emp_code}) — offered ₹{Number(e.offered_salary || 0).toLocaleString('en-IN')}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[['basic', 'Basic Salary *'], ['da', 'DA'], ['hra', 'HRA'], ['special_allowance', 'Special Allowance']].map(([key, label]) => (
                <div key={key}>
                  <label style={labelStyle}>{label}</label>
                  <input type="number" min="0" value={structForm[key]} onChange={(e) => setStructForm({ ...structForm, [key]: e.target.value })} style={inputStyle} />
                </div>
              ))}
            </div>
            <button onClick={handleSaveStructure} style={{ padding: '11px', borderRadius: '9px', border: 'none', background: '#008A60', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>Save Structure</button>
          </div>
        </div>
      )}
    </div>
  );
}
