import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Icon } from '../../components/Icon';
import { useTheme } from '../../contexts/ThemeContext';
import { colors as baseColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import {
  fetchWalletDashboard,
  fetchWalletTransactions,
  fetchMyWithdrawals,
  fetchCommissionSummary,
  fetchBankDetails,
  saveBankDetails,
  sendWithdrawalOtp,
  verifyWithdrawalOtp,
  cancelWithdrawal,
  downloadWalletStatement,
} from '../../services/wallet.service';
import { fetchPartnerKycStatus } from '../../services/partner.service';

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'wallet' },
  { id: 'ledger', label: 'Ledger', icon: 'receipt' },
  { id: 'withdrawals', label: 'Withdrawals', icon: 'cash' },
  { id: 'bank', label: 'Bank Setup', icon: 'business' },
  { id: 'breakup', label: 'Commission', icon: 'stats-chart' },
];

const formatINR = (val: any) => '₹' + (parseFloat(val || 0) || 0).toLocaleString('en-IN');

export default function WalletScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [commissionSummary, setCommissionSummary] = useState<any[]>([]);
  const [bankDetails, setBankDetails] = useState<any>({});
  const [bankId, setBankId] = useState<string>('');
  const [kycStatus, setKycStatus] = useState('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Withdrawal OTP flow
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [requestingWithdraw, setRequestingWithdraw] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [emailMasked, setEmailMasked] = useState('');

  // Bank form
  const [savingBank, setSavingBank] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetchWalletDashboard();
      if (res?.success) setDashboardData(res.data);
    } catch (e) {
      console.error('Failed to load wallet dashboard:', e);
    }
  }, []);

  const fetchTx = useCallback(async () => {
    try {
      const res = await fetchWalletTransactions({ limit: 100 });
      if (res?.success) {
        const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
        setTransactions(list);
      }
    } catch (e) {
      console.error('Failed to load transactions:', e);
    }
  }, []);

  const fetchWithdrawalsList = useCallback(async () => {
    try {
      const res = await fetchMyWithdrawals();
      if (res?.success) setWithdrawals(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Failed to load withdrawals:', e);
    }
  }, []);

  const fetchBreakup = useCallback(async () => {
    try {
      const res = await fetchCommissionSummary();
      if (res?.success) setCommissionSummary(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Failed to load commission summary:', e);
    }
  }, []);

  const fetchBank = useCallback(async () => {
    try {
      const res = await fetchBankDetails();
      if (res?.success && res.data) {
        setBankDetails(res.data);
        setBankId(res.data.id || '');
      }
    } catch (e) {
      console.error('Failed to load bank details:', e);
    }
  }, []);

  const fetchKyc = useCallback(async () => {
    try {
      const res = await fetchPartnerKycStatus();
      if (res?.success) setKycStatus(res.data?.kyc_status || '');
    } catch (e) {
      /* non-blocking */
    }
  }, []);

  const fetchAllData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    await Promise.all([fetchDashboard(), fetchTx(), fetchWithdrawalsList(), fetchBreakup(), fetchBank(), fetchKyc()]);
    setLoading(false);
    setRefreshing(false);
  }, [fetchDashboard, fetchTx, fetchWithdrawalsList, fetchBreakup, fetchBank, fetchKyc]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ── Withdrawal OTP flow (same as website) ──────────────────────────
  const handleSendWithdrawalOtp = async () => {
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt < 100) return showToast('Minimum withdrawal amount is ₹100', 'error');
    if (amt > availableBal) return showToast(`Withdrawal amount exceeds available balance (Max: ${formatINR(availableBal)})`, 'error');

    setRequestingWithdraw(true);
    try {
      const res = await sendWithdrawalOtp(amt);
      setEmailMasked(res?.data?.email_sent_to || 'your registered email');
      setShowOtpModal(true);
      showToast(res?.message || 'OTP sent for withdrawal verification.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to send OTP. Please try again.', 'error');
    } finally {
      setRequestingWithdraw(false);
    }
  };

  const handleConfirmWithdrawalOtp = async () => {
    if (!otpCode || otpCode.length !== 6) return showToast('Please enter the complete 6-digit OTP', 'error');
    setVerifyingOtp(true);
    try {
      const res = await verifyWithdrawalOtp(otpCode, parseFloat(withdrawAmount), bankId || undefined);
      if (res?.success) {
        showToast(res.message || 'Withdrawal request submitted successfully!', 'success');
        setWithdrawAmount('');
        setOtpCode('');
        setShowOtpModal(false);
        fetchAllData(true);
      } else {
        showToast(res?.message || 'Verification failed.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'OTP verification failed.', 'error');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleCancelWithdrawal = (id: string) => {
    Alert.alert('Cancel Withdrawal', 'Are you sure you want to cancel this withdrawal request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await cancelWithdrawal(id);
            if (res?.success) {
              showToast('Withdrawal cancelled.', 'success');
              fetchAllData(true);
            } else {
              showToast(res?.message || 'Could not cancel withdrawal.', 'error');
            }
          } catch (err: any) {
            showToast(err?.message || 'Could not cancel withdrawal.', 'error');
          }
        },
      },
    ]);
  };

  const handleSaveBank = async () => {
    if (!bankDetails.bank_name && !bankDetails.upi_id) return showToast('Bank Name or UPI ID is required', 'error');
    if (bankDetails.account_number && (!bankDetails.ifsc_code || !bankDetails.account_holder_name)) {
      return showToast('IFSC code and account holder name are required with account number', 'error');
    }
    setSavingBank(true);
    try {
      const payload: any = {
        bank_name: bankDetails.bank_name,
        account_number: bankDetails.account_number,
        ifsc_code: bankDetails.ifsc_code,
        account_holder_name: bankDetails.account_holder_name,
      };
      if (bankDetails.upi_id) payload.upi_id = bankDetails.upi_id;
      const res = await saveBankDetails(payload);
      if (res?.success) {
        showToast(res.message || 'Bank details saved successfully!', 'success');
        fetchBank();
      } else {
        showToast(res?.message || 'Failed to save bank details.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to save bank details.', 'error');
    } finally {
      setSavingBank(false);
    }
  };

  const handleDownloadStatement = async (type: 'pdf' | 'excel' = 'pdf') => {
    try {
      await downloadWalletStatement(type);
      showToast(`Wallet statement downloaded as ${type.toUpperCase()}`, 'success');
    } catch (e: any) {
      showToast(e?.message || 'Failed to download statement.', 'error');
    }
  };

  // ── Derived values (same logic as website) ─────────────────────────
  const w = dashboardData?.wallet || {};
  const availableBal = parseFloat(w.available_balance ?? dashboardData?.available_balance ?? 0) || 0;
  const holdBal = parseFloat(w.hold_balance ?? dashboardData?.pending_balance ?? 0) || 0;
  const totalEarnings = parseFloat(w.total_earned ?? dashboardData?.lifetime_earnings ?? 0) || 0;
  const settledPayouts = parseFloat(w.total_withdrawn ?? dashboardData?.total_withdrawn ?? 0) || 0;
  const openingBal = parseFloat(w.opening_balance ?? dashboardData?.opening_balance ?? 0) || 0;

  const pendingWithdrawalList = withdrawals.filter((x) => {
    const s = String(x?.status || '').toLowerCase();
    return s.includes('pending') && !s.includes('reject') && !s.includes('fail') && !s.includes('cancel');
  });
  const pendingWithdrawalAmt = pendingWithdrawalList.reduce((acc, x) => acc + (parseFloat(x?.amount) || 0), 0);

  const totalWdrCount = withdrawals.length;
  const approvedWdrCount = withdrawals.filter((x) =>
    ['approved', 'completed', 'paid', 'processed', 'transferred', 'released'].includes(String(x?.status).toLowerCase())
  ).length;
  const successRate = totalWdrCount > 0 ? ((approvedWdrCount / totalWdrCount) * 100).toFixed(1) : '100.0';

  const totalSum = availableBal + pendingWithdrawalAmt + settledPayouts + holdBal || 1;
  const breakdown = [
    { name: 'Available Balance', value: availableBal, color: '#10B981', pct: (availableBal / totalSum) * 100 },
    { name: 'Pending Withdrawals', value: pendingWithdrawalAmt, color: '#F97316', pct: (pendingWithdrawalAmt / totalSum) * 100 },
    { name: 'Settled Payouts', value: settledPayouts, color: '#2563EB', pct: (settledPayouts / totalSum) * 100 },
    { name: 'Hold Commissions', value: holdBal, color: '#8B5CF6', pct: (holdBal / totalSum) * 100 },
  ];

  const chartData = Array.isArray(dashboardData?.history) && dashboardData.history.length > 0
    ? dashboardData.history.map((item: any) => ({
        day: item.month_label || item.month_val,
        val: parseFloat(item.total_credited || 0),
      }))
    : [];
  const chartVals = chartData.map((d: any) => d.val).filter((v: any) => typeof v === 'number');
  const minEarnings = chartVals.length ? Math.min(...chartVals) : 0;
  const maxEarnings = chartVals.length ? Math.max(...chartVals) : 0;
  const avgEarnings = chartVals.length ? Math.round(chartVals.reduce((a: number, b: number) => a + b, 0) / chartVals.length) : 0;
  const maxChartVal = maxEarnings || 1;

  const displayWithdrawals = withdrawals.slice(0, 5);
  const displayPayouts = withdrawals
    .filter((x) => ['processed', 'transferred', 'completed', 'paid', 'released'].includes(String(x?.status).toLowerCase()))
    .slice(0, 5);

  const statusMeta = (status: any) => {
    const s = String(status || '').toLowerCase().trim();
    if (!s || ['approved', 'paid', 'completed', 'transferred', 'processed', 'success', 'credited', 'debited', 'released', 'earned', 'active'].includes(s)) {
      const label = s === 'credited' ? 'Credited' : s === 'debited' ? 'Debited' : s === 'released' ? 'Released' : 'Completed';
      return { label, bg: '#DCFCE7', fg: '#166534' };
    }
    if (['pending', 'on_hold', 'held', 'processing', 'pending approval'].includes(s)) return { label: 'Pending', bg: '#FFEDD5', fg: '#C2410C' };
    if (['rejected', 'failed', 'cancelled'].includes(s)) return { label: 'Rejected', bg: '#FEE2E2', fg: '#991B1B' };
    return { label: String(status || 'Unknown'), bg: '#F1F5F9', fg: '#475569' };
  };
  const StatusBadge = ({ status }: { status: any }) => {
    const m = statusMeta(status);
    return (
      <View style={{ backgroundColor: m.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5 }}>
        <Text style={{ fontSize: 10, fontWeight: '800', color: m.fg }}>{m.label}</Text>
      </View>
    );
  };

  const kpiCards = [
    { label: 'Available Balance', value: formatINR(availableBal), sub: 'Withdrawable Balance', icon: 'wallet', color: '#10B981' },
    { label: 'Pending Withdrawals', value: formatINR(pendingWithdrawalAmt), sub: `${pendingWithdrawalList.length} Request${pendingWithdrawalList.length === 1 ? '' : 's'} Pending`, icon: 'clock', color: '#F97316' },
    { label: 'Total Earnings', value: formatINR(totalEarnings), sub: 'Lifetime Gross Earnings', icon: 'trending-up', color: '#8B5CF6' },
    { label: 'Settled Payouts', value: formatINR(settledPayouts), sub: 'Disbursed to Bank Account', icon: 'cash', color: '#2563EB' },
    { label: 'Success Rate', value: `${successRate}%`, sub: 'Payout Success Rate', icon: 'analytics', color: '#06B6D4' },
  ];

  const renderTx = (tx: any, idx: number) => {
    const isDebit = parseFloat(tx.debit || 0) > 0 || String(tx.transaction_type || '').toUpperCase().includes('WITHDRAWAL');
    const amt = isDebit ? parseFloat(tx.debit || tx.amount || 0) : parseFloat(tx.credit || tx.amount || 0);
    return (
      <View key={tx.id || idx} style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
            {tx.customer_name || tx.description || 'Wallet Transaction'}
          </Text>
          <Text style={[styles.rowSub, { color: colors.textLight }]} numberOfLines={1}>
            {new Date(tx.created_at).toLocaleString('en-IN')} • {tx.app_number || tx.reference_number || tx.product_name || tx.transaction_type || ''}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', marginRight: spacing.xs }}>
          <Text style={{ fontSize: typography.sizes.sm, fontWeight: '800', color: isDebit ? '#EF4444' : '#10B981' }}>
            {isDebit ? '-' : '+'} {formatINR(amt)}
          </Text>
          <StatusBadge status={tx.status} />
        </View>
      </View>
    );
  };

  const renderWithdrawal = (w: any, idx: number, showCancel = false) => (
    <View key={w.id || idx} style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: colors.text, fontFamily: 'monospace' }]} numberOfLines={1}>{String(w.id)}</Text>
        <Text style={[styles.rowSub, { color: colors.textLight }]}>{new Date(w.created_at).toLocaleString('en-IN')}</Text>
      </View>
      <Text style={[styles.rowAmount, { color: colors.text }]}>{formatINR(w.amount)}</Text>
      <View style={{ alignItems: 'flex-end' }}>
        <StatusBadge status={w.status} />
        {showCancel && String(w.status).toLowerCase().includes('pending') && (
          <TouchableOpacity onPress={() => handleCancelWithdrawal(w.id)} style={{ marginTop: 4 }}>
            <Text style={{ fontSize: 10, color: colors.error, fontWeight: '700' }}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const card = { backgroundColor: colors.card, borderColor: colors.border } as const;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header: title + Sync + Statement */}
      <View style={styles.pageHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Partner Wallet</Text>
          <Text style={[styles.pageSub, { color: colors.textLight }]}>Manage your balance, withdrawals, earnings and payouts</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={[styles.headerBtn, card]} onPress={() => fetchAllData(true)}>
            <Icon name="refresh" size={14} color={colors.text} />
            <Text style={[styles.headerBtnText, { color: colors.text }]}>Sync</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.headerBtn, { backgroundColor: '#0052FF', borderColor: '#0052FF' }]} onPress={() => handleDownloadStatement('pdf')}>
            <Icon name="download" size={14} color="#FFF" />
            <Text style={[styles.headerBtnText, { color: '#FFF' }]}>Statement</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchAllData(true)} colors={[colors.primary]} tintColor={colors.primary} />}
        >
          {/* KPI cards — 2 per row like website mobile */}
          <View style={styles.kpiGrid}>
            {kpiCards.map((k) => (
              <View key={k.label} style={[styles.kpiCard, card, { borderBottomColor: k.color, borderBottomWidth: 3 }]}>
                <View style={styles.kpiTop}>
                  <View style={[styles.kpiIcon, { backgroundColor: k.color }]}>
                    <Icon name={k.icon} size={15} color="#FFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.kpiLabel, { color: colors.textLight }]}>{k.label}</Text>
                    <Text style={[styles.kpiValue, { color: colors.text }]}>{k.value}</Text>
                  </View>
                </View>
                <Text style={[styles.kpiSub, { color: colors.textLight }]} numberOfLines={1}>{k.sub}</Text>
              </View>
            ))}
          </View>

          {/* Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={{ gap: 4 }}>
            {TABS.map((t) => (
              <TouchableOpacity
                key={t.id}
                onPress={() => setActiveTab(t.id)}
                style={[styles.tabBtn, activeTab === t.id && { borderBottomColor: '#0052FF' }]}
              >
                <Icon name={t.icon} size={13} color={activeTab === t.id ? '#0052FF' : colors.textLight} />
                <Text style={[styles.tabLabel, { color: activeTab === t.id ? '#0052FF' : colors.textLight }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <View style={{ gap: 14 }}>
              {/* Wallet Overview + Earnings chart + Breakdown */}
              <View style={[styles.cardBox, card, { padding: 14 }]}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Wallet Overview</Text>
                <View style={{ gap: 8 }}>
                  <View style={styles.betweenRow}>
                    <Text style={[styles.muted, { color: colors.textLight }]}>Opening Balance</Text>
                    <Text style={[styles.bold, { color: colors.text }]}>{formatINR(openingBal)}</Text>
                  </View>
                  <View style={styles.betweenRow}>
                    <Text style={[styles.muted, { color: colors.textLight }]}>Total Credits</Text>
                    <Text style={[styles.bold, { color: '#10B981' }]}>+ {formatINR(totalEarnings)}</Text>
                  </View>
                  <View style={styles.betweenRow}>
                    <Text style={[styles.muted, { color: colors.textLight }]}>Total Debits</Text>
                    <Text style={[styles.bold, { color: '#EF4444' }]}>- {formatINR(settledPayouts + pendingWithdrawalAmt + holdBal)}</Text>
                  </View>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.betweenRow}>
                  <Text style={[styles.bold, { color: colors.text, fontSize: 13 }]}>Available Balance</Text>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: '#10B981' }}>{formatINR(availableBal)}</Text>
                </View>
                <View style={[styles.infoBox, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                  <Text style={{ fontSize: 11, color: '#1E40AF' }}>ⓘ Auto settlement is enabled for your account</Text>
                </View>
              </View>

              {/* Monthly Earnings Progression */}
              <View style={[styles.cardBox, card, { padding: 14 }]}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Monthly Earnings Progression</Text>
                {chartData.length === 0 ? (
                  <Text style={[styles.muted, { color: colors.textLight, textAlign: 'center', paddingVertical: 20 }]}>No earnings data yet.</Text>
                ) : (
                  <>
                    <View style={styles.barChart}>
                      {chartData.map((d: any, i: number) => (
                        <View key={i} style={styles.barCol}>
                          <View style={[styles.barFill, { height: Math.max(4, (d.val / maxChartVal) * 110), backgroundColor: '#0052FF' }]} />
                          <Text style={[styles.barLabel, { color: colors.textLight }]} numberOfLines={1}>{d.day}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={[styles.miniStats, { backgroundColor: isDark ? colors.bg : '#F8FAFC', borderColor: colors.border }]}>
                      {[
                        ['Min. Earnings', formatINR(minEarnings)],
                        ['Max. Earnings', formatINR(maxEarnings)],
                        ['Avg. Earnings', formatINR(avgEarnings)],
                        ['Total Earnings', formatINR(totalEarnings)],
                      ].map(([l, v]) => (
                        <View key={l as string} style={{ flex: 1, alignItems: 'center' }}>
                          <Text style={[styles.miniLabel, { color: colors.textLight }]}>{l}</Text>
                          <Text style={[styles.miniVal, { color: colors.text }]}>{v}</Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </View>

              {/* Balance Breakdown */}
              <View style={[styles.cardBox, card, { padding: 14 }]}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Balance Breakdown</Text>
                {breakdown.map((b) => (
                  <View key={b.name} style={{ marginBottom: 8 }}>
                    <View style={styles.betweenRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: b.color }} />
                        <Text style={[styles.muted, { color: colors.textLight }]}>{b.name}</Text>
                      </View>
                      <Text style={[styles.bold, { color: colors.text }]}>{formatINR(b.value)} ({b.pct.toFixed(1)}%)</Text>
                    </View>
                    <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                      <View style={[styles.progressFill, { width: `${Math.min(100, b.pct)}%`, backgroundColor: b.color }]} />
                    </View>
                  </View>
                ))}
              </View>

              {/* Request Settlement */}
              <View style={[styles.cardBox, card, { padding: 14 }]}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Request Bank Settlement</Text>
                <View style={[styles.destBox, { backgroundColor: isDark ? colors.bg : '#F8FAFC', borderColor: colors.border }]}>
                  <Text style={[styles.kpiLabel, { color: colors.textLight }]}>DESTINATION BANK ACCOUNT</Text>
                  <Text style={[styles.bold, { color: colors.text, fontSize: 13 }]}>{bankDetails.bank_name || 'No Primary Bank Configured'}</Text>
                  <Text style={[styles.muted, { color: colors.textLight }]}>
                    {bankDetails.account_number ? `A/C ${bankDetails.account_number} • IFSC: ${bankDetails.ifsc_code}` : 'Configure primary bank details in Bank Setup tab'}
                  </Text>
                </View>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Amount (₹)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  placeholder="Enter amount"
                  placeholderTextColor={colors.textLight}
                  keyboardType="numeric"
                  value={withdrawAmount}
                  onChangeText={setWithdrawAmount}
                />
                <Text style={[styles.muted, { color: colors.textLight, marginBottom: 8 }]}>Available: {formatINR(availableBal)}</Text>
                <TouchableOpacity
                  style={[styles.primaryBtn, requestingWithdraw && { opacity: 0.6 }]}
                  onPress={handleSendWithdrawalOtp}
                  disabled={requestingWithdraw}
                >
                  {requestingWithdraw ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.primaryBtnText}>Request Settlement</Text>}
                </TouchableOpacity>
                <View style={{ marginTop: 10, gap: 3 }}>
                  <Text style={[styles.muted, { color: colors.textLight, fontSize: 10 }]}>⏱ Processing Time: 1-2 Business Days (NEFT/IMPS)</Text>
                  <Text style={[styles.muted, { color: colors.textLight, fontSize: 10 }]}>
                    🛡 KYC Status: {kycStatus ? (String(kycStatus).toUpperCase() === 'APPROVED' ? 'Verified & Approved' : kycStatus) : 'Pending Verification'}
                  </Text>
                </View>
              </View>

              {/* Recent Withdrawals */}
              <View style={[styles.cardBox, card, { padding: 14 }]}>
                <View style={styles.betweenRow}>
                  <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 0 }]}>Recent Withdrawal Requests</Text>
                  <TouchableOpacity onPress={() => setActiveTab('withdrawals')}>
                    <Text style={{ fontSize: 11, color: '#0052FF', fontWeight: '700' }}>View All</Text>
                  </TouchableOpacity>
                </View>
                {displayWithdrawals.length === 0 ? (
                  <Text style={[styles.muted, { color: colors.textLight, textAlign: 'center', paddingVertical: 14 }]}>No withdrawal requests found.</Text>
                ) : displayWithdrawals.map((w, i) => renderWithdrawal(w, i))}
              </View>

              {/* Recent Payouts */}
              <View style={[styles.cardBox, card, { padding: 14 }]}>
                <View style={styles.betweenRow}>
                  <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 0 }]}>Recent Payouts</Text>
                  <TouchableOpacity onPress={() => setActiveTab('withdrawals')}>
                    <Text style={{ fontSize: 11, color: '#0052FF', fontWeight: '700' }}>View All</Text>
                  </TouchableOpacity>
                </View>
                {displayPayouts.length === 0 ? (
                  <Text style={[styles.muted, { color: colors.textLight, textAlign: 'center', paddingVertical: 14 }]}>No settled payouts recorded yet.</Text>
                ) : displayPayouts.map((w, i) => renderWithdrawal(w, i))}
              </View>

              {/* Quick Actions */}
              <View style={[styles.cardBox, card, { padding: 12 }]}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Quick Actions</Text>
                <View style={styles.quickGrid}>
                  {[
                    { label: 'Request Settlement', icon: 'wallet', action: handleSendWithdrawalOtp },
                    { label: 'Add Bank Account', icon: 'business', action: () => setActiveTab('bank') },
                    { label: 'View Ledger', icon: 'receipt', action: () => setActiveTab('ledger') },
                    { label: 'Withdrawals', icon: 'cash', action: () => setActiveTab('withdrawals') },
                    { label: 'Commission', icon: 'stats-chart', action: () => setActiveTab('breakup') },
                    { label: 'Statement', icon: 'download', action: () => handleDownloadStatement('pdf') },
                    { label: 'Support', icon: 'information-circle', action: () => router.push('/(app)/support' as any) },
                  ].map((a) => (
                    <TouchableOpacity key={a.label} style={[styles.quickBtn, { backgroundColor: isDark ? colors.bg : '#F8FAFC', borderColor: colors.border }]} onPress={a.action}>
                      <Icon name={a.icon} size={13} color="#0052FF" />
                      <Text style={[styles.quickBtnText, { color: colors.text }]} numberOfLines={1}>{a.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* ── LEDGER ── */}
          {activeTab === 'ledger' && (
            <View style={[styles.cardBox, card, { padding: 14 }]}>
              <View style={styles.betweenRow}>
                <View>
                  <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 0 }]}>Ledger & Transaction Logs</Text>
                  <Text style={[styles.muted, { color: colors.textLight }]}>Real-time statement of credits, debits and payouts</Text>
                </View>
                <TouchableOpacity onPress={fetchTx} style={[styles.smallBtn, { borderColor: colors.border }]}>
                  <Icon name="refresh" size={12} color={colors.text} />
                  <Text style={{ fontSize: 10, color: colors.text, fontWeight: '700' }}>Refresh</Text>
                </TouchableOpacity>
              </View>
              {transactions.length === 0 ? (
                <Text style={[styles.muted, { color: colors.textLight, textAlign: 'center', paddingVertical: 24 }]}>No transaction logs recorded yet.</Text>
              ) : (
                transactions.map((tx, i) => renderTx(tx, i))
              )}
            </View>
          )}

          {/* ── WITHDRAWALS ── */}
          {activeTab === 'withdrawals' && (
            <View style={[styles.cardBox, card, { padding: 14 }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Withdrawal Requests History</Text>
              {withdrawals.length === 0 ? (
                <Text style={[styles.muted, { color: colors.textLight, textAlign: 'center', paddingVertical: 24 }]}>No withdrawal history available.</Text>
              ) : (
                withdrawals.map((w, i) => renderWithdrawal(w, i, true))
              )}
            </View>
          )}

          {/* ── BANK SETUP ── */}
          {activeTab === 'bank' && (
            <View style={[styles.cardBox, card, { padding: 14 }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Primary Settlement Bank Setup</Text>
              {[
                { key: 'account_holder_name', label: 'Account Holder Name' },
                { key: 'bank_name', label: 'Bank Name' },
                { key: 'account_number', label: 'Account Number' },
                { key: 'ifsc_code', label: 'IFSC Code' },
                { key: 'upi_id', label: 'UPI ID (optional)' },
              ].map((f) => (
                <View key={f.key} style={{ marginBottom: 10 }}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>{f.label}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                    value={bankDetails[f.key] || ''}
                    onChangeText={(v) => setBankDetails({ ...bankDetails, [f.key]: v })}
                    autoCapitalize={f.key === 'ifsc_code' || f.key === 'upi_id' ? 'characters' : 'sentences'}
                  />
                </View>
              ))}
              <TouchableOpacity style={[styles.primaryBtn, savingBank && { opacity: 0.6 }]} onPress={handleSaveBank} disabled={savingBank}>
                {savingBank ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.primaryBtnText}>Save Bank Configuration</Text>}
              </TouchableOpacity>
            </View>
          )}

          {/* ── COMMISSION BREAKUP ── */}
          {activeTab === 'breakup' && (
            <View style={[styles.cardBox, card, { padding: 14 }]}>
              <View style={styles.betweenRow}>
                <View>
                  <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 0 }]}>Product Commission Breakup</Text>
                  <Text style={[styles.muted, { color: colors.textLight }]}>Commission distribution by product & bank partner</Text>
                </View>
                <TouchableOpacity onPress={fetchBreakup} style={[styles.smallBtn, { borderColor: colors.border }]}>
                  <Icon name="refresh" size={12} color={colors.text} />
                  <Text style={{ fontSize: 10, color: colors.text, fontWeight: '700' }}>Sync</Text>
                </TouchableOpacity>
              </View>
              {commissionSummary.length === 0 ? (
                <Text style={[styles.muted, { color: colors.textLight, textAlign: 'center', paddingVertical: 24 }]}>No product commission breakup data recorded yet.</Text>
              ) : (
                commissionSummary.map((item: any, idx: number) => (
                  <View key={idx} style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: 'column', alignItems: 'stretch' }]}>
                    <View style={styles.betweenRow}>
                      <Text style={[styles.rowTitle, { color: colors.text, flex: 1 }]} numberOfLines={1}>{item.product_name}</Text>
                      <View style={{ backgroundColor: isDark ? colors.bg : '#F8FAFC', borderWidth: 1, borderColor: colors.border, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#0052FF' }}>{item.bank_code || 'GKP'}</Text>
                      </View>
                    </View>
                    <View style={[styles.betweenRow, { marginTop: 6 }]}>
                      <Text style={[styles.muted, { color: colors.textLight }]}>Cases: {item.total_cases || 0} • Approved: <Text style={{ color: '#10B981', fontWeight: '700' }}>{item.approved_cases || 0}</Text> • Rejected: <Text style={{ color: '#EF4444', fontWeight: '700' }}>{item.rejected_cases || 0}</Text></Text>
                      <Text style={{ fontSize: typography.sizes.sm, fontWeight: '800', color: '#0052FF' }}>{formatINR(item.commission_earned)}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* OTP Verification Modal */}
      <Modal visible={showOtpModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Confirm Payout Settlement</Text>
            <Text style={[styles.modalSub, { color: colors.textLight }]}>
              Enter 6-digit OTP sent to <Text style={{ fontWeight: '700' }}>{emailMasked}</Text> to verify withdrawal of <Text style={{ fontWeight: '700' }}>{formatINR(withdrawAmount)}</Text> to <Text style={{ fontWeight: '700' }}>{bankDetails.bank_name || 'your bank'}</Text>.
            </Text>
            <TextInput
              style={[styles.otpInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              placeholder="123456"
              placeholderTextColor={colors.textLight}
              keyboardType="number-pad"
              maxLength={6}
              value={otpCode}
              onChangeText={(v) => setOtpCode(v.replace(/\D/g, ''))}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={[styles.modalBtn, { borderColor: colors.border }]} onPress={() => { setShowOtpModal(false); setOtpCode(''); }}>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 12 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#0052FF', borderColor: '#0052FF', flex: 2, opacity: otpCode.length !== 6 || verifyingOtp ? 0.6 : 1 }]}
                onPress={handleConfirmWithdrawalOtp}
                disabled={otpCode.length !== 6 || verifyingOtp}
              >
                {verifyingOtp ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>Confirm Withdrawal</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Toast */}
      {toast && (
        <View style={[styles.toast, { backgroundColor: toast.type === 'error' ? '#DC2626' : toast.type === 'info' ? '#475569' : '#059669' }]}>
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: baseColors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    gap: 10,
  },
  pageTitle: { fontSize: typography.sizes.lg, fontWeight: '900' },
  pageSub: { fontSize: 11, marginTop: 1 },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  headerBtnText: { fontSize: 11, fontWeight: '700' },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl, gap: 0 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  kpiCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  kpiTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kpiIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  kpiLabel: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },
  kpiValue: { fontSize: 15, fontWeight: '900', marginTop: 1 },
  kpiSub: { fontSize: 9.5, marginTop: 6 },
  tabBar: { flexGrow: 0, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: baseColors.border },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabLabel: { fontSize: 11.5, fontWeight: '700' },
  cardBox: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 14 },
  cardTitle: { fontSize: 13.5, fontWeight: '800', marginBottom: 10 },
  betweenRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  muted: { fontSize: 11.5 },
  bold: { fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  rowTitle: { fontSize: typography.sizes.xs, fontWeight: '700' },
  rowSub: { fontSize: 10, marginTop: 2 },
  rowAmount: { fontSize: typography.sizes.sm, fontWeight: '800', marginRight: spacing.xs },
  divider: { height: 1, marginVertical: 10 },
  infoBox: { borderWidth: 1, borderRadius: 8, padding: 8, marginTop: 12 },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', height: 130, gap: 6, marginBottom: 10 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  barFill: { width: '70%', borderRadius: 4, minHeight: 4 },
  barLabel: { fontSize: 8, marginTop: 4 },
  miniStats: { flexDirection: 'row', borderWidth: 1, borderRadius: 8, padding: 8 },
  miniLabel: { fontSize: 9, textAlign: 'center' },
  miniVal: { fontSize: 10.5, fontWeight: '700', textAlign: 'center' },
  progressTrack: { height: 5, borderRadius: 3, marginTop: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  destBox: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 12 },
  inputLabel: { fontSize: 11, fontWeight: '700', marginBottom: 3 },
  input: { borderWidth: 1, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 9, fontSize: 12.5, marginBottom: 4 },
  primaryBtn: { backgroundColor: '#0052FF', borderRadius: 8, paddingVertical: 11, alignItems: 'center', marginTop: 4 },
  primaryBtnText: { color: '#FFF', fontSize: 12.5, fontWeight: '800' },
  smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 5 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  quickBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 7, width: '31%' },
  quickBtnText: { fontSize: 10.5, fontWeight: '700', flexShrink: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16 },
  modalBox: { borderWidth: 1, borderRadius: 14, padding: 18 },
  modalTitle: { fontSize: 15, fontWeight: '900', marginBottom: 6 },
  modalSub: { fontSize: 11.5, marginBottom: 14, lineHeight: 17 },
  otpInput: {
    borderWidth: 1,
    borderRadius: 7,
    padding: 10,
    textAlign: 'center',
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 5,
    marginBottom: 12,
  },
  modalBtn: { flex: 1, paddingVertical: 10, borderRadius: 7, borderWidth: 1, alignItems: 'center' },
  toast: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
    maxWidth: '90%',
  },
  toastText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
});
