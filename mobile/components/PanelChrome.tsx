import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, BackHandler, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../theme/spacing';
import { Icon } from './Icon';

export interface PanelNavItem { label: string; icon: string; route: string }
export interface PanelNavSection { title: string; items: PanelNavItem[] }

interface PanelTopBarProps {
  brand: string;
  subtitle: string;
  onMenuPress: () => void;
  messengerUnread?: number;
  notificationUnread?: number;
}

/**
 * Generic panel top navbar — mirrors the website AdminLayout mobile header:
 * logo + brand left, Messenger + Notifications + theme + hamburger right.
 */
export function PanelTopBar({ brand, subtitle, onMenuPress, messengerUnread = 0, notificationUnread = 0 }: PanelTopBarProps) {
  const router = useRouter();
  const { colors: themeColors, isDark, toggleTheme } = useTheme();

  return (
    <View style={[styles.navbar, { backgroundColor: isDark ? themeColors.card : '#FFFFFF', borderColor: themeColors.border }]}>
      <View style={styles.navbarLeft}>
        <Image source={require('../assets/images/logo.png')} style={styles.navbarLogo} resizeMode="contain" />
        <View>
          <Text style={[styles.navbarBrand, { color: isDark ? themeColors.text : '#111827' }]}>{brand}</Text>
          <Text style={[styles.navbarSub, { color: themeColors.textLight }]}>{subtitle}</Text>
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

interface PanelNavDrawerProps {
  visible: boolean;
  onClose: () => void;
  sections: PanelNavSection[];
  brand: string;
  subtitle: string;
}

/** Full-screen navigation drawer mirroring a website panel sidebar. */
export function PanelNavDrawer({ visible, onClose, sections, brand, subtitle }: PanelNavDrawerProps) {
  const router = useRouter();
  const { colors: themeColors, isDark } = useTheme();
  const [activeSection, setActiveSection] = React.useState<string | null>(null);

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
          <View style={[styles.drawerHeader, { borderBottomColor: themeColors.border }]}>
            <Image source={require('../assets/images/logo.png')} style={styles.drawerLogo} resizeMode="contain" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.drawerTitle, { color: isDark ? themeColors.text : '#111827' }]}>{brand.toUpperCase()}</Text>
              <Text style={[styles.drawerSub, { color: themeColors.primary }]}>{subtitle}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="x" size={20} color={isDark ? themeColors.text : '#111827'} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
            {sections.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
                <TouchableOpacity
                  style={[styles.catChip, { backgroundColor: themeColors.primary + '14', borderColor: themeColors.primary }]}
                  onPress={() => setActiveSection(null)}
                >
                  <Text style={[styles.catChipText, { color: themeColors.primary }]}>All</Text>
                </TouchableOpacity>
                {sections.map((s) => (
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
                      {s.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {sections.filter((s) => !activeSection || s.title === activeSection).map((section) => (
              <View key={section.title} style={styles.navSection}>
                <Text style={[styles.navSectionTitle, { color: themeColors.textLight }]}>{section.title}</Text>
                {section.items.map((item) => (
                  <TouchableOpacity
                    key={item.label}
                    style={[styles.navItem, { borderBottomColor: themeColors.border }]}
                    onPress={() => navigate(item.route)}
                    activeOpacity={0.7}
                  >
                    <Icon name={item.icon} size={18} color={themeColors.textMid || themeColors.textLight} />
                    <Text style={[styles.navItemText, { color: isDark ? themeColors.text : '#1F2937' }]}>{item.label}</Text>
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

// ── Admin panel nav — mirrors website AdminLayout sidebar ──
export const ADMIN_NAV_SECTIONS: PanelNavSection[] = [
  {
    title: 'OPERATIONS',
    items: [
      { label: 'Dashboard', icon: 'grid', route: '/(app)/admin-dashboard' },
      { label: 'Applications', icon: 'document-text', route: '/(app)/applications' },
      { label: 'Customers / Leads', icon: 'people', route: '/(app)/leads' },
      { label: 'Messenger', icon: 'chatbubbles', route: '/(app)/messenger' },
    ],
  },
  {
    title: 'MANAGEMENT',
    items: [
      { label: 'Partners', icon: 'handshake', route: '/(app)/admin-partners' },
      { label: 'Wallet & Payouts', icon: 'wallet', route: '/(app)/admin-withdrawals' },
      { label: 'Commissions', icon: 'cash', route: '/(app)/manage-commissions' },
      { label: 'Products', icon: 'grid', route: '/(app)/product-management' },
      { label: 'Product Links', icon: 'link', route: '/(app)/product-links' },
      { label: 'Designation Rules', icon: 'shield', route: '/(app)/admin-designation-rules' },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { label: 'Reports', icon: 'stats-chart', route: '/(app)/reports' },
      { label: 'Support', icon: 'help-buoy', route: '/(app)/support' },
      { label: 'Settings', icon: 'settings', route: '/(app)/settings' },
      { label: 'Profile', icon: 'person-circle', route: '/(app)/profile' },
    ],
  },
];

// ── Operator designation nav — mirrors website AdminLayout for queue roles ──
// KYC / QD / Remark / PAN Checker / Final Status / Querable / Curable / Sales Exec /
// Telecaller / Administrative Operator: the website collapses their sidebar to
// Applications (their queue) + Messenger + a few system links.
export const OPERATOR_NAV_SECTIONS: PanelNavSection[] = [
  {
    title: 'MY QUEUE',
    items: [
      { label: 'Applications', icon: 'document-text', route: '/(app)/applications' },
      { label: 'Messenger', icon: 'chatbubbles', route: '/(app)/messenger' },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { label: 'Support', icon: 'help-buoy', route: '/(app)/support' },
      { label: 'Settings', icon: 'settings', route: '/(app)/settings' },
      { label: 'Profile', icon: 'person-circle', route: '/(app)/profile' },
    ],
  },
];

// Designations that get the reduced operator drawer instead of the full admin nav.
// Mirrors the website AdminLayout role checks (operators lose Dashboard, Credit
// Cards, Loans, Insurance, Customers, Banks, Products, Wallet, Commissions).
const OPERATOR_DESIGNATION_RE = /OPERATOR|CURABLE|CHECKER|TELECALLER|SALES\s*EXECUTIVE|EXECUTIVE/i;
const FULL_NAV_DESIGNATION_RE = /HEAD|MANAGER|LEADER|DIRECTOR|ADMIN/i;

export function isOperatorDesignation(designation?: string | null, role?: string | null): boolean {
  if ((role || '').toUpperCase() === 'HR' || (role || '').toUpperCase() === 'SUPER_ADMIN') return false;
  const d = String(designation || '').toUpperCase().replace(/[_-]+/g, ' ').trim();
  if (!d) return false;
  if (FULL_NAV_DESIGNATION_RE.test(d)) return false;
  return OPERATOR_DESIGNATION_RE.test(d);
}

// ── HR panel nav — mirrors website HR view of AdminLayout ──
export const HR_NAV_SECTIONS: PanelNavSection[] = [
  {
    title: 'HR OPERATIONS',
    items: [
      { label: 'HR Dashboard & Candidates', icon: 'grid', route: '/(app)/hr-dashboard' },
      { label: 'Candidates', icon: 'id-card', route: '/(app)/hr-candidates' },
      { label: 'Payroll', icon: 'cash', route: '/(app)/hr-payroll' },
      { label: 'Applications', icon: 'document-text', route: '/(app)/applications' },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { label: 'Messenger', icon: 'chatbubbles', route: '/(app)/messenger' },
      { label: 'Support', icon: 'help-buoy', route: '/(app)/support' },
      { label: 'Settings', icon: 'settings', route: '/(app)/settings' },
      { label: 'Profile', icon: 'person-circle', route: '/(app)/profile' },
    ],
  },
];

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
