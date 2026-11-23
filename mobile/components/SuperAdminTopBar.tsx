import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, BackHandler, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../theme/spacing';
import { Icon } from './Icon';

interface SuperAdminTopBarProps {
  onMenuPress: () => void;
  messengerUnread?: number;
  notificationUnread?: number;
}

/**
 * Super Admin top navbar — mirrors the website SuperAdminLayout mobile header:
 * logo + "Super Admin / Control Center" left, Messenger + Notifications + theme
 * + hamburger right. The hamburger opens the full panel navigation drawer that
 * mirrors the website sidebar categories.
 */
export function SuperAdminTopBar({ onMenuPress, messengerUnread = 0, notificationUnread = 0 }: SuperAdminTopBarProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors: themeColors, isDark, toggleTheme } = useTheme();

  return (
    <View style={[styles.navbar, { backgroundColor: isDark ? themeColors.card : '#FFFFFF', borderColor: themeColors.border }]}>
      <View style={styles.navbarLeft}>
        <Image source={require('../assets/images/logo.png')} style={styles.navbarLogo} resizeMode="contain" />
        <View>
          <Text style={[styles.navbarBrand, { color: isDark ? themeColors.text : '#111827' }]}>{t('panels.superAdmin')}</Text>
          <Text style={[styles.navbarSub, { color: themeColors.textLight }]}>{t('panels.superAdminSubtitle')}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: isDark ? themeColors.bg : '#F3F4F6' }]}
          onPress={() => router.push('/(app)/messenger' as any)}
          activeOpacity={0.8}
        >
          <Icon name="chatbubbles" size={18} color={themeColors.primary} />
          {messengerUnread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{messengerUnread > 99 ? '99+' : messengerUnread}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: isDark ? themeColors.bg : '#F3F4F6' }]}
          onPress={() => router.push('/(app)/notifications' as any)}
          activeOpacity={0.8}
        >
          <Icon name="notifications" size={18} color={themeColors.primary} />
          {notificationUnread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{notificationUnread > 99 ? '99+' : notificationUnread}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: isDark ? themeColors.bg : '#F3F4F6' }]}
          onPress={toggleTheme}
          activeOpacity={0.8}
        >
          <Icon name={isDark ? 'sunny' : 'moon'} size={18} color={themeColors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onMenuPress} style={styles.iconBtn} activeOpacity={0.7}>
          <Icon name="menu" size={20} color={isDark ? themeColors.text : '#111827'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Navigation drawer content — mirrors website SuperAdminLayout sidebar ──
// `k` = i18n key under drawer.*; `label` kept as English fallback
export const SUPER_ADMIN_NAV_SECTIONS: { title: string; titleKey: string; items: { label: string; k: string; icon: string; route: string }[] }[] = [
  {
    title: 'OVERVIEW', titleKey: 'drawer.secOverview',
    items: [
      { label: 'Master Overview', k: 'drawer.masterOverview', icon: 'grid', route: '/(app)/super-admin/overview' },
      { label: 'Admins', k: 'drawer.admins', icon: 'shield', route: '/(app)/super-admin/dashboard' },
    ],
  },
  {
    title: 'USERS & ACCOUNTS', titleKey: 'drawer.secUsersAccounts',
    items: [
      { label: 'Working Hours', k: 'drawer.workingHours', icon: 'clock', route: '/(app)/super-admin/working-hours' },
      { label: 'Partners', k: 'drawer.partners', icon: 'people', route: '/(app)/super-admin/partners' },
      { label: 'Employees', k: 'drawer.employees', icon: 'person', route: '/(app)/super-admin/employees' },
      { label: 'Employee Attendance', k: 'drawer.employeeAttendance', icon: 'calendar', route: '/(app)/super-admin/attendance' },
      { label: 'HR', k: 'drawer.hr', icon: 'briefcase', route: '/(app)/hr-dashboard' },
    ],
  },
  {
    title: 'LEAD & APPLICATIONS', titleKey: 'drawer.secLeadApplications',
    items: [
      { label: 'Direct Card Leads', k: 'drawer.directCardLeads', icon: 'card', route: '/(app)/super-admin/leads' },
      { label: 'Loan Applications', k: 'drawer.loanApplications', icon: 'cash', route: '/(app)/applications' },
      { label: 'Applications Tracking', k: 'drawer.applicationsTracking', icon: 'check-circle', route: '/(app)/super-admin/applications' },
    ],
  },
  {
    title: 'PRODUCTS & BANKS', titleKey: 'drawer.secProductsBanks',
    items: [
      { label: 'Manage Banks', k: 'drawer.manageBanks', icon: 'business', route: '/(app)/super-admin/banks' },
      { label: 'Products', k: 'drawer.products', icon: 'grid', route: '/(app)/product-management' },
      { label: 'Product & Employee Links', k: 'drawer.productEmployeeLinks', icon: 'link', route: '/(app)/product-links' },
      { label: 'Bank Direct Links', k: 'drawer.bankDirectLinks', icon: 'git-branch', route: '/(app)/super-admin/links' },
      { label: 'Services Catalog', k: 'drawer.servicesCatalog', icon: 'layers', route: '/(app)/super-admin/services' },
    ],
  },
  {
    title: 'FINANCE', titleKey: 'drawer.secFinance',
    items: [
      { label: 'Wallet & Settlements', k: 'drawer.walletSettlements', icon: 'wallet', route: '/(app)/super-admin/wallet' },
      { label: 'Employee Incentives', k: 'drawer.employeeIncentives', icon: 'gift', route: '/(app)/employee-incentives' },
      { label: 'Partner Commissions', k: 'drawer.partnerCommissions', icon: 'cash', route: '/(app)/super-admin/commissions' },
      { label: 'Commission Rules', k: 'drawer.commissionRules', icon: 'options', route: '/(app)/commission-rules' },
      { label: 'Manage Commissions', k: 'drawer.manageCommissions', icon: 'receipt', route: '/(app)/manage-commissions' },
    ],
  },
  {
    title: 'MODIFY WEBSITE & PROMOTIONS', titleKey: 'drawer.secModifyWebsite',
    items: [
      { label: 'Banners', k: 'drawer.banners', icon: 'image', route: '/(app)/super-admin/banners' },
      { label: 'Contest Manager', k: 'drawer.contestManager', icon: 'trophy', route: '/(app)/super-admin/contests' },
      { label: 'Homepage Sections', k: 'drawer.homepageSections', icon: 'albums', route: '/(app)/super-admin/sections' },
    ],
  },
  {
    title: 'SYSTEM & REPORTS', titleKey: 'drawer.secSystemReports',
    items: [
      { label: 'Bulk SMS', k: 'drawer.bulkSms', icon: 'chatbox', route: '/(app)/bulk-sms-dashboard' },
      { label: 'WhatsApp Business', k: 'drawer.whatsappBusiness', icon: 'logo-whatsapp', route: '/(app)/whatsapp' },
      { label: 'Messenger', k: 'drawer.messenger', icon: 'chatbubbles', route: '/(app)/messenger' },
      { label: 'View Messages', k: 'drawer.viewMessages', icon: 'mail-open', route: '/(app)/view-messages' },
      { label: 'Announcements Manager', k: 'drawer.announcementsManager', icon: 'megaphone', route: '/(app)/super-admin/announcements' },
      { label: 'Support Tickets', k: 'drawer.supportTickets', icon: 'help-buoy', route: '/(app)/super-admin/support' },
      { label: 'Audit Logs', k: 'drawer.auditLogs', icon: 'document-text', route: '/(app)/super-admin/audit-logs' },
      { label: 'Reports', k: 'drawer.reports', icon: 'stats-chart', route: '/(app)/super-admin/reports' },
      { label: 'Referral Analytics', k: 'drawer.referralAnalytics', icon: 'git-network', route: '/(app)/referral-analytics' },
      { label: 'Penalty Settings', k: 'drawer.penaltySettings', icon: 'warning', route: '/(app)/super-admin/penalty-settings' },
      { label: 'Settings', k: 'drawer.settings', icon: 'settings', route: '/(app)/super-admin/settings' },
      { label: 'Profile', k: 'drawer.profile', icon: 'person-circle', route: '/(app)/profile' },
    ],
  },
];

interface SuperAdminNavDrawerProps {
  visible: boolean;
  onClose: () => void;
}

/** Full-screen navigation drawer mirroring the website sidebar categories. */
export function SuperAdminNavDrawer({ visible, onClose }: SuperAdminNavDrawerProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors: themeColors, isDark } = useTheme();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    const backAction = () => {
      onClose();
      return true;
    };
    const handler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => handler.remove();
  }, [visible, onClose]);

  const navigate = (route: string) => {
    onClose();
    router.push(route as any);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.drawerOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={[styles.drawer, { backgroundColor: isDark ? themeColors.card : '#FFFFFF', borderColor: themeColors.border }]}>
          {/* Header — mirrors website sidebar logo block */}
          <View style={[styles.drawerHeader, { borderBottomColor: themeColors.border }]}>
            <Image source={require('../assets/images/logo.png')} style={styles.drawerLogo} resizeMode="contain" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.drawerTitle, { color: isDark ? themeColors.text : '#111827' }]}>{t('panels.superAdmin')}</Text>
              <Text style={[styles.drawerSub, { color: themeColors.primary }]}>{t('panels.superAdminSubtitle')}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="x" size={20} color={isDark ? themeColors.text : '#111827'} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
            {/* Category chips — mirrors website sidebar section titles */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
              <TouchableOpacity
                style={[styles.catChip, { backgroundColor: themeColors.primary + '14', borderColor: themeColors.primary }]}
                onPress={() => setActiveSection(null)}
              >
                <Text style={[styles.catChipText, { color: themeColors.primary }]}>{t('common.all')}</Text>
              </TouchableOpacity>
              {SUPER_ADMIN_NAV_SECTIONS.map((s) => (
                <TouchableOpacity
                  key={s.title}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor: activeSection === s.title ? themeColors.primary + '14' : (isDark ? themeColors.bg : '#F8FAFC'),
                      borderColor: activeSection === s.title ? themeColors.primary : themeColors.border,
                    },
                  ]}
                  onPress={() => setActiveSection(activeSection === s.title ? null : s.title)}
                >
                  <Text style={[styles.catChipText, { color: activeSection === s.title ? themeColors.primary : (isDark ? themeColors.textMid : '#475569') }]}>
                    {t(s.titleKey)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {SUPER_ADMIN_NAV_SECTIONS.filter((s) => !activeSection || s.title === activeSection).map((section) => (
              <View key={section.title} style={styles.navSection}>
                <Text style={[styles.navSectionTitle, { color: themeColors.textLight }]}>{t(section.titleKey)}</Text>
                {section.items.map((item) => (
                  <TouchableOpacity
                    key={item.label}
                    style={[styles.navItem, { borderBottomColor: themeColors.border }]}
                    onPress={() => navigate(item.route)}
                    activeOpacity={0.7}
                  >
                    <Icon name={item.icon} size={18} color={themeColors.textMid || themeColors.textLight} />
                    <Text style={[styles.navItemText, { color: isDark ? themeColors.text : '#1F2937' }]}>{t(item.k)}</Text>
                    <Icon name="chevron-right" size={16} color={themeColors.textLight} />
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  navbarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  navbarLogo: { width: 30, height: 30 },
  navbarBrand: { fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  navbarSub: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: '900' },
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    flexDirection: 'row',
  },
  drawer: {
    width: '82%',
    maxWidth: 340,
    height: '100%',
    borderRightWidth: 1,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  drawerLogo: { width: 30, height: 30 },
  drawerTitle: { fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
  drawerSub: { fontSize: 10.5, fontWeight: '700', marginTop: 1 },
  closeBtn: { padding: 4 },
  catScroll: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  catChipText: { fontSize: 11, fontWeight: '800' },
  navSection: { paddingHorizontal: 14, paddingTop: 8 },
  navSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
    marginTop: 10,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  navItemText: { flex: 1, fontSize: 13.5, fontWeight: '600' },
});
