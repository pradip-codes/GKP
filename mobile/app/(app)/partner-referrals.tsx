import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Clipboard,
  TextInput,
  Modal,
  Image,
  Linking,
  Share,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../services/api';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

interface ReferralInfo {
  referral_code: string;
  referral_link: string;
  total_invites: number;
  total_registered: number;
  invites?: any[];
}

// Mobile port of website PartnerRefers.jsx
export default function PartnerReferralsScreen() {
  const { colors: themeColors } = useTheme();
  const { user } = useAuth();
  const isTeamMember = (user?.role || '').toUpperCase() === 'TEAM_MEMBER';

  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [form, setForm] = useState({ name: '', mobile: '', email: '' });
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ type: 'success' | 'error'; message?: string; data?: any } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'registered' | 'pending'>('all');

  useEffect(() => {
    fetchRefers();
  }, []);

  // Website PartnerRefers always calls /team/refers (both PARTNER & TEAM_MEMBER)
  const fetchRefers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/team/refers');
      if (response.data?.success) setInfo(response.data.data);
    } catch (error) {
      console.error('Failed to load refers:', error);
      Alert.alert('Error', 'Failed to load referral details');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async () => {
    if (!form.mobile && !form.email) return;
    try {
      setSending(true);
      setSendResult(null);
      const res = await apiClient.post('/team/invite', form);
      if (res.data?.success) {
        setSendResult({ type: 'success', data: res.data.data });
        setForm({ name: '', mobile: '', email: '' });
        fetchRefers();
      }
    } catch (err: any) {
      setSendResult({ type: 'error', message: err.response?.data?.message || 'Failed to send invitation' });
    } finally {
      setSending(false);
    }
  };

  const referralLink = info?.referral_link || '';

  const copyLink = () => {
    if (!referralLink) return;
    Clipboard.setString(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleNativeShare = async () => {
    if (!referralLink) return;
    try {
      await Share.share({
        message: `Join GharKaPaisa and earn commissions on every approved credit card & loan application! Register now: ${referralLink}`,
        url: referralLink,
      });
    } catch {
      copyLink();
    }
  };

  const shareWhatsApp = () => {
    if (!referralLink) return;
    const msg = `Hello! Join GharKaPaisa partner network and earn guaranteed commissions on every approved credit card & loan application. Register now using my link: ${referralLink}`;
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(msg)}`).catch(() => {});
  };

  const shareTelegram = () => {
    if (!referralLink) return;
    const msg = `Join GharKaPaisa partner network and earn guaranteed commissions on credit card & loan applications!`;
    Linking.openURL(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(msg)}`).catch(() => {});
  };

  const openWhatsAppInvite = (link?: string) => {
    if (!link) return;
    Linking.openURL(link).catch(() => {});
  };

  // Same QR provider the website uses
  const qrCodeUrl = referralLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(referralLink)}&color=4f46e5`
    : '';

  const allInvites = Array.isArray(info?.invites) ? info.invites : [];

  // Website filter logic: registered = has registered_at, pending = not registered
  const filteredInvites = useMemo(() => allInvites.filter((inv: any) => {
    const name = String(inv.recipient_name || inv.invitee_name || '').toLowerCase();
    const mobile = String(inv.recipient_mobile || inv.invitee_mobile || '').toLowerCase();
    const email = String(inv.recipient_email || inv.invitee_email || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesQuery = !query || name.includes(query) || mobile.includes(query) || email.includes(query);
    if (statusFilter === 'registered') return matchesQuery && !!inv.registered_at;
    if (statusFilter === 'pending') return matchesQuery && !inv.registered_at;
    return matchesQuery;
  }), [allInvites, searchQuery, statusFilter]);

  const totalInvitesCount = info?.total_invites || allInvites.length;
  const totalRegisteredCount = info?.total_registered || allInvites.filter((i: any) => i.registered_at).length;
  const conversionRate = totalInvitesCount > 0 ? Math.round((totalRegisteredCount / totalInvitesCount) * 100) : 0;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={styles.loadingText}>Loading referrals...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Refers</Text>
      <Text style={styles.pageSubtitle}>
        {isTeamMember ? 'Invite partners and track your referral network' : 'Invite partners and earn commissions'}
      </Text>

      {/* Stats — same 3 KPIs as website */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalInvitesCount}</Text>
          <Text style={styles.statLabel}>Total Invites</Text>
          <Text style={styles.statSublabel}>All Time</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalRegisteredCount}</Text>
          <Text style={styles.statLabel}>Registered</Text>
          <Text style={styles.statSublabel}>Joined</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{conversionRate}%</Text>
          <Text style={styles.statLabel}>Conversion</Text>
          <Text style={styles.statSublabel}>Rate</Text>
        </View>
      </View>

      <View style={styles.columns}>
        {/* LEFT: referral link card + benefits */}
        <View style={styles.leftCol}>
          <View style={styles.card}>
            <View style={styles.referralHeader}>
              <View style={styles.referralIconBg}>
                <Text style={styles.referralIcon}>🎁</Text>
              </View>
              <View style={styles.referralInfo}>
                <Text style={styles.referralTitle}>Your Referral Code</Text>
                <Text style={styles.referralCode}>{info?.referral_code || '—'}</Text>
              </View>
              <TouchableOpacity style={styles.copyBadge} onPress={() => referralLink && Clipboard.setString(info?.referral_code || '')}>
                <Text style={styles.copyBadgeText}>COPY</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.linkContainer}>
              <Text style={styles.linkLabel}>Referral Link</Text>
              <Text style={styles.linkText} numberOfLines={2}>{referralLink || '—'}</Text>
            </View>

            <View style={styles.shareRow}>
              <TouchableOpacity style={[styles.shareBtn, styles.shareBtnPrimary, !referralLink && { opacity: 0.5 }]} onPress={copyLink} disabled={!referralLink}>
                <Text style={styles.shareBtnText}>{copied ? '✓ Copied' : 'Copy Link'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.shareBtn, styles.shareBtnGreen, !referralLink && { opacity: 0.5 }]} onPress={shareWhatsApp} disabled={!referralLink}>
                <Text style={styles.shareBtnText}>WhatsApp</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.shareBtn, styles.shareBtnBlue, !referralLink && { opacity: 0.5 }]} onPress={shareTelegram} disabled={!referralLink}>
                <Text style={styles.shareBtnText}>Telegram</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.qrBtn, !referralLink && { opacity: 0.5 }]} onPress={() => setShowQrModal(true)} disabled={!referralLink}>
              <Text style={styles.qrBtnText}>▦ Show QR Code</Text>
            </TouchableOpacity>
          </View>

          {/* Benefits — mirrors "Why Invite Partners to GharKaPaisa?" */}
          <View style={styles.card}>
            <Text style={styles.benefitsTitle}>Why Invite Partners to GharKaPaisa?</Text>
            {[
              { icon: '✨', title: 'Guaranteed Commission Share', desc: 'Earn overriding commission on every successful product application submitted by your referred team.' },
              { icon: '✅', title: 'Instant Automated Wallet Payouts', desc: 'Commissions are automatically calculated & credited to your wallet balance.' },
              { icon: '👥', title: '360° Real-time Network Tracking', desc: 'Monitor all invite status, registered partners, and active pipelines from your portal.' },
            ].map((b) => (
              <View key={b.title} style={styles.benefitRow}>
                <View style={styles.benefitIcon}><Text>{b.icon}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.benefitTitle}>{b.title}</Text>
                  <Text style={styles.benefitDesc}>{b.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* RIGHT: invite form — partners only, hidden for TEAM_MEMBER (website parity) */}
        {!isTeamMember && (
          <View style={styles.card}>
            <Text style={styles.formTitle}>Direct Invitation Dispatch</Text>
            <Text style={styles.formSubtitle}>Send an official SMS & WhatsApp invitation directly to a prospective partner or team member.</Text>

            <Text style={styles.fieldLabel}>Full Name (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="E.g., Pratap Sanap"
              placeholderTextColor={themeColors.textLight}
              value={form.name}
              onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
            />
            <Text style={styles.fieldLabel}>Mobile Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="10-digit mobile number"
              placeholderTextColor={themeColors.textLight}
              keyboardType="phone-pad"
              maxLength={10}
              value={form.mobile}
              onChangeText={(v) => setForm((p) => ({ ...p, mobile: v.replace(/[^0-9]/g, '') }))}
            />
            <Text style={styles.fieldLabel}>Email Address (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="team@example.com"
              placeholderTextColor={themeColors.textLight}
              keyboardType="email-address"
              autoCapitalize="none"
              value={form.email}
              onChangeText={(v) => setForm((p) => ({ ...p, email: v }))}
            />

            {sendResult && (
              <View style={[styles.resultBox, sendResult.type === 'success' ? styles.resultSuccess : styles.resultError]}>
                {sendResult.type === 'success' ? (
                  <>
                    <Text style={styles.resultSuccessText}>✅ Invitation logged & dispatched successfully!</Text>
                    {!!sendResult.data?.whatsapp_link && (
                      <TouchableOpacity style={styles.waInviteBtn} onPress={() => openWhatsAppInvite(sendResult.data?.whatsapp_link)}>
                        <Text style={styles.waInviteBtnText}>💬 Open WhatsApp to Send Invite</Text>
                      </TouchableOpacity>
                    )}
                  </>
                ) : (
                  <Text style={styles.resultErrorText}>⚠️ {sendResult.message}</Text>
                )}
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, (sending || (!form.mobile && !form.email)) && { opacity: 0.6 }]}
              onPress={handleSendInvite}
              disabled={sending || (!form.mobile && !form.email)}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>📤 Send Partner Invite</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Invitation history — search + All/Registered/Pending filters */}
      <View style={styles.card}>
        <View style={styles.historyHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.historyTitle}>Referral Network & Invitation History</Text>
            <Text style={styles.historySubtitle}>
              Showing {filteredInvites.length} of {allInvites.length} recorded invitations
            </Text>
          </View>
        </View>

        <View style={styles.filterRow}>
          {([
            { key: 'all' as const, label: `All (${allInvites.length})`, color: undefined as string | undefined },
            { key: 'registered' as const, label: `Registered (${totalRegisteredCount})`, color: '#10B981' },
            { key: 'pending' as const, label: `Pending (${allInvites.length - totalRegisteredCount})`, color: '#F59E0B' },
          ]).map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, statusFilter === f.key && styles.filterChipActive]}
              onPress={() => setStatusFilter(f.key)}
            >
              <Text style={[styles.filterChipText, statusFilter === f.key && { color: f.color || themeColors.text }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.searchWrap}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search name, mobile..."
            placeholderTextColor={themeColors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {filteredInvites.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 30, marginBottom: 8 }}>👥</Text>
            <Text style={styles.emptyTitle}>No Invitations Found</Text>
            <Text style={styles.emptyText}>
              {searchQuery || statusFilter !== 'all'
                ? 'No invitations match your search filter criteria.'
                : 'Start growing your partner network by copying your link or sending direct invitations above!'}
            </Text>
          </View>
        ) : (
          filteredInvites.map((inv: any, idx: number) => {
            const name = inv.recipient_name || inv.invitee_name || 'Invitee';
            const mobile = inv.recipient_mobile || inv.invitee_mobile || '';
            const email = inv.recipient_email || inv.invitee_email || '';
            const isRegistered = !!inv.registered_at;
            const sentAt = inv.sent_at ? new Date(inv.sent_at).toLocaleDateString() : '';
            return (
              <View key={inv.id || idx} style={styles.inviteRow}>
                <View style={styles.inviteAvatar}>
                  <Text style={styles.inviteAvatarText}>{String(name).charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.inviteInfo}>
                  <Text style={styles.inviteName} numberOfLines={1}>{name}</Text>
                  <Text style={styles.inviteMeta} numberOfLines={1}>
                    {[mobile, email, sentAt].filter(Boolean).join(' • ')}
                  </Text>
                  {!!inv.child_first_name && (
                    <Text style={styles.inviteChild} numberOfLines={1}>
                      Registered: {inv.child_first_name} {inv.child_last_name || ''}
                    </Text>
                  )}
                </View>
                <View style={[styles.inviteStatusBadge, isRegistered ? styles.inviteStatusReg : styles.inviteStatusPend]}>
                  <Text style={[styles.inviteStatusText, { color: isRegistered ? '#10B981' : '#F59E0B' }]}>
                    {isRegistered ? 'REGISTERED' : 'PENDING'}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* QR Modal — same qrserver.com provider as website */}
      <Modal visible={showQrModal} transparent animationType="fade" onRequestClose={() => setShowQrModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Referral QR Code</Text>
            <Text style={styles.modalSubtitle} numberOfLines={2}>{referralLink}</Text>
            {qrCodeUrl ? <Image source={{ uri: qrCodeUrl }} style={styles.qrImage} resizeMode="contain" /> : null}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnSecondary} onPress={() => setShowQrModal(false)}>
                <Text style={styles.modalBtnSecondaryText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnPrimary} onPress={() => { copyLink(); setShowQrModal(false); }}>
                <Text style={styles.modalBtnPrimaryText}>Copy Link</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  loadingText: { marginTop: 12, color: colors.textLight, fontSize: typography.sizes.sm },
  pageTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
  pageSubtitle: { fontSize: 13, color: colors.textLight, marginTop: 4, marginBottom: 16 },
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: colors.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: colors.border, marginBottom: 16,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 11, color: colors.text, marginTop: 2, fontWeight: '600' },
  statSublabel: { fontSize: 10, color: colors.textLight, marginTop: 2 },
  columns: { flexDirection: 'column', gap: 16, marginBottom: 16 },
  leftCol: { gap: 16 },
  card: {
    backgroundColor: colors.card, borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: colors.border,
  },
  referralHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  referralIconBg: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#EEF2FF',
    justifyContent: 'center', alignItems: 'center',
  },
  referralIcon: { fontSize: 24 },
  referralInfo: { flex: 1, marginLeft: 12 },
  referralTitle: { fontSize: 12, fontWeight: '700', color: colors.textLight },
  referralCode: { fontSize: 20, fontWeight: '800', color: colors.primary, marginTop: 2 },
  copyBadge: {
    backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
  },
  copyBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  linkContainer: {
    backgroundColor: colors.bg, padding: 12, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border, marginBottom: 14,
  },
  linkLabel: { fontSize: 11, color: colors.textLight, marginBottom: 4, fontWeight: '600' },
  linkText: { fontSize: 12, color: colors.primary, fontFamily: 'monospace' },
  shareRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  shareBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  shareBtnPrimary: { backgroundColor: colors.primary },
  shareBtnGreen: { backgroundColor: '#25D366' },
  shareBtnBlue: { backgroundColor: '#0088CC' },
  shareBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  qrBtn: {
    alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: 10, borderWidth: 1, borderColor: colors.primary + '40',
  },
  qrBtnText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  benefitsTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 14 },
  benefitRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 12 },
  benefitIcon: {
    width: 30, height: 30, borderRadius: 8, backgroundColor: '#EEF2FF',
    justifyContent: 'center', alignItems: 'center',
  },
  benefitTitle: { fontSize: 13, fontWeight: '800', color: colors.text },
  benefitDesc: { fontSize: 12, color: colors.textLight, marginTop: 2, lineHeight: 17 },
  formTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 4 },
  formSubtitle: { fontSize: 12, color: colors.textLight, marginBottom: 16, lineHeight: 17 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: colors.textLight, marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 13, color: colors.text,
    backgroundColor: colors.bg,
  },
  resultBox: { borderRadius: 12, padding: 12, marginTop: 12, borderWidth: 1 },
  resultSuccess: { backgroundColor: '#10B98115', borderColor: '#10B98140' },
  resultError: { backgroundColor: '#EF444415', borderColor: '#EF444440' },
  resultSuccessText: { color: '#10B981', fontSize: 13, fontWeight: '600' },
  resultErrorText: { color: '#EF4444', fontSize: 13, fontWeight: '600' },
  waInviteBtn: {
    marginTop: 10, backgroundColor: '#10B981', borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 14, alignSelf: 'flex-start',
  },
  waInviteBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  submitBtn: {
    marginTop: 14, backgroundColor: colors.primary, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  submitBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  historyTitle: { fontSize: 16, fontWeight: '900', color: colors.text },
  historySubtitle: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg,
  },
  filterChipActive: { backgroundColor: colors.card, borderColor: colors.primary },
  filterChipText: { fontSize: 12, fontWeight: '700', color: colors.textLight },
  searchWrap: { marginBottom: 12 },
  searchInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 9, fontSize: 12, color: colors.text,
    backgroundColor: colors.bg,
  },
  emptyBox: {
    paddingVertical: 36, alignItems: 'center',
    backgroundColor: colors.bg, borderRadius: 16, borderWidth: 1, borderColor: colors.border,
  },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
  emptyText: { fontSize: 12, color: colors.textLight, marginTop: 4, textAlign: 'center', paddingHorizontal: 16 },
  inviteRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bg, borderRadius: 14, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  inviteAvatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#EEF2FF',
    justifyContent: 'center', alignItems: 'center',
  },
  inviteAvatarText: { fontSize: 15, fontWeight: '800', color: colors.primary },
  inviteInfo: { flex: 1, marginLeft: 10 },
  inviteName: { fontSize: 13, fontWeight: '700', color: colors.text },
  inviteMeta: { fontSize: 11, color: colors.textLight, marginTop: 2 },
  inviteChild: { fontSize: 11, color: '#10B981', marginTop: 2, fontWeight: '600' },
  inviteStatusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  inviteStatusReg: { backgroundColor: '#10B98118', borderColor: '#10B98150' },
  inviteStatusPend: { backgroundColor: '#F59E0B18', borderColor: '#F59E0B50' },
  inviteStatusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: {
    backgroundColor: colors.card, borderRadius: 20, padding: 24, width: '100%',
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 4 },
  modalSubtitle: { fontSize: 11, color: colors.textLight, marginBottom: 16, textAlign: 'center' },
  qrImage: { width: 220, height: 220, marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 10, width: '100%' },
  modalBtnSecondary: {
    flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  modalBtnSecondaryText: { color: colors.textLight, fontWeight: '700', fontSize: 13 },
  modalBtnPrimary: { flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: 'center', backgroundColor: colors.primary },
  modalBtnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
