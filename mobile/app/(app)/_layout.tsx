import React, { useState, useEffect } from 'react';
import { Tabs, Redirect, useRouter, usePathname, useGlobalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View, StyleSheet, AppState, Modal, TouchableOpacity, ScrollView, Image, BackHandler } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { LoadingState } from '../../components/LoadingState';
import { MinimalDock } from '../../components/MinimalDock';
import { PartnerDock } from '../../components/PartnerDock';
import { PartnerTopBar } from '../../components/PartnerTopBar';
import { EmployeeTopBar } from '../../components/EmployeeTopBar';
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
  const { isAuthenticated, isLoading, userRole, userDesignation, user } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const routeParams = useGlobalSearchParams<{ category?: string }>();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [partnerMenuOpen, setPartnerMenuOpen] = useState(false);
  const [employeeMenuOpen, setEmployeeMenuOpen] = useState(false);

  useEffect(() => {
    if (!partnerMenuOpen) return;
    const backAction = () => {
      setPartnerMenuOpen(false);
      return true;
    };
    const handler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => handler.remove();
  }, [partnerMenuOpen]);

  useEffect(() => {
    if (!employeeMenuOpen) return;
    const backAction = () => {
      setEmployeeMenuOpen(false);
      return true;
    };
    const handler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => handler.remove();
  }, [employeeMenuOpen]);

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
    // Website PartnerLogin routes TEAM_MEMBER to /partner/dashboard
    if (role === 'TEAM_MEMBER') return '/partner-dashboard';
    if (role === 'PARTNER') return '/partner-dashboard';
    return '/dashboard';
  })();

  // Admin-side roles never land on the generic partner workspace dashboard
  if (pathname === '/dashboard' && ['SUPER_ADMIN', 'ADMIN', 'HR'].includes(role)) {
    return <Redirect href={roleHome as any} />;
  }

  // Website PartnerLayout blocks TEAM_MEMBER from Manage Team and Reports
  if (role === 'TEAM_MEMBER' && (pathname === '/team' || pathname === '/reports' || pathname.startsWith('/team/') || pathname.startsWith('/reports/'))) {
    return <Redirect href={'/partner-dashboard' as any} />;
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
        // Same floating dock style as the partner panel — Dashboard · Applications · [+ Attendance] · Chat · More
        return [
          dockItem('panel', 'Dashboard', 'home', roleHome, hasDesignation ? '/dashboard' : '/employee-dashboard'),
          dockItem('apps', 'Applications', 'document-text', '/(app)/applications', '/applications'),
          {
            id: 'attendance',
            label: 'Attendance',
            icon: 'flash',
            active: pathname.includes('/attendance'),
            isCenter: true,
            onPress: () => router.push('/(app)/attendance' as any),
          },
          chatItem,
          {
            id: 'menu',
            label: 'More',
            icon: 'menu',
            active: false,
            onPress: () => setEmployeeMenuOpen(true),
          },
        ];
      // TEAM_MEMBER uses the same partner dock as PARTNER (website parity)
      default: // PARTNER, TEAM_MEMBER & others — custom dock: Dashboard, Applications, +Add Lead, Chat, More
        return [
          dockItem('panel', 'Dashboard', 'home', '/(app)/partner-dashboard', '/partner-dashboard'),
          dockItem('apps', 'Applications', 'document-text', '/(app)/applications', '/applications'),
          {
            id: 'add',
            label: 'Add Lead',
            icon: 'add',
            active: false,
            isCenter: true,
            onPress: () => router.push('/(app)/add-lead' as any),
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

  // Bottom clearance so the floating dock never covers screen content
  const dockClearance = insets.bottom + 104;
  const showPartnerNav = role === 'PARTNER' || role === 'TEAM_MEMBER';
  const showEmployeeNav = role === 'EMPLOYEE';

  // Employee approval state + manager/TL — mirrors website EmployeeLayout
  const empUser = user as any;
  const empStatus = (empUser?.employee_status || empUser?.activation_status || user?.status || '').toUpperCase();
  const empApproved = !empStatus || empStatus === 'APPROVED' || empStatus === 'ACTIVE';
  const isManagerOrTL = ['Manager', 'Team Leader'].includes(userDesignation) || ['ADMIN', 'SUPER_ADMIN'].includes(role);

  // Employee sidebar — mirrors the website EmployeeLayout navItems exactly
  const employeeSidebarItems: { id: string; label: string; icon: keyof typeof Ionicons.glyphMap; route: string; match: string }[] = empApproved ? [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid', route: roleHome, match: hasDesignation ? '/dashboard' : '/employee-dashboard' },
    { id: 'attendance', label: 'My Attendance', icon: 'calendar', route: '/(app)/attendance', match: '/attendance' },
    { id: 'credit-cards', label: 'Credit Cards', icon: 'card', route: '/(app)/employee-credit-cards', match: '/employee-credit-cards' },
    { id: 'loan-on-card', label: 'Loan on Credit Card', icon: 'cash', route: '/(app)/employee-loan-on-card', match: '/employee-loan-on-card' },
    { id: 'smart-emi', label: 'Smart EMI on Credit Card', icon: 'phone-portrait', route: '/(app)/employee-smart-emi', match: '/employee-smart-emi' },
    { id: 'loans', label: 'Loans', icon: 'business', route: '/(app)/employee-loans', match: '/employee-loans' },
    { id: 'insurance', label: 'Insurance', icon: 'shield', route: '/(app)/employee-insurance', match: '/employee-insurance' },
    { id: 'sales-reports', label: 'Sales Reports', icon: 'document-text', route: '/(app)/employee-sales-report', match: '/employee-sales-report' },
    { id: 'applications', label: 'My Applications', icon: 'albums', route: '/(app)/applications', match: '/applications' },
    { id: 'messenger', label: 'Messenger', icon: 'chatbubble', route: '/(app)/messenger', match: '/messenger' },
    { id: 'contests', label: 'Contests', icon: 'trophy', route: '/(app)/employee-contests', match: '/employee-contests' },
    { id: 'incentives', label: 'My Incentives', icon: 'gift', route: '/(app)/employee-incentives', match: '/employee-incentives' },
    { id: 'salary', label: 'My Salary', icon: 'cash', route: '/(app)/employee-payroll?tab=salary', match: '/employee-payroll' },
    { id: 'payslip', label: 'Payslip', icon: 'receipt', route: '/(app)/employee-payroll?tab=payslips', match: '/employee-payroll' },
    { id: 'documents', label: 'Documents & Reports', icon: 'folder', route: '/(app)/employee-payroll?tab=documents', match: '/employee-payroll' },
    ...(isManagerOrTL ? [{ id: 'team', label: 'My Team Architecture', icon: 'people' as const, route: '/(app)/employee-team', match: '/employee-team' }] : []),
    { id: 'settings', label: 'Settings & Preferences', icon: 'settings', route: '/(app)/employee-settings', match: '/employee-settings' },
  ] : [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid', route: roleHome, match: hasDesignation ? '/dashboard' : '/employee-dashboard' },
    { id: 'onboarding', label: 'Employee Onboarding & KYC', icon: 'checkmark-circle', route: '/(app)/employee-onboarding', match: '/employee-onboarding' },
    { id: 'profile', label: 'Employee Profile', icon: 'person', route: '/(app)/employee-profile', match: '/profile' },
    { id: 'settings', label: 'Settings & Preferences', icon: 'settings', route: '/(app)/employee-settings', match: '/employee-settings' },
  ];

  return (
    <View style={{ flex: 1, paddingBottom: dockClearance }}>
      {/* Partner navbar — shown on every partner panel page */}
      {showPartnerNav && (
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <PartnerTopBar />
        </View>
      )}
      {/* Employee navbar — shown on every employee panel page */}
      {showEmployeeNav && (
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <EmployeeTopBar onMenuPress={() => setEmployeeMenuOpen(true)} unreadCount={unreadCount} isManager={isManagerOrTL} />
        </View>
      )}
      <Tabs
        backBehavior="history"
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
      <Tabs.Screen name="support" />
      <Tabs.Screen name="settings" />
      <Tabs.Screen name="notifications" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="application-details" />
      <Tabs.Screen name="leads" />
      <Tabs.Screen name="lead-details" />
      <Tabs.Screen name="customer-details" />
      <Tabs.Screen name="op-queue" />
      <Tabs.Screen name="partner-dashboard" />
      <Tabs.Screen name="team-dashboard" />
      <Tabs.Screen name="add-lead" />
      <Tabs.Screen name="products" />
      <Tabs.Screen name="team" />
      <Tabs.Screen name="wallet" />
      <Tabs.Screen name="finance-buddy" />
      <Tabs.Screen name="whatsapp" />
      <Tabs.Screen name="reports" />
      <Tabs.Screen name="travel-utilities" />
      <Tabs.Screen name="partner-kyc" />
      <Tabs.Screen name="marketing" />
      <Tabs.Screen name="training" />
      <Tabs.Screen name="vault" />
      <Tabs.Screen name="share-tracking" />
      <Tabs.Screen name="super-admin" />
      <Tabs.Screen name="employee-team" />
      <Tabs.Screen name="employee-referrals" />
      <Tabs.Screen name="employee-incentives" />
      <Tabs.Screen name="employee-sales-report" />
      <Tabs.Screen name="employee-onboarding" />
      <Tabs.Screen name="hr-dashboard" />
      <Tabs.Screen name="hr-payroll" />
      <Tabs.Screen name="admin-designation-rules" />
      <Tabs.Screen name="security" />
      <Tabs.Screen name="work" />
      <Tabs.Screen name="attendance" />
      
      {/* Missing High-Priority Screens from Audit */}
      <Tabs.Screen name="category-overview" />
      <Tabs.Screen name="product-management" />
      <Tabs.Screen name="product-links" />
      <Tabs.Screen name="admin-partners" />
      <Tabs.Screen name="admin-withdrawals" />
      <Tabs.Screen name="admin-dashboard" />
      <Tabs.Screen name="view-messages" />
      <Tabs.Screen name="referral-analytics" />
      <Tabs.Screen name="bulk-sms-dashboard" />
      <Tabs.Screen name="manage-commissions" />
      <Tabs.Screen name="commission-rules" />
      <Tabs.Screen name="hr-candidates" />
      <Tabs.Screen name="partner-referrals" />
      <Tabs.Screen name="employee-credit-cards" />
      <Tabs.Screen name="employee-loans" />
      <Tabs.Screen name="employee-insurance" />
      <Tabs.Screen name="employee-loan-on-card" />
      <Tabs.Screen name="employee-smart-emi" />
      <Tabs.Screen name="card-comparison" />
      <Tabs.Screen name="eligibility-checker" />
      <Tabs.Screen name="employee-contests" />
      <Tabs.Screen name="employee-dashboard" />
      <Tabs.Screen name="employee-settings" />
      <Tabs.Screen name="employee-profile" />
      <Tabs.Screen name="employee-payroll" />
      <Tabs.Screen name="loan-calculator" />
      <Tabs.Screen name="partner-settings" />
      </Tabs>
      {['SUPER_ADMIN', 'ADMIN', 'HR'].includes(role) ? (
        <MinimalDock items={dockItems} />
      ) : (
        <PartnerDock items={dockItems as any} />
      )}

      {/* Partner feature sidebar — hamburger menu, labels only */}
      {partnerMenuOpen && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 10000 }]}>
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
                {PARTNER_SIDEBAR_ITEMS.filter((item) => !(role === 'TEAM_MEMBER' && ['team', 'reports'].includes(item.id))).map((item) => {
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
                        router.push(item.route as any);
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
        </View>
      )}

      {/* Employee feature sidebar — mirrors the website EmployeeLayout nav */}
      {employeeMenuOpen && showEmployeeNav && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 10000 }]}>
          <View style={sidebarStyles.overlay}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setEmployeeMenuOpen(false)} />
            <View style={[sidebarStyles.drawer, { backgroundColor: isDark ? colors.card : '#FFFFFF', borderColor: colors.border }]}>
              <View style={[sidebarStyles.drawerHeader, { borderBottomColor: colors.border }]}>
                <Image source={require('../../assets/images/logo.png')} style={sidebarStyles.drawerLogo} resizeMode="contain" />
                <View style={{ flex: 1 }}>
                  <Text style={[sidebarStyles.drawerTitle, { color: isDark ? colors.text : '#111827' }]}>GharKaPaisa</Text>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textLight, textTransform: 'uppercase', letterSpacing: 0.5 }}>Employee Portal</Text>
                </View>
                <TouchableOpacity onPress={() => setEmployeeMenuOpen(false)} style={sidebarStyles.closeBtn}>
                  <Ionicons name="close" size={22} color={isDark ? colors.text : '#111827'} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                {employeeSidebarItems.map((item) => {
                  const isActive = pathname === item.match || pathname.startsWith(item.match + '/');
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[sidebarStyles.item, isActive && { backgroundColor: colors.primary + '12' }]}
                      onPress={() => {
                        setEmployeeMenuOpen(false);
                        router.push(item.route as any);
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
        </View>
      )}
    </View>
  );
}

// Partner sidebar — mirrors the website PartnerLayout sidebar exactly
const PARTNER_SIDEBAR_ITEMS: { id: string; label: string; icon: keyof typeof Ionicons.glyphMap; route: string; match: string }[] = [
  { id: 'panel', label: 'Dashboard', icon: 'home', route: '/(app)/partner-dashboard', match: '/partner-dashboard' },
  { id: 'credit-cards', label: 'Credit Cards', icon: 'card', route: '/(app)/products?category=credit_card', match: '/products' },
  { id: 'loan-on-card', label: 'Loan on Credit Card', icon: 'cash', route: '/(app)/products?category=loan_on_credit_card', match: '/products' },
  { id: 'smart-emi', label: 'Smart EMI', icon: 'phone-portrait', route: '/(app)/products?category=smart_emi', match: '/products' },
  { id: 'loans', label: 'Loans', icon: 'business', route: '/(app)/products?category=loans', match: '/products' },
  { id: 'insurance', label: 'Insurance', icon: 'shield', route: '/(app)/products?category=insurance', match: '/products' },
  { id: 'applications', label: 'Applications', icon: 'document-text', route: '/(app)/applications', match: '/applications' },
  { id: 'customers', label: 'Customers', icon: 'people', route: '/(app)/customers', match: '/customers' },
  { id: 'team', label: 'Manage Team', icon: 'people-circle', route: '/(app)/team', match: '/team' },
  { id: 'reports', label: 'Reports', icon: 'stats-chart', route: '/(app)/reports', match: '/reports' },
  { id: 'messenger', label: 'Messenger', icon: 'chatbubble', route: '/(app)/messenger', match: '/messenger' },
  { id: 'support', label: 'Support', icon: 'headset', route: '/(app)/support', match: '/support' },
  { id: 'settings', label: 'Settings', icon: 'settings', route: '/(app)/settings', match: '/settings' },
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
