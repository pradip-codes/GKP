import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Icon } from '../../components/Icon';

// Which roles may see each menu item (SUPER_ADMIN always sees everything)
const ITEM_ROLES: Record<string, string[]> = {
  // Core operations
  'op-queue': ['EMPLOYEE', 'ADMIN'],
  'leads': ['PARTNER', 'TEAM_MEMBER', 'EMPLOYEE', 'ADMIN'],
  'team': ['PARTNER', 'TEAM_MEMBER', 'ADMIN'],
  // Financials & products
  'employee-credit-cards': ['EMPLOYEE', 'ADMIN'],
  'employee-loan-on-card': ['EMPLOYEE', 'ADMIN'],
  'employee-smart-emi': ['EMPLOYEE', 'ADMIN'],
  'referrals': ['EMPLOYEE', 'ADMIN'],
  'wallet': ['PARTNER', 'TEAM_MEMBER', 'EMPLOYEE', 'ADMIN'],
  'incentives': ['EMPLOYEE', 'ADMIN'],
  'employee-incentives': ['EMPLOYEE', 'ADMIN'],
  'reports': ['EMPLOYEE', 'ADMIN'],
  'whatsapp': ['EMPLOYEE', 'ADMIN'],
  // Account & support
  'share-tracking': ['PARTNER', 'TEAM_MEMBER', 'EMPLOYEE', 'ADMIN'],
  'vault': ['PARTNER', 'TEAM_MEMBER', 'ADMIN'],
  'partner-kyc': ['PARTNER', 'TEAM_MEMBER', 'ADMIN'],
  'employee-sales-report': ['EMPLOYEE', 'ADMIN'],
  'employee-onboarding': ['EMPLOYEE', 'HR', 'ADMIN'],
  'hr-dashboard': ['HR', 'ADMIN'],
  // Role panels
  'admin-dashboard': ['ADMIN'],
  'admin-partners': ['ADMIN'],
  'admin-withdrawals': ['ADMIN'],
  'hr-candidates': ['HR', 'ADMIN'],
  'attendance': ['EMPLOYEE', 'ADMIN'],
  'employee-dashboard': ['EMPLOYEE'],
  'partner-dashboard': ['PARTNER', 'TEAM_MEMBER'],
  'team-dashboard': ['TEAM_MEMBER'],
  'super-admin-hub': ['SUPER_ADMIN'],
};

interface MenuItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  route: string;
  badge?: string;
  roles?: string[];
}

export default function MoreScreen() {
  const { userRole, userDesignation, logout } = useAuth();
  const { colors, isDark } = useTheme();

  // ── Role-based visibility (mirrors website role layouts) ──
  // SUPER_ADMIN bypasses all filters and sees everything.
  const role = (userRole || '').toUpperCase();
  const canSee = (id: string) => {
    if (role === 'SUPER_ADMIN') return true;
    const allowed = ITEM_ROLES[id];
    return !allowed || allowed.includes(role);
  };

  const coreOperations: MenuItem[] = [
    {
      id: 'op-queue',
      title: 'Operational Queue Desk',
      subtitle: 'Review & process assigned applications queue',
      icon: 'briefcase',
      route: '/(app)/op-queue'
    },
    {
      id: 'leads',
      title: 'Leads & CRM',
      subtitle: 'Manage card, loan, & insurance direct leads',
      icon: 'trending-up',
      route: '/(app)/leads'
    },
    {
      id: 'team',
      title: 'Team & Staff',
      subtitle: 'Overview of team members & active assignments',
      icon: 'people',
      route: '/(app)/employee-team'
    }
  ];

  const financialEarnings: MenuItem[] = [
    {
      id: 'products',
      title: 'Products Portfolio',
      subtitle: 'Explore credit cards, loans, insurance & bank products',
      icon: 'card',
      route: '/(app)/products'
    },
    {
      id: 'employee-credit-cards',
      title: 'Credit Cards Hub',
      subtitle: 'Bank-wise cards, reward perks & digital apply journeys',
      icon: 'card',
      route: '/(app)/employee-credit-cards'
    },
    {
      id: 'employee-loan-on-card',
      title: 'Loan on Credit Card',
      subtitle: 'Insta cash credit & jumbo pre-approved loans',
      icon: 'cash',
      route: '/(app)/employee-loan-on-card'
    },
    {
      id: 'employee-smart-emi',
      title: 'Smart EMI on Card',
      subtitle: 'Convert credit card purchases into flexible EMIs',
      icon: 'refresh',
      route: '/(app)/employee-smart-emi'
    },
    {
      id: 'referrals',
      title: 'Referral Products & Links',
      subtitle: 'Product referral links & employee commission codes',
      icon: 'link',
      route: '/(app)/employee-referrals'
    },
    {
      id: 'wallet',
      title: 'Wallet & Payouts',
      subtitle: 'View earnings balance, commissions, & settlement history',
      icon: 'wallet',
      route: '/(app)/wallet'
    },
    {
      id: 'incentives',
      title: 'Incentives & Rewards',
      subtitle: 'Personal performance target & incentive tracker',
      icon: 'gift',
      route: '/(app)/employee-incentives'
    },
    {
      id: 'reports',
      title: 'Operational Reports',
      subtitle: 'Analytical summaries & daily performance breakdown',
      icon: 'analytics',
      route: '/(app)/reports'
    },
    {
      id: 'whatsapp',
      title: 'WhatsApp Business',
      subtitle: 'Dispatch official reports & user updates via WhatsApp',
      icon: 'logo-whatsapp',
      route: '/(app)/whatsapp'
    }
  ];

  const accountSupport: MenuItem[] = [
    {
      id: 'travel-utilities',
      title: 'Travel & Utilities',
      subtitle: 'Process bill payments, recharges, tickets & earn margin',
      icon: 'flash',
      route: '/(app)/travel-utilities'
    },
    {
      id: 'marketing',
      title: 'Marketing & Creatives',
      subtitle: 'Share branded posters, story banners & WhatsApp flyers',
      icon: 'megaphone',
      route: '/(app)/marketing'
    },
    {
      id: 'training',
      title: 'Training & Learning Hub',
      subtitle: 'Product pitch walkthroughs & sales certification',
      icon: 'school',
      route: '/(app)/training'
    },
    {
      id: 'share-tracking',
      title: 'Share Link Tracking',
      subtitle: 'Live traffic clicks, conversion stats & leads',
      icon: 'trending-up',
      route: '/(app)/share-tracking'
    },
    {
      id: 'vault',
      title: 'Partner Document Vault',
      subtitle: 'Secure encrypted compliance & agreement storage',
      icon: 'archive',
      route: '/(app)/vault'
    },
    {
      id: 'partner-kyc',
      title: 'Partner KYC Centre',
      subtitle: 'Verify PAN & bank details for instant payouts',
      icon: 'shield',
      route: '/(app)/partner-kyc'
    },
    {
      id: 'employee-incentives',
      title: 'Employee Incentives',
      subtitle: 'Monthly incentive tiers, target meters & bonus ledger',
      icon: 'gift',
      route: '/(app)/employee-incentives'
    },
    {
      id: 'employee-sales-report',
      title: 'Daily Sales Report',
      subtitle: 'Submit bank-wise daily cards sold with remarks',
      icon: 'document-text',
      route: '/(app)/employee-sales-report'
    },
    {
      id: 'employee-onboarding',
      title: 'Employee Joining & KYC',
      subtitle: 'Complete onboarding form & verification tracker',
      icon: 'clipboard',
      route: '/(app)/employee-onboarding'
    },
    {
      id: 'hr-dashboard',
      title: 'HR Recruitment Desk',
      subtitle: 'Candidate interview scheduling & talent pipeline',
      icon: 'id-card',
      route: '/(app)/hr-dashboard'
    },
    {
      id: 'support',
      title: 'Support Tickets',
      subtitle: 'Connect to support desk & manage open tickets',
      icon: 'headset',
      route: '/(app)/support'
    },
    {
      id: 'settings',
      title: 'App Settings',
      subtitle: 'Customize notification preferences & theme',
      icon: 'settings',
      route: '/(app)/settings'
    },
    {
      id: 'profile',
      title: 'User Profile',
      subtitle: 'View personal details & designation info',
      icon: 'person',
      route: '/(app)/profile'
    },
    {
      id: 'security',
      title: 'Security & Password',
      subtitle: 'Manage password, PIN & account security',
      icon: 'lock',
      route: '/(app)/security'
    }
  ];

  // Role-specific panel shortcuts — each role sees only its own dashboards
  const panelLinks: MenuItem[] = [
    {
      id: 'super-admin-hub',
      title: 'Super Admin Control Center',
      subtitle: 'Master control center for all platform operations',
      icon: 'star',
      route: '/(app)/super-admin'
    },
    {
      id: 'admin-dashboard',
      title: 'Admin Dashboard',
      subtitle: 'Partner, KYC & withdrawal overview',
      icon: 'shield',
      route: '/(app)/admin-dashboard'
    },
    {
      id: 'admin-partners',
      title: 'Partner Management',
      subtitle: 'Review & manage partner accounts',
      icon: 'people',
      route: '/(app)/admin-partners'
    },
    {
      id: 'admin-withdrawals',
      title: 'Withdrawal Requests',
      subtitle: 'Approve or reject partner payouts',
      icon: 'cash',
      route: '/(app)/admin-withdrawals'
    },
    {
      id: 'hr-dashboard',
      title: 'HR Recruitment Desk',
      subtitle: 'Candidate interviews & talent pipeline',
      icon: 'id-card',
      route: '/(app)/hr-dashboard'
    },
    {
      id: 'hr-candidates',
      title: 'HR Candidates',
      subtitle: 'Interview, select & onboard candidates',
      icon: 'clipboard',
      route: '/(app)/hr-candidates'
    },
    {
      id: 'employee-dashboard',
      title: 'My Employee Dashboard',
      subtitle: 'Personal workspace & earnings overview',
      icon: 'person',
      route: '/(app)/employee-dashboard'
    },
    {
      id: 'partner-dashboard',
      title: 'Partner Dashboard',
      subtitle: 'Referral business & commission overview',
      icon: 'storefront',
      route: '/(app)/partner-dashboard'
    },
    {
      id: 'team-dashboard',
      title: 'Team Dashboard',
      subtitle: 'Downline team performance',
      icon: 'people',
      route: '/(app)/team-dashboard'
    },
    {
      id: 'attendance',
      title: 'My Attendance',
      subtitle: 'Check-in, tasks & daily report',
      icon: 'location',
      route: '/(app)/attendance'
    },
  ];

  const renderSection = (title: string, items: MenuItem[]) => {
    const visible = items.filter((item) => canSee(item.id));
    if (visible.length === 0) return null;
    return (
    <View style={styles.sectionContainer} key={title}>
      <Text style={[styles.sectionHeader, { color: colors.textLight }]}>{title}</Text>
      <View style={[styles.cardGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {visible.map((item, idx) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.menuRow,
              { borderBottomColor: colors.border },
              idx === visible.length - 1 && styles.noBorder,
            ]}
            onPress={() => router.push(item.route as any)}
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.bg, borderColor: colors.border }]}>
              <Icon name={item.icon} size={18} color={colors.primary} />
            </View>
            <View style={styles.menuInfo}>
              <Text style={[styles.menuTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.menuSubtitle, { color: colors.textLight }]}>{item.subtitle}</Text>
            </View>
            <Icon name="chevron-right" size={16} color={colors.textLight} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={styles.content}>
        {/* Screen Title Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Workspace Features</Text>
              <Text style={[styles.headerSubtitle, { color: colors.textLight }]}>
                Priority-ordered menu ({userRole || 'User'} {userDesignation ? `• ${userDesignation}` : ''})
              </Text>
            </View>
          </View>
        </View>

        {/* Your Role Panel */}
        {renderSection('Your Panel', panelLinks)}

        {/* Priority 1: Core Operations */}
        {renderSection('Priority 1: Core Operations', coreOperations)}

        {/* Priority 2: Financials & Products */}
        {renderSection('Priority 2: Financials & Earnings', financialEarnings)}

        {/* Priority 3: Account & Support */}
        {renderSection('Priority 3: Support & Settings', accountSupport)}

        {/* Log Out */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg
  },
  container: {
    flex: 1,
    backgroundColor: colors.bg
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl
  },
  header: {
    marginBottom: spacing.md
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text
  },
  headerSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textLight,
    marginTop: 2
  },
  sectionContainer: {
    marginBottom: spacing.md
  },
  sectionHeader: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginLeft: 4
  },
  cardGroup: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden'
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  noBorder: {
    borderBottomWidth: 0
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.border
  },
  iconText: {
    fontSize: 18
  },
  menuInfo: {
    flex: 1
  },
  menuTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text
  },
  menuSubtitle: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: 2
  },
  chevron: {
    fontSize: 20,
    color: colors.textLight,
    marginLeft: spacing.sm
  },
  logoutBtn: {
    marginTop: spacing.md,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center'
  },
  logoutText: {
    color: colors.error,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm
  }
});
