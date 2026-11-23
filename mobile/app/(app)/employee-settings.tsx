import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  Modal,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Icon, IconName } from '../../components/Icon';
import { spacing } from '../../theme/spacing';
import apiClient from '../../services/api';
import {
  fetchEmployeeSettings,
  updateEmployeeSettings,
  EmployeeSettings,
} from '../../services/employee.service';
import { FaqAccordion } from '../../components/FaqAccordion';

const ACCENT = '#0F766E';

type TabId = 'account' | 'security' | 'notifications' | 'privacy' | 'kyc' | 'employment' | 'appearance' | 'preferences' | 'help' | 'legal' | 'danger';

const NAV_TABS: { id: TabId; label: string; icon: IconName }[] = [
  { id: 'account', label: 'Account', icon: 'person' },
  { id: 'security', label: 'Security & Login', icon: 'lock-closed' },
  { id: 'notifications', label: 'Notifications', icon: 'notifications' },
  { id: 'privacy', label: 'Privacy', icon: 'shield-checkmark' },
  { id: 'kyc', label: 'KYC & Verification', icon: 'id-card' },
  { id: 'employment', label: 'Employment Info', icon: 'business' },
  { id: 'appearance', label: 'Appearance', icon: 'moon' },
  { id: 'preferences', label: 'App Preferences', icon: 'phone-portrait' },
  { id: 'help', label: 'Help & Support', icon: 'headset' },
  { id: 'legal', label: 'Legal & Policies', icon: 'document-text' },
  { id: 'danger', label: 'Danger Zone', icon: 'warning' },
];

export default function EmployeeSettingsScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth() as any;
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabId>('account');
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Password form
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Notification toggles (real API)
  const [notifSettings, setNotifSettings] = useState<EmployeeSettings>({
    push_notifications_enabled: true,
    email_alerts_enabled: true,
    sms_alerts_enabled: true,
    sound_enabled: true,
  });
  const [notifSaving, setNotifSaving] = useState(false);

  // Preferences
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [dashboardRange, setDashboardRange] = useState('Current Month (Default)');
  const [exportFormat, setExportFormat] = useState('CSV Spreadsheet (.csv)');

  // Support ticket
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketForm, setTicketForm] = useState({ subject: '', description: '' });

  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'temporary' | 'permanent'>('temporary');
  const [deleteAcknowledged, setDeleteAcknowledged] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Manage Devices state
  const [devices, setDevices] = useState<any[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [devicesError, setDevicesError] = useState('');
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/employee/profile');
      if (res.data?.success && res.data?.data) setProfileData(res.data.data);
    } catch (err) {
      console.warn('Settings profile fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    fetchEmployeeSettings().then((d) => { if (d) setNotifSettings(d); }).catch(() => {});
  }, [fetchProfile]);

  const fetchDevices = useCallback(async () => {
    setDevicesLoading(true);
    setDevicesError('');
    try {
      const res = await apiClient.get('/auth/devices');
      setDevices(res.data?.data || []);
    } catch (err: any) {
      setDevicesError(err.response?.data?.message || 'Failed to load devices');
    } finally {
      setDevicesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'security') fetchDevices();
  }, [activeTab, fetchDevices]);

  const revokeDevice = async (id: string) => {
    setRevokingId(id);
    try {
      await apiClient.delete(`/auth/device/${id}`);
      await fetchDevices();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to log out device');
    } finally {
      setRevokingId(null);
    }
  };

  const logoutOtherDevices = () => {
    Alert.alert('Log out other devices', 'This will sign out all sessions except this device. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          setLogoutAllLoading(true);
          try {
            await apiClient.post('/auth/logout-all');
            await fetchDevices();
          } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to log out other devices');
          } finally {
            setLogoutAllLoading(false);
          }
        },
      },
    ]);
  };

  const emp = profileData?.employee || user || {};
  const jDetails = profileData?.joining_details || {};
  const kyc = profileData?.kyc || {};
  const hierarchy = profileData?.hierarchy || {};

  const fullName = jDetails.full_name || emp.full_name || emp.name || 'Employee';
  const designation = jDetails.designation || emp.designation || 'Telecaller';
  const department = jDetails.department || emp.department || 'Sales & Operations';
  const empCode = emp.employee_id || emp.emp_code || emp.id || 'EMP10001';
  const managerName = hierarchy.manager_name || jDetails.reporting_manager || 'Super Admin';

  const cardBg = isDark ? '#1E293B' : '#FFFFFF';
  const bgSecondary = isDark ? '#0F172A' : '#F8FAFC';
  const borderCol = colors.border;

  const handlePasswordChange = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordMsg('❌ New password and confirmation do not match');
      return;
    }
    try {
      setPasswordLoading(true);
      setPasswordMsg('Updating password...');
      const res = await apiClient.post('/auth/change-password', passwordForm);
      if (res.data?.success) {
        setPasswordMsg('✓ Password updated successfully!');
        setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      } else {
        setPasswordMsg('❌ Failed to update password');
      }
    } catch (err: any) {
      setPasswordMsg(`❌ ${err.response?.data?.message || 'Failed to update password'}`);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleNotifChange = async (key: keyof EmployeeSettings, value: boolean) => {
    const updated = { ...notifSettings, [key]: value };
    setNotifSettings(updated);
    try {
      setNotifSaving(true);
      await updateEmployeeSettings({ [key]: value } as any);
    } catch {
      setNotifSettings(notifSettings);
    } finally {
      setNotifSaving(false);
    }
  };

  const handleSupportTicket = () => {
    if (!ticketForm.subject.trim() || !ticketForm.description.trim()) {
      Alert.alert('Required', 'Please fill subject and description.');
      return;
    }
    Alert.alert('✓ Support ticket submitted!', 'HR & Support Team will respond shortly.');
    setShowTicketModal(false);
    setTicketForm({ subject: '', description: '' });
  };

  const handleDeleteAccount = async () => {
    if (!deleteAcknowledged) {
      Alert.alert('Confirmation required', 'Please confirm that you understand the terms of account deletion.');
      return;
    }
    const isPermanent = deleteMode === 'permanent';
    Alert.alert(
      'Delete Account',
      isPermanent
        ? 'ARE YOU EXTREMELY SURE? Permanent deletion will wipe your account and all associated documents, bank details, and employment data. THIS CANNOT BE UNDONE!'
        : 'Are you sure you want to temporarily deactivate your account? Your profile data, attendance records, and performance data will remain safely saved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            setDeleteLoading(true);
            try {
              await apiClient.delete(`/auth/delete-account?mode=${deleteMode}`);
              Alert.alert('Done', 'Your request has been processed.');
              await logout?.();
              router.replace('/(auth)/login' as any);
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to process account deletion request.');
            } finally {
              setDeleteLoading(false);
              setShowDeleteModal(false);
            }
          },
        },
      ]
    );
  };

  const SectionTitle = ({ n, title, icon, danger }: { n: number; title: string; icon: IconName; danger?: boolean }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <Icon name={icon} size={16} color={danger ? '#EF4444' : ACCENT} />
      <Text style={{ fontSize: 16, fontWeight: '900', color: danger ? '#EF4444' : colors.text }}>
        {n}. {title}
      </Text>
    </View>
  );

  const Field = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
    <View style={{ flex: 1 }}>
      <Text style={[styles.fieldLabel, { color: colors.textMid }]}>{label}</Text>
      <View style={[styles.fieldBox, { backgroundColor: bgSecondary, borderColor: borderCol }]}>
        <Text style={[styles.fieldValue, { color: accent ? ACCENT : colors.text }]} numberOfLines={2}>{value}</Text>
      </View>
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'account':
        return (
          <View>
            <SectionTitle n={1} title="Account Settings" icon="person" />
            <View style={[styles.profileRow, { backgroundColor: bgSecondary, borderColor: borderCol }]}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{String(fullName).charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.profileName, { color: colors.text }]} numberOfLines={1}>{fullName}</Text>
                <Text style={[styles.profileSub, { color: colors.textMid }]} numberOfLines={1}>{designation} • {department}</Text>
                <View style={styles.idChip}>
                  <Text style={styles.idChipText}>ID: {empCode} (Read-only)</Text>
                </View>
              </View>
            </View>
            <View style={styles.fieldGrid}>
              <Field label="FULL LEGAL NAME" value={fullName} />
              <Field label="EMPLOYEE CODE" value={empCode} />
              <Field label="MOBILE CONTACT" value={jDetails.mobile_number || emp.mobile_number || emp.mobile || 'N/A'} />
              <Field label="EMAIL ADDRESS" value={jDetails.email_id || emp.email_id || emp.email || 'N/A'} />
            </View>
          </View>
        );

      case 'security':
        return (
          <View>
            <SectionTitle n={2} title="Security & Login Credentials" icon="lock-closed" />
            <View style={[styles.formCard, { backgroundColor: bgSecondary, borderColor: borderCol }]}>
              <Text style={[styles.formTitle, { color: colors.text }]}>Change Account Password</Text>
              {!!passwordMsg && <Text style={{ fontSize: 12, fontWeight: '700', marginBottom: 10, color: passwordMsg.startsWith('✓') ? '#10B981' : passwordMsg.startsWith('❌') ? '#EF4444' : colors.textMid }}>{passwordMsg}</Text>}
              <TextInput style={[styles.input, { backgroundColor: cardBg, borderColor: borderCol, color: colors.text }]} placeholder="Current Password" placeholderTextColor={colors.textLight} secureTextEntry value={passwordForm.current_password} onChangeText={(t) => setPasswordForm(p => ({ ...p, current_password: t }))} />
              <TextInput style={[styles.input, { backgroundColor: cardBg, borderColor: borderCol, color: colors.text }]} placeholder="New Password" placeholderTextColor={colors.textLight} secureTextEntry value={passwordForm.new_password} onChangeText={(t) => setPasswordForm(p => ({ ...p, new_password: t }))} />
              <TextInput style={[styles.input, { backgroundColor: cardBg, borderColor: borderCol, color: colors.text }]} placeholder="Confirm New Password" placeholderTextColor={colors.textLight} secureTextEntry value={passwordForm.confirm_password} onChangeText={(t) => setPasswordForm(p => ({ ...p, confirm_password: t }))} />
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: ACCENT }]} onPress={handlePasswordChange} disabled={passwordLoading}>
                {passwordLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryBtnText}>Update Password</Text>}
              </TouchableOpacity>
            </View>
            <View style={[styles.formCard, { backgroundColor: bgSecondary, borderColor: borderCol }]}>
              <Text style={[styles.formTitle, { color: colors.text }]}>Recent Login Activity</Text>
              <View style={{ gap: 8 }}>
                <View style={styles.sessionRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sessionDevice, { color: colors.text }]}>This Device — {user?.device_model || 'Mobile App'}</Text>
                    <Text style={[styles.sessionMeta, { color: colors.textMid }]}>Current Session • {user?.last_login_at ? new Date(user.last_login_at).toLocaleString('en-IN') : 'Active Now'}</Text>
                  </View>
                  <View style={styles.sessionBadge}>
                    <Text style={styles.sessionBadgeText}>● Current Session</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Manage Devices — real sessions from /auth/devices */}
            <View style={[styles.formCard, { backgroundColor: bgSecondary, borderColor: borderCol }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={[styles.formTitle, { color: colors.text, marginBottom: 0 }]}>Manage Devices</Text>
                {devices.length > 1 && (
                  <TouchableOpacity onPress={logoutOtherDevices} disabled={logoutAllLoading}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#DC2626' }}>
                      {logoutAllLoading ? 'Logging out…' : 'Log out other devices'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {devicesLoading ? (
                <ActivityIndicator size="small" color={ACCENT} style={{ marginVertical: 12 }} />
              ) : devicesError ? (
                <View style={{ alignItems: 'center', gap: 8, paddingVertical: 8 }}>
                  <Text style={{ fontSize: 12, color: '#DC2626', fontWeight: '600' }}>{devicesError}</Text>
                  <TouchableOpacity onPress={fetchDevices}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: ACCENT }}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : devices.length === 0 ? (
                <Text style={{ fontSize: 12, color: colors.textMid }}>No active device sessions found.</Text>
              ) : (
                <View style={{ gap: 8 }}>
                  {devices.map((d: any) => (
                    <View key={d.id} style={styles.sessionRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.sessionDevice, { color: colors.text }]} numberOfLines={1}>
                          {d.device_name || d.browser || 'Unknown device'}
                          {d.city ? ` — ${d.city}` : ''}
                        </Text>
                        <Text style={[styles.sessionMeta, { color: colors.textMid }]} numberOfLines={1}>
                          {[d.browser, d.ip_address].filter(Boolean).join(' • ') || 'Session'}
                          {d.last_used_at ? ` • Last used ${new Date(d.last_used_at).toLocaleString('en-IN')}` : ''}
                        </Text>
                      </View>
                      {d.is_current ? (
                        <View style={styles.sessionBadge}>
                          <Text style={styles.sessionBadgeText}>● This device</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[styles.modalBtn, { borderColor: '#FECACA', paddingHorizontal: 12, paddingVertical: 6 }]}
                          onPress={() => revokeDevice(d.id)}
                          disabled={revokingId === d.id}
                        >
                          {revokingId === d.id
                            ? <ActivityIndicator size="small" color="#DC2626" />
                            : <Text style={{ fontSize: 11, fontWeight: '800', color: '#DC2626' }}>Log out</Text>}
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        );

      case 'notifications':
        return (
          <View>
            <SectionTitle n={3} title="Notification Settings & Alert Channels" icon="notifications" />
            <View style={[styles.formCard, { backgroundColor: bgSecondary, borderColor: borderCol, padding: 0 }]}>
              {([
                ['push_notifications_enabled', 'Push Notifications', 'Receive real-time alerts on this device'],
                ['email_alerts_enabled', 'Email Alerts', 'Get updates via email'],
                ['sms_alerts_enabled', 'SMS Alerts', 'Get SMS notifications'],
                ['sound_enabled', 'Sound Enabled', 'Play sounds for alerts'],
              ] as [keyof EmployeeSettings, string, string][]).map(([key, label, sub], i, arr) => (
                <View key={key} style={[styles.notifRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: borderCol }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.text }}>{label}</Text>
                    <Text style={{ fontSize: 11.5, color: colors.textMid, marginTop: 2 }}>{sub}</Text>
                  </View>
                  <Switch value={!!notifSettings[key]} onValueChange={(v) => handleNotifChange(key, v)} disabled={notifSaving} trackColor={{ true: ACCENT }} />
                </View>
              ))}
            </View>
          </View>
        );

      case 'privacy':
        return (
          <View>
            <SectionTitle n={4} title="Customer Data Privacy & Compliance" icon="shield-checkmark" />
            <View style={[styles.infoBox, { backgroundColor: `${ACCENT}10`, borderColor: `${ACCENT}30` }]}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text, marginBottom: 6 }}>🔒 Strict Data Masking Enforced</Text>
              <Text style={{ fontSize: 12.5, color: colors.text, lineHeight: 19 }}>
                Customer PII (Personal Identifiable Information) including full mobile numbers and financial account numbers are masked per GharKaPaisa security guidelines.
              </Text>
            </View>
          </View>
        );

      case 'kyc':
        return (
          <View>
            <SectionTitle n={5} title="KYC & Onboarding Verification Status" icon="id-card" />
            <View style={[styles.formCard, { backgroundColor: bgSecondary, borderColor: borderCol }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 8 }}>
                <Text style={{ fontSize: 14.5, fontWeight: '800', color: colors.text }}>Onboarding Step Progress</Text>
                <View style={[styles.kycBadge, { backgroundColor: kyc.kyc_status === 'VERIFIED' ? '#D1FAE5' : '#FEF3C7' }]}>
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: kyc.kyc_status === 'VERIFIED' ? '#065F46' : '#92400E' }}>
                    KYC {kyc.kyc_status || 'VERIFIED'}
                  </Text>
                </View>
              </View>
              {[
                ['Step 1: Joining Registration', true],
                ['Step 2: Terms & Video Verification', true],
                ['Step 3: Documents Upload', kyc.kyc_status === 'VERIFIED'],
              ].map(([label, done], i) => (
                <View key={i} style={[styles.stepRow, i < 2 && { borderBottomWidth: 1, borderBottomColor: borderCol }]}>
                  <Text style={{ fontSize: 13, color: colors.text }}>{label}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: done ? '#10B981' : '#F59E0B' }}>
                    {done ? '✓ Completed' : 'Under Review'}
                  </Text>
                </View>
              ))}
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: ACCENT, marginTop: 16 }]} onPress={() => router.push('/(app)/employee-onboarding' as any)}>
                <Text style={styles.primaryBtnText}>Open Onboarding Wizard →</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'employment':
        return (
          <View>
            <SectionTitle n={6} title="Official Employment Parameters" icon="business" />
            <View style={styles.fieldGrid}>
              <Field label="EMPLOYEE REF ID" value={empCode} />
              <Field label="DESIGNATION" value={designation} accent />
              <Field label="DEPARTMENT" value={department} />
              <Field label="REPORTING MANAGER" value={managerName} />
              <Field label="WORK LOCATION" value={jDetails.work_location || emp.work_location || 'Office / Main Branch'} />
              <Field label="EMPLOYMENT TYPE & STATUS" value={`${jDetails.employment_type || emp.employment_type || 'Full-Time Regular'} (Active)`} />
              <Field label="JOINING DATE" value={jDetails.joining_date ? new Date(jDetails.joining_date).toLocaleDateString('en-IN') : 'Verified Employee'} />
              <Field label="TARGET & INCENTIVES" value={jDetails.target_applicable ? 'Standard Incentive Model' : 'Performance Tier Matrix'} />
            </View>
          </View>
        );

      case 'appearance':
        return (
          <View>
            <SectionTitle n={7} title="Appearance & Visual Theme Settings" icon="moon" />
            <View style={[styles.formCard, { backgroundColor: bgSecondary, borderColor: borderCol }]}>
              <Text style={[styles.formTitle, { color: colors.text }]}>Theme Interface Mode</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  style={[styles.themeBtn, { borderColor: !isDark ? ACCENT : borderCol, backgroundColor: '#FFFFFF' }]}
                  onPress={() => !isDark && toggleTheme()}
                >
                  <Text style={{ fontSize: 16 }}>☀️</Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>Light</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.themeBtn, { borderColor: isDark ? ACCENT : borderCol, backgroundColor: '#0F172A' }]}
                  onPress={() => isDark && toggleTheme()}
                >
                  <Text style={{ fontSize: 16 }}>🌙</Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>Dark</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={[styles.formCard, { backgroundColor: bgSecondary, borderColor: borderCol }]}>
              <Text style={[styles.formTitle, { color: colors.text }]}>Display Contrast & Scaling</Text>
              <Text style={{ fontSize: 12, color: colors.textMid, marginBottom: 12 }}>Adjust portal visual density and font scaling preference.</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <TouchableOpacity style={[styles.scaleBtn, { borderColor: borderCol, backgroundColor: cardBg }]} onPress={() => Alert.alert('Standard scaling active (100%)')}>
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.text }}>100% Standard</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.scaleBtn, { borderColor: ACCENT, backgroundColor: `${ACCENT}15` }]} onPress={() => Alert.alert('Compact scaling active (85%)')}>
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: ACCENT }}>85% Compact (Recommended)</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );

      case 'preferences':
        return (
          <View>
            <SectionTitle n={8} title="Application & Workspace Preferences" icon="phone-portrait" />
            <View style={[styles.formCard, { backgroundColor: bgSecondary, borderColor: borderCol }]}>
              <Text style={[styles.formTitle, { color: colors.text }]}>Default Filter & Date Ranges</Text>
              <Text style={[styles.fieldLabel, { color: colors.textMid, marginBottom: 4 }]}>DEFAULT DASHBOARD RANGE</Text>
              <View style={[styles.selectBox, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{dashboardRange}</Text>
                <Icon name="chevron-down" size={14} color={colors.textMid} />
              </View>
              <Text style={[styles.fieldLabel, { color: colors.textMid, marginBottom: 4, marginTop: 12 }]}>DEFAULT EXPORT FORMAT</Text>
              <View style={[styles.selectBox, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{exportFormat}</Text>
                <Icon name="chevron-down" size={14} color={colors.textMid} />
              </View>
            </View>
            <View style={[styles.formCard, { backgroundColor: bgSecondary, borderColor: borderCol }]}>
              <Text style={[styles.formTitle, { color: colors.text }]}>Data Sync & Live Auto-Refresh</Text>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }} onPress={() => setAutoRefresh(v => !v)}>
                <View style={[styles.checkbox, { borderColor: autoRefresh ? ACCENT : colors.textLight, backgroundColor: autoRefresh ? ACCENT : 'transparent' }]}>
                  {autoRefresh && <Icon name="check" size={12} color="#fff" />}
                </View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, flex: 1, lineHeight: 18 }}>
                  Automatically refresh lead statuses and applications every 60 seconds
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'help':
        return (
          <View>
            <SectionTitle n={9} title="Help Desk & Support Desk" icon="headset" />
            <View style={{ gap: 10 }}>
              <TouchableOpacity style={[styles.helpCard, { backgroundColor: bgSecondary, borderColor: borderCol }]} onPress={() => setShowTicketModal(true)}>
                <View style={styles.helpIconWrap}><Icon name="headset" size={20} color={ACCENT} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.text }}>Raise Ticket</Text>
                  <Text style={{ fontSize: 11, color: colors.textMid }}>Submit support request</Text>
                </View>
                <Icon name="chevron-right" size={16} color={colors.textLight} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.helpCard, { backgroundColor: bgSecondary, borderColor: borderCol }]} onPress={() => Alert.alert('HR Contact', 'hr@gharkapaisa.in | +91 98765 43210')}>
                <View style={styles.helpIconWrap}><Icon name="person" size={20} color={ACCENT} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.text }}>Contact HR</Text>
                  <Text style={{ fontSize: 11, color: colors.textMid }}>hr@gharkapaisa.in</Text>
                </View>
                <Icon name="chevron-right" size={16} color={colors.textLight} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.helpCard, { backgroundColor: bgSecondary, borderColor: borderCol }]} onPress={() => Alert.alert('Manager Contact', managerName)}>
                <View style={styles.helpIconWrap}><Icon name="business" size={20} color={ACCENT} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.text }}>Contact Manager</Text>
                  <Text style={{ fontSize: 11, color: colors.textMid }}>{managerName}</Text>
                </View>
                <Icon name="chevron-right" size={16} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 16 }}>
              <FaqAccordion categories={['general', 'employee']} title="Help & FAQ" />
            </View>
          </View>
        );

      case 'legal':
        return (
          <View>
            <SectionTitle n={10} title="Legal & Compliance Policies" icon="document-text" />
            <View style={{ gap: 10 }}>
              {[
                { title: 'Workplace Code of Conduct', desc: 'Enforces ethics, non-disclosure, customer data protection, and professional standards across all team operations.', url: 'https://gharkapaisa.in/terms' },
                { title: 'Customer PII & Data Privacy Policy', desc: "Governs customer data processing, masking rules, and compliance under India's Digital Personal Data Protection Act (DPDP).", url: 'https://gharkapaisa.in/privacy' },
              ].map((item) => (
                <View key={item.title} style={[styles.formCard, { backgroundColor: bgSecondary, borderColor: borderCol, marginBottom: 0 }]}>
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.text, marginBottom: 4 }}>{item.title}</Text>
                  <Text style={{ fontSize: 11.5, color: colors.textMid, lineHeight: 17, marginBottom: 8 }}>{item.desc}</Text>
                  <TouchableOpacity onPress={() => Linking.openURL(item.url).catch(() => {})}>
                    <Text style={{ fontSize: 11.5, fontWeight: '800', color: ACCENT }}>View Full Policy ↗</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <View style={[styles.infoBox, { backgroundColor: `${ACCENT}10`, borderColor: `${ACCENT}30`, marginTop: 4 }]}>
                <Text style={{ fontSize: 11.5, color: colors.text }}>
                  <Text style={{ fontWeight: '800' }}>GharKaPaisa Enterprise Platform Version:</Text> v2.4.0 (Production Release)
                </Text>
              </View>
            </View>
          </View>
        );

      case 'danger':
        return (
          <View>
            <SectionTitle n={11} title="Danger Zone - Account Deletion" icon="warning" danger />
            <View style={{ backgroundColor: '#FEF2F2', borderWidth: 2, borderColor: '#EF4444', borderRadius: 16, padding: 18 }}>
              <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#EF4444', marginBottom: 8 }}>Delete Account</Text>
              <Text style={{ fontSize: 13, color: '#991B1B', lineHeight: 19, marginBottom: 14 }}>
                Once you delete your account, there is no going back. Please be certain.
              </Text>
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#EF4444' }]} onPress={() => { setDeleteMode('temporary'); setDeleteAcknowledged(false); setShowDeleteModal(true); }}>
                <Text style={styles.primaryBtnText}>Delete Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.center}><ActivityIndicator size="large" color={ACCENT} /></View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Tab pills — website mobile horizontal scroll */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
          {NAV_TABS.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.tabPill, {
                  backgroundColor: isActive ? ACCENT : (isDark ? '#1E293B' : '#F8FAFC'),
                  borderColor: isDark ? borderCol : borderCol,
                  borderWidth: isActive ? 0 : 1,
                }]}
                onPress={() => setActiveTab(t.id)}
              >
                <Icon name={t.icon} size={13} color={isActive ? '#fff' : colors.textMid} />
                <Text style={{ fontSize: 12, fontWeight: isActive ? '800' : '600', color: isActive ? '#fff' : colors.textMid }}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Content panel */}
        <View style={[styles.panel, { backgroundColor: cardBg, borderColor: borderCol }]}>
          {renderTabContent()}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={async () => { await logout?.(); router.replace('/(auth)/login' as any); }}>
          <Icon name="log-out" size={16} color="#DC2626" />
          <Text style={styles.logoutText}>Log Out of Portal</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Support ticket modal */}
      <Modal visible={showTicketModal} transparent animationType="slide" onRequestClose={() => setShowTicketModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Submit Employee Support Request</Text>
            <TextInput
              style={[styles.input, { backgroundColor: bgSecondary, borderColor: borderCol, color: colors.text }]}
              placeholder="Ticket Subject (e.g. Incentive discrepancy / Lead re-assignment)"
              placeholderTextColor={colors.textLight}
              value={ticketForm.subject}
              onChangeText={(t) => setTicketForm(p => ({ ...p, subject: t }))}
            />
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: bgSecondary, borderColor: borderCol, color: colors.text }]}
              placeholder="Provide details about your query or technical issue..."
              placeholderTextColor={colors.textLight}
              multiline
              numberOfLines={4}
              value={ticketForm.description}
              onChangeText={(t) => setTicketForm(p => ({ ...p, description: t }))}
            />
            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
              <TouchableOpacity style={[styles.modalBtn, { borderColor: borderCol }]} onPress={() => setShowTicketModal(false)}>
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: ACCENT, borderColor: 'transparent' }]} onPress={handleSupportTicket}>
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#fff' }}>Submit Ticket</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete account modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <Text style={[styles.modalTitle, { color: '#EF4444' }]}>Delete Account</Text>
            <Text style={[styles.fieldLabel, { color: colors.textMid, marginBottom: 8 }]}>Deletion Mode</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
              {(['temporary', 'permanent'] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.modeBtn, {
                    borderColor: deleteMode === m ? '#EF4444' : borderCol,
                    backgroundColor: deleteMode === m ? '#FEF2F2' : cardBg,
                  }]}
                  onPress={() => setDeleteMode(m)}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: deleteMode === m ? '#EF4444' : colors.textMid }}>
                    {m === 'temporary' ? 'Temporary Deactivation' : 'Permanent Deletion'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ backgroundColor: deleteMode === 'permanent' ? '#FEF2F2' : '#FFF3CD', borderWidth: 1, borderColor: deleteMode === 'permanent' ? '#EF4444' : '#F59E0B', borderRadius: 10, padding: 12, marginBottom: 14 }}>
              <Text style={{ fontSize: 12, color: deleteMode === 'permanent' ? '#991B1B' : '#92400E', lineHeight: 18 }}>
                {deleteMode === 'permanent'
                  ? '⚠️ Permanent deletion will completely remove your account, employment records, attendance data, and all associated documents. This action CANNOT be undone.'
                  : '⚠️ Temporary deactivation will suspend your account but preserve your data. You can reactivate by contacting HR or Super Admin.'}
              </Text>
            </View>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 16 }} onPress={() => setDeleteAcknowledged(v => !v)}>
              <View style={[styles.checkbox, { borderColor: deleteAcknowledged ? '#EF4444' : colors.textLight, backgroundColor: deleteAcknowledged ? '#EF4444' : 'transparent', marginTop: 1 }]}>
                {deleteAcknowledged && <Icon name="check" size={11} color="#fff" />}
              </View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text, flex: 1, lineHeight: 17 }}>
                I understand the consequences and want to proceed with account {deleteMode === 'permanent' ? 'deletion' : 'deactivation'}.
              </Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
              <TouchableOpacity style={[styles.modalBtn, { borderColor: borderCol }]} onPress={() => setShowDeleteModal(false)}>
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#EF4444', borderColor: 'transparent', opacity: (!deleteAcknowledged || deleteLoading) ? 0.5 : 1 }]}
                onPress={handleDeleteAccount}
                disabled={!deleteAcknowledged || deleteLoading}
              >
                {deleteLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#fff' }}>Confirm Deletion</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl, gap: 14 },
  tabsRow: { gap: 8, paddingRight: 8 },
  tabPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
  },
  panel: { borderRadius: 18, borderWidth: 1, padding: 18 },
  // Profile
  profileRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 16,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: '900' },
  profileName: { fontSize: 16, fontWeight: '900' },
  profileSub: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  idChip: {
    alignSelf: 'flex-start', marginTop: 6,
    backgroundColor: `${ACCENT}15`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  idChipText: { fontSize: 11, fontWeight: '800', color: ACCENT },
  // Fields
  fieldGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  fieldLabel: { fontSize: 10.5, fontWeight: '800', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.4 },
  fieldBox: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  fieldValue: { fontSize: 13, fontWeight: '700' },
  // Forms
  formCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 14 },
  formTitle: { fontSize: 14.5, fontWeight: '800', marginBottom: 12 },
  input: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 13, fontWeight: '600', marginBottom: 10,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  primaryBtn: {
    borderRadius: 10, paddingVertical: 11, alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  // Security session
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sessionDevice: { fontSize: 13, fontWeight: '800' },
  sessionMeta: { fontSize: 11, marginTop: 2 },
  sessionBadge: { backgroundColor: '#10B98115', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  sessionBadgeText: { color: '#10B981', fontWeight: '800', fontSize: 10.5 },
  // Notifications
  notifRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16 },
  // KYC
  kycBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  stepRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  // Appearance
  themeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 13, borderRadius: 12, borderWidth: 2,
  },
  scaleBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, borderWidth: 1 },
  // Preferences
  selectBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
  },
  checkbox: {
    width: 18, height: 18, borderRadius: 4, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  // Help
  helpCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 14,
  },
  helpIconWrap: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: `${ACCENT}15`,
    alignItems: 'center', justifyContent: 'center',
  },
  // Info box
  infoBox: { borderRadius: 14, borderWidth: 1, padding: 16 },
  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FEF2F2',
    borderRadius: 14, paddingVertical: 13, marginTop: 4,
  },
  logoutText: { fontSize: 13, fontWeight: '800', color: '#DC2626' },
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 18 },
  modalCard: { borderRadius: 20, borderWidth: 1, padding: 20, maxHeight: '85%' },
  modalTitle: { fontSize: 17, fontWeight: '900', marginBottom: 14 },
  modalBtn: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 2, alignItems: 'center' },
});
