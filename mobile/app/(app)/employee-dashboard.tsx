import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { Icon } from '../../components/Icon';
import {
  fetchEmployeeProfile,
  fetchEmployeeApplications,
  fetchEmployeeVerificationStatus,
  fetchEmployeeOnboardingStatus,
  EmployeeProfileData,
  EmployeeApplicationItem,
  VerificationStatus,
  OnboardingChecklist,
} from '../../services/employee.service';
import { getTodayAttendance, AttendanceRecord } from '../../services/attendance.service';
import apiClient from '../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function EmployeeDashboardScreen() {
  const { colors, isDark } = useTheme();
  const { user, reloadUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profileData, setProfileData] = useState<EmployeeProfileData | null>(null);
  const [applications, setApplications] = useState<EmployeeApplicationItem[]>([]);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [, setOnboardingChecklist] = useState<OnboardingChecklist | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);

  // Banner carousel — API banners (/banners?page=offer) with static fallback, like the website
  const [apiBanners, setApiBanners] = useState<any[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  const STATIC_BANNERS = [
    { id: 1, title: 'Credit Card Bonus', subtitle: 'Earn up to ₹3,500 per card', color: '#0F766E' },
    { id: 2, title: 'Loan Contest', subtitle: 'Top performers win rewards', color: '#7C3AED' },
    { id: 3, title: 'Smart EMI', subtitle: 'Convert spends to EMIs', color: '#059669' },
  ];
  const banners = apiBanners.length > 0
    ? apiBanners.map((b: any, i: number) => ({
        id: b.id ?? i,
        title: b.title || b.name || 'Offer',
        subtitle: b.subtitle || b.description || '',
        color: b.theme_color || b.color || ['#0F766E', '#7C3AED', '#059669', '#B45309'][i % 4],
      }))
    : STATIC_BANNERS;

  const loadDashboardData = async () => {
    try {
      setError(null);
      const [profileRes, appsRes, verRes, onboardRes, attRes, bannersRes] = await Promise.allSettled([
        fetchEmployeeProfile(),
        fetchEmployeeApplications(),
        fetchEmployeeVerificationStatus(),
        fetchEmployeeOnboardingStatus(),
        getTodayAttendance().catch(() => null),
        apiClient.get('/banners', { params: { page: 'offer' } }).catch(() => null),
      ]);

      if (profileRes.status === 'fulfilled') {
        setProfileData(profileRes.value);
      }
      if (appsRes.status === 'fulfilled') {
        setApplications(appsRes.value);
      }
      if (verRes.status === 'fulfilled') {
        setVerificationStatus(verRes.value);
      }
      if (onboardRes.status === 'fulfilled') {
        setOnboardingChecklist(onboardRes.value);
      }
      if (attRes.status === 'fulfilled') {
        setTodayAttendance(attRes.value);
      }
      if (bannersRes.status === 'fulfilled') {
        const data = bannersRes.value?.data?.data ?? bannersRes.value?.data;
        if (Array.isArray(data) && data.length > 0) {
          setApiBanners(data);
        }
      }
    } catch (err) {
      console.error('[EmployeeDashboard] Load error:', err);
      setError('Failed to load performance metrics. Please tap retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await reloadUser();
    await loadDashboardData();
  };

  // Auto-scroll banner
  useEffect(() => {
    const interval = setInterval(() => {
      if (banners.length > 0) {
        setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const totalApps = profileData?.total_applications ?? applications.length;

  // Website parity: greeting, date, attendance + tasks status
  const firstName = (user?.full_name || user?.name || 'Employee').split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const currentDate = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const isPunchedIn = !!todayAttendance?.check_in_time;
  const isPunchedOut = !!todayAttendance?.check_out_time;
  const attStatusLabel = isPunchedOut ? 'Completed' : isPunchedIn ? 'Working' : 'Not Marked';
  const attStatusColor = isPunchedOut ? '#065F46' : isPunchedIn ? '#1D4ED8' : '#92400E';
  const attStatusBg = isPunchedOut ? '#D1FAE5' : isPunchedIn ? '#DBEAFE' : '#FEF3C7';
  const attSubtitle = isPunchedOut
    ? 'Attendance completed for today'
    : isPunchedIn
      ? `Checked in at ${String(todayAttendance?.check_in_time || '').slice(0, 5)}`
      : 'Mark your daily attendance';

  const pendingTasksCount = (verificationStatus?.missing_items || []).length;
  const taskStatusLabel = pendingTasksCount > 0 ? `${pendingTasksCount} Action Reqd` : 'Completed';
  const taskStatusColor = pendingTasksCount > 0 ? '#92400E' : '#065F46';
  const taskStatusBg = pendingTasksCount > 0 ? '#FEF3C7' : '#D1FAE5';

  // Check if employee needs onboarding
  const isVerified = verificationStatus?.overall_status === 'VERIFIED';
  const missingItems = verificationStatus?.missing_items || [];
  const isVideoRejected = verificationStatus?.video_status?.toUpperCase() === 'REJECTED' ||
                          missingItems.some(i => (i.type === 'video' || i.type === 'terms_video') && String(i.status || '').toUpperCase() === 'REJECTED');
  const needsOnboarding = !isVerified || isVideoRejected;

  const renderBannerCarousel = () => {
    return (
      <View style={styles.bannerContainer}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / (SCREEN_WIDTH - spacing.md * 2));
            setCurrentBannerIndex(index);
          }}
          style={styles.bannerScroll}
        >
          {banners.map((banner, index) => (
            <TouchableOpacity
              key={banner.id}
              style={[styles.bannerCard, { backgroundColor: banner.color }]}
              onPress={() => {
                // Navigate to relevant page based on banner
                if (banner.title.includes('Credit Card')) {
                  router.push('/(app)/employee-credit-cards');
                } else if (banner.title.includes('Loan')) {
                  router.push('/(app)/employee-loan-on-card');
                } else if (banner.title.includes('EMI')) {
                  router.push('/(app)/employee-smart-emi');
                }
              }}
            >
              <View style={styles.bannerContent}>
                <Text style={styles.bannerTitle}>{banner.title}</Text>
                <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
                <View style={styles.bannerAction}>
                  <Text style={styles.bannerActionText}>Explore →</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.bannerDots}>
          {banners.map((_, index) => (
            <View
              key={index}
              style={[
                styles.bannerDot,
                index === currentBannerIndex && styles.bannerDotActive,
              ]}
            />
          ))}
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading Personal Performance Workspace...</Text>
      </View>
    );
  }

  // Show onboarding checklist if verification is incomplete
  if (needsOnboarding) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <Card style={styles.onboardingCard}>
          <Text style={styles.onboardingTitle}>⚠️ Complete Your Onboarding</Text>
          <Text style={styles.onboardingSubtitle}>
            Please complete the following steps to activate your employee account.
          </Text>

          <View style={styles.checklistContainer}>
            {missingItems.length > 0 ? (
              missingItems.map((item, index) => (
                <View key={index} style={styles.checklistItem}>
                  <Icon
                    name={String(item.status || '').toUpperCase() === 'COMPLETED' ? 'check-circle' : 'circle'}
                    size={20}
                    color={String(item.status || '').toUpperCase() === 'COMPLETED' ? colors.success : colors.textLight}
                  />
                  <Text style={styles.checklistText}>{item.description || item.type}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.checklistText}>No missing items. Verification in progress.</Text>
            )}
          </View>

          <Button
            title="Go to Profile"
            onPress={() => router.push('/(app)/profile')}
            style={styles.onboardingButton}
          />
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Welcome Section — mirrors website EmployeeDashboard */}
      <View style={styles.welcomeRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>{greeting}, {firstName}</Text>
          <View style={styles.welcomeMetaRow}>
            <TouchableOpacity style={styles.appChip} onPress={() => router.push('/(app)/applications')} activeOpacity={0.7}>
              <Icon name="file-text" size={12} color="#7C3AED" />
              <Text style={styles.appChipLabel}>Applications:</Text>
              <Text style={styles.appChipValue}>{totalApps}</Text>
            </TouchableOpacity>
            <Text style={styles.welcomeSub}>Total submitted from your account</Text>
          </View>
        </View>
        <View style={styles.dateChip}>
          <Icon name="calendar" size={12} color={colors.primary} />
          <Text style={styles.dateChipText} numberOfLines={1}>{currentDate}</Text>
        </View>
      </View>

      {/* Top 3 Summary Cards — Attendance / Applications / Tasks */}
      <View style={styles.summaryCol}>
        <TouchableOpacity style={styles.summaryCard} onPress={() => router.push('/(app)/attendance')} activeOpacity={0.7}>
          <View style={[styles.summaryIcon, { backgroundColor: '#E8F7EF' }]}>
            <Icon name="calendar" size={20} color="#059669" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.summaryTitleRow}>
              <Text style={styles.summaryTitle}>Attendance</Text>
              <View style={[styles.summaryBadge, { backgroundColor: attStatusBg }]}>
                <Text style={[styles.summaryBadgeText, { color: attStatusColor }]}>{attStatusLabel}</Text>
              </View>
            </View>
            <Text style={styles.summarySub} numberOfLines={1}>{attSubtitle}</Text>
          </View>
          <Icon name="chevron-right" size={16} color="#059669" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.summaryCard} onPress={() => router.push('/(app)/applications')} activeOpacity={0.7}>
          <View style={[styles.summaryIcon, { backgroundColor: '#F1EBFF' }]}>
            <Icon name="file-text" size={20} color="#8B5CF6" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.summaryTitleRow}>
              <Text style={styles.summaryTitle}>Applications</Text>
              <View style={[styles.summaryBadge, { backgroundColor: '#F1EBFF' }]}>
                <Text style={[styles.summaryBadgeText, { color: '#8B5CF6' }]}>{totalApps} Applications</Text>
              </View>
            </View>
            <Text style={styles.summarySub} numberOfLines={1}>
              {totalApps} total application{totalApps === 1 ? '' : 's'} on this account
            </Text>
          </View>
          <Icon name="chevron-right" size={16} color="#8B5CF6" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.summaryCard} onPress={() => router.push('/(app)/profile')} activeOpacity={0.7}>
          <View style={[styles.summaryIcon, { backgroundColor: '#FFF1DF' }]}>
            <Icon name="checkmark-circle" size={20} color="#F59E0B" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.summaryTitleRow}>
              <Text style={styles.summaryTitle}>Tasks</Text>
              <View style={[styles.summaryBadge, { backgroundColor: taskStatusBg }]}>
                <Text style={[styles.summaryBadgeText, { color: taskStatusColor }]}>{taskStatusLabel}</Text>
              </View>
            </View>
            <Text style={styles.summarySub} numberOfLines={1}>
              {pendingTasksCount > 0 ? 'KYC / verification pending' : 'All compliance tasks completed'}
            </Text>
          </View>
          <Icon name="chevron-right" size={16} color="#F59E0B" />
        </TouchableOpacity>
      </View>

      {/* Banner Carousel */}
      {renderBannerCarousel()}

      {/* Error Alert with Retry */}
      {error ? (
        <Card style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Retry Loading" onPress={loadDashboardData} variant="outline" style={{ marginTop: spacing.xs }} />
        </Card>
      ) : null}

      {/* Explore services — mirrors website EmployeeDashboard grid */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Explore services</Text>
        <TouchableOpacity onPress={() => router.push('/(app)/employee-credit-cards')}>
          <Text style={styles.sectionLink}>View all services →</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.servicesGrid}>
        {[
          { icon: 'card', color: '#8B5CF6', bg: '#F1EBFF', title: 'Credit Cards', desc: 'Premium pre-approved credit cards', route: '/(app)/employee-credit-cards' },
          { icon: 'cash', color: '#059669', bg: '#E8F7EF', title: 'Personal Loan', desc: 'Instant disbursement with lowest rate', route: '/(app)/employee-loans' },
          { icon: 'card', color: '#3B82F6', bg: '#EAF2FF', title: 'Loan on Credit Card', desc: 'Instant limit-backed cash loans', route: '/(app)/employee-loan-on-card' },
          { icon: 'phone-portrait', color: '#F59E0B', bg: '#FFF1DF', title: 'Smart EMI', desc: 'Convert transactions to monthly EMI', route: '/(app)/employee-smart-emi' },
          { icon: 'shield', color: '#F97316', bg: '#FFF1DF', title: 'Insurance', desc: 'Life, health & vehicle insurance', route: '/(app)/employee-insurance' },
          { icon: 'business', color: '#0D9488', bg: '#CCFBF1', title: 'All Loans', desc: 'Business, home & collateral loans', route: '/(app)/employee-loans' },
        ].map((service) => (
          <TouchableOpacity
            key={service.title}
            style={[styles.serviceCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(service.route as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.serviceIconBox, { backgroundColor: service.bg }]}>
              <Icon name={service.icon as any} size={20} color={service.color} />
            </View>
            <Text style={[styles.serviceTitle, { color: colors.text }]}>{service.title}</Text>
            <Text style={[styles.serviceDesc, { color: colors.textMid }]} numberOfLines={2}>{service.desc}</Text>
            <View style={styles.serviceExploreRow}>
              <Text style={[styles.serviceExplore, { color: colors.primary }]}>Explore</Text>
              <Icon name="arrow-forward" size={11} color={colors.primary} />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quick actions — mirrors website EmployeeDashboard list */}
      <Text style={styles.sectionTitle}>Quick actions</Text>
      <View style={styles.quickActionsCol}>
        {[
          { icon: 'file-text', color: '#8B5CF6', bg: '#F1EBFF', title: 'My Applications', desc: 'Track and submit client applications', route: '/(app)/applications' },
          { icon: 'calendar', color: '#059669', bg: '#E8F7EF', title: 'Mark Attendance', desc: 'Daily check-in & check-out', route: '/(app)/attendance' },
          { icon: 'stats-chart', color: '#F59E0B', bg: '#FFF1DF', title: 'View Sales Report', desc: 'Commission & performance insights', route: '/(app)/employee-sales-report' },
          { icon: 'people', color: '#3B82F6', bg: '#EAF2FF', title: 'My Team', desc: 'Team members & partner network', route: '/(app)/employee-team' },
          { icon: 'gift', color: '#EC4899', bg: '#FCE7F3', title: 'My Incentives', desc: 'Earnings, contests & bonus ledger', route: '/(app)/employee-incentives' },
          { icon: 'chatbubble', color: '#6366F1', bg: '#EEF2FF', title: 'Team Messenger', desc: 'Direct staff messaging & queries', route: '/(app)/messenger' },
        ].map((action) => (
          <TouchableOpacity
            key={action.title}
            style={[styles.actionRow, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(action.route as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconBox, { backgroundColor: action.bg }]}>
              <Icon name={action.icon as any} size={18} color={action.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionTitle, { color: colors.text }]}>{action.title}</Text>
              <Text style={[styles.actionDesc, { color: colors.textMid }]} numberOfLines={1}>{action.desc}</Text>
            </View>
            <Icon name="chevron-right" size={16} color={colors.textLight} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Account Applications — mirrors website "Account Applications" card */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Account Applications</Text>
        <TouchableOpacity onPress={() => router.push('/(app)/applications')}>
          <Text style={styles.sectionLink}>View all →</Text>
        </TouchableOpacity>
      </View>
      {applications.length === 0 ? (
        <Card style={[styles.emptyCard, { backgroundColor: colors.bg }]}>
          <Text style={{ fontSize: 26, marginBottom: 6 }}>📂</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No recent activity</Text>
          <Text style={[styles.emptyText, { marginBottom: 12 }]}>
            Submit leads for credit cards and loans to start earning incentives.
          </Text>
          <Button
            title="Submit First Application"
            onPress={() => router.push('/(app)/employee-credit-cards')}
            style={{ marginTop: 0 }}
          />
        </Card>
      ) : (
        applications.slice(0, 5).map((app) => (
          <TouchableOpacity
            key={app.id}
            onPress={() => router.push(`/(app)/application-details?id=${app.id}` as any)}
            activeOpacity={0.7}
          >
            <Card style={styles.appItemCard}>
              <View style={styles.appHeader}>
                <Text style={styles.appNumber}>{app.app_number}</Text>
                <StatusBadge status={app.status} />
              </View>
              <Text style={styles.appCustomer}>{app.customer_name} ({app.customer_mobile})</Text>
              <Text style={styles.appProduct}>{app.product_name} {app.bank_name ? `• ${app.bank_name}` : ''}</Text>
            </Card>
          </TouchableOpacity>
        ))
      )}

      {/* Tips / Action Required — mirrors website dashboard tip card */}
      <View style={[styles.tipCard, { backgroundColor: isDark ? colors.card : '#F0FDF4', borderColor: isDark ? colors.border : '#BBF7D0' }]}>
        <View style={styles.tipHeader}>
          <View style={[styles.tipIcon, { backgroundColor: colors.primary }]}>
            <Icon name="flash" size={16} color="#fff" />
          </View>
          <View>
            <Text style={[styles.tipTitle, { color: colors.text }]}>
              {pendingTasksCount > 0 ? 'Action Required' : !isPunchedIn ? 'Daily Reminder' : 'Performance Tip'}
            </Text>
            <Text style={[styles.tipSub, { color: colors.textMid }]}>GharKaPaisa Employee Portal</Text>
          </View>
        </View>
        <Text style={[styles.tipBody, { color: colors.textMid }]}>
          {pendingTasksCount > 0
            ? 'Complete your KYC documents and teleprompter video verification to unlock full privileges and instant commission payouts.'
            : !isPunchedIn
              ? "You haven't punched today's attendance. Check in with facial biometric verification to record your working presence."
              : 'Pre-approved lifetime free credit cards and instant personal loans are currently offering high payout rates. Recommend them to your clients today.'}
        </Text>
        <TouchableOpacity
          style={[styles.tipBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            if (pendingTasksCount > 0) router.push('/(app)/profile' as any);
            else if (!isPunchedIn) router.push('/(app)/attendance' as any);
            else router.push('/(app)/employee-credit-cards' as any);
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.tipBtnText}>
            {pendingTasksCount > 0 ? 'Complete Verification' : !isPunchedIn ? 'Punch Attendance' : 'Explore Products'}
          </Text>
          <Icon name="arrow-forward" size={13} color="#fff" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textMid,
    fontSize: typography.sizes.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTouchable: {
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: '#FFF',
  },
  logoutMenu: {
    position: 'absolute',
    top: 56,
    left: 0,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: spacing.xs,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  logoutMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  logoutMenuText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  errorCard: {
    borderColor: colors.danger,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.sizes.xs,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    padding: spacing.sm,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: colors.text,
    marginTop: 2,
  },
  statSublabel: {
    fontSize: 9.5,
    color: colors.textLight,
    marginTop: 2,
  },
  performanceCard: {
    marginTop: spacing.xs,
  },
  cardHeader: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  perfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: spacing.xs,
  },
  perfItem: {
    alignItems: 'center',
  },
  perfValue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  perfLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textLight,
    marginTop: 2,
  },
  perfDivider: {
    width: 1,
    height: 35,
    backgroundColor: colors.border,
  },
  incentiveCard: {
    backgroundColor: colors.card,
    borderColor: colors.primary,
  },
  incentiveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  incentiveTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  incentiveTotal: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.success,
  },
  incentiveGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  incBox: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.xs,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  incBoxLabel: {
    fontSize: typography.sizes.xs - 1,
    color: colors.textLight,
  },
  incBoxValue: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    marginTop: 2,
  },
  quickActionsScroll: {
    marginBottom: spacing.lg,
  },
  serviceItem: {
    alignItems: 'center',
    marginRight: spacing.md,
  },
  serviceItemText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginTop: 4,
  },
  actionCard: {
    marginTop: spacing.xs,
  },
  actionGrid: {
    gap: spacing.xs,
  },
  actionBtn: {
    marginTop: spacing.xs,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.md,
  },
  emptyText: {
    color: colors.textMid,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: spacing.xs,
  },
  appItemCard: {
    marginBottom: spacing.xs,
  },
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  appNumber: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  appCustomer: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  appProduct: {
    fontSize: typography.sizes.xs,
    color: colors.textMid,
    marginTop: 2,
  },
  onboardingCard: {
    alignItems: 'center',
    padding: spacing.lg,
    borderColor: colors.warning,
    borderWidth: 2,
  },
  onboardingTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: spacing.md,
  },
  onboardingSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textMid,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  checklistContainer: {
    width: '100%',
    marginTop: spacing.md,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  checklistText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  onboardingButton: {
    marginTop: spacing.md,
  },
  // Banner Carousel Styles
  bannerContainer: {
    marginBottom: spacing.md,
  },
  bannerScroll: {
    flexDirection: 'row',
  },
  bannerCard: {
    width: SCREEN_WIDTH - spacing.md * 2,
    height: 140,
    borderRadius: 16,
    marginHorizontal: spacing.md,
    padding: spacing.lg,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  bannerContent: {
    flex: 1,
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: spacing.sm,
  },
  bannerAction: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bannerActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bannerDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  bannerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginHorizontal: 3,
  },
  bannerDotActive: {
    backgroundColor: colors.primary,
    width: 20,
  },
  // Website-parity dashboard styles
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  welcomeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  appChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: '#7C3AED30',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  appChipLabel: { fontSize: 12, fontWeight: '700', color: '#7C3AED' },
  appChipValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#7C3AED',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  welcomeSub: { fontSize: 11, color: colors.textMid, fontWeight: '500' },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    maxWidth: 190,
  },
  dateChipText: { fontSize: 11, color: colors.textMid, fontWeight: '600', flexShrink: 1 },
  summaryCol: { gap: spacing.sm, marginBottom: spacing.md },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
  },
  summaryIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  summaryBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  summaryBadgeText: { fontSize: 10, fontWeight: '800' },
  summarySub: { fontSize: 12, color: colors.textMid },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  sectionLink: { fontSize: 12, fontWeight: '600', color: colors.primary },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.sm,
  },
  serviceCard: {
    width: '48.5%',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 2,
  },
  serviceIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  serviceTitle: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  serviceDesc: { fontSize: 11.5, lineHeight: 16, marginBottom: 8, minHeight: 32 },
  serviceExploreRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  serviceExplore: { fontSize: 12, fontWeight: '600' },
  quickActionsCol: { gap: spacing.sm, marginBottom: spacing.md },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  actionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTitle: { fontSize: 13.5, fontWeight: '700', marginBottom: 1 },
  actionDesc: { fontSize: 11.5 },
  tipCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  tipIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  tipTitle: { fontSize: 15, fontWeight: '700' },
  tipSub: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  tipBody: { fontSize: 13, lineHeight: 20, marginBottom: 14 },
  tipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
  },
  tipBtnText: { color: '#fff', fontSize: 13.5, fontWeight: '600' },
});
