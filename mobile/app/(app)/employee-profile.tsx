import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../contexts/ThemeContext';
import { Icon, IconName } from '../../components/Icon';
import { spacing } from '../../theme/spacing';
import apiClient from '../../services/api';
import { resolveMediaUrl } from '../../services/messenger.service';

const ACCENT = '#0F766E';

type TabId = 'overview' | 'personal' | 'joining' | 'kyc' | 'hierarchy' | 'performance' | 'applications' | 'incentives' | 'activity';

const TABS: { id: TabId; label: string; icon: IconName }[] = [
  { id: 'overview', label: 'Overview', icon: 'stats-chart' },
  { id: 'personal', label: 'Personal Details', icon: 'person-circle' },
  { id: 'joining', label: 'Joining & Documents', icon: 'document-text' },
  { id: 'kyc', label: 'KYC & Verification', icon: 'id-card' },
  { id: 'hierarchy', label: 'Team & Hierarchy', icon: 'git-branch' },
  { id: 'performance', label: 'Performance', icon: 'trophy' },
  { id: 'applications', label: 'Applications', icon: 'briefcase' },
  { id: 'incentives', label: 'Incentives', icon: 'cash' },
  { id: 'activity', label: 'Activity Log', icon: 'time' },
];

const kycBadge = (state: string) => {
  switch (state) {
    case 'VERIFIED': return { bg: 'rgba(16,185,129,0.25)', border: '#10B981', color: '#34D399', label: 'KYC Verified' };
    case 'REJECTED': return { bg: 'rgba(239,68,68,0.25)', border: '#EF4444', color: '#FCA5A5', label: 'KYC Rejected (Action Required)' };
    case 'SUBMITTED':
    case 'PENDING': return { bg: 'rgba(59,130,246,0.25)', border: '#3B82F6', color: '#60A5FA', label: 'KYC Submitted (Under Review)' };
    default: return { bg: 'rgba(245,158,11,0.25)', border: '#F59E0B', color: '#FBBF24', label: 'KYC Pending Submission' };
  }
};

const kycChip = (status?: string) => {
  const verified = status === 'VERIFIED';
  return { color: verified ? '#10B981' : '#F59E0B', text: verified ? '✓ Verified' : 'Pending' };
};

export default function EmployeeProfileScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [applications, setApplications] = useState<any[]>([]);

  const fetchProfile = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const res = await apiClient.get('/employee/profile');
      if (res.data?.success && res.data?.data) setProfileData(res.data.data);
    } catch (err) {
      console.error('Failed to fetch employee profile:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // Fetch own applications for the Applications tab
  useEffect(() => {
    if (activeTab !== 'applications') return;
    apiClient.get('/employee/applications', { params: { limit: 50 } })
      .then((res) => {
        const d = res.data?.data;
        setApplications(Array.isArray(d) ? d : (d?.rows || d?.applications || []));
      })
      .catch(() => apiClient.get('/applications/my', { params: { limit: 50 } })
        .then((res) => {
          const d = res.data?.data;
          setApplications(Array.isArray(d) ? d : (d?.rows || d?.applications || []));
        })
        .catch(() => setApplications([])));
  }, [activeTab]);

  const emp = profileData?.employee || {};
  const jDetails = profileData?.joining_details || {};
  const kyc = profileData?.kyc || {};
  const terms = profileData?.terms || {};
  const hierarchy = profileData?.hierarchy || {};
  const incSummary = profileData?.incentives_summary || {};
  const docsList = profileData?.documents || [];

  const fullName = jDetails.full_name || emp.full_name || emp.name || 'Employee Profile';
  const designation = jDetails.designation || emp.designation || 'Telecaller';
  const department = jDetails.department || emp.department || 'Sales & Distribution';
  const empCode = emp.employee_id || emp.emp_code || emp.id || 'EMP-1000';
  const accountStatus = (emp.employee_status || emp.status || emp.activation_status || 'ACTIVE').toUpperCase();
  const hasKycDetails = !!(kyc.pan_number || jDetails.pan_number || kyc.aadhaar_number || jDetails.aadhaar_number || kyc.bank_account_number || jDetails.bank_account_number || kyc.pan_document_url || kyc.aadhaar_document_url || kyc.bank_document_url);
  const kycState = (kyc.kyc_status && kyc.kyc_status !== 'NOT_SUBMITTED') ? kyc.kyc_status : (hasKycDetails ? 'SUBMITTED' : 'NOT_SUBMITTED');
  const badge = kycBadge(kycState);

  const teamSize = hierarchy.team_size ?? emp.team_size ?? 0;
  const totalApps = emp.total_applications ?? emp.applications_count ?? 0;
  const approvedApps = emp.approved_applications ?? emp.approved_count ?? 0;
  const approvalRate = totalApps > 0 ? ((approvedApps / totalApps) * 100).toFixed(1) : '0.0';
  const totalIncentives = incSummary.total_earned ?? emp.total_incentives ?? 0;
  const leadsGenerated = emp.leads_count ?? 0;
  const activeMembers = hierarchy.active_members ?? (teamSize > 0 ? teamSize : 0);

  const cardBg = isDark ? '#1E293B' : '#FFFFFF';
  const bgSecondary = isDark ? '#0F172A' : '#F8FAFC';
  const borderCol = colors.border;

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library permission is required to update your profile photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setProfilePhoto(asset.uri);
    try {
      setUploadingPhoto(true);
      const formData = new FormData();
      formData.append('photo', { uri: asset.uri, type: asset.mimeType || 'image/jpeg', name: 'profile_photo.jpg' } as any);
      await apiClient.post('/employee/profile/photo', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    } catch (err) {
      console.warn('Photo upload failed, kept locally:', err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const StatCard = ({ label, value, color }: { label: string; value: string; color?: string }) => (
    <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
      <Text style={[styles.statLabel, { color: colors.textMid }]}>{label}</Text>
      <Text style={[styles.statValue, { color: color || colors.text }]} numberOfLines={1}>{value}</Text>
    </View>
  );

  const InfoRow = ({ label, value, accent }: { label: string; value: string; accent?: string }) => (
    <View style={{ marginBottom: 12 }}>
      <Text style={[styles.infoLabel, { color: colors.textMid }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: accent || colors.text }]}>{value}</Text>
    </View>
  );

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <View style={{ gap: 14 }}>
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <Text style={[styles.cardTitle, { color: ACCENT }]}>
                <Icon name="person-circle" size={15} color={ACCENT} />  About Employee & Skills
              </Text>
              <Text style={{ fontSize: 13, color: colors.textMid, lineHeight: 20, marginBottom: 14 }}>
                Dedicated {designation} specializing in financial lead generation, customer outreach, and credit product conversions under the GharKaPaisa network.
              </Text>
              <Text style={[styles.qualLabel, { color: colors.text }]}>QUALIFICATIONS & EXPERIENCE:</Text>
              <View style={styles.chipRow}>
                {[jDetails.highest_qualification || emp.highest_qualification || 'N/A',
                  `${jDetails.experience_type || emp.experience_type || 'N/A'}${jDetails.total_experience_years != null ? ` (${jDetails.total_experience_years} Yrs)` : ''}`,
                  'Fintech Sales',
                ].map((c, i) => (
                  <View key={i} style={[styles.chip, { backgroundColor: bgSecondary, borderColor: borderCol }]}>
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.text }}>{c}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <Text style={[styles.cardTitle, { color: ACCENT }]}>
                <Icon name="id-card" size={15} color={ACCENT} />  KYC Verification Summary
              </Text>
              {[
                ['PAN Card Verification', kyc.pan_status],
                ['Aadhaar Verification', kyc.aadhaar_status],
                ['Bank Account Proof', kyc.bank_status],
                ['Video Statement', terms.terms_accepted ? 'VERIFIED' : undefined],
              ].map(([label, st]) => {
                const c = kycChip(st as string | undefined);
                return (
                  <View key={label as string} style={[styles.kvRow, { backgroundColor: bgSecondary }]}>
                    <Text style={{ fontSize: 13, color: colors.text }}>{label}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: c.color }}>{c.text}</Text>
                  </View>
                );
              })}
            </View>

            <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <Text style={[styles.cardTitle, { color: ACCENT }]}>
                <Icon name="git-branch" size={15} color={ACCENT} />  Organizational Hierarchy
              </Text>
              <View style={{ alignItems: 'center', gap: 8 }}>
                <View style={[styles.hierBox, { backgroundColor: bgSecondary, borderColor: borderCol }]}>
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: colors.text }}>👨‍💼 Manager: {hierarchy.manager_name || jDetails.reporting_manager || 'Super Admin'}</Text>
                </View>
                <Text style={{ color: colors.textLight, fontWeight: '900' }}>↓</Text>
                <View style={[styles.hierBox, { backgroundColor: `${ACCENT}15`, borderColor: `${ACCENT}40` }]}>
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: ACCENT }}>👔 {designation}: {fullName} ({empCode})</Text>
                </View>
                <Text style={{ color: colors.textLight, fontWeight: '900' }}>↓</Text>
                <View style={[styles.hierBox, { backgroundColor: bgSecondary, borderColor: borderCol }]}>
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.textMid }}>👥 Direct Subordinates ({teamSize} TCs)</Text>
                </View>
              </View>
            </View>
          </View>
        );

      case 'personal':
        return (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <Text style={[styles.cardTitle, { color: ACCENT }]}>Personal Information & Address Details</Text>
            <InfoRow label="FULL LEGAL NAME" value={fullName} />
            <InfoRow label="DATE OF BIRTH" value={jDetails.date_of_birth || emp.date_of_birth || 'N/A'} />
            <InfoRow label="GENDER" value={jDetails.gender || emp.gender || 'N/A'} />
            <InfoRow label="MOBILE PHONE" value={jDetails.mobile_number || emp.mobile_number || emp.mobile || 'N/A'} />
            <InfoRow label="EMAIL ADDRESS" value={jDetails.email_id || emp.email_id || emp.email || 'N/A'} />
            <InfoRow label="CURRENT RESIDENCE ADDRESS" value={jDetails.current_address || emp.current_address || 'Registered Residential Address'} />
          </View>
        );

      case 'joining':
        return (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <Text style={[styles.cardTitle, { color: ACCENT }]}>Joining Details & Employment Documentation</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
              {[
                ['Registration Status', `✓ ${jDetails.form_status || 'SUBMITTED'}`, '#10B981'],
                ['Date of Joining', jDetails.joining_date ? new Date(jDetails.joining_date).toLocaleDateString('en-IN') : 'Active', colors.text],
                ['Offered Monthly Salary', jDetails.offered_salary || emp.offered_salary ? `₹${Number(jDetails.offered_salary || emp.offered_salary).toLocaleString('en-IN')}` : 'Not Specified', '#059669'],
              ].map(([label, value, color]) => (
                <View key={label as string} style={[styles.miniStat, { backgroundColor: bgSecondary, borderColor: borderCol, flexBasis: '30%', flexGrow: 1 }]}>
                  <Text style={[styles.infoLabel, { color: colors.textMid }]}>{label}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: color as string, marginTop: 3 }}>{value}</Text>
                </View>
              ))}
            </View>
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 12 }}>Uploaded Employment Documents</Text>
            {docsList.length === 0 ? (
              <Text style={{ fontSize: 13, color: colors.textMid, textAlign: 'center', paddingVertical: 16 }}>No additional employment documents uploaded.</Text>
            ) : (
              docsList.map((d: any, idx: number) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.docRow, { backgroundColor: bgSecondary, borderColor: borderCol }]}
                  onPress={() => d.document_url && Linking.openURL(resolveMediaUrl(d.document_url) || '').catch(() => {})}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text, textTransform: 'capitalize' }}>{d.document_type}</Text>
                    <Text style={{ fontSize: 11.5, color: colors.textMid, marginTop: 2 }}>{d.document_file_name || 'Attachment.pdf'}</Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#10B981' }}>{d.verification_status || 'VERIFIED'}</Text>
                  <Icon name="document-text" size={16} color={ACCENT} />
                </TouchableOpacity>
              ))
            )}
          </View>
        );

      case 'kyc': {
        const overall = {
          bg: kycState === 'VERIFIED' ? '#D1FAE5' : kycState === 'REJECTED' ? '#FEE2E2' : (kycState === 'SUBMITTED' || kycState === 'PENDING') ? '#DBEAFE' : '#FEF3C7',
          color: kycState === 'VERIFIED' ? '#065F46' : kycState === 'REJECTED' ? '#991B1B' : (kycState === 'SUBMITTED' || kycState === 'PENDING') ? '#1E40AF' : '#92400E',
          label: kycState === 'VERIFIED' ? 'VERIFIED' : kycState === 'REJECTED' ? 'REJECTED (ACTION REQUIRED)' : (kycState === 'SUBMITTED' || kycState === 'PENDING') ? 'SUBMITTED (UNDER REVIEW)' : 'PENDING SUBMISSION',
        };
        return (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
              <Text style={[styles.cardTitle, { color: ACCENT, marginBottom: 0, flex: 1 }]}>Individual KYC & Document Verification</Text>
              <View style={{ backgroundColor: overall.bg, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 }}>
                <Text style={{ fontSize: 11.5, fontWeight: '800', color: overall.color }}>OVERALL: {overall.label}</Text>
              </View>
            </View>
            {[
              { n: 1, title: 'PAN Card Verification', status: kyc.pan_status, number: kyc.pan_number || jDetails.pan_number, url: kyc.pan_document_url },
              { n: 2, title: 'Aadhaar Card Verification', status: kyc.aadhaar_status, number: kyc.aadhaar_number || jDetails.aadhaar_number, url: kyc.aadhaar_document_url },
            ].map((doc) => {
              const st = kycChip(doc.status);
              return (
                <View key={doc.n} style={[styles.docCard, { backgroundColor: bgSecondary, borderColor: borderCol }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>{doc.n}. {doc.title}</Text>
                    <View style={{ backgroundColor: doc.status === 'VERIFIED' ? '#D1FAE5' : '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: doc.status === 'VERIFIED' ? '#065F46' : '#92400E' }}>{doc.status || 'PENDING'}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.text, marginBottom: 8 }}>Number: {doc.number || 'N/A'}</Text>
                  {doc.url ? (
                    <TouchableOpacity onPress={() => Linking.openURL(resolveMediaUrl(doc.url) || '').catch(() => {})}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: ACCENT }}>View Document ↗</Text>
                    </TouchableOpacity>
                  ) : null}
                  <Text style={{ fontSize: 11, fontWeight: '800', color: st.color, marginTop: 8 }}>{st.text}</Text>
                </View>
              );
            })}
          </View>
        );
      }

      case 'hierarchy':
        return (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <Text style={[styles.cardTitle, { color: ACCENT }]}>Employee Hierarchy Architecture</Text>
            <View style={{ gap: 10 }}>
              {[
                ['BRANCH HEAD', hierarchy.branch_head_name || 'Direct / None'],
                ['SENIOR MANAGER', hierarchy.senior_manager_name || 'Direct / None'],
                ['ASSIGNED MANAGER', hierarchy.manager_name || jDetails.reporting_manager || 'Super Admin'],
                ['ASSIGNED TEAM LEADER', hierarchy.team_leader_name || 'Direct TL'],
                ['DIRECT SUBORDINATES', `${teamSize} Members`, ACCENT],
              ].map(([label, value, color]) => (
                <View key={label as string} style={[styles.hierLevel, { backgroundColor: bgSecondary, borderColor: borderCol }]}>
                  <Text style={[styles.infoLabel, { color: colors.textMid }]}>{label}</Text>
                  <Text style={{ fontSize: 14.5, fontWeight: '800', color: (color as string) || colors.text, marginTop: 2 }}>{value}</Text>
                </View>
              ))}
            </View>
          </View>
        );

      case 'performance':
        return (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <Text style={[styles.cardTitle, { color: ACCENT }]}>
              <Icon name="trophy" size={15} color={ACCENT} />  Performance Metrics & Conversion Analytics
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              <View style={{ flexBasis: '47%', flexGrow: 1 }}><StatCard label="TOTAL APPLICATIONS" value={String(totalApps)} /></View>
              <View style={{ flexBasis: '47%', flexGrow: 1 }}><StatCard label="APPROVED CONVERSIONS" value={String(approvedApps)} color="#10B981" /></View>
              <View style={{ flexBasis: '47%', flexGrow: 1 }}><StatCard label="APPROVAL RATE" value={`${approvalRate}%`} color="#3B82F6" /></View>
              <View style={{ flexBasis: '47%', flexGrow: 1 }}><StatCard label="TOTAL INCENTIVES" value={`₹${Number(totalIncentives).toLocaleString('en-IN')}`} color="#059669" /></View>
              <View style={{ flexBasis: '47%', flexGrow: 1 }}><StatCard label="LEADS GENERATED" value={String(leadsGenerated)} color="#8B5CF6" /></View>
              <View style={{ flexBasis: '47%', flexGrow: 1 }}><StatCard label="TEAM SUBORDINATES" value={String(teamSize)} color="#F59E0B" /></View>
            </View>
          </View>
        );

      case 'applications':
        return (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <Text style={[styles.cardTitle, { color: ACCENT }]}>Punched & Tracked Applications</Text>
            <Text style={{ fontSize: 13, color: colors.textMid, marginBottom: 14 }}>List of customer financial product applications processed by this employee.</Text>
            {applications.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                <Icon name="inbox" size={36} color={colors.textLight} />
                <Text style={{ fontSize: 13, color: colors.textMid, marginTop: 8 }}>No applications found.</Text>
                <TouchableOpacity style={[styles.linkBtn, { borderColor: ACCENT }]} onPress={() => router.push('/(app)/applications' as any)}>
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: ACCENT }}>View All Applications →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              applications.slice(0, 20).map((a: any, i: number) => (
                <View key={a.id || i} style={[styles.appRow, { borderBottomColor: borderCol }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.text }} numberOfLines={1}>
                      {a.customer_name || a.applicant_name || a.name || `Application #${a.id}`}
                    </Text>
                    <Text style={{ fontSize: 11.5, color: colors.textMid, marginTop: 2 }} numberOfLines={1}>
                      {a.product_name || a.product_type || a.bank_name || '—'} • {a.created_at ? new Date(a.created_at).toLocaleDateString('en-IN') : ''}
                    </Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: `${getStatusColor(a.status)}20` }]}>
                    <Text style={{ fontSize: 10.5, fontWeight: '800', color: getStatusColor(a.status) }}>{(a.status || 'PENDING').replace(/_/g, ' ')}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        );

      case 'incentives':
        return (
          <View style={{ gap: 14 }}>
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <Text style={[styles.cardTitle, { color: ACCENT }]}>Incentive Summary</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                <View style={{ flexBasis: '47%', flexGrow: 1 }}><StatCard label="TOTAL EARNED" value={`₹${Number(totalIncentives).toLocaleString('en-IN')}`} color="#059669" /></View>
                <View style={{ flexBasis: '47%', flexGrow: 1 }}><StatCard label="PAID OUT" value={`₹${Number(incSummary.total_paid ?? emp.total_paid_incentives ?? 0).toLocaleString('en-IN')}`} color="#10B981" /></View>
                <View style={{ flexBasis: '47%', flexGrow: 1 }}><StatCard label="PENDING" value={`₹${Number(incSummary.total_pending ?? emp.pending_incentives ?? 0).toLocaleString('en-IN')}`} color="#F59E0B" /></View>
              </View>
            </View>
            <TouchableOpacity style={[styles.linkBtn, { borderColor: ACCENT, alignSelf: 'flex-start' }]} onPress={() => router.push('/(app)/employee-incentives' as any)}>
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: ACCENT }}>Open My Incentives Report →</Text>
            </TouchableOpacity>
          </View>
        );

      case 'activity':
        return (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <Text style={[styles.cardTitle, { color: ACCENT }]}>Audit & Action Activity Timeline</Text>
            {profileData?.activity_log?.length ? (
              profileData.activity_log.slice(0, 20).map((e: any, i: number) => (
                <View key={i} style={[styles.activityItem, { backgroundColor: bgSecondary, borderLeftColor: ACCENT }]}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{e.action || e.title || 'Activity'}</Text>
                  <Text style={{ fontSize: 11, color: colors.textMid, marginTop: 3 }}>{e.created_at ? new Date(e.created_at).toLocaleString('en-IN') : ''}</Text>
                </View>
              ))
            ) : (
              <View style={{ gap: 10 }}>
                <View style={[styles.activityItem, { backgroundColor: bgSecondary, borderLeftColor: ACCENT }]}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>KYC Documents Uploaded</Text>
                  <Text style={{ fontSize: 11, color: colors.textMid, marginTop: 3 }}>Employee uploaded PAN and Aadhaar files. (Recent)</Text>
                </View>
                <View style={[styles.activityItem, { backgroundColor: bgSecondary, borderLeftColor: '#10B981' }]}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Employee Onboarding Registration Saved</Text>
                  <Text style={{ fontSize: 11, color: colors.textMid, marginTop: 3 }}>Form details submitted. (Recent)</Text>
                </View>
              </View>
            )}
          </View>
        );
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.center}><ActivityIndicator size="large" color={ACCENT} /><Text style={{ marginTop: 10, fontSize: 13, color: colors.textMid }}>Loading 360° Employee Profile...</Text></View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchProfile(true)} tintColor={ACCENT} />}
      >
        {/* Header banner — website teal→navy gradient */}
        <View style={styles.banner}>
          <View style={styles.bannerTop}>
            <View>
              <TouchableOpacity onPress={pickPhoto} activeOpacity={0.8}>
                <View style={styles.avatarWrap}>
                  {profilePhoto ? (
                    <Image source={{ uri: profilePhoto }} style={styles.avatarImg} />
                  ) : (
                    <Text style={styles.avatarLetter}>{fullName.charAt(0).toUpperCase()}</Text>
                  )}
                  {uploadingPhoto && (
                    <View style={StyleSheet.absoluteFill}>
                      <ActivityIndicator size="small" color="#fff" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} />
                    </View>
                  )}
                </View>
                <View style={styles.cameraBadge}>
                  <Icon name="camera" size={11} color="#fff" />
                </View>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <Text style={styles.bannerName} numberOfLines={1}>{fullName}</Text>
              </View>
              <View style={[styles.badgeRow, { borderColor: badge.border, backgroundColor: badge.bg }]}>
                <Icon name="shield-checkmark" size={10} color={badge.color} />
                <Text style={{ fontSize: 10.5, fontWeight: '800', color: badge.color }}>{badge.label}</Text>
              </View>
              <View style={[styles.badgeRow, { borderColor: accountStatus === 'ACTIVE' ? '#34D399' : '#EF4444', backgroundColor: accountStatus === 'ACTIVE' ? 'rgba(52,211,153,0.2)' : 'rgba(239,68,68,0.2)', marginTop: 6 }]}>
                <Text style={{ fontSize: 10.5, fontWeight: '900', color: accountStatus === 'ACTIVE' ? '#34D399' : '#FCA5A5' }}>● {accountStatus}</Text>
              </View>
              <Text style={styles.bannerMeta} numberOfLines={2}>
                <Text style={{ fontWeight: '800' }}>ID:</Text> {empCode}   •   <Text style={{ fontWeight: '800' }}>Mobile:</Text> {jDetails.mobile_number || emp.mobile_number || emp.mobile || 'N/A'}
              </Text>
              <Text style={styles.bannerMeta} numberOfLines={1}>
                <Text style={{ fontWeight: '800' }}>Email:</Text> {jDetails.email_id || emp.email_id || emp.email || 'N/A'}   •   <Text style={{ fontWeight: '800' }}>Joined:</Text> {jDetails.joining_date ? new Date(jDetails.joining_date).toLocaleDateString('en-IN') : 'Active'}
              </Text>
            </View>
          </View>

          {/* Hierarchy info bar */}
          <View style={styles.hierBar}>
            <View style={styles.hierItem}>
              <Text style={styles.hierLabel}>REPORTING MANAGER</Text>
              <Text style={styles.hierValue}>{hierarchy.manager_name || jDetails.reporting_manager || 'Super Admin'}</Text>
            </View>
            <View style={styles.hierItem}>
              <Text style={styles.hierLabel}>DEPARTMENT</Text>
              <Text style={styles.hierValue}>{department}</Text>
            </View>
            <View style={styles.hierItem}>
              <Text style={styles.hierLabel}>ROLE & DESIGNATION</Text>
              <Text style={[styles.hierValue, { color: '#2DD4BF' }]}>{designation}</Text>
            </View>
            <View style={styles.hierItem}>
              <Text style={styles.hierLabel}>DOB / GENDER</Text>
              <Text style={styles.hierValue}>{jDetails.date_of_birth || emp.date_of_birth || 'N/A'} ({jDetails.gender || emp.gender || 'N/A'})</Text>
            </View>
          </View>
        </View>

        {/* 7 stat cards */}
        <View style={styles.statsGrid}>
          <StatCard label="TEAM SIZE" value={String(teamSize)} color={ACCENT} />
          <StatCard label="TOTAL APPS" value={String(totalApps)} />
          <StatCard label="APPROVED" value={String(approvedApps)} color="#10B981" />
          <StatCard label="APPROVAL RATE" value={`${approvalRate}%`} color="#3B82F6" />
          <StatCard label="INCENTIVES" value={`₹${Number(totalIncentives).toLocaleString('en-IN')}`} color="#059669" />
          <StatCard label="LEADS" value={String(leadsGenerated)} color="#8B5CF6" />
          <StatCard label="ACTIVE MEMBERS" value={String(activeMembers)} color="#F59E0B" />
        </View>

        {/* Tab bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
          {TABS.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.tabBtn, { backgroundColor: isActive ? ACCENT : 'transparent' }]}
                onPress={() => setActiveTab(t.id)}
              >
                <Icon name={t.icon} size={13} color={isActive ? '#fff' : colors.textMid} />
                <Text style={{ fontSize: 12.5, fontWeight: isActive ? '800' : '600', color: isActive ? '#fff' : colors.textMid }}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {renderTab()}
      </ScrollView>
    </View>
  );
}

function getStatusColor(status?: string): string {
  switch ((status || '').toUpperCase()) {
    case 'APPROVED': case 'SUCCESS': case 'DISBURSED': return '#10B981';
    case 'REJECTED': case 'FAILED': return '#EF4444';
    case 'PENDING': case 'PROCESSING': case 'SUBMITTED': return '#F59E0B';
    default: return '#3B82F6';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl, gap: 14 },
  // Banner
  banner: {
    borderRadius: 24, padding: 20,
    backgroundColor: ACCENT,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 6,
  },
  bannerTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  avatarWrap: {
    width: 78, height: 78, borderRadius: 39, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    borderWidth: 3, borderColor: '#fff',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarLetter: { fontSize: 32, fontWeight: '900', color: ACCENT },
  cameraBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13, backgroundColor: '#38BDF8',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff',
  },
  bannerName: { fontSize: 21, fontWeight: '900', color: '#fff', flexShrink: 1 },
  badgeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8,
  },
  bannerMeta: { fontSize: 12.5, color: '#E2E8F0', fontWeight: '600', marginTop: 8 },
  hierBar: {
    marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)',
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
  },
  hierItem: { flexBasis: '46%', flexGrow: 1 },
  hierLabel: { fontSize: 9.5, color: 'rgba(255,255,255,0.7)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  hierValue: { fontSize: 12.5, color: '#fff', fontWeight: '700', marginTop: 2 },
  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    flexBasis: '30%', flexGrow: 1, minWidth: 96,
    borderRadius: 14, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center',
  },
  statLabel: { fontSize: 9.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  statValue: { fontSize: 17, fontWeight: '900', marginTop: 3 },
  // Tabs
  tabsRow: { gap: 6, paddingRight: 8 },
  tabBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12,
  },
  // Cards
  card: { borderRadius: 18, borderWidth: 1, padding: 18 },
  cardTitle: { fontSize: 15.5, fontWeight: '900', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 },
  qualLabel: { fontSize: 12, fontWeight: '800', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  kvRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8,
  },
  hierBox: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, width: '100%', alignItems: 'center' },
  infoLabel: { fontSize: 10.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  infoValue: { fontSize: 13.5, fontWeight: '700', marginTop: 2 },
  miniStat: { borderWidth: 1, borderRadius: 12, padding: 12 },
  docRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8,
  },
  docCard: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 12 },
  hierLevel: { borderWidth: 1, borderRadius: 12, padding: 12 },
  // Applications
  appRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 11, borderBottomWidth: 1,
  },
  statusPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  linkBtn: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9, marginTop: 12 },
  // Activity
  activityItem: {
    borderLeftWidth: 4, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10,
  },
});
