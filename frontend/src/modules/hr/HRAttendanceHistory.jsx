import React, { useEffect, useState } from 'react';
import { FaCalendarAlt, FaSearch } from 'react-icons/fa';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../services/api';

const currentDate = new Date();
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function formatTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 5);
  return date.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function HRAttendanceHistory() {
  const { C } = useTheme();
  const [month, setMonth] = useState(String(currentDate.getMonth() + 1));
  const [year, setYear] = useState(String(currentDate.getFullYear()));
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ data: [], pagination: { total: 0, total_pages: 1 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    api.get('/hr/attendance-history', { params: { month, year, search, page, limit: 50 } })
      .then((response) => {
        if (active && response.data?.success) setResult(response.data.data);
        else if (active) setError(response.data?.message || 'Unable to load attendance history.');
      })
      .catch((err) => {
        if (active) setError(err.response?.data?.message || 'Unable to load attendance history.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [month, year, search, page]);

  const cardStyle = {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: 18
  };
  const inputStyle = {
    minHeight: 42,
    padding: '9px 12px',
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    background: C.bgSecondary,
    color: C.text,
    fontSize: 14
  };
  const pagination = result?.pagination || {};
  const records = result?.data || [];

  return (
    <div style={{ background: C.bg, minHeight: '100%', padding: '22px 24px', color: C.text }}>
      <div style={{ maxWidth: 1320, margin: '0 auto' }}>
        <header style={{ marginBottom: 20 }}>
          <div style={{ color: C.employeePrimary || C.teal || '#0F766E', fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>HR Department</div>
          <h1 style={{ fontSize: 27, fontWeight: 900, margin: '6px 0' }}>Attendance History</h1>
          <p style={{ color: C.textMid, margin: 0 }}>Review employee check-ins, check-outs, working hours, and attendance status.</p>
        </header>

        <section style={{ ...cardStyle, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <label style={{ position: 'relative', flex: '1 1 260px' }}>
            <FaSearch style={{ position: 'absolute', left: 13, top: 14, color: C.textMid }} />
            <input
              aria-label="Search employees"
              placeholder="Search employee name, ID, or email"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
              style={{ ...inputStyle, width: '100%', paddingLeft: 38 }}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.textMid }}>
            <FaCalendarAlt />
            <select aria-label="Attendance month" value={month} onChange={(event) => { setMonth(event.target.value); setPage(1); }} style={inputStyle}>
              {MONTHS.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
            </select>
          </label>
          <select aria-label="Attendance year" value={year} onChange={(event) => { setYear(event.target.value); setPage(1); }} style={inputStyle}>
            {Array.from({ length: 7 }, (_, index) => currentDate.getFullYear() - index).map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
          <span style={{ color: C.textMid, fontSize: 13, fontWeight: 700 }}>
            {pagination.total || 0} records
          </span>
        </section>

        <section style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 36, textAlign: 'center', color: C.textMid }}>Loading attendance records...</div>
          ) : error ? (
            <div role="alert" style={{ padding: 24, color: '#B91C1C' }}>{error}</div>
          ) : records.length === 0 ? (
            <div style={{ padding: 36, textAlign: 'center', color: C.textMid }}>No attendance records found for this month.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 880, borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ color: C.textMid, background: C.bgSecondary, fontSize: 12 }}>
                    {['Employee', 'Employee ID', 'Date', 'Check-in', 'Check-out', 'Working hours', 'Status'].map((heading) => (
                      <th key={heading} style={{ padding: '13px 15px', borderBottom: `1px solid ${C.border}` }}>{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.attendance_id} style={{ color: C.text, fontSize: 13 }}>
                      <td style={{ padding: '13px 15px', borderBottom: `1px solid ${C.border}`, fontWeight: 800 }}>
                        {record.employee_name || '—'}
                        <div style={{ color: C.textMid, fontSize: 11, fontWeight: 500, marginTop: 3 }}>{record.department || '—'}</div>
                      </td>
                      <td style={{ padding: '13px 15px', borderBottom: `1px solid ${C.border}` }}>{record.employee_code || '—'}</td>
                      <td style={{ padding: '13px 15px', borderBottom: `1px solid ${C.border}` }}>{formatDate(record.date)}</td>
                      <td style={{ padding: '13px 15px', borderBottom: `1px solid ${C.border}` }}>{formatTime(record.check_in_time)}</td>
                      <td style={{ padding: '13px 15px', borderBottom: `1px solid ${C.border}` }}>{formatTime(record.check_out_time)}</td>
                      <td style={{ padding: '13px 15px', borderBottom: `1px solid ${C.border}` }}>{record.duration_display || '—'}</td>
                      <td style={{ padding: '13px 15px', borderBottom: `1px solid ${C.border}`, fontWeight: 800 }}>{record.status || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && !error && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: `1px solid ${C.border}`, color: C.textMid, fontSize: 13 }}>
              <span>Page {pagination.page || 1} of {pagination.total_pages || 1}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" disabled={(pagination.page || 1) <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} style={{ ...inputStyle, cursor: 'pointer' }}>Previous</button>
                <button type="button" disabled={(pagination.page || 1) >= (pagination.total_pages || 1)} onClick={() => setPage((value) => value + 1)} style={{ ...inputStyle, cursor: 'pointer' }}>Next</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
