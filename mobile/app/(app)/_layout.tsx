import React, { useState, useEffect } from 'react';
import { Tabs, Redirect, useRouter, usePathname, useGlobalSearchParams } from 'expo-router';
import { Text, View, StyleSheet, AppState, Modal, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { LoadingState } from '../../components/LoadingState';
import { MinimalDock } from '../../components/MinimalDock';
import { PartnerDock } from '../../components/PartnerDock';
import { typography } from '../../theme/typography';
import { getUnreadCount } from '../../services/messenger.service';
import { getMessengerSocket } from '../../services/messengerSocket';

const TabIcon = ({ label, focused, badgeCount }: { label: string; focused: boolean; badgeCount?: number }) => {
  const getIconName = (): keyof typeof Ionicons.glyphMap => {
    switch (label) {
      case 'Dashboard': return 'home';
      case 'Applications': return 'document-text';
      case 'Customers': return 'people';
      case 'Messenger': return 'chatbubble';
      case 'More': return 'menu';
      default: return 'phone-portrait';
    }
  };

  return (
    <View style={styles.tabItem}>
      <Ionicons name={getIconName()} size={20} color={focused ? '#0D5CAB' : '#64748B'} />
      {label === 'Messenger' && badgeCount !== undefined && badgeCount > 0 && (
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Text>
        </View>
      )}
    </View>
  );
};

export default function AppLayout() {
  const { isAuthenticated, isLoading, userRole, userDesignation } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const routeParams = useGlobalSearchParams<{ category?: string }>();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [partnerMenuOpen, setPartnerMenuOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    let isMounted = true;
    let socketInstance: any = null;

    const fetchUnread = async () => {
      const count = await getUnreadCount();
      if (isMounted) {
        setUnreadCount(count);
      }
    };

    // Initial fetch
    fetchUnread();

    // Subscribe to Socket.IO real-time updates (no polling loop)
    const initSocketListener = async () => {
      const socket = await getMessengerSocket();
      if (!socket || !isMounted) return;
      socketInstance = socket;

      const handleRealtimeUpdate = () => {
        fetchUnread();
      };

      socket.on('message:new', handleRealtimeUpdate);
      socket.on('message:read', handleRealtimeUpdate);
      socket.on('conversation:update', handleRealtimeUpdate);
      socket.on('connect', handleRealtimeUpdate);

      const appStateSub = AppState.addEventListener('change', (nextState) => {
        if (nextState === 'active') {
          fetchUnread();
          if (!socket.connected) {
            socket.connect();
          }
        }
      });

      return () => {
        appStateSub.remove();
        socket.off('message:new', handleRealtimeUpdate);
        socket.off('message:read', handleRealtimeUpdate);
        socket.off('conversation:update', handleRealtimeUpdate);
        socket.off('connect', handleRealtimeUpdate);
      };
    };

    let cleanupFn: (() => void) | undefined;
    initSocketListener().then((cleanup) => {
      cleanupFn = cleanup;
    });

    return () => {
      isMounted = false;
      if (cleanupFn) cleanupFn();
    };
  }, [isAuthenticated]);

  if (isLoading) {
    return <LoadingState message="Loading authenticated workspace..." />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  const pathname = usePathname();

  // ── Role-based panel routing (mirrors the website's per-role layouts) ──
  const role = (userRole || '').toUpperCase();
  const hasDesignation = !!userDesignation;

  const roleHome = (() => {
    if (role === 'SUPER_ADMIN') return '/super-admin';
    if (role === 'ADMIN') return '/admin-dashboard';
    if (role === 'HR') return '/hr-dashboard';
    if (role === 'EMPLOYEE') return hasDesignation ? '/dashboard' : '/employee-dashboard';
    if (role === 'TEAM_MEMBER') return '/team-dashboard';
    if (role === 'PARTNER') return '/partner-dashboard';
    return '/dashboard';
  })();

  // Admin-side roles never land on the generic partner workspace dashboard
  if (pathname === '/dashboard' && ['SUPER_ADMIN', 'ADMIN', 'HR'].includes(role)) {
    return <Redirect href={roleHome as any} />;
  }

  const dockItem = (id: string, label: string, icon: string, route: string, match?: string, badgeCount?: number) => ({
    id,
    label,
    icon,
    badgeCount,
    active: pathname.includes(match || route),
    onPress: () => router.navigate(route as any),
  });

  const chatItem = dockItem('chat', 'Chat', 'chatbubble', '/messenger', '/messenger', unreadCount);
  const moreItem = dockItem('more', 'More', 'menu', '/more', '/more');

  // Each role gets its own panel shortcuts — not one shared feature set
  const dockItems = (() => {
    switch (role) {
      case 'SUPER_ADMIN':
        return [
          dockItem('panel', 'Panel', 'home', '/super-admin', '/super-admin'),
          dockItem('staff', 'Staff', 'people', '/super-admin/employees', '/employees'),
          dockItem('apps', 'Apps', 'document-text', '/super-admin/applications', '/applications'),
          chatItem,
          moreItem,
        ];
      case 'ADMIN':
        return [
          dockItem('panel', 'Panel', 'home', '/admin-dashboard', '/admin-dashboard'),
          dockItem('partners', 'Partners', 'people', '/admin-partners', '/admin-partners'),
          dockItem('queue', 'Queue', 'briefcase', '/op-queue', '/op-queue'),
          chatItem,
          moreItem,
        ];
      case 'HR':
        return [
          dockItem('panel', 'Panel', 'home', '/hr-dashboard', '/hr-dashboard'),
          dockItem('candidates', 'Candidates', 'id-card', '/hr-candidates', '/hr-candidates'),
          dockItem('apps', 'Apps', 'document-text', '/applications', '/applications'),
          chatItem,
          moreItem,
        ];
      case 'EMPLOYEE':
        return [
          dockItem('panel', 'Panel', 'home', roleHome, hasDesignation ? '/dashboard' : '/employee-dashboard'),
          dockItem('attendance', 'Attendance', 'location', '/attendance', '/attendance'),
          dockItem('apps', 'Apps', 'document-text', '/applications', '/applications'),
          chatItem,
          moreItem,
        ];
      case 'TEAM_MEMBER':
        return [
          dockItem('panel', 'Panel', 'home', '/team-dashboard', '/team-dashboard'),
          dockItem('wallet', 'Wallet', 'wallet', '/wallet', '/wallet'),
          dockItem('apps', 'Apps', 'document-text', '/applications', '/applications'),
          chatItem,
          moreItem,
        ];
      default: // PARTNER & others — custom dock: Dashboard, Applications, +Add Lead, Chat, More
        return [
          dockItem('panel', 'Dashboard', 'home', '/partner-dashboard', '/partner-dashboard'),
          dockItem('apps', 'Applications', 'document-text', '/applications', '/applications'),
          {
            id: 'add',
            label: 'Add Lead',
            icon: 'add',
            active: false,
            isCenter: true,
            onPress: () => router.push('/add-lead' as any),
          },
          chatItem,
          {
            id: 'menu',
            label: 'More',
            icon: 'menu',
            active: false,
            onPress: () => setPartnerMenuOpen(true),
          },
        ];
    }
  })();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      >
      {/* 1. Dashboard */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => <TabIcon label="Dashboard" focused={focused} />,
        }}
      />

      {/* 2. Applications */}
      <Tabs.Screen
        name="applications"
        options={{
          title: 'Applications',
          tabBarIcon: ({ focused }) => <TabIcon label="Applications" focused={focused} />,
        }}
      />

      {/* 3. Customers */}
      <Tabs.Screen
        name="customers"
        options={{
          title: 'Customers',
          tabBarIcon: ({ focused }) => <TabIcon label="Customers" focused={focused} />,
        }}
      />

      {/* 4. Messenger with Real Unread Badge */}
      <Tabs.Screen
        name="messenger"
        options={{
          title: 'Messenger',
          tabBarIcon: ({ focused }) => <TabIcon label="Messenger" focused={focused} badgeCount={unreadCount} />,
        }}
      />

      {/* 5. More (Priority List) */}
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ focused }) => <TabIcon label="More" focused={focused} />,
        }}
      />

      {/* Hidden Auxiliary Screens */}
      <Tabs.Screen name="support" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="application-details" options={{ href: null }} />
      <Tabs.Screen name="leads" options={{ href: null }} />
      <Tabs.Screen name="lead-details" options={{ href: null }} />
      <Tabs.Screen name="customer-details" options={{ href: null }} />
      <Tabs.Screen name="op-queue" options={{ href: null }} />
      <Tabs.Screen name="partner-dashboard" options={{ href: null }} />
      <Tabs.Screen name="team-dashboard" options={{ href: null }} />
      <Tabs.Screen name="add-lead" options={{ href: null }} />
      <Tabs.Screen name="products" options={{ href: null }} />
      <Tabs.Screen name="team" options={{ href: null }} />
      <Tabs.Screen name="wallet" options={{ href: null }} />
      <Tabs.Screen name="finance-buddy" options={{ href: null }} />
      <Tabs.Screen name="whatsapp" options={{ href: null }} />
      <Tabs.Screen name="reports" options={{ href: null }} />
      <Tabs.Screen name="travel-utilities" options={{ href: null }} />
      <Tabs.Screen name="partner-kyc" options={{ href: null }} />
      <Tabs.Screen name="marketing" options={{ href: null }} />
      <Tabs.Screen name="training" options={{ href: null }} />
      <Tabs.Screen name="vault" options={{ href: null }} />
      <Tabs.Screen name="share-tracking" options={{ href: null }} />
      <Tabs.Screen name="super-admin" options={{ href: null }} />
      <Tabs.Screen name="employee-team" options={{ href: null }} />
      <Tabs.Screen name="employee-referrals" options={{ href: null }} />
      <Tabs.Screen name="employee-incentives" options={{ href: null }} />
      <Tabs.Screen name="employee-sales-report" options={{ href: null }} />
      <Tabs.Screen name="employee-onboarding" options={{ href: null }} />
      <Tabs.Screen name="hr-dashboard" options={{ href: null }} />
      <Tabs.Screen name="security" options={{ href: null }} />
      <Tabs.Screen name="work" options={{ href: null }} />
      <Tabs.Screen name="attendance" options={{ href: null }} />
      
      {/* Missing High-Priority Screens from Audit */}
      <Tabs.Screen name="category-overview" options={{ href: null }} />
      <Tabs.Screen name="product-management" options={{ href: null }} />
      <Tabs.Screen name="product-links" options={{ href: null }} />
      <Tabs.Screen name="admin-partners" options={{ href: null }} />
      <Tabs.Screen name="admin-withdrawals" options={{ href: null }} />
      <Tabs.Screen name="admin-dashboard" options={{ href: null }} />
      <Tabs.Screen name="view-messages" options={{ href: null }} />
      <Tabs.Screen name="referral-analytics" options={{ href: null }} />
      <Tabs.Screen name="bulk-sms-dashboard" options={{ href: null }} />
      <Tabs.Screen name="manage-commissions" options={{ href: null }} />
      <Tabs.Screen name="commission-rules" options={{ href: null }} />
      <Tabs.Screen name="hr-candidates" options={{ href: null }} />
      <Tabs.Screen name="partner-referrals" options={{ href: null }} />
      <Tabs.Screen name="employee-credit-cards" options={{ href: null }} />
      <Tabs.Screen name="employee-loan-on-card" options={{ href: null }} />
      <Tabs.Screen name="employee-smart-emi" options={{ href: null }} />
      </Tabs>
      {role === 'PARTNER' || !['SUPER_ADMIN', 'ADMIN', 'HR', 'EMPLOYEE', 'TEAM_MEMBER'].includes(role) ? (
        <PartnerDock items={dockItems as any} />
      ) : (
        <MinimalDock items={dockItems} />
      )}

      {/* Partner feature sidebar — hamburger menu, labels only */}
      <Modal visible={partnerMenuOpen} transparent animationType="slide" onRequestClose={() => setPartnerMenuOpen(false)}>
        <View style={sidebarStyles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setPartnerMenuOpen(false)} />
          <View style={[sidebarStyles.drawer, { backgroundColor: isDark ? colors.card : '#FFFFFF', borderColor: colors.border }]}>
            <View style={[sidebarStyles.drawerHeader, { borderBottomColor: colors.border }]}>
              <Image source={require('../../assets/images/logo.png')} style={sidebarStyles.drawerLogo} resizeMode="contain" />
              <Text style={[sidebarStyles.drawerTitle, { color: isDark ? colors.text : '#111827' }]}>GharKaPaisa</Text>
              <TouchableOpacity onPress={() => setPartnerMenuOpen(false)} style={sidebarStyles.closeBtn}>
                <Ionicons name="close" size={22} color={isDark ? colors.text : '#111827'} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              {PARTNER_SIDEBAR_ITEMS.map((item) => {
                const itemCategory = item.route.includes('category=')
                  ? item.route.split('category=')[1]
                  : null;
                const isActive = itemCategory
                  ? pathname.includes('/products') && routeParams.category === itemCategory
                  : pathname.includes(item.match);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[sidebarStyles.item, isActive && { backgroundColor: colors.primary + '12' }]}
                    onPress={() => {
                      setPartnerMenuOpen(false);
                      // Navigate after the drawer finishes dismissing
                      setTimeout(() => router.push(item.route as any), 300);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={item.icon} size={20} color={isActive ? colors.primary : (colors.textMid || colors.textLight)} />
                    <Text style={[sidebarStyles.itemLabel, { color: isActive ? colors.primary : (isDark ? colors.text : '#374151') }]}>
                      {item.label}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Partner sidebar — mirrors the website PartnerLayout sidebar exactly
const PARTNER_SIDEBAR_ITEMS: { id: string; label: string; icon: keyof typeof Ionicons.glyphMap; route: string; match: string }[] = [
  { id: 'panel', label: 'Dashboard', icon: 'home', route: '/partner-dashboard', match: '/partner-dashboard' },
  { id: 'credit-cards', label: 'Credit Cards', icon: 'card', route: '/(app)/products?category=credit_card', match: '/products' },
  { id: 'loan-on-card', label: 'Loan on Credit Card', icon: 'cash', route: '/(app)/products?category=loan_on_credit_card', match: '/products' },
  { id: 'smart-emi', label: 'Smart EMI', icon: 'phone-portrait', route: '/(app)/products?category=smart_emi', match: '/products' },
  { id: 'loans', label: 'Loans', icon: 'business', route: '/(app)/products?category=loans', match: '/products' },
  { id: 'insurance', label: 'Insurance', icon: 'shield', route: '/(app)/products?category=insurance', match: '/products' },
  { id: 'applications', label: 'Applications', icon: 'document-text', route: '/applications', match: '/applications' },
  { id: 'customers', label: 'Customers', icon: 'people', route: '/customers', match: '/customers' },
  { id: 'team', label: 'Manage Team', icon: 'people-circle', route: '/team', match: '/team' },
  { id: 'reports', label: 'Reports', icon: 'stats-chart', route: '/reports', match: '/reports' },
  { id: 'messenger', label: 'Messenger', icon: 'chatbubble', route: '/messenger', match: '/messenger' },
  { id: 'support', label: 'Support', icon: 'headset', route: '/support', match: '/support' },
  { id: 'settings', label: 'Settings', icon: 'settings', route: '/settings', match: '/settings' },
];

const sidebarStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  drawer: {
    width: '78%',
    maxWidth: 320,
    height: '100%',
    borderRightWidth: 1,
    paddingTop: 56,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  drawerLogo: { width: 30, height: 30 },
  drawerTitle: { flex: 1, fontSize: 17, fontWeight: '800' },
  closeBtn: { padding: 4 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  itemLabel: { flex: 1, fontSize: 14.5, fontWeight: '600' },
});

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  icon: {
    fontSize: 18,
    opacity: 0.6,
  },
  iconActive: {
    opacity: 1,
  },
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
});
