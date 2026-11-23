import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Share,
  RefreshControl,
  Modal,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { Icon, IconName } from './Icon';
import { spacing } from '../theme/spacing';
import apiClient from '../services/api';
import { generatePartnerShareLink } from '../services/partner.service';
import { resolveMediaUrl } from '../services/messenger.service';

// ── Ported from frontend/src/modules/partner/dashboard/PartnerCategoryOverview.jsx ──

const toSlug = (text: string) =>
  text ? text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '';

const getBankAccent = (slug: string, name: string): string => {
  const s = (slug || name || '').toLowerCase();
  if (s.includes('hdfc')) return '#2563EB';
  if (s.includes('sbi')) return '#0284C7';
  if (s.includes('icici')) return '#F97316';
  if (s.includes('axis')) return '#E11D48';
  if (s.includes('indusind')) return '#991B1B';
  if (s.includes('idfc')) return '#DC2626';
  if (s.includes('au')) return '#D97706';
  if (s.includes('hsbc')) return '#E11D48';
  if (s.includes('federal')) return '#2563EB';
  if (s.includes('baroda') || s.includes('bob')) return '#EA580C';
  if (s.includes('yes')) return '#2563EB';
  if (s.includes('kotak')) return '#DC2626';
  if (s.includes('dcb')) return '#0284C7';
  if (s.includes('rbl')) return '#0284C7';
  if (s.includes('equitas')) return '#059669';
  if (s.includes('sbm')) return '#4F46E5';
  return '#2563EB';
};

const CARD_CATEGORIES = ['credit_card', 'co_branded_card', 'fd_card'];

const LOAN_ONLY_PATTERNS = [
  'bajaj', 'finable', 'finaable', 'prefr', 'kreditbee', 'kredit bee',
  'punawalla', 'poonawalla', 'ram fincorp', 'ramfin', 'tata capital', 'unity',
];

const isLoanOnlyBank = (name: string, code: string) => {
  const n = name.toLowerCase();
  const c = code.toUpperCase();
  return ['BAJAJ', 'BAJAJ_FINANCE', 'BA', 'FINABLE', 'FI', 'KREDITBEE', 'KR',
    'PUNAWALLA', 'POONAWALLA', 'PU', 'RAMFINCORP', 'RAM_FINCORP', 'RA',
    'TATACAPITAL', 'TATA_CAPITAL', 'TA', 'UNITY', 'UNITY_BANK', 'UN'].includes(c)
    || LOAN_ONLY_PATTERNS.some((p) => n.includes(p));
};

// ── Port of isProductOfSubCategory (utils/personalLoanHelpers.js) ──
const isProductOfSubCategory = (p: any, subCat: string): boolean => {
  if (!subCat || subCat === 'all' || String(subCat).toLowerCase() === 'all') return true;
  if (!p) return false;

  const rawSlug = String(subCat).toLowerCase().trim();
  const slug = rawSlug.replace(/[-_]/g, ' ').trim();
  const pCat = String(p.category || '').toLowerCase().trim();
  const pSub = String(p.sub_category || '').toLowerCase().trim();
  const pName = String(p.name || '').toLowerCase().trim();

  if (rawSlug === 'home-loan' || rawSlug === 'home_loan' || rawSlug === 'home' || slug === 'home loan') {
    return (
      pCat === 'home_loan' || pCat.includes('home_loan') || pCat.includes('homeloan') ||
      pSub.includes('home loan') || pSub === 'home' ||
      pName.includes('home loan') || pName.includes('housing loan') ||
      pName.includes('home purchase') || pName.includes('home construction') || pName.includes('plot loan')
    );
  }

  if (rawSlug === 'personal-loan' || rawSlug === 'personal_loan' || rawSlug === 'personal' || slug === 'personal loan') {
    const isLocEocOrCardLoan = (
      ['loan_on_credit_card', 'loc_eoc', 'smart_emi', 'loc', 'eoc', 'card_on_loan'].includes(pCat) ||
      pSub.includes('credit card') || pSub.includes('loc') || pSub.includes('eoc') ||
      pSub.includes('smart emi') || pName.includes('on credit card') ||
      pName.includes('smart emi') || pName.includes('limit to cash') || pName.includes('encash')
    );
    if (isLocEocOrCardLoan) return false;
    if (pCat === 'home_loan' || pCat.includes('home_loan') || pName.includes('home loan')) return false;
    if (pCat === 'business_loan' || pCat.includes('business') || pName.includes('business loan')) return false;
    if (pCat === 'used_car_loan' || pCat.includes('car') || pName.includes('car loan')) return false;
    if (pCat.includes('gold') || pName.includes('gold loan')) return false;
    return (
      pCat === 'personal_loan' || pCat === 'instant_loan' || pCat.includes('personal') ||
      pSub.includes('personal') || pName.includes('personal loan') ||
      pName.includes('xpress credit') || pName.includes('cash loan')
    );
  }

  if (
    rawSlug === 'business-loan' || rawSlug === 'business_loan' || rawSlug === 'business' ||
    slug === 'business loan' || slug === 'msme loan' || slug === 'sme loan'
  ) {
    return (
      pCat === 'business_loan' || pCat.includes('business') || pSub.includes('business') ||
      pSub.includes('msme') || pSub.includes('sme') || pName.includes('business loan') ||
      pName.includes('msme') || pName.includes('sme loan') || pName.includes('commercial loan')
    );
  }

  if (
    rawSlug === 'loan-against-property' || rawSlug === 'lap' || rawSlug === 'lac' ||
    slug === 'loan against property' || slug === 'lap'
  ) {
    return (
      pCat === 'lac' || pCat.includes('property') || pCat.includes('lap') ||
      pSub.includes('property') || pSub.includes('lap') ||
      pName.includes('against property') || pName.includes('loan against property') ||
      pName.includes('mortgage') || pName.includes('lap')
    );
  }

  if (
    rawSlug === 'vehicle-loan' || rawSlug === 'car-loan' || rawSlug === 'auto-loan' ||
    rawSlug === 'bike-loan' || rawSlug === 'used-car-loan' ||
    slug.includes('vehicle') || slug.includes('car loan') || slug.includes('bike')
  ) {
    return (
      pCat === 'used_car_loan' || pCat.includes('car') || pCat.includes('vehicle') ||
      pCat.includes('auto') || pCat.includes('bike') ||
      pSub.includes('car') || pSub.includes('vehicle') || pSub.includes('auto') || pSub.includes('bike') ||
      pName.includes('car loan') || pName.includes('vehicle loan') ||
      pName.includes('auto loan') || pName.includes('bike loan') || pName.includes('two wheeler')
    );
  }

  if (rawSlug === 'gold-loan' || rawSlug === 'gold_loan' || rawSlug === 'gold' || slug === 'gold loan') {
    return (
      pCat.includes('gold') || pSub.includes('gold') ||
      pName.includes('gold loan') || pName.includes('gold')
    );
  }

  if (rawSlug === 'education-loan' || rawSlug === 'edu-loan' || rawSlug === 'education_loan' || slug === 'education loan') {
    return (
      pCat === 'education_loan' || pCat.includes('education') || pSub.includes('education') ||
      pSub.includes('student') || pName.includes('education loan') || pName.includes('student loan')
    );
  }

  if (
    rawSlug === 'loan-on-credit-card' || rawSlug === 'smart-emi' ||
    rawSlug === 'loc-eoc' || rawSlug === 'loc' || rawSlug === 'eoc' ||
    slug.includes('credit card') || slug.includes('smart emi') || slug === 'loc' || slug === 'eoc'
  ) {
    return (
      ['loan_on_credit_card', 'smart_emi', 'loc_eoc', 'loc', 'eoc', 'card_on_loan'].includes(pCat) ||
      pSub.includes('credit card') || pSub.includes('loc') || pSub.includes('eoc') ||
      pSub.includes('smart emi') || pName.includes('on credit card') ||
      pName.includes('dial-a-loan') || pName.includes('instant personal loan on card') ||
      pName.includes('insta loan') || pName.includes('jumbo loan') ||
      pName.includes('split-n-pay') || pName.includes('encash')
    );
  }

  if (rawSlug === 'health-insurance' || rawSlug === 'health' || slug === 'health insurance') {
    return (
      pCat === 'health_insurance' || pCat.includes('health') || pSub.includes('health') ||
      pName.includes('health') || pName.includes('mediclaim') || pName.includes('hospital')
    );
  }

  if (rawSlug === 'life-insurance' || rawSlug === 'life' || slug === 'life insurance') {
    return (
      pCat === 'life_insurance' || pCat.includes('life') || pSub.includes('life') ||
      pName.includes('life insurance') || pName.includes('life plan')
    );
  }

  if (
    rawSlug === 'general-insurance' || rawSlug === 'motor-insurance' ||
    rawSlug === 'car-insurance' || slug.includes('general') || slug.includes('motor')
  ) {
    return (
      pCat === 'general_insurance' || pCat.includes('general') || pCat.includes('motor') ||
      pCat.includes('vehicle') || pSub.includes('general') || pSub.includes('motor') ||
      pSub.includes('vehicle') || pName.includes('motor') || pName.includes('general') ||
      pName.includes('vehicle insurance') || pName.includes('car insurance')
    );
  }

  if (rawSlug === 'term-insurance' || rawSlug === 'term' || slug === 'term insurance') {
    return (
      pCat.includes('term') || pSub.includes('term') ||
      pName.includes('term insurance') || pName.includes('term plan')
    );
  }

  if (pSub && (pSub.toLowerCase() === slug || pSub.toLowerCase().replace(/[-_]/g, ' ') === slug)) return true;
  if (pCat && (pCat.toLowerCase() === rawSlug || pCat.toLowerCase().replace(/[-_]/g, ' ') === slug)) return true;

  const words = slug.split(/\s+/).filter(w => w.length > 2 && w !== 'loan' && w !== 'insurance');
  if (words.length > 0) {
    const allWordsMatch = words.every(w => pCat.includes(w) || pSub.includes(w) || pName.includes(w));
    if (allWordsMatch) return true;
  }

  return false;
};

// ── Category card definitions (website loanRoleCards / insuranceRoleCards) ──
type CategoryKind = 'credit_card' | 'loans' | 'insurance';

interface CategoryCard {
  title: string;
  sub: string;
  slug: string;
  accent: string;
  icon: IconName;
  defaultOffers: number;
}

const LOAN_CATEGORY_CARDS: CategoryCard[] = [
  { title: 'Personal Loan', sub: 'Loan Category', slug: 'personal-loan', accent: '#2563EB', icon: 'cash', defaultOffers: 12 },
  { title: 'Home Loan', sub: 'Loan Category', slug: 'home-loan', accent: '#059669', icon: 'home', defaultOffers: 8 },
  { title: 'Business Loan', sub: 'Loan Category', slug: 'business-loan', accent: '#7C3AED', icon: 'business', defaultOffers: 10 },
  { title: 'Loan Against Property', sub: 'Loan Category', slug: 'loan-against-property', accent: '#D97706', icon: 'business', defaultOffers: 6 },
  { title: 'Gold Loan', sub: 'Loan Category', slug: 'gold-loan', accent: '#EA580C', icon: 'diamond', defaultOffers: 5 },
  { title: 'Vehicle Loan', sub: 'Loan Category', slug: 'vehicle-loan', accent: '#0284C7', icon: 'car', defaultOffers: 7 },
];

const INSURANCE_CATEGORY_CARDS: CategoryCard[] = [
  { title: 'Health Insurance', sub: 'Insurance Policy', slug: 'health-insurance', accent: '#059669', icon: 'medkit', defaultOffers: 12 },
  { title: 'Life Insurance', sub: 'Insurance Policy', slug: 'life-insurance', accent: '#2563EB', icon: 'shield', defaultOffers: 8 },
  { title: 'General Insurance', sub: 'Insurance Policy', slug: 'general-insurance', accent: '#D97706', icon: 'umbrella', defaultOffers: 15 },
  { title: 'Motor Insurance', sub: 'Insurance Policy', slug: 'motor-insurance', accent: '#E11D48', icon: 'car', defaultOffers: 9 },
  { title: 'Term Insurance', sub: 'Insurance Policy', slug: 'term-insurance', accent: '#7C3AED', icon: 'receipt', defaultOffers: 7 },
];

interface BankCard {
  id: string;
  name: string;
  slug: string;
  short_code?: string;
  rawCount: number;
  activeCardsCount: string;
  logo?: string | null;
  accent: string;
  bankCategory: 'psu' | 'private';
  categories?: string[];
}

interface Product {
  id: string;
  name?: string;
  bank_name?: string;
  bank_code?: string;
  bank_id?: string;
  category?: string;
  sub_category?: string;
  description?: string;
  features?: any;
  commission_value?: number | string;
  image_url?: string;
  logo?: string;
  apply_url?: string;
  direct_url?: string;
  [key: string]: any;
}

const CATEGORY_META: Record<CategoryKind, {
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  allFilterLabel: string;
  mostSortLabel: string;
  countNoun: string;
  exploreLabel: string;
}> = {
  credit_card: {
    title: 'Credit Cards Catalog',
    subtitle: 'Browse cards across all partner banks',
    searchPlaceholder: 'Search banks...',
    allFilterLabel: 'All Banks',
    mostSortLabel: 'Most Card Variants',
    countNoun: 'Card Variants',
    exploreLabel: 'Explore Cards',
  },
  loans: {
    title: 'Loans Catalog',
    subtitle: 'Browse loan products across categories',
    searchPlaceholder: 'Search product...',
    allFilterLabel: 'All Loan Categories',
    mostSortLabel: 'Most Active Offers',
    countNoun: 'Active Offers',
    exploreLabel: 'Explore Offers',
  },
  insurance: {
    title: 'Insurance Catalog',
    subtitle: 'Browse insurance plans across categories',
    searchPlaceholder: 'Search product...',
    allFilterLabel: 'All Insurance Types',
    mostSortLabel: 'Most Active Plans',
    countNoun: 'Active Plans',
    exploreLabel: 'Explore Plans',
  },
};

export default function EmployeeCategoryOverview({ category = 'credit_card' as CategoryKind }: { category?: CategoryKind }) {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const meta = CATEGORY_META[category];
  const isCreditCard = category === 'credit_card';

  const [banks, setBanks] = useState<BankCard[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [bankCategoryFilter, setBankCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'default' | 'most' | 'name-asc' | 'name-desc'>('default');

  const [selectedEntity, setSelectedEntity] = useState<{ type: 'bank' | 'category'; bank?: BankCard; card?: CategoryCard } | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const requests: Promise<any>[] = [
        apiClient.get('/products', { params: { is_active: 'true', limit: 1000 } }),
      ];
      if (isCreditCard) {
        requests.push(apiClient.get('/banks', { params: { limit: 100, category: 'credit_card' } }));
      }
      const results = await Promise.allSettled(requests);

      const productsRes = results[0];
      if (productsRes.status === 'fulfilled') {
        const pdata = productsRes.value?.data?.data ?? productsRes.value?.data;
        const list: Product[] = Array.isArray(pdata) ? pdata : (pdata?.rows || []);
        setAllProducts(list);
      }

      if (isCreditCard) {
        const banksRes = results[1];
        if (banksRes.status === 'fulfilled') {
          const bdata = banksRes.value?.data?.data ?? banksRes.value?.data?.banks ?? banksRes.value?.data;
          const list: any[] = Array.isArray(bdata) ? bdata : [];
          const products = allProducts.length > 0 ? allProducts : [];
          if (list.length > 0) {
            const pdata2 = productsRes.status === 'fulfilled'
              ? (Array.isArray((productsRes.value?.data?.data)) ? productsRes.value.data.data : ((productsRes.value?.data?.data)?.rows || []))
              : [];
            const mapped: BankCard[] = list.map((b: any) => {
              const bName = b.name || b.bank_name || 'Bank';
              const bShort = b.short_code || b.code || '';
              const bSlug = (bShort || toSlug(bName)).toLowerCase();

              let pCount = parseInt(b.products_count || b.card_count || b.cards_count || 0, 10) || 0;
              const cardProductsForBank = pdata2.filter(
                (p: any) =>
                  (p.bank_id === b.id || (p.bank_code && String(p.bank_code).toLowerCase() === bSlug)) &&
                  CARD_CATEGORIES.includes(String(p.category || '').toLowerCase())
              );
              if (cardProductsForBank.length > 0) pCount = cardProductsForBank.length;

              const logo = resolveMediaUrl(b.logo_url || b.logo || b.image) || null;
              return {
                id: String(b.id ?? bSlug),
                name: bName,
                slug: bSlug,
                short_code: bShort,
                rawCount: pCount,
                activeCardsCount: pCount > 0 ? pCount.toLocaleString('en-IN') : '0',
                logo,
                accent: getBankAccent(bSlug, bName),
                bankCategory: String(b.bank_type || b.type || b.category || '').toLowerCase().includes('psu') ? 'psu' : 'private',
                categories: Array.isArray(b.categories) ? b.categories : [],
              };
            });
            setBanks(mapped);
          } else {
            setBanks([]);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load category data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isCreditCard]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Credit card banks (website filteredBanks) ──
  const filteredBanks = useMemo(() => {
    let list = banks.filter((b) => {
      const bSlug = (b.slug || '').toLowerCase();
      const bName = (b.name || '').toLowerCase();
      const bCode = (b.short_code || '').toUpperCase();

      if (bSlug.includes('loc_eoc') || bSlug.includes('loc-eoc') || bName.includes('loc/eoc') || bName.includes('loan on card') || bName.includes('smart emi')) {
        return false;
      }
      if (isLoanOnlyBank(b.name, bCode)) return false;

      if (Array.isArray(b.categories) && b.categories.length > 0) {
        const hasCardCategory = b.categories.some((cat) =>
          ['credit_card', 'co_branded_card', 'fd_card', 'cards'].includes(String(cat).toLowerCase())
        );
        if (!hasCardCategory) return false;
      }

      const q = searchQuery.toLowerCase().trim();
      const matchesQuery = !q || b.name.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q);
      const matchesCategory =
        bankCategoryFilter === 'all' ||
        (bankCategoryFilter === 'psu' && b.bankCategory === 'psu') ||
        (bankCategoryFilter === 'private' && b.bankCategory === 'private');
      return matchesQuery && matchesCategory;
    });

    if (sortBy === 'most') list = [...list].sort((a, b) => b.rawCount - a.rawCount);
    else if (sortBy === 'name-asc') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'name-desc') list = [...list].sort((a, b) => b.name.localeCompare(a.name));

    return list;
  }, [banks, searchQuery, bankCategoryFilter, sortBy]);

  // ── Loan / Insurance category cards (website loanCategoriesList / insuranceCategoriesList) ──
  const baseCards = category === 'loans' ? LOAN_CATEGORY_CARDS : category === 'insurance' ? INSURANCE_CATEGORY_CARDS : [];

  const categoryCards = useMemo(() => {
    const hasLoadedProducts = allProducts.length > 0;
    return baseCards.map((cat) => {
      const dbMatchCount = allProducts.filter((p) => isProductOfSubCategory(p, cat.slug)).length;
      const offerCount = hasLoadedProducts ? dbMatchCount : cat.defaultOffers;
      return {
        ...cat,
        rawCount: offerCount,
        availableOffers: `${offerCount} Active ${cat.title} ${category === 'loans' ? 'Offers' : 'Plans'}`,
      };
    });
  }, [baseCards, allProducts, category]);

  const filteredCategoryCards = useMemo(() => {
    let list = categoryCards.filter((card) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery = !q || card.title.toLowerCase().includes(q) || card.slug.toLowerCase().includes(q);
      const matchesCategory = bankCategoryFilter === 'all' || card.slug === bankCategoryFilter;
      return matchesQuery && matchesCategory;
    });

    if (sortBy === 'most') list = [...list].sort((a, b) => b.rawCount - a.rawCount);
    else if (sortBy === 'name-asc') list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    else if (sortBy === 'name-desc') list = [...list].sort((a, b) => b.title.localeCompare(a.title));

    return list;
  }, [categoryCards, searchQuery, bankCategoryFilter, sortBy]);

  // ── Matching products while searching ──
  const matchingProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    return allProducts.filter((p) => {
      const pName = (p.name || '').toLowerCase();
      const bName = (p.bank_name || (p.bank as any)?.name || p.bank_code || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      const subCat = (p.sub_category || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      const features = Array.isArray(p.features) ? p.features.join(' ').toLowerCase() : String(p.features || '').toLowerCase();
      return pName.includes(q) || bName.includes(q) || cat.includes(q) || subCat.includes(q) || desc.includes(q) || features.includes(q);
    });
  }, [allProducts, searchQuery]);

  // ── Products inside the selected entity modal ──
  const entityProducts = useMemo(() => {
    if (!selectedEntity) return [];
    if (selectedEntity.type === 'bank' && selectedEntity.bank) {
      const bank = selectedEntity.bank;
      const slug = bank.slug;
      return allProducts.filter((p) => {
        const isCard = CARD_CATEGORIES.includes(String(p.category || '').toLowerCase());
        if (!isCard) return false;
        return (
          p.bank_id === bank.id ||
          (p.bank_code && String(p.bank_code).toLowerCase() === slug) ||
          (p.bank_name && p.bank_name.toLowerCase().includes(bank.name.toLowerCase().split(' ')[0]))
        );
      });
    }
    if (selectedEntity.type === 'category' && selectedEntity.card) {
      return allProducts.filter((p) => isProductOfSubCategory(p, selectedEntity.card!.slug));
    }
    return [];
  }, [allProducts, selectedEntity]);

  const handleShareProduct = async (product: Product) => {
    try {
      setSharingId(String(product.id));
      let shareUrl = product.apply_url || product.direct_url;
      try {
        const linkRes = await generatePartnerShareLink(product.id, { customer_name: 'Customer Referral' });
        if (linkRes?.share_url || linkRes?.short_url) shareUrl = linkRes.share_url || linkRes.short_url;
      } catch (_) {}

      const payout = parseFloat(String(product.commission_value || 0)) || 0;
      const message =
        `Apply for ${product.name} with GharKaPaisa!\n` +
        (payout > 0 ? `• Earn up to ₹${payout.toLocaleString('en-IN')}\n` : '') +
        `• Fast 100% digital approval journey.\n\n` +
        `Apply here: ${shareUrl || 'https://gharkapaisa.com'}`;
      await Share.share({ title: product.name || 'Product', message, url: shareUrl });
    } catch (e) {
      console.warn('Share error:', e);
    } finally {
      setSharingId(null);
    }
  };

  const handleApplyProduct = (product: Product) => {
    router.push({
      pathname: '/(app)/add-lead',
      params: {
        category,
        productName: product.name || '',
        productId: String(product.id || ''),
      },
    } as any);
  };

  const productImage = (p: Product) =>
    resolveMediaUrl(p.image_url || p.logo || p.image || p.bank_logo || p.card_image);

  const entityTitle = selectedEntity?.type === 'bank' ? selectedEntity.bank?.name : selectedEntity?.card?.title;
  const entityAccent = selectedEntity?.type === 'bank' ? selectedEntity.bank?.accent : selectedEntity?.card?.accent;
  const entityLogo = selectedEntity?.type === 'bank' ? selectedEntity.bank?.logo : null;
  const entityInitial = entityTitle ? entityTitle.substring(0, 2).toUpperCase() : '';

  // ── Renderers ──
  const renderProductCard = (product: Product) => {
    const payout = parseFloat(String(product.commission_value || 0)) || 0;
    const img = productImage(product);
    return (
      <TouchableOpacity
        key={`prod-${product.id}`}
        style={[styles.matchCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: colors.border }]}
        onPress={() => handleApplyProduct(product)}
        activeOpacity={0.8}
      >
        <View style={styles.matchTop}>
          {img ? (
            <Image source={{ uri: img }} style={styles.matchLogo} resizeMode="contain" />
          ) : (
            <View style={[styles.matchLogoFallback, { backgroundColor: colors.primary + '15' }]}>
              <Text style={{ fontSize: 18 }}>{isCreditCard ? '💳' : '📄'}</Text>
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.matchBank, { color: colors.primary }]} numberOfLines={1}>
              {(product.bank_name || product.bank_code || 'Bank Product').toUpperCase()}
            </Text>
            <Text style={[styles.matchName, { color: colors.text }]} numberOfLines={1}>
              {product.name}
            </Text>
          </View>
        </View>
        <View style={[styles.matchFooter, { borderTopColor: colors.border }]}>
          <Text style={[styles.matchPayout, { color: '#059669' }]}>
            {payout > 0 ? `Earn ₹${payout.toLocaleString('en-IN')}` : 'Best Rate'}
          </Text>
          <View style={styles.matchApplyRow}>
            <Text style={[styles.matchApply, { color: colors.primary }]}>View & Apply</Text>
            <Icon name="arrow-forward" size={13} color={colors.primary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderBankCard = (bank: BankCard) => {
    const accent = bank.accent;
    return (
      <TouchableOpacity
        key={`bank-${bank.id}`}
        style={[
          styles.bankCard,
          {
            borderColor: isDark ? accent + '55' : accent + '40',
            backgroundColor: isDark ? accent + '18' : accent + '0F',
          },
        ]}
        onPress={() => setSelectedEntity({ type: 'bank', bank })}
        activeOpacity={0.85}
      >
        <View style={styles.bankTop}>
          {bank.logo ? (
            <View style={[styles.logoBox, { borderColor: accent + '55', backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]}>
              <Image source={{ uri: bank.logo }} style={styles.logoImg} resizeMode="contain" />
            </View>
          ) : (
            <View style={[styles.logoBox, styles.logoInitials, { borderColor: accent + '55', backgroundColor: accent + '22' }]}>
              <Text style={[styles.initialsText, { color: accent }]}>
                {bank.name.substring(0, 2).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={[styles.bankName, { color: isDark ? '#FFFFFF' : accent }]} numberOfLines={2}>
            {bank.name}
          </Text>
        </View>

        <View>
          <Text style={[styles.bigCount, { color: accent }]}>{bank.activeCardsCount}</Text>
          <Text style={[styles.countLabel, { color: isDark ? 'rgba(255,255,255,0.75)' : accent + 'DD' }]}>
            {meta.countNoun}
          </Text>
        </View>

        <View style={[styles.cardFooter, { borderTopColor: accent + '30' }]}>
          <Text style={[styles.exploreText, { color: accent }]}>
            {meta.exploreLabel} <Icon name="arrow-forward" size={13} color={accent} />
          </Text>
        </View>

        <View style={[styles.accentBar, { backgroundColor: accent }]} />
      </TouchableOpacity>
    );
  };

  const renderCategoryCard = (card: CategoryCard & { rawCount: number; availableOffers: string }) => {
    const accent = card.accent;
    return (
      <TouchableOpacity
        key={`cat-${card.slug}`}
        style={[
          styles.bankCard,
          {
            borderColor: isDark ? accent + '55' : accent + '40',
            backgroundColor: isDark ? accent + '18' : accent + '0F',
          },
        ]}
        onPress={() => setSelectedEntity({ type: 'category', card })}
        activeOpacity={0.85}
      >
        <View style={styles.bankTop}>
          <View style={[styles.logoBox, styles.logoInitials, { borderColor: accent + '55', backgroundColor: accent + '22' }]}>
            <Icon name={card.icon} size={20} color={accent} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.cardSub, { color: accent }]} numberOfLines={1}>{card.sub.toUpperCase()}</Text>
            <Text style={[styles.bankName, { color: isDark ? '#FFFFFF' : accent, fontSize: 14 }]} numberOfLines={2}>
              {card.title}
            </Text>
          </View>
        </View>

        <View>
          <Text style={[styles.bigCount, { color: accent }]}>{card.rawCount.toLocaleString('en-IN')}</Text>
          <Text style={[styles.countLabel, { color: isDark ? 'rgba(255,255,255,0.75)' : accent + 'DD' }]} numberOfLines={2}>
            {card.availableOffers}
          </Text>
        </View>

        <View style={[styles.cardFooter, { borderTopColor: accent + '30' }]}>
          <Text style={[styles.exploreText, { color: accent }]}>
            {meta.exploreLabel} <Icon name="arrow-forward" size={13} color={accent} />
          </Text>
        </View>

        <View style={[styles.accentBar, { backgroundColor: accent }]} />
      </TouchableOpacity>
    );
  };

  const gridItems = isCreditCard ? filteredBanks.map(renderBankCard) : filteredCategoryCards.map(renderCategoryCard);
  const gridEmpty = isCreditCard ? filteredBanks.length === 0 : filteredCategoryCards.length === 0;

  // Category filter chips for loans/insurance
  const categoryFilterOptions = baseCards.map((c) => ({ value: c.slug, label: c.title }));

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={colors.primary} />}
      >
        {/* Header */}
        <Text style={[styles.pageTitle, { color: colors.text }]}>{meta.title}</Text>
        <Text style={[styles.pageSub, { color: colors.textMid }]}>{meta.subtitle}</Text>

        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: colors.border }]}>
          <Icon name="search" size={18} color={colors.textLight} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={meta.searchPlaceholder}
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close" size={16} color={colors.textLight} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filters */}
        {isCreditCard ? (
          <>
            <View style={styles.filterRow}>
              {(['all', 'private', 'psu'] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.filterChip,
                    { borderColor: colors.border, backgroundColor: isDark ? '#1E293B' : '#FFFFFF' },
                    bankCategoryFilter === f && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => setBankCategoryFilter(f)}
                >
                  <Text style={[styles.filterChipText, { color: bankCategoryFilter === f ? '#fff' : colors.text }]}>
                    {f === 'all' ? meta.allFilterLabel : f === 'private' ? 'Private Banks' : 'PSU Banks'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.filterRow}>
              {([
                ['default', 'Sort By'],
                ['most', meta.mostSortLabel],
                ['name-asc', 'Name A-Z'],
                ['name-desc', 'Name Z-A'],
              ] as const).map(([val, label]) => (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.filterChip,
                    { borderColor: colors.border, backgroundColor: isDark ? '#1E293B' : '#FFFFFF' },
                    sortBy === val && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => setSortBy(val)}
                >
                  <Text style={[styles.filterChipText, { color: sortBy === val ? '#fff' : colors.textMid }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  { borderColor: colors.border, backgroundColor: isDark ? '#1E293B' : '#FFFFFF' },
                  bankCategoryFilter === 'all' && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setBankCategoryFilter('all')}
              >
                <Text style={[styles.filterChipText, { color: bankCategoryFilter === 'all' ? '#fff' : colors.text }]}>
                  {meta.allFilterLabel}
                </Text>
              </TouchableOpacity>
              {categoryFilterOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.filterChip,
                    { borderColor: colors.border, backgroundColor: isDark ? '#1E293B' : '#FFFFFF' },
                    bankCategoryFilter === opt.value && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => setBankCategoryFilter(opt.value)}
                >
                  <Text style={[styles.filterChipText, { color: bankCategoryFilter === opt.value ? '#fff' : colors.textMid }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.filterRow}>
              {([
                ['default', 'Sort By'],
                ['most', meta.mostSortLabel],
                ['name-asc', 'Name A-Z'],
                ['name-desc', 'Name Z-A'],
              ] as const).map(([val, label]) => (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.filterChip,
                    { borderColor: colors.border, backgroundColor: isDark ? '#1E293B' : '#FFFFFF' },
                    sortBy === val && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => setSortBy(val)}
                >
                  <Text style={[styles.filterChipText, { color: sortBy === val ? '#fff' : colors.textMid }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Matching products while searching */}
        {searchQuery.trim() !== '' && matchingProducts.length > 0 && (
          <View style={{ marginTop: spacing.md, marginBottom: spacing.sm }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Matching Credit Cards & Products ({matchingProducts.length})
            </Text>
            {matchingProducts.slice(0, 12).map(renderProductCard)}
          </View>
        )}

        {/* Entity grid */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textMid }]}>Loading {category === 'credit_card' ? 'banks' : 'products'} from database...</Text>
          </View>
        ) : gridEmpty && matchingProducts.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: colors.border }]}>
            <Text style={[styles.emptyText, { color: colors.textMid }]}>
              No {category === 'credit_card' ? 'banks' : 'products'} found matching "{searchQuery}"
            </Text>
          </View>
        ) : (
          <View style={styles.bankGrid}>{gridItems}</View>
        )}
      </ScrollView>

      {/* Entity detail modal — bank's cards or category's products */}
      <Modal visible={!!selectedEntity} transparent animationType="slide" onRequestClose={() => setSelectedEntity(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]}>
            {selectedEntity && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    {entityLogo ? (
                      <Image source={{ uri: entityLogo }} style={styles.modalLogo} resizeMode="contain" />
                    ) : selectedEntity.type === 'category' ? (
                      <View style={[styles.modalLogoFallback, { backgroundColor: (entityAccent || '#2563EB') + '22' }]}>
                        <Icon name={selectedEntity.card!.icon} size={18} color={entityAccent || '#2563EB'} />
                      </View>
                    ) : (
                      <View style={[styles.modalLogoFallback, { backgroundColor: (entityAccent || '#2563EB') + '22' }]}>
                        <Text style={{ color: entityAccent || '#2563EB', fontWeight: '900', fontSize: 13 }}>{entityInitial}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modalTitle, { color: isDark ? '#fff' : entityAccent || colors.primary }]} numberOfLines={1}>
                        {entityTitle}
                      </Text>
                      <Text style={[styles.modalSub, { color: colors.textMid }]}>
                        {entityProducts.length} product{entityProducts.length === 1 ? '' : 's'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedEntity(null)} style={styles.modalClose}>
                    <Icon name="close" size={20} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                  {entityProducts.length === 0 ? (
                    <Text style={[styles.emptyText, { color: colors.textMid, textAlign: 'center', paddingVertical: 30 }]}>
                      No products listed for this {selectedEntity.type === 'bank' ? 'bank' : 'category'} yet.
                    </Text>
                  ) : (
                    entityProducts.map((p) => {
                      const payout = parseFloat(String(p.commission_value || p.payout || 0)) || 0;
                      const img = productImage(p);
                      return (
                        <View key={p.id} style={[styles.entityProductRow, { borderColor: colors.border }]}>
                          {img ? (
                            <Image source={{ uri: img }} style={styles.entityProductLogo} resizeMode="contain" />
                          ) : (
                            <View style={[styles.entityProductLogo, { backgroundColor: colors.primary + '12', justifyContent: 'center', alignItems: 'center' }]}>
                              <Text style={{ fontSize: 14 }}>{isCreditCard ? '💳' : '📄'}</Text>
                            </View>
                          )}
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={[styles.entityProductName, { color: colors.text }]} numberOfLines={1}>{p.name}</Text>
                            {!!p.bank_name && (
                              <Text style={[styles.entityProductBank, { color: colors.textLight }]} numberOfLines={1}>{p.bank_name}</Text>
                            )}
                            <Text style={[styles.entityProductPayout, { color: '#059669' }]}>
                              {payout > 0 ? `Earn ₹${payout.toLocaleString('en-IN')}` : 'Best Rate'}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={[styles.entityProductShare, { borderColor: colors.border }]}
                            onPress={() => handleShareProduct(p)}
                            disabled={sharingId === String(p.id)}
                          >
                            <Icon name="share-2" size={15} color={colors.textMid} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.entityProductApply, { backgroundColor: colors.primary }]}
                            onPress={() => handleApplyProduct(p)}
                          >
                            <Text style={styles.entityProductApplyText}>Apply</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  pageTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.4 },
  pageSub: { fontSize: 13, marginTop: 2, marginBottom: spacing.md },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: spacing.sm,
  },
  searchInput: { flex: 1, fontSize: 13.5, fontWeight: '600' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  filterScroll: { gap: 8, paddingRight: 8, marginBottom: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 12.5, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10 },
  centered: { alignItems: 'center', paddingVertical: 48 },
  loadingText: { marginTop: 10, fontWeight: '600' },
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 40,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  emptyText: { fontSize: 13, textAlign: 'center' },
  // Matching product cards
  matchCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  matchTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  matchLogo: { width: 44, height: 44, borderRadius: 10 },
  matchLogoFallback: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  matchBank: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.4 },
  matchName: { fontSize: 14.5, fontWeight: '800', marginTop: 2 },
  matchFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 10,
  },
  matchPayout: { fontSize: 13, fontWeight: '800' },
  matchApplyRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  matchApply: { fontSize: 12.5, fontWeight: '800' },
  // Entity grid cards — website accent-card style
  bankGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, marginTop: spacing.xs },
  bankCard: {
    width: '48.5%',
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    minHeight: 170,
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
  },
  bankTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
  },
  logoInitials: {},
  logoImg: { width: '100%', height: '100%' },
  initialsText: { fontSize: 14, fontWeight: '900' },
  bankName: { flex: 1, fontSize: 14.5, fontWeight: '900', lineHeight: 18 },
  cardSub: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, marginBottom: 2 },
  bigCount: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5, lineHeight: 28 },
  countLabel: { fontSize: 11.5, fontWeight: '700', marginTop: 3 },
  cardFooter: {
    borderTopWidth: 1,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exploreText: { fontSize: 12.5, fontWeight: '900' },
  accentBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 4 },
  // Entity detail modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  modalLogo: { width: 38, height: 38, borderRadius: 10 },
  modalLogoFallback: {
    width: 38, height: 38, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  modalTitle: { fontSize: 16, fontWeight: '900' },
  modalSub: { fontSize: 11.5, marginTop: 1 },
  modalClose: { padding: 6 },
  entityProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    paddingVertical: 12,
  },
  entityProductLogo: { width: 38, height: 38, borderRadius: 8 },
  entityProductName: { fontSize: 13.5, fontWeight: '700' },
  entityProductBank: { fontSize: 11, marginTop: 1 },
  entityProductPayout: { fontSize: 11.5, fontWeight: '700', marginTop: 2 },
  entityProductShare: {
    width: 34, height: 34, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  entityProductApply: {
    paddingHorizontal: 14, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  entityProductApplyText: { color: '#fff', fontSize: 12.5, fontWeight: '800' },
});
