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

interface ShareTrackingData {
  id: string;
  customer_name?: string;
  customer_mobile?: string;
  product_name?: string;
  share_link?: string;
  total_clicks?: number;
  unique_clicks?: number;
  conversions?: number;
  last_clicked_at?: string;
  created_at?: string;
  status?: string;
}

export default function ShareTrackingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [trackingData, setTrackingData] = useState<ShareTrackingData[]>([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchShareTracking();
  }, [statusFilter]);

  const fetchShareTracking = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = { limit: '100' };
      if (statusFilter !== 'all') params.status = statusFilter;
      const response = await apiClient.get('/leads/tracking', { params });
      setTrackingData(response.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch share tracking:', error);
      Alert.alert('Error', 'Failed to load share tracking data');
    } finally {
      setLoading(false);
    }
  };

  const filteredData = trackingData.filter(item => {
    const haystack = [
      item.customer_name,
      item.customer_mobile,
      item.product_name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(searchText.toLowerCase());
  });

  const statusOptions = ['all', 'active', 'converted', 'expired'];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading share tracking...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Share Tracking</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Icon name="search" size={18} color={colors.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search shares..."
            placeholderTextColor={colors.textLight}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {statusOptions.map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterChip,
                statusFilter === status && styles.filterChipActive
              ]}
              onPress={() => setStatusFilter(status)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === status && styles.filterChipTextActive
                ]}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{trackingData.length}</Text>
          <Text style={styles.summaryLabel}>Total Shares</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {trackingData.reduce((sum, item) => sum + (item.total_clicks || 0), 0)}
          </Text>
          <Text style={styles.summaryLabel}>Total Clicks</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {trackingData.reduce((sum, item) => sum + (item.conversions || 0), 0)}
          </Text>
          <Text style={styles.summaryLabel}>Conversions</Text>
        </View>
      </View>

      <View style={styles.trackingContainer}>
        {filteredData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="share-2" size={48} color={colors.textLight} />
            <Text style={styles.emptyText}>No share tracking data found</Text>
          </View>
        ) : (
          filteredData.map((item) => (
            <Card key={item.id} style={styles.trackingCard}>
              <View style={styles.cardHeader}>
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>{item.customer_name || 'Unknown'}</Text>
                  <Text style={styles.customerMobile}>{item.customer_mobile || '—'}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(item.status || 'active') }
                  ]}
                >
                  <Text style={styles.statusText}>
                    {(item.status || 'active').charAt(0).toUpperCase() + (item.status || 'active').slice(1)}
                  </Text>
                </View>
              </View>

              <Text style={styles.productLabel}>{item.product_name || 'Product'}</Text>

              <View style={styles.metricsRow}>
                <View style={styles.metricItem}>
                  <Icon name="mouse-pointer" size={16} color={colors.primary} />
                  <Text style={styles.metricValue}>{item.total_clicks || 0}</Text>
                  <Text style={styles.metricLabel}>Clicks</Text>
                </View>
                <View style={styles.metricItem}>
                  <Icon name="users" size={16} color={colors.primary} />
                  <Text style={styles.metricValue}>{item.unique_clicks || 0}</Text>
                  <Text style={styles.metricLabel}>Unique</Text>
                </View>
                <View style={styles.metricItem}>
                  <Icon name="check-circle" size={16} color={colors.primary} />
                  <Text style={styles.metricValue}>{item.conversions || 0}</Text>
                  <Text style={styles.metricLabel}>Converted</Text>
                </View>
              </View>

              {item.last_clicked_at && (
                <Text style={styles.lastClickText}>
                  Last clicked: {new Date(item.last_clicked_at).toLocaleDateString()}
                </Text>
              )}

              <TouchableOpacity
                style={styles.viewLinkButton}
                onPress={() => {
                  if (item.share_link) {
                    Alert.alert('Share Link', item.share_link);
                  }
                }}
              >
                <Icon name="link" size={14} color={colors.primary} />
                <Text style={styles.viewLinkText}>View Link</Text>
              </TouchableOpacity>
            </Card>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return '#10B981';
    case 'converted': return '#3B82F6';
    case 'expired': return '#EF4444';
    default: return '#6B7280';
  }
};

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
    justifyContent: 'space-between',
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
  },
  searchContainer: {
    padding: spacing.md,
    backgroundColor: colors.card,
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
  filterContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.card,
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
  trackingContainer: {
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
  trackingCard: {
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  customerMobile: {
    fontSize: typography.sizes.sm,
    color: colors.textLight,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  productLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textLight,
    marginBottom: spacing.md,
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
  lastClickText: {
    fontSize: typography.sizes.xs,
    color: colors.textLight,
    marginBottom: spacing.md,
  },
  viewLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  viewLinkText: {
    marginLeft: spacing.sm,
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
});
