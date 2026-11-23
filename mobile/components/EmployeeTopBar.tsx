import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, BackHandler, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../theme/spacing';
import { Icon } from './Icon';

interface EmployeeTopBarProps {
  onMenuPress: () => void;
  unreadCount?: number;
  isManager?: boolean;
}

/**
 * Shared employee top navbar — hamburger + logo left, notifications + theme + profile right.
 * Mirrors the website EmployeeLayout top navbar. Rendered once in (app)/_layout.
 */
export function EmployeeTopBar({ onMenuPress, unreadCount = 0, isManager = false }: EmployeeTopBarProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { colors: themeColors, isDark, toggleTheme } = useTheme();

  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    if (!menuVisible) return;
    const backAction = () => {
      setMenuVisible(false);
      return true;
    };
    const handler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => handler.remove();
  }, [menuVisible]);

  const empUser = user as any;
  const empName = user?.full_name || user?.name || empUser?.employee_id || 'Employee';
  const empCode = empUser?.employee_id || empUser?.emp_code || '';

  const menuItems = [
    { icon: 'person-circle', label: 'Employee Profile', route: '/(app)/employee-profile' },
    { icon: 'calendar', label: 'My Attendance', route: '/(app)/attendance' },
    { icon: 'wallet', label: 'My Salary & Payslips', route: '/(app)/employee-payroll' },
    { icon: 'folder', label: 'Documents & Reports', route: '/(app)/employee-payroll?tab=documents' },
    { icon: 'gift', label: 'My Incentives', route: '/(app)/employee-incentives' },
    { icon: 'trophy', label: 'Contests', route: '/(app)/employee-contests' },
    ...(isManager ? [{ icon: 'people', label: 'My Team', route: '/(app)/employee-team' }] : []),
    { icon: 'notifications', label: 'Notifications', route: '/(app)/notifications' },
    { icon: 'headset', label: 'Support', route: '/(app)/support' },
    { icon: 'settings', label: 'Settings', route: '/(app)/employee-settings' },
    // Website EmployeeLayout profile menu: Invite Employee / Invite Partner
    { icon: 'person-add', label: 'Invite Employee / Candidate', route: '/(app)/employee-referrals?type=employee' },
    { icon: 'handshake', label: 'Invite Partner', route: '/(app)/employee-referrals?type=partner' },
  ] as { icon: string; label: string; route: string }[];

  return (
    <>
      {/* Navbar — hamburger + brand left, notifications + theme + profile right */}
      <View style={[styles.navbar, { backgroundColor: isDark ? themeColors.card : '#FFFFFF', borderColor: themeColors.border }]}>
        <View style={styles.navbarLeft}>
          <TouchableOpacity onPress={onMenuPress} style={styles.iconBtn} activeOpacity={0.7}>
            <Icon name="menu" size={20} color={isDark ? themeColors.text : '#111827'} />
          </TouchableOpacity>
          <Image source={require('../assets/images/logo.png')} style={styles.navbarLogo} resizeMode="contain" />
          <View>
            <Text style={[styles.navbarBrand, { color: isDark ? themeColors.text : '#111827' }]}>GharKaPaisa</Text>
            <Text style={[styles.navbarSub, { color: themeColors.textLight }]}>Employee Portal</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: isDark ? themeColors.bg : '#F3F4F6' }]}
            onPress={() => router.push('/(app)/notifications' as any)}
            activeOpacity={0.8}
          >
            <Icon name="notifications" size={18} color={themeColors.primary} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
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
          <TouchableOpacity
            style={[styles.profileBtn, { backgroundColor: isDark ? themeColors.bg : '#F3F4F6' }]}
            onPress={() => setMenuVisible(true)}
            activeOpacity={0.8}
          >
            <Icon name="person" size={20} color={themeColors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Profile dropdown menu */}
      <Modal visible={menuVisible} transparent animationType="none" onRequestClose={() => setMenuVisible(false)}>
        <View style={styles.menuOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setMenuVisible(false)} />
          <View style={[styles.menuCard, { backgroundColor: isDark ? themeColors.card : '#FFFFFF', borderColor: themeColors.border }]}>
            <View style={styles.menuIdentity}>
              <View style={[styles.menuAvatar, { backgroundColor: themeColors.primary + '15' }]}>
                <Icon name="person" size={22} color={themeColors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuName, { color: isDark ? themeColors.text : '#111827' }]} numberOfLines={1}>{empName}</Text>
                {empCode ? <Text style={[styles.menuCode, { color: themeColors.textLight }]}>Emp ID: {empCode}</Text> : null}
              </View>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {menuItems.map((item) => (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.menuItem, { borderBottomColor: themeColors.border }]}
                  onPress={() => {
                    setMenuVisible(false);
                    router.push(item.route as any);
                  }}
                  activeOpacity={0.7}
                >
                  <Icon name={item.icon as any} size={18} color={themeColors.textMid || themeColors.textLight} />
                  <Text style={[styles.menuItemText, { color: isDark ? themeColors.text : '#111827' }]}>{item.label}</Text>
                  <Icon name="chevron-right" size={16} color={themeColors.textLight} />
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={[styles.menuItem, styles.menuLogout]}
                onPress={async () => {
                  setMenuVisible(false);
                  await logout();
                  router.replace('/(auth)/login');
                }}
                activeOpacity={0.7}
              >
                <Icon name="log-out" size={18} color={themeColors.error} />
                <Text style={[styles.menuItemText, { color: themeColors.error }]}>Logout</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
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
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navbarLogo: { width: 30, height: 30 },
  navbarBrand: { fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  navbarSub: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 90,
    paddingHorizontal: spacing.md,
  },
  menuCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  menuIdentity: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 12 },
  menuAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  menuName: { fontSize: 15, fontWeight: '800' },
  menuCode: { fontSize: 11, marginTop: 2 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  menuItemText: { flex: 1, fontSize: 13.5, fontWeight: '600' },
  menuLogout: { borderBottomWidth: 0, marginTop: 4 },
});
