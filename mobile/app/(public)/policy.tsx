import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';

const POLICIES = [
  {
    key: 'terms',
    title: 'Terms & Conditions',
    summary: 'Platform usage rules, lead fulfillment, partner responsibilities, and account terms.',
  },
  {
    key: 'privacy',
    title: 'Privacy Policy & DPDP',
    summary: 'How we collect, use, store, and protect your personal and financial data.',
  },
  {
    key: 'refund',
    title: 'Refund & Payout Policy',
    summary: 'Commission disbursals, reversals, and wallet settlement timelines.',
  },
  {
    key: 'shipping',
    title: 'Shipping Policy',
    summary: 'Dispatch, delivery, and tracking for physical documents and cards.',
  },
];

export default function PolicyScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Icon name="chevron-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerSubtitle}>LEGAL & COMPLIANCE</Text>
          <Text style={styles.headerTitle}>Platform Policies</Text>
        </View>
      </View>

      {/* Policy Cards */}
      {POLICIES.map((p) => (
        <Card key={p.key} style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.policyHeading}>{p.title}</Text>
            <Icon name="document-text" size={22} color={colors.primary} />
          </View>
          <Text style={styles.policyBody}>{p.summary}</Text>
          <TouchableOpacity
            style={[styles.readBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push(`/(public)/legal?doc=${p.key}`)}
          >
            <Text style={styles.readBtnText}>Read Full Policy</Text>
            <Icon name="chevron-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </Card>
      ))}
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
  card: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  policyHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    flex: 1,
    marginRight: spacing.sm,
  },
  policyBody: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 20,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  readBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 10,
  },
  readBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
});
