import apiClient, { API_BASE_URL } from './api';
import { getSecureItem } from './storage.service';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Linking } from 'react-native';

const BASE = '/employee/payroll';
const unwrap = (res: any) => res.data;

export interface PayrollLine { label: string; amount: number; note?: string }

export const fetchMySalary = async (month?: number, year?: number) => {
  try {
    const params: Record<string, any> = {};
    if (month) params.month = month;
    if (year) params.year = year;
    return unwrap(await apiClient.get(`${BASE}/salary`, { params }));
  } catch (err: any) {
    throw err.response?.data || { success: false, message: 'Failed to fetch salary details' };
  }
};

export const fetchPayslips = async () => {
  try {
    return unwrap(await apiClient.get(`${BASE}/payslips`));
  } catch (err: any) {
    throw err.response?.data || { success: false, message: 'Failed to fetch payslips' };
  }
};

export const fetchPayslipDetail = async (id: string) => {
  try {
    return unwrap(await apiClient.get(`${BASE}/payslips/${id}`));
  } catch (err: any) {
    throw err.response?.data || { success: false, message: 'Failed to fetch payslip' };
  }
};

export const requestPayslip = async (id: string) => {
  try {
    return unwrap(await apiClient.post(`${BASE}/payslips/${id}/request`));
  } catch (err: any) {
    throw err.response?.data || { success: false, message: 'Failed to request payslip' };
  }
};

/** Download payslip PDF and open the native share sheet. */
export const downloadPayslipPdf = async (id: string, month?: number, year?: number) => {
  const token = await getSecureItem('auth_token');
  const fileUri = `${FileSystem.cacheDirectory}payslip-${year || ''}-${String(month || '').padStart(2, '0')}-${id.slice(0, 8)}.pdf`;
  const result = await FileSystem.downloadAsync(`${API_BASE_URL}${BASE}/payslips/${id}/download`, fileUri, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (result.status !== 200) throw new Error('Payslip download not approved yet');
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', dialogTitle: 'Payslip', UTI: 'com.adobe.pdf' });
  }
  return result.uri;
};

export const fetchPayrollDocuments = async () => {
  try {
    return unwrap(await apiClient.get(`${BASE}/documents`));
  } catch (err: any) {
    throw err.response?.data || { success: false, message: 'Failed to fetch documents' };
  }
};

/** Documents endpoint redirects to a signed URL — resolve it then open/share. */
export const openPayrollDocument = async (id: string) => {
  const token = await getSecureItem('auth_token');
  const url = `${API_BASE_URL}${BASE}/documents/${id}/download`;

  // Follow the redirect manually to get the final URL
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const finalUrl = res.url || url;
  if (finalUrl.includes('.pdf') || finalUrl.includes('pdf')) {
    const fileUri = `${FileSystem.cacheDirectory}doc-${id.slice(0, 8)}.pdf`;
    const dl = await FileSystem.downloadAsync(finalUrl, fileUri);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(dl.uri, { mimeType: 'application/pdf', dialogTitle: 'Document', UTI: 'com.adobe.pdf' });
    }
    return dl.uri;
  }
  await Linking.openURL(finalUrl);
  return finalUrl;
};

export const fetchPfSummary = async (year?: number) => {
  try {
    return unwrap(await apiClient.get(`${BASE}/pf-summary`, { params: year ? { year } : {} }));
  } catch (err: any) {
    throw err.response?.data || { success: false, message: 'Failed to fetch PF summary' };
  }
};
