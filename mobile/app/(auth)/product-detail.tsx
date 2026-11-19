import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Share,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Icon } from '../../components/Icon';
import apiClient from '../../services/api';

interface ProductDetail {
  id: string;
  name: string;
  bank_name: string;
  category: string;
  description: string;
  features?: string[];
  benefits?: string[];
  eligibility?: string[];
  documents_required?: string[];
  image_url?: string;
  interest_rate?: string;
  annual_fee?: string;
  joining_fee?: string;
  processing_fee?: string;
  max_amount?: string;
  tenure?: string;
  faqs?: Array<{ question: string; answer: string }>;
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

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const { isAuthenticated } = useAuth();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'features' | 'benefits' | 'fees' | 'eligibility' | 'faqs'>('features');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  useEffect(() => {
    if (id) {
      loadProductDetail(id);
    }
  }, [id]);

  const loadProductDetail = async (productId: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get(`/products/${productId}`);
      if (res.data?.success && res.data?.data) {
        const raw = res.data.data;
        setProduct({
          ...raw,
          features: Array.isArray(raw.features) ? raw.features : raw.features_list || [
            'Instant digital approval with zero paperwork',
            'Complimentary domestic airport lounge access every quarter',
            'Accelerated reward points on dining and shopping',
            '1% fuel surcharge waiver across all fuel stations in India',
          ],
          benefits: Array.isArray(raw.benefits) ? raw.benefits : raw.benefits_list || [
            '₹1,500 welcome gift voucher on card activation',
            'Up to 5% cashback on leading e-commerce platforms',
            'Dining discounts up to 20% at partner restaurants',
          ],
          eligibility: Array.isArray(raw.eligibility) ? raw.eligibility : raw.eligibility_criteria || [
            'Age between 21 and 65 years',
            'Minimum monthly income of ₹25,000 for salaried employees',
            'CIBIL credit score of 700 or above recommended',
          ],
          documents_required: Array.isArray(raw.documents_required) ? raw.documents_required : raw.required_documents || [
            'PAN Card (mandatory)',
            'Aadhaar Card or Passport for identity & address proof',
            'Last 3 months salary slips or latest ITR acknowledgement',
          ],
          faqs: Array.isArray(raw.faqs) ? raw.faqs : [
            {
              question: 'How long does the approval process take?',
              answer: 'Online approval takes only 2 to 5 minutes with digital Aadhaar verification. The physical card is delivered within 3-5 business days.',
            },
            {
              question: 'Is there any joining or annual fee waiver?',
              answer: 'Yes, annual fees are completely waived off if you spend the minimum threshold amount in the preceding calendar year.',
            },
            {
              question: 'Can I track my application status online?',
              answer: 'Yes, you can track real-time application updates anytime using our Track Application portal.',
            },
          ],
        });
      } else {
        setError('Failed to load product details');
      }
    } catch (err) {
      console.error('Failed to load product:', err);
      setError('Network error loading product details');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!product) return;
    try {
      await Share.share({
        message: `Check out ${product.name} from ${product.bank_name || 'GharKaPaisa'}! Apply online with instant approval: https://gharkapaisa.in/products/${product.id}`,
      });
    } catch (err) {
      console.log('Share error:', err);
    }
  };

  const handleApply = () => {
    if (!product) return;
    if (!isAuthenticated) {
      Alert.alert(
        'Sign In Required',
        'Please sign in or create an account to start your direct card application.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/(auth)/login') },
        ]
      );
      return;
    }

    router.push({
      pathname: '/(public)/apply',
      params: {
        product_id: product.id,
        product_name: product.name,
        bank_name: product.bank_name,
        category: product.category,
      },
    });
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={[styles.loadingText, { color: colors.textMid }]}>Loading card specifications...</Text>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.bg }]}>
        <Icon name="alert-circle" size={48} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.error }]}>{error || 'Product not found'}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.goBackBtn}>
          <Text style={styles.goBackBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const bankLogo = bankLogos[product.bank_name];
  const isLTF =
    product.annual_fee?.toLowerCase().includes('nil') ||
    product.annual_fee === '0' ||
    product.annual_fee?.toLowerCase().includes('free');

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        {/* Navigation Bar */}
        <View
          style={[
            styles.navbar,
            { backgroundColor: isDark ? colors.card : '#FFFFFF', borderBottomColor: colors.border },
          ]}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.navAction}>
            <Icon name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.text }]} numberOfLines={1}>
            {product.name}
          </Text>
          <View style={styles.navRight}>
            <TouchableOpacity onPress={() => setIsBookmarked(!isBookmarked)} style={styles.navAction}>
              <Icon
                name="star"
                size={20}
                color={isBookmarked ? '#F59E0B' : colors.textMid}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare} style={styles.navAction}>
              <Icon name="share-2" size={19} color={colors.textMid} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Card Presentation Box */}
          <View
            style={[
              styles.productHeroCard,
              { backgroundColor: isDark ? colors.card : '#FFFFFF', borderColor: colors.border },
            ]}
          >
            <View style={styles.heroTop}>
              <View style={styles.bankPill}>
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

              <View style={[styles.typePill, { backgroundColor: isLTF ? '#DCFCE7' : '#EFF6FF' }]}>
                <Text style={[styles.typePillText, { color: isLTF ? '#166534' : '#1E40AF' }]}>
                  {isLTF ? '⚡ LIFETIME FREE' : '★ VERIFIED'}
                </Text>
              </View>
            </View>

            <Text style={[styles.heroTitle, { color: colors.text }]}>{product.name}</Text>
            <Text style={[styles.heroDesc, { color: colors.textMid }]}>
              {product.description || 'Pre-approved digital application with high rewards, low interest rates and instant processing.'}
            </Text>

            {/* Quick Metrics */}
            <View style={styles.kpiRow}>
              <View style={[styles.kpiBox, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}>
                <Text style={[styles.kpiLabel, { color: colors.textLight }]}>Annual Fee</Text>
                <Text style={[styles.kpiVal, { color: isLTF ? '#059669' : colors.text }]}>
                  {product.annual_fee || (isLTF ? '₹0 Forever' : '₹499 + GST')}
                </Text>
              </View>
              <View style={[styles.kpiBox, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}>
                <Text style={[styles.kpiLabel, { color: colors.textLight }]}>Joining Fee</Text>
                <Text style={[styles.kpiVal, { color: '#059669' }]}>
                  {product.joining_fee || '₹0 Free'}
                </Text>
              </View>
              <View style={[styles.kpiBox, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}>
                <Text style={[styles.kpiLabel, { color: colors.textLight }]}>Credit Limit</Text>
                <Text style={[styles.kpiVal, { color: '#2563EB' }]}>Up to ₹5 Lakh</Text>
              </View>
            </View>
          </View>

          {/* Tab Navigation */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabScroll}
          >
            {[
              { id: 'features', label: 'Key Features' },
              { id: 'benefits', label: 'Benefits' },
              { id: 'fees', label: 'Fees & Charges' },
              { id: 'eligibility', label: 'Eligibility' },
              { id: 'faqs', label: 'FAQs' },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id as any)}
                  style={[
                    styles.tabItem,
                    active && { borderBottomColor: '#2563EB', borderBottomWidth: 2 },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabItemText,
                      { color: active ? '#2563EB' : colors.textMid, fontWeight: active ? '800' : '600' },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Tab Contents */}
          <View
            style={[
              styles.tabContentCard,
              { backgroundColor: isDark ? colors.card : '#FFFFFF', borderColor: colors.border },
            ]}
          >
            {activeTab === 'features' && (
              <View style={styles.tabInner}>
                <Text style={[styles.tabContentHeading, { color: colors.text }]}>
                  Card Highlights & Perks
                </Text>
                {product.features?.map((f, i) => (
                  <View key={i} style={styles.checkRow}>
                    <Icon name="check-circle" size={16} color="#10B981" />
                    <Text style={[styles.checkText, { color: colors.text }]}>{f}</Text>
                  </View>
                ))}
              </View>
            )}

            {activeTab === 'benefits' && (
              <View style={styles.tabInner}>
                <Text style={[styles.tabContentHeading, { color: colors.text }]}>
                  Exclusive Rewards & Welcome Offers
                </Text>
                {product.benefits?.map((b, i) => (
                  <View key={i} style={styles.checkRow}>
                    <Icon name="gift" size={16} color="#F59E0B" />
                    <Text style={[styles.checkText, { color: colors.text }]}>{b}</Text>
                  </View>
                ))}
              </View>
            )}

            {activeTab === 'fees' && (
              <View style={styles.tabInner}>
                <Text style={[styles.tabContentHeading, { color: colors.text }]}>
                  Detailed Schedule of Charges
                </Text>
                <View style={styles.feeGrid}>
                  <View style={styles.feeRow}>
                    <Text style={[styles.feeLabel, { color: colors.textMid }]}>1st Year Joining Fee</Text>
                    <Text style={[styles.feeVal, { color: '#059669' }]}>{product.joining_fee || '₹0 (Free)'}</Text>
                  </View>
                  <View style={styles.feeRow}>
                    <Text style={[styles.feeLabel, { color: colors.textMid }]}>Annual Renewal Fee</Text>
                    <Text style={[styles.feeVal, { color: colors.text }]}>{product.annual_fee || (isLTF ? '₹0 Nil' : '₹499 + GST')}</Text>
                  </View>
                  <View style={styles.feeRow}>
                    <Text style={[styles.feeLabel, { color: colors.textMid }]}>Interest Rate (APR)</Text>
                    <Text style={[styles.feeVal, { color: colors.text }]}>{product.interest_rate || '3.49% per month (41.88% p.a.)'}</Text>
                  </View>
                  <View style={styles.feeRow}>
                    <Text style={[styles.feeLabel, { color: colors.textMid }]}>ATM Cash Advance Fee</Text>
                    <Text style={[styles.feeVal, { color: colors.text }]}>2.5% or ₹500 whichever is higher</Text>
                  </View>
                </View>
              </View>
            )}

            {activeTab === 'eligibility' && (
              <View style={styles.tabInner}>
                <Text style={[styles.tabContentHeading, { color: colors.text }]}>
                  Eligibility & Required Documents
                </Text>
                {product.eligibility?.map((e, i) => (
                  <View key={i} style={styles.checkRow}>
                    <Icon name="user-check" size={16} color="#2563EB" />
                    <Text style={[styles.checkText, { color: colors.text }]}>{e}</Text>
                  </View>
                ))}
                <Text style={[styles.tabSubHeading, { color: colors.text, marginTop: 14 }]}>
                  Mandatory Documents
                </Text>
                {product.documents_required?.map((d, i) => (
                  <View key={i} style={styles.checkRow}>
                    <Icon name="file-text" size={16} color="#6B7280" />
                    <Text style={[styles.checkText, { color: colors.text }]}>{d}</Text>
                  </View>
                ))}
              </View>
            )}

            {activeTab === 'faqs' && (
              <View style={styles.tabInner}>
                <Text style={[styles.tabContentHeading, { color: colors.text }]}>
                  Frequently Asked Questions
                </Text>
                {product.faqs?.map((faq, i) => {
                  const open = expandedFaq === i;
                  return (
                    <TouchableOpacity
                      key={i}
                      onPress={() => setExpandedFaq(open ? null : i)}
                      style={[styles.faqItem, { borderColor: colors.border }]}
                    >
                      <View style={styles.faqHeader}>
                        <Text style={[styles.faqQuestion, { color: colors.text }]}>{faq.question}</Text>
                        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMid} />
                      </View>
                      {open && (
                        <Text style={[styles.faqAnswer, { color: colors.textMid }]}>{faq.answer}</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Floating Bottom Apply CTA */}
        <View
          style={[
            styles.bottomBar,
            { backgroundColor: isDark ? colors.card : '#FFFFFF', borderTopColor: colors.border },
          ]}
        >
          <View style={styles.bottomPriceCol}>
            <Text style={[styles.bottomFeeLabel, { color: colors.textLight }]}>Annual Maintenance</Text>
            <Text style={[styles.bottomFeeValue, { color: isLTF ? '#059669' : colors.text }]}>
              {isLTF ? '₹0 FREE FOREVER' : product.annual_fee || '₹499/yr'}
            </Text>
          </View>

          <TouchableOpacity onPress={handleApply} style={styles.mainApplyBtn}>
            <Text style={styles.mainApplyBtnText}>Apply Now</Text>
            <Icon name="arrow-right" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
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
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  navAction: {
    padding: 6,
  },
  navTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    marginHorizontal: 8,
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
  },
  productHeroCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bankPill: {
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
    fontSize: 13,
    fontWeight: '700',
  },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typePillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
    marginBottom: 6,
  },
  heroDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
  },
  kpiBox: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  kpiVal: {
    fontSize: 12,
    fontWeight: '800',
  },
  tabScroll: {
    gap: 20,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  tabItem: {
    paddingVertical: 8,
  },
  tabItemText: {
    fontSize: 14,
  },
  tabContentCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  tabInner: {
    gap: 10,
  },
  tabContentHeading: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  tabSubHeading: {
    fontSize: 14,
    fontWeight: '800',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  checkText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  feeGrid: {
    gap: 8,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  feeLabel: {
    fontSize: 13,
  },
  feeVal: {
    fontSize: 13,
    fontWeight: '700',
  },
  faqItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  faqAnswer: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  bottomPriceCol: {
    flex: 1,
  },
  bottomFeeLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  bottomFeeValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  mainApplyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 12,
  },
  mainApplyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
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
  goBackBtn: {
    marginTop: 16,
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  goBackBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
