import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import api from '../../../services/api';
import {
  FaFileAlt, FaFilePdf, FaFileWord, FaFileImage, FaDownload,
  FaShieldAlt, FaUniversity, FaReceipt, FaSyncAlt
} from 'react-icons/fa';

const DOC_TYPE_META = {
  PAYSLIP: { label: 'Salary Slip', category: 'payroll', color: '#008A60' },
  PF_STATEMENT: { label: 'PF Statement', category: 'pf', color: '#1D4ED8' },
  FORM16: { label: 'Form 16 / TDS', category: 'tax', color: '#7C3AED' },
  SALARY_CERT: { label: 'Salary Certificate', category: 'hr', color: '#D97706' },
  EMPLOYMENT_CERT: { label: 'Employment Certificate', category: 'hr', color: '#D97706' },
  BANK_PROOF: { label: 'Bank Proof', category: 'hr', color: '#0E7490' },
  OTHER: { label: 'Other Document', category: 'other', color: '#6B7280' }
};

const CATEGORY_LABELS = {
  payroll: 'Payroll Documents',
  pf: 'PF Statements',
  hr: 'HR Certificates',
  tax: 'Tax Documents',
  other: 'Other Documents'
};

const CATEGORY_COLORS = {
  payroll: '#008A60',
  pf: '#1D4ED8',
  hr: '#D97706',
  tax: '#7C3AED',
  other: '#6B7280'
};

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

function fileIcon(mime) {
  if (mime?.includes('pdf')) return <FaFilePdf />;
  if (mime?.includes('word') || mime?.includes('document')) return <FaFileWord />;
  if (mime?.startsWith('image')) return <FaFileImage />;
  return <FaFileAlt />;
}

export default function EmployeeDocumentsReports() {
  const { C } = useTheme();
  const now = new Date();

  const [activeTab, setActiveTab] = useState('documents');
  const [documents, setDocuments] = useState([]);
  const [pfSummary, setPfSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [year, setYear] = useState(now.getFullYear());

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [docsRes, pfRes] = await Promise.all([
        api.get('/employee/payroll/documents'),
        api.get('/employee/payroll/pf-summary', { params: { year } })
      ]);
      if (docsRes.data?.success) setDocuments(docsRes.data.data || []);
      if (pfRes.data?.success) setPfSummary(pfRes.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Group documents by category derived from doc_type
  const docsWithMeta = documents.map((d) => ({
    ...d,
    meta: DOC_TYPE_META[d.doc_type] || DOC_TYPE_META.OTHER,
    category: (DOC_TYPE_META[d.doc_type] || DOC_TYPE_META.OTHER).category
  }));

  const categories = ['all', ...Array.from(new Set(docsWithMeta.map((d) => d.category)))];
  const filtered = filterCategory === 'all' ? docsWithMeta : docsWithMeta.filter((d) => d.category === filterCategory);
  const grouped = filtered.reduce((acc, d) => {
    (acc[d.category] = acc[d.category] || []).push(d);
    return acc;
  }, {});

  const handleDownload = async (doc) => {
    try {
      const res = await api.get(`/employee/payroll/documents/${doc.id}/download`, {
        responseType: 'blob',
        maxRedirects: 0,
        validateStatus: (s) => s >= 200 && s < 400
      });
      // If backend redirected to a signed URL, axios follows it and returns the file blob
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name || 'document';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      // Fallback: open file_url directly
      if (doc.file_url) window.open(doc.file_url, '_blank');
    }
  };

  const cardStyle = { background: C.card, border: `1px solid ${C.border}`, borderRadius: '18px', padding: isMobile ? '16px' : '20px' };

  const TABS = [
    { id: 'documents', label: 'Documents', icon: <FaFileAlt /> },
    { id: 'pf', label: 'PF Details', icon: <FaShieldAlt /> },
    { id: 'tax', label: 'Tax Summary', icon: <FaReceipt /> }
  ];

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: isMobile ? '12px 10px 60px' : '0 0 48px', fontFamily: "'Inter', sans-serif", color: C.text }}>
      {/* Header */}
      <div style={{ ...cardStyle, padding: isMobile ? '16px' : '20px 28px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexDirection: isMobile ? 'column' : 'row', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '18px' : '22px', fontWeight: 900, margin: '0 0 2px', color: C.text }}>Documents & Reports</h1>
          <p style={{ margin: 0, fontSize: '12.5px', color: C.textMid }}>Official payroll, PF and tax documents issued by HR</p>
        </div>
        {activeTab !== 'documents' && (
          <select value={year} onChange={(e) => setYear(parseInt(e.target.value, 10))} style={{ background: C.bgSecondary, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '8px 12px', fontSize: '13px', fontWeight: 700, color: C.text }}>
            {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 18px', borderRadius: '10px',
              border: `1px solid ${activeTab === t.id ? '#008A60' : C.border}`,
              background: activeTab === t.id ? '#008A60' : C.card,
              color: activeTab === t.id ? '#fff' : C.textMid,
              fontSize: '13px', fontWeight: 700, cursor: 'pointer'
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {loading && <p style={{ color: C.textMid, textAlign: 'center', padding: '30px 0' }}><FaSyncAlt style={{ marginRight: 6 }} />Loading…</p>}
      {error && <p style={{ color: '#DC5555', textAlign: 'center', padding: '10px 0' }}>{error}</p>}

      {/* ── DOCUMENTS TAB ── */}
      {!loading && activeTab === 'documents' && (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                style={{
                  padding: '6px 14px', borderRadius: '16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                  border: `1px solid ${filterCategory === cat ? CATEGORY_COLORS[cat] || '#008A60' : C.border}`,
                  background: filterCategory === cat ? (CATEGORY_COLORS[cat] || '#008A60') : 'transparent',
                  color: filterCategory === cat ? '#fff' : C.textMid
                }}
              >
                {cat === 'all' ? 'All' : CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          {Object.keys(grouped).length === 0 && (
            <div style={{ ...cardStyle, padding: '40px 20px', textAlign: 'center' }}>
              <p style={{ color: C.textMid, fontSize: '14px', margin: 0 }}>No documents available yet. HR will upload salary slips, PF statements and certificates here.</p>
            </div>
          )}

          {Object.entries(grouped).map(([cat, docs]) => (
            <div key={cat} style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 800, color: CATEGORY_COLORS[cat] || C.text, margin: '0 0 10px' }}>{CATEGORY_LABELS[cat]}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0,1fr))', gap: '12px' }}>
                {docs.map((doc) => (
                  <div key={doc.id} style={{ ...cardStyle, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: `${doc.meta.color}18`, color: doc.meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', flexShrink: 0 }}>
                      {fileIcon(doc.mime_type)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</p>
                      <p style={{ margin: '3px 0 0', fontSize: '11px', color: C.textMid }}>
                        {doc.meta.label}{doc.period ? ` • ${doc.period}` : ''}{doc.issued_on ? ` • Issued ${fmtDate(doc.issued_on)}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDownload(doc)}
                      title="Download"
                      style={{ width: '36px', height: '36px', borderRadius: '9px', border: `1px solid ${C.border}`, background: C.bgSecondary, color: '#008A60', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                    >
                      <FaDownload />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── PF DETAILS TAB ── */}
      {!loading && activeTab === 'pf' && (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 800 }}>
            <FaShieldAlt style={{ color: '#1D4ED8', marginRight: 8 }} />Provident Fund — FY {year}
          </h3>
          {!pfSummary || pfSummary.monthsCount === 0 ? (
            <p style={{ color: C.textMid, fontSize: '13px', margin: 0 }}>
              No approved payroll records for {year} yet. PF contribution figures will appear here once HR approves monthly payrolls.
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, minmax(0,1fr))', gap: '18px' }}>
              {[
                ['Employee PF (YTD)', fmt(pfSummary.employeePfYtd)],
                ['Employer PF (YTD)', fmt(pfSummary.employerPfYtd)],
                ['Employee ESI (YTD)', fmt(pfSummary.employeeEsiYtd)],
                ['Employer ESI (YTD)', fmt(pfSummary.employerEsiYtd)],
                ['Months Processed', String(pfSummary.monthsCount)],
                ['PAN', pfSummary.pan || 'Not available']
              ].map(([label, value]) => (
                <div key={label}>
                  <p style={{ margin: '0 0 6px', fontSize: '12px', color: C.textMid }}>{label}</p>
                  <strong style={{ fontSize: '14px' }}>{value}</strong>
                </div>
              ))}
            </div>
          )}
          <p style={{ margin: '16px 0 0', fontSize: '11px', lineHeight: 1.7, color: C.textMid }}>
            PF figures are computed from approved payroll records (12% of Basic+DA, ₹15,000 wage ceiling).
            UAN and PF account number are available from HR once EPFO registration details are uploaded.
          </p>
        </div>
      )}

      {/* ── TAX SUMMARY TAB ── */}
      {!loading && activeTab === 'tax' && (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 800 }}>
            <FaReceipt style={{ color: '#7C3AED', marginRight: 8 }} />Tax Summary — FY {year}
          </h3>
          {!pfSummary || pfSummary.monthsCount === 0 ? (
            <p style={{ color: C.textMid, fontSize: '13px', margin: 0 }}>
              No approved payroll records for {year} yet. Tax figures will appear once payroll is processed.
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, minmax(0,1fr))', gap: '18px' }}>
              {[
                ['PAN', pfSummary.pan || 'Not available'],
                ['Gross Earnings (YTD, processed months)', fmt(pfSummary.grossYtd)],
                ['Employee PF Deducted (YTD)', fmt(pfSummary.employeePfYtd)],
                ['Employee ESI Deducted (YTD)', fmt(pfSummary.employeeEsiYtd)],
                ['Professional Tax (approx.)', fmt(200 * pfSummary.monthsCount)],
                ['Form 16', documents.some((d) => d.doc_type === 'FORM16') ? 'Available in Documents tab' : 'Not uploaded yet']
              ].map(([label, value]) => (
                <div key={label}>
                  <p style={{ margin: '0 0 6px', fontSize: '12px', color: C.textMid }}>{label}</p>
                  <strong style={{ fontSize: '14px' }}>{value}</strong>
                </div>
              ))}
            </div>
          )}
          <p style={{ margin: '16px 0 0', fontSize: '11px', lineHeight: 1.7, color: C.textMid }}>
            TDS is not currently computed by payroll. Form 16 certificates are issued by HR at year-end —
            download them from the Documents tab when available.
          </p>
        </div>
      )}
    </div>
  );
}
