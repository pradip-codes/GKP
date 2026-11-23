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

  // Mirrors the website SuperAdminLayout sidebar order & grouping
  const menuItems = [
    // ── Core Management ──
    { section: 'Core Management', title: 'Master Overview', description: 'System-wide metrics & 360° directory', icon: 'grid', color: '#3B82F6', path: '/super-admin/overview' },
    { section: 'Core Management', title: 'Admins', description: 'Admin users & operations staff', icon: 'shield', color: '#F59E0B', path: '/super-admin/dashboard' },
    { section: 'Core Management', title: 'Working Hours', description: 'Business hours, shifts, overtime & holidays', icon: 'clock', color: '#8B5CF6', path: '/super-admin/working-hours' },
    { section: 'Core Management', title: 'Partners', description: 'Partner directory and KYC review', icon: 'people', color: '#10B981', path: '/super-admin/partners' },
    { section: 'Core Management', title: 'Employees', description: 'Staff & candidate pipeline', icon: 'person', color: '#6366F1', path: '/super-admin/employees' },
    { section: 'Core Management', title: 'Employee Attendance', description: 'Biometric & GPS attendance', icon: 'calendar', color: '#06B6D4', path: '/super-admin/attendance' },
    { section: 'Core Management', title: 'HR', description: 'HR dashboard & candidates', icon: 'briefcase', color: '#EC4899', path: '/hr-dashboard' },
    // ── CRM Pipeline ──
    { section: 'CRM Pipeline', title: 'Direct Card Leads', description: 'Direct card lead management', icon: 'card', color: '#3B82F6', path: '/super-admin/leads' },
    { section: 'CRM Pipeline', title: 'Loan Applications', description: 'Loan application review', icon: 'cash', color: '#8B5CF6', path: '/applications' },
    { section: 'CRM Pipeline', title: 'Applications Tracking', description: 'All applications 360° trace', icon: 'check-circle', color: '#0EA5E9', path: '/super-admin/applications' },
    // ── CMS & Catalog ──
    { section: 'CMS & Catalog', title: 'Manage Banks', description: 'Bank partners & configurations', icon: 'business', color: '#3B82F6', path: '/super-admin/banks' },
    { section: 'CMS & Catalog', title: 'Products', description: 'Credit cards, loans, insurance catalog', icon: 'grid', color: '#6366F1', path: '/product-management' },
    { section: 'CMS & Catalog', title: 'Product & Employee Links', description: 'Product links & employee assignment', icon: 'link', color: '#06B6D4', path: '/product-links' },
    { section: 'CMS & Catalog', title: 'Bank Direct Links', description: 'Partner & digital journey redirects', icon: 'git-branch', color: '#10B981', path: '/super-admin/links' },
    { section: 'CMS & Catalog', title: 'Services Catalog', description: 'Service items, routes & click tracking', icon: 'layers', color: '#F97316', path: '/super-admin/services' },
    // ── Financial Operations ──
    { section: 'Financial Operations', title: 'Wallet & Settlements', description: 'Super admin wallet & payouts', icon: 'wallet', color: '#10B981', path: '/super-admin/wallet' },
    { section: 'Financial Operations', title: 'Partner Commissions', description: 'Commission rates & partner rewards', icon: 'cash', color: '#059669', path: '/super-admin/commissions' },
    { section: 'Financial Operations', title: 'Commission Rules', description: 'Rule engine & slabs', icon: 'options', color: '#0D9488', path: '/commission-rules' },
    { section: 'Financial Operations', title: 'Manage Commissions', description: 'Commission ledger & adjustments', icon: 'receipt', color: '#16A34A', path: '/manage-commissions' },
    // ── Content & Marketing ──
    { section: 'Content & Marketing', title: 'Banners', description: 'Homepage & mobile promo banners', icon: 'image', color: '#F43F5E', path: '/super-admin/banners' },
    { section: 'Content & Marketing', title: 'Contest Manager', description: 'Contests and reward leaderboards', icon: 'award', color: '#F97316', path: '/super-admin/contests' },
    { section: 'Content & Marketing', title: 'Homepage Sections', description: 'Landing sections & branding', icon: 'albums', color: '#8B5CF6', path: '/super-admin/sections' },
    // ── Communication & Support ──
    { section: 'Communication & Support', title: 'Bulk SMS', description: 'SMS campaigns & templates', icon: 'chatbox', color: '#0284C7', path: '/bulk-sms-dashboard' },
    { section: 'Communication & Support', title: 'WhatsApp Business', description: 'WhatsApp messaging tools', icon: 'logo-whatsapp', color: '#25D366', path: '/whatsapp' },
    { section: 'Communication & Support', title: 'Messenger', description: 'Internal team messenger', icon: 'chatbubbles', color: '#4F46E5', path: '/messenger' },
    { section: 'Communication & Support', title: 'View Messages', description: 'Broadcast message viewer', icon: 'mail-open', color: '#0EA5E9', path: '/view-messages' },
    { section: 'Communication & Support', title: 'Announcements Manager', description: 'Push notifications & broadcasts', icon: 'megaphone', color: '#EC4899', path: '/super-admin/announcements' },
    { section: 'Communication & Support', title: 'Support Tickets', description: 'Inquiries and ticket resolution', icon: 'help-buoy', color: '#0284C7', path: '/super-admin/support' },
    // ── Governance & Reporting ──
    { section: 'Governance & Reporting', title: 'Audit Logs', description: 'Security actions and activity trail', icon: 'document-text', color: '#64748B', path: '/super-admin/audit-logs' },
    { section: 'Governance & Reporting', title: 'Reports', description: 'System reports and analytics', icon: 'stats-chart', color: '#8B5CF6', path: '/super-admin/reports' },
    { section: 'Governance & Reporting', title: 'Referral Analytics', description: 'Referral funnel & conversions', icon: 'git-network', color: '#0D9488', path: '/referral-analytics' },
    { section: 'Governance & Reporting', title: 'Penalty Settings', description: 'Late/absence penalty rules', icon: 'warning', color: '#DC2626', path: '/super-admin/penalty-settings' },
    { section: 'Governance & Reporting', title: 'Settings', description: 'System configuration', icon: 'settings', color: '#6B7280', path: '/super-admin/settings' },
    { section: 'Governance & Reporting', title: 'Profile', description: 'Admin profile & security', icon: 'person-circle', color: '#4F46E5', path: '/profile' },
  ];

  const sections = [
    'Core Management',
    'CRM Pipeline',
    'CMS & Catalog',
    'Financial Operations',
    'Content & Marketing',
    'Communication & Support',
    'Governance & Reporting',
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
