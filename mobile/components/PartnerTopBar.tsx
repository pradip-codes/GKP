import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { Icon } from './Icon';
import { fetchPartnerWallet } from '../services/partner.service';

interface PartnerTopBarProps {
  name?: string;
  code?: string;
  balance?: string;
}

/**
 * Shared partner top navbar — logo + brand left, profile menu right.
 * Used on the partner dashboard and other partner screens (e.g. Applications).
 */
export function PartnerTopBar({ name, code, balance }: PartnerTopBarProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { colors: themeColors, isDark } = useTheme();

  const [menuVisible, setMenuVisible] = useState(false);
  const [walletBalance, setWalletBalance] = useState<string | null>(balance ?? null);

  useEffect(() => {
    if (balance !== undefined) {
      setWalletBalance(balance);
      return;
    }
    fetchPartnerWallet()
      .then((res: any) => {
        const w = res?.wallet || res?.data || res || {};
        setWalletBalance(`₹${Number(w.available_balance || w.balance || 0).toLocaleString('en-IN')}`);
      })
      .catch(() => setWalletBalance('₹0'));
  }, [balance]);

  const partnerName = name || user?.full_name || user?.name || 'Partner';
  const partnerCode = code || user?.partner_code || '';

  const menuItems = [
    { icon: 'person-circle', label: 'Profile Hub', route: '/profile' },
    { icon: 'shield-checkmark', label: 'KYC Centre', route: '/partner-kyc' },
    { icon: 'megaphone', label: 'Marketing Center', route: '/marketing' },
    { icon: 'school', label: 'Training Academy', route: '/training' },
    { icon: 'wallet', label: 'Wallet', route: '/wallet' },
    { icon: 'git-branch', label: 'Refers', route: '/partner-referrals' },
    { icon: 'notifications', label: 'Notifications', route: '/notifications' },
    ...(user?.role === 'TEAM_MEMBER' ? [] : [{ icon: 'people-circle', label: 'Manage Team', route: '/team' }]),
    { icon: 'headset', label: 'Support Center', route: '/support' },
    { icon: 'settings', label: 'Settings', route: '/settings' },
  ] as { icon: string; label: string; route: string }[];

  return (
    <>
      {/* Navbar — logo left, profile menu right */}
      <View style={[styles.navbar, { backgroundColor: isDark ? themeColors.card : '#FFFFFF', borderColor: themeColors.border }]}>
        <View style={styles.navbarLeft}>
          <Image source={require('../assets/images/logo.png')} style={styles.navbarLogo} resizeMode="contain" />
          <Text style={[styles.navbarBrand, { color: isDark ? themeColors.text : '#111827' }]}>GharKaPaisa</Text>
        </View>
        <TouchableOpacity
          style={[styles.profileBtn, { backgroundColor: isDark ? themeColors.bg : '#F3F4F6' }]}
          onPress={() => setMenuVisible(true)}
          activeOpacity={0.8}
        >
          <Icon name="person" size={20} color={themeColors.primary} />
        </TouchableOpacity>
      </View>

      {/* Profile dropdown menu */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <View style={styles.menuOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setMenuVisible(false)} />
          <View style={[styles.menuCard, { backgroundColor: isDark ? themeColors.card : '#FFFFFF', borderColor: themeColors.border }]}>
            {/* Partner identity */}
            <View style={styles.menuIdentity}>
              <View style={[styles.menuAvatar, { backgroundColor: themeColors.primary + '15' }]}>
                <Icon name="person" size={22} color={themeColors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuName, { color: isDark ? themeColors.text : '#111827' }]} numberOfLines={1}>{partnerName}</Text>
                {partnerCode ? <Text style={[styles.menuCode, { color: themeColors.textLight }]}>Partner Code: {partnerCode}</Text> : null}
              </View>
            </View>

            {/* Available balance row */}
            <View style={[styles.menuBalanceRow, { backgroundColor: isDark ? themeColors.bg : '#F8FAFC', borderColor: themeColors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="wallet" size={16} color="#10B981" />
                <Text style={[styles.menuBalanceLabel, { color: themeColors.textLight }]}>Available Balance</Text>
              </View>
              <Text style={[styles.menuBalanceValue, { color: isDark ? themeColors.text : '#111827' }]}>{walletBalance ?? '—'}</Text>
            </View>

            {/* Menu items */}
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.menuItem, { borderBottomColor: themeColors.border }]}
                onPress={() => {
                  setMenuVisible(false);
                  // Navigate only after the modal finishes dismissing —
                  // pushing in the same tick gets swallowed on Android.
                  setTimeout(() => router.push(item.route as any), 300);
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
                setTimeout(async () => {
                  await logout();
                  router.replace('/(auth)/login');
                }, 300);
              }}
              activeOpacity={0.7}
            >
              <Icon name="log-out" size={18} color={themeColors.error} />
              <Text style={[styles.menuItemText, { color: themeColors.error }]}>Logout</Text>
            </TouchableOpacity>
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
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  navbarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navbarLogo: { width: 30, height: 30 },
  navbarBrand: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  profileBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  menuBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
  },
  menuBalanceLabel: { fontSize: 12 },
  menuBalanceValue: { fontSize: 15, fontWeight: '800' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  menuItemText: { flex: 1, fontSize: 14, fontWeight: '600' },
  menuLogout: { borderBottomWidth: 0, marginTop: 4 },
});
