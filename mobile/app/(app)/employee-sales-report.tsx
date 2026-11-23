import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, Modal, Image, Alert,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Icon } from '../../components/Icon';
import { spacing } from '../../theme/spacing';
import apiClient from '../../services/api';
import * as ImagePicker from 'expo-image-picker';

const ACCENT = '#0F766E';

const statusBadge = (status?: string, isDark?: boolean) => {
  const s = String(status || 'Submitted');
  const map: Record<string, { bg: string; color: string; label: string }> = {
    Submitted: { bg: '#FEF3C7', color: '#92400E', label: 'Submitted' },
    Reviewed: { bg: '#D1FAE5', color: '#065F46', label: 'Reviewed ✓' },
    Rejected: { bg: '#FEE2E2', color: '#991B1B', label: 'Rejected' },
  };
  const m = map[s] || map.Submitted;
  return (
    <View style={{ backgroundColor: m.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' }}>
      <Text style={{ fontSize: 11, fontWeight: '900', color: m.color }}>{m.label}</Text>
    </View>
  );
};

export default function EmployeeSalesReportScreen() {
  const { colors, isDark } = useTheme();
  const cardBg = isDark ? '#1E293B' : '#FFFFFF';
  const bgSecondary = isDark ? '#0F172A' : '#F8FAFC';
  const borderCol = colors.border;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'my' | 'team'>('my');
  const [reportsData, setReportsData] = useState<any>(null);
  const [banksList, setBanksList] = useState<any[]>([]);

  // Filters (team tab)
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [remark, setRemark] = useState('');
  const [photo, setPhoto] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [bankRows, setBankRows] = useState([{ bank_id: '', bank_name: '', cards_sold: '' }]);

  // Review modal
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [reviewStatus, setReviewStatus] = useState('Reviewed');
  const [reviewRemark, setReviewRemark] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const fetchReports = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const params: any = {};
      if (filterStatus) params.status = filterStatus;
      if (filterStartDate) params.start_date = filterStartDate;
      if (filterEndDate) params.end_date = filterEndDate;
      const res = await apiClient.get('/employee/sales-reports', { params });
      if (res.data?.success) setReportsData(res.data);
    } catch (err) {
      console.warn('Sales reports fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterStatus, filterStartDate, filterEndDate]);

  useEffect(() => {
    (async () => {
      try {
        const banksRes = await apiClient.get('/public/banks').catch(() => null);
        if (banksRes?.data?.success) setBanksList(banksRes.data.data || []);
      } catch {}
      fetchReports();
    })();
  }, []);

  useEffect(() => { if (!loading) fetchReports(); }, [filterStatus, filterStartDate, filterEndDate]); // eslint-disable-line

  const stats = reportsData?.stats || {};
  const myReports = reportsData?.my_reports || [];
  const teamReports = reportsData?.team_reports || [];
  const hasDownline = !!stats.has_downline;

  const filteredTeamReports = teamReports.filter((r: any) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (!String(r.employee_name || '').toLowerCase().includes(q) && !String(r.emp_code || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleBankRowChange = (index: number, field: string, value: string) => {
    const updated = [...bankRows];
    (updated[index] as any)[field] = value;
    if (field === 'bank_id') {
      const b = banksList.find((x: any) => String(x.id) === value);
      if (b) updated[index].bank_name = b.name;
    }
    setBankRows(updated);
  };

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    setPhoto({ uri: a.uri, name: a.fileName || 'proof.jpg', type: a.mimeType || 'image/jpeg' });
  };

  const handleSubmitReport = async () => {
    const validBanks = bankRows.filter((b) => b.bank_id && b.cards_sold && Number(b.cards_sold) > 0)
      .map((b) => ({ bank_id: b.bank_id, bank_name: b.bank_name, cards_sold: Number(b.cards_sold) }));
    if (validBanks.length === 0) {
      Alert.alert('Required', 'Add at least one bank with cards sold.');
      return;
    }
    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('report_date', reportDate);
      formData.append('remark', remark);
      formData.append('banks', JSON.stringify(validBanks));
      if (photo) {
        formData.append('photo', { uri: photo.uri, type: photo.type, name: photo.name } as any);
      }
      await apiClient.post('/employee/sales-reports', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      Alert.alert('Success', 'Sales report submitted successfully!');
      setShowCreateModal(false);
      setReportDate(new Date().toISOString().split('T')[0]);
      setRemark('');
      setPhoto(null);
      setBankRows([{ bank_id: '', bank_name: '', cards_sold: '' }]);
      fetchReports();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to submit sales report');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!selectedReport) return;
    try {
      setReviewing(true);
      await apiClient.put(`/employee/sales-reports/${selectedReport.id}/review`, {
        status: reviewStatus,
        remark: reviewRemark,
      });
      Alert.alert('Success', 'Report review updated.');
      setSelectedReport(null);
      setReviewRemark('');
      fetchReports();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to submit review');
    } finally {
      setReviewing(false);
    }
  };

  const BankChips = ({ banks }: { banks: any[] }) => (
    <View style={[styles.bankBox, { backgroundColor: bgSecondary, borderColor: borderCol }]}>
      <Text style={[styles.bankBoxLabel, { color: colors.textMid }]}>BANK BREAKDOWN</Text>
      <View style={styles.chipWrap}>
        {(banks || []).map((b: any, i: number) => (
          <View key={i} style={[styles.bankChip, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }}>{b.bank_name}: <Text style={{ color: ACCENT }}>{b.cards_sold} Cards</Text></Text>
          </View>
        ))}
      </View>
    </View>
  );

  const ReportCard = ({ report, isTeam }: { report: any; isTeam?: boolean }) => (
    <View style={[styles.reportCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          {isTeam ? (
            <>
              <Text style={{ fontSize: 15, fontWeight: '900', color: colors.text }}>{report.employee_name}</Text>
              <Text style={{ fontSize: 12, color: ACCENT, fontWeight: '800', marginTop: 2 }}>ID: {report.emp_code} | {report.employee_designation || 'TC'}</Text>
            </>
          ) : (
            <Text style={{ fontSize: 12, color: colors.textMid, display: 'flex' }}>
              {report.report_date ? new Date(report.report_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
            </Text>
          )}
          <Text style={{ fontSize: isTeam ? 13 : 17, fontWeight: '900', color: colors.text, marginTop: 4 }}>
            Total Sold: <Text style={{ color: ACCENT }}>{report.total_cards} Cards</Text>
          </Text>
          {!isTeam && report.report_date && (
            <Text style={{ fontSize: 11, color: colors.textMid, marginTop: 2 }}>
              {new Date(report.report_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </Text>
          )}
          {isTeam && (
            <Text style={{ fontSize: 12.5, fontWeight: '800', color: colors.textMid, marginTop: 2 }}>
              Report Date: {report.report_date ? new Date(report.report_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'N/A'}
            </Text>
          )}
        </View>
        {statusBadge(report.status, isDark)}
      </View>

      <BankChips banks={report.banks || []} />

      {!!report.remark && (
        <Text style={{ fontSize: 12.5, color: colors.textMid, fontStyle: 'italic', backgroundColor: `${ACCENT}10`, padding: 10, borderRadius: 10 }}>
          "{report.remark}"
        </Text>
      )}

      {!!report.photo_url && (
        <TouchableOpacity onPress={() => Alert.alert('Photo Proof', report.photo_url)}>
          <Text style={{ fontSize: 12, color: ACCENT, fontWeight: '800' }}>📷 View Uploaded Photo Proof ↗</Text>
        </TouchableOpacity>
      )}

      {!!report.review_remark && (
        <View style={{ backgroundColor: report.status === 'Rejected' ? '#FEE2E2' : '#D1FAE5', padding: 10, borderRadius: 10 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: report.status === 'Rejected' ? '#991B1B' : ACCENT }}>
            Reviewer Remark ({report.reviewed_by_name || 'Supervisor'}): "{report.review_remark}"
          </Text>
        </View>
      )}

      {isTeam && (
        <TouchableOpacity
          style={[styles.reviewBtn, { backgroundColor: bgSecondary, borderColor: borderCol }]}
          onPress={() => { setSelectedReport(report); setReviewStatus(report.status === 'Submitted' ? 'Reviewed' : report.status); setReviewRemark(report.review_remark || ''); }}
        >
          <Icon name="user-check" size={14} color={ACCENT} />
          <Text style={{ fontSize: 12.5, fontWeight: '800', color: colors.text }}>Review & Add Remark</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const kpi = (label: string, value: any, color: string, sub: string) => (
    <View style={[styles.kpi, { backgroundColor: cardBg, borderColor: borderCol }]}>
      <Text style={[styles.kpiLabel, { color: colors.textMid }]}>{label}</Text>
      <Text style={{ fontSize: 24, fontWeight: '900', color }}>{value ?? 0}</Text>
      <Text style={{ fontSize: 11, color, fontWeight: '700', marginTop: 3 }}>{sub}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchReports(true)} tintColor={ACCENT} />}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: ACCENT, textTransform: 'uppercase', letterSpacing: 0.5 }}>Employee Portal</Text>
            <Text style={{ fontSize: 22, fontWeight: '900', color: colors.text }}>📊 Sales Reports Portal</Text>
            <Text style={{ fontSize: 12.5, color: colors.textMid, marginTop: 2 }}>Submit daily bank-wise credit card sales, upload proof, and track team progress</Text>
          </View>
          <TouchableOpacity style={[styles.createBtn, { backgroundColor: ACCENT }]} onPress={() => setShowCreateModal(true)}>
            <Icon name="add" size={14} color="#fff" />
            <Text style={styles.createBtnText}>Create</Text>
          </TouchableOpacity>
        </View>

        {/* KPI cards */}
        <View style={styles.kpiGrid}>
          {kpi('MY TOTAL REPORTS', stats.my_total_reports, colors.text, 'Lifetime Submissions')}
          {kpi('MY CARDS SOLD', stats.my_total_cards, '#10B981', 'Total Approved Cards')}
          {kpi("THIS MONTH'S CARDS", stats.my_this_month_cards, '#3B82F6', 'Current Month Progress')}
          {hasDownline && kpi('TEAM CARDS SOLD', stats.team_total_cards, ACCENT, 'From Assigned Downline')}
        </View>

        {/* Tabs */}
        <View style={[styles.tabBar, { borderBottomColor: borderCol }]}>
          <TouchableOpacity onPress={() => setActiveTab('my')} style={[styles.tabItem, { borderBottomColor: activeTab === 'my' ? ACCENT : 'transparent' }]}>
            <Icon name="document-text" size={14} color={activeTab === 'my' ? ACCENT : colors.textMid} />
            <Text style={{ fontSize: 13.5, fontWeight: '900', color: activeTab === 'my' ? ACCENT : colors.textMid }}>My Sales Reports ({myReports.length})</Text>
          </TouchableOpacity>
          {hasDownline && (
            <TouchableOpacity onPress={() => setActiveTab('team')} style={[styles.tabItem, { borderBottomColor: activeTab === 'team' ? ACCENT : 'transparent' }]}>
              <Icon name="user-check" size={14} color={activeTab === 'team' ? ACCENT : colors.textMid} />
              <Text style={{ fontSize: 13.5, fontWeight: '900', color: activeTab === 'team' ? ACCENT : colors.textMid }}>Team Sales Reports ({teamReports.length})</Text>
            </TouchableOpacity>
          )}
        </View>

        {activeTab === 'my' ? (
          loading ? <ActivityIndicator size="large" color={ACCENT} style={{ marginVertical: 50 }} /> :
          myReports.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <Icon name="document-text" size={44} color={colors.textLight} />
              <Text style={{ fontSize: 17, fontWeight: '900', color: colors.text, marginTop: 12 }}>No Sales Reports Submitted Yet</Text>
              <Text style={{ fontSize: 13, color: colors.textMid, marginTop: 6, textAlign: 'center' }}>Click below to submit your daily bank-wise credit card sales report.</Text>
              <TouchableOpacity style={[styles.createBtn, { backgroundColor: ACCENT, marginTop: 16, paddingHorizontal: 22 }]} onPress={() => setShowCreateModal(true)}>
                <Icon name="add" size={14} color="#fff" />
                <Text style={styles.createBtnText}>Submit First Sales Report</Text>
              </TouchableOpacity>
            </View>
          ) : (
            myReports.map((r: any) => <ReportCard key={r.id} report={r} />)
          )
        ) : (
          <>
            {/* Team filters */}
            <View style={[styles.filterCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <View style={[styles.searchBox, { backgroundColor: bgSecondary, borderColor: borderCol }]}>
                <Icon name="search" size={14} color={colors.textMid} />
                <TextInput style={{ flex: 1, fontSize: 13, color: colors.text, paddingVertical: 8 }} placeholder="Search employee name or code..." placeholderTextColor={colors.textLight} value={searchTerm} onChangeText={setSearchTerm} />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {['', 'Submitted', 'Reviewed', 'Rejected'].map((s) => (
                  <TouchableOpacity key={s} style={[styles.filterChip, { borderColor: filterStatus === s ? ACCENT : borderCol, backgroundColor: filterStatus === s ? `${ACCENT}15` : 'transparent' }]} onPress={() => setFilterStatus(s)}>
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: filterStatus === s ? ACCENT : colors.textMid }}>{s || 'All Statuses'}</Text>
                  </TouchableOpacity>
                ))}
                <TextInput style={[styles.dateInput, { borderColor: borderCol, color: colors.text }]} placeholder="From" placeholderTextColor={colors.textLight} value={filterStartDate} onChangeText={setFilterStartDate} />
                <TextInput style={[styles.dateInput, { borderColor: borderCol, color: colors.text }]} placeholder="To" placeholderTextColor={colors.textLight} value={filterEndDate} onChangeText={setFilterEndDate} />
              </ScrollView>
            </View>

            {filteredTeamReports.length === 0 ? (
              <Text style={{ textAlign: 'center', color: colors.textMid, paddingVertical: 40, fontSize: 13 }}>No team sales reports found matching your criteria.</Text>
            ) : (
              filteredTeamReports.map((r: any) => <ReportCard key={r.id} report={r} isTeam />)
            )}
          </>
        )}
      </ScrollView>

      {/* Create report modal */}
      <Modal visible={showCreateModal} transparent animationType="slide" onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: colors.text }}>Create Daily Sales Report</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}><Icon name="close" size={18} color={colors.textMid} /></TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 420 }}>
              <Text style={[styles.fieldLabel, { color: colors.textMid }]}>REPORT DATE</Text>
              <TextInput style={[styles.input, { backgroundColor: bgSecondary, borderColor: borderCol, color: colors.text }]} value={reportDate} onChangeText={setReportDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textLight} />

              <Text style={[styles.fieldLabel, { color: colors.textMid, marginTop: 12 }]}>BANK-WISE CARD SALES</Text>
              {bankRows.map((row, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <View style={{ flex: 1.4 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {banksList.map((b: any) => (
                          <TouchableOpacity key={b.id} style={[styles.bankOpt, { borderColor: row.bank_id === String(b.id) ? ACCENT : borderCol, backgroundColor: row.bank_id === String(b.id) ? `${ACCENT}15` : bgSecondary }]} onPress={() => handleBankRowChange(i, 'bank_id', String(b.id))}>
                            <Text style={{ fontSize: 10.5, fontWeight: '700', color: row.bank_id === String(b.id) ? ACCENT : colors.textMid }}>{b.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                  <TextInput style={[styles.input, { flex: 0.8, marginBottom: 0, backgroundColor: bgSecondary, borderColor: borderCol, color: colors.text }]} placeholder="Cards" placeholderTextColor={colors.textLight} keyboardType="number-pad" value={row.cards_sold} onChangeText={(t) => handleBankRowChange(i, 'cards_sold', t)} />
                  {bankRows.length > 1 && (
                    <TouchableOpacity onPress={() => setBankRows(bankRows.filter((_, j) => j !== i))}><Icon name="trash" size={16} color="#EF4444" /></TouchableOpacity>
                  )}
                </View>
              ))}
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, marginBottom: 12 }} onPress={() => setBankRows([...bankRows, { bank_id: '', bank_name: '', cards_sold: '' }])}>
                <Icon name="add" size={14} color={ACCENT} />
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: ACCENT }}>Add Bank Row</Text>
              </TouchableOpacity>

              <Text style={[styles.fieldLabel, { color: colors.textMid }]}>PHOTO PROOF (Optional)</Text>
              <TouchableOpacity style={[styles.photoBox, { borderColor: borderCol, backgroundColor: bgSecondary }]} onPress={pickPhoto}>
                {photo ? (
                  <Image source={{ uri: photo.uri }} style={styles.photoImg} resizeMode="cover" />
                ) : (
                  <View style={{ alignItems: 'center', paddingVertical: 18 }}>
                    <Icon name="camera" size={22} color={colors.textLight} />
                    <Text style={{ fontSize: 12, color: colors.textMid, marginTop: 6 }}>Tap to upload proof photo</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={[styles.fieldLabel, { color: colors.textMid, marginTop: 12 }]}>REMARK (Optional)</Text>
              <TextInput style={[styles.input, styles.textArea, { backgroundColor: bgSecondary, borderColor: borderCol, color: colors.text }]} placeholder="Any remarks..." placeholderTextColor={colors.textLight} multiline value={remark} onChangeText={setRemark} />
            </ScrollView>
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: ACCENT, opacity: submitting ? 0.6 : 1 }]} onPress={handleSubmitReport} disabled={submitting}>
              {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontSize: 14, fontWeight: '900' }}>Submit Sales Report</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Review modal */}
      <Modal visible={!!selectedReport} transparent animationType="slide" onRequestClose={() => setSelectedReport(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <Text style={{ fontSize: 17, fontWeight: '900', color: colors.text, marginBottom: 14 }}>Review Sales Report</Text>
            {selectedReport && (
              <>
                <Text style={{ fontSize: 13, color: colors.textMid, marginBottom: 10 }}>
                  {selectedReport.employee_name} • {new Date(selectedReport.report_date).toLocaleDateString('en-IN')} • {selectedReport.total_cards} Cards
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  {['Submitted', 'Reviewed', 'Rejected'].map((s) => (
                    <TouchableOpacity key={s} style={[styles.filterChip, { borderColor: reviewStatus === s ? ACCENT : borderCol, backgroundColor: reviewStatus === s ? `${ACCENT}15` : 'transparent' }]} onPress={() => setReviewStatus(s)}>
                      <Text style={{ fontSize: 11.5, fontWeight: '700', color: reviewStatus === s ? ACCENT : colors.textMid }}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput style={[styles.input, styles.textArea, { backgroundColor: bgSecondary, borderColor: borderCol, color: colors.text }]} placeholder="Reviewer remark..." placeholderTextColor={colors.textLight} multiline value={reviewRemark} onChangeText={setReviewRemark} />
                <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                  <TouchableOpacity style={[styles.filterChip, { borderColor: borderCol }]} onPress={() => setSelectedReport(null)}>
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.textMid }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.submitBtn, { backgroundColor: ACCENT, paddingHorizontal: 24, opacity: reviewing ? 0.6 : 1 }]} onPress={handleReviewSubmit} disabled={reviewing}>
                    {reviewing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900' }}>Submit Review</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, paddingBottom: spacing.xxl },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 18 },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12 },
  createBtnText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  kpi: { flexBasis: '47%', flexGrow: 1, borderRadius: 16, borderWidth: 1, padding: 14 },
  kpiLabel: { fontSize: 10.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },
  tabBar: { flexDirection: 'row', gap: 12, borderBottomWidth: 2, marginBottom: 18 },
  tabItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 12, borderBottomWidth: 3 },
  reportCard: { borderRadius: 18, borderWidth: 1, padding: 18, marginBottom: 14, gap: 12 },
  bankBox: { borderRadius: 14, borderWidth: 1, padding: 12 },
  bankBoxLabel: { fontSize: 10.5, fontWeight: '800', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.4 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bankChip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  emptyCard: { borderRadius: 20, borderWidth: 1, paddingVertical: 44, alignItems: 'center' },
  filterCard: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 16, gap: 10 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12 },
  filterChip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  dateInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, fontSize: 12, minWidth: 90 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, maxHeight: '92%' },
  fieldLabel: { fontSize: 10.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 5 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, fontWeight: '600', marginBottom: 10 },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  bankOpt: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  photoBox: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 14, overflow: 'hidden' },
  photoImg: { width: '100%', height: 160 },
  submitBtn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  reviewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 12, paddingVertical: 10 },
});
