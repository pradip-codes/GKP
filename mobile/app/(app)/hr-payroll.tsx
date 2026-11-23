import React, { useState, useEffect, useCallback } from 'react';
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
  Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import apiClient from '../../services/api';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Icon } from '../../components/Icon';
import { useTheme } from '../../contexts/ThemeContext';

// Mobile port of website HRPayroll.jsx — Payroll Management Console
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const inr = (n: any) => `₹${parseFloat(n || 0).toLocaleString('en-IN')}`;
const arr = (x: any): any[] => (Array.isArray(x) ? x : x?.data || x?.rows || []);

const STATUS_TAGS: Record<string, { bg: string; color: string; border: string; label: string }> = {
  PENDING_APPROVAL: { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A', label: 'Pending Approval' },
  APPROVED: { bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0', label: 'Approved' },
  PAID: { bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE', label: 'Disbursed / Paid' },
  REJECTED: { bg: '#FEF2F2', color: '#991B1B', border: '#FECACA', label: 'Declined' },
  DRAFT: { bg: 'rgba(100,116,139,0.08)', color: '#475569', border: 'rgba(100,116,139,0.2)', label: 'Draft' },
};

type TabId = 'records' | 'requests' | 'documents' | 'structure';

export default function HRPayrollScreen() {
  const { colors: tc, isDark } = useTheme() as any;
  const cardBg = isDark ? '#12121a' : '#ffffff';
  const bgSecondary = isDark ? '#181824' : '#f8faff';
  const border = isDark ? '#222234' : colors.border;
  const textPrimary = isDark ? '#f4f4f8' : '#111827';
  const textMuted = isDark ? '#9ca3af' : '#6b7280';

  const now = new Date();
  const [tab, setTab] = useState<TabId>('records');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [records, setRecords] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const [genResult, setGenResult] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Documents form
  const [docForm, setDocForm] = useState({ employee_id: '', document_type: 'SALARY_SLIP', title: '', period: '', issue_date: '' });
  const [docFile, setDocFile] = useState<any>(null);
  const [showDocForm, setShowDocForm] = useState(false);

  // Structure form
  const [structEmp, setStructEmp] = useState('');
  const [structForm, setStructForm] = useState({ basic: '', da: '', hra: '', special_allowance: '' });

  const showMsg = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

  const fetchAll = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const [recRes, reqRes, docRes, empRes] = await Promise.allSettled([
        apiClient.get('/hr/payroll/records', { params: { year, month } }),
        apiClient.get('/hr/payroll/payslip-requests', { params: { status: 'PENDING' } }),
        apiClient.get('/hr/payroll/documents'),
        apiClient.get('/hr/payroll/employees'),
      ]);
      if (recRes.status === 'fulfilled') setRecords(arr(recRes.value.data?.data));
      if (reqRes.status === 'fulfilled') setRequests(arr(reqRes.value.data?.data));
      if (docRes.status === 'fulfilled') setDocuments(arr(docRes.value.data?.data));
      if (empRes.status === 'fulfilled') setEmployees(arr(empRes.value.data?.data));
    } catch (e) {
      console.error('HR payroll fetch error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [year, month]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleGenerate = async () => {
    try {
      setActionLoading('generate');
      const res = await apiClient.post('/hr/payroll/generate', { year, month });
      setGenResult(res.data?.data || res.data);
      showMsg(res.data?.message || 'Payroll generated');
      fetchAll(true);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to generate payroll');
    } finally { setActionLoading(null); }
  };

  const handleRecordAction = async (id: string, action: 'approve' | 'reject' | 'mark-paid') => {
    try {
      setActionLoading(id + action);
      const payload = action === 'reject' ? { reason: 'Rejected by HR' } : {};
      await apiClient.post(`/hr/payroll/records/${id}/${action}`, payload);
      showMsg(`Record ${action}d`);
      fetchAll(true);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || `Failed to ${action} record`);
    } finally { setActionLoading(null); }
  };

  const handleBulkApprove = async () => {
    try {
      setActionLoading('bulk');
      await apiClient.post('/hr/payroll/records/bulk-approve', { year, month });
      showMsg('Pending records approved');
      fetchAll(true);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Bulk approve failed');
    } finally { setActionLoading(null); }
  };

  const handleRequestAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      setActionLoading('req' + id + action);
      const payload = action === 'reject' ? { reason: 'Rejected by HR' } : {};
      await apiClient.post(`/hr/payroll/payslip-requests/${id}/${action}`, payload);
      showMsg(`Request ${action}d`);
      fetchAll(true);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || `Failed to ${action} request`);
    } finally { setActionLoading(null); }
  };

  const pickDocFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
    if (!res.canceled && res.assets?.[0]) setDocFile(res.assets[0]);
  };

  const handleUploadDoc = async () => {
    if (!docForm.employee_id || !docForm.title || !docFile) {
      Alert.alert('Validation', 'Employee, title and file are required');
      return;
    }
    try {
      setActionLoading('upload');
      const fd = new FormData();
      fd.append('employee_id', docForm.employee_id);
      fd.append('document_type', docForm.document_type);
      fd.append('title', docForm.title);
      if (docForm.period) fd.append('period', docForm.period);
      if (docForm.issue_date) fd.append('issue_date', docForm.issue_date);
      fd.append('file', { uri: docFile.uri, name: docFile.name, type: docFile.mimeType || 'application/pdf' } as any);
      await apiClient.post('/hr/payroll/documents', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      showMsg('Document uploaded');
      setShowDocForm(false);
      setDocFile(null);
      setDocForm({ employee_id: '', document_type: 'SALARY_SLIP', title: '', period: '', issue_date: '' });
      fetchAll(true);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Upload failed');
    } finally { setActionLoading(null); }
  };

  const handleDeleteDoc = async (id: string) => {
    Alert.alert('Delete Document', 'Remove this document?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await apiClient.delete(`/hr/payroll/documents/${id}`); showMsg('Deleted'); fetchAll(true); }
        catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Delete failed'); }
      }},
    ]);
  };

  const handleSaveStructure = async () => {
    if (!structEmp || !structForm.basic) { Alert.alert('Validation', 'Select employee and enter Basic Salary'); return; }
    try {
      setActionLoading('struct');
      await apiClient.put(`/hr/payroll/salary-structure/${structEmp}`, structForm);
      showMsg('Salary structure saved');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to save structure');
    } finally { setActionLoading(null); }
  };

  const TABS: { id: TabId; label: string }[] = [
    { id: 'records', label: 'Payroll Records' },
    { id: 'requests', label: `Payslip Requests${requests.length ? ` (${requests.length})` : ''}` },
    { id: 'documents', label: 'Documents & Certificates' },
    { id: 'structure', label: 'Salary Structure' },
  ];

  const empName = (id: string) => employees.find((e) => String(e.id) === String(id))?.full_name || '';

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: textMuted, marginTop: 10 }}>Loading payroll…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: isDark ? '#08080c' : colors.bg }}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: 120, gap: 14 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchAll(true)} colors={[colors.primary]} />}
    >
      {/* Top panel — "Payroll Management Console" */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
        <Text style={{ fontSize: 11, fontWeight: '600', color: textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Payroll Management Console</Text>
        <Text style={{ fontSize: 18, fontWeight: '600', color: textPrimary, marginTop: 2 }}>Monthly Payroll & Compensation</Text>
        <Text style={{ fontSize: 12, color: textMuted, marginTop: 2 }}>Compute monthly wages, disburse payslips, and manage statutory salary structures</Text>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <View style={[styles.picker, { borderColor: border, backgroundColor: bgSecondary }]}>
            <Text style={{ fontSize: 12, color: textMuted, marginRight: 6 }}>Month</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {MONTHS.map((m, i) => (
                <TouchableOpacity key={m} onPress={() => setMonth(i + 1)} style={[styles.chip, month === i + 1 && styles.chipActive]}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: month === i + 1 ? '#fff' : textMuted }}>{m.slice(0, 3)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            {[now.getFullYear(), now.getFullYear() - 1].map((y) => (
              <TouchableOpacity key={y} onPress={() => setYear(y)} style={[styles.yearChip, { borderColor: border, backgroundColor: bgSecondary }, year === y && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: year === y ? '#fff' : textMuted }}>{y}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.generateBtn} onPress={handleGenerate} disabled={actionLoading === 'generate'}>
            {actionLoading === 'generate' ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="refresh" size={13} color="#fff" />}
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', marginLeft: 5 }}>{actionLoading === 'generate' ? 'Computing…' : 'Generate Payroll'}</Text>
          </TouchableOpacity>
          {tab === 'records' && records.some((r) => r.status === 'PENDING_APPROVAL') && (
            <TouchableOpacity style={styles.bulkBtn} onPress={handleBulkApprove} disabled={actionLoading === 'bulk'}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#065F46' }}>Approve Pending</Text>
            </TouchableOpacity>
          )}
        </View>

        {!!msg && <Text style={{ marginTop: 10, fontSize: 12, color: colors.primary }}>{msg}</Text>}
        {!!genResult && (
          <Text style={{ marginTop: 4, fontSize: 11, color: textMuted, fontFamily: 'monospace' }}>
            Processed: {genResult.generated}/{genResult.total} · Failed: {genResult.failed}
            {genResult.errors?.length > 0 ? ` · ${genResult.errors[0].error}` : ''}
          </Text>
        )}
      </View>

      {/* Tabs — underline style like website */}
      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: border, gap: 18 }}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.id} onPress={() => setTab(t.id)} style={{ paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: tab === t.id ? colors.primary : 'transparent', marginBottom: -1 }}>
            <Text style={{ fontSize: 13, fontWeight: tab === t.id ? '600' : '500', color: tab === t.id ? colors.primary : textMuted }}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── RECORDS ── */}
      {tab === 'records' && (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          {records.length === 0 ? (
            <Text style={{ color: textMuted, textAlign: 'center', paddingVertical: 30, fontSize: 13 }}>
              No payroll records found for {MONTHS[month - 1]} {year}. Click "Generate Payroll" to compute records.
            </Text>
          ) : records.map((r) => {
            const sc = STATUS_TAGS[r.status] || STATUS_TAGS.DRAFT;
            return (
              <View key={r.id} style={[styles.recordRow, { borderColor: border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: textPrimary }}>{r.full_name}</Text>
                  <Text style={{ fontSize: 11, color: textMuted, fontFamily: 'monospace' }}>{r.emp_code} • {r.designation}</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                    <Text style={{ fontSize: 11, color: textMuted }}>Gross {inr(r.gross_earnings)}</Text>
                    <Text style={{ fontSize: 11, color: '#991B1B' }}>Ded {inr(r.total_deductions)}</Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>{inr(r.net_pay)}</Text>
                  </View>
                  <Text style={{ fontSize: 10, color: textMuted, marginTop: 2 }}>{r.lop_days || 0} LOP · {r.late_count || 0} late marks</Text>
                  {r.status === 'REJECTED' && !!r.rejection_reason && (
                    <Text style={{ fontSize: 10, color: '#991B1B', marginTop: 2 }}>Reason: {r.rejection_reason}</Text>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <View style={{ backgroundColor: sc.bg, borderWidth: 1, borderColor: sc.border, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: sc.color }}>{sc.label}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {['PENDING_APPROVAL', 'DRAFT', 'REJECTED'].includes(r.status) && (
                      <TouchableOpacity style={styles.miniBtn} onPress={() => handleRecordAction(r.id, 'approve')} disabled={!!actionLoading}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#065F46' }}>Approve</Text>
                      </TouchableOpacity>
                    )}
                    {r.status === 'APPROVED' && (
                      <TouchableOpacity style={[styles.miniBtn, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]} onPress={() => handleRecordAction(r.id, 'mark-paid')} disabled={!!actionLoading}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#1E40AF' }}>Mark Paid</Text>
                      </TouchableOpacity>
                    )}
                    {!['PAID', 'REJECTED'].includes(r.status) && (
                      <TouchableOpacity style={[styles.miniBtn, { borderColor: '#FECACA' }]} onPress={() => handleRecordAction(r.id, 'reject')} disabled={!!actionLoading}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#991B1B' }}>Decline</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* ── REQUESTS ── */}
      {tab === 'requests' && (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          {requests.length === 0 ? (
            <Text style={{ color: textMuted, textAlign: 'center', paddingVertical: 30, fontSize: 13 }}>No pending payslip requests from employees.</Text>
          ) : requests.map((r) => (
            <View key={r.id} style={[styles.recordRow, { borderColor: border }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: textPrimary }}>{r.full_name}</Text>
                <Text style={{ fontSize: 11, color: textMuted }}>{r.emp_code} • {MONTHS[(r.month || 1) - 1]} {r.year}</Text>
                <Text style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>
                  Net: <Text style={{ color: colors.primary, fontWeight: '600' }}>{inr(r.net_pay)}</Text>
                  {r.created_at ? ` • Requested ${new Date(r.created_at).toLocaleDateString('en-IN')}` : ''}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity style={[styles.miniBtn, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]} onPress={() => handleRequestAction(r.id, 'approve')} disabled={!!actionLoading}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#065F46' }}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.miniBtn, { borderColor: '#FECACA' }]} onPress={() => handleRequestAction(r.id, 'reject')} disabled={!!actionLoading}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#991B1B' }}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── DOCUMENTS ── */}
      {tab === 'documents' && (
        <View style={{ gap: 12 }}>
          <TouchableOpacity style={[styles.card, { backgroundColor: cardBg, borderColor: border, borderStyle: 'dashed', alignItems: 'center', paddingVertical: 18 }]} onPress={() => setShowDocForm(true)}>
            <Icon name="cloud-upload" size={22} color={colors.primary} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary, marginTop: 6 }}>Upload Document</Text>
            <Text style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>Salary letters, experience letters, tax proofs</Text>
          </TouchableOpacity>

          {documents.length === 0 ? (
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
              <Text style={{ color: textMuted, textAlign: 'center', paddingVertical: 24, fontSize: 13 }}>No documents uploaded yet.</Text>
            </View>
          ) : documents.map((d) => (
            <View key={d.id} style={[styles.card, { backgroundColor: cardBg, borderColor: border, flexDirection: 'row', alignItems: 'center' }]}>
              <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                <Icon name="document-text" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: textPrimary }} numberOfLines={1}>{d.title || d.document_type}</Text>
                <Text style={{ fontSize: 11, color: textMuted }} numberOfLines={1}>
                  {[empName(d.employee_id), d.document_type, d.period, d.issue_date ? `Issued ${d.issue_date}` : ''].filter(Boolean).join(' • ')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleDeleteDoc(d.id)} style={{ padding: 8 }}>
                <Icon name="trash" size={16} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* ── STRUCTURE ── */}
      {tab === 'structure' && (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Configuration</Text>
          <Text style={{ fontSize: 15, fontWeight: '600', color: textPrimary, marginBottom: 4 }}>Salary Structure & Breakdown</Text>
          <Text style={{ fontSize: 12, color: textMuted, lineHeight: 18, marginBottom: 14 }}>
            Default structure assigns candidate's offered salary as Basic. EPF: 12% of (Basic + DA) up to ₹15,000 ceiling. ESI: 0.75% gross up to ₹21,000.
          </Text>
          <Text style={styles.fieldLabel}>Employee *</Text>
          <View style={[styles.input, { borderColor: border, backgroundColor: bgSecondary }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {employees.map((e) => (
                <TouchableOpacity key={e.id} onPress={() => setStructEmp(String(e.id))} style={[styles.chip, String(structEmp) === String(e.id) && styles.chipActive]}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: String(structEmp) === String(e.id) ? '#fff' : textMuted }} numberOfLines={1}>
                    {e.full_name} ({e.emp_code})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
            {([['basic', 'Basic Salary (Monthly) *'], ['da', 'Dearness Allowance (DA)'], ['hra', 'House Rent Allowance (HRA)'], ['special_allowance', 'Special Allowance']] as const).map(([key, label]) => (
              <View key={key} style={{ width: '48%' }}>
                <Text style={styles.fieldLabel}>{label}</Text>
                <TextInput
                  style={[styles.input, { borderColor: border, backgroundColor: bgSecondary, paddingVertical: 9 }]}
                  keyboardType="numeric"
                  value={structForm[key]}
                  onChangeText={(v) => setStructForm({ ...structForm, [key]: v })}
                  placeholder="0"
                  placeholderTextColor={textMuted}
                />
              </View>
            ))}
          </View>
          <TouchableOpacity style={[styles.generateBtn, { alignSelf: 'flex-start', marginTop: 14 }]} onPress={handleSaveStructure} disabled={actionLoading === 'struct'}>
            {actionLoading === 'struct' ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Update Salary Structure</Text>}
          </TouchableOpacity>
        </View>
      )}

      {/* Document upload modal */}
      <Modal visible={showDocForm} transparent animationType="slide" onRequestClose={() => setShowDocForm(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: cardBg }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: textPrimary }}>Upload Document</Text>
              <TouchableOpacity onPress={() => setShowDocForm(false)}><Icon name="x" size={20} color={textMuted} /></TouchableOpacity>
            </View>
            <Text style={styles.fieldLabel}>Employee *</Text>
            <View style={[styles.input, { borderColor: border, backgroundColor: bgSecondary, maxHeight: 120 }]}>
              <ScrollView nestedScrollEnabled>
                {employees.map((e) => (
                  <TouchableOpacity key={e.id} onPress={() => setDocForm({ ...docForm, employee_id: String(e.id) })} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: border }}>
                    <Text style={{ fontSize: 13, fontWeight: docForm.employee_id === String(e.id) ? '700' : '500', color: docForm.employee_id === String(e.id) ? colors.primary : textPrimary }}>
                      {e.full_name} ({e.emp_code})
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <Text style={styles.fieldLabel}>Document Type *</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {['SALARY_SLIP', 'EXPERIENCE_LETTER', 'RELIEVING_LETTER', 'TAX_PROOF', 'ADDRESS_PROOF', 'OTHER'].map((t) => (
                <TouchableOpacity key={t} onPress={() => setDocForm({ ...docForm, document_type: t })} style={[styles.chip, { borderWidth: 1, borderColor: border }, docForm.document_type === t && styles.chipActive]}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: docForm.document_type === t ? '#fff' : textMuted }}>{t.replace(/_/g, ' ')}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.fieldLabel}>Document Title *</Text>
            <TextInput style={[styles.input, { borderColor: border, backgroundColor: bgSecondary }]} value={docForm.title} onChangeText={(v) => setDocForm({ ...docForm, title: v })} placeholder="e.g. Salary Letter Jan 2026" placeholderTextColor={textMuted} />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Period</Text>
                <TextInput style={[styles.input, { borderColor: border, backgroundColor: bgSecondary }]} value={docForm.period} onChangeText={(v) => setDocForm({ ...docForm, period: v })} placeholder="2026-01" placeholderTextColor={textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Date of Issuance</Text>
                <TextInput style={[styles.input, { borderColor: border, backgroundColor: bgSecondary }]} value={docForm.issue_date} onChangeText={(v) => setDocForm({ ...docForm, issue_date: v })} placeholder="YYYY-MM-DD" placeholderTextColor={textMuted} />
              </View>
            </View>
            <Text style={styles.fieldLabel}>File Attachment (PDF / Images)</Text>
            <TouchableOpacity style={[styles.input, { borderColor: border, backgroundColor: bgSecondary, flexDirection: 'row', alignItems: 'center' }]} onPress={pickDocFile}>
              <Icon name="attach" size={16} color={textMuted} />
              <Text style={{ fontSize: 12, color: textMuted, marginLeft: 8, flex: 1 }} numberOfLines={1}>{docFile?.name || 'Choose file'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.generateBtn, { marginTop: 16, justifyContent: 'center' }]} onPress={handleUploadDoc} disabled={actionLoading === 'upload'}>
              {actionLoading === 'upload' ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Upload Document</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  card: { borderRadius: 16, padding: 16, borderWidth: 1 },
  picker: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center' },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginRight: 6 },
  chipActive: { backgroundColor: colors.primary },
  yearChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  generateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
  bulkBtn: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, borderWidth: 1, borderColor: '#A7F3D0', backgroundColor: '#ECFDF5' },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 6, marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: colors.text },
  recordRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  miniBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: colors.border, backgroundColor: 'transparent' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '88%' },
});
