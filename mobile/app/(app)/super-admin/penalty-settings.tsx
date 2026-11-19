import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { colors } from '../../../theme/colors';
import { typography } from '../../../theme/typography';
import { spacing } from '../../../theme/spacing';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Icon } from '../../../components/Icon';
import apiClient from '../../../services/api';

interface PenaltyRecord {
  id: string;
  attendance_id: string;
  employee_id: string;
  full_name: string;
  employee_code: string;
  check_out_time: string;
  penalty_amount: number;
  calculated_at: string;
  attendance_date: string;
}

export default function PenaltySettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [penaltyEnabled, setPenaltyEnabled] = useState(false);
  const [penalties, setPenalties] = useState<PenaltyRecord[]>([]);
  const [totalPenaltyAmount, setTotalPenaltyAmount] = useState(0);
  const [toggleLoading, setToggleLoading] = useState(false);

  const fetchPenaltyStatus = async () => {
    try {
      const response = await apiClient.get('/attendance/admin/penalty/status');
      setPenaltyEnabled(response.data?.data?.enabled || false);
    } catch (err: any) {
      console.error('Failed to fetch penalty status:', err);
    }
  };

  const fetchPenalties = async () => {
    try {
      const response = await apiClient.get('/attendance/admin/penalties', {
        params: { limit: 50 }
      });
      const penaltyList = response.data?.data?.penalties || [];
      setPenalties(penaltyList);
      const total = penaltyList.reduce((sum: number, p: PenaltyRecord) => sum + Number(p.penalty_amount || 0), 0);
      setTotalPenaltyAmount(total);
    } catch (err: any) {
      console.error('Failed to fetch penalties:', err);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([fetchPenaltyStatus(), fetchPenalties()]);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleTogglePenalty = async (enabled: boolean) => {
    setToggleLoading(true);
    try {
      await apiClient.post('/attendance/admin/penalty/toggle', { enabled });
      setPenaltyEnabled(enabled);
      Alert.alert(
        'Success',
        `Penalty system ${enabled ? 'enabled' : 'disabled'} successfully`
      );
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to toggle penalty system');
      // Revert on error
      setPenaltyEnabled(!enabled);
    } finally {
      setToggleLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAllData();
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading penalty settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Penalty Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Penalty System Toggle */}
      <Card style={styles.toggleCard}>
        <View style={styles.toggleHeader}>
          <View style={styles.toggleInfo}>
            <Icon name="alert-triangle" size={24} color={colors.warning} />
            <View style={styles.toggleTextContainer}>
              <Text style={styles.toggleTitle}>Late Attendance Penalty</Text>
              <Text style={styles.toggleDescription}>
                Automatically deduct ₹50/hr (₹25/30min) for check-outs after 7 PM
              </Text>
            </View>
          </View>
          <Switch
            value={penaltyEnabled}
            onValueChange={handleTogglePenalty}
            disabled={toggleLoading}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={penaltyEnabled ? '#fff' : colors.textLight}
          />
        </View>
        <View style={styles.statusBadge}>
          <Text style={[
            styles.statusText,
            { color: penaltyEnabled ? colors.success : colors.textLight }
          ]}>
            {penaltyEnabled ? 'ENABLED' : 'DISABLED'}
          </Text>
        </View>
      </Card>

      {/* Penalty Rules */}
      <Card style={styles.rulesCard}>
        <Text style={styles.sectionTitle}>Penalty Rules</Text>
        <View style={styles.ruleItem}>
          <Icon name="clock" size={16} color={colors.primary} />
          <Text style={styles.ruleText}>Penalty applies after 7:00 PM check-out</Text>
        </View>
        <View style={styles.ruleItem}>
          <Icon name="clock" size={16} color={colors.primary} />
          <Text style={styles.ruleText}>₹50 per hour after 7 PM</Text>
        </View>
        <View style={styles.ruleItem}>
          <Icon name="clock" size={16} color={colors.primary} />
          <Text style={styles.ruleText}>₹25 per 30 minutes after 7 PM</Text>
        </View>
        <View style={styles.ruleItem}>
          <Icon name="wallet" size={16} color={colors.primary} />
          <Text style={styles.ruleText}>Deduction logged in wallet transactions</Text>
        </View>
      </Card>

      {/* Penalty Summary */}
      <Card style={styles.summaryCard}>
        <Text style={styles.sectionTitle}>Penalty Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Penalties Applied</Text>
          <Text style={styles.summaryValue}>{penalties.length}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Amount Deducted</Text>
          <Text style={[styles.summaryValue, { color: colors.error }]}>
            {formatCurrency(totalPenaltyAmount)}
          </Text>
        </View>
      </Card>

      {/* Recent Penalties */}
      <Card style={styles.penaltiesCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.sectionTitle}>Recent Penalties</Text>
          <TouchableOpacity onPress={onRefresh}>
            <Icon name="refresh-cw" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {penalties.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="shield-check" size={48} color={colors.textLight} />
            <Text style={styles.emptyText}>No penalties applied yet</Text>
          </View>
        ) : (
          penalties.map((penalty) => (
            <View key={penalty.id} style={styles.penaltyItem}>
              <View style={styles.penaltyInfo}>
                <Text style={styles.employeeName}>{penalty.full_name}</Text>
                <Text style={styles.employeeCode}>{penalty.employee_code}</Text>
                <Text style={styles.penaltyDate}>
                  {formatDate(penalty.attendance_date)} • Check-out: {formatTime(penalty.check_out_time)}
                </Text>
              </View>
              <View style={styles.penaltyAmount}>
                <Text style={[styles.amountText, { color: colors.error }]}>
                  -{formatCurrency(Number(penalty.penalty_amount || 0))}
                </Text>
                <Text style={styles.penaltyTime}>
                  {formatDate(penalty.calculated_at)}
                </Text>
              </View>
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textMid,
    marginTop: spacing.sm,
  },
  header: {
    backgroundColor: '#0F172A',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  toggleCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  toggleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleTextContainer: {
    marginLeft: spacing.md,
    flex: 1,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 12,
    color: colors.textLight,
  },
  statusBadge: {
    marginTop: spacing.md,
    alignItems: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  rulesCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  ruleText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  summaryCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textLight,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  penaltiesCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.xl,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: spacing.sm,
  },
  penaltyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  penaltyInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  employeeCode: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
  },
  penaltyDate: {
    fontSize: 11,
    color: colors.textMid,
    marginTop: 2,
  },
  penaltyAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  penaltyTime: {
    fontSize: 11,
    color: colors.textMid,
    marginTop: 2,
  },
});
