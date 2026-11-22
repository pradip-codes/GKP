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
import { PartnerTopBar } from '../../components/PartnerTopBar';
import {
  fetchPartnerDashboard,
  fetchPartnerWallet,
  fetchPartnerProfile,
  fetchPartnerBanners,
} from '../../services/partner.service';
import { fetchLeads } from '../../services/lead.service';
import { API_BASE_URL } from '../../services/api';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTENT_WIDTH = SCREEN_WIDTH - spacing.md * 2;
const GRID_GAP = 12;
const EARN_CARD_WIDTH = (CONTENT_WIDTH - GRID_GAP) / 2;
const BANNER_HEIGHT = 190;

// Local banner assets (same images the website maps by filename)
const localBannerMap: Record<string, any> = {
  'lifetimefree card.png': require('../../assets/images/lifetimefree card.png'),
  'loan.png': require('../../assets/images/loan.png'),
  'insurance.png': require('../../assets/images/insurance.png'),
  'smart emi.png': require('../../assets/images/smart emi.png'),
  'emi.jpeg': require('../../assets/images/emi.jpeg'),
  'hdfc pixel card.png': require('../../assets/images/hdfc pixel card.png'),
  'offerbanner.png': require('../../assets/images/offerbanner.png'),
};

const offerFallbackBanners = [
  { title: 'Lifetime Free Credit Cards', image_url: 'lifetimefree card.png', click_url: '/products?category=credit_card' },
  { title: 'Instant Personal Loans', image_url: 'loan.png', click_url: '/products?category=personal_loan' },
  { title: 'Smart EMI Credit Cards', image_url: 'smart emi.png', click_url: '/products?category=credit_card' },
  { title: 'HDFC Bank Pixel Credit Card', image_url: 'hdfc pixel card.png', click_url: '/products?category=credit_card' },
  { title: 'Exclusive Financial Offers', image_url: 'offerbanner.png', click_url: '/products' },
];

const teamFallbackBanners = [
  { id: 'team-2', image: require('../../assets/images/team-banner.webp'), alt: 'Team Growth & Rewards', link: '/team' },
  { id: 'refer', image: require('../../assets/images/reference-banner.webp'), alt: 'Refer and Earn', link: '/team' },
];

const resolveBannerSource = (url: any): any => {
  if (!url) return localBannerMap['offerbanner.png'];
  const rawUrl = typeof url === 'string' ? url : url.image_url || url.image || '';
  if (!rawUrl) return localBannerMap['offerbanner.png'];
  if (localBannerMap[rawUrl]) return localBannerMap[rawUrl];
  const filename = String(rawUrl).split('/').pop()?.split('\\').pop() || '';
  if (localBannerMap[filename]) return localBannerMap[filename];
  try {
    const decoded = decodeURIComponent(filename);
    if (localBannerMap[decoded]) return localBannerMap[decoded];
  } catch (_) {}
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) return { uri: rawUrl };
  if (rawUrl.startsWith('/')) {
    const origin = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
    return { uri: `${origin}${rawUrl}` };
  }
  return localBannerMap['offerbanner.png'];
};

// Map website routes to mobile routes
const resolveMobileRoute = (url: string): string => {
  if (!url) return '/products';
  let route = url;
  route = route.replace('/partner/credit-cards', '/(auth)/bank-cards')
    .replace('/partner/products', '/products')
    .replace('/partner/team-network', '/team')
    .replace('/partner/kyc-centre', '/partner-kyc')
    .replace('/partner/applications', '/applications')
    .replace('/partner/customers', '/customers')
    .replace('/credit-cards', '/(auth)/bank-cards')
    .replace('/loans', '/products?category=personal_loan')
    .replace('/partner/', '/');
  if (!route.startsWith('/')) route = `/${route}`;
  return route;
};

const handleBannerLink = (url: any, router: any) => {
  if (!url || typeof url !== 'string') return;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    Linking.openURL(url).catch(() => {});
    return;
  }
  router.push(resolveMobileRoute(url) as any);
};

// ── Auto-rotating banner slider (matches website PartnerBannerCarousel) ──
function BannerSlider({ slides, height = BANNER_HEIGHT, borderRadius = 24, fit = 'cover', bgColor }: { slides: any[]; height?: number; borderRadius?: number; fit?: 'cover' | 'contain'; bgColor?: string }) {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (!slides.length) return null;

  return (
    <View style={[styles.sliderWrap, { height, borderRadius, borderColor: colors.border, backgroundColor: bgColor || (isDark ? colors.card : '#FFFFFF') }]}>
      {slides.map((slide, idx) => {
        if (idx !== index) return null;
        const source = slide.image || resolveBannerSource(slide.image_url || slide.bgImage);
        return (
          <TouchableOpacity
            key={slide.id || idx}
            activeOpacity={0.95}
            onPress={() => handleBannerLink(slide.click_url || slide.link || slide.action, router)}
            style={StyleSheet.absoluteFill}
          >
            <Image source={source} style={styles.sliderImage} resizeMode={fit} />
            {(slide.title || slide.subtitle) ? (
              <View style={styles.sliderOverlay}>
                {slide.title ? <Text style={styles.sliderTitle} numberOfLines={1}>{slide.title}</Text> : null}
                {slide.subtitle ? <Text style={styles.sliderSubtitle} numberOfLines={1}>{slide.subtitle}</Text> : null}
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
      {slides.length > 1 && (
        <View style={styles.dotsRow} pointerEvents="box-none">
          {slides.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setIndex(i)}
              style={[styles.dot, i === index && styles.dotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ── Earn Card (SELL & EARN grid) ──
function EarnCard({ title, value, valueColor, bg, color, icon, onPress, cardBg, borderColor }: any) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.earnCard, { backgroundColor: cardBg, borderColor }]}
    >
      <View style={styles.earnCardTop}>
        <Text style={[styles.earnCardTitle, { color: '#111827' }]} numberOfLines={2}>{title}</Text>
        <View style={[styles.earnIconCircle, { backgroundColor: bg }]}>
          <Icon name={icon} size={19} color={color} />
        </View>
      </View>
      <View style={styles.earnCardBottom}>
        <Text style={styles.earnUpto}>Earn upto</Text>
        <Text style={[styles.earnValue, { color: valueColor }]} numberOfLines={1}>{value}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Section header with side lines (website style) ──
function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  const { colors, isDark } = useTheme();
  return (
    <View style={styles.sectionHeaderRow}>
      <View style={[styles.sectionLine, { backgroundColor: '#B9A6EA' }]} />
      <Text style={[styles.sectionHeaderTitle, { color: isDark ? colors.text : '#111827' }]}>{title}</Text>
      <View style={[styles.sectionLine, { backgroundColor: '#B9A6EA' }]} />
      {actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction} style={styles.sectionAction}>
          <Text style={styles.sectionActionText}>{actionLabel} →</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ── Quick Access category tile ──
function QuickAccessItem({ icon, label, bg, color, onPress }: any) {
  const { colors, isDark } = useTheme();
  return (
    <TouchableOpacity style={styles.qaItem} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.qaIconCircle, { backgroundColor: bg }]}>
        <Icon name={icon} size={22} color={color} />
      </View>
      <Text style={[styles.qaLabel, { color: isDark ? colors.text : '#374151' }]} numberOfLines={2}>{label}</Text>
    </TouchableOpacity>
  );
}

const QUICK_ACCESS = [
  { id: 'recharge', label: 'Recharge & Bills', icon: 'phone-portrait', bg: '#EEF2FF', color: '#4F46E5', route: '/travel-utilities' },
  { id: 'banks', label: 'Credit Card Banks', icon: 'business', bg: '#E0F2FE', color: '#0EA5E9', route: '/(auth)/bank-cards?bank=ALL' },
  { id: 'loans', label: 'Loans', icon: 'cash', bg: '#ECFDF5', color: '#10B981', route: '/products?category=personal_loan' },
  { id: 'insurance', label: 'Insurance', icon: 'shield', bg: '#FEF3C7', color: '#F59E0B', route: '/products?category=insurance' },
  { id: 'invest', label: 'Accounts & Investments', icon: 'pie-chart', bg: '#F5F3FF', color: '#8B5CF6', route: '/products?category=bank_account' },
  { id: 'other', label: 'Other Services', icon: 'ellipsis-h', bg: '#FDF2F8', color: '#EC4899', route: '/products' },
  { id: 'travel', label: 'Travel & Bookings', icon: 'airplane', bg: '#FFF1F2', color: '#F43F5E', route: '/travel-utilities' },
];

const SELL_EARN_CARDS = [
  { id: 'personal-loan', title: 'Personal Loan', value: '₹5 Lakh', valueColor: '#2FA35B', bg: '#E3F5EA', color: '#2FA35B', icon: 'cash', route: '/products?category=personal_loan' },
  { id: 'credit-cards', title: 'Credit Cards', value: '₹1 Lakh', valueColor: '#6E3FD6', bg: '#EEE9FB', color: '#6E3FD6', icon: 'credit-card', route: '/products?category=credit_card' },
  { id: 'insurance', title: 'Insurance', value: '₹5 Lakh', valueColor: '#E8862E', bg: '#FCE7E1', color: '#E8862E', icon: 'shield', route: '/products?category=insurance' },
  { id: 'bank-accounts', title: 'Bank Accounts', value: '₹10k', valueColor: '#3A78D6', bg: '#E2ECFB', color: '#3A78D6', icon: 'business', route: '/products?category=bank_account' },
  { id: 'demat', title: 'Demat Accounts', value: '₹10k', valueColor: '#E0473E', bg: '#FCE7E1', color: '#E0473E', icon: 'trending-up', route: '/products?category=demat' },
  { id: 'investment', title: 'Investment', value: '₹1 Cr', valueColor: '#2FA35B', bg: '#E3F5EA', color: '#2FA35B', icon: 'pie-chart', route: '/products?category=investment' },
];

export default function PartnerDashboardScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { colors, isDark } = useTheme();

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [walletData, setWalletData] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [offerBanners, setOfferBanners] = useState<any[]>([]);
  const [teamBanners, setTeamBanners] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);


  const loadDashboard = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const [dashRes, wallRes, profRes, offerRes, teamRes, leadsRes] = await Promise.allSettled([
        fetchPartnerDashboard(),
        fetchPartnerWallet(),
        fetchPartnerProfile(),
        fetchPartnerBanners('offer'),
        fetchPartnerBanners('partner'),
        fetchLeads({ limit: 100 }),
      ]);

      if (dashRes.status === 'fulfilled' && dashRes.value?.success) {
        setDashboardData(dashRes.value.data || dashRes.value);
      }
      if (wallRes.status === 'fulfilled' && wallRes.value?.success) {
        setWalletData(wallRes.value.data || wallRes.value);
      }
      if (profRes.status === 'fulfilled' && profRes.value?.success) {
        setProfileData(profRes.value.data || profRes.value);
      }
      if (offerRes.status === 'fulfilled') {
        const list = offerRes.value?.data;
        setOfferBanners(Array.isArray(list) ? list : []);
      }
      if (teamRes.status === 'fulfilled') {
        const list = teamRes.value?.data;
        setTeamBanners(Array.isArray(list) && list.length > 0 ? list : []);
      }
      if (leadsRes.status === 'fulfilled' && leadsRes.value?.success && Array.isArray(leadsRes.value.data)) {
        setLeads(leadsRes.value.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textLight }]}>Loading Partner Workspace...</Text>
      </View>
    );
  }

  const partnerProfile = profileData?.partner || profileData || user || {};
  const partnerName = user?.full_name || partnerProfile.full_name || partnerProfile.name || 'Partner';
  const partnerCode = user?.partner_code || partnerProfile.partner_code || partnerProfile.Partner_code || '';
  const kycStatus = (partnerProfile.kyc_status || 'pending').toLowerCase();

  const wallet = walletData?.wallet || walletData || {};
  const walletBalance = `₹${Number(wallet.available_balance || wallet.balance || 0).toLocaleString('en-IN')}`;

  // Offer banner slides — image only, no text overlay (same as home page banner)
  const offerSlides = (offerBanners.length > 0 ? offerBanners : offerFallbackBanners).map((b: any) => ({
    id: b.id,
    image_url: b.image_url,
    image: resolveBannerSource(b.image_url || b.image),
    click_url: b.click_url,
  }));

  // Team & Referral slides — images only, no text overlay
  const teamSlides = (teamBanners.length > 0
    ? teamBanners.map((b: any) => ({
        id: `dyn-${b.id}`,
        image: resolveBannerSource(b.image_url || b.image),
        image_url: b.image_url,
        click_url: b.click_url || '/team',
      }))
    : teamFallbackBanners
  );

  // Recent applications from leads (website uses /leads for partners)
  const recentApps = leads.slice(0, 5).map((item: any) => {
    const name = item.customer_name || item.full_name || item.name || item.customer || 'Customer';
    const names = String(name).trim().split(' ');
    const initials = names.map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    const statusRaw = String(item.status || 'Pending').toLowerCase();
    let status = 'Under Review';
    let color = '#3B82F6';
    let bg = '#EFF6FF';
    if (statusRaw === 'approved' || statusRaw === 'converted') { status = 'Approved'; color = '#10B981'; bg = '#ECFDF5'; }
    if (statusRaw === 'rejected' || statusRaw === 'cancelled') { status = 'Rejected'; color = '#EF4444'; bg = '#FEE2E2'; }
    const amountVal = item.approved_amount || item.loan_amount || item.commission_amount || item.amount;
    return {
      initials,
      name,
      product: item.product_name || item.product?.name || 'Financial Product',
      amount: amountVal ? `₹${Number(amountVal).toLocaleString('en-IN')}` : '—',
      status,
      color,
      bg,
    };
  });

  const quickActions = [
    {
      id: 'apply',
      label: 'Apply Product',
      desc: 'Submit a new product lead',
      icon: 'storefront',
      bg: '#F5F3FF',
      color: '#7C3AED',
      route: '/products',
    },
    {
      id: 'customer',
      label: 'Add Customer',
      desc: 'Register new client profile',
      icon: 'people',
      bg: '#EFF6FF',
      color: '#2563EB',
      route: '/customers',
    },
    {
      id: 'invite',
      label: 'Invite Partner',
      desc: 'Grow your network and overrides',
      icon: 'people-outline',
      bg: '#FFF7ED',
      color: '#EA580C',
      route: '/team',
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => loadDashboard(true)} colors={[colors.primary]} tintColor={colors.primary} />
      }
    >
      <PartnerTopBar name={partnerName} code={partnerCode} balance={walletBalance} />


      {error ? (
        <View style={styles.errorBanner}>
          <Icon name="alert-circle" size={18} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* KYC Banner (website: shown when KYC not approved) */}
      {kycStatus !== 'approved' && (
        <View style={[styles.kycBanner, { borderColor: kycStatus === 'rejected' ? '#EF4444' : '#F59E0B', backgroundColor: kycStatus === 'rejected' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)' }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.kycTitle, { color: kycStatus === 'rejected' ? '#DC2626' : '#D97706' }]}>
              {kycStatus === 'rejected' ? 'KYC Rejected' : kycStatus === 'under_review' ? 'KYC Under Verification' : 'KYC Verification Pending'}
            </Text>
            {kycStatus !== 'rejected' && (
              <Text style={[styles.kycSub, { color: isDark ? colors.textLight : '#4B5563' }]}>
                {kycStatus === 'under_review' ? 'Submitted for admin review.' : 'Complete KYC to unlock full referral earnings.'}
              </Text>
            )}
          </View>
          {kycStatus !== 'under_review' && (
            <TouchableOpacity
              style={[styles.kycBtn, { backgroundColor: kycStatus === 'rejected' ? '#EF4444' : '#F59E0B' }]}
              onPress={() => router.push('/partner-kyc' as any)}
            >
              <Text style={styles.kycBtnText}>{kycStatus === 'rejected' ? 'Re-upload' : 'Complete KYC'}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Offer Banners — auto-rotating hero, image only, full image visible */}
      <BannerSlider slides={offerSlides} height={175} borderRadius={8} fit="contain" bgColor={isDark ? '#0F172A' : '#F5F3FF'} />

      {/* SELL & EARN grid (website: 2-col on mobile) */}
      <SectionHeader title="SELL & EARN" actionLabel="View All" onAction={() => router.push('/products' as any)} />
      <View style={styles.earnGrid}>
        {SELL_EARN_CARDS.map((card) => (
          <EarnCard
            key={card.id}
            title={card.title}
            value={card.value}
            valueColor={card.valueColor}
            bg={card.bg}
            color={card.color}
            icon={card.icon}
            cardBg={isDark ? colors.card : '#FFFFFF'}
            borderColor={isDark ? colors.border : 'rgba(0,0,0,0.04)'}
            onPress={() => router.push(card.route as any)}
          />
        ))}
      </View>

      {/* Team & Referral Banners — same dimensions as offer/home banner, images only */}
      <Text style={[styles.teamSectionTitle, { color: isDark ? colors.text : '#111827' }]}>TEAM &amp; REFERRAL BANNERS</Text>
      <BannerSlider slides={teamSlides} height={175} borderRadius={20} fit="contain" bgColor={isDark ? '#0F172A' : '#F5F3FF'} />

      {/* Quick Access categories (website: QuickAccessSection) */}
      <SectionHeader title="QUICK ACCESS" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.qaScroll}>
        {QUICK_ACCESS.map((item) => (
          <QuickAccessItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            bg={item.bg}
            color={item.color}
            onPress={() => router.push(item.route as any)}
          />
        ))}
      </ScrollView>

      {/* Quick Actions + Recent Applications (website: side-by-side panels, stacked on mobile) */}
      <View style={styles.panelsWrap}>
        {/* Quick Actions */}
        <View style={[styles.panelCard, { backgroundColor: isDark ? colors.card : '#FFFFFF', borderColor: colors.border }]}>
          <Text style={[styles.panelTitle, { color: isDark ? colors.text : '#111827' }]}>Quick Actions</Text>
          <View style={{ gap: 10 }}>
            {quickActions.map((act) => (
              <TouchableOpacity
                key={act.id}
                style={[styles.qaActionRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FAF9FE', borderColor: isDark ? colors.border : '#F3F4F6' }]}
                onPress={() => router.push(act.route as any)}
                activeOpacity={0.8}
              >
                <View style={[styles.qaActionIcon, { backgroundColor: act.bg }]}>
                  <Icon name={act.icon} size={20} color={act.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.qaActionLabel, { color: isDark ? colors.text : '#111827' }]}>{act.label}</Text>
                  <Text style={[styles.qaActionDesc, { color: isDark ? colors.textLight : '#6B7280' }]}>{act.desc}</Text>
                </View>
                <Icon name="chevron-right" size={16} color="#8A8A9E" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Applications */}
        <View style={[styles.panelCard, { backgroundColor: isDark ? colors.card : '#FFFFFF', borderColor: colors.border }]}>
          <View style={styles.panelHeaderRow}>
            <Text style={[styles.panelTitle, { color: isDark ? colors.text : '#111827' }]}>Recent Applications</Text>
            <TouchableOpacity onPress={() => router.push('/applications' as any)}>
              <Text style={styles.panelLink}>View All</Text>
            </TouchableOpacity>
          </View>
          {recentApps.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <Icon name="people" size={20} color="#6E3FD6" />
              </View>
              <Text style={[styles.emptyTitle, { color: isDark ? colors.text : '#111827' }]}>No recent applications yet</Text>
              <Text style={[styles.emptyDesc, { color: isDark ? colors.textLight : '#6B7280' }]}>
                Share credit cards and loan links with customers to start earning commissions.
              </Text>
              <TouchableOpacity style={styles.exploreBtn} onPress={() => router.push('/products' as any)}>
                <Text style={styles.exploreBtnText}>Explore Products</Text>
                <Icon name="chevron-right" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              {recentApps.map((app: any, idx: number) => (
                <View
                  key={idx}
                  style={[styles.appRow, idx === recentApps.length - 1 && { borderBottomWidth: 0, paddingBottom: 0 }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <View style={[styles.appAvatar, { backgroundColor: app.bg }]}>
                      <Text style={[styles.appAvatarText, { color: app.color }]}>{app.initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.appName, { color: isDark ? colors.text : '#111827' }]} numberOfLines={1}>{app.name}</Text>
                      <Text style={[styles.appProduct, { color: isDark ? colors.textLight : '#9CA3AF' }]} numberOfLines={1}>{app.product}</Text>
                    </View>
                  </View>
                  <View style={[styles.appStatusPill, { backgroundColor: `${app.color}15` }]}>
                    <Text style={[styles.appStatusText, { color: app.color }]}>{app.status}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: spacing.md, paddingBottom: 120 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: spacing.sm, fontSize: typography.sizes.sm },

  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  navbarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navbarLogo: { width: 30, height: 30 },
  navbarBrand: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  profileBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 90,
    paddingHorizontal: spacing.md,
  },
  menuCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  menuIdentity: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 12 },
  menuAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  menuName: { fontSize: 15, fontWeight: '800' },
  menuCode: { fontSize: 11, marginTop: 2 },
  menuBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
  },
  menuBalanceLabel: { fontSize: 12 },
  menuBalanceValue: { fontSize: 15, fontWeight: '800' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  menuItemText: { flex: 1, fontSize: 14, fontWeight: '600' },
  menuLogout: { borderBottomWidth: 0, marginTop: 4 },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  errorText: { fontSize: typography.sizes.xs, color: '#DC2626', marginLeft: spacing.xs, flex: 1 },

  kycBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginBottom: spacing.md,
    borderWidth: 1,
    gap: 12,
  },
  kycTitle: { fontWeight: '700', fontSize: 14 },
  kycSub: { fontSize: 12, marginTop: 2 },
  kycBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 },
  kycBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },

  offerSectionTitle: {
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  teamSectionTitle: {
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
  },

  sliderWrap: {
    width: '100%',
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: spacing.md,
    position: 'relative',
  },
  sliderImage: { width: '100%', height: '100%' },
  sliderOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sliderTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  sliderSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 11, marginTop: 2 },
  dotsRow: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: { width: 24, backgroundColor: '#FFFFFF' },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    marginBottom: 12,
    gap: 12,
    position: 'relative',
  },
  sectionLine: { height: 1, width: 32 },
  sectionHeaderTitle: {
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionAction: { position: 'absolute', right: 0 },
  sectionActionText: { color: '#6E3FD6', fontSize: 12.5, fontWeight: '700' },

  earnGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  earnCard: {
    width: EARN_CARD_WIDTH,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderWidth: 1,
    minHeight: 120,
    justifyContent: 'space-between',
  },
  earnCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 },
  earnCardTitle: { fontWeight: '700', fontSize: 13, flex: 1, lineHeight: 16 },
  earnIconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  earnCardBottom: { marginTop: 8 },
  earnUpto: { fontSize: 10.5, color: '#6B7280' },
  earnValue: { fontWeight: '800', fontSize: 17, marginTop: 2 },

  qaScroll: { gap: 14, paddingRight: spacing.md },
  qaItem: { width: 64, alignItems: 'center' },
  qaIconCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  qaLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center', marginTop: 6, lineHeight: 14 },

  panelsWrap: { marginTop: 24, gap: 16 },
  panelCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  panelTitle: { fontSize: 14, fontWeight: '800', marginBottom: 12 },
  panelHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  panelLink: { color: '#6E3FD6', fontSize: 12, fontWeight: '700' },

  qaActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  qaActionIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  qaActionLabel: { fontSize: 13, fontWeight: '700' },
  qaActionDesc: { fontSize: 11, marginTop: 1 },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(110,63,214,0.25)',
    backgroundColor: 'rgba(110,63,214,0.03)',
  },
  emptyIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(110,63,214,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 13, fontWeight: '800' },
  emptyDesc: { fontSize: 11, marginTop: 4, textAlign: 'center' },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#6E3FD6',
  },
  exploreBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },

  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  appAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appAvatarText: { fontWeight: '700', fontSize: 12 },
  appName: { fontSize: 12.5, fontWeight: '700' },
  appProduct: { fontSize: 10.5, marginTop: 1 },
  appStatusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  appStatusText: { fontSize: 10, fontWeight: '700' },
});
