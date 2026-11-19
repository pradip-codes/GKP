import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  Linking,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Icon } from '../../components/Icon';
import { ThemeToggle } from '../../components/ThemeToggle';
import {
  fetchPartnerDashboard,
  fetchPartnerWallet,
  fetchPartnerProfile,
  fetchPartnerBanners,
} from '../../services/partner.service';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = SCREEN_WIDTH - spacing.md * 2;

export default function PartnerDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [walletData, setWalletData] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [banners, setBanners] = useState<any[]>([]);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const [dashRes, walletRes, profRes, bannerRes] = await Promise.allSettled([
        fetchPartnerDashboard(),
        fetchPartnerWallet(),
        fetchPartnerProfile(),
        fetchPartnerBanners(),
      ]);

      if (dashRes.status === 'fulfilled' && dashRes.value.success) {
        setDashboardData(dashRes.value.data || dashRes.value);
      }
      if (walletRes.status === 'fulfilled' && walletRes.value.success) {
        setWalletData(walletRes.value.data || walletRes.value);
      }
      if (profRes.status === 'fulfilled' && profRes.value.success) {
        setProfileData(profRes.value.data || profRes.value);
      }
      if (bannerRes.status === 'fulfilled') {
        const list = bannerRes.value?.data;
        setBanners(Array.isArray(list) ? list : []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleBannerPress = (banner: any) => {
    const url = banner?.click_url;
    if (!url || typeof url !== 'string') return;
    const target = url.startsWith('http') ? url : `https://gharkapaisa.in${url.startsWith('/') ? '' : '/'}${url}`;
    Linking.openURL(target).catch(() => {});
  };

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading Partner Workspace...</Text>
      </View>
    );
  }

  const kpis = dashboardData?.summary || dashboardData?.kpi || dashboardData || {};
  const wallet = walletData?.wallet || walletData || {};
  const partnerProfile = profileData?.partner || user || {};

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => loadDashboard(true)} colors={[colors.primary]} />
      }
    >
      {/* Header Banner */}
      <View style={[styles.headerCard, { backgroundColor: isDark ? colors.card : colors.primaryDark, borderColor: colors.border, borderWidth: 1 }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.welcomeSubtitle}>PARTNER WORKSPACE</Text>
          <Text style={styles.welcomeTitle}>{user?.full_name || 'Partner'}</Text>
          <Text style={styles.partnerCodeText}>Code: {user?.partner_code || partnerProfile.partner_code || 'N/A'}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <ThemeToggle size="sm" />
          <View style={styles.statusBadge}>
            <Icon name="check-circle" size={12} color="#059669" />
            <Text style={styles.statusText}>VERIFIED</Text>
          </View>
        </View>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Icon name="alert-circle" size={18} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Wallet Balance Summary Card - Website Style */}
      <View style={styles.walletCard}>
        <View style={styles.walletHeader}>
          <View style={styles.walletTitleRow}>
            <View style={[styles.iconCircle, { backgroundColor: '#4F46E5' }]}>
              <Icon name="credit-card" size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.walletTitle}>Available Balance</Text>
          </View>
          <TouchableOpacity
            style={styles.walletActionBtn}
            onPress={() => router.push('/wallet')}
          >
            <Text style={styles.walletActionText}>View Wallet</Text>
            <Icon name="chevron-right" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <Text style={styles.walletBalanceAmount}>
          ₹{Number(wallet.balance || wallet.available_balance || 0).toLocaleString('en-IN')}
        </Text>

        <View style={styles.walletFooterRow}>
          <View style={styles.walletFooterCol}>
            <Text style={styles.walletFooterLabel}>Pending</Text>
            <Text style={styles.walletFooterValue}>
              ₹{Number(wallet.pending_commission || wallet.pending_balance || 0).toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.walletFooterCol}>
            <Text style={styles.walletFooterLabel}>Paid Out</Text>
            <Text style={styles.walletFooterValue}>
              ₹{Number(wallet.total_withdrawn || wallet.total_earnings || 0).toLocaleString('en-IN')}
            </Text>
          </View>
        </View>
      </View>

      {/* Offer / Campaign Banners */}
      {banners.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Offers & Updates</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled
            snapToInterval={BANNER_WIDTH + spacing.sm}
            decelerationRate="fast"
            style={styles.bannerRow}
          >
            {banners.map((banner) => (
              <TouchableOpacity
                key={String(banner.id)}
                activeOpacity={0.9}
                style={styles.bannerCard}
                onPress={() => handleBannerPress(banner)}
              >
                {banner.image_url ? (
                  <Image source={{ uri: banner.image_url }} style={styles.bannerImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.bannerImage, styles.bannerFallback]} />
                )}
                {(banner.title || banner.subtitle) ? (
                  <View style={styles.bannerOverlay}>
                    {banner.title ? <Text style={styles.bannerTitle} numberOfLines={1}>{banner.title}</Text> : null}
                    {banner.subtitle ? <Text style={styles.bannerSubtitle} numberOfLines={2}>{banner.subtitle}</Text> : null}
                  </View>
                ) : null}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      ) : null}

      {/* Quick Action Bar - Website Style */}
      <Text style={styles.sectionTitle}>Quick Access</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickActionsScroll}>
        <TouchableOpacity style={styles.serviceItem} onPress={() => router.push('/add-lead')}>
          <View style={[styles.iconCircle, { backgroundColor: '#EEF2FF' }]}>
            <Icon name="user-plus" size={20} color="#4F46E5" />
          </View>
          <Text style={styles.serviceItemText}>Punch Lead</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.serviceItem} onPress={() => router.push('/products')}>
          <View style={[styles.iconCircle, { backgroundColor: '#ECFDF5' }]}>
            <Icon name="link-2" size={20} color="#10B981" />
          </View>
          <Text style={styles.serviceItemText}>Share Products</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.serviceItem} onPress={() => router.push('/travel-utilities' as any)}>
          <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
            <Icon name="zap" size={20} color="#D97706" />
          </View>
          <Text style={styles.serviceItemText}>Utilities</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.serviceItem} onPress={() => router.push('/marketing' as any)}>
          <View style={[styles.iconCircle, { backgroundColor: '#FDF2F8' }]}>
            <Icon name="image" size={20} color="#DB2777" />
          </View>
          <Text style={styles.serviceItemText}>Creatives</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.serviceItem} onPress={() => router.push('/training' as any)}>
          <View style={[styles.iconCircle, { backgroundColor: '#F0FDF4' }]}>
            <Icon name="book-open" size={20} color="#16A34A" />
          </View>
          <Text style={styles.serviceItemText}>Training</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.serviceItem} onPress={() => router.push('/partner-kyc' as any)}>
          <View style={[styles.iconCircle, { backgroundColor: '#EFF6FF' }]}>
            <Icon name="shield" size={20} color="#2563EB" />
          </View>
          <Text style={styles.serviceItemText}>KYC Centre</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.serviceItem} onPress={() => router.push('/team')}>
          <View style={[styles.iconCircle, { backgroundColor: '#FAF5FF' }]}>
            <Icon name="users" size={20} color="#7C3AED" />
          </View>
          <Text style={styles.serviceItemText}>My Team</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.serviceItem} onPress={() => router.push('/share-tracking' as any)}>
          <View style={[styles.iconCircle, { backgroundColor: '#F3E8FF' }]}>
            <Icon name="activity" size={20} color="#9333EA" />
          </View>
          <Text style={styles.serviceItemText}>Tracking</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Performance KPIs Grid - Website Style */}
      <Text style={styles.sectionTitle}>Performance Overview</Text>
      <View style={styles.statsRow}>
        <TouchableOpacity style={styles.statItem} onPress={() => router.push('/applications')}>
          <View style={[styles.iconCircle, { backgroundColor: '#EEF2FF' }]}>
            <Icon name="users" size={18} color="#4F46E5" />
          </View>
          <Text style={styles.statValue}>{kpis.total_leads || kpis.leads_count || 0}</Text>
          <Text style={styles.statLabel}>Total Leads</Text>
          <Text style={styles.statSublabel}>This Month</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statItem} onPress={() => router.push('/applications')}>
          <View style={[styles.iconCircle, { backgroundColor: '#ECFDF5' }]}>
            <Icon name="file-text" size={18} color="#10B981" />
          </View>
          <Text style={styles.statValue}>{kpis.total_applications || kpis.applications_count || 0}</Text>
          <Text style={styles.statLabel}>Applications</Text>
          <Text style={styles.statSublabel}>This Month</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statItem} onPress={() => router.push('/applications')}>
          <View style={[styles.iconCircle, { backgroundColor: '#DCFCE7' }]}>
            <Icon name="check-circle" size={18} color="#059669" />
          </View>
          <Text style={[styles.statValue, { color: '#059669' }]}>{kpis.approved || kpis.approved_applications || 0}</Text>
          <Text style={styles.statLabel}>Approved</Text>
          <Text style={styles.statSublabel}>This Month</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statItem} onPress={() => router.push('/applications')}>
          <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
            <Icon name="clock" size={18} color="#D97706" />
          </View>
          <Text style={[styles.statValue, { color: '#D97706' }]}>{kpis.pending || kpis.pending_applications || 0}</Text>
          <Text style={styles.statLabel}>Pending</Text>
          <Text style={styles.statSublabel}>This Month</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  contentContainer: {
    padding: spacing.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: typography.sizes.sm,
    color: '#64748B',
  },
  headerCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  welcomeSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  welcomeTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  partnerCodeText: {
    fontSize: typography.sizes.xs,
    color: '#CBD5E1',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
    marginLeft: 4,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: typography.sizes.xs,
    color: colors.error,
    marginLeft: spacing.xs,
    flex: 1,
  },
  walletCard: {
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletTitle: {
    color: '#E0E7FF',
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  walletActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  walletActionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    marginRight: 2,
  },
  walletBalanceAmount: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    marginVertical: spacing.sm,
  },
  walletFooterRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    paddingTop: spacing.xs,
    marginTop: spacing.xs,
  },
  walletFooterCol: {
    flex: 1,
  },
  walletFooterLabel: {
    color: '#C7D2FE',
    fontSize: 11,
  },
  walletFooterValue: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: spacing.sm,
  },
  bannerRow: {
    marginBottom: spacing.lg,
  },
  bannerCard: {
    width: BANNER_WIDTH,
    height: 150,
    borderRadius: 16,
    marginRight: spacing.sm,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerFallback: {
    backgroundColor: '#CBD5E1',
  },
  bannerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.sm,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
    fontWeight: '700',
  },
  bannerSubtitle: {
    color: '#E2E8F0',
    fontSize: typography.sizes.xs,
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
});
