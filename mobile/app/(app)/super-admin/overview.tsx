import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../contexts/ThemeContext';
import { Icon } from '../../../components/Icon';
import apiClient from '../../../services/api';
import { colors } from '../../../theme/colors';
import { typography } from '../../../theme/typography';
import { spacing } from '../../../theme/spacing';

// Mobile port of website SuperAdminOverview.jsx — Master Control Overview
// Tabs: overview | customers | partners | employees | team | applications | admins | financials

type TabId = 'overview' | 'customers' | 'partners' | 'employees' | 'team' | 'applications' | 'admins' | 'financials';

const inr = (n: any) => `₹${parseFloat(n || 0).toLocaleString('en-IN')}`;
const arr = (x: any): any[] => (Array.isArray(x) ? x : x?.data || x?.rows || x?.employees || x?.members || x?.applications || x?.partners || []);

export default function SuperAdminOverviewScreen() {
  const router = useRouter();
  const { colors: tc, isDark } = useTheme() as any;
  const cardBg = isDark ? '#12121a' : '#ffffff';
  const bgSecondary = isDark ? '#181824' : '#f8faff';
  const border = isDark ? '#222234' : colors.border;
  const borderColor = border;
  const textPrimary = isDark ? '#f4f4f8' : '#111827';
  const textMuted = isDark ? '#9ca3af' : '#6b7280';

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overviewData, setOverviewData] = useState<any>(null);
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [partnersList, setPartnersList] = useState<any[]>([]);
  const [teamList, setTeamList] = useState<any[]>([]);
  const [applicationsList, setApplicationsList] = useState<any[]>([]);
  const [adminsList, setAdminsList] = useState<any[]>([]);
  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [razorpayBalance, setRazorpayBalance] = useState<number | null>(null);
  const [financialsLedger, setFinancialsLedger] = useState<any[]>([]);
  const [financialsWithdrawals, setFinancialsWithdrawals] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [processFilter, setProcessFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [finSubTab, setFinSubTab] = useState<'ledger' | 'withdrawals'>('ledger');
  const [finSearch, setFinSearch] = useState('');
  const [finTypeFilter, setFinTypeFilter] = useState('all');
  const [finStatusFilter, setFinStatusFilter] = useState('all');

  // Drill-down modals
  const [modal, setModal] = useState<{ type: 'customer' | 'partner' | 'member' | 'trace' | null; item?: any }>({ type: null });
  const [modalLoading, setModalLoading] = useState(false);
  const [modalApps, setModalApps] = useState<any[]>([]);
  const [modalTeam, setModalTeam] = useState<any[]>([]);
  const [traceData, setTraceData] = useState<any>(null);

  const fetchMasterData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const [overviewRes, customersRes, partnersRes, teamRes, appsRes, adminsRes, walletBalRes, employeesRes, ledgerRes, withdrawalsRes] = await Promise.allSettled([
        apiClient.get('/reports/overview'),
        apiClient.get('/reports/customers'),
        apiClient.get('/reports/export-partners'),
        apiClient.get('/team/members'),
        apiClient.get('/applications', { params: { limit: 100 } }),
        apiClient.get('/superadmin/admins'),
        apiClient.get('/wallet/admin/razorpay/balance'),
        apiClient.get('/employees', { params: { limit: 100 } }),
        apiClient.get('/wallet/ledger', { params: { limit: 100 } }),
        apiClient.get('/wallet/admin/withdrawals', { params: { limit: 100, status: 'all' } }),
      ]);
      const ok = (r: any) => r.status === 'fulfilled' && r.value?.data?.success !== false;
      if (ok(overviewRes)) setOverviewData(overviewRes.status === 'fulfilled' ? overviewRes.value.data.data : null);
      if (ok(customersRes)) { const d = customersRes.status === 'fulfilled' ? customersRes.value.data.data : null; setCustomersList(arr(d)); }
      if (ok(partnersRes)) { const d = partnersRes.status === 'fulfilled' ? partnersRes.value.data.data : null; setPartnersList(d?.partners || arr(d)); }
      if (ok(teamRes)) { const d = teamRes.status === 'fulfilled' ? teamRes.value.data.data : null; setTeamList(d?.members || arr(d)); }
      if (ok(appsRes)) { const d = appsRes.status === 'fulfilled' ? appsRes.value.data.data : null; setApplicationsList(d?.applications || arr(d)); }
      if (ok(adminsRes)) { const d = adminsRes.status === 'fulfilled' ? adminsRes.value.data.data : null; setAdminsList(arr(d)); }
      if (ok(employeesRes)) { const d = employeesRes.status === 'fulfilled' ? employeesRes.value.data.data : null; setEmployeesList(Array.isArray(d) ? d : (d?.employees || d?.rows || [])); }
      if (ok(walletBalRes)) { const d = walletBalRes.status === 'fulfilled' ? walletBalRes.value.data.data : null; setRazorpayBalance(d?.available_balance ?? 0); }
      if (ok(ledgerRes)) { const d = ledgerRes.status === 'fulfilled' ? ledgerRes.value.data.data : null; setFinancialsLedger(d?.data || arr(d)); }
      if (ok(withdrawalsRes)) { const d = withdrawalsRes.status === 'fulfilled' ? withdrawalsRes.value.data.data : null; const w = d?.data || arr(d); setFinancialsWithdrawals(Array.isArray(w) ? w : []); }
    } catch (e) {
      console.error('Overview fetch error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchMasterData(); }, [fetchMasterData]);

  // ── Stats — same computation as website ──
  const totalCommissionPaid = Number(overviewData?.withdrawal?.total_commission_paid ?? overviewData?.applications?.total_commission ?? 0);
  const stats = useMemo(() => {
    const apps = Array.isArray(applicationsList) ? applicationsList : [];
    const partners = Array.isArray(partnersList) ? partnersList : [];
    const emps = Array.isArray(employeesList) ? employeesList : [];
    const withdrawals = Array.isArray(financialsWithdrawals) ? financialsWithdrawals : [];
    const count = (fn: (a: any) => boolean, fallbackKey?: string) => {
      const v = overviewData?.applications?.[fallbackKey || ''];
      return parseInt(v ?? apps.filter(fn).length ?? 0, 10);
    };
    return {
      employees: parseInt(overviewData?.employees?.total_employees ?? emps.length ?? 0, 10),
      activeEmployees: parseInt(overviewData?.employees?.active_employees ?? emps.filter((e: any) => ['active', 'approved'].includes((e.employee_status || e.activation_status || '').toLowerCase())).length ?? 0, 10),
      customers: parseInt(overviewData?.customers?.total_customers ?? customersList.length ?? 0, 10),
      partners: parseInt(overviewData?.Partners?.total ?? partners.length ?? 0, 10),
      activePartners: parseInt(overviewData?.Partners?.active ?? partners.filter((p: any) => (p.account_status || p.status) === 'active').length ?? 0, 10),
      pendingKycPartners: parseInt(overviewData?.Partners?.pending_kyc ?? overviewData?.partners?.pending_kyc ?? partners.filter((p: any) => (p.kyc_status || 'pending') === 'pending').length ?? 0, 10),
      teamMembers: parseInt(overviewData?.team?.total_team ?? teamList.length ?? 0, 10),
      totalApps: parseInt(overviewData?.applications?.total ?? apps.length ?? 0, 10),
      leadPunchingApps: parseInt(overviewData?.applications?.lead_punching_count ?? apps.filter((a: any) => (a.process_type || 'lead_punching') === 'lead_punching').length ?? 0, 10),
      linkedShareApps: parseInt(overviewData?.applications?.linked_share_count ?? apps.filter((a: any) => a.process_type === 'linked_share').length ?? 0, 10),
      directBankApps: parseInt(overviewData?.applications?.direct_bank_count ?? apps.filter((a: any) => a.process_type === 'direct_bank').length ?? 0, 10),
      physicalProcessApps: parseInt(overviewData?.applications?.physical_process_count ?? apps.filter((a: any) => a.process_type === 'physical_process').length ?? 0, 10),
      coBrowsingApps: parseInt(overviewData?.applications?.co_browsing_count ?? apps.filter((a: any) => ['co_browsing', 'co-browsing', 'card_assist'].includes(a.process_type) || !a.process_type).length ?? 0, 10),
      invalidProcessApps: parseInt(overviewData?.applications?.invalid_process_count ?? 0, 10),
      approvedApps: parseInt(overviewData?.applications?.approved ?? 0, 10),
      pendingApps: parseInt(overviewData?.applications?.pending ?? 0, 10),
      rejectedApps: parseInt(overviewData?.applications?.rejected ?? 0, 10),
      admins: parseInt(overviewData?.admins?.total_admins ?? adminsList.length ?? 0, 10),
      activeAdmins: parseInt(overviewData?.admins?.active_admins ?? adminsList.filter((a: any) => a.status === 'active' || a.isActive).length ?? 0, 10),
      totalCommissionPaid,
      totalWithdrawalAmount: withdrawals.filter((w: any) => ['approved', 'completed', 'transferred', 'processed'].includes((w.status || '').toLowerCase())).reduce((s: number, w: any) => s + parseFloat(w.amount || 0), 0),
      pendingWithdrawals: withdrawals.filter((w: any) => (w.status || '').toLowerCase().includes('pending') || (w.status || '').toLowerCase().includes('review')).length,
      banks: parseInt(overviewData?.banks?.total_banks ?? 0, 10),
      products: parseInt(overviewData?.products?.total_products ?? 0, 10),
    };
  }, [overviewData, applicationsList, partnersList, employeesList, teamList, customersList, adminsList, financialsWithdrawals, totalCommissionPaid]);

  const processSum = stats.leadPunchingApps + stats.linkedShareApps + stats.directBankApps + stats.physicalProcessApps + stats.coBrowsingApps;
  const isDataIntegrityMismatch = stats.totalApps !== processSum || stats.invalidProcessApps > 0;

  // Drill-down handlers — same endpoints as website
  const handleViewCustomer = async (cust: any) => {
    setModal({ type: 'customer', item: cust });
    setModalLoading(true); setModalApps([]);
    try {
      const res = await apiClient.get('/applications', { params: { search: cust.mobile || cust.email || cust.customer_name, limit: 50 } });
      setModalApps(arr(res.data?.data));
    } catch { setModalApps([]); } finally { setModalLoading(false); }
  };
  const handleViewPartner = async (p: any) => {
    setModal({ type: 'partner', item: p });
    setModalLoading(true); setModalApps([]); setModalTeam([]);
    try {
      const [appsRes, teamRes] = await Promise.allSettled([
        apiClient.get('/applications', { params: { partner_id: p.id, limit: 50 } }),
        apiClient.get('/team/members', { params: { partner_id: p.id } }),
      ]);
      if (appsRes.status === 'fulfilled') setModalApps(arr(appsRes.value.data?.data));
      if (teamRes.status === 'fulfilled') { const d = teamRes.value.data?.data; setModalTeam(d?.members || arr(d)); }
    } catch { } finally { setModalLoading(false); }
  };
  const handleViewMember = async (m: any) => {
    setModal({ type: 'member', item: m });
    setModalLoading(true); setModalApps([]);
    try {
      const res = await apiClient.get('/applications', { params: { scope: 'member', member_id: m.id, limit: 50 } });
      setModalApps(arr(res.data?.data));
    } catch { setModalApps([]); } finally { setModalLoading(false); }
  };
  const handleViewTrace = async (app: any) => {
    setModal({ type: 'trace', item: app });
    setModalLoading(true); setTraceData(null);
    try {
      const res = await apiClient.get(`/applications/${app.id}/trace`);
      setTraceData(res.data?.data || res.data);
    } catch { setTraceData(null); } finally { setModalLoading(false); }
  };

  const q = searchQuery.toLowerCase();
  const matches = (...vals: any[]) => !q || vals.some((v) => String(v ?? '').toLowerCase().includes(q));

  const filteredCustomers = customersList.filter((c: any) => matches(c.customer_name, c.mobile, c.email));
  const filteredPartners = partnersList.filter((p: any) => matches(`${p.first_name || ''} ${p.last_name || ''} ${p.company_name || ''}`, p.partner_code, p.email, p.mobile));
  const filteredEmployees = employeesList.filter((e: any) => matches(e.full_name || e.name, e.employee_id || e.employee_code, e.email, e.mobile_number || e.mobile));
  const filteredTeam = teamList.filter((m: any) => matches(m.full_name || m.name, m.partner_code || m.code, m.email, m.mobile));
  const filteredApps = applicationsList.filter((a: any) => {
    if (processFilter !== 'all' && (a.process_type || 'lead_punching') !== processFilter) return false;
    if (statusFilter !== 'all' && String(a.status || '').toLowerCase() !== statusFilter) return false;
    return matches(a.application_number || a.app_number || a.id, a.customer_name, a.mobile, a.partner_code, a.product_name, a.bank_name);
  });
  const filteredAdmins = adminsList.filter((a: any) => matches(a.fullName || a.full_name, a.role, a.designation, a.email));

  const finRows = finSubTab === 'ledger' ? financialsLedger : financialsWithdrawals;
  const finFiltered = (Array.isArray(finRows) ? finRows : []).filter((r: any) => {
    if (finTypeFilter !== 'all' && String(r.type || r.transaction_type || '').toLowerCase() !== finTypeFilter) return false;
    if (finStatusFilter !== 'all' && String(r.status || '').toLowerCase() !== finStatusFilter) return false;
    return matches(r.reference_number || r.reference || r.id, r.description || r.notes, r.partner_name || r.name, r.amount);
  });

  const topMetrics = [
    { tab: 'customers' as TabId, label: 'Total Customers', value: stats.customers.toLocaleString('en-IN'), sub: 'Registered Customer Network', color: colors.primaryLight },
    { tab: 'partners' as TabId, label: 'Partners Network', value: stats.partners.toLocaleString('en-IN'), sub: `${stats.activePartners} Active Partners`, color: colors.success },
    { tab: 'employees' as TabId, label: 'Employees Network', value: stats.employees.toLocaleString('en-IN'), sub: `${stats.activeEmployees} Active Employees`, color: '#6366F1' },
    { tab: 'team' as TabId, label: 'Team Members', value: stats.teamMembers.toLocaleString('en-IN'), sub: 'Sub-agents & Field Network', color: '#06B6D4' },
    { tab: 'applications' as TabId, label: 'Total Applications', value: stats.totalApps.toLocaleString('en-IN'), sub: `${stats.approvedApps} Approved Applications`, color: colors.purple },
    { tab: 'admins' as TabId, label: 'System Admins', value: stats.admins.toLocaleString('en-IN'), sub: 'Operations Administrators', color: '#F59E0B' },
    { tab: 'financials' as TabId, label: 'Payouts & Ledger', value: inr(stats.totalCommissionPaid), sub: `Pending: ${stats.pendingWithdrawals}`, color: '#EC4899' },
  ];

  const kpis = [
    { label: 'Total Admins', value: stats.admins, color: '#F59E0B', tab: 'admins' as TabId },
    { label: 'Active Admins', value: stats.activeAdmins, color: colors.success, tab: 'admins' as TabId },
    { label: 'Total Employees', value: stats.employees, color: '#6366F1', tab: 'employees' as TabId },
    { label: 'Pending KYC', value: stats.pendingKycPartners, color: '#F97316', tab: 'partners' as TabId },
    { label: 'Total Leads', value: stats.totalApps, color: colors.primaryLight, tab: 'applications' as TabId },
    { label: 'Pending Leads', value: stats.pendingApps, color: '#EAB308', tab: 'applications' as TabId },
    { label: 'Approved Leads', value: stats.approvedApps, color: '#059669', tab: 'applications' as TabId },
    { label: 'Rejected Leads', value: stats.rejectedApps, color: '#EF4444', tab: 'applications' as TabId },
    { label: 'Total Withdrawals', value: inr(stats.totalWithdrawalAmount), color: colors.purple, tab: 'financials' as TabId },
    { label: 'Pending Withdrawals', value: stats.pendingWithdrawals, color: '#EC4899', tab: 'financials' as TabId },
    { label: 'Total Banks', value: stats.banks, color: '#06B6D4', tab: null },
    { label: 'Total Products', value: stats.products, color: '#6366F1', tab: null },
  ];

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'System Overview' },
    { id: 'customers', label: `Customers (${stats.customers})` },
    { id: 'partners', label: `Partners (${stats.partners})` },
    { id: 'employees', label: `Employees (${stats.employees})` },
    { id: 'team', label: `Team Members (${stats.teamMembers})` },
    { id: 'applications', label: `Applications (${stats.totalApps})` },
    { id: 'admins', label: `Admins (${stats.admins})` },
    { id: 'financials', label: 'Financials & Payouts' },
  ];

  const processBadge = (pt?: string) => {
    const map: Record<string, { label: string; color: string; bg: string }> = {
      lead_punching: { label: 'Partner Punch', color: colors.primaryLight, bg: '#EFF6FF' },
      linked_share: { label: 'Linked Share', color: colors.purple, bg: '#F5F3FF' },
      direct_bank: { label: 'Direct Bank', color: '#06B6D4', bg: '#ECFEFF' },
      physical_process: { label: 'Physical Process', color: '#F59E0B', bg: colors.warningSoft },
    };
    const b = map[pt || 'lead_punching'] || { label: pt || 'Partner Punch', color: '#6B7280', bg: '#F3F4F6' };
    return (
      <View style={[styles.badge, { backgroundColor: b.bg }]}>
        <Text style={[styles.badgeText, { color: b.color }]}>{b.label}</Text>
      </View>
    );
  };

  const statusBadge = (s?: string) => {
    const v = (s || 'pending').toLowerCase();
    const color = ['approved', 'commission_released', 'commission_received', 'completed'].includes(v) ? '#059669' : ['rejected', 'cancelled'].includes(v) ? '#EF4444' : '#F59E0B';
    return (
      <View style={[styles.badge, { backgroundColor: color + '18' }]}>
        <Text style={[styles.badgeText, { color }]}>{(s || 'PENDING').toUpperCase()}</Text>
      </View>
    );
  };

  const renderModal = () => (
    <Modal visible={!!modal.type} transparent animationType="slide" onRequestClose={() => setModal({ type: null })}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: cardBg }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: textPrimary }]}>
              {modal.type === 'customer' ? 'Customer Details' : modal.type === 'partner' ? 'Partner 360' : modal.type === 'member' ? 'Team Member Details' : 'Application Trace'}
            </Text>
            <TouchableOpacity onPress={() => setModal({ type: null })}><Icon name="x" size={20} color={textMuted} /></TouchableOpacity>
          </View>
          {modalLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 30 }} />
          ) : modal.type === 'trace' ? (
            <ScrollView style={{ maxHeight: 420 }}>
              <Text style={[styles.modalSub, { color: textMuted }]}>{modal.item?.customer_name} • {modal.item?.application_number || modal.item?.app_number || modal.item?.id}</Text>
              {Array.isArray(traceData?.timeline || traceData?.events || traceData?.steps) ? (
                (traceData.timeline || traceData.events || traceData.steps).map((t: any, i: number) => (
                  <View key={i} style={[styles.traceRow, { borderColor }]}>
                    <View style={[styles.traceDot, { backgroundColor: colors.primary }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: textPrimary }}>{t.status || t.stage || t.event || 'Step'}</Text>
                      <Text style={{ fontSize: 11, color: textMuted }}>{t.description || t.notes || t.created_at || ''}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={{ color: textMuted, fontSize: 13 }}>No trace data available.</Text>
              )}
            </ScrollView>
          ) : (
            <ScrollView style={{ maxHeight: 420 }}>
              {modal.item && (
                <View style={styles.modalInfoGrid}>
                  {Object.entries({
                    Name: modal.item.customer_name || `${modal.item.first_name || ''} ${modal.item.last_name || ''}`.trim() || modal.item.full_name || modal.item.name,
                    'Mobile / Code': modal.item.mobile || modal.item.partner_code || modal.item.employee_id,
                    Email: modal.item.email,
                    Status: modal.item.status || modal.item.kyc_status || modal.item.account_status,
                    'Wallet Balance': modal.item.available_balance != null ? inr(modal.item.available_balance) : undefined,
                  }).filter(([, v]) => v != null && v !== '').map(([k, v]) => (
                    <View key={k} style={[styles.modalInfoCell, { backgroundColor: bgSecondary, borderColor }]}>
                      <Text style={{ fontSize: 10, color: textMuted, fontWeight: '700', textTransform: 'uppercase' }}>{k}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: textPrimary }} numberOfLines={1}>{String(v)}</Text>
                    </View>
                  ))}
                </View>
              )}
              {modal.type === 'partner' && modalTeam.length > 0 && (
                <>
                  <Text style={[styles.modalSectionTitle, { color: textPrimary }]}>Team Members ({modalTeam.length})</Text>
                  {modalTeam.slice(0, 10).map((m: any, i: number) => (
                    <Text key={i} style={{ fontSize: 12, color: textMuted, paddingVertical: 3 }}>• {m.full_name || m.name} — {m.role || m.designation || 'Member'}</Text>
                  ))}
                </>
              )}
              <Text style={[styles.modalSectionTitle, { color: textPrimary }]}>Applications ({modalApps.length})</Text>
              {modalApps.length === 0 && !modalLoading && <Text style={{ fontSize: 12, color: textMuted }}>No applications found.</Text>}
              {modalApps.slice(0, 20).map((a: any, i: number) => (
                <View key={a.id || i} style={[styles.modalAppRow, { borderColor }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: textPrimary }} numberOfLines={1}>
                      {a.application_number || a.app_number || a.id} — {a.customer_name || a.product_name}
                    </Text>
                    <Text style={{ fontSize: 11, color: textMuted }}>{a.status} {a.commission_amount ? `• ${inr(a.commission_amount)}` : ''}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleViewTrace(a)}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary }}>TRACE</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  const renderListHeader = (title: string, subtitle: string, extra?: React.ReactNode) => (
    <View style={styles.listHeader}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.listTitle, { color: textPrimary }]}>{title}</Text>
        <Text style={[styles.listSubtitle, { color: textMuted }]}>{subtitle}</Text>
      </View>
      {extra}
    </View>
  );

  const searchBox = (placeholder: string, value: string, onChange: (v: string) => void) => (
    <TextInput
      style={[styles.searchInput, { borderColor, color: textPrimary, backgroundColor: bgSecondary }]}
      placeholder={placeholder}
      placeholderTextColor={textMuted}
      value={value}
      onChangeText={onChange}
    />
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: textMuted, marginTop: 10 }}>Loading Master Overview...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#08080c' : colors.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 120, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchMasterData(true)} colors={[colors.primary]} />}
      >
        {/* Header — website "Master Control Overview" */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={[styles.pageTitle, { color: textPrimary }]}>Master Control Overview</Text>
            <Text style={{ fontSize: 12, color: textMuted }}>System-wide metrics & 360° directory</Text>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={() => fetchMasterData(true)}>
            <Icon name="refresh" size={16} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12, marginLeft: 4 }}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {isDataIntegrityMismatch && (
          <View style={styles.warnBox}>
            <Icon name="alert-triangle" size={16} color="#F59E0B" />
            <Text style={{ flex: 1, fontSize: 12, color: '#B45309' }}>
              Data integrity check: process channels ({processSum}) do not match total applications ({stats.totalApps}).
            </Text>
          </View>
        )}

        {/* Top metric cards — horizontal scroll like website row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {topMetrics.map((m) => (
            <TouchableOpacity key={m.tab} style={[styles.metricCard, { backgroundColor: cardBg, borderColor }]} onPress={() => setActiveTab(m.tab)}>
              <Text style={[styles.metricLabel, { color: textMuted }]}>{m.label}</Text>
              <Text style={[styles.metricValue, { color: m.color }]}>{m.value}</Text>
              <Text style={{ fontSize: 10, color: textMuted }} numberOfLines={1}>{m.sub}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Master navigation tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
          {tabs.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.tabChip, { backgroundColor: isActive ? colors.primary : bgSecondary, borderColor: isActive ? colors.primary : border }]}
                onPress={() => setActiveTab(t.id)}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: isActive ? '#fff' : textMuted }}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>11-KPI System Metrics</Text>
            <View style={styles.kpiGrid}>
              {kpis.map((k) => (
                <TouchableOpacity
                  key={k.label}
                  style={[styles.kpiCell, { backgroundColor: isDark ? '#181824' : '#f8faff', borderColor }]}
                  onPress={() => k.tab && setActiveTab(k.tab)}
                  disabled={!k.tab}
                >
                  <Text style={{ fontSize: 18, fontWeight: '900', color: k.color }}>{k.value}</Text>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: textMuted, marginTop: 2 }}>{k.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── CUSTOMERS ── */}
        {activeTab === 'customers' && (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            {renderListHeader('Registered Customers Directory', 'View details of all customers and their applications across the system.',
              searchBox('Search customer name, mobile, email...', searchQuery, setSearchQuery))}
            {filteredCustomers.length === 0 && <Text style={{ color: textMuted, fontSize: 12, textAlign: 'center', paddingVertical: 20 }}>No customers found.</Text>}
            {filteredCustomers.map((c: any, i: number) => (
              <View key={c.id || i} style={[styles.row, { borderColor }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: textPrimary }}>{c.customer_name || 'Customer'}</Text>
                  <Text style={{ fontSize: 11, color: textMuted }}>{c.mobile || 'N/A'}{c.email ? ` • ${c.email}` : ''}</Text>
                  <Text style={{ fontSize: 11, color: textMuted }}>{[c.city, c.state].filter(Boolean).join(', ') || '—'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', marginRight: 10 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: textPrimary }}>{c.total_applications || 0} apps</Text>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.success }}>{c.approved_cards || 0} approved</Text>
                </View>
                <TouchableOpacity style={styles.viewBtn} onPress={() => handleViewCustomer(c)}>
                  <Text style={styles.viewBtnText}>View Details</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* ── PARTNERS ── */}
        {activeTab === 'partners' && (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            {renderListHeader('Partner Directory & 360 Info', 'View details, team members, total applications, and commission for each partner.',
              searchBox('Search partner code, name, mobile...', searchQuery, setSearchQuery))}
            {filteredPartners.length === 0 && <Text style={{ color: textMuted, fontSize: 12, textAlign: 'center', paddingVertical: 20 }}>No partners found.</Text>}
            {filteredPartners.map((p: any, i: number) => (
              <View key={p.id || i} style={[styles.row, { borderColor }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: colors.primary }}>{p.partner_code || '—'}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: textPrimary }} numberOfLines={1}>
                    {p.first_name} {p.last_name}{p.company_name ? ` • 🏢 ${p.company_name}` : ''}
                  </Text>
                  <Text style={{ fontSize: 11, color: textMuted }} numberOfLines={1}>{p.email} {p.mobile ? `• ${p.mobile}` : ''}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    <View style={[styles.badge, { backgroundColor: (p.kyc_status === 'approved' ? '#059669' : '#EA580C') + '18' }]}>
                      <Text style={[styles.badgeText, { color: p.kyc_status === 'approved' ? '#059669' : '#EA580C' }]}>{(p.kyc_status || 'PENDING').toUpperCase()}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: ((p.account_status || p.status) === 'active' ? '#059669' : '#EF4444') + '18' }]}>
                      <Text style={[styles.badgeText, { color: (p.account_status || p.status) === 'active' ? '#059669' : '#EF4444' }]}>{(p.account_status || p.status || 'ACTIVE').toUpperCase()}</Text>
                    </View>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', marginRight: 10 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: textPrimary }}>{inr(p.available_balance)}</Text>
                  <Text style={{ fontSize: 10, color: textMuted }}>Earned: {inr(p.total_earned)}</Text>
                </View>
                <TouchableOpacity style={styles.viewBtn} onPress={() => handleViewPartner(p)}>
                  <Text style={styles.viewBtnText}>360°</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* ── EMPLOYEES ── */}
        {activeTab === 'employees' && (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            {renderListHeader('Employees Directory', 'All registered employees, sales executives, and internal team staff across GharKaPaisa.',
              searchBox('Search name, employee ID, email...', searchQuery, setSearchQuery))}
            {filteredEmployees.length === 0 && <Text style={{ color: textMuted, fontSize: 12, textAlign: 'center', paddingVertical: 20 }}>No employees found.</Text>}
            {filteredEmployees.map((e: any, i: number) => (
              <View key={e.id || i} style={[styles.row, { borderColor }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: textPrimary }}>{e.full_name || e.name || 'Employee'}</Text>
                  <Text style={{ fontSize: 11, color: textMuted }}>{e.employee_id || e.employee_code || '—'} • {e.designation || e.role || ''}</Text>
                  <Text style={{ fontSize: 11, color: textMuted }} numberOfLines={1}>{e.email || e.mobile_number || e.mobile || ''}</Text>
                </View>
                {statusBadge(e.employee_status || e.activation_status || e.status)}
              </View>
            ))}
          </View>
        )}

        {/* ── TEAM MEMBERS ── */}
        {activeTab === 'team' && (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            {renderListHeader('Team Members Directory', 'Sub-agents, field executives, and network members.',
              searchBox('Search name, code, mobile...', searchQuery, setSearchQuery))}
            {filteredTeam.length === 0 && <Text style={{ color: textMuted, fontSize: 12, textAlign: 'center', paddingVertical: 20 }}>No team members found.</Text>}
            {filteredTeam.map((m: any, i: number) => (
              <View key={m.id || i} style={[styles.row, { borderColor }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: textPrimary }}>{m.full_name || m.name || 'Member'}</Text>
                  <Text style={{ fontSize: 11, color: textMuted }}>{m.partner_code || m.code || '—'} • {m.role || m.designation || 'Member'}</Text>
                  <Text style={{ fontSize: 11, color: textMuted }} numberOfLines={1}>{m.email || ''} {m.mobile ? `• ${m.mobile}` : ''}</Text>
                </View>
                <TouchableOpacity style={styles.viewBtn} onPress={() => handleViewMember(m)}>
                  <Text style={styles.viewBtnText}>Details</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* ── APPLICATIONS ── */}
        {activeTab === 'applications' && (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            {renderListHeader('All Applications Tracking', 'Real-time 360° traceability across all application processes.',
              <TouchableOpacity style={styles.crmBtn} onPress={() => router.push('/(app)/super-admin/applications' as any)}>
                <Text style={styles.crmBtnText}>Open Full CRM →</Text>
              </TouchableOpacity>)}
            {searchBox('Search app#, customer, partner, product...', searchQuery, setSearchQuery)}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 8 }}>
              {[
                { key: 'all', label: `All Processes (${stats.totalApps})` },
                { key: 'lead_punching', label: `Partner Punch (${stats.leadPunchingApps})` },
                { key: 'linked_share', label: `Linked Share (${stats.linkedShareApps})` },
                { key: 'direct_bank', label: `Direct Bank (${stats.directBankApps})` },
                { key: 'physical_process', label: `Physical (${stats.physicalProcessApps})` },
              ].map((f) => (
                <TouchableOpacity key={f.key} style={[styles.tabChip, { backgroundColor: processFilter === f.key ? colors.primary : bgSecondary, borderColor: processFilter === f.key ? colors.primary : border }]} onPress={() => setProcessFilter(f.key)}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: processFilter === f.key ? '#fff' : textMuted }}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 6, marginBottom: 8 }}>
              {['all', 'pending', 'details_submitted', 'operational_verified', 'approved', 'commission_released', 'rejected', 'cancelled'].map((s) => (
                <TouchableOpacity key={s} style={[styles.tabChip, { backgroundColor: statusFilter === s ? colors.primary : bgSecondary, borderColor: statusFilter === s ? colors.primary : border }]} onPress={() => setStatusFilter(s)}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: statusFilter === s ? '#fff' : textMuted }}>{s.replace(/_/g, ' ')}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {filteredApps.length === 0 && <Text style={{ color: textMuted, fontSize: 12, textAlign: 'center', paddingVertical: 20 }}>No applications found.</Text>}
            {filteredApps.map((a: any, i: number) => (
              <View key={a.id || i} style={[styles.row, { borderColor }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: textPrimary }} numberOfLines={1}>
                    {a.application_number || a.app_number || a.id}
                  </Text>
                  <Text style={{ fontSize: 11, color: textMuted }} numberOfLines={1}>
                    {a.customer_name || 'Customer'} • {a.mobile || ''} • {a.partner_code || ''}
                  </Text>
                  <Text style={{ fontSize: 11, color: textMuted }} numberOfLines={1}>
                    {a.product_name || ''}{a.bank_name ? ` @ ${a.bank_name}` : ''}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, alignItems: 'center' }}>
                    {processBadge(a.process_type)}
                    {statusBadge(a.status)}
                    {!!a.commission_amount && <Text style={{ fontSize: 11, fontWeight: '800', color: '#059669' }}>{inr(a.commission_amount)}</Text>}
                  </View>
                </View>
                <TouchableOpacity style={styles.viewBtn} onPress={() => handleViewTrace(a)}>
                  <Text style={styles.viewBtnText}>Trace</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* ── ADMINS ── */}
        {activeTab === 'admins' && (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>System Administrators & Operations</Text>
            {searchBox('Search admin...', searchQuery, setSearchQuery)}
            {filteredAdmins.length === 0 && <Text style={{ color: textMuted, fontSize: 12, textAlign: 'center', paddingVertical: 20 }}>No admins found.</Text>}
            {filteredAdmins.map((a: any, i: number) => (
              <View key={a.id || i} style={[styles.row, { borderColor }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: textPrimary }}>{a.fullName || a.full_name || 'Admin'}</Text>
                  <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}>{a.role}</Text>
                  <Text style={{ fontSize: 11, color: textMuted }}>{a.designation || 'Operation Head'}</Text>
                </View>
                {statusBadge(a.status || 'active')}
              </View>
            ))}
          </View>
        )}

        {/* ── FINANCIALS ── */}
        {activeTab === 'financials' && (
          <View style={{ gap: 14 }}>
            <View style={styles.finGrid}>
              {[
                { label: 'RazorpayX Live Balance', value: razorpayBalance !== null ? inr(razorpayBalance) : '₹0.00', color: colors.primaryLight },
                { label: 'Total Withdrawals', value: inr(stats.totalWithdrawalAmount), color: colors.success },
                { label: 'Pending Withdrawals', value: `${stats.pendingWithdrawals} Requests`, color: '#F59E0B' },
                { label: 'Total Transactions', value: `${financialsLedger.length} Entries`, color: colors.purple },
              ].map((f) => (
                <View key={f.label} style={[styles.finCell, { backgroundColor: cardBg, borderColor }]}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: textMuted }}>{f.label}</Text>
                  <Text style={{ fontSize: 17, fontWeight: '900', color: f.color, marginTop: 3 }}>{f.value}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
              <View style={{ flexDirection: 'row', gap: 8, backgroundColor: bgSecondary, padding: 4, borderRadius: 10, borderWidth: 1, borderColor, marginBottom: 12 }}>
                {([['ledger', 'Ledger'], ['withdrawals', 'Withdrawals']] as const).map(([k, label]) => (
                  <TouchableOpacity key={k} style={{ flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: finSubTab === k ? cardBg : 'transparent', alignItems: 'center' }} onPress={() => setFinSubTab(k)}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: finSubTab === k ? textPrimary : textMuted }}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {searchBox(finSubTab === 'ledger' ? 'Search transactions...' : 'Search withdrawals...', finSearch, setFinSearch)}
              {finFiltered.length === 0 && <Text style={{ color: textMuted, fontSize: 12, textAlign: 'center', paddingVertical: 20 }}>No records found.</Text>}
              {finFiltered.slice(0, 50).map((r: any, i: number) => (
                <View key={r.id || i} style={[styles.row, { borderColor }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: textPrimary }} numberOfLines={1}>
                      {r.description || r.notes || r.reference_number || r.reference || `#${r.id}`}
                    </Text>
                    <Text style={{ fontSize: 11, color: textMuted }} numberOfLines={1}>
                      {[r.partner_name || r.name, r.type || r.transaction_type, r.created_at ? new Date(r.created_at).toLocaleDateString() : ''].filter(Boolean).join(' • ')}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 13, fontWeight: '900', color: parseFloat(r.amount || 0) < 0 ? '#EF4444' : '#059669' }}>
                      {parseFloat(r.amount || 0) < 0 ? '-' : '+'}{inr(Math.abs(parseFloat(r.amount || 0)))}
                    </Text>
                    {statusBadge(r.status)}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
      {renderModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  pageTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.primary + '40', backgroundColor: colors.primary + '10' },
  warnBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.warningSoft, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FDE68A' },
  metricCard: { width: 150, borderRadius: 16, padding: 14, borderWidth: 1 },
  metricLabel: { fontSize: 11, fontWeight: '700' },
  metricValue: { fontSize: 18, fontWeight: '900', marginTop: 4 },
  tabChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  card: { borderRadius: 16, padding: 16, borderWidth: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 12 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kpiCell: { width: '31.5%', borderRadius: 12, padding: 12, borderWidth: 1, alignItems: 'center' },
  listHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  listTitle: { fontSize: 16, fontWeight: '800' },
  listSubtitle: { fontSize: 11, marginTop: 2 },
  searchInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 12, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontWeight: '800' },
  viewBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  viewBtnText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  crmBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  crmBtnText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  finGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  finCell: { width: '47%', borderRadius: 14, padding: 14, borderWidth: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 17, fontWeight: '800' },
  modalSub: { fontSize: 12, marginBottom: 10 },
  modalInfoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  modalInfoCell: { width: '48%', borderRadius: 10, padding: 10, borderWidth: 1 },
  modalSectionTitle: { fontSize: 13, fontWeight: '800', marginTop: 12, marginBottom: 6 },
  modalAppRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1 },
  traceRow: { flexDirection: 'row', gap: 10, paddingVertical: 8, borderBottomWidth: 1 },
  traceDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
});
