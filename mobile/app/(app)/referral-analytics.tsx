import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import apiClient from '../../services/api';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';

interface ReferralData {
  id: string;
  referrer_name?: string;
  referrer_code?: string;
  referral_count?: number;
  conversion_count?: number;
  conversion_rate?: number;
  total_commission?: number;
  top_product?: string;
  recent_referrals?: any[];
  period?: string;
}

export default function ReferralAnalyticsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [referralData, setReferralData] = useState<ReferralData[]>([]);
  const [timePeriod, setTimePeriod] = useState('month');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchReferralAnalytics();
  }, [timePeriod]);

  const fetchReferralAnalytics = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/reports/referral-analytics', {
        params: { period: timePeriod, limit: 100 },
      });
      setReferralData(response.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch referral analytics:', error);
      Alert.alert('Error', 'Failed to load referral analytics');
    } finally {
      setLoading(false);
    }
  };

  const filteredData = referralData.filter(r =>
    (r.referrer_name || '').toLowerCase().includes(searchText.toLowerCase()) ||
    (r.referrer_code || '').toLowerCase().includes(searchText.toLowerCase())
  );

  const totalReferrals = referralData.reduce((sum, r) => sum + (r.referral_count || 0), 0);
  const totalConversions = referralData.reduce((sum, r) => sum + (r.conversion_count || 0), 0);
  const totalCommission = referralData.reduce((sum, r) => sum + (r.total_commission || 0), 0);
  const avgConversionRate = totalReferrals > 0 
    ? ((totalConversions / totalReferrals) * 100).toFixed(1) 
    : '0';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading referral analytics...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Referral Analytics</Text>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{totalReferrals}</Text>
          <Text style={styles.summaryLabel}>Total Referrals</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{totalConversions}</Text>
          <Text style={styles.summaryLabel}>Conversions</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{avgConversionRate}%</Text>
          <Text style={styles.summaryLabel}>Avg Rate</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>₹{Number(totalCommission).toLocaleString()}</Text>
          <Text style={styles.summaryLabel}>Commission</Text>
        </View>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['week', 'month', 'quarter', 'year'].map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.filterChip,
                timePeriod === period && styles.filterChipActive,
              ]}
              onPress={() => setTimePeriod(period)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  timePeriod === period && styles.filterChipTextActive,
                ]}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Icon name="search" size={18} color={colors.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search referrers..."
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor={colors.textLight}
          />
        </View>
      </View>

      <View style={styles.referralContainer}>
        {filteredData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="users" size={48} color={colors.textLight} />
            <Text style={styles.emptyText}>No referral data found</Text>
          </View>
        ) : (
          filteredData.map((item) => (
            <Card key={item.id} style={styles.referralCard}>
              <View style={styles.cardHeader}>
                <View style={styles.referrerInfo}>
                  <Text style={styles.referrerName}>{item.referrer_name || 'Unknown'}</Text>
                  <Text style={styles.referrerCode}>{item.referrer_code || 'N/A'}</Text>
                </View>
                <View style={styles.conversionBadge}>
                  <Text style={styles.conversionText}>
                    {item.conversion_rate ? `${item.conversion_rate.toFixed(1)}%` : '0%'}
                  </Text>
                </View>
              </View>

              <View style={styles.metricsRow}>
                <View style={styles.metricItem}>
                  <Icon name="user-plus" size={16} color={colors.primary} />
                  <Text style={styles.metricValue}>{item.referral_count || 0}</Text>
                  <Text style={styles.metricLabel}>Referrals</Text>
                </View>
                <View style={styles.metricItem}>
                  <Icon name="check-circle" size={16} color={colors.success} />
                  <Text style={styles.metricValue}>{item.conversion_count || 0}</Text>
                  <Text style={styles.metricLabel}>Converted</Text>
                </View>
                <View style={styles.metricItem}>
                  <Icon name="credit-card" size={16} color={colors.accent} />
                  <Text style={styles.metricValue}>₹{Number(item.total_commission || 0).toLocaleString()}</Text>
                  <Text style={styles.metricLabel}>Commission</Text>
                </View>
              </View>

              {item.top_product && (
                <View style={styles.topProductRow}>
                  <Text style={styles.topProductLabel}>Top Product:</Text>
                  <Text style={styles.topProductValue}>{item.top_product}</Text>
                </View>
              )}

              {item.recent_referrals && item.recent_referrals.length > 0 && (
                <View style={styles.recentSection}>
                  <Text style={styles.recentTitle}>Recent Referrals</Text>
                  {item.recent_referrals.slice(0, 3).map((ref: any, idx: number) => (
                    <View key={idx} style={styles.recentItem}>
                      <Text style={styles.recentName}>{ref.customer_name || 'Customer'}</Text>
                      <Text style={styles.recentStatus}>{ref.status || 'Pending'}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  loadingText: {
    marginTop: 12,
    color: colors.textLight,
    fontSize: typography.sizes.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: spacing.xs,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  summaryCard: {
    flexDirection: 'row',
    margin: spacing.md,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  summaryLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textLight,
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  filterContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.bg,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: typography.weights.bold,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  referralContainer: {
    padding: spacing.md,
    gap: spacing.md,
  },
  emptyContainer: {
    padding: spacing.xl * 2,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.textLight,
  },
  referralCard: {
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  referrerInfo: {
    flex: 1,
  },
  referrerName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  referrerCode: {
    fontSize: typography.sizes.sm,
    color: colors.textLight,
    marginTop: 2,
  },
  conversionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#10B981',
  },
  conversionText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: 4,
  },
  metricLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textLight,
    marginTop: 2,
  },
  topProductRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  topProductLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textLight,
  },
  topProductValue: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontWeight: typography.weights.semibold,
  },
  recentSection: {
    marginTop: spacing.sm,
  },
  recentTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  recentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  recentName: {
    fontSize: typography.sizes.xs,
    color: colors.text,
  },
  recentStatus: {
    fontSize: typography.sizes.xs,
    color: colors.textLight,
  },
});
