import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { Icon } from '../../components/Icon';
import apiClient from '../../services/api';

interface ProductItem {
  id: string;
  name: string;
  bank_name: string;
  category: string;
  description: string;
  annual_fee?: string;
  interest_rate?: string;
  image_url?: string;
  benefits?: string[];
  features?: string[];
}

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

const BANK_FILTERS = ['ALL', 'HDFC', 'SBI', 'ICICI', 'Axis', 'Kotak', 'IDFC', 'Yes Bank', 'BOB'];

export default function ProductsScreen() {
  const { colors, isDark } = useTheme();
  const { category } = useLocalSearchParams<{ category?: string }>();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedBank, setSelectedBank] = useState<string>('ALL');

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {};
      if (category) {
        params.category = category;
      }
      const res = await apiClient.get('/products', { params });
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setProducts(res.data.data);
      } else {
        setError('Failed to load products');
      }
    } catch (err) {
      console.error('Failed to load products:', err);
      setError('Network error loading products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [category]);

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.bank_name?.toLowerCase().includes(search.toLowerCase());

    const matchesBank =
      selectedBank === 'ALL' ||
      product.bank_name?.toLowerCase().includes(selectedBank.toLowerCase());

    return matchesSearch && matchesBank;
  });

  const handleProductPress = (productId: string) => {
    router.push({
      pathname: '/(auth)/product-detail',
      params: { id: productId },
    });
  };

  const getCategoryTitle = () => {
    if (!category) return 'All Financial Products';
    if (category === 'credit_card') return 'Credit Cards';
    if (category === 'personal_loan') return 'Personal Loans';
    if (category === 'business_loan') return 'Business Loans';
    if (category === 'home_loan') return 'Home Loans';
    return category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        {/* Top Header */}
        <View
          style={[
            styles.header,
            { backgroundColor: isDark ? colors.card : '#FFFFFF', borderBottomColor: colors.border },
          ]}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Icon name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{getCategoryTitle()}</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMid }]}>
              {filteredProducts.length} Options Available • Instant Approval
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(public)/track-application' as any)} style={styles.trackPill}>
            <Icon name="clock" size={13} color="#2563EB" />
            <Text style={styles.trackPillText}>Track</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchWrap}>
          <View
            style={[
              styles.searchBar,
              { backgroundColor: isDark ? colors.card : '#F3F4F6', borderColor: colors.border },
            ]}
          >
            <Icon name="search" size={18} color={colors.textLight} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search by card or bank name..."
              placeholderTextColor={colors.textLight}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Icon name="x" size={16} color={colors.textLight} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Bank Filter Chips */}
        <View style={styles.filterWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {BANK_FILTERS.map((bank) => {
              const active = selectedBank === bank;
              return (
                <TouchableOpacity
                  key={bank}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: active ? '#2563EB' : isDark ? colors.card : '#FFFFFF',
                      borderColor: active ? '#2563EB' : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedBank(bank)}
                >
                  <Text style={[styles.filterChipText, { color: active ? '#FFFFFF' : colors.text }]}>
                    {bank}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Products List */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={[styles.loadingText, { color: colors.textMid }]}>Fetching best verified products...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Icon name="alert-circle" size={48} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            <TouchableOpacity onPress={loadProducts} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : filteredProducts.length === 0 ? (
          <View style={styles.centerContainer}>
            <Icon name="inbox" size={48} color={colors.textLight} />
            <Text style={[styles.emptyText, { color: colors.textMid }]}>
              {search ? 'No products match your search query.' : 'No products found in this category.'}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredProducts.map((product) => {
              const bankLogo = bankLogos[product.bank_name];
              const isLTF =
                product.annual_fee?.toLowerCase().includes('nil') ||
                product.annual_fee === '0' ||
                product.annual_fee?.toLowerCase().includes('free');

              return (
                <TouchableOpacity
                  key={product.id}
                  onPress={() => handleProductPress(product.id)}
                  activeOpacity={0.88}
                  style={[
                    styles.productCard,
                    {
                      backgroundColor: isDark ? colors.card : '#FFFFFF',
                      borderColor: colors.border,
                    },
                  ]}
                >
                  {/* Top Bar inside Card */}
                  <View style={styles.cardHeader}>
                    <View style={styles.bankSection}>
                      {bankLogo ? (
                        <Image source={bankLogo} style={styles.bankLogoImage} resizeMode="contain" />
                      ) : (
                        <View style={styles.bankLogoFallback}>
                          <Text style={styles.bankLogoFallbackText}>
                            {(product.bank_name || 'GP').slice(0, 2).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <Text style={[styles.bankNameText, { color: colors.textMid }]}>
                        {product.bank_name || 'Partner Bank'}
                      </Text>
                    </View>

                    <View style={[styles.categoryBadge, { backgroundColor: isLTF ? '#DCFCE7' : '#EFF6FF' }]}>
                      <Text style={[styles.categoryBadgeText, { color: isLTF ? '#166534' : '#1E40AF' }]}>
                        {isLTF ? '⚡ ZERO ANNUAL FEE' : product.category.replace(/_/g, ' ').toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* Card Title & Desc */}
                  <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
                    {product.name}
                  </Text>
                  <Text style={[styles.productDesc, { color: colors.textMid }]} numberOfLines={2}>
                    {product.description || 'Pre-approved limits, fast digital verification and attractive cashback rewards.'}
                  </Text>

                  {/* Pricing / Feature Pills */}
                  <View style={styles.metricsRow}>
                    <View style={[styles.metricPill, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}>
                      <Text style={[styles.metricLabel, { color: colors.textLight }]}>Annual Fee</Text>
                      <Text style={[styles.metricVal, { color: isLTF ? '#059669' : colors.text }]}>
                        {product.annual_fee || '₹499'}
                      </Text>
                    </View>
                    <View style={[styles.metricPill, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}>
                      <Text style={[styles.metricLabel, { color: colors.textLight }]}>Approval Time</Text>
                      <Text style={[styles.metricVal, { color: '#059669' }]}>Instant (2 Mins)</Text>
                    </View>
                  </View>

                  {/* Footer Action Bar */}
                  <View style={styles.productFooter}>
                    <TouchableOpacity
                      onPress={() => handleProductPress(product.id)}
                      style={styles.detailsBtn}
                    >
                      <Text style={[styles.detailsBtnText, { color: colors.textMid }]}>View Benefits</Text>
                      <Icon name="chevron-right" size={14} color={colors.textMid} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleProductPress(product.id)}
                      style={styles.applyBtn}
                    >
                      <Text style={styles.applyBtnText}>Apply Now</Text>
                      <Icon name="arrow-right" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 6,
    marginRight: 6,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  trackPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  trackPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    marginLeft: 8,
  },
  filterWrap: {
    marginBottom: 8,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 14,
  },
  productCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  bankSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bankLogoImage: {
    width: 44,
    height: 24,
  },
  bankLogoFallback: {
    width: 32,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bankLogoFallbackText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  bankNameText: {
    fontSize: 12,
    fontWeight: '700',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  productName: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
    marginBottom: 4,
  },
  productDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  metricPill: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  metricVal: {
    fontSize: 12,
    fontWeight: '800',
  },
  productFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  detailsBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
  retryBtn: {
    marginTop: 14,
    backgroundColor: '#2563EB',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
});
