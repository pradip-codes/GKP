import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  TextInput,
  SafeAreaView,
  Linking,
  Animated,
  Easing,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { Icon } from '../../components/Icon';
import apiClient, { API_BASE_URL } from '../../services/api';

const { width } = Dimensions.get('window');

// ── BANNER ASSETS ──
const bannerImages: Record<string, any> = {
  offer: require('../../assets/images/offerbanner.png'),
  ltf: require('../../assets/images/lifetimefree card.png'),
  loan: require('../../assets/images/loan.png'),
  emi: require('../../assets/images/smart emi.png'),
  insurance: require('../../assets/images/insurance.png'),
  'hdfc pixel card.png': require('../../assets/images/hdfc pixel card.png'),
  'emi.jpeg': require('../../assets/images/emi.jpeg'),
};

const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

const resolveBannerImage = (url: any): any => {
  if (!url) return bannerImages.offer;
  const rawUrl = typeof url === 'string' ? url : url.image_url || url.image || '';
  if (!rawUrl) return bannerImages.offer;
  if (bannerImages[rawUrl]) return bannerImages[rawUrl];
  const filename = String(rawUrl).split('/').pop()?.split('\\').pop() || '';
  if (bannerImages[filename]) return bannerImages[filename];
  try {
    const decoded = decodeURIComponent(filename);
    if (bannerImages[decoded]) return bannerImages[decoded];
  } catch (_) {}
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) return { uri: rawUrl };
  if (rawUrl.startsWith('/')) return { uri: `${API_ORIGIN}${rawUrl}` };
  return bannerImages.offer;
};

const resolveBannerRoute = (clickUrl: any): { route?: any; external?: string } => {
  const fallback = { pathname: '/(auth)/products', params: { category: 'credit_card' } };
  if (!clickUrl || typeof clickUrl !== 'string') return { route: fallback };
  if (clickUrl.startsWith('http://') || clickUrl.startsWith('https://')) return { external: clickUrl };
  let r = clickUrl
    .replace('/partner/credit-cards', '/(auth)/bank-cards')
    .replace('/partner/products', '/(auth)/products')
    .replace('/partner/team-network', '/(app)/partner-dashboard')
    .replace('/credit-cards', '/(auth)/bank-cards')
    .replace('/loans', '/(auth)/products?category=personal_loan')
    .replace('/partner/', '/');
  if (r.includes('personal_loan')) return { route: { pathname: '/(auth)/products', params: { category: 'personal_loan' } } };
  if (r.includes('bank-cards')) return { route: { pathname: '/(auth)/bank-cards', params: { bank: 'ALL' } } };
  if (r.startsWith('/')) return { route: r };
  return { route: fallback };
};

// ── ATTRACTIVE CARDS ASSETS ──
const attractiveImages: Record<string, any> = {
  personalLoan: require('../../assets/images/personal-loan.png'),
  ltf: require('../../assets/images/lifetimefree.png'),
  cibil: require('../../assets/images/cibilbased.png'),
  loanOnCard: require('../../assets/images/loan on credit card.png'),
  smartEmi: require('../../assets/images/smart emi.png'),
  fdBacked: require('../../assets/images/fd backed.png'),
  upi: require('../../assets/images/upi.png'),
};

// ── UTILITY & TRAVEL ASSETS ──
const utilityImages: Record<string, any> = {
  recharge: require('../../assets/images/recharge.png'),
  electricity: require('../../assets/images/electricitybill.png'),
  loanRepay: require('../../assets/images/loan.png'),
  fastag: require('../../assets/images/fastag.png'),
  upiTransfer: require('../../assets/images/tomobile.png'),
  flight: require('../../assets/images/flight.png'),
  train: require('../../assets/images/train.png'),
  bus: require('../../assets/images/bus.png'),
  hotel: require('../../assets/images/hotel.png'),
};

// ── BANK LOGOS ASSETS ──
const bankLogos: Record<string, any> = {
  HDFC: require('../../assets/images/hdfc_bank.webp'),
  SBI: require('../../assets/images/sbi_card.webp'),
  ICICI: require('../../assets/images/icici_bank.webp'),
  Axis: require('../../assets/images/axis_bank.webp'),
  Kotak: require('../../assets/images/kotak_bank.webp'),
  IDFC: require('../../assets/images/idfc_first_bank.webp'),
  'Yes Bank': require('../../assets/images/yes_bank.webp'),
  BOB: require('../../assets/images/bank_of_baroda.webp'),
  AU: require('../../assets/images/AU.webp'),
  Federal: require('../../assets/images/federal_bank.webp'),
  RBL: require('../../assets/images/rbl_bank.webp'),
};

// ── POPULAR CREDIT CARD ASSETS (MATCHING WEBSITE) ──
const popularCardImages: Record<string, any> = {
  hdfc: require('../../assets/images/card_hdfc.webp'),
  sbi: require('../../assets/images/card_sbi.webp'),
  axis: require('../../assets/images/card_axis.webp'),
  icici: require('../../assets/images/card_icici.webp'),
  kotak: require('../../assets/images/card_kotak.webp'),
  yes: require('../../assets/images/card_yes.webp'),
};

const getCardImage = (card: ProductItem | any) => {
  if (card?.card_image_url || card?.image_url) {
    const url = card.card_image_url || card.image_url;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return { uri: url };
    }
  }
  const name = (card?.name || '').toLowerCase();
  const bank = (card?.bank_name || card?.bank || '').toLowerCase();
  if (name.includes('hdfc') || bank.includes('hdfc')) return popularCardImages.hdfc;
  if (name.includes('sbi') || bank.includes('sbi')) return popularCardImages.sbi;
  if (name.includes('axis') || bank.includes('axis')) return popularCardImages.axis;
  if (name.includes('icici') || bank.includes('icici')) return popularCardImages.icici;
  if (name.includes('kotak') || bank.includes('kotak')) return popularCardImages.kotak;
  if (name.includes('yes') || bank.includes('yes')) return popularCardImages.yes;
  return popularCardImages.hdfc;
};

// ── INFINITE MARQUEE (same auto-rotate behaviour as the website) ──
// Content is rendered twice; translating by exactly one set width loops seamlessly.
// Pauses while the user touches the row (website pauses on hover/touch).
const startMarquee = (
  anim: Animated.Value,
  setWidth: number,
  speedPxPerSec: number,
  pausedRef: React.MutableRefObject<boolean>,
) => {
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const step = () => {
    if (cancelled) return;
    if (pausedRef.current) {
      timer = setTimeout(step, 150);
      return;
    }
    let from = (anim as any).__getValue() as number;
    if (from <= -setWidth + 0.5) from = 0;
    const toValue = -setWidth;
    const duration = (Math.abs(toValue - from) / speedPxPerSec) * 1000;
    Animated.timing(anim, {
      toValue,
      duration,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (cancelled) return;
      if (!finished) {
        timer = setTimeout(step, 150);
        return;
      }
      anim.setValue(0);
      step();
    });
  };
  step();
  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
    anim.stopAnimation();
  };
};

interface ProductItem {
  id: string;
  name: string;
  bank_name: string;
  category: string;
  description: string;
  image_url?: string;
  card_image_url?: string;
  is_popular?: boolean;
}

export default function HomeScreen() {
  const { colors, isDark, toggleTheme } = useTheme();

  const [loading, setLoading] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState<ProductItem[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const bannerScrollRef = useRef<any>(null);

  // 1. HERO BANNER — offer banners from API (image only, auto-sliding)
  const [offerBanners, setOfferBanners] = useState<any[]>([]);

  useEffect(() => {
    const fetchOfferBanners = async () => {
      try {
        const res = await apiClient.get('/banners', { params: { page: 'offer' } });
        const list = res.data?.data;
        if (res.data?.success && Array.isArray(list) && list.length > 0) {
          setOfferBanners(list);
        }
      } catch (_) {}
    };
    fetchOfferBanners();
  }, []);

  const heroBanners = offerBanners.length > 0
    ? offerBanners.map((b: any) => ({
        id: b.id,
        image: resolveBannerImage(b.image_url || b.image),
        ...resolveBannerRoute(b.click_url),
      }))
    : [{
        id: 'offer',
        image: bannerImages.offer,
        route: { pathname: '/(auth)/products', params: { category: 'credit_card' } },
      }];

  // Auto-scroll hero banners
  useEffect(() => {
    if (heroBanners.length <= 1) return;
    const timer = setInterval(() => {
      const nextIndex = (currentBannerIndex + 1) % heroBanners.length;
      bannerScrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
      setCurrentBannerIndex(nextIndex);
    }, 4500);
    return () => clearInterval(timer);
  }, [currentBannerIndex, heroBanners.length]);

  // Load popular products from API with most-selling sorting
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/products', {
          params: { category: 'credit_card', limit: 12 },
        });
        if (res.data?.success && Array.isArray(res.data?.data)) {
          const mostSellingKeywords = ['millennia', 'simplyclick', 'neo', 'coral', 'league', 'byoc', 'flipkart', 'amazon', 'swiggy', 'ace', 'airtel', 'platinum'];
          const getScore = (name: string) => {
            const lower = (name || '').toLowerCase();
            const idx = mostSellingKeywords.findIndex((kw) => lower.includes(kw));
            return idx >= 0 ? 100 - idx : 0;
          };
          const sorted = [...res.data.data].sort((a, b) => getScore(b.name) - getScore(a.name));
          setFeaturedProducts(sorted.slice(0, 8));
        }
      } catch (err) {
        console.warn('Failed to load featured products:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // ── AUTO-ROTATE MARQUEES (Attractive Cards & Partner Banks — same as website) ──
  const attractiveScrollX = useRef(new Animated.Value(0)).current;
  const attractivePaused = useRef(false);
  const banksScrollX = useRef(new Animated.Value(0)).current;
  const banksPaused = useRef(false);

  const attractiveCards = [
    { id: 'personal-loan', title: 'Personal Loan', desc: 'Quick & easy personal loans', img: attractiveImages.personalLoan, cat: 'personal_loan' },
    { id: 'ltf-cards', title: 'Lifetime Free Cards', desc: 'Zero annual fees forever', img: attractiveImages.ltf, cat: 'credit_card' },
    { id: 'cibil-loans', title: 'CIBIL Loan', desc: 'Personalized loan offers', img: attractiveImages.cibil, cat: 'personal_loan' },
    { id: 'loan-on-card', title: 'Loan on Credit Card', desc: 'Instant cash on card limit', img: attractiveImages.loanOnCard, cat: 'credit_card' },
    { id: 'smart-emi', title: 'Smart EMI Card', desc: 'No-cost EMI purchases', img: attractiveImages.smartEmi, cat: 'smart_emi' },
    { id: 'secured-cards', title: 'FD Backed Card', desc: 'Build credit with FD', img: attractiveImages.fdBacked, cat: 'credit_card' },
    { id: 'upi-cards', title: 'UPI Credit Card', desc: 'Pay via UPI with credit', img: attractiveImages.upi, cat: 'credit_card' },
  ];
  const bankKeys = Object.keys(bankLogos);

  // Grid card widths matching the website's mobile columns
  const contentW = width - 32; // sectionContainer horizontal padding (16 * 2)
  const cardW5 = (contentW - 4 * 6) / 5;        // Money Transfer: 5 cols, gap 6
  const cardW4Gap6 = (contentW - 3 * 6) / 4;    // Travel: 4 cols, gap 6
  const cardW4Gap10 = (contentW - 3 * 10) / 4;  // Loans & Business: 4 cols, gap 10

  useEffect(() => startMarquee(attractiveScrollX, attractiveCards.length * (160 + 12), 45, attractivePaused), []);
  useEffect(() => startMarquee(banksScrollX, bankKeys.length * (115 + 12), 55, banksPaused), []);

  const handleBannerScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / width);
    setCurrentBannerIndex(index);
  };

  // Theme color tokens matching website C
  const softBg = isDark ? '#0D1411' : '#E8F7EF';
  const cardBg = isDark ? colors.card : '#FFFFFF';
  const borderColor = isDark ? 'rgba(255,255,255,0.12)' : '#E3EBE8';
  const tealColor = colors.teal || '#008A60';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      {/* ── TOP HEADER / APP BAR ── */}
      <View style={[styles.headerBar, { backgroundColor: colors.card, borderBottomColor: borderColor }]}>
        <View style={styles.headerLeft}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: softBg, borderColor }]}
            onPress={toggleTheme}
            activeOpacity={0.7}
          >
            <Icon name={isDark ? 'sunny' : 'moon'} size={16} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.authPillBtn, { backgroundColor: tealColor }]}
            onPress={() => router.push('/(auth)/register')}
            activeOpacity={0.8}
          >
            <Icon name="user" size={14} color="#FFF" />
            <Text style={styles.authPillText}>Register</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* ── SEARCH BAR ── */}
        <View style={[styles.searchContainer, { backgroundColor: colors.bg }]}>
          <View style={[styles.searchInputWrapper, { backgroundColor: cardBg, borderColor }]}>
            <Icon name="search" size={16} color={colors.textLight} />
            <TextInput
              placeholder="Search credit cards, loans, banks..."
              placeholderTextColor={colors.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => router.push({ pathname: '/(auth)/products', params: { search: searchQuery } })}
              style={[styles.searchInput, { color: colors.text }]}
              returnKeyType="search"
            />
          </View>
        </View>

        {/* ── HERO BANNER CAROUSEL ── */}
        <View style={styles.bannerContainer}>
          <ScrollView
            ref={bannerScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleBannerScroll}
            scrollEventThrottle={16}
          >
            {heroBanners.map((banner) => (
              <TouchableOpacity
                key={banner.id}
                activeOpacity={0.9}
                style={[styles.bannerSlide, { width }]}
                onPress={() => {
                  if (banner.external) {
                    Linking.openURL(banner.external).catch(() => {});
                  } else if (banner.route) {
                    router.push(banner.route);
                  }
                }}
              >
                <View style={[styles.bannerCard, { backgroundColor: isDark ? '#0F172A' : '#F5F3FF', borderColor }]}>
                  <Image
                    source={banner.image}
                    style={styles.bannerImage}
                    resizeMode="contain"
                  />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Banner Dot Indicators */}
          {heroBanners.length > 1 && (
          <View style={styles.bannerIndicators}>
            {heroBanners.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  { backgroundColor: borderColor },
                  currentBannerIndex === index && [
                    styles.activeIndicator,
                    { backgroundColor: tealColor },
                  ],
                ]}
              />
            ))}
          </View>
          )}
        </View>

        {/* ── SECTION 1: Money Transfer & Payments ── */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Money Transfer & Payments</Text>
          <View style={[styles.gridRow5, { gap: 6 }]}>
            {[
              { id: 'tomobile', label: 'To Mobile', img: utilityImages.upiTransfer, route: '/(public)/money-transfer' },
              { id: 'recharge', label: 'Recharge', img: utilityImages.recharge, route: '/(public)/services' },
              { id: 'electricity', label: 'Electricity', img: utilityImages.electricity, route: '/(public)/services' },
              { id: 'loanRepay', label: 'Loan Repay', img: utilityImages.loanRepay, route: '/(public)/services' },
              { id: 'fastag', label: 'FASTag', img: utilityImages.fastag, route: '/(public)/services' },
            ].map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.squareActionCard, { width: cardW5, backgroundColor: softBg, borderColor }]}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.squareIconBox, { backgroundColor: cardBg, borderColor }]}>
                  <Image source={item.img} style={styles.actionIconImage} resizeMode="contain" />
                </View>
                <Text style={[styles.squareActionLabel, { color: colors.text }]} numberOfLines={2}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── SECTION 8: Travel & Transit ── */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Travel & Transit</Text>
          <View style={[styles.gridRow4, { gap: 6 }]}>
            {[
              { id: 'flight', label: 'Flight Booking', img: utilityImages.flight, route: '/(public)/travel-booking' },
              { id: 'train', label: 'Train Ticket', img: utilityImages.train, route: '/(public)/travel-booking' },
              { id: 'bus', label: 'Bus Booking', img: utilityImages.bus, route: '/(public)/travel-booking' },
              { id: 'hotel', label: 'Hotel Stay', img: utilityImages.hotel, route: '/(public)/travel-booking' },
            ].map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.squareActionCard, { width: cardW4Gap6, backgroundColor: softBg, borderColor }]}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.squareIconBox, { backgroundColor: cardBg, borderColor }]}>
                  <Image source={item.img} style={styles.actionIconImage} resizeMode="contain" />
                </View>
                <Text style={[styles.squareActionLabel, { color: colors.text }]} numberOfLines={1}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── SECTION 2: Attractive Cards & Loans ── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Attractive Cards & Loans</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/products')}>
              <Text style={[styles.viewAllText, { color: tealColor }]}>See All →</Text>
            </TouchableOpacity>
          </View>

          {/* Auto-rotating marquee — same as website (pauses while touched) */}
          <View style={styles.marqueeClip}>
            <Animated.View
              style={[styles.marqueeRow, { transform: [{ translateX: attractiveScrollX }] }]}
              onTouchStart={() => { attractivePaused.current = true; attractiveScrollX.stopAnimation(); }}
              onTouchEnd={() => { attractivePaused.current = false; }}
              onTouchCancel={() => { attractivePaused.current = false; }}
            >
              {[...attractiveCards, ...attractiveCards].map((card, idx) => (
                <TouchableOpacity
                  key={`${card.id}-${idx}`}
                  style={[styles.attractiveCard, { backgroundColor: softBg, borderColor }]}
                  onPress={() => router.push({ pathname: '/(auth)/products', params: { category: card.cat } })}
                  activeOpacity={0.85}
                >
                  <View style={styles.attractiveImgBox}>
                    <Image source={card.img} style={styles.attractiveImage} resizeMode="contain" />
                  </View>
                  <View style={styles.attractiveTextBox}>
                    <Text style={[styles.attractiveTitle, { color: colors.text }]} numberOfLines={1}>
                      {card.title}
                    </Text>
                    <Text style={[styles.attractiveDesc, { color: colors.textMid }]} numberOfLines={2}>
                      {card.desc}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </Animated.View>
          </View>
        </View>

        {/* ── SECTION 3: Popular Credit Cards (Most Selling) ── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Popular Credit Cards</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/products')}>
              <Text style={[styles.viewAllText, { color: tealColor }]}>View All Cards →</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : (
            <View style={styles.popularGrid}>
              {(featuredProducts.length > 0
                ? featuredProducts.slice(0, 6)
                : [
                    { id: 'hdfc-millennia', name: 'HDFC Millennia Credit Card', bank_name: 'HDFC Bank', description: '5% Cashback on Amazon, Flipkart, Myntra & Swiggy' },
                    { id: 'sbi-simplyclick', name: 'SBI SimplyCLICK Card', bank_name: 'SBI Card', description: '10X Reward Points on online spends' },
                    { id: 'axis-neo', name: 'Axis Bank Neo Credit Card', bank_name: 'Axis Bank', description: 'Discounts on Zomato, Myntra, Paytm & BookMyShow' },
                    { id: 'icici-coral', name: 'ICICI Coral RuPay Card', bank_name: 'ICICI Bank', description: 'UPI enabled rewards & airport lounge access' },
                    { id: 'kotak-league', name: 'Kotak League Platinum Card', bank_name: 'Kotak Bank', description: 'Fuel surcharge waiver & special reward milestones' },
                    { id: 'yes-byoc', name: 'Yes Bank BYOC Card', bank_name: 'Yes Bank', description: 'Custom rewards & flexible spending categories' },
                  ]
              ).map((card) => (
                <TouchableOpacity
                  key={card.id}
                  style={[styles.popularCard, { backgroundColor: softBg, borderColor }]}
                  onPress={() => router.push({ pathname: '/(auth)/product-detail', params: { id: card.id } })}
                  activeOpacity={0.85}
                >
                  {/* Most Selling Badge & Card Visual */}
                  <View style={[styles.popularCardImageBox, { backgroundColor: cardBg }]}>
                    <Image
                      source={getCardImage(card)}
                      style={styles.popularCardImage}
                      resizeMode="contain"
                    />
                  </View>

                  {/* Card Details */}
                  <View style={styles.popularCardDetails}>
                    <Text style={[styles.popularCardTitle, { color: colors.text }]} numberOfLines={2}>
                      {card.name}
                    </Text>

                    <View style={[styles.applyBtn, { backgroundColor: `${tealColor}18`, borderColor: tealColor }]}>
                      <Text style={[styles.applyBtnText, { color: tealColor }]}>Apply Now</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ── SECTION 4: Popular Credit Card Banks ── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Popular Credit Card Banks</Text>
            <TouchableOpacity onPress={() => router.push({ pathname: '/(auth)/bank-cards', params: { bank: 'ALL' } })}>
              <Text style={[styles.viewAllText, { color: tealColor }]}>See All →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.bankGrid}>
            {[
              { id: 'HDFC', label: 'HDFC Bank', logo: bankLogos.HDFC },
              { id: 'SBI', label: 'SBI Card', logo: bankLogos.SBI },
              { id: 'ICICI', label: 'ICICI Bank', logo: bankLogos.ICICI },
              { id: 'Axis', label: 'Axis Bank', logo: bankLogos.Axis },
              { id: 'Kotak', label: 'Kotak Bank', logo: bankLogos.Kotak },
              { id: 'IDFC', label: 'IDFC First', logo: bankLogos.IDFC },
              { id: 'Yes Bank', label: 'Yes Bank', logo: bankLogos['Yes Bank'] },
              { id: 'BOB', label: 'Bank of Baroda', logo: bankLogos.BOB },
            ].map((bank) => (
              <TouchableOpacity
                key={bank.id}
                style={[styles.bankCard, { backgroundColor: softBg, borderColor }]}
                onPress={() => router.push({ pathname: '/(auth)/bank-cards', params: { bank: bank.id } })}
                activeOpacity={0.7}
              >
                <Image source={bank.logo} style={styles.bankLogoImage} resizeMode="contain" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── SECTION 5: Loans ── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Loans</Text>
            <TouchableOpacity onPress={() => router.push({ pathname: '/(auth)/products', params: { category: 'personal_loan' } })}>
              <Text style={[styles.viewAllText, { color: tealColor }]}>See All →</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.gridRow4, { gap: 10 }]}>
            {[
              { id: 'personal_loan', label: 'Personal Loan', icon: 'cash' },
              { id: 'home_loan', label: 'Home Loan', icon: 'home' },
              { id: 'business_loan', label: 'Business Loan', icon: 'business' },
              { id: 'education_loan', label: 'Education Loan', icon: 'school' },
              { id: 'car_loan', label: 'Car Loan', icon: 'car' },
              { id: 'used_car_loan', label: 'Used Car Loan', icon: 'car-sport' },
              { id: 'instant_loan', label: 'Instant Loan', icon: 'flash' },
              { id: 'lap_loan', label: 'Loan Against Property', icon: 'document' },
              { id: 'gold_loan', label: 'Gold Loan', icon: 'diamond' },
              { id: 'loan_against_car', label: 'Loan Against Car', icon: 'key' },
              { id: 'two_wheeler', label: '2 Wheeler Loan', icon: 'bicycle' },
              { id: 'mutual_fund', label: 'Loan vs Mutual Funds', icon: 'trending-up' },
            ].map((loan) => (
              <TouchableOpacity
                key={loan.id}
                style={[styles.squareActionCard, { width: cardW4Gap10, backgroundColor: softBg, borderColor }]}
                onPress={() => router.push({ pathname: '/(auth)/products', params: { category: loan.id } })}
                activeOpacity={0.7}
              >
                <View style={[styles.squareIconBox, { backgroundColor: cardBg, borderColor }]}>
                  <Icon name={loan.icon} size={20} color={tealColor} />
                </View>
                <Text style={[styles.squareActionLabel, { color: colors.text }]} numberOfLines={2}>
                  {loan.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── SECTION 6: Insurance ── */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Insurance</Text>
          <View style={styles.gridRow2}>
            {[
              { id: 'health', label: 'Health Insurance', icon: 'medkit' },
              { id: 'life', label: 'Life Insurance', icon: 'shield' },
              { id: 'general', label: 'General Insurance', icon: 'umbrella' },
              { id: 'loanProtection', label: 'Loan Protection Insurance', icon: 'hand-left' },
            ].map((ins) => (
              <TouchableOpacity
                key={ins.id}
                style={[styles.insuranceCard, { backgroundColor: softBg, borderColor }]}
                onPress={() => router.push('/(public)/insurance')}
                activeOpacity={0.7}
              >
                <View style={[styles.insuranceIconBox, { backgroundColor: cardBg, borderColor }]}>
                  <Icon name={ins.icon} size={24} color={tealColor} />
                </View>
                <Text style={[styles.insuranceLabel, { color: colors.text }]} numberOfLines={2}>
                  {ins.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── SECTION 7: Business Services ── */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Business & Utility Services</Text>
          <View style={[styles.gridRow4, { gap: 10 }]}>
            {[
              { id: 'gst', label: 'GST Returns', icon: 'document-text' },
              { id: 'company', label: 'Company Registration', icon: 'business' },
              { id: 'itr', label: 'ITR Filing', icon: 'calculator' },
              { id: 'pfesic', label: 'PF & ESIC', icon: 'people' },
              { id: 'tds', label: 'TDS Filing', icon: 'cash' },
              { id: 'trade', label: 'Trade License', icon: 'id-card' },
              { id: 'msme', label: 'MSME Registration', icon: 'storefront' },
              { id: 'dsc', label: 'DSC Services', icon: 'reader' },
            ].map((svc) => (
              <TouchableOpacity
                key={svc.id}
                style={[styles.squareActionCard, { width: cardW4Gap10, backgroundColor: softBg, borderColor }]}
                onPress={() => router.push('/(public)/services')}
                activeOpacity={0.7}
              >
                <View style={[styles.squareIconBox, { backgroundColor: cardBg, borderColor }]}>
                  <Icon name={svc.icon} size={20} color={tealColor} />
                </View>
                <Text style={[styles.squareActionLabel, { color: colors.text }]} numberOfLines={2}>
                  {svc.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── SECTION 9: Partner Banks & NBFCs Ticker ── */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Our Partner Banks & NBFCs</Text>
          {/* Auto-rotating marquee — same as website (pauses while touched) */}
          <View style={styles.marqueeClip}>
            <Animated.View
              style={[styles.marqueeRow, { transform: [{ translateX: banksScrollX }] }]}
              onTouchStart={() => { banksPaused.current = true; banksScrollX.stopAnimation(); }}
              onTouchEnd={() => { banksPaused.current = false; }}
              onTouchCancel={() => { banksPaused.current = false; }}
            >
              {[...bankKeys, ...bankKeys].map((bKey, idx) => (
                <View key={`${bKey}-${idx}`} style={[styles.tickerBadge, { backgroundColor: softBg, borderColor }]}>
                  <Image source={bankLogos[bKey]} style={styles.tickerLogo} resizeMode="contain" />
                </View>
              ))}
            </Animated.View>
          </View>
        </View>

        {/* ── CUSTOMER QUICK ASSISTANCE ── */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Customer Services</Text>
          <View style={styles.serviceRow}>
            <TouchableOpacity
              style={[styles.serviceBtn, { backgroundColor: softBg, borderColor }]}
              onPress={() => router.push('/(public)/track-application' as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.serviceIconCircle, { backgroundColor: cardBg, borderColor }]}>
                <Icon name="search" size={18} color={tealColor} />
              </View>
              <Text style={[styles.serviceBtnText, { color: colors.text }]}>Track Application</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.serviceBtn, { backgroundColor: softBg, borderColor }]}
              onPress={() => router.push('/(public)/chatbot' as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.serviceIconCircle, { backgroundColor: cardBg, borderColor }]}>
                <Icon name="chatbubble-ellipses" size={18} color={tealColor} />
              </View>
              <Text style={[styles.serviceBtnText, { color: colors.text }]}>AI Assistant</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.serviceBtn, { backgroundColor: softBg, borderColor }]}
              onPress={() => router.push('/(public)/contact' as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.serviceIconCircle, { backgroundColor: cardBg, borderColor }]}>
                <Icon name="headset" size={18} color={tealColor} />
              </View>
              <Text style={[styles.serviceBtnText, { color: colors.text }]}>Helpline</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── MODERN BRANDED FOOTER ── */}
        <View style={[styles.footerContainer, { backgroundColor: isDark ? '#063F38' : '#E8F7EF', borderColor }]}>
          {/* Brand Column */}
          <Text style={[styles.footerBrand, { color: isDark ? '#FFFFFF' : colors.text }]}>GharKaPaisa</Text>
          <Text style={[styles.footerTagline, { color: colors.teal || '#008A60' }]}>Financial Product Discovery & Application Platform</Text>
          <Text style={[styles.footerDesc, { color: isDark ? 'rgba(255,255,255,0.85)' : (colors.textMid || '#475569') }]}>
            India's trusted platform for Credit Cards, Loans, Insurance & Financial Services.
          </Text>

          {/* Social Icons Row */}
          <View style={styles.socialRow}>
            {[
              { name: 'logo-facebook', url: 'https://facebook.com/gharkapaisa' },
              { name: 'logo-twitter', url: 'https://twitter.com/gharkapaisa' },
              { name: 'logo-instagram', url: 'https://instagram.com/gharkapaisa' },
              { name: 'logo-linkedin', url: 'https://linkedin.com/company/gharkapaisa' },
              { name: 'logo-youtube', url: 'https://youtube.com/@gharkapaisa' },
            ].map((social, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.socialIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,138,96,0.10)', borderColor: tealColor }]}
                onPress={() => Linking.openURL(social.url).catch(() => {})}
                activeOpacity={0.7}
              >
                <Icon name={social.name} size={15} color={tealColor} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Divider */}
          <View style={[styles.footerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : (colors.border || '#E3EBE8') }]} />

          {/* Products & Contact columns side by side */}
          <View style={styles.footerColumnsRow}>
            <View style={styles.footerColumn}>
              <Text style={[styles.footerColTitle, { color: isDark ? '#FFFFFF' : colors.text }]}>Products</Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/products')}>
                <Text style={[styles.footerColLink, { color: isDark ? 'rgba(255,255,255,0.85)' : colors.textMid }]}>Credit Cards</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push({ pathname: '/(auth)/products', params: { category: 'personal_loan' } })}>
                <Text style={[styles.footerColLink, { color: isDark ? 'rgba(255,255,255,0.85)' : colors.textMid }]}>Loans</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/(public)/insurance')}>
                <Text style={[styles.footerColLink, { color: isDark ? 'rgba(255,255,255,0.85)' : colors.textMid }]}>Insurance</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footerColumn}>
              <Text style={[styles.footerColTitle, { color: isDark ? '#FFFFFF' : colors.text }]}>Contact Us</Text>
              <Text style={[styles.footerContactLabel, { color: isDark ? '#FFFFFF' : colors.text }]}>Phone:</Text>
              <TouchableOpacity onPress={() => Linking.openURL('tel:9270319438')}>
                <Text style={[styles.footerColLink, { color: isDark ? 'rgba(255,255,255,0.85)' : colors.textMid }]}>9270319438</Text>
              </TouchableOpacity>
              <Text style={[styles.footerContactLabel, { color: isDark ? '#FFFFFF' : colors.text, marginTop: 4 }]}>Email:</Text>
              <TouchableOpacity onPress={() => Linking.openURL('mailto:support@gharkapaisa.in')}>
                <Text style={[styles.footerColLink, { color: isDark ? 'rgba(255,255,255,0.85)' : colors.textMid }]}>support@gharkapaisa.in</Text>
              </TouchableOpacity>
              <Text style={[styles.footerContactLabel, { color: isDark ? '#FFFFFF' : colors.text, marginTop: 4 }]}>Address:</Text>
              <Text style={[styles.footerColLink, { color: isDark ? 'rgba(255,255,255,0.85)' : colors.textMid }]}>Rajnandini Tower Dighi, Pune 411015</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={[styles.footerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : (colors.border || '#E3EBE8') }]} />

          {/* Policies & Company */}
          <Text style={[styles.footerColTitle, { color: isDark ? '#FFFFFF' : colors.text, marginBottom: 10 }]}>Policies & Company</Text>
          <TouchableOpacity
            style={[styles.careersBtn, { backgroundColor: colors.teal || '#008A60' }]}
            onPress={() => router.push('/(public)/careers' as any)}
          >
            <Text style={styles.careersBtnText}>Careers / Jobs</Text>
          </TouchableOpacity>
          <View style={styles.policyLinks}>
            <TouchableOpacity onPress={() => router.push('/(public)/careers' as any)}>
              <Text style={[styles.footerColLink, { color: isDark ? 'rgba(255,255,255,0.85)' : colors.textMid }]}>Career Opportunities</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(public)/policy' as any)}>
              <Text style={[styles.footerColLink, { color: isDark ? 'rgba(255,255,255,0.85)' : colors.textMid }]}>Terms & Conditions</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(public)/policy' as any)}>
              <Text style={[styles.footerColLink, { color: isDark ? 'rgba(255,255,255,0.85)' : colors.textMid }]}>Privacy Policy</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(public)/policy' as any)}>
              <Text style={[styles.footerColLink, { color: isDark ? 'rgba(255,255,255,0.85)' : colors.textMid }]}>Shipping & Delivery Policy</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(public)/policy' as any)}>
              <Text style={[styles.footerColLink, { color: isDark ? 'rgba(255,255,255,0.85)' : colors.textMid }]}>Cancellation & Refund Policy</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(public)/contact' as any)}>
              <Text style={[styles.footerColLink, { color: isDark ? 'rgba(255,255,255,0.85)' : colors.textMid }]}>Contact Us</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Links Strip */}
          <View style={[styles.footerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : (colors.border || '#E3EBE8') }]} />
          <View style={styles.quickLinksRow}>
            <Text style={[styles.quickLinksLabel, { color: isDark ? '#FFFFFF' : colors.text }]}>Quick Links: </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/products')}>
              <Text style={[styles.quickLink, { color: colors.teal || '#008A60' }]}>Products</Text>
            </TouchableOpacity>
            <Text style={{ color: isDark ? 'rgba(255,255,255,0.4)' : colors.border }}> | </Text>
            <TouchableOpacity onPress={() => router.push('/(public)/careers' as any)}>
              <Text style={[styles.quickLink, { color: colors.teal || '#008A60', fontWeight: '800', textDecorationLine: 'underline' }]}>Career</Text>
            </TouchableOpacity>
            <Text style={{ color: isDark ? 'rgba(255,255,255,0.4)' : colors.border }}> | </Text>
            <TouchableOpacity onPress={() => router.push('/(public)/contact' as any)}>
              <Text style={[styles.quickLink, { color: colors.teal || '#008A60' }]}>Contact Us</Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={[styles.footerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : (colors.border || '#E3EBE8') }]} />

          {/* Copyright */}
          <Text style={[styles.footerCopyright, { color: isDark ? 'rgba(255,255,255,0.85)' : (colors.textMid || '#475569') }]}>
            © 2026 Developed by SP Technologies. All Rights Reserved.
          </Text>
        </View>

        {/* Bottom spacer for floating navigation */}
        <View style={{ height: 90 }} />
      </ScrollView>

      {/* ── FLOATING BOTTOM NAV (same as website mobile nav) ── */}
      <View style={[styles.bottomNavWrap, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor }]}>
        {[
          {
            key: 'home',
            label: 'Home',
            icon: 'home',
            color: '#008A60',
            active: true,
            onPress: () => router.push('/(auth)/home' as any),
          },
          {
            key: 'cards',
            label: 'Credit Cards',
            icon: 'card',
            color: '#2563EB',
            active: false,
            onPress: () => router.push({ pathname: '/(auth)/bank-cards', params: { bank: 'ALL' } } as any),
          },
          {
            key: 'login',
            label: 'Login',
            icon: 'log-in',
            color: '#7C3AED',
            active: false,
            onPress: () => router.push('/(auth)/login' as any),
          },
          {
            key: 'loan',
            label: 'Loan',
            icon: 'cash',
            color: '#D97706',
            active: false,
            onPress: () => router.push({ pathname: '/(auth)/products', params: { category: 'personal_loan' } } as any),
          },
          {
            key: 'support',
            label: 'Support',
            icon: 'headset',
            color: '#DB2777',
            active: false,
            onPress: () => router.push('/(public)/contact' as any),
          },
        ].map((item) => (
          <TouchableOpacity key={item.key} style={styles.bottomNavItem} onPress={item.onPress} activeOpacity={0.7}>
            <View
              style={[
                styles.bottomNavIconBadge,
                {
                  backgroundColor: item.active ? item.color : `${item.color}14`,
                  shadowColor: item.color,
                  shadowOpacity: item.active ? 0.35 : 0,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: item.active ? 5 : 0,
                },
              ]}
            >
              <Icon name={item.icon} size={19} color={item.active ? '#FFFFFF' : item.color} />
            </View>
            <Text style={[styles.bottomNavLabel, { color: item.active ? item.color : colors.textLight, fontWeight: item.active ? '800' : '500' }]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerBar: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: 140,
    height: 38,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 18,
  },
  authPillText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  bannerContainer: {
    marginTop: 6,
    marginBottom: 16,
  },
  bannerSlide: {
    paddingHorizontal: 16,
  },
  bannerCard: {
    height: 175,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.58)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  bannerTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  bannerTitle: {
    color: '#FFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
  bannerSubtitle: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  bannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  bannerButtonText: {
    color: '#FFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  bannerIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activeIndicator: {
    width: 20,
    height: 6,
    borderRadius: 3,
  },
  sectionContainer: {
    paddingHorizontal: 16,
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '800',
  },
  gridRow5: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  gridRow4: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  squareActionCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 3,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  squareIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  actionIconImage: {
    width: 26,
    height: 26,
  },
  squareActionLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 12,
  },
  marqueeClip: {
    overflow: 'hidden',
  },
  marqueeRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 2,
  },
  attractiveCard: {
    width: 160,
    height: 190,
    borderRadius: 8,
    borderWidth: 1,
    padding: 8,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  attractiveImgBox: {
    width: '100%',
    height: 90,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  attractiveImage: {
    width: '90%',
    height: '90%',
  },
  attractiveTextBox: {
    gap: 4,
    paddingHorizontal: 2,
  },
  attractiveTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    lineHeight: 16,
  },
  attractiveDesc: {
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 13,
  },
  loadingBox: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  popularCard: {
    width: (width - 40) / 2,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    height: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  popularCardImageBox: {
    height: 80,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: 4,
    overflow: 'hidden',
  },
  popularCardImage: {
    width: '92%',
    height: '92%',
  },
  popularCardDetails: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 10,
    paddingTop: 4,
  },
  popularCardTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    lineHeight: 14,
    height: 28,
    textAlign: 'center',
    marginTop: 2,
  },
  applyBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  bankGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  bankCard: {
    width: (width - 32 - 18) / 4,
    height: 46,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  bankLogoImage: {
    width: '85%',
    height: '85%',
  },
  tickerBadge: {
    width: 115,
    height: 46,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  tickerLogo: {
    width: '85%',
    height: '85%',
  },
  serviceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  serviceBtn: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  serviceIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  serviceBtnText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  popularGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridRow2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  insuranceCard: {
    width: (width - 42) / 2,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  insuranceIconBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  insuranceLabel: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 15,
  },
  footerContainer: {
    marginTop: 24,
    marginHorizontal: 16,
    padding: 22,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  footerBrand: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  footerTagline: {
    fontSize: 12.5,
    fontWeight: '700',
    marginBottom: 12,
  },
  footerDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 18,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  socialIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerDivider: {
    height: 1,
    width: '100%',
    marginVertical: 16,
  },
  footerColumnsRow: {
    flexDirection: 'row',
    gap: 24,
  },
  footerColumn: {
    flex: 1,
    gap: 8,
  },
  footerColTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  footerColLink: {
    fontSize: 13,
    lineHeight: 18,
  },
  footerContactLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  careersBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  careersBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  policyLinks: {
    gap: 8,
    marginBottom: 4,
  },
  footerCopyright: {
    fontSize: 12,
  },
  quickLinksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 2,
  },
  quickLinksLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  quickLink: {
    fontSize: 12,
    fontWeight: '600',
  },
  // ── Floating bottom nav (matches website HomeMobileBottomNav) ──
  bottomNavWrap: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    maxWidth: 540,
    alignSelf: 'center',
    height: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 10,
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  bottomNavLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  bottomNavIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
