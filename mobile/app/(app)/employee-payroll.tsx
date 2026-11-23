import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Icon } from '../../components/Icon';
import { useTheme } from '../../contexts/ThemeContext';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import {
  fetchMySalary,
  fetchPayslips,
  fetchPayslipDetail,
  requestPayslip,
  downloadPayslipPdf,
  fetchPayrollDocuments,
  openPayrollDocument,
  fetchPfSummary,
} from '../../services/payroll.service';

const TABS = [
  { id: 'salary', label: 'My Salary', icon: 'wallet' },
  { id: 'payslips', label: 'Payslips', icon: 'document-text' },
  { id: 'documents', label: 'Documents', icon: 'document' },
  { id: 'pf', label: 'PF & Tax', icon: 'shield' },
];

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const fmt = (n: any) => '₹' + (parseFloat(n || 0) || 0).toLocaleString('en-IN');

export default function EmployeePayrollScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams<{ tab?: string }>();

  const [activeTab, setActiveTab] = useState(() => {
    const t = params.tab;
    return TABS.some((tab) => tab.id === t) ? (t as string) : 'salary';
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Salary tab
  const [salary, setSalary] = useState<any>(null);
  const [selMonth, setSelMonth] = useState<number>(new Date().getMonth() + 1);
  const [selYear, setSelYear] = useState<number>(new Date().getFullYear());

  // Payslips tab
  const [payslips, setPayslips] = useState<any[]>([]);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Documents tab
  const [documents, setDocuments] = useState<any[]>([]);

  // PF tab
  const [pf, setPf] = useState<any>(null);
  const [pfYear, setPfYear] = useState<number>(new Date().getFullYear());

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const loadSalary = useCallback(async () => {
    try {
      const res = await fetchMySalary(selMonth, selYear);
      if (res?.success) setSalary(res.data);
    } catch (e: any) {
      showToast(e?.message || 'Failed to load salary');
    }
  }, [selMonth, selYear]);

  const loadPayslips = useCallback(async () => {
    try {
      const res = await fetchPayslips();
      if (res?.success) setPayslips(res.data || []);
    } catch (e: any) {
      showToast(e?.message || 'Failed to load payslips');
    }
  }, []);

  const loadDocuments = useCallback(async () => {
    try {
      const res = await fetchPayrollDocuments();
      if (res?.success) setDocuments(res.data || []);
    } catch (e: any) {
      /* non-blocking */
    }
  }, []);

  const loadPf = useCallback(async () => {
    try {
      const res = await fetchPfSummary(pfYear);
      if (res?.success) setPf(res.data);
    } catch (e: any) {
      /* non-blocking */
    }
  }, [pfYear]);

  const loadAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    await Promise.all([loadSalary(), loadPayslips(), loadDocuments(), loadPf()]);
    setLoading(false);
    setRefreshing(false);
  }, [loadSalary, loadPayslips, loadDocuments, loadPf]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { loadSalary(); }, [selMonth, selYear]);
  useEffect(() => { loadPf(); }, [pfYear]);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetchPayslipDetail(id);
      if (res?.success) setDetail(res.data);
      else showToast(res?.message || 'Failed to load payslip');
    } catch (e: any) {
      showToast(e?.message || 'Failed to load payslip');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleRequestPayslip = (id: string) => {
    Alert.alert('Request Payslip', 'Request HR approval to download this payslip PDF?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Request',
        onPress: async () => {
          setActionLoading(id);
          try {
            const res = await requestPayslip(id);
            showToast(res?.message || 'Payslip request submitted');
            loadPayslips();
          } catch (e: any) {
            showToast(e?.message || 'Request failed');
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  const handleDownload = async (id: string, month?: number, year?: number) => {
    setActionLoading(id);
    try {
      await downloadPayslipPdf(id, month, year);
    } catch (e: any) {
      showToast(e?.message || 'Download not available');
    } finally {
      setActionLoading(null);
    }
  };

  const computed = salary?.computed;
  const record = salary?.record;
  const reqStatus = salary?.payslipRequest?.status;
  const availableMonths: any[] = salary?.availableMonths || [];

  const card = { backgroundColor: colors.card, borderColor: colors.border } as const;

  const Line = ({ label, amount, note, color }: { label: string; amount: number; note?: string; color?: string }) => (
    <View style={{ marginBottom: 8 }}>
      <View style={styles.betweenRow}>
        <Text style={[styles.muted, { color: colors.textLight, flex: 1 }]} numberOfLines={2}>{label}</Text>
        <Text style={[styles.bold, { color: color || colors.text }]}>{fmt(amount)}</Text>
      </View>
      {note ? <Text style={[styles.note, { color: colors.textLight }]}>{note}</Text> : null}
    </View>
  );

  const statusChip = (status: string) => {
    const s = (status || '').toLowerCase();
    const map: Record<string, { bg: string; fg: string; label: string }> = {
      approved: { bg: '#DCFCE7', fg: '#166534', label: 'Approved' },
      paid: { bg: '#DBEAFE', fg: '#1D4ED8', label: 'Paid' },
      pending: { bg: '#FEF3C7', fg: '#B45309', label: 'Pending' },
      rejected: { bg: '#FEE2E2', fg: '#991B1B', label: 'Rejected' },
      draft: { bg: '#F1F5F9', fg: '#475569', label: 'Draft' },
    };
    const m = map[s] || map.draft;
    return (
      <View style={{ backgroundColor: m.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
        <Text style={{ fontSize: 10, fontWeight: '800', color: m.fg }}>{m.label}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={styles.pageHeader}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, card]}>
          <Icon name="arrow-left" size={18} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Payroll & Salary</Text>
          <Text style={[styles.pageSub, { color: colors.textLight }]}>Salary structure, payslips & documents</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <>
          {/* Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={{ gap: 4 }}>
            {TABS.map((t) => (
              <TouchableOpacity key={t.id} onPress={() => setActiveTab(t.id)} style={[styles.tabBtn, activeTab === t.id && { borderBottomColor: '#008A60' }]}>
                <Icon name={t.icon} size={13} color={activeTab === t.id ? '#008A60' : colors.textLight} />
                <Text style={[styles.tabLabel, { color: activeTab === t.id ? '#008A60' : colors.textLight }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAll(true)} colors={[colors.primary]} tintColor={colors.primary} />}>

            {/* ── MY SALARY ── */}
            {activeTab === 'salary' && (
              <View style={{ gap: 14 }}>
                {/* Month selector */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {(availableMonths.length ? availableMonths : [{ month: selMonth, year: selYear }]).map((m: any, i: number) => {
                    const active = m.month === selMonth && m.year === selYear;
                    return (
                      <TouchableOpacity key={i} onPress={() => { setSelMonth(m.month); setSelYear(m.year); }} style={[styles.monthChip, { backgroundColor: active ? '#008A60' : colors.card, borderColor: active ? '#008A60' : colors.border }]}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: active ? '#FFF' : colors.text }}>
                          {MONTHS[m.month - 1]?.slice(0, 3)} {m.year}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Net pay hero */}
                <View style={[styles.cardBox, card, { backgroundColor: '#008A60', borderColor: '#008A60' }]}>
                  <Text style={{ color: '#D1FAE5', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>Net Pay — {MONTHS[selMonth - 1]} {selYear}</Text>
                  <Text style={{ color: '#FFF', fontSize: 30, fontWeight: '900', marginTop: 4 }}>{fmt(computed?.netPay ?? record?.net_pay)}</Text>
                  <View style={{ flexDirection: 'row', gap: 14, marginTop: 8 }}>
                    <Text style={{ color: '#A7F3D0', fontSize: 11 }}>Gross: {fmt(computed?.grossEarnings ?? record?.gross_earnings)}</Text>
                    <Text style={{ color: '#FECACA', fontSize: 11 }}>Deductions: -{fmt(computed?.totalDeductions ?? record?.total_deductions)}</Text>
                  </View>
                  {record && <View style={{ marginTop: 8 }}>{statusChip(record.status)}</View>}
                </View>

                {/* Earnings */}
                <View style={[styles.cardBox, card, { padding: 14 }]}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Earnings</Text>
                  {(computed?.earnings || []).map((l: any, i: number) => <Line key={i} label={l.label} amount={l.amount} color="#059669" />)}
                </View>

                {/* Deductions */}
                <View style={[styles.cardBox, card, { padding: 14 }]}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Deductions</Text>
                  {(computed?.deductions || []).filter((d: any) => d.amount > 0).length === 0 ? (
                    <Text style={[styles.muted, { color: colors.textLight }]}>No deductions this month.</Text>
                  ) : (
                    (computed?.deductions || []).filter((d: any) => d.amount > 0).map((l: any, i: number) => <Line key={i} label={l.label} amount={l.amount} note={l.note} color="#DC2626" />)
                  )}
                </View>

                {/* Employer contributions */}
                {(computed?.employerContributions || []).length > 0 && (
                  <View style={[styles.cardBox, card, { padding: 14 }]}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Employer Contributions (not deducted)</Text>
                    {computed.employerContributions.map((l: any, i: number) => <Line key={i} label={l.label} amount={l.amount} />)}
                  </View>
                )}

                {/* Attendance summary */}
                {computed && (
                  <View style={[styles.cardBox, card, { padding: 14 }]}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Attendance This Month</Text>
                    <View style={styles.statRow}>
                      {[['Working Days', computed.workingDays], ['Present', computed.presentDays], ['LOP', computed.lopDays], ['Late', computed.lateCount]].map(([l, v]) => (
                        <View key={l as string} style={styles.statBox}>
                          <Text style={[styles.statVal, { color: colors.text }]}>{v ?? '—'}</Text>
                          <Text style={[styles.muted, { color: colors.textLight, fontSize: 10 }]}>{l}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Payslip request status */}
                {reqStatus && (
                  <View style={[styles.cardBox, card, { padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
                    <Icon name="document-text" size={18} color={colors.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.bold, { color: colors.text, fontSize: 12 }]}>Payslip request: {reqStatus}</Text>
                      {salary?.payslipRequest?.rejection_reason ? (
                        <Text style={[styles.muted, { color: '#DC2626' }]}>{salary.payslipRequest.rejection_reason}</Text>
                      ) : null}
                    </View>
                    {statusChip(reqStatus)}
                  </View>
                )}
              </View>
            )}

            {/* ── PAYSLIPS ── */}
            {activeTab === 'payslips' && (
              <View style={{ gap: 10 }}>
                {payslips.length === 0 ? (
                  <View style={[styles.cardBox, card, { padding: 30, alignItems: 'center' }]}>
                    <Icon name="document-text" size={32} color={colors.textLight} />
                    <Text style={[styles.muted, { color: colors.textLight, marginTop: 8, textAlign: 'center' }]}>
                      No approved payslips yet. Payslips appear here once HR approves your payroll.
                    </Text>
                  </View>
                ) : (
                  payslips.map((p) => (
                    <TouchableOpacity key={p.id} style={[styles.cardBox, card, { padding: 14 }]} onPress={() => openDetail(p.id)}>
                      <View style={styles.betweenRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.bold, { color: colors.text, fontSize: 13 }]}>{p.monthName}</Text>
                          <Text style={[styles.muted, { color: colors.textLight, fontSize: 11, marginTop: 2 }]}>
                            Gross {fmt(p.grossEarnings)} • Ded {fmt(p.totalDeductions)}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 6 }}>
                          <Text style={{ fontSize: 15, fontWeight: '900', color: '#008A60' }}>{fmt(p.netPay)}</Text>
                          {statusChip(p.payrollStatus)}
                        </View>
                      </View>

                      {/* Request status */}
                      {p.requestStatus && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                          <Text style={[styles.muted, { color: colors.textLight, fontSize: 10, flex: 1 }]}>
                            Download request: {p.requestStatus}{p.requestRejectionReason ? ` — ${p.requestRejectionReason}` : ''}
                          </Text>
                          {statusChip(p.requestStatus)}
                        </View>
                      )}

                      {/* Actions */}
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                        {p.downloadable ? (
                          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#008A60' }]} onPress={() => handleDownload(p.id, p.month, p.year)} disabled={actionLoading === p.id}>
                            {actionLoading === p.id ? <ActivityIndicator color="#FFF" size="small" /> : <><Icon name="download" size={13} color="#FFF" /><Text style={styles.actionBtnText}>Download PDF</Text></>}
                          </TouchableOpacity>
                        ) : p.requestStatus !== 'PENDING' && p.requestStatus !== 'APPROVED' ? (
                          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => handleRequestPayslip(p.id)} disabled={actionLoading === p.id}>
                            {actionLoading === p.id ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.actionBtnText}>Request Payslip</Text>}
                          </TouchableOpacity>
                        ) : (
                          <View style={[styles.actionBtn, { backgroundColor: '#FEF3C7' }]}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#B45309' }}>Awaiting HR Approval</Text>
                          </View>
                        )}
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: isDark ? colors.bg : '#F1F5F9', borderWidth: 1, borderColor: colors.border }]} onPress={() => openDetail(p.id)}>
                          <Icon name="eye" size={13} color={colors.text} />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>Details</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {/* ── DOCUMENTS ── */}
            {activeTab === 'documents' && (
              <View style={{ gap: 10 }}>
                {documents.length === 0 ? (
                  <View style={[styles.cardBox, card, { padding: 30, alignItems: 'center' }]}>
                    <Icon name="folder" size={32} color={colors.textLight} />
                    <Text style={[styles.muted, { color: colors.textLight, marginTop: 8, textAlign: 'center' }]}>
                      No official documents yet. Salary letters, experience letters and tax proofs will appear here.
                    </Text>
                  </View>
                ) : (
                  documents.map((d) => (
                    <View key={d.id} style={[styles.cardBox, card, { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
                      <View style={[styles.docIcon, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                        <Icon name="document-text" size={18} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.bold, { color: colors.text, fontSize: 12 }]} numberOfLines={1}>{d.name || d.doc_type}</Text>
                        <Text style={[styles.muted, { color: colors.textLight, fontSize: 10, marginTop: 2 }]}>
                          {[d.doc_type, d.period, d.issued_on ? `Issued ${new Date(d.issued_on).toLocaleDateString('en-IN')}` : null].filter(Boolean).join(' • ')}
                        </Text>
                      </View>
                      {statusChip(d.status || 'active')}
                      <TouchableOpacity onPress={() => openPayrollDocument(d.id)} style={[styles.actionBtn, { backgroundColor: '#008A60', paddingHorizontal: 10 }]}>
                        <Icon name="download" size={13} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ── PF & TAX ── */}
            {activeTab === 'pf' && (
              <View style={{ gap: 14 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {[pfYear - 1, pfYear, pfYear + 1].map((y) => (
                    <TouchableOpacity key={y} onPress={() => setPfYear(y)} style={[styles.monthChip, { backgroundColor: y === pfYear ? '#008A60' : colors.card, borderColor: y === pfYear ? '#008A60' : colors.border }]}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: y === pfYear ? '#FFF' : colors.text }}>{y}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={[styles.cardBox, card, { padding: 14 }]}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Tax & Statutory IDs — FY {pfYear}</Text>
                  <View style={styles.betweenRow}>
                    <Text style={[styles.muted, { color: colors.textLight }]}>PAN</Text>
                    <Text style={[styles.bold, { color: colors.text }]}>{pf?.pan || 'Not on record'}</Text>
                  </View>
                </View>

                <View style={[styles.cardBox, card, { padding: 14 }]}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Provident Fund (PF)</Text>
                  <View style={{ gap: 8, marginTop: 4 }}>
                    <Line label="Employee PF (YTD)" amount={pf?.employeePfYtd} color="#DC2626" />
                    <Line label="Employer PF (YTD)" amount={pf?.employerPfYtd} />
                    <Line label="Employee ESI (YTD)" amount={pf?.employeeEsiYtd} color="#DC2626" />
                    <Line label="Employer ESI (YTD)" amount={pf?.employerEsiYtd} />
                  </View>
                </View>

                <View style={[styles.cardBox, card, { padding: 14 }]}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Year-to-Date Earnings</Text>
                  <Line label="Gross Earnings (YTD)" amount={pf?.grossYtd} />
                  <Line label="Net Pay (YTD)" amount={pf?.netYtd} color="#059669" />
                  <Text style={[styles.muted, { color: colors.textLight, fontSize: 10, marginTop: 4 }]}>
                    Based on {pf?.monthsCount || 0} approved payroll month(s)
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        </>
      )}

      {/* Payslip detail modal */}
      <Modal visible={!!detail} transparent animationType="slide" onRequestClose={() => setDetail(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {detailLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 30 }} />
            ) : detail ? (
              <ScrollView style={{ maxHeight: 480 }}>
                <View style={styles.betweenRow}>
                  <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 0 }]}>Payslip — {detail.monthName}</Text>
                  <TouchableOpacity onPress={() => setDetail(null)}><Icon name="x" size={18} color={colors.textLight} /></TouchableOpacity>
                </View>
                {detail.employee && (
                  <Text style={[styles.muted, { color: colors.textLight, marginTop: 4 }]}>
                    {detail.employee.full_name} • {detail.employee.emp_code} • {detail.employee.designation}
                  </Text>
                )}
                <View style={[styles.statRow, { marginTop: 10 }]}>
                  {[['Working', detail.workingDays], ['Present', detail.presentDays], ['LOP', detail.lopDays], ['Late', detail.lateCount]].map(([l, v]) => (
                    <View key={l as string} style={styles.statBox}>
                      <Text style={[styles.statVal, { color: colors.text }]}>{v ?? '—'}</Text>
                      <Text style={[styles.muted, { color: colors.textLight, fontSize: 9 }]}>{l}</Text>
                    </View>
                  ))}
                </View>
                <Text style={[styles.cardTitle, { color: colors.text, marginTop: 12 }]}>Earnings</Text>
                {(detail.earnings || []).map((l: any, i: number) => <Line key={i} label={l.label} amount={l.amount} color="#059669" />)}
                <Text style={[styles.cardTitle, { color: colors.text, marginTop: 8 }]}>Deductions</Text>
                {(detail.deductions || []).filter((d: any) => d.amount > 0).map((l: any, i: number) => <Line key={i} label={l.label} amount={l.amount} note={l.note} color="#DC2626" />)}
                {(detail.employerContributions || []).length > 0 && (
                  <>
                    <Text style={[styles.cardTitle, { color: colors.text, marginTop: 8 }]}>Employer Contributions</Text>
                    {detail.employerContributions.map((l: any, i: number) => <Line key={i} label={l.label} amount={l.amount} />)}
                  </>
                )}
                <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: 10 }]} />
                <View style={styles.betweenRow}>
                  <Text style={[styles.bold, { color: colors.text }]}>Gross</Text>
                  <Text style={[styles.bold, { color: colors.text }]}>{fmt(detail.grossEarnings)}</Text>
                </View>
                <View style={styles.betweenRow}>
                  <Text style={[styles.bold, { color: colors.text }]}>Deductions</Text>
                  <Text style={[styles.bold, { color: '#DC2626' }]}>- {fmt(detail.totalDeductions)}</Text>
                </View>
                <View style={styles.betweenRow}>
                  <Text style={{ fontSize: 15, fontWeight: '900', color: colors.text }}>Net Pay</Text>
                  <Text style={{ fontSize: 17, fontWeight: '900', color: '#008A60' }}>{fmt(detail.netPay)}</Text>
                </View>
                <View style={{ marginTop: 12 }}>
                  {detail.downloadable ? (
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#008A60', alignSelf: 'flex-start' }]} onPress={() => { setDetail(null); handleDownload(detail.id, detail.month, detail.year); }}>
                      <Icon name="download" size={14} color="#FFF" />
                      <Text style={styles.actionBtnText}>Download PDF</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={[styles.muted, { color: colors.textLight, fontSize: 11 }]}>PDF download requires an approved payslip request or paid status.</Text>
                  )}
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {toast && <View style={styles.toast}><Text style={styles.toastText}>{toast}</Text></View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pageHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xs, gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: typography.sizes.lg, fontWeight: '900' },
  pageSub: { fontSize: 11, marginTop: 1 },
  tabBar: { flexGrow: 0, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  tabLabel: { fontSize: 11.5, fontWeight: '700' },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl },
  cardBox: { borderWidth: 1, borderRadius: 12 },
  cardTitle: { fontSize: 13, fontWeight: '800', marginBottom: 10 },
  betweenRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  muted: { fontSize: 11.5 },
  bold: { fontWeight: '700' },
  note: { fontSize: 9.5, marginTop: 1 },
  monthChip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  statRow: { flexDirection: 'row', gap: 8 },
  statBox: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 8, paddingVertical: 8 },
  statVal: { fontSize: 15, fontWeight: '900', color: '#FFF' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  actionBtnText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  docIcon: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { borderTopLeftRadius: 18, borderTopRightRadius: 18, borderWidth: 1, padding: 16, maxHeight: '85%' },
  toast: { position: 'absolute', bottom: 100, alignSelf: 'center', backgroundColor: '#1E293B', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  toastText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
});
