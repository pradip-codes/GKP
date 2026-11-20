import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Image,
  Animated,
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
  fetchEmployeeIncentives,
  fetchEmployeeApplications,
  fetchEmployeeVerificationStatus,
  fetchEmployeeOnboardingStatus,
  EmployeeProfileData,
  EmployeeIncentivesResponse,
  EmployeeApplicationItem,
  VerificationStatus,
  OnboardingChecklist,
} from '../../services/employee.service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function EmployeeDashboardScreen() {
  const { colors } = useTheme();
  const { user, userRole, userDesignation, reloadUser, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);

  const [profileData, setProfileData] = useState<EmployeeProfileData | null>(null);
  const [incentiveData, setIncentiveData] = useState<EmployeeIncentivesResponse | null>(null);
  const [applications, setApplications] = useState<EmployeeApplicationItem[]>([]);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [onboardingChecklist, setOnboardingChecklist] = useState<OnboardingChecklist | null>(null);

  // Banner carousel state
  const [banners, setBanners] = useState([
    { id: 1, title: 'Credit Card Bonus', subtitle: 'Earn up to ₹3,500 per card', color: '#0F766E' },
    { id: 2, title: 'Loan Contest', subtitle: 'Top performers win rewards', color: '#7C3AED' },
    { id: 3, title: 'Smart EMI', subtitle: 'Convert spends to EMIs', color: '#059669' },
  ]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);

  const loadDashboardData = async () => {
    try {
      setError(null);
      const [profileRes, incentiveRes, appsRes, verRes, onboardRes] = await Promise.allSettled([
        fetchEmployeeProfile(),
        fetchEmployeeIncentives(),
        fetchEmployeeApplications(),
        fetchEmployeeVerificationStatus(),
        fetchEmployeeOnboardingStatus(),
      ]);

      if (profileRes.status === 'fulfilled') {
        setProfileData(profileRes.value);
      }
      if (incentiveRes.status === 'fulfilled') {
        setIncentiveData(incentiveRes.value);
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

  const totalApps = profileData?.total_applications ?? 0;
  const approvedApps = profileData?.approved_applications ?? 0;
  const pendingApps = Math.max(0, totalApps - approvedApps);
  const leadsCount = profileData?.leads_count ?? 0;
  const approvalRate = totalApps > 0 ? ((approvedApps / totalApps) * 100).toFixed(1) : '0.0';

  const totalPaidIncentive = incentiveData?.stats?.total_paid ?? profileData?.incentives_summary?.paid_incentives ?? 0;
  const pendingIncentive = incentiveData?.stats?.pending_incentive ?? profileData?.incentives_summary?.pending_incentives ?? 0;
  const totalIncentives = profileData?.incentives_summary?.total_incentives ?? (totalPaidIncentive + pendingIncentive);

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
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.avatarTouchable}
            onPress={() => setShowLogoutMenu(!showLogoutMenu)}
            activeOpacity={0.7}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(user?.full_name || user?.email || 'E')[0].toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
          {showLogoutMenu && (
            <View style={styles.logoutMenu}>
              <TouchableOpacity
                style={styles.logoutMenuItem}
                onPress={async () => {
                  setShowLogoutMenu(false);
                  await logout();
                  router.replace('/(auth)/login');
                }}
              >
                <Icon name="log-out" size={16} color={colors.error} />
                <Text style={[styles.logoutMenuText, { color: colors.error }]}>Logout</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

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
      {/* Header Section - Profile Circle Only */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.avatarTouchable}
          onPress={() => setShowLogoutMenu(!showLogoutMenu)}
          activeOpacity={0.7}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.full_name || user?.email || 'E')[0].toUpperCase()}</Text>
          </View>
        </TouchableOpacity>
        {showLogoutMenu && (
          <View style={styles.logoutMenu}>
            <TouchableOpacity
              style={styles.logoutMenuItem}
              onPress={async () => {
                setShowLogoutMenu(false);
                await logout();
                router.replace('/(auth)/login');
              }}
            >
              <Icon name="log-out" size={16} color={colors.error} />
              <Text style={[styles.logoutMenuText, { color: colors.error }]}>Logout</Text>
            </TouchableOpacity>
          </View>
        )}
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

      {/* Applications Performance Grid - Website Style */}
      <Text style={styles.sectionTitle}>Application Metrics</Text>
      <View style={styles.statsRow}>
        <TouchableOpacity style={styles.statItem} onPress={() => router.push('/(app)/applications')}>
          <View style={[styles.iconCircle, { backgroundColor: '#EEF2FF' }]}>
            <Icon name="file-text" size={18} color="#4F46E5" />
          </View>
          <Text style={styles.statValue}>{totalApps}</Text>
          <Text style={styles.statLabel}>Total Submitted</Text>
          <Text style={styles.statSublabel}>Applications logged</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statItem} onPress={() => router.push('/(app)/applications')}>
          <View style={[styles.iconCircle, { backgroundColor: '#DCFCE7' }]}>
            <Icon name="check-circle" size={18} color="#059669" />
          </View>
          <Text style={[styles.statValue, { color: '#059669' }]}>{approvedApps}</Text>
          <Text style={styles.statLabel}>Approved</Text>
          <Text style={styles.statSublabel}>Approved & Disbursed</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statItem} onPress={() => router.push('/(app)/applications')}>
          <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
            <Icon name="clock" size={18} color="#D97706" />
          </View>
          <Text style={[styles.statValue, { color: '#D97706' }]}>{pendingApps}</Text>
          <Text style={styles.statLabel}>Pending / Review</Text>
          <Text style={styles.statSublabel}>In processing queue</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statItem} onPress={() => router.push('/(app)/leads')}>
          <View style={[styles.iconCircle, { backgroundColor: '#ECFDF5' }]}>
            <Icon name="users" size={18} color="#10B981" />
          </View>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{leadsCount}</Text>
          <Text style={styles.statLabel}>Leads Captured</Text>
          <Text style={styles.statSublabel}>Customer leads</Text>
        </TouchableOpacity>
      </View>

      {/* Performance Conversion Summary */}
      <Card style={styles.performanceCard}>
        <Text style={styles.cardHeader}>Conversion Performance</Text>
        <View style={styles.perfRow}>
          <View style={styles.perfItem}>
            <Text style={styles.perfValue}>{approvalRate}%</Text>
            <Text style={styles.perfLabel}>Approval Rate</Text>
          </View>
          <View style={styles.perfDivider} />
          <View style={styles.perfItem}>
            <Text style={styles.perfValue}>{approvedApps} / {totalApps}</Text>
            <Text style={styles.perfLabel}>Conversions</Text>
          </View>
        </View>
      </Card>

      {/* Incentives Summary Card */}
      <Text style={styles.sectionTitle}>Incentive Earnings</Text>
      <Card style={styles.incentiveCard}>
        <View style={styles.incentiveHeader}>
          <Text style={styles.incentiveTitle}>Employee Incentive Wallet</Text>
          <Text style={styles.incentiveTotal}>₹{totalIncentives.toLocaleString('en-IN')}</Text>
        </View>

        <View style={styles.incentiveGrid}>
          <View style={styles.incBox}>
            <Text style={styles.incBoxLabel}>Paid / Released</Text>
            <Text style={[styles.incBoxValue, { color: colors.success }]}>₹{totalPaidIncentive.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.incBox}>
            <Text style={styles.incBoxLabel}>Pending Payout</Text>
            <Text style={[styles.incBoxValue, { color: colors.warning }]}>₹{pendingIncentive.toLocaleString('en-IN')}</Text>
          </View>
        </View>
      </Card>

      {/* Quick Launch Action Grid - Website Style */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickActionsScroll}>
        <TouchableOpacity style={styles.serviceItem} onPress={() => router.push('/(app)/add-lead')}>
          <View style={[styles.iconCircle, { backgroundColor: '#EEF2FF' }]}>
            <Icon name="user-plus" size={20} color="#4F46E5" />
          </View>
          <Text style={styles.serviceItemText}>Punch Lead</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.serviceItem} onPress={() => router.push('/(app)/applications')}>
          <View style={[styles.iconCircle, { backgroundColor: '#ECFDF5' }]}>
            <Icon name="file-text" size={20} color="#10B981" />
          </View>
          <Text style={styles.serviceItemText}>Applications</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.serviceItem} onPress={() => router.push('/(app)/employee-team')}>
          <View style={[styles.iconCircle, { backgroundColor: '#FAF5FF' }]}>
            <Icon name="users" size={20} color="#7C3AED" />
          </View>
          <Text style={styles.serviceItemText}>My Team</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.serviceItem} onPress={() => router.push('/(app)/employee-referrals')}>
          <View style={[styles.iconCircle, { backgroundColor: '#F3E8FF' }]}>
            <Icon name="share-2" size={20} color="#9333EA" />
          </View>
          <Text style={styles.serviceItemText}>Referrals</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.serviceItem} onPress={() => router.push('/(app)/leads')}>
          <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
            <Icon name="users" size={20} color="#D97706" />
          </View>
          <Text style={styles.serviceItemText}>Leads</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.serviceItem} onPress={() => router.push('/(app)/whatsapp')}>
          <View style={[styles.iconCircle, { backgroundColor: '#ECFDF5' }]}>
            <Icon name="message-circle" size={20} color="#25D366" />
          </View>
          <Text style={styles.serviceItemText}>WhatsApp</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.serviceItem} onPress={() => router.push('/(app)/finance-buddy')}>
          <View style={[styles.iconCircle, { backgroundColor: '#EFF6FF' }]}>
            <Icon name="zap" size={20} color="#2563EB" />
          </View>
          <Text style={styles.serviceItemText}>Finance Buddy</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.serviceItem} onPress={() => router.push('/(app)/notifications')}>
          <View style={[styles.iconCircle, { backgroundColor: '#FDF2F8' }]}>
            <Icon name="bell" size={20} color="#DB2777" />
          </View>
          <Text style={styles.serviceItemText}>Notifications</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Recent Submissions List */}
      <Text style={styles.sectionTitle}>Recent Application Submissions</Text>
      {applications.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText}>No applications submitted yet.</Text>
          <Button
            title="Punch First Application"
            onPress={() => router.push('/(app)/add-lead')}
            style={{ marginTop: spacing.sm }}
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
});
