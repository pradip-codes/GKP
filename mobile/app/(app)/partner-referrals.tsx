import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Clipboard } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import apiClient from '../../services/api';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

interface ReferralInfo {
  id?: string;
  partner_id?: string;
  referral_code: string;
  referral_link: string;
  total_invites: number;
  total_registered: number;
  custom_message?: string;
  created_at?: string;
  updated_at?: string;
}

export default function PartnerReferralsScreen() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<ReferralInfo | null>(null);

  useEffect(() => {
    fetchReferralInfo();
  }, []);

  const fetchReferralInfo = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/partner/referral');
      setInfo(response.data?.data || null);
    } catch (error) {
      console.error('Failed to fetch referral info:', error);
      Alert.alert('Error', 'Failed to load referral details');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (value: string) => {
    try {
      Clipboard.setString(value);
      Alert.alert('Success', 'Copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy');
    }
  };

  const totalInvites = Number(info?.total_invites || 0);
  const totalRegistered = Number(info?.total_registered || 0);
  const conversionRate = totalInvites > 0 ? (totalRegistered / totalInvites) * 100 : 0;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading referrals...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Referrals</Text>
        <Text style={styles.subtitle}>Invite partners and earn commissions</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalInvites}</Text>
          <Text style={styles.statLabel}>Total Invites</Text>
          <Text style={styles.statSublabel}>All Time</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalRegistered}</Text>
          <Text style={styles.statLabel}>Registered</Text>
          <Text style={styles.statSublabel}>Joined</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{conversionRate.toFixed(1)}%</Text>
          <Text style={styles.statLabel}>Conversion</Text>
          <Text style={styles.statSublabel}>Rate</Text>
        </View>
      </View>

      <View style={styles.referralsContainer}>
        {!info?.referral_link ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔒</Text>
            <Text style={styles.emptyTitle}>KYC Required</Text>
            <Text style={styles.emptyText}>
              Referral link will be available once your KYC is approved.
            </Text>
          </View>
        ) : (
          <View style={styles.referralCard}>
            <View style={styles.referralHeader}>
              <View style={styles.referralIconBg}>
                <Text style={styles.referralIcon}>🎁</Text>
              </View>
              <View style={styles.referralInfo}>
                <Text style={styles.referralTitle}>Your Referral Code</Text>
                <Text style={styles.referralCode}>{info.referral_code}</Text>
              </View>
              <TouchableOpacity
                style={styles.copyBadge}
                onPress={() => handleCopy(info.referral_code)}
              >
                <Text style={styles.copyBadgeText}>COPY</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.linkContainer}>
              <Text style={styles.linkLabel}>Referral Link</Text>
              <Text style={styles.linkText} numberOfLines={2}>
                {info.referral_link}
              </Text>
            </View>

            {!!info.custom_message && (
              <View style={styles.messageContainer}>
                <Text style={styles.messageLabel}>Custom Message</Text>
                <Text style={styles.messageText}>{info.custom_message}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => handleCopy(info.referral_link)}
            >
              <Text style={styles.primaryButtonText}>Copy Referral Link</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                // Share functionality
                Alert.alert('Share', 'Share functionality coming soon');
              }}
            >
              <Text style={styles.secondaryButtonText}>Share via WhatsApp</Text>
            </TouchableOpacity>
          </View>
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
    padding: 20,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textLight,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: colors.text,
    marginTop: 2,
  },
  statSublabel: {
    fontSize: 9.5,
    color: colors.textLight,
    marginTop: 2,
  },
  referralsContainer: {
    padding: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    color: colors.textLight,
    textAlign: 'center',
  },
  referralCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
  },
  referralHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  referralIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  referralIcon: {
    fontSize: 24,
  },
  referralInfo: {
    flex: 1,
    marginLeft: 12,
  },
  referralTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.text,
  },
  referralCode: {
    fontSize: typography.sizes.lg,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 2,
  },
  copyBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  copyBadgeText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.xs,
    fontWeight: '700',
  },
  linkContainer: {
    backgroundColor: colors.bg,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  linkLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textLight,
    marginBottom: 4,
  },
  linkText: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontFamily: 'monospace',
  },
  messageContainer: {
    backgroundColor: colors.bg,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  messageLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textLight,
    marginBottom: 4,
  },
  messageText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#25D366',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
    fontWeight: '700',
  },
});
