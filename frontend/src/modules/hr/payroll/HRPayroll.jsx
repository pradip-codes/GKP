import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import api from '../../../services/api';
import {
  FaRupeeSign, FaSyncAlt, FaCheck, FaTimes, FaUpload, FaFileAlt,
  FaMoneyBillWave, FaUserClock, FaFileInvoice
} from 'react-icons/fa';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONO_FONT = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const STATUS_TAGS = {
  PENDING_APPROVAL: { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A', label: 'Pending Approval' },
  APPROVED: { bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0', label: 'Approved' },
  PAID: { bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE', label: 'Disbursed / Paid' },
  REJECTED: { bg: '#FEF2F2', color: '#991B1B', border: '#FECACA', label: 'Declined' },
  DRAFT: { bg: 'rgba(100, 116, 139, 0.08)', color: '#475569', border: 'rgba(100, 116, 139, 0.2)', label: 'Draft' }
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
  const cardStyle = { 
    background: C.card, 
    border: `1px solid ${C.border}`, 
    borderRadius: '8px', 
    padding: isMobile ? '14px' : '18px' 
  };

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

  useEffect(() => { 
    fetchRecords(); 
    fetchRequests(); 
    fetchDocuments(); 
    fetchEmployees(); 
  }, [fetchRecords, fetchRequests, fetchDocuments, fetchEmployees]);

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
      if (res.data?.success) { 
        showMsg('Salary structure updated successfully'); 
        setStructForm({ basic: '', da: '', hra: '', special_allowance: '' }); 
      }
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
        showMsg('Document uploaded successfully');
        setDocForm({ employee_id: '', doc_type: 'FORM16', name: '', period: '', issued_on: '' });
        setDocFile(null);
        fetchDocuments();
      }
    } catch (e) { showMsg(e.response?.data?.message || 'Upload failed'); }
  };

  const inputStyle = { 
    width: '100%', 
    padding: '8px 12px', 
    borderRadius: '6px', 
    border: `1px solid ${C.border}`, 
    background: C.bgSecondary, 
    color: C.text, 
    fontSize: '13px', 
    boxSizing: 'border-box' 
  };
  const labelStyle = { 
    fontSize: '11px', 
    fontWeight: 600, 
    color: C.textMid, 
    display: 'block', 
    marginBottom: '4px' 
  };

  const TABS = [
    { id: 'records', label: 'Payroll Records' },
    { id: 'requests', label: `Payslip Requests${requests.length ? ` (${requests.length})` : ''}` },
    { id: 'documents', label: 'Documents & Certificates' },
    { id: 'structure', label: 'Salary Structure' }
  ];

  return (
    <div style={{ maxWidth: '1180px', margin: '0 auto', padding: isMobile ? '16px 12px 60px' : '20px 0 48px', fontFamily: "'Inter', -apple-system, sans-serif", color: C.text }}>
      
      {/* ── Top Overview Panel ── */}
      <div style={{ ...cardStyle, marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: C.textMid, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
              Payroll Management Console
            </div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: C.text, letterSpacing: '-0.01em' }}>
              Monthly Payroll &amp; Compensation
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: C.textMid }}>
              Compute monthly wages, disburse payslips, and manage statutory salary structures
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={month} onChange={(e) => setMonth(parseInt(e.target.value, 10))} style={{ ...inputStyle, width: 'auto', padding: '6px 10px' }}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select value={year} onChange={(e) => setYear(parseInt(e.target.value, 10))} style={{ ...inputStyle, width: 'auto', padding: '6px 10px' }}>
              {[now.getFullYear(), now.getFullYear() - 1].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button 
              onClick={handleGenerate} 
              disabled={loading} 
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '6px', 
                padding: '7px 14px', 
                borderRadius: '6px', 
                border: 'none', 
                background: C.teal || '#0F766E', 
                color: '#fff', 
                fontSize: '13px', 
                fontWeight: 600, 
                cursor: 'pointer' 
              }}
            >
              <FaSyncAlt style={{ fontSize: '11px' }} /> {loading ? 'Computing…' : 'Generate Payroll'}
            </button>
            {tab === 'records' && records.some((r) => r.status === 'PENDING_APPROVAL') && (
              <button 
                onClick={handleBulkApprove} 
                style={{ 
                  padding: '7px 12px', 
                  borderRadius: '6px', 
                  border: '1px solid #A7F3D0', 
                  background: '#ECFDF5', 
                  color: '#065F46', 
                  fontSize: '12px', 
                  fontWeight: 600, 
                  cursor: 'pointer' 
                }}
              >
                Approve Pending
              </button>
            )}
          </div>
        </div>

        {msg && (
          <div style={{ marginTop: '10px', padding: '6px 10px', borderRadius: '4px', background: C.bgSecondary, border: `1px solid ${C.border}`, fontSize: '12px', color: C.teal || '#0F766E' }}>
            {msg}
          </div>
        )}
        {genResult && (
          <div style={{ marginTop: '6px', fontSize: '12px', color: C.textMid, fontFamily: MONO_FONT }}>
            Processed: {genResult.generated}/{genResult.total} · Failed: {genResult.failed}
            {genResult.errors?.length > 0 && ` · ${genResult.errors[0].error}`}
          </div>
        )}
      </div>

      {/* ── Tabs (Quiet Underline) ── */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '16px', borderBottom: `1px solid ${C.border}` }}>
        {TABS.map((t) => (
          <button 
            key={t.id} 
            onClick={() => setTab(t.id)} 
            style={{ 
              padding: '8px 0 10px', 
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              borderBottom: tab === t.id ? `2px solid ${C.teal || '#0F766E'}` : '2px solid transparent', 
              background: 'transparent', 
              color: tab === t.id ? (C.teal || '#0F766E') : C.textMid, 
              fontSize: '13px', 
              fontWeight: tab === t.id ? 600 : 500, 
              cursor: 'pointer',
              marginBottom: '-1px'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: Payroll Records ── */}
      {tab === 'records' && (
        <div style={cardStyle}>
          {loading ? (
            <p style={{ color: C.textMid, textAlign: 'center', padding: '30px 0', fontSize: '13px' }}>Loading payroll records…</p>
          ) : records.length === 0 ? (
            <p style={{ color: C.textMid, textAlign: 'center', padding: '30px 0', fontSize: '13px' }}>
              No payroll records found for {MONTHS[month - 1]} {year}. Click "Generate Payroll" to compute records.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: C.textMid, borderBottom: `1px solid ${C.border}`, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Employee</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Gross Pay</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Deductions</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Net Payable</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Attendance Deductions</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => {
                    const sc = STATUS_TAGS[r.status] || STATUS_TAGS.DRAFT;
                    return (
                      <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontWeight: 600, color: C.text }}>{r.full_name}</div>
                          <div style={{ fontSize: '11px', color: C.textMid, fontFamily: MONO_FONT }}>
                            {r.emp_code} • {r.designation}
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', fontFamily: MONO_FONT, fontVariantNumeric: 'tabular-nums' }}>
                          {fmt(r.gross_earnings)}
                        </td>
                        <td style={{ padding: '10px 12px', fontFamily: MONO_FONT, fontVariantNumeric: 'tabular-nums', color: '#991B1B' }}>
                          {fmt(r.total_deductions)}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: C.teal || '#0F766E', fontFamily: MONO_FONT, fontVariantNumeric: 'tabular-nums' }}>
                          {fmt(r.net_pay)}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '11px', color: C.textMid }}>
                          {r.lop_days || 0} LOP · {r.late_count || 0} late marks
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                            {sc.label}
                          </span>
                          {r.status === 'REJECTED' && r.rejection_reason && (
                            <div style={{ fontSize: '10px', color: '#991B1B', marginTop: 2 }}>
                              {r.rejection_reason}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
                            {['PENDING_APPROVAL', 'DRAFT', 'REJECTED'].includes(r.status) && (
                              <button 
                                onClick={() => handleRecordAction(r.id, 'approve')} 
                                title="Approve payroll record" 
                                style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', background: C.teal || '#0F766E', color: '#fff', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              >
                                <FaCheck style={{ fontSize: '10px' }} /> Approve
                              </button>
                            )}
                            {r.status === 'APPROVED' && (
                              <button 
                                onClick={() => handleRecordAction(r.id, 'mark-paid')} 
                                style={{ padding: '4px 8px', borderRadius: '4px', border: `1px solid ${C.border}`, background: C.bgSecondary, color: C.text, fontSize: '11px', fontWeight: 500, cursor: 'pointer' }}
                              >
                                Mark Paid
                              </button>
                            )}
                            {!['PAID', 'REJECTED'].includes(r.status) && (
                              <button 
                                onClick={() => { 
                                  const reason = window.prompt('Rejection reason:'); 
                                  if (reason !== null) handleRecordAction(r.id, 'reject', reason); 
                                }} 
                                title="Decline record" 
                                style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'transparent', color: '#991B1B', fontSize: '11px', fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              >
                                <FaTimes style={{ fontSize: '10px' }} /> Decline
                              </button>
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

      {/* ── TAB 2: Payslip Requests ── */}
      {tab === 'requests' && (
        <div style={cardStyle}>
          {requests.length === 0 ? (
            <p style={{ color: C.textMid, textAlign: 'center', padding: '30px 0', fontSize: '13px' }}>
              No pending payslip requests from employees.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: '8px' }}>
              {requests.map((r) => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: '6px', background: C.bgSecondary }}>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{r.full_name}</span>
                    <span style={{ fontSize: '11px', color: C.textMid, marginLeft: '8px', fontFamily: MONO_FONT }}>
                      {r.emp_code} • {MONTHS[r.month - 1]} {r.year}
                    </span>
                    <div style={{ fontSize: '11px', color: C.textMid, marginTop: 2 }}>
                      Net: <span style={{ color: C.teal || '#0F766E', fontWeight: 600, fontFamily: MONO_FONT }}>{fmt(r.net_pay)}</span> • Requested {new Date(r.created_at).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                      onClick={() => handleRequestAction(r.id, 'approve')} 
                      style={{ padding: '5px 10px', borderRadius: '4px', border: 'none', background: C.teal || '#0F766E', color: '#fff', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <FaCheck style={{ fontSize: '10px' }} /> Approve
                    </button>
                    <button 
                      onClick={() => handleRequestAction(r.id, 'reject')} 
                      style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'transparent', color: '#991B1B', fontSize: '11px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <FaTimes style={{ fontSize: '10px' }} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: Documents ── */}
      {tab === 'documents' && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
          <div style={cardStyle}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: C.textMid, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
              Issuance
            </div>
            <h3 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 600, color: C.text }}>Upload Document</h3>
            <div style={{ display: 'grid', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Employee *</label>
                <select value={docForm.employee_id} onChange={(e) => setDocForm({ ...docForm, employee_id: e.target.value })} style={inputStyle}>
                  <option value="">Select employee…</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name} ({e.emp_code})</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Document Type *</label>
                <select value={docForm.doc_type} onChange={(e) => setDocForm({ ...docForm, doc_type: e.target.value })} style={inputStyle}>
                  {['FORM16', 'PF_STATEMENT', 'SALARY_CERT', 'EMPLOYMENT_CERT', 'BANK_PROOF', 'PAYSLIP', 'OTHER'].map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Document Title *</label>
                <input value={docForm.name} onChange={(e) => setDocForm({ ...docForm, name: e.target.value })} placeholder="e.g. Form 16 — FY 2025-26" style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Period</label>
                  <input value={docForm.period} onChange={(e) => setDocForm({ ...docForm, period: e.target.value })} placeholder="FY 2025-26" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Date of Issuance</label>
                  <input type="date" value={docForm.issued_on} onChange={(e) => setDocForm({ ...docForm, issued_on: e.target.value })} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>File Attachment (PDF / Images)</label>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => setDocFile(e.target.files?.[0] || null)} style={{ fontSize: '12px', color: C.textMid }} />
              </div>
              <button 
                onClick={handleDocUpload} 
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px 14px', borderRadius: '6px', border: 'none', background: C.teal || '#0F766E', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                <FaUpload style={{ fontSize: '11px' }} /> Upload &amp; Archive
              </button>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: C.textMid, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
              Archive
            </div>
            <h3 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 600, color: C.text }}>
              Issued Documents ({documents.length})
            </h3>
            {documents.length === 0 ? (
              <p style={{ color: C.textMid, fontSize: '13px' }}>No documents archived yet.</p>
            ) : (
              <div style={{ display: 'grid', gap: '6px', maxHeight: '440px', overflowY: 'auto' }}>
                {documents.map((d) => (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: '6px', background: C.bgSecondary }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '11px', color: C.textMid }}>
                        {d.full_name} • {d.doc_type.replace(/_/g, ' ')}{d.period ? ` • ${d.period}` : ''}
                      </p>
                    </div>
                    {d.file_url && (
                      <a href={d.file_url} target="_blank" rel="noreferrer" style={{ fontSize: '11px', fontWeight: 600, color: C.teal || '#0F766E', flexShrink: 0, textDecoration: 'none' }}>
                        View
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 4: Salary Structure ── */}
      {tab === 'structure' && (
        <div style={{ ...cardStyle, maxWidth: '560px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: C.textMid, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
            Configuration
          </div>
          <h3 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 600, color: C.text }}>
            Salary Structure &amp; Breakdown
          </h3>
          <p style={{ margin: '0 0 16px', fontSize: '12px', color: C.textMid, lineHeight: 1.5 }}>
            Default structure assigns candidate's offered salary as Basic. 
            EPF: 12% of (Basic + DA) up to ₹15,000 ceiling. ESI: 0.75% gross up to ₹21,000.
          </p>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Employee *</label>
              <select value={structEmp} onChange={(e) => setStructEmp(e.target.value)} style={inputStyle}>
                <option value="">Select employee…</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.full_name} ({e.emp_code}) — offered ₹{Number(e.offered_salary || 0).toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[['basic', 'Basic Salary (Monthly) *'], ['da', 'Dearness Allowance (DA)'], ['hra', 'House Rent Allowance (HRA)'], ['special_allowance', 'Special Allowance']].map(([key, label]) => (
                <div key={key}>
                  <label style={labelStyle}>{label}</label>
                  <input type="number" min="0" value={structForm[key]} onChange={(e) => setStructForm({ ...structForm, [key]: e.target.value })} style={inputStyle} />
                </div>
              ))}
            </div>
            <button 
              onClick={handleSaveStructure} 
              style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: C.teal || '#0F766E', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', marginTop: '4px' }}
            >
              Update Salary Structure
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
