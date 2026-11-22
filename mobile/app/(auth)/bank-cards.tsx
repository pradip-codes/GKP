import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { Icon } from '../../components/Icon';
import apiClient from '../../services/api';

interface CardItem {
  id: string;
  name: string;
  bank_name: string;
  category: string;
  description: string;
  annual_fee?: string;
  interest_rate?: string;
  image_url?: string;
  benefits?: string[];
  eligibility?: string[];
}

type RawCardItem = Omit<CardItem, 'benefits'> & {
  benefits?: unknown;
  benefits_list?: unknown;
};

const BANK_COLORS: Record<string, string> = {
  HDFC: '#003478',
  SBI: '#1C4E80',
  ICICI: '#F4661A',
  Axis: '#97144D',
  Kotak: '#ED1B24',
  IDFC: '#9B1B1E',
  'Yes Bank': '#003366',
  BOB: '#F26522',
  AU: '#6C2D82',
  Federal: '#002E6D',
  RBL: '#003F7A',
};

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

export default function BankCardsScreen() {
  const { colors, isDark } = useTheme();
  const { bank } = useLocalSearchParams<{ bank?: string }>();
  const [cards, setCards] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bankName = bank || 'ALL';
  const isAllBanks = bankName === 'ALL';
  const bankColor = isAllBanks ? colors.primary : (BANK_COLORS[bankName] || colors.primary);
  const bankLogoSource = bankLogos[bankName];

  const allBanks = [
    { id: 'HDFC', label: 'HDFC Bank', logo: bankLogos.HDFC },
    { id: 'SBI', label: 'SBI Card', logo: bankLogos.SBI },
    { id: 'ICICI', label: 'ICICI Bank', logo: bankLogos.ICICI },
    { id: 'Axis', label: 'Axis Bank', logo: bankLogos.Axis },
    { id: 'Kotak', label: 'Kotak Bank', logo: bankLogos.Kotak },
    { id: 'IDFC', label: 'IDFC First', logo: bankLogos.IDFC },
    { id: 'Yes Bank', label: 'Yes Bank', logo: bankLogos['Yes Bank'] },
    { id: 'BOB', label: 'Bank of Baroda', logo: bankLogos.BOB },
    { id: 'AU', label: 'AU Small Finance', logo: bankLogos.AU },
    { id: 'Federal', label: 'Federal Bank', logo: bankLogos.Federal },
    { id: 'RBL', label: 'RBL Bank', logo: bankLogos.RBL },
  ];

  const loadBankCards = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = { category: 'credit_card' };
      if (bank && bank !== 'ALL') {
        params.bank_name = bank;
      }
      const res = await apiClient.get('/products', { params });
      if (res.data?.success && Array.isArray(res.data?.data)) {
        const cardData = (res.data.data as RawCardItem[]).map((card) => {
          const benefits = Array.isArray(card.benefits)
            ? card.benefits
            : Array.isArray(card.benefits_list)
              ? card.benefits_list
              : typeof card.benefits === 'string'
                ? [card.benefits]
                : [];

          const normalizedBenefits = benefits
            .map((benefit: unknown) => {
              if (typeof benefit === 'string') return benefit;
              if (benefit && typeof benefit === 'object') {
                const item = benefit as { description?: unknown; title?: unknown };
                if (typeof item.description === 'string') return item.description;
                if (typeof item.title === 'string') return item.title;
              }
              return '';
            })
            .filter((benefit): benefit is string => Boolean(benefit));

          return {
            ...card,
            benefits: normalizedBenefits,
          };
        });
        setCards(cardData);
      } else {
        setError('Failed to load bank credit cards.');
      }
    } catch (err) {
      console.error('Failed to load bank cards:', err);
      setError('Network error loading cards. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBankCards();
  }, [bank]);

  const handleCardPress = (cardId: string) => {
    router.push({
      pathname: '/(auth)/product-detail',
      params: { id: cardId },
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bankColor }]}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.bg }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={[styles.header, { backgroundColor: bankColor }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>{isAllBanks ? 'All Credit Card Banks' : `${bankName} Credit Cards`}</Text>
            <Text style={styles.headerSubtitle}>
              {isAllBanks ? 'Select a bank to view cards' : 'Official Bank Partner • GharKaPaisa'}
            </Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        {isAllBanks ? (
          /* All Banks Grid View */
          <View style={styles.allBanksContainer}>
            <Text style={[styles.allBanksTitle, { color: colors.text }]}>Choose Your Bank</Text>
            <Text style={[styles.allBanksSubtitle, { color: colors.textMid }]}>
              {allBanks.length} Partner Banks Available
            </Text>
            <View style={styles.allBanksGrid}>
              {allBanks.map((b) => (
                <TouchableOpacity
                  key={b.id}
                  style={[styles.allBankCard, { backgroundColor: isDark ? colors.card : '#FFFFFF', borderColor: colors.border }]}
                  onPress={() => router.push({ pathname: '/(auth)/bank-cards', params: { bank: b.id } })}
                  activeOpacity={0.7}
                >
                  <View style={styles.allBankLogoWrap}>
                    <Image source={b.logo} style={styles.allBankLogo} resizeMode="contain" />
                  </View>
                  <Text style={[styles.allBankLabel, { color: colors.text }]} numberOfLines={1}>
                    {b.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <>
        {/* Bank Showcase Card */}
        <View style={styles.heroCardContainer}>
          <View style={[styles.heroCard, { backgroundColor: isDark ? colors.card : '#FFFFFF', borderColor: colors.border }]}>
            <View style={styles.heroRow}>
              {bankLogoSource ? (
                <View style={styles.logoWrap}>
                  <Image source={bankLogoSource} style={styles.logoImage} resizeMode="contain" />
                </View>
              ) : (
                <View style={[styles.logoFallback, { backgroundColor: bankColor }]}>
                  <Text style={styles.logoFallbackText}>{bankName.slice(0, 3).toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.heroTextCol}>
                <Text style={[styles.heroBankName, { color: colors.text }]}>{bankName} Bank</Text>
                <Text style={[styles.heroCardCount, { color: colors.textMid }]}>
                  {cards.length} Exclusive Credit Cards Available
                </Text>
                <View style={styles.heroBadgeRow}>
                  <View style={styles.trustBadge}>
                    <Icon name="check-circle" size={12} color="#10B981" />
                    <Text style={styles.trustBadgeText}>Instant Approval</Text>
                  </View>
                  <View style={[styles.trustBadge, { backgroundColor: '#EFF6FF' }]}>
                    <Icon name="shield" size={12} color="#2563EB" />
                    <Text style={[styles.trustBadgeText, { color: '#2563EB' }]}>Zero Paperwork</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Card Content State */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={bankColor} />
            <Text style={[styles.loadingText, { color: colors.textMid }]}>Loading {bankName} cards...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Icon name="alert-circle" size={48} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            <TouchableOpacity onPress={loadBankCards} style={[styles.retryBtn, { backgroundColor: bankColor }]}>
              <Text style={styles.retryBtnText}>Retry Loading</Text>
            </TouchableOpacity>
          </View>
        ) : cards.length === 0 ? (
          <View style={styles.centerContainer}>
            <Icon name="credit-card" size={48} color={colors.textLight} />
            <Text style={[styles.emptyText, { color: colors.textMid }]}>No cards available for {bankName} at this time.</Text>
          </View>
        ) : (
          <View style={styles.cardsList}>
            {cards.map((card) => {
              const isLTF =
                card.annual_fee?.toLowerCase().includes('nil') ||
                card.annual_fee === '0' ||
                card.annual_fee?.toLowerCase().includes('free');

              return (
                <TouchableOpacity
                  key={card.id}
                  onPress={() => handleCardPress(card.id)}
                  activeOpacity={0.85}
                  style={[
                    styles.cardContainer,
                    {
                      backgroundColor: isDark ? colors.card : '#FFFFFF',
                      borderColor: colors.border,
                    },
                  ]}
                >
                  {/* Card Header */}
                  <View style={styles.cardHeaderRow}>
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: isLTF ? '#DCFCE7' : '#EFF6FF',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          { color: isLTF ? '#166534' : '#1E40AF' },
                        ]}
                      >
                        {isLTF ? '⚡ LIFETIME FREE' : '★ PREMIUM CARD'}
                      </Text>
                    </View>
                    <Text style={[styles.bankTag, { color: bankColor }]}>{bankName}</Text>
                  </View>

                  {/* Card Title & Desc */}
                  <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
                    {card.name}
                  </Text>
                  <Text style={[styles.cardDescription, { color: colors.textMid }]} numberOfLines={2}>
                    {card.description || 'Enjoy pre-approved credit limits, instant reward points, and airport lounge access.'}
                  </Text>

                  {/* Pricing / Fee Pills */}
                  <View style={styles.specsRow}>
                    <View style={[styles.specPill, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}>
                      <Text style={[styles.specLabel, { color: colors.textLight }]}>1st Year Fee</Text>
                      <Text style={[styles.specValue, { color: colors.text }]}>{card.annual_fee || '₹499 + GST'}</Text>
                    </View>
                    <View style={[styles.specPill, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}>
                      <Text style={[styles.specLabel, { color: colors.textLight }]}>Reward Value</Text>
                      <Text style={[styles.specValue, { color: '#059669' }]}>Up to 5% Cashback</Text>
                    </View>
                  </View>

                  {/* Benefits checklist */}
                  {card.benefits && card.benefits.length > 0 && (
                    <View style={styles.benefitsWrap}>
                      {card.benefits.slice(0, 2).map((b, idx) => (
                        <View key={idx} style={styles.benefitRow}>
                          <Icon name="check" size={13} color="#10B981" />
                          <Text style={[styles.benefitText, { color: colors.textMid }]} numberOfLines={1}>
                            {b}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Footer CTAs */}
                  <View style={styles.cardFooter}>
                    <TouchableOpacity
                      style={styles.detailsBtn}
                      onPress={() => handleCardPress(card.id)}
                    >
                      <Text style={[styles.detailsBtnText, { color: colors.textMid }]}>Card Details</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.applyBtn, { backgroundColor: bankColor }]}
                      onPress={() => handleCardPress(card.id)}
                    >
                      <Text style={styles.applyBtnText}>Apply Now</Text>
                      <Icon name="arrow-right" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
          </>
        )}
      </ScrollView>
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
    paddingTop: 12,
    paddingBottom: 24,
  },
  backButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  heroCardContainer: {
    paddingHorizontal: 16,
    marginTop: -12,
    marginBottom: 16,
  },
  heroCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoWrap: {
    width: 68,
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logoFallback: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoFallbackText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  heroTextCol: {
    flex: 1,
    marginLeft: 14,
  },
  heroBankName: {
    fontSize: 16,
    fontWeight: '800',
  },
  heroCardCount: {
    fontSize: 12,
    marginTop: 2,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  trustBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  cardsList: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 14,
  },
  cardContainer: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  bankTag: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  specsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  specPill: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  specLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  specValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  benefitsWrap: {
    gap: 4,
    marginBottom: 14,
    paddingTop: 4,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  benefitText: {
    fontSize: 12,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  detailsBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  detailsBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  centerContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
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
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
  allBanksContainer: {
    padding: 16,
  },
  allBanksTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  allBanksSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  allBanksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  allBankCard: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  allBankLogoWrap: {
    width: 48,
    height: 36,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  allBankLogo: {
    width: '100%',
    height: '100%',
  },
  allBankLabel: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
});
