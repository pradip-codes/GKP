import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import api from '../../../services/api';
import {
  FaPrint, FaDownload, FaChevronDown,
  FaCheckCircle, FaTimesCircle, FaHourglassHalf, FaPaperPlane
} from 'react-icons/fa';

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function EmployeePayslip() {
  const { C } = useTheme();

  const [payslips, setPayslips] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const fetchPayslips = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/employee/payroll/payslips');
      if (res.data?.success) {
        const list = res.data.data || [];
        setPayslips(list);
        if (list.length > 0 && !selectedId) setSelectedId(list[0].id);
      } else {
        setError(res.data?.message || 'Failed to load payslips');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load payslips');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => { fetchPayslips(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDetail = useCallback(async (id) => {
    if (!id) return;
    setDetailLoading(true);
    try {
      const res = await api.get(`/employee/payroll/payslips/${id}`);
      if (res.data?.success) setDetail(res.data.data);
    } catch (err) {
      setDetail(null);
      setError(err.response?.data?.message || 'Failed to load payslip');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => { fetchDetail(selectedId); }, [selectedId, fetchDetail]);

  const selected = payslips.find((p) => p.id === selectedId);

  const handleRequest = async () => {
    if (!selectedId) return;
    setActionMsg('');
    try {
      const res = await api.post(`/employee/payroll/payslips/${selectedId}/request`);
      if (res.data?.success) {
        setActionMsg(res.data.message || 'Payslip request submitted');
        fetchPayslips();
      }
    } catch (err) {
      setActionMsg(err.response?.data?.message || 'Request failed');
    }
  };

  const handleDownload = async () => {
    if (!selectedId) return;
    try {
      const res = await api.get(`/employee/payroll/payslips/${selectedId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `payslip-${detail?.year || ''}-${String(detail?.month || '').padStart(2, '0')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      // blob error → try JSON message
      try {
        const text = await err.response?.data?.text?.();
        setActionMsg(text ? JSON.parse(text).message : 'Download not approved yet');
      } catch {
        setActionMsg('Download not approved yet');
      }
    }
  };

  const handlePrint = () => window.print();

  const earnings = detail?.earnings || [];
  const billableDeductions = (detail?.deductions || []).filter((d) => d.amount > 0);
  const employerRows = (detail?.employerContributions || []).filter((c) => c.amount > 0);
  const totalEarnings = earnings.reduce((t, i) => t + (i.amount || 0), 0);
  const totalDeductions = billableDeductions.reduce((t, i) => t + (i.amount || 0), 0);
  const totalEmployer = employerRows.reduce((t, i) => t + (i.amount || 0), 0);
  const netPay = detail?.netPay ?? (totalEarnings - totalDeductions);

  const statusBadge = (p) => {
    if (!p) return null;
    if (p.payrollStatus === 'PAID') return { icon: <FaCheckCircle />, text: 'Paid', bg: '#D1FAE5', border: '#10B981', color: '#065F46' };
    if (p.requestStatus === 'APPROVED') return { icon: <FaCheckCircle />, text: 'Approved — Downloadable', bg: '#D1FAE5', border: '#10B981', color: '#065F46' };
    if (p.requestStatus === 'REJECTED') return { icon: <FaTimesCircle />, text: `Rejected${p.requestRejectionReason ? ': ' + p.requestRejectionReason : ''}`, bg: '#FEE2E2', border: '#EF4444', color: '#991B1B' };
    if (p.requestStatus === 'PENDING') return { icon: <FaHourglassHalf />, text: 'Request Pending', bg: '#FEF3C7', border: '#F59E0B', color: '#92400E' };
    return { icon: <FaPaperPlane />, text: 'Request Payslip', bg: '#EFF6FF', border: '#3B82F6', color: '#1E40AF' };
  };

  const badge = statusBadge(selected);

  return (
    <div className="employee-payslip-page" style={{ maxWidth: '860px', margin: '0 auto', padding: isMobile ? '12px 10px 60px' : '0 0 48px', fontFamily: "'Inter', sans-serif", color: C.text }}>
      <style>{`
        @media print{
          @page { size: A4; margin: 12mm; }
          body { background: #ffffff !important; }
          .employee-payslip-page { max-width: 100% !important; padding: 0 !important; color: #111827 !important; }
          .payslip-no-print { display: none !important; }
          .payslip-print-card { box-shadow: none !important; border: 1px solid #dddddd !important; break-inside: avoid; }
          .payslip-print-section { break-inside: avoid; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      {/* Status + actions bar */}
      <div className="payslip-no-print" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '12px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '13px', fontWeight: 800, color: C.text }}>Payslip Approval Status</span>
        {badge && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', background: badge.bg, border: `1px solid ${badge.border}`, borderRadius: '20px', padding: '5px 12px', color: badge.color, fontSize: '12px', fontWeight: 700 }}>
            {badge.icon} {badge.text}
          </span>
        )}
      </div>

      {actionMsg && <p className="payslip-no-print" style={{ color: '#2875D0', fontSize: '13px', fontWeight: 600, margin: '0 0 12px' }}>{actionMsg}</p>}

      {/* Header Controls */}
      <div className="payslip-no-print" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '20px', padding: isMobile ? '16px' : '20px 24px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexDirection: isMobile ? 'column' : 'row', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '18px' : '22px', fontWeight: 900, margin: '0 0 2px 0', color: C.text }}>Payslip</h1>
          <p style={{ margin: 0, fontSize: '12.5px', color: C.textMid }}>Salary slip for the selected month</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <select
              value={selectedId || ''}
              onChange={(e) => setSelectedId(e.target.value || null)}
              style={{ appearance: 'none', background: C.bgSecondary, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '8px 32px 8px 12px', fontSize: '13px', fontWeight: 700, color: C.text, cursor: 'pointer', outline: 'none' }}
            >
              {payslips.length === 0 && <option value="">No payslips available</option>}
              {payslips.map((p) => (
                <option key={p.id} value={p.id}>{p.monthName}</option>
              ))}
            </select>
            <FaChevronDown style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: C.textMid, fontSize: '11px', pointerEvents: 'none' }} />
          </div>

          <button onClick={handlePrint} disabled={!detail} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: C.bgSecondary, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '9px 14px', color: C.text, fontSize: '13px', fontWeight: 700, cursor: detail ? 'pointer' : 'not-allowed', opacity: detail ? 1 : 0.5 }}>
            <FaPrint style={{ fontSize: '12px' }} /> Print
          </button>

          <button
            onClick={selected?.requestStatus === 'APPROVED' || selected?.payrollStatus === 'PAID' ? handleDownload : handleRequest}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#008A60', border: 'none', borderRadius: '12px', padding: '9px 16px', color: '#FFFFFF', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
          >
            {selected?.requestStatus === 'APPROVED' || selected?.payrollStatus === 'PAID' ? <><FaDownload style={{ fontSize: '12px' }} /> Download PDF</> : <><FaPaperPlane style={{ fontSize: '12px' }} /> Request Payslip</>}
          </button>
        </div>
      </div>

      {loading && <p style={{ color: C.textMid, textAlign: 'center', padding: '30px 0' }}>Loading payslips…</p>}
      {error && <p style={{ color: '#DC5555', textAlign: 'center', padding: '10px 0' }}>{error}</p>}
      {!loading && !error && payslips.length === 0 && (
        <div style={{ ...{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px' }, padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ color: C.textMid, fontSize: '14px', margin: 0 }}>No approved payslips yet. Payslips appear here after HR generates and approves the monthly payroll.</p>
        </div>
      )}

      {detailLoading && <p style={{ color: C.textMid, textAlign: 'center', padding: '20px 0' }}>Loading payslip…</p>}

      {/* ── Payslip Document ── */}
      {detail && !detailLoading && (
        <div className="payslip-print-card" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '20px', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #008A60 0%, #0D9488 100%)', padding: isMobile ? '20px' : '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexDirection: isMobile ? 'column' : 'row', gap: '12px' }}>
            <div>
              <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 900, color: '#FFFFFF' }}>GharKaPaisa</h2>
              <p style={{ margin: '0 0 2px 0', fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>Employee Payroll Statement</p>
              <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>Salary Slip for {detail.monthName}</p>
            </div>
            <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: detail.status === 'PAID' ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.2)', border: `1px solid ${detail.status === 'PAID' ? 'rgba(16,185,129,0.4)' : 'rgba(59,130,246,0.4)'}`, borderRadius: '20px', padding: '5px 14px' }}>
                {detail.status === 'PAID' ? <FaCheckCircle style={{ color: '#10B981', fontSize: '14px' }} /> : <FaCheckCircle style={{ color: '#60A5FA', fontSize: '14px' }} />}
                <span style={{ color: '#FFFFFF', fontSize: '12px', fontWeight: 800 }}>Status: {detail.status}</span>
              </div>
              <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                {detail.paidAt ? `Paid on: ${new Date(detail.paidAt).toLocaleDateString('en-IN')}` : detail.approvedAt ? `Approved on: ${new Date(detail.approvedAt).toLocaleDateString('en-IN')}` : ''}
              </p>
            </div>
          </div>

          {/* Employee details */}
          <div className="payslip-print-section" style={{ padding: isMobile ? '16px' : '20px 32px', borderBottom: `1px solid ${C.border}`, display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '14px' }}>
            {[
              { label: 'Employee Name', value: detail.employee?.full_name || '—' },
              { label: 'Employee ID', value: detail.employee?.emp_code || '—' },
              { label: 'Designation', value: detail.employee?.designation || '—' },
              { label: 'Department', value: detail.employee?.department || '—' },
              { label: 'Pay Period', value: `${detail.periodStart} – month end` },
              { label: 'Working Days', value: String(detail.workingDays) },
              { label: 'Days Present', value: String(detail.presentDays) },
              { label: 'LOP Days', value: String(detail.lopDays) }
            ].map((item, index) => (
              <div key={index}>
                <p style={{ margin: '0 0 2px 0', fontSize: '10.5px', fontWeight: 700, color: C.textMid, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{item.label}</p>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: C.text }}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* Earnings / Deductions */}
          <div className="payslip-print-section" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
            <div style={{ borderRight: isMobile ? 'none' : `1px solid ${C.border}`, borderBottom: isMobile ? `1px solid ${C.border}` : 'none' }}>
              <div style={{ padding: '12px 24px', background: '#F0FDF4', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#065F46' }}>EARNINGS</span>
              </div>
              {earnings.map((item, index) => (
                <div key={index} style={{ padding: '10px 24px', borderBottom: index < earnings.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: C.textMid }}>{item.label}</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: C.text }}>{fmt(item.amount)}</span>
                </div>
              ))}
              <div style={{ padding: '12px 24px', background: C.bgSecondary, display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${C.border}` }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: C.text }}>Gross Earnings</span>
                <span style={{ fontSize: '14px', fontWeight: 900, color: '#008A60' }}>{fmt(totalEarnings)}</span>
              </div>
            </div>

            <div>
              <div style={{ padding: '12px 24px', background: '#FEF2F2', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#991B1B' }}>DEDUCTIONS</span>
              </div>
              {billableDeductions.length > 0 ? billableDeductions.map((item, index) => (
                <div key={index} style={{ padding: '10px 24px', borderBottom: index < billableDeductions.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: C.textMid }}>{item.label}</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#DC2626' }}>{fmt(item.amount)}</span>
                </div>
              )) : (
                <div style={{ padding: '15px 24px', color: C.textMid }}>No deductions for this month.</div>
              )}
              <div style={{ padding: '12px 24px', background: C.bgSecondary, display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${C.border}` }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: C.text }}>Total Deductions</span>
                <span style={{ fontSize: '14px', fontWeight: 900, color: '#DC2626' }}>- {fmt(totalDeductions)}</span>
              </div>
            </div>
          </div>

          {/* Net Pay */}
          <div className="payslip-print-section" style={{ padding: isMobile ? '20px' : '20px 32px', background: 'linear-gradient(135deg, #008A60 0%, #065F46 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexDirection: isMobile ? 'column' : 'row', gap: '8px', textAlign: isMobile ? 'center' : 'left' }}>
            <div>
              <p style={{ margin: '0 0 2px 0', fontSize: '12px', color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>NET PAY (TAKE HOME)</p>
              <p style={{ margin: 0, fontSize: isMobile ? '26px' : '32px', fontWeight: 900, color: '#FFFFFF' }}>{fmt(netPay)}</p>
            </div>
            <div style={{ textAlign: isMobile ? 'center' : 'right' }}>
              <p style={{ margin: '0 0 2px 0', fontSize: '11px', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>EMPLOYER CONTRIBUTIONS</p>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#FFFFFF' }}>{fmt(totalEmployer)}</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.75)' }}>Not deducted from employee salary</p>
            </div>
          </div>

          {/* Employer contribution details */}
          {employerRows.length > 0 && (
            <div className="payslip-print-section" style={{ padding: isMobile ? '16px' : '20px 32px', borderTop: `1px solid ${C.border}` }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 800, color: C.text }}>Employer Contribution Details</h3>
              {employerRows.map((item, index) => (
                <div key={index} style={{ padding: '9px 0', display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: '13px', color: C.textMid }}>{item.label}</span>
                  <strong style={{ fontSize: '13px', color: C.text }}>{fmt(item.amount)}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="payslip-no-print" style={{ marginTop: '14px', fontSize: '11.5px', color: C.textMid, textAlign: 'center', lineHeight: 1.5 }}>
        Employer contributions are displayed separately and are not deducted from take-home salary.
        Payslip download is enabled only after HR approves your payslip request.
      </p>
    </div>
  );
}
