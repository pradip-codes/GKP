import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { typography } from '../../../theme/typography';
import { spacing } from '../../../theme/spacing';
import { Icon } from '../../../components/Icon';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';

export default function SuperAdminMenuScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();

  const menuItems = [
    {
      section: 'Overview & workflow',
      title: 'Dashboard',
      description: 'Overview metrics and admin management',
      icon: 'grid',
      color: '#3B82F6',
      path: '/super-admin/dashboard',
    },
    {
      section: 'People & policy',
      title: 'Staff & Candidates',
      description: 'Employees & talent conversion pipeline',
      icon: 'users',
      color: '#6366F1',
      path: '/super-admin/employees',
    },
    {
      section: 'Overview & workflow',
      title: 'Partners',
      description: 'Partner directory and KYC review',
      icon: 'shield',
      color: '#F59E0B',
      path: '/super-admin/partners',
    },
    {
      section: 'Financial operations',
      title: 'Wallet & Payouts',
      description: 'Super admin wallet & settlements',
      icon: 'credit-card',
      color: '#10B981',
      path: '/super-admin/wallet',
    },
    {
      section: 'People & policy',
      title: 'Attendance',
      description: 'Employee biometric & GPS attendance',
      icon: 'calendar',
      color: '#06B6D4',
      path: '/super-admin/attendance',
    },
    {
      section: 'People & policy',
      title: 'Working Hours',
      description: 'Business hours, shifts, overtime & holidays',
      icon: 'clock',
      color: '#8B5CF6',
      path: '/super-admin/working-hours',
    },
    {
      section: 'Content & distribution',
      title: 'Broadcasts',
      description: 'Push notifications & announcements',
      icon: 'bell',
      color: '#EC4899',
      path: '/super-admin/announcements',
    },
    {
      section: 'People & policy',
      title: 'Sales Contests',
      description: 'Contests and reward leaderboards',
      icon: 'award',
      color: '#F97316',
      path: '/super-admin/contests',
    },
    {
      section: 'Governance & reporting',
      title: 'Audit Logs',
      description: 'Security actions and activity trail',
      icon: 'activity',
      color: '#64748B',
      path: '/super-admin/audit-logs',
    },
    {
      section: 'Governance & reporting',
      title: 'Reports',
      description: 'System reports and analytics',
      icon: 'file-text',
      color: '#8B5CF6',
      path: '/super-admin/reports',
    },
    {
      section: 'Overview & workflow',
      title: 'Leads',
      description: 'Lead management and CRM',
      icon: 'list',
      color: '#EF4444',
      path: '/super-admin/leads',
    },
    {
      section: 'Overview & workflow',
      title: 'Applications',
      description: 'Application tracking',
      icon: 'check-circle',
      color: '#0EA5E9',
      path: '/super-admin/applications',
    },
    {
      section: 'Financial operations',
      title: 'Commissions',
      description: 'Commission and payouts',
      icon: 'dollar-sign',
      color: '#10B981',
      path: '/super-admin/commissions',
    },
    {
      section: 'Financial operations',
      title: 'Banks',
      description: 'Bank partner management',
      icon: 'briefcase',
      color: '#3B82F6',
      path: '/super-admin/banks',
    },
    {
      section: 'Governance & reporting',
      title: 'Settings',
      description: 'System configuration',
      icon: 'settings',
      color: '#6B7280',
      path: '/super-admin/settings',
    },
    {
      section: 'Overview & workflow',
      title: 'Support Desk',
      description: 'Inquiries and ticket resolution',
      icon: 'message-square',
      color: '#0284C7',
      path: '/super-admin/support',
    },
    {
      section: 'Content & distribution',
      title: 'CMS Banners',
      description: 'Homepage & mobile promo banners',
      icon: 'image',
      color: '#F43F5E',
      path: '/super-admin/banners',
    },
    {
      section: 'Content & distribution',
      title: 'CMS Sections',
      description: 'Landing sections & corporate branding',
      icon: 'layers',
      color: '#8B5CF6',
      path: '/super-admin/sections',
    },
    {
      section: 'Content & distribution',
      title: 'Bank Direct Links',
      description: 'Partner & digital journey redirects',
      icon: 'link',
      color: '#06B6D4',
      path: '/super-admin/links',
    },
    {
      section: 'Content & distribution',
      title: 'Services Catalog',
      description: 'Service items, routes & click tracking',
      icon: 'grid',
      color: '#10B981',
      path: '/super-admin/services',
    },
  ];

  const sections = [
    'Overview & workflow',
    'People & policy',
    'Financial operations',
    'Content & distribution',
    'Governance & reporting',
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.sidebar }]}>
        <Text style={styles.roleBadge}>SUPER ADMIN</Text>
        <Text style={styles.headerTitle}>Control Center</Text>
        <Text style={styles.headerSubtitle}>Welcome, {user?.full_name || 'Administrator'}</Text>
        <View style={styles.headerMeta}>
          <Icon name="grid" size={16} color={colors.accent} />
          <Text style={styles.headerMetaText}>{menuItems.length} management tools</Text>
        </View>
      </View>

      {sections.map((section) => (
        <View key={section} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{section}</Text>
          <View style={styles.menuGrid}>
            {menuItems.filter((item) => item.section === section).map((item) => (
              <TouchableOpacity
                key={item.title}
                style={[
                  styles.menuCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => router.push(item.path as any)}
                activeOpacity={0.75}
              >
                <View style={[styles.menuIcon, { backgroundColor: `${item.color}1A` }]}>
                  <Icon name={item.icon} size={22} color={item.color} />
                </View>
                <Text style={[styles.menuTitle, { color: colors.text }]} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={[styles.menuDesc, { color: colors.textMid }]} numberOfLines={2}>
                  {item.description}
                </Text>
                <Icon name="chevron-right" size={16} color={colors.textLight} style={styles.menuArrow} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      {/* Logout */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: colors.card, borderColor: colors.error }]}
          onPress={() => router.replace('/(auth)/login')}
        >
          <Icon name="x-circle" size={20} color={colors.error} />
          <Text style={[styles.logoutText, { color: colors.error }]}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xl,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  roleBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#CBD5E1',
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  headerMetaText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  menuCard: {
    width: '48%',
    minHeight: 158,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  menuDesc: {
    fontSize: 11,
    lineHeight: 14,
    paddingRight: spacing.sm,
  },
  menuArrow: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
  },
  footer: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },
});
