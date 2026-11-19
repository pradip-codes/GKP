import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
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
  benefits?: string[];
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

export default function LTFCardsScreen() {
  const { colors, isDark } = useTheme();
  const [cards, setCards] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLTFCards = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get('/products', {
        params: {
          category: 'credit_card',
          annual_fee: 'Nil',
        },
      });
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setCards(res.data.data);
      } else {
        setError('Failed to load LTF cards');
      }
    } catch (err) {
      console.error('Failed to load LTF cards:', err);
      setError('Network error loading cards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLTFCards();
  }, []);

  const handleCardPress = (cardId: string) => {
    router.push({
      pathname: '/(auth)/product-detail',
      params: { id: cardId },
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#059669' }]}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.bg }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="arrow-left" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>Lifetime Free Credit Cards</Text>
            <Text style={styles.headerSubtitle}>₹0 Joining Fee • ₹0 Annual Fee Forever</Text>
          </View>
          <View style={{ width: 22 }} />
        </View>

        {/* Feature Highlight Banner */}
        <View style={styles.bannerContainer}>
          <View style={[styles.bannerCard, { backgroundColor: isDark ? colors.card : '#FFFFFF', borderColor: colors.border }]}>
            <View style={styles.bannerRow}>
              <View style={styles.badgeCircle}>
                <Text style={styles.badgeEmoji}>⚡</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[styles.bannerHeading, { color: colors.text }]}>No Annual Fees. Forever.</Text>
                <Text style={[styles.bannerSub, { color: colors.textMid }]}>
                  Keep credit lines open and enjoy unlimited airport lounge visits, cashback, and fuel surcharge waivers without paying recurring maintenance charges.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* State rendering */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#059669" />
            <Text style={[styles.loadingText, { color: colors.textMid }]}>Loading zero-fee card options...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Icon name="alert-circle" size={48} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            <TouchableOpacity onPress={loadLTFCards} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cardsList}>
            {cards.map((card) => {
              const bankLogo = bankLogos[card.bank_name];

              return (
                <TouchableOpacity
                  key={card.id}
                  onPress={() => handleCardPress(card.id)}
                  activeOpacity={0.88}
                  style={[
                    styles.cardContainer,
                    {
                      backgroundColor: isDark ? colors.card : '#FFFFFF',
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.bankWrap}>
                      {bankLogo ? (
                        <Image source={bankLogo} style={styles.bankLogoImage} resizeMode="contain" />
                      ) : (
                        <View style={styles.bankLogoFallback}>
                          <Text style={styles.bankLogoFallbackText}>
                            {(card.bank_name || 'GP').slice(0, 2).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <Text style={[styles.bankName, { color: colors.textMid }]}>{card.bank_name}</Text>
                    </View>

                    <View style={styles.ltfPill}>
                      <Text style={styles.ltfPillText}>₹0 LIFETIME FREE</Text>
                    </View>
                  </View>

                  <Text style={[styles.cardTitle, { color: colors.text }]}>{card.name}</Text>
                  <Text style={[styles.cardDesc, { color: colors.textMid }]} numberOfLines={2}>
                    {card.description || 'Pre-approved lifetime free credit card with reward points on every transaction.'}
                  </Text>

                  <View style={styles.perksRow}>
                    <View style={[styles.perkBox, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}>
                      <Text style={[styles.perkLabel, { color: colors.textLight }]}>Joining Fee</Text>
                      <Text style={[styles.perkVal, { color: '#059669' }]}>Nil (₹0)</Text>
                    </View>
                    <View style={[styles.perkBox, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}>
                      <Text style={[styles.perkLabel, { color: colors.textLight }]}>Annual Fee</Text>
                      <Text style={[styles.perkVal, { color: '#059669' }]}>Nil (₹0)</Text>
                    </View>
                  </View>

                  <View style={styles.cardBottom}>
                    <TouchableOpacity
                      onPress={() => handleCardPress(card.id)}
                      style={styles.detailsBtn}
                    >
                      <Text style={[styles.detailsBtnText, { color: colors.textMid }]}>View Details</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleCardPress(card.id)}
                      style={styles.applyBtn}
                    >
                      <Text style={styles.applyBtnText}>Apply Free</Text>
                      <Icon name="arrow-right" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
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
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  bannerContainer: {
    paddingHorizontal: 16,
    marginTop: -14,
    marginBottom: 16,
  },
  bannerCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEmoji: {
    fontSize: 22,
  },
  bannerHeading: {
    fontSize: 15,
    fontWeight: '800',
  },
  bannerSub: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 3,
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
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  bankWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bankLogoImage: {
    width: 44,
    height: 24,
  },
  bankLogoFallback: {
    width: 30,
    height: 22,
    borderRadius: 4,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bankLogoFallbackText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  bankName: {
    fontSize: 12,
    fontWeight: '700',
  },
  ltfPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ltfPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#166534',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  perksRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  perkBox: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  perkLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  perkVal: {
    fontSize: 12,
    fontWeight: '800',
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  detailsBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  detailsBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#059669',
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
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
  },
  errorText: {
    fontSize: 14,
    marginTop: 12,
  },
  retryBtn: {
    marginTop: 14,
    backgroundColor: '#059669',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
