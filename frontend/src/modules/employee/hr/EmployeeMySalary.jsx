import React from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import useEmployeeHrData, { formatCurrency, formatDate } from './useEmployeeHrData';

export default function EmployeeMySalary() {
  const { C } = useTheme();
  const { data, loading, error } = useEmployeeHrData();
  const employee = data?.employee;
  const summary = data?.incentiveSummary || {};
  const transactions = data?.incentiveTransactions || [];

  const cardStyle = {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: 20
  };

  return (
    <div style={{ padding: '28px 30px', maxWidth: 1120, margin: '0 auto', width: '100%', overflowY: 'auto' }}>
      <header style={{ marginBottom: 22 }}>
        <div style={{ color: C.employeePrimary || '#0F766E', fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>HR Department</div>
        <h1 style={{ color: C.text, fontSize: 28, fontWeight: 900, margin: '7px 0' }}>My Salary</h1>
        <p style={{ color: C.textMid, margin: 0 }}>Salary information from your employee record and incentive transactions.</p>
      </header>

      {loading ? (
        <div style={cardStyle}>Loading your salary information...</div>
      ) : error ? (
        <div role="alert" style={{ ...cardStyle, color: '#B91C1C' }}>{error}</div>
      ) : (
        <>
          <section style={{ ...cardStyle, marginBottom: 18 }}>
            <div style={{ color: C.textMid, fontSize: 13, fontWeight: 700 }}>Salary in employment record</div>
            <div style={{ color: C.text, fontSize: 34, fontWeight: 900, margin: '8px 0' }}>
              {employee?.offered_salary == null ? 'Not available' : formatCurrency(employee.offered_salary)}
            </div>
            <div style={{ color: C.textMid, fontSize: 13 }}>
              {employee?.designation || 'Designation not recorded'}
              {employee?.department ? ` · ${employee.department}` : ''}
              {employee?.employee_id ? ` · Employee ID ${employee.employee_id}` : ''}
            </div>
            <p style={{ color: C.textMid, fontSize: 12, margin: '14px 0 0' }}>
              This is the salary value recorded in your employee profile, not a payroll calculation or payslip amount.
            </p>
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
            <section style={cardStyle}>
              <div style={{ color: C.textMid, fontSize: 13, fontWeight: 700 }}>Paid incentives</div>
              <div style={{ color: C.text, fontSize: 24, fontWeight: 900, marginTop: 8 }}>{formatCurrency(summary.paid_incentives)}</div>
            </section>
            <section style={cardStyle}>
              <div style={{ color: C.textMid, fontSize: 13, fontWeight: 700 }}>Pending incentives</div>
              <div style={{ color: C.text, fontSize: 24, fontWeight: 900, marginTop: 8 }}>{formatCurrency(summary.pending_incentives)}</div>
            </section>
          </div>

          <section style={cardStyle}>
            <h2 style={{ color: C.text, fontSize: 18, fontWeight: 900, margin: '0 0 15px' }}>Recent incentive transactions</h2>
            {transactions.length === 0 ? (
              <p style={{ color: C.textMid, margin: 0 }}>No incentive transactions are recorded for your account.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: C.textMid, fontSize: 12 }}>
                      <th style={{ padding: '10px 8px', borderBottom: `1px solid ${C.border}` }}>Date</th>
                      <th style={{ padding: '10px 8px', borderBottom: `1px solid ${C.border}` }}>Type</th>
                      <th style={{ padding: '10px 8px', borderBottom: `1px solid ${C.border}` }}>Status</th>
                      <th style={{ padding: '10px 8px', borderBottom: `1px solid ${C.border}`, textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((item) => (
                      <tr key={item.id} style={{ color: C.text, fontSize: 13 }}>
                        <td style={{ padding: '12px 8px', borderBottom: `1px solid ${C.border}` }}>{formatDate(item.paid_at || item.created_at)}</td>
                        <td style={{ padding: '12px 8px', borderBottom: `1px solid ${C.border}` }}>{item.incentive_type || item.transaction_type || 'Incentive'}</td>
                        <td style={{ padding: '12px 8px', borderBottom: `1px solid ${C.border}` }}>{item.status || 'Unknown'}</td>
                        <td style={{ padding: '12px 8px', borderBottom: `1px solid ${C.border}`, textAlign: 'right', fontWeight: 800 }}>{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p style={{ color: C.textMid, fontSize: 12, margin: '15px 0 0' }}>
              Incentives are shown separately from salary. Payroll deductions, tax withholding, and net pay are not available in the employee records.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
