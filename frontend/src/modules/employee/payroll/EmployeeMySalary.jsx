import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import api from '../../../services/api';
import {
  FaRupeeSign,
  FaCalendarAlt,
  FaInfoCircle,
  FaWallet,
  FaArrowDown,
  FaArrowUp,
  FaPiggyBank
} from 'react-icons/fa';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount || 0);

const fmtNum = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export default function EmployeeMySalary() {
  const { C } = useTheme();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [view, setView] = useState(null);
  const [availableMonths, setAvailableMonths] = useState([{ year: now.getFullYear(), month: now.getMonth() + 1 }]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const fetchSalary = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/employee/payroll/salary', { params: { year, month } });
      if (res.data?.success) {
        setView(res.data.data);
        if (res.data.data.availableMonths?.length) {
          setAvailableMonths(res.data.data.availableMonths);
        }
      } else {
        setError(res.data?.message || 'Failed to load salary');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load salary data');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetchSalary(); }, [fetchSalary]);

  const comp = view?.computed;
  const record = view?.record;

  const earnings = comp?.earnings || [];
  const deductions = (comp?.deductions || []).filter((d) => d.amount > 0);
  const grossEarnings = comp?.grossEarnings || 0;
  const totalDeductions = comp?.totalDeductions || 0;
  const netSalary = comp?.netPay || 0;

  const employeePF = deductions.find((d) => /provident/i.test(d.label))?.amount || 0;
  const employeeESI = deductions.find((d) => /esi/i.test(d.label))?.amount || 0;
  const employerPF = (comp?.employerContributions || []).find((e) => /pf/i.test(e.label))?.amount || 0;
  const employerESI = (comp?.employerContributions || []).find((e) => /esi/i.test(e.label))?.amount || 0;

  const summaryCards = [
    { title: 'Gross Earnings', amount: grossEarnings, icon: <FaArrowUp />, color: '#008A60', background: 'rgba(0,138,96,0.10)' },
    { title: 'Total Deductions', amount: totalDeductions, icon: <FaArrowDown />, color: '#DC5555', background: 'rgba(220,85,85,0.10)' },
    { title: 'Net Salary', amount: netSalary, icon: <FaWallet />, color: '#2875D0', background: 'rgba(40,117,208,0.10)' }
  ];

  const cardStyle = {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: '18px',
    padding: isMobile ? '16px' : '22px'
  };
  const mutedText = { color: C.textMid, fontSize: '12px' };
  const rowStyle = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: '12px', padding: '12px 0', borderBottom: `1px solid ${C.border}`, fontSize: '13px'
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: isMobile ? '12px 10px 60px' : '0 0 48px', fontFamily: "'Inter', sans-serif", color: C.text }}>
      {/* Header */}
      <div style={{ ...cardStyle, padding: isMobile ? '16px' : '24px 28px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: 'rgba(0,138,96,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#008A60', fontSize: '20px', flexShrink: 0 }}>
              <FaRupeeSign />
            </div>
            <div>
              <h1 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 900, margin: '0 0 4px', color: C.text }}>My Salary</h1>
              <p style={{ fontSize: '13px', color: C.textMid, margin: 0 }}>
                {comp?.monthName || `${MONTH_NAMES[month - 1]} ${year}`}
                {record?.status ? ` • Payroll: ${record.status}` : ' • Live estimate (payroll not generated)'}
              </p>
            </div>
          </div>

          {/* Month Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: C.bgSecondary, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '6px 12px' }}>
            <FaCalendarAlt style={{ color: C.textMid }} />
            <select
              value={`${year}-${month}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split('-').map(Number);
                setYear(y); setMonth(m);
              }}
              aria-label="Select salary month"
              style={{ border: 'none', outline: 'none', background: 'transparent', color: C.text, fontSize: '12px', fontWeight: 700, cursor: 'pointer', maxWidth: '160px' }}
            >
              {availableMonths.map((m) => (
                <option key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`} style={{ color: '#111827' }}>
                  {MONTH_NAMES[m.month - 1]} {m.year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading && <p style={{ color: C.textMid, textAlign: 'center', padding: '30px 0' }}>Loading salary…</p>}
      {error && <p style={{ color: '#DC5555', textAlign: 'center', padding: '10px 0' }}>{error}</p>}

      {!loading && !error && comp && (
        <>
          {/* Attendance summary strip */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {[
              ['Working Days', comp.workingDays],
              ['Present', comp.presentDays],
              ['Leave', comp.leaveDays],
              ['LOP', comp.lopDays],
              ['Late Marks', comp.lateCount]
            ].map(([label, val]) => (
              <div key={label} style={{ ...cardStyle, padding: '10px 16px', flex: '1 1 100px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '11px', color: C.textMid, fontWeight: 600 }}>{label}</p>
                <strong style={{ fontSize: '18px' }}>{val}</strong>
              </div>
            ))}
          </div>

          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: '14px', marginBottom: '18px' }}>
            {summaryCards.map((item) => (
              <div key={item.title} style={{ ...cardStyle, padding: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', color: C.textMid, fontWeight: 600 }}>{item.title}</p>
                  <h2 style={{ margin: '9px 0 0', fontSize: isMobile ? '23px' : '25px', fontWeight: 900, color: item.color }}>{formatCurrency(item.amount)}</h2>
                </div>
                <div style={{ width: '42px', height: '42px', borderRadius: '13px', background: item.background, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', flexShrink: 0 }}>{item.icon}</div>
              </div>
            ))}
          </div>

          {/* Earnings / Deductions */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: '16px', marginBottom: '18px' }}>
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 10px', fontSize: '15px', fontWeight: 800 }}>Earnings</h3>
              {earnings.map((item) => (
                <div key={item.label} style={rowStyle}>
                  <span style={{ color: C.textMid }}>{item.label}</span>
                  <strong>{formatCurrency(item.amount)}</strong>
                </div>
              ))}
              <div style={{ ...rowStyle, borderBottom: 'none', paddingTop: '16px', fontWeight: 800 }}>
                <span>Gross Earnings</span>
                <strong style={{ color: '#008A60' }}>{formatCurrency(grossEarnings)}</strong>
              </div>
            </div>

            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 10px', fontSize: '15px', fontWeight: 800 }}>Deductions</h3>
              {deductions.length > 0 ? deductions.map((item) => (
                <div key={item.label} style={rowStyle}>
                  <span style={{ color: C.textMid }}>{item.label}</span>
                  <strong>{formatCurrency(item.amount)}</strong>
                </div>
              )) : (
                <p style={{ color: C.textMid, fontSize: '13px' }}>No deductions for this month.</p>
              )}
              <div style={{ ...rowStyle, borderBottom: 'none', paddingTop: '16px', fontWeight: 800 }}>
                <span>Total Deductions</span>
                <strong style={{ color: '#DC5555' }}>{formatCurrency(totalDeductions)}</strong>
              </div>
            </div>
          </div>

          {/* Net Salary */}
          <div style={{ background: 'rgba(0,138,96,0.09)', border: '1px solid rgba(0,138,96,0.25)', borderRadius: '18px', padding: isMobile ? '20px' : '24px', marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <div>
                <p style={{ margin: '0 0 7px', color: '#008A60', fontSize: '13px', fontWeight: 700 }}>Net Salary Payable{record?.status === 'APPROVED' || record?.status === 'PAID' ? '' : ' (estimated)'}</p>
                <h1 style={{ margin: 0, fontSize: isMobile ? '27px' : '34px', fontWeight: 900, color: '#008A60' }}>{formatCurrency(netSalary)}</h1>
                <p style={{ margin: '8px 0 0', fontSize: '11px', color: C.textMid }}>
                  {comp.salarySource === 'offered_salary' ? 'Based on offered salary (no salary structure set)' : 'Based on approved salary structure'} · Gross earnings minus deductions
                </p>
              </div>
              <div style={{ width: '50px', height: '50px', borderRadius: '15px', background: 'rgba(0,138,96,0.13)', color: '#008A60', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '23px', flexShrink: 0 }}><FaWallet /></div>
            </div>
          </div>

          {/* Statutory Details */}
          <div style={{ ...cardStyle, marginBottom: '18px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 800 }}>Statutory Deductions (PF & ESI)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, minmax(0, 1fr))', gap: '18px' }}>
              <div><p style={{ ...mutedText, margin: '0 0 7px' }}>Employee PF</p><strong>{fmtNum(employeePF)}</strong></div>
              <div><p style={{ ...mutedText, margin: '0 0 7px' }}>Employer PF</p><strong>{fmtNum(employerPF)}</strong></div>
              <div><p style={{ ...mutedText, margin: '0 0 7px' }}>Employee ESI</p><strong>{fmtNum(employeeESI)}</strong></div>
              <div><p style={{ ...mutedText, margin: '0 0 7px' }}>Employer ESI</p><strong>{fmtNum(employerESI)}</strong></div>
            </div>
            <p style={{ margin: '14px 0 0', fontSize: '11px', lineHeight: 1.7, color: C.textMid }}>
              PF: 12% of (Basic + DA) up to ₹15,000 wage ceiling. ESI: 0.75% employee / 3.25% employer on gross up to ₹21,000.
              Statutory deductions apply when gross salary ≥ ₹16,000. Employer contributions are not deducted from take-home pay.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', padding: '14px 16px', background: C.bgSecondary, borderRadius: '12px', border: `1px solid ${C.border}` }}>
            <FaInfoCircle style={{ color: C.textMid, fontSize: '14px', marginTop: '2px', flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: '12px', color: C.textMid, lineHeight: 1.6 }}>
              Salary is computed from your salary structure (or offered salary), monthly incentives, attendance, leaves and late marks.
              Figures marked "estimated" are live calculations — the final payslip is available after HR approves the monthly payroll.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
