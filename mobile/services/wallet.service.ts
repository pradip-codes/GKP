import apiClient, { API_BASE_URL } from './api';
import { getSecureItem } from './storage.service';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const unwrap = (res: any) => res.data;

export const fetchWalletDashboard = async () => {
  try {
    return unwrap(await apiClient.get('/wallet/dashboard'));
  } catch (err: any) {
    throw err.response?.data || { success: false, message: 'Failed to fetch wallet dashboard' };
  }
};

export const fetchWalletTransactions = async (params: Record<string, any> = {}) => {
  try {
    return unwrap(await apiClient.get('/wallet/transactions', { params }));
  } catch (err: any) {
    throw err.response?.data || { success: false, message: 'Failed to fetch transactions' };
  }
};

export const fetchMyWithdrawals = async () => {
  try {
    return unwrap(await apiClient.get('/wallet/my-withdrawals'));
  } catch (err: any) {
    throw err.response?.data || { success: false, message: 'Failed to fetch withdrawals' };
  }
};

export const fetchCommissionSummary = async () => {
  try {
    return unwrap(await apiClient.get('/wallet/commission-summary'));
  } catch (err: any) {
    throw err.response?.data || { success: false, message: 'Failed to fetch commission summary' };
  }
};

export const fetchBankDetails = async () => {
  try {
    return unwrap(await apiClient.get('/wallet/bank-details'));
  } catch (err: any) {
    throw err.response?.data || { success: false, message: 'Failed to fetch bank details' };
  }
};

export const saveBankDetails = async (details: {
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  account_holder_name: string;
}) => {
  try {
    return unwrap(await apiClient.post('/wallet/bank-details', details));
  } catch (err: any) {
    throw err.response?.data || { success: false, message: 'Failed to save bank details' };
  }
};

export const sendWithdrawalOtp = async (amount: number) => {
  try {
    return unwrap(await apiClient.post('/wallet/withdraw/otp/send', { amount }));
  } catch (err: any) {
    throw err.response?.data || { success: false, message: 'Failed to send withdrawal OTP' };
  }
};

export const verifyWithdrawalOtp = async (otp: string, amount: number, bankAccountId?: string) => {
  try {
    return unwrap(await apiClient.post('/wallet/withdraw/otp/verify', {
      otp,
      amount,
      bank_account_id: bankAccountId || undefined,
    }));
  } catch (err: any) {
    throw err.response?.data || { success: false, message: 'Failed to verify withdrawal OTP' };
  }
};

export const cancelWithdrawal = async (id: string) => {
  try {
    return unwrap(await apiClient.post(`/wallet/withdrawals/${id}/cancel`));
  } catch (err: any) {
    throw err.response?.data || { success: false, message: 'Failed to cancel withdrawal' };
  }
};

/** Download the wallet statement PDF/Excel and open the native share sheet. */
export const downloadWalletStatement = async (type: 'pdf' | 'excel' = 'pdf') => {
  const token = await getSecureItem('auth_token');
  const ext = type === 'pdf' ? 'pdf' : 'xlsx';
  const mimeType = type === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const fileUri = `${FileSystem.cacheDirectory}Wallet_Statement_${new Date().toISOString().slice(0, 10)}.${ext}`;

  const result = await FileSystem.downloadAsync(`${API_BASE_URL}/wallet/statement/${type}`, fileUri, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (result.status !== 200) {
    throw new Error('Failed to download statement');
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri, {
      mimeType,
      dialogTitle: 'Wallet Statement',
      UTI: type === 'pdf' ? 'com.adobe.pdf' : 'org.openxmlformats.spreadsheetml.sheet',
    });
  }
  return result.uri;
};
