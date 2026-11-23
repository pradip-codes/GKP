import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, Image,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Icon } from '../../components/Icon';
import { spacing } from '../../theme/spacing';
import apiClient from '../../services/api';
import { fetchEmployeeIncentives } from '../../services/employee.service';

const ACCENT = '#0F766E';
const inr = (v: any) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

function StatusBadge({ status }: { status?: string }) {
  const s = String(status || 'PENDING').toUpperCase();
  let bg = '#EF444420', color = '#EF4444', label = 'REJECTED';
  if (['PAID', 'COMPLETED', 'RELEASE', 'RELEASED'].includes(s)) { bg = '#10B98120'; color = '#10B981'; label = 'PAID / RELEASED'; }
  else if (['PENDING', 'HOLD', 'ON_HOLD', 'HELD', 'HELD_APPFILE_PENDING', 'HELD_TARGET_PENDING'].includes(s)) { bg = '#F59E0B20'; color = '#F59E0B'; label = 'PENDING'; }
  else if (s === 'IN_REVIEW') { bg = '#3B82F620'; color = '#3B82F6'; label = 'IN REVIEW'; }
  return (
    <View style={{ backgroundColor: bg, borderWidth: 1, borderColor: `${color}40`, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'center' }}>
      <Text style={{ fontSize: 10.5, fontWeight: '800', color }}>{label}</Text>
    </View>
  );
}

function MonthlyReport({ isDark, cardBg, bgSecondary, borderCol, colors }: any) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  const load = useCallback(async (m?: string, y?: string) => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {};
      if (m) params.month = m;
      if (y) params.year = y;
      const res = await apiClient.get('/employee/monthly-incentive-report', { params });
      if (res.data?.success) {
        setReport(res.data);
        if (!m && res.data.period?.month) setMonth(String(res.data.period.month).padStart(2, '0'));
        if (!y && res.data.period?.year) setYear(String(res.data.period.year));
      } else {
        setError(res.data?.message || 'Failed to fetch monthly incentive report.');
      }
    } catch (e: any) {
      console.warn('Monthly incentive report error:', e);
      setError(e?.response?.data?.message || 'Failed to fetch employee incentive report. Please try again.');
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const period = report?.period || {};
  const summary = report?.summary || {};
  const bankBreakdown = report?.bank_breakdown || [];
  const applications = report?.applications || [];
  const availableMonths = report?.available_months || [];
  const currentLabel = availableMonths.find((m: any) => `${m.year}-${String(m.month).padStart(2, '0')}` === `${year}-${month}`)?.label
    || `${period.month_name || ''} ${period.year || ''}`.trim();

  const kpi = (icon: string, label: string, value: string, color: string) => (
    <View style={[styles.kpiCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
      <View style={[styles.kpiIcon, { backgroundColor: `${color}15` }]}><Icon name={icon as any} size={16} color={color} /></View>
      <Text style={[styles.kpiLabel, { color: colors.textMid }]}>{label}</Text>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
    </View>
  );

  return (
    <View style={{ gap: 14 }}>
      {/* Selector bar */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Icon name="calendar" size={16} color={ACCENT} />
          <Text style={{ fontSize: 15.5, fontWeight: '900', color: colors.text }}>Monthly Incentive Structure & Performance Audit</Text>
        </View>
        <Text style={{ fontSize: 12, color: colors.textMid, lineHeight: 17, marginBottom: 12 }}>
          Inspect historical bank incentive structures, department targets, and card approval performance for <Text style={{ color: ACCENT, fontWeight: '800' }}>{period.month_name} {period.year}</Text>.
        </Text>
        <TouchableOpacity style={[styles.monthPicker, { borderColor: ACCENT, backgroundColor: bgSecondary }]} onPress={() => setPickerOpen(true)}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>{currentLabel || 'Select Month'}{availableMonths.find((m: any) => m.is_current) ? ' (Current Month)' : ''}</Text>
          <Icon name="chevron-down" size={14} color={ACCENT} />
        </TouchableOpacity>
      </View>

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }} onPress={() => setPickerOpen(false)}>
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol, maxHeight: '60%' }]}>
            <ScrollView>
              {availableMonths.map((m: any) => {
                const val = `${m.year}-${String(m.month).padStart(2, '0')}`;
                const [yy, mm] = val.split('-');
                const sel = val === `${year}-${month}`;
                return (
                  <TouchableOpacity key={val} style={[styles.monthOption, sel && { backgroundColor: `${ACCENT}15` }]} onPress={() => { setYear(yy); setMonth(mm); setPickerOpen(false); load(mm, yy); }}>
                    <Text style={{ fontSize: 13.5, fontWeight: sel ? '800' : '600', color: sel ? ACCENT : colors.text }}>{m.label}{m.is_current ? ' (Current Month)' : ''}</Text>
                    {sel && <Icon name="check" size={14} color={ACCENT} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {loading ? (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol, paddingVertical: 50, alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={{ fontSize: 13, color: colors.textMid, marginTop: 10 }}>Loading historical incentive audit data for {period.month_name || 'selected month'}...</Text>
        </View>
      ) : error ? (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: '#EF444440', paddingVertical: 40, alignItems: 'center', gap: 10 }]}>
          <Icon name="alert-circle" size={30} color="#EF4444" />
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, textAlign: 'center', paddingHorizontal: 20 }}>{error}</Text>
          <TouchableOpacity onPress={() => load(month, year)} style={{ backgroundColor: ACCENT, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, marginTop: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* 4 KPI cards */}
          <View style={styles.kpiGrid}>
            {kpi('credit-card', 'APPROVED CARDS', String(summary.total_approved_cards || 0), colors.text)}
            {kpi('cash', 'INCENTIVE EARNED', inr(summary.total_incentive_earned), '#10B981')}
            {kpi('check', 'RELEASED INCENTIVE', inr(summary.total_incentive_released), '#3B82F6')}
            {kpi('clock', 'HELD / PENDING', inr(summary.total_incentive_held), '#F59E0B')}
          </View>

          {/* Bank-wise matrix */}
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol, padding: 0, overflow: 'hidden' }]}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: borderCol }}>
              <Text style={{ fontSize: 14.5, fontWeight: '900', color: colors.text }}>Bank-wise Incentive Structure & Department Target Matrix ({period.month_name} {period.year})</Text>
              <Text style={{ fontSize: 11.5, color: colors.textMid, marginTop: 3 }}>Incentive rates, targets, and card approvals for all partner banks.</Text>
            </View>
            {bankBreakdown.length === 0 ? (
              <Text style={{ padding: 30, textAlign: 'center', fontSize: 13, color: colors.textMid }}>No active bank targets or product applications recorded for {period.month_name} {period.year}.</Text>
            ) : bankBreakdown.map((bm: any, i: number) => (
              <View key={bm.bank_id || i} style={{ padding: 14, borderBottomWidth: i < bankBreakdown.length - 1 ? 1 : 0, borderBottomColor: borderCol }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  {bm.bank_logo_url ? (
                    <Image source={{ uri: bm.bank_logo_url }} style={{ width: 28, height: 28, borderRadius: 6 }} resizeMode="contain" />
                  ) : (
                    <View style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: `${ACCENT}20`, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: ACCENT }}>{String(bm.bank_name || '?').slice(0, 3).toUpperCase()}</Text>
                    </View>
                  )}
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.text, flex: 1 }}>{bm.bank_name}</Text>
                  <View style={{ backgroundColor: bm.is_department ? '#8B5CF615' : bgSecondary, borderWidth: 1, borderColor: bm.is_department ? '#8B5CF630' : borderCol, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 10.5, fontWeight: '800', color: bm.is_department ? '#8B5CF6' : colors.textMid }}>{bm.is_department ? '🏢 Department Bank' : '💳 General Bank'}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
                  <View><Text style={[styles.miniLabel, { color: colors.textMid }]}>MONTHLY TARGET</Text><Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>{bm.is_department && bm.target_count > 0 ? `${bm.target_count} Cards` : 'No Target'}</Text></View>
                  <View><Text style={[styles.miniLabel, { color: colors.textMid }]}>APPROVED CARDS</Text><Text style={{ fontSize: 13, fontWeight: '900', color: bm.app_file_yes_cards_count > 0 ? '#10B981' : colors.textMid }}>{bm.app_file_yes_cards_count} Approved{bm.approved_cards_count > bm.app_file_yes_cards_count ? ` (+${bm.approved_cards_count - bm.app_file_yes_cards_count} pending)` : ''}</Text></View>
                  <View><Text style={[styles.miniLabel, { color: colors.textMid }]}>INCENTIVE RATE</Text><Text style={{ fontSize: 13, fontWeight: '800', color: ACCENT }}>{bm.bonus_per_card > 0 ? `${inr(bm.bonus_per_card)} / Card` : 'Standard Product Rate'}</Text></View>
                  <View><Text style={[styles.miniLabel, { color: colors.textMid }]}>EARNED</Text><Text style={{ fontSize: 14, fontWeight: '900', color: '#10B981' }}>{inr(bm.earned_incentive)}{bm.held_incentive > 0 ? `  (Held: ${inr(bm.held_incentive)})` : ''}</Text></View>
                </View>
              </View>
            ))}
          </View>

          {/* Applications log */}
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol, padding: 0, overflow: 'hidden' }]}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: borderCol, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 14.5, fontWeight: '900', color: colors.text }}>📄 Applications & Incentive Log ({period.month_name} {period.year})</Text>
              <Text style={{ fontSize: 11.5, color: colors.textMid, fontWeight: '700' }}>{applications.length} Applications Punched</Text>
            </View>
            {applications.length === 0 ? (
              <Text style={{ padding: 28, textAlign: 'center', fontSize: 13, color: colors.textMid }}>No applications submitted in {period.month_name} {period.year}.</Text>
            ) : applications.map((app: any, i: number) => {
              const isApproved = ['approved', 'disbursed', 'sanctioned', 'super_admin_approved'].includes(String(app.status || '').toLowerCase());
              const isFileYes = String(app.app_file_generated || '').trim().toLowerCase() === 'yes';
              return (
                <View key={app.id || i} style={{ padding: 12, borderBottomWidth: i < applications.length - 1 ? 1 : 0, borderBottomColor: borderCol, gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: ACCENT }}>{app.app_number || 'N/A'}</Text>
                    <Text style={{ fontSize: 13.5, fontWeight: '900', color: Number(app.tx_amount) > 0 ? '#10B981' : colors.textMid }}>{inr(app.tx_amount || 0)}</Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>{app.customer_name || 'Customer'} <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMid }}>{app.customer_mobile || ''}</Text></Text>
                  <Text style={{ fontSize: 12, color: colors.text }}>{app.product_name} <Text style={{ color: colors.textMid }}>{app.bank_name}</Text></Text>
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    <View style={{ backgroundColor: isApproved ? '#10B98115' : bgSecondary, borderWidth: 1, borderColor: isApproved ? '#10B98130' : borderCol, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: isApproved ? '#10B981' : colors.textMid }}>{String(app.status || '').toUpperCase().replace(/_/g, ' ')}</Text>
                    </View>
                    <View style={{ backgroundColor: isFileYes ? '#10B98115' : '#F59E0B15', borderWidth: 1, borderColor: isFileYes ? '#10B98130' : '#F59E0B30', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: isFileYes ? '#10B981' : '#F59E0B' }}>App File: {isFileYes ? 'YES' : (app.app_file_generated || 'NO')}</Text>
                    </View>
                    {!!app.approval_sequence && (
                      <View style={{ backgroundColor: app.approval_sequence <= (app.bank_target || 0) ? '#3B82F615' : '#10B98115', borderWidth: 1, borderColor: app.approval_sequence <= (app.bank_target || 0) ? '#3B82F630' : '#10B98130', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: app.approval_sequence <= (app.bank_target || 0) ? '#3B82F6' : '#10B981' }}>#{app.approval_sequence}{app.bank_target > 0 ? (app.approval_sequence <= app.bank_target ? ` (Quota ${app.approval_sequence}/${app.bank_target})` : ' (Eligible)') : ''}</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}

export default function EmployeeIncentivesScreen() {
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [ledgerError, setLedgerError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'monthly' | 'ledger'>('monthly');

  const loadIncentives = useCallback(async () => {
    try {
      setLoading(true);
      setLedgerError(null);
      const res = await fetchEmployeeIncentives();
      if (res?.success) {
        setStats(res.stats || null);
        setTransactions(res.transactions || []);
      } else {
        setLedgerError('Failed to fetch employee incentives. Please try again.');
      }
    } catch (err: any) {
      console.warn('Incentives load error:', err);
      setLedgerError(err?.response?.data?.message || 'Failed to fetch employee incentives. Please try again.');
    }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadIncentives(); }, [loadIncentives]);

  const cardBg = isDark ? '#1E293B' : '#FFFFFF';
  const bgSecondary = isDark ? '#0F172A' : '#F8FAFC';
  const borderCol = colors.border;
  const styles2 = { cardBg, bgSecondary, borderCol, colors };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadIncentives(); }} tintColor={ACCENT} />}
    >
      {/* Header — website: eyebrow + title */}
      <View style={{ marginBottom: 18 }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: ACCENT, textTransform: 'uppercase', letterSpacing: 0.5 }}>Financial Ledger</Text>
        <Text style={{ fontSize: 24, fontWeight: '900', color: colors.text }}>My Incentives & Earnings</Text>
      </View>

      {/* View switcher */}
      <View style={[styles.switcher, { backgroundColor: cardBg, borderColor: borderCol }]}>
        {([['monthly', '🗓️ Monthly Audit'], ['ledger', '📜 Ledger']] as const).map(([v, label]) => (
          <TouchableOpacity key={v} style={[styles.switchTab, activeView === v && { backgroundColor: ACCENT }]} onPress={() => setActiveView(v)}>
            <Text style={{ fontSize: 12.5, fontWeight: '800', color: activeView === v ? '#fff' : colors.textMid }}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeView === 'monthly' ? (
        <MonthlyReport {...styles2} />
      ) : (
        <>
          {/* 3 stat cards — website ledger stats */}
          <View style={{ gap: 12, marginBottom: 16 }}>
            {([
              ['cash', 'Total Paid Earnings', inr(stats?.total_paid), '#10B981'],
              ['clock', 'Pending Incentives', inr(stats?.pending_incentive), '#F59E0B'],
              ['check-circle', 'Leads Converted', String(stats?.total_leads_converted || transactions.length), colors.text],
            ] as const).map(([icon, label, value, color]) => (
              <View key={label} style={[styles.statCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}><Icon name={icon as any} size={18} color={color} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: colors.textMid, fontWeight: '700' }}>{label}</Text>
                  <Text style={{ fontSize: 20, fontWeight: '900', color, marginTop: 2 }}>{value}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Transactions ledger */}
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol, padding: 0, overflow: 'hidden' }]}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: borderCol, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>Incentive Transactions Ledger</Text>
              <Text style={{ fontSize: 12, color: colors.textMid, fontWeight: '600' }}>{transactions.length} Total Entries</Text>
            </View>
            {loading ? (
              <ActivityIndicator size="small" color={ACCENT} style={{ marginVertical: 40 }} />
            ) : ledgerError ? (
              <View style={{ paddingVertical: 40, alignItems: 'center', gap: 10 }}>
                <Icon name="alert-circle" size={28} color="#EF4444" />
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMid, textAlign: 'center', paddingHorizontal: 20 }}>{ledgerError}</Text>
                <TouchableOpacity onPress={loadIncentives} style={{ backgroundColor: ACCENT, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 9, marginTop: 4 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : transactions.length === 0 ? (
              <View style={{ paddingVertical: 50, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>No incentive transactions recorded yet.</Text>
                <Text style={{ fontSize: 12, color: colors.textMid, marginTop: 4 }}>Your earned incentives will automatically appear here once approved.</Text>
              </View>
            ) : transactions.map((tx: any, idx: number) => (
              <View key={tx.id || idx} style={{ padding: 14, borderBottomWidth: idx < transactions.length - 1 ? 1 : 0, borderBottomColor: borderCol }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.text }}>{tx.customer_name || 'Customer Lead'}</Text>
                    <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 2 }}>App: {tx.app_number || 'N/A'}</Text>
                    <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.text, marginTop: 4 }}>{tx.product_name || 'Financial Product'}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 15, fontWeight: '900', color: ACCENT }}>{inr(tx.amount)}</Text>
                    <StatusBadge status={tx.status} />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                  <Text style={{ fontSize: 11.5, color: colors.textMid }}>{tx.created_at ? new Date(tx.created_at).toLocaleDateString('en-IN') : 'N/A'}</Text>
                  {tx.payment_reference ? <Text style={{ fontSize: 11, color: ACCENT, fontWeight: '600' }}>Ref: {tx.payment_reference}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, paddingBottom: spacing.xxl },
  switcher: {
    flexDirection: 'row', gap: 6, borderRadius: 12, borderWidth: 1, padding: 4, marginBottom: 18,
  },
  switchTab: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  statCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 16, borderWidth: 1, padding: 16,
  },
  statIcon: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 18, borderWidth: 1 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: { flexBasis: '47%', flexGrow: 1, borderRadius: 14, borderWidth: 1, padding: 14, gap: 4 },
  kpiIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  kpiLabel: { fontSize: 10.5, fontWeight: '800', textTransform: 'uppercase' },
  kpiValue: { fontSize: 18, fontWeight: '900' },
  monthPicker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
  },
  monthOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
  },
  miniLabel: { fontSize: 9.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
});
