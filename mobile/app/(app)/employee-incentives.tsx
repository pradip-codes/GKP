import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { Button } from '../../components/Button';
import { fetchEmployeeIncentives } from '../../services/employee.service';

export default function EmployeeIncentivesScreen() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<'monthly' | 'ledger'>('monthly');

  const loadIncentives = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchEmployeeIncentives();
      if (res?.success) {
        setStats(res.stats || null);
        setTransactions(res.transactions || []);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load employee incentives');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadIncentives();
  }, [loadIncentives]);

  const onRefresh = () => {
    setRefreshing(true);
    loadIncentives();
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Icon name="chevron-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerSubtitle}>EMPLOYEE PORTAL</Text>
          <Text style={styles.headerTitle}>Incentives & Bonuses</Text>
        </View>
      </View>

      {/* View Switcher Tabs */}
      <View style={styles.viewSwitcher}>
        <TouchableOpacity
          style={[styles.viewTab, activeView === 'monthly' && styles.activeViewTab]}
          onPress={() => setActiveView('monthly')}
        >
          <Text style={[styles.viewTabText, activeView === 'monthly' && styles.activeViewTabText]}>
            🗓️ Monthly Audit
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewTab, activeView === 'ledger' && styles.activeViewTab]}
          onPress={() => setActiveView('ledger')}
        >
          <Text style={[styles.viewTabText, activeView === 'ledger' && styles.activeViewTabText]}>
            📜 Ledger
          </Text>
        </TouchableOpacity>
      </View>

      {/* KPI Overview Banner */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Total Paid</Text>
          <Text style={[styles.kpiValue, { color: '#10B981' }]}>
            ₹{(stats?.total_paid || 0).toLocaleString('en-IN')}
          </Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Pending Incentive</Text>
          <Text style={[styles.kpiValue, { color: '#F59E0B' }]}>
            ₹{(stats?.pending_incentive || 0).toLocaleString('en-IN')}
          </Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Cards Converted</Text>
          <Text style={[styles.kpiValue, { color: colors.primaryLight }]}>
            {stats?.total_leads_converted || transactions.length}
          </Text>
        </View>
      </View>

      {activeView === 'monthly' ? (
        <Card style={[styles.card, { marginTop: spacing.md }]}>
          <Text style={styles.cardTitle}>Monthly Incentive Audit</Text>
          <Text style={styles.cardSubtitle}>
            Detailed breakdown of your monthly performance earnings and payouts.
          </Text>
          <View style={styles.monthlyContainer}>
            <Icon name="calendar" size={48} color={colors.textLight} />
            <Text style={styles.emptyTitle}>Monthly Audit View</Text>
            <Text style={styles.emptyDesc}>
              Detailed monthly breakdown with date ranges, performance metrics, and payout summaries will appear here.
            </Text>
          </View>
        </Card>
      ) : null}

      {/* Incentive Structure Breakdown */}
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Incentive Tier Structure</Text>
        <Text style={styles.cardSubtitle}>
          Earn progressive slab bonuses based on monthly approved credit card volumes.
        </Text>

        <View style={styles.tierBox}>
          <View style={styles.tierHeader}>
            <Text style={styles.tierTitle}>Tier 1: 1 - 10 Cards</Text>
            <Text style={styles.tierRate}>₹250 / Card</Text>
          </View>
          <Text style={styles.tierDesc}>Standard base incentive on verified banking disbursal.</Text>
        </View>

        <View style={[styles.tierBox, { borderColor: colors.primary }]}>
          <View style={styles.tierHeader}>
            <Text style={[styles.tierTitle, { color: colors.primaryLight }]}>
              Tier 2: 11 - 25 Cards
            </Text>
            <Text style={[styles.tierRate, { color: colors.primaryLight }]}>
              ₹400 / Card + ₹2,000 Bonus
            </Text>
          </View>
          <Text style={styles.tierDesc}>Accelerated bonus slab upon achieving monthly team target.</Text>
        </View>

        <View style={[styles.tierBox, { borderColor: '#F59E0B' }]}>
          <View style={styles.tierHeader}>
            <Text style={[styles.tierTitle, { color: '#F59E0B' }]}>
              Tier 3: 26+ Cards (Top Performer)
            </Text>
            <Text style={[styles.tierRate, { color: '#F59E0B' }]}>
              ₹600 / Card + ₹5,000 Bonus
            </Text>
          </View>
          <Text style={styles.tierDesc}>Premium multiplier tier with eligibility for company contest awards.</Text>
        </View>
      </Card>

      {/* Transactions / Ledger */}
      {activeView === 'ledger' ? (
        <Card style={[styles.card, { marginTop: spacing.md }]}>
          <Text style={styles.cardTitle}>Recent Incentive Transactions</Text>
          <Text style={styles.cardSubtitle}>
            Detailed ledger of disbursed and pending performance bonuses.
          </Text>

          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
          ) : transactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="credit-card" size={36} color={colors.textLight} />
              <Text style={styles.emptyTitle}>No Transactions Yet</Text>
              <Text style={styles.emptyDesc}>
                Approved customer applications and sales reports will generate incentives here.
              </Text>
            </View>
          ) : (
            transactions.map((tx) => (
              <View key={tx.id} style={styles.txRow}>
                <View style={styles.txIconWrap}>
                  <Icon name="check-circle" size={18} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txTitle}>
                    {tx.product_name || `Application #${tx.app_number || tx.id.substring(0, 6)}`}
                  </Text>
                  <Text style={styles.txDate}>
                    {new Date(tx.created_at || Date.now()).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.txAmount}>+₹{tx.amount}</Text>
                  <Text
                    style={[
                      styles.txStatus,
                      {
                        color:
                          tx.status?.toUpperCase() === 'COMPLETED' || tx.status?.toUpperCase() === 'PAID'
                            ? '#10B981'
                            : '#F59E0B',
                      },
                    ]}
                  >
                    {(tx.status || 'EARNED').toUpperCase()}
                  </Text>
                </View>
              </View>
            ))
          )}
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: spacing.md,
    backgroundColor: '#0B1120',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  backBtn: {
    marginRight: spacing.sm,
    padding: 4,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1.5,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  viewSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 4,
    marginBottom: spacing.md,
  },
  viewTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeViewTab: {
    backgroundColor: colors.primary,
  },
  viewTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textLight,
  },
  activeViewTabText: {
    color: '#fff',
    fontWeight: '700',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 10,
    color: colors.textLight,
    fontWeight: '600',
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  card: {
    padding: spacing.lg,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textLight,
    marginBottom: spacing.md,
  },
  tierBox: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: spacing.xs,
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tierTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  tierRate: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10B981',
  },
  tierDesc: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginTop: spacing.xs,
  },
  emptyDesc: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: 2,
    textAlign: 'center',
  },
  monthlyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: spacing.sm,
    borderRadius: 10,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  txIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  txTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  txDate: {
    fontSize: 10,
    color: colors.textLight,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10B981',
  },
  txStatus: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
});
