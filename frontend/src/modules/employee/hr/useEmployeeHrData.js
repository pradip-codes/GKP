import { useEffect, useState } from 'react';
import api from '../../../services/api';

export default function useEmployeeHrData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    api.get('/employee/hr-data')
      .then((response) => {
        if (active && response.data?.success) {
          setData(response.data.data);
          setError('');
        } else if (active) {
          setError('Unable to load your HR information.');
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.response?.data?.message || 'Unable to load your HR information.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  return { data, loading, error };
}

export async function downloadEmployeeDocument(documentId) {
  const response = await api.get(`/employee/hr-documents/${encodeURIComponent(documentId)}/download`);
  const download = response.data?.data;
  if (!response.data?.success || !download?.url) {
    throw new Error(response.data?.message || 'Unable to download this document.');
  }

  const link = document.createElement('a');
  link.href = download.url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.download = download.fileName || '';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 'Not available';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function isPayslipDocument(documentType) {
  const type = String(documentType || '').toLowerCase().replace(/[\s-]+/g, '_');
  return [
    'payslip', 'payslip_pdf',
    'salary_slip', 'salary_slip_pdf',
    'pay_slip', 'pay_slip_pdf',
    'payroll_payslip', 'payroll_payslip_pdf'
  ].includes(type);
}
