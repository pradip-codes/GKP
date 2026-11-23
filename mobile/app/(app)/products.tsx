import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Share,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Image,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Icon } from '../../components/Icon';
import { ThemeToggle } from '../../components/ThemeToggle';
import {
  fetchProductsList,
  fetchEmployeeProducts,
  generatePartnerShareLink,
} from '../../services/partner.service';
import { resolveMediaUrl } from '../../services/messenger.service';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

// Mirrors the website PartnerProducts category grouping (loc_eoc variants → loan_on_credit_card)
const CATEGORY_GROUPS: Record<string, string> = {
  credit_card: 'credit_card',
  card: 'credit_card',
  loan_on_credit_card: 'loan_on_credit_card',
  loc_eoc: 'loan_on_credit_card',
  loc: 'loan_on_credit_card',
  eoc: 'loan_on_credit_card',
  smart_emi: 'smart_emi',
  loans: 'loans',
  personal_loan: 'loans',
  loan: 'loans',
  insurance: 'insurance',
};

const CATEGORY_LABELS: Record<string, string> = {
  all: 'All Products',
  credit_card: 'Credit Cards',
  loan_on_credit_card: 'Loan on Credit Card',
  smart_emi: 'Smart EMI',
  loans: 'Loans',
  insurance: 'Insurance',
};

const categoryGroupOf = (cat?: string) => {
  const c = String(cat || '').toLowerCase().trim();
  return CATEGORY_GROUPS[c] || c || 'all';
};

const categoryLabel = (group: string) =>
  CATEGORY_LABELS[group] ||
  group.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());

const getName = (p: any) => p.name || p.product_name || 'Product';
const getBank = (p: any) => p.bank_name || p.bank_code || p.bank || 'Bank';
const getPayout = (p: any) =>
  Number(p.commission_value ?? p.base_incentive ?? p.commission_amount ?? p.payout ?? p.commission ?? 0) || 0;
const getImage = (p: any) =>
  resolveMediaUrl(p.image_url || p.logo || p.image || p.bank_logo || p.card_image);

const getFeatures = (p: any): string[] => {
  const raw =
    (Array.isArray(p.features) && p.features) ||
    (Array.isArray(p.features_list) && p.features_list) ||
    (Array.isArray(p.key_features) && p.key_features) ||
    (Array.isArray(p.benefits) && p.benefits) ||
    (Array.isArray(p.benefits_list) && p.benefits_list) ||
    null;
  if (raw && raw.length) {
    return raw
      .map((f: any) => (typeof f === 'string' ? f : f?.title || f?.label || f?.description || ''))
      .filter(Boolean)
      .slice(0, 3);
  }
  const desc = String(p.description || '');
  if (desc.includes('•')) {
    return desc.split('•').map((s) => s.trim()).filter(Boolean).slice(0, 3);
  }
  return desc ? [desc] : [];
};

// Mirrors website getMarketingBadges()
const getMarketingBadges = (p: any, isEmployee: boolean): string[] => {
  const val = getPayout(p);
  const cat = String(p.category || p.product_category || '').toLowerCase();
  const badges: string[] = [];
  if (val >= 1200) badges.push(isEmployee ? 'High Incentive' : 'High Commission');
  if (cat.includes('card')) {
    const n = getName(p).toLowerCase();
    badges.push(n.includes('pixel') || n.includes('zone') ? 'Lifetime Free' : 'Co Branded');
  }
  if (cat.includes('loan')) badges.push('Instant Loan');
  if (badges.length === 0) badges.push('Trending');
  return badges.slice(0, 2);
};

const getCategoryIcon = (group: string, size = 22, color = '#0EA5E9') => {
  switch (group) {
    case 'credit_card': return 'card';
    case 'loans':
    case 'loan_on_credit_card':
    case 'smart_emi': return 'cash';
    case 'insurance': return 'shield';
    default: return 'wallet';
  }
};

export default function ProductsScreen() {
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category?: string }>();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Website-style filters
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>(() => categoryGroupOf(category));
  const [activeBank, setActiveBank] = useState<string>('All Banks');
  const [sortBy, setSortBy] = useState<'featured' | 'payout' | 'name'>('featured');

  // Compare (up to 2) + benefits modal state
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [benefitsProduct, setBenefitsProduct] = useState<any | null>(null);

  const isEmployee = user?.role === 'TEAM_MEMBER' || user?.role === 'EMPLOYEE';

  const loadProducts = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      // Fetch the full catalog once — filtering is client-side like the website
      const res = isEmployee ? await fetchEmployeeProducts() : await fetchProductsList({});
      const list = Array.isArray(res) ? res : res?.data || res?.products || [];
      setProducts(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load products list');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isEmployee]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Re-apply deep-linked category when params change
  useEffect(() => {
    if (category) setActiveCategory(categoryGroupOf(category));
  }, [category]);

  // Unique category chips present in the catalog
  const categoryChips = useMemo(() => {
    const groups = new Set<string>();
    products.forEach((p) => groups.add(categoryGroupOf(p.category || p.product_category)));
    // Always include the deep-linked group even if catalog is still loading
    if (activeCategory !== 'all') groups.add(activeCategory);
    const ordered = ['credit_card', 'loan_on_credit_card', 'smart_emi', 'loans', 'insurance'];
    const rest = Array.from(groups).filter((g) => g !== 'all' && !ordered.includes(g)).sort();
    return ['all', ...ordered.filter((g) => groups.has(g)), ...rest];
  }, [products, activeCategory]);

  // Unique bank chips
  const bankChips = useMemo(() => {
    const banks = new Set<string>();
    products.forEach((p) => {
      const b = getBank(p);
      if (b && b !== 'Bank') banks.add(b);
    });
    return ['All Banks', ...Array.from(banks).sort((a, b) => a.localeCompare(b))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = products.filter((p) => {
      if (activeCategory !== 'all' && categoryGroupOf(p.category || p.product_category) !== activeCategory) return false;
      if (activeBank !== 'All Banks') {
        const b = String(getBank(p)).toLowerCase();
        const sel = activeBank.toLowerCase();
        if (!(b === sel || b.includes(sel) || sel.includes(b))) return false;
      }
      if (q) {
        const hay = `${getName(p)} ${getBank(p)} ${p.description || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sortBy === 'payout') {
      list = [...list].sort((a, b) => getPayout(b) - getPayout(a));
    } else if (sortBy === 'name') {
      list = [...list].sort((a, b) => getName(a).localeCompare(getName(b)));
    }
    return list;
  }, [products, search, activeCategory, activeBank, sortBy]);

  const handleShareProduct = async (item: any) => {
    try {
      let shareUrl = item.referral_url || item.share_url;
      if (!shareUrl && !isEmployee) {
        const genRes = await generatePartnerShareLink(item.id || item.product_id);
        if (genRes?.success && genRes.shareUrl) shareUrl = genRes.shareUrl;
      }
      if (!shareUrl) shareUrl = `https://gharkapaisa.in/apply/${item.id || item.product_id}`;
      await Share.share({
        title: getName(item),
        message: `Apply for ${getName(item)} on GharKaPaisa: ${shareUrl}`,
        url: shareUrl,
      });
    } catch {
      Alert.alert('Share', 'Could not open share dialog.');
    }
  };

  const toggleCompare = (item: any) => {
    const id = String(item.id || item.product_id);
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) {
        Alert.alert('Compare', 'You can select up to 2 products to compare.');
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleApply = (item: any) => {
    const pId = item.id || item.product_id;
    router.push(`/add-lead?product_id=${pId}` as any);
  };

  const renderProductCard = ({ item }: { item: any }) => {
    const pId = String(item.id || item.product_id || '');
    const name = getName(item);
    const bankName = getBank(item);
    const bankCode = item.bank_code || bankName;
    const payout = getPayout(item);
    const group = categoryGroupOf(item.category || item.product_category);
    const imgUri = getImage(item);
    const features = getFeatures(item);
    const badges = getMarketingBadges(item, isEmployee);
    const isComparing = compareIds.includes(pId);

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? colors.card : '#FFFFFF',
            borderColor: isComparing ? colors.primary : colors.border,
            borderWidth: isComparing ? 2 : 1,
          },
        ]}
      >
        {/* Top badges row — category tag + bank code (website parity) */}
        <View style={styles.cardTopRow}>
          <View style={styles.cardTopLeft}>
            <View style={[styles.categoryTag, { backgroundColor: colors.primary + '14' }]}>
              <Text style={[styles.categoryTagText, { color: colors.primary }]}>
                {group === 'all' ? 'Finance' : categoryLabel(group).toUpperCase()}
              </Text>
            </View>
            {badges.map((b) => (
              <View key={b} style={[styles.miniBadge, { backgroundColor: colors.bgTertiary || colors.bg }]}>
                <Text style={[styles.miniBadgeText, { color: colors.textMid }]}>{b}</Text>
              </View>
            ))}
            {isComparing && (
              <View style={[styles.miniBadge, { backgroundColor: '#059669' }]}>
                <Text style={[styles.miniBadgeText, { color: '#FFFFFF' }]}>✓ Compare</Text>
              </View>
            )}
          </View>
          <View style={[styles.bankCodeBadge, { backgroundColor: colors.bgTertiary || colors.bg, borderColor: colors.border }]}>
            <Text style={[styles.bankCodeText, { color: colors.textMid }]}>{bankCode}</Text>
          </View>
        </View>

        {/* Logo + name */}
        <View style={styles.cardHeader}>
          <View style={[styles.logoBox, { backgroundColor: colors.bgTertiary || colors.bg, borderColor: colors.border }]}>
            {imgUri ? (
              <Image source={{ uri: imgUri }} style={styles.logoImg} resizeMode="contain" />
            ) : (
              <Icon name={getCategoryIcon(group) as any} size={22} color={colors.primary} />
            )}
          </View>
          <Text style={[styles.productTitle, { color: colors.text }]} numberOfLines={2}>
            {name}
          </Text>
        </View>

        {/* Key features */}
        {features.length > 0 && (
          <View style={styles.featuresWrap}>
            {features.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <Icon name="check-circle" size={13} color="#059669" />
                <Text style={[styles.featureText, { color: colors.textMid }]} numberOfLines={1}>
                  {f}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer — payout + actions (website parity) */}
        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <View style={styles.payoutRow}>
            <Text style={[styles.payoutLabel, { color: colors.textLight }]}>
              {isEmployee ? 'INCENTIVES' : 'PARTNER PAYOUT'}
            </Text>
            <Text style={[styles.payoutValue, { color: '#059669' }]}>
              ₹{payout.toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnOutline, { borderColor: colors.border }]}
              onPress={() => handleShareProduct(item)}
              activeOpacity={0.8}
            >
              <Icon name="share-2" size={13} color={colors.text} />
              <Text style={[styles.actionBtnText, { color: colors.text }]}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.actionBtnOutline,
                { borderColor: isComparing ? colors.primary : colors.border },
                isComparing && { backgroundColor: colors.primary },
              ]}
              onPress={() => toggleCompare(item)}
              activeOpacity={0.8}
            >
              <Icon name="swap-vertical" size={13} color={isComparing ? '#FFFFFF' : colors.primary} />
              <Text style={[styles.actionBtnText, { color: isComparing ? '#FFFFFF' : colors.primary }]}>
                Compare
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnOutline, { borderColor: colors.border }]}
              onPress={() => setBenefitsProduct(item)}
              activeOpacity={0.8}
            >
              <Icon name="gift" size={13} color={colors.textMid || colors.textLight} />
              <Text style={[styles.actionBtnText, { color: colors.textMid || colors.textLight }]}>Benefits</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPrimary, { backgroundColor: colors.primary }]}
              onPress={() => handleApply(item)}
              activeOpacity={0.85}
            >
              <Text style={styles.actionBtnPrimaryText}>Apply</Text>
              <Icon name="chevron-right" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const compareProducts = products.filter((p) =>
    compareIds.includes(String(p.id || p.product_id))
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: isDark ? colors.card : '#FFFFFF' }]}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={[styles.title, { color: colors.text }]}>
            {activeCategory !== 'all' ? `${categoryLabel(activeCategory)} Products` : 'Products Catalog'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textLight }]}>
            {filteredProducts.length} products • Share links & punch leads
          </Text>
        </View>
        <ThemeToggle size="sm" />
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={[styles.searchBar, { backgroundColor: isDark ? colors.card : '#F3F4F6', borderColor: colors.border }]}>
          <Icon name="search" size={17} color={colors.textLight} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search products or banks..."
            placeholderTextColor={colors.textLight}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Icon name="x" size={15} color={colors.textLight} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category chips */}
      <View style={styles.chipsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          {categoryChips.map((g) => {
            const active = activeCategory === g;
            return (
              <TouchableOpacity
                key={g}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.primary : isDark ? colors.card : '#FFFFFF',
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setActiveCategory(g)}
              >
                <Text style={[styles.chipText, { color: active ? '#FFFFFF' : colors.text }]}>
                  {categoryLabel(g)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Bank chips */}
      {bankChips.length > 2 && (
        <View style={styles.chipsWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
            {bankChips.slice(0, 15).map((b) => {
              const active = activeBank === b;
              return (
                <TouchableOpacity
                  key={b}
                  style={[
                    styles.chipSmall,
                    {
                      backgroundColor: active ? colors.primary : isDark ? colors.card : '#FFFFFF',
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setActiveBank(b)}
                >
                  <Text style={[styles.chipText, { color: active ? '#FFFFFF' : colors.text, fontSize: 11 }]} numberOfLines={1}>
                    {b}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Sort row */}
      <View style={styles.sortRow}>
        {([
          ['featured', 'Featured'],
          ['payout', 'Payout: High → Low'],
          ['name', 'Name A–Z'],
        ] as const).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.sortChip,
              {
                backgroundColor: sortBy === key ? colors.primary + '14' : 'transparent',
                borderColor: sortBy === key ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setSortBy(key)}
          >
            <Text style={[styles.sortChipText, { color: sortBy === key ? colors.primary : colors.textLight }]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textLight }]}>Loading products...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Icon name="alert-circle" size={40} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          <TouchableOpacity onPress={() => loadProducts()} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item, index) => String(item.id || item.product_id || index)}
          renderItem={renderProductCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadProducts(true)} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Icon name="search" size={30} color={colors.textLight} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No products found</Text>
              <Text style={[styles.emptyText, { color: colors.textLight }]}>
                Try adjusting your filters or search terms.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setActiveCategory('all');
                  setActiveBank('All Banks');
                  setSearch('');
                }}
              >
                <Text style={[styles.clearFiltersText, { color: colors.primary }]}>Clear all filters</Text>
              </TouchableOpacity>
            </View>
          }
          ListFooterComponent={compareIds.length === 2 ? (
            <TouchableOpacity
              style={[styles.compareBar, { backgroundColor: colors.primary }]}
              onPress={() => setCompareOpen(true)}
              activeOpacity={0.9}
            >
              <Icon name="swap-vertical" size={16} color="#FFFFFF" />
              <Text style={styles.compareBarText}>Compare 2 Products</Text>
            </TouchableOpacity>
          ) : undefined}
        />
      )}

      {/* Compare modal */}
      <Modal visible={compareOpen} transparent animationType="slide" onRequestClose={() => setCompareOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? colors.card : '#FFFFFF' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Compare Products</Text>
              <TouchableOpacity onPress={() => setCompareOpen(false)}>
                <Icon name="x" size={20} color={colors.textLight} />
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <View style={styles.compareRow}>
                  <Text style={[styles.compareCellLabel, { color: colors.textLight }]}>Product</Text>
                  {compareProducts.map((p) => (
                    <Text key={String(p.id)} style={[styles.compareCell, styles.compareCellValue, { color: colors.text }]} numberOfLines={2}>
                      {getName(p)}
                    </Text>
                  ))}
                </View>
                <View style={styles.compareRow}>
                  <Text style={[styles.compareCellLabel, { color: colors.textLight }]}>Bank</Text>
                  {compareProducts.map((p) => (
                    <Text key={String(p.id)} style={[styles.compareCell, styles.compareCellValue, { color: colors.text }]}>
                      {getBank(p)}
                    </Text>
                  ))}
                </View>
                <View style={styles.compareRow}>
                  <Text style={[styles.compareCellLabel, { color: colors.textLight }]}>Category</Text>
                  {compareProducts.map((p) => (
                    <Text key={String(p.id)} style={[styles.compareCell, styles.compareCellValue, { color: colors.text }]}>
                      {categoryLabel(categoryGroupOf(p.category || p.product_category))}
                    </Text>
                  ))}
                </View>
                <View style={styles.compareRow}>
                  <Text style={[styles.compareCellLabel, { color: colors.textLight }]}>Payout</Text>
                  {compareProducts.map((p) => (
                    <Text key={String(p.id)} style={[styles.compareCell, styles.compareCellValue, { color: '#059669' }]}>
                      ₹{getPayout(p).toLocaleString('en-IN')}
                    </Text>
                  ))}
                </View>
                <View style={styles.compareRow}>
                  <Text style={[styles.compareCellLabel, { color: colors.textLight }]}>Top Feature</Text>
                  {compareProducts.map((p) => (
                    <Text key={String(p.id)} style={[styles.compareCell, styles.compareCellValue, { color: colors.text }]} numberOfLines={2}>
                      {getFeatures(p)[0] || '—'}
                    </Text>
                  ))}
                </View>
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              {compareProducts.map((p) => (
                <TouchableOpacity
                  key={String(p.id)}
                  style={[styles.modalApplyBtn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    setCompareOpen(false);
                    handleApply(p);
                  }}
                >
                  <Text style={styles.modalApplyText}>Apply: {getName(p).slice(0, 18)}{getName(p).length > 18 ? '…' : ''}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Benefits modal */}
      <Modal visible={!!benefitsProduct} transparent animationType="slide" onRequestClose={() => setBenefitsProduct(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? colors.card : '#FFFFFF' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
                {benefitsProduct ? getName(benefitsProduct) : ''}
              </Text>
              <TouchableOpacity onPress={() => setBenefitsProduct(null)}>
                <Icon name="x" size={20} color={colors.textLight} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: Dimensions.get('window').height * 0.55 }}>
              {(benefitsProduct?.benefits_list || benefitsProduct?.benefits || getFeatures(benefitsProduct || {}) || []).length > 0 ? (
                (benefitsProduct?.benefits_list || benefitsProduct?.benefits || getFeatures(benefitsProduct || {})).map((b: any, i: number) => {
                  const text = typeof b === 'string' ? b : b?.title || b?.description || b?.label || '';
                  return text ? (
                    <View key={i} style={styles.benefitRow}>
                      <Icon name="check-circle" size={15} color="#059669" />
                      <Text style={[styles.benefitText, { color: colors.text }]}>{text}</Text>
                    </View>
                  ) : null;
                })
              ) : (
                <Text style={[styles.benefitText, { color: colors.textLight }]}>
                  {benefitsProduct?.description || 'No benefit details available for this product.'}
                </Text>
              )}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalApplyBtn, { backgroundColor: colors.primary, marginTop: 12 }]}
              onPress={() => {
                const p = benefitsProduct;
                setBenefitsProduct(null);
                if (p) handleApply(p);
              }}
            >
              <Text style={styles.modalApplyText}>Apply Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  title: { fontSize: typography.sizes.lg, fontWeight: '800', color: '#1E293B' },
  subtitle: { fontSize: typography.sizes.xs, color: '#64748B', marginTop: 2 },
  searchWrap: { paddingHorizontal: spacing.md, paddingTop: 12, paddingBottom: 8 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#F3F4F6',
  },
  searchInput: { flex: 1, fontSize: 13, marginLeft: 8, color: '#0F172A' },
  chipsWrap: { marginBottom: 6 },
  chipsScroll: { paddingHorizontal: spacing.md, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipSmall: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: 140,
  },
  chipText: { fontSize: 12, fontWeight: '700' },
  sortRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sortChipText: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.md },
  loadingText: { marginTop: 10, fontSize: typography.sizes.sm },
  errorText: { marginTop: 10, fontSize: typography.sizes.sm, textAlign: 'center' },
  retryBtn: { marginTop: 14, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 8 },
  retryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  listContent: { padding: spacing.md, paddingBottom: 40 },
  card: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 6,
  },
  cardTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap', flex: 1 },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#0D6EFD14',
  },
  categoryTagText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, color: '#0D6EFD' },
  miniBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  miniBadgeText: { fontSize: 10, fontWeight: '700', color: '#475569' },
  bankCodeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  bankCodeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', color: '#64748B' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  logoBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImg: { width: '100%', height: '100%', padding: 3 },
  productTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: '#0F172A', lineHeight: 20 },
  featuresWrap: { gap: 4, marginTop: 4, marginBottom: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  featureText: { flex: 1, fontSize: 11.5, fontWeight: '600', color: '#475569' },
  cardFooter: { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12, gap: 10 },
  payoutRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  payoutLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  payoutValue: { fontSize: 24, fontWeight: '800', color: '#059669' },
  actionRow: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionBtnOutline: { borderColor: '#E2E8F0', backgroundColor: 'transparent' },
  actionBtnPrimary: { flex: 1.5, borderWidth: 0 },
  actionBtnText: { fontSize: 12, fontWeight: '700' },
  actionBtnPrimaryText: { fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' },
  emptyBox: { alignItems: 'center', paddingVertical: 50, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginTop: 12, marginBottom: 4 },
  emptyText: { fontSize: 12.5, color: '#64748B', textAlign: 'center' },
  clearFiltersText: { fontSize: 13, fontWeight: '700', marginTop: 14 },
  compareBar: {
    margin: spacing.md,
    marginTop: 4,
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  compareBarText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', flex: 1, marginRight: 10 },
  compareRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, minWidth: 260 },
  compareCellLabel: {
    width: 90,
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    paddingTop: 2,
  },
  compareCell: { width: 150, fontSize: 12, fontWeight: '600', color: '#1E293B', paddingHorizontal: 6 },
  compareCellValue: { fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  modalApplyBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: '#2563EB',
  },
  modalApplyText: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' },
  benefitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  benefitText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#1E293B', lineHeight: 19 },
});
