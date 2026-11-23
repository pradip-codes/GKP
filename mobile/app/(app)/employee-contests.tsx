import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Image,
  Linking,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { Icon } from '../../components/Icon';
import { spacing } from '../../theme/spacing';
import apiClient from '../../services/api';
import { resolveMediaUrl } from '../../services/messenger.service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ACCENT = '#0F766E';

interface ContestProgress {
  current_value: number;
  target_value: number;
  percentage: number;
  qualified: boolean;
  remaining: number;
}

interface Contest {
  id: string;
  title: string;
  short_description?: string;
  description?: string;
  image_url?: string;
  contest_type?: string;
  target_value: number;
  target_unit?: string;
  reward_type?: string;
  reward_value?: number | string;
  start_date: string;
  end_date: string;
  department_id?: string;
  eligible_employees?: string;
  status?: string;
  progress?: ContestProgress;
}

type TabId = 'ACTIVE' | 'UPCOMING' | 'COMPLETED';

// Website fallback mocks (EmployeeContests.jsx getMockContests)
const getMockContests = (): Contest[] => [
  {
    id: 'mock-1',
    title: 'Credit Card Champions 2026',
    short_description: 'Achieve your monthly credit card target and unlock cash rewards & bonuses.',
    description: 'Supercharge your performance this month! Submit approved credit card applications to climb the leaderboard. Applications approved between the start and end dates will automatically count towards your progress.',
    image_url: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1200&q=80',
    contest_type: 'credit_card',
    target_value: 50,
    target_unit: 'Approved Applications',
    reward_type: 'Fixed Cash Reward',
    reward_value: 5000,
    start_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
    department_id: 'Credit Cards',
    eligible_employees: 'All Active Sales Employees',
    status: 'ACTIVE',
    progress: { current_value: 30, target_value: 50, percentage: 60, qualified: false, remaining: 20 },
  },
  {
    id: 'mock-2',
    title: 'Loan Sprint Extravaganza',
    short_description: 'Disburse personal and business loans to win premium gadget vouchers.',
    description: 'Drive high value loan disbursements during the contest window to claim top tier electronics and bonus vouchers.',
    image_url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80',
    contest_type: 'loans',
    target_value: 10,
    target_unit: 'Disbursed Loans',
    reward_type: 'Gadget Voucher + Cash',
    reward_value: 10000,
    start_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000).toISOString(),
    department_id: 'Loans',
    eligible_employees: 'All Loan Executives',
    status: 'UPCOMING',
    progress: { current_value: 0, target_value: 10, percentage: 0, qualified: false, remaining: 10 },
  },
];

// Website parity: category derived from dates, not just status field
const getContestCategory = (c: Contest): TabId => {
  const now = new Date();
  const start = new Date(c.start_date);
  const end = new Date(c.end_date);
  if (c.status === 'COMPLETED' || now > end) return 'COMPLETED';
  if (c.status === 'UPCOMING' || now < start) return 'UPCOMING';
  return 'ACTIVE';
};

const getDaysRemaining = (endDateStr: string) => {
  const diffMs = new Date(endDateStr).getTime() - Date.now();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (days < 0) return 'Ended';
  if (days === 0) return 'Ends Today';
  return `${days} Days Left`;
};

const rewardLabel = (c: Contest) => {
  if (c.reward_type === 'Fixed Cash Reward' || c.reward_type === 'Fixed Amount') {
    const v = parseFloat(String(c.reward_value || 0));
    return isNaN(v) ? String(c.reward_value || '') : `₹${v.toLocaleString('en-IN')}`;
  }
  return String(c.reward_value || c.reward_type || '—');
};

export default function EmployeeContestsScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabId>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);

  // Banner carousel — /banners?page=employee like PartnerBannerCarousel
  const [banners, setBanners] = useState<any[]>([]);
  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerRef = useRef<any>(null);
  const bannerTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadContests = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const res = await apiClient.get('/contests');
      if (res.data?.success) {
        setContests(res.data.data || []);
      } else {
        setContests(getMockContests());
      }
    } catch (err) {
      console.warn('Using fallback mock contests:', err);
      setContests(getMockContests());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadBanners = useCallback(async () => {
    try {
      const res = await apiClient.get('/banners', { params: { page: 'employee' } });
      if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        setBanners(res.data.data.map((b: any) => ({
          id: `dynamic-${b.id}`,
          image: resolveMediaUrl(b.image_url),
          title: b.title,
          subtitle: b.subtitle,
          btn_text: b.btn_text,
          link: b.click_url || '/credit-cards',
        })));
      }
    } catch (err) {
      console.warn('Contest banners fetch failed:', err);
    }
  }, []);

  useEffect(() => {
    loadContests();
    loadBanners();
  }, [loadContests, loadBanners]);

  // Auto-rotate banners
  useEffect(() => {
    if (banners.length <= 1) return;
    bannerTimer.current = setInterval(() => {
      setBannerIndex((prev) => {
        const next = (prev + 1) % banners.length;
        bannerRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
        return next;
      });
    }, 4000);
    return () => { if (bannerTimer.current) clearInterval(bannerTimer.current); };
  }, [banners.length]);

  const filteredContests = contests.filter((c) => {
    const matchesTab = getContestCategory(c) === activeTab;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      c.title?.toLowerCase().includes(q) ||
      c.short_description?.toLowerCase().includes(q) ||
      c.department_id?.toLowerCase().includes(q);
    return matchesTab && matchesSearch;
  });

  const handleBannerPress = (link?: string) => {
    if (!link) return;
    if (link.startsWith('http')) Linking.openURL(link).catch(() => {});
    else router.push(link as any);
  };

  const tabConfigs: { id: TabId; label: string; icon: string; color: string }[] = [
    { id: 'ACTIVE', label: 'Active Contests', icon: 'flame', color: '#EF4444' },
    { id: 'UPCOMING', label: 'Upcoming Contests', icon: 'time', color: '#F59E0B' },
    { id: 'COMPLETED', label: 'Completed Contests', icon: 'checkmark-circle', color: '#10B981' },
  ];

  const cardBg = isDark ? '#1E293B' : '#FFFFFF';
  const borderCol = colors.border;

  const renderContestCard = (contest: Contest) => {
    const progress: ContestProgress = contest.progress || {
      current_value: 0,
      target_value: contest.target_value,
      percentage: 0,
      qualified: false,
      remaining: contest.target_value,
    };
    const isCompleted = activeTab === 'COMPLETED';
    const imgUri = resolveMediaUrl(contest.image_url) || 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1200&q=80';
    const badgeBg = activeTab === 'ACTIVE' ? ['#EF4444', '#DC2626'] : activeTab === 'UPCOMING' ? ['#F59E0B', '#D97706'] : ['#10B981', '#059669'];

    return (
      <View key={contest.id} style={[styles.contestCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
        {/* Image banner with status overlay — website 12:5 ratio */}
        <View style={styles.imgBanner}>
          <Image source={{ uri: imgUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <View style={[styles.statusBadge, { backgroundColor: badgeBg[0] }]}>
            <Icon name={activeTab === 'ACTIVE' ? 'flame' : activeTab === 'UPCOMING' ? 'time' : 'checkmark-circle'} size={11} color="#fff" />
            <Text style={styles.statusBadgeText}>
              {activeTab === 'ACTIVE' ? getDaysRemaining(contest.end_date) : activeTab}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={[styles.contestTitle, { color: colors.text }]}>{contest.title}</Text>
          <Text style={[styles.contestDesc, { color: isDark ? '#94A3B8' : '#64748B' }]} numberOfLines={3}>
            {contest.short_description || contest.description}
          </Text>

          {/* Reward badge */}
          <View style={[styles.rewardBox, {
            backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : '#FEF3C7',
            borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A',
          }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="sparkles" size={15} color="#D97706" />
              <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? '#FBBF24' : '#92400E' }}>Reward Prize:</Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: '900', color: isDark ? '#FBBF24' : '#B45309' }} numberOfLines={1}>
              {rewardLabel(contest)}
            </Text>
          </View>

          {/* Progress — hidden for completed */}
          {!isCompleted && (
            <View style={{ marginBottom: 14 }}>
              <View style={styles.progressHeader}>
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.text }}>Your Target Progress:</Text>
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: ACCENT }}>
                  {progress.current_value} / {progress.target_value} {contest.target_unit || 'Apps'}
                </Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}>
                <View style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, progress.percentage)}%`,
                    backgroundColor: progress.qualified ? '#10B981' : ACCENT,
                  },
                ]} />
              </View>
              <Text style={{
                fontSize: 11.5, fontWeight: '600', marginTop: 6,
                color: progress.qualified ? '#10B981' : (isDark ? '#94A3B8' : '#64748B'),
              }}>
                {progress.qualified
                  ? '🎉 Target Achieved! Reward Qualified.'
                  : `${progress.remaining} more needed to reach target! (${progress.percentage}% completed)`}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.detailsBtn, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}
            onPress={() => setSelectedContest(contest)}
          >
            <Icon name="information-circle" size={15} color={colors.text} />
            <Text style={[styles.detailsBtnText, { color: colors.text }]}>View Contest Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const sel = selectedContest;
  const selProgress: ContestProgress | undefined = sel?.progress;
  const selImg = sel ? (resolveMediaUrl(sel.image_url) || 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1200&q=80') : '';

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadContests(true)} tintColor="#fff" />}
      >
        {/* Hero header — website teal gradient */}
        <View style={styles.hero}>
          <View style={styles.heroLeft}>
            <View style={styles.heroIconBox}>
              <Icon name="trophy" size={22} color="#F59E0B" />
            </View>
            <View>
              <Text style={styles.heroTitle}>Employee Contests</Text>
              <Text style={styles.heroSub}>Participate • Achieve Targets • Earn Rewards & Recognition</Text>
            </View>
          </View>
          <View style={styles.heroSearch}>
            <Icon name="search" size={16} color="#94A3B8" />
            <TextInput
              style={styles.heroSearchInput}
              placeholder="Search contests..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Banner carousel — /banners?page=employee */}
        {banners.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <ScrollView
              ref={bannerRef as any}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setBannerIndex(idx);
              }}
            >
              {banners.map((b) => (
                <TouchableOpacity key={b.id} style={{ width: SCREEN_WIDTH - 32 }} onPress={() => handleBannerPress(b.link)} activeOpacity={0.9}>
                  <Image source={{ uri: b.image }} style={styles.bannerImg} resizeMode="cover" />
                  {(b.title || b.subtitle) ? (
                    <View style={styles.bannerCaption}>
                      {!!b.title && <Text style={styles.bannerTitle} numberOfLines={1}>{b.title}</Text>}
                      {!!b.subtitle && <Text style={styles.bannerSub} numberOfLines={1}>{b.subtitle}</Text>}
                    </View>
                  ) : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.dotsRow}>
              {banners.map((_, i) => (
                <View key={i} style={[styles.dot, i === bannerIndex && styles.dotActive]} />
              ))}
            </View>
          </View>
        )}

        {/* Status tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
          {tabConfigs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabBtn, isActive && { backgroundColor: ACCENT }]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Icon name={tab.icon} size={15} color={isActive ? '#fff' : tab.color} />
                <Text style={[styles.tabBtnText, { color: isActive ? '#fff' : (isDark ? '#94A3B8' : '#64748B') }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Contests grid (single column on mobile like website isMobile) */}
        {loading ? (
          <View style={styles.stateWrap}>
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? '#94A3B8' : '#64748B', marginTop: 10 }}>
              Loading active contests...
            </Text>
          </View>
        ) : filteredContests.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <Icon name="trophy" size={44} color={isDark ? '#94A3B8' : '#64748B'} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No {activeTab.toLowerCase()} contests found</Text>
            <Text style={[styles.emptySub, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              Check back soon for new contests and reward opportunities.
            </Text>
          </View>
        ) : (
          filteredContests.map(renderContestCard)
        )}
      </ScrollView>

      {/* Contest detail modal */}
      <Modal visible={!!sel} transparent animationType="slide" onRequestClose={() => setSelectedContest(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            {sel && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 18, gap: 16 }}>
                {/* Image header with gradient + title */}
                <View style={styles.modalImgWrap}>
                  <Image source={{ uri: selImg }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  <View style={styles.modalImgGradient} />
                  <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedContest(null)}>
                    <Icon name="close" size={16} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.modalImgTitle}>{sel.title}</Text>
                </View>

                <View>
                  <Text style={[styles.modalSectionLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Contest Description & Rules</Text>
                  <Text style={{ fontSize: 14, color: colors.text, lineHeight: 22 }}>
                    {sel.description || sel.short_description}
                  </Text>
                </View>

                {/* Details grid */}
                <View style={[styles.detailsGrid, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: borderCol }]}>
                  <View>
                    <Text style={[styles.detailLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Target Goal:</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{sel.target_value} {sel.target_unit || 'Approved Apps'}</Text>
                  </View>
                  <View>
                    <Text style={[styles.detailLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Reward Prize:</Text>
                    <Text style={[styles.detailValue, { color: '#10B981' }]}>{rewardLabel(sel)}</Text>
                  </View>
                  <View>
                    <Text style={[styles.detailLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Department / Category:</Text>
                    <Text style={[styles.detailValue, { color: colors.text, fontSize: 13.5 }]}>{sel.department_id || 'All'}</Text>
                  </View>
                  <View>
                    <Text style={[styles.detailLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Eligible Employees:</Text>
                    <Text style={[styles.detailValue, { color: colors.text, fontSize: 13.5 }]}>{sel.eligible_employees || 'All'}</Text>
                  </View>
                </View>

                {/* Duration */}
                <View style={[styles.durationBox, { backgroundColor: `${ACCENT}15`, borderColor: `${ACCENT}30` }]}>
                  <Icon name="calendar" size={16} color={ACCENT} />
                  <Text style={[styles.durationText, { color: ACCENT }]}>
                    Valid From: {new Date(sel.start_date).toLocaleDateString('en-IN')} to {new Date(sel.end_date).toLocaleDateString('en-IN')}
                  </Text>
                </View>

                {/* Progress in modal if present */}
                {selProgress && getContestCategory(sel) !== 'COMPLETED' && (
                  <View style={{ gap: 6 }}>
                    <View style={styles.progressHeader}>
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.text }}>Your Target Progress:</Text>
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: ACCENT }}>
                        {selProgress.current_value} / {selProgress.target_value} {sel.target_unit || 'Apps'}
                      </Text>
                    </View>
                    <View style={[styles.progressTrack, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}>
                      <View style={[styles.progressFill, { width: `${Math.min(100, selProgress.percentage)}%`, backgroundColor: selProgress.qualified ? '#10B981' : ACCENT }]} />
                    </View>
                    <Text style={{ fontSize: 11.5, fontWeight: '600', color: selProgress.qualified ? '#10B981' : (isDark ? '#94A3B8' : '#64748B') }}>
                      {selProgress.qualified
                        ? '🎉 Target Achieved! Reward Qualified.'
                        : `${selProgress.remaining} more needed to reach target! (${selProgress.percentage}% completed)`}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.backBtn, { borderColor: borderCol, backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}
                  onPress={() => setSelectedContest(null)}
                >
                  <Icon name="arrow-left" size={16} color={colors.text} />
                  <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>Back to Contests</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xxl },
  // Hero
  hero: {
    margin: spacing.md,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 22,
    backgroundColor: '#0F766E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  heroLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  heroIconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: -0.4 },
  heroSub: { fontSize: 11.5, color: 'rgba(255,255,255,0.9)', fontWeight: '500', marginTop: 3, maxWidth: 210 },
  heroSearch: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9,
    width: 150,
  },
  heroSearchInput: { flex: 1, fontSize: 12.5, fontWeight: '600', color: '#0F172A' },
  // Banners
  bannerImg: { width: SCREEN_WIDTH - 32, height: 150, borderRadius: 16, marginHorizontal: 16 },
  bannerCaption: {
    position: 'absolute', left: 28, right: 28, bottom: 12,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
  },
  bannerTitle: { color: '#fff', fontSize: 13, fontWeight: '800' },
  bannerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 1 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 8, gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#CBD5E1' },
  dotActive: { width: 18, backgroundColor: ACCENT },
  // Tabs
  tabsRow: { paddingHorizontal: spacing.md, gap: 8, paddingBottom: 14 },
  tabBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
  },
  tabBtnText: { fontSize: 13, fontWeight: '700' },
  // States
  stateWrap: { alignItems: 'center', paddingVertical: 60 },
  emptyCard: {
    marginHorizontal: spacing.md, borderRadius: 16, borderWidth: 1,
    paddingVertical: 56, alignItems: 'center', gap: 6,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySub: { fontSize: 13, textAlign: 'center', paddingHorizontal: 30 },
  // Contest card
  contestCard: {
    marginHorizontal: spacing.md, marginBottom: 16,
    borderRadius: 18, borderWidth: 1, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  imgBanner: { width: '100%', aspectRatio: 12 / 5, backgroundColor: '#0F172A', overflow: 'hidden' },
  statusBadge: {
    position: 'absolute', top: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  statusBadgeText: { color: '#fff', fontSize: 10.5, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  cardBody: { padding: 18, gap: 0 },
  contestTitle: { fontSize: 16.5, fontWeight: '800', lineHeight: 22, marginBottom: 8 },
  contestDesc: { fontSize: 13, lineHeight: 19, marginBottom: 14 },
  rewardBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 14,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressTrack: { height: 10, borderRadius: 10, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 10 },
  detailsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 11, borderRadius: 12, marginTop: 4,
  },
  detailsBtnText: { fontSize: 13, fontWeight: '800' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16 },
  modalCard: { borderRadius: 22, borderWidth: 1, maxHeight: '90%' },
  modalImgWrap: { height: 170, borderRadius: 14, overflow: 'hidden', marginBottom: 4 },
  modalImgGradient: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'transparent',
  },
  modalCloseBtn: {
    position: 'absolute', top: 12, right: 12,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center', justifyContent: 'center',
  },
  modalImgTitle: {
    position: 'absolute', bottom: 14, left: 16, right: 16,
    color: '#fff', fontSize: 19, fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  modalSectionLabel: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', marginBottom: 6 },
  detailsGrid: {
    borderRadius: 14, borderWidth: 1, padding: 14, gap: 12,
    flexDirection: 'row', flexWrap: 'wrap',
  },
  detailLabel: { fontSize: 11.5, fontWeight: '600' },
  detailValue: { fontSize: 14, fontWeight: '800', marginTop: 2 },
  durationBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1,
  },
  durationText: { fontSize: 13, fontWeight: '700', flex: 1 },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderRadius: 12, borderWidth: 1, marginTop: 4,
  },
});
