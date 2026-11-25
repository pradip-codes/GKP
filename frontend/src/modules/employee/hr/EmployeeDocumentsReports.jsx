import React, { useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import useEmployeeHrData, { downloadEmployeeDocument, formatDate } from './useEmployeeHrData';

const tabs = ['Documents', 'PF', 'Tax'];

function documentGroup(documentType) {
  const type = String(documentType || '').toLowerCase().replace(/[_-]+/g, ' ');
  if (/\b(pf|provident|uan|epf)\b/.test(type)) return 'PF';
  if (/\b(tax|form.?16|tds|income.?tax)\b/.test(type)) return 'Tax';
  return 'Documents';
}

export default function EmployeeDocumentsReports() {
  const { C } = useTheme();
  const { data, loading, error } = useEmployeeHrData();
  const [activeTab, setActiveTab] = useState('Documents');
  const [downloadingId, setDownloadingId] = useState('');
  const [downloadError, setDownloadError] = useState('');
  const documents = data?.documents || [];
  const visibleDocuments = activeTab === 'Documents'
    ? documents
    : documents.filter((item) => documentGroup(item.document_type) === activeTab);

  const handleDownload = async (item) => {
    setDownloadingId(item.id);
    setDownloadError('');
    try {
      await downloadEmployeeDocument(item.id);
    } catch (err) {
      setDownloadError(err.response?.data?.message || err.message || 'Unable to download this document.');
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

  return (
    <div style={{ padding: '28px 30px', maxWidth: 1120, margin: '0 auto', width: '100%', overflowY: 'auto' }}>
      <header style={{ marginBottom: 22 }}>
        <div style={{ color: C.employeePrimary || '#0F766E', fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>HR Department</div>
        <h1 style={{ color: C.text, fontSize: 28, fontWeight: 900, margin: '7px 0' }}>Documents &amp; Reports</h1>
        <p style={{ color: C.textMid, margin: 0 }}>View documents saved to your employee account. Only records uploaded by you or HR are shown.</p>
      </header>

      <section style={{ ...cardStyle, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {tabs.map((tab) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                style={{
                  border: `1px solid ${active ? (C.employeePrimary || '#0F766E') : C.border}`,
                  borderRadius: 999,
                  padding: '9px 16px',
                  background: active ? (C.employeePrimary || '#0F766E') : 'transparent',
                  color: active ? '#fff' : C.textMid,
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </section>

      {loading ? (
        <div style={{ ...cardStyle, color: C.textMid }}>Loading your documents...</div>
      ) : error ? (
        <div role="alert" style={{ ...cardStyle, color: '#B91C1C' }}>{error}</div>
      ) : (
        <section style={cardStyle}>
          <h2 style={{ color: C.text, fontSize: 18, fontWeight: 900, margin: '0 0 16px' }}>
            {activeTab === 'Documents' ? 'Employee documents' : `${activeTab} records`}
          </h2>
          {downloadError && <p role="alert" style={{ color: '#B91C1C', margin: '0 0 14px' }}>{downloadError}</p>}
          {visibleDocuments.length === 0 ? (
            <div style={{ padding: '28px 10px', textAlign: 'center', color: C.textMid }}>
              <strong style={{ display: 'block', color: C.text, marginBottom: 6 }}>
                {activeTab === 'Documents' ? 'No employee documents on file' : `No ${activeTab} records on file`}
              </strong>
              {activeTab === 'Documents'
                ? 'Documents will appear here after they are uploaded to your employee account.'
                : `${activeTab} statements or supporting documents have not been recorded by HR.`}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {visibleDocuments.map((item) => (
                <div key={item.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  flexWrap: 'wrap',
                  padding: 14,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12
                }}>
                  <div>
                    <div style={{ color: C.text, fontWeight: 800 }}>{item.document_file_name || item.document_type || 'Employee document'}</div>
                    <div style={{ color: C.textMid, fontSize: 12, marginTop: 5 }}>
                      {String(item.document_type || 'document').replace(/[_-]+/g, ' ')} · Added {formatDate(item.created_at)} · {item.verification_status || 'Status unavailable'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownload(item)}
                    disabled={downloadingId === item.id}
                    style={{
                      border: 'none',
                      borderRadius: 9,
                      padding: '9px 14px',
                      background: C.employeePrimary || '#0F766E',
                      color: '#fff',
                      fontWeight: 800,
                      cursor: downloadingId === item.id ? 'wait' : 'pointer',
                      opacity: downloadingId === item.id ? 0.7 : 1
                    }}
                  >
                    {downloadingId === item.id ? 'Preparing...' : 'View document'}
                  </button>
                </div>
              ))}
            </div>
          )}
          {activeTab !== 'Documents' && (
            <p style={{ color: C.textMid, fontSize: 12, margin: '16px 0 0' }}>
              This view lists only records actually stored on your employee account; it does not generate statutory reports.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
