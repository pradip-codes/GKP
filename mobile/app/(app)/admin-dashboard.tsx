import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Icon } from '../../components/Icon';
import apiClient from '../../services/api';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

// Mobile port of website AdminDashboard.jsx — "Admin Dashboard Analytics"
export default function AdminDashboardScreen() {
  const { colors: tc, isDark } = useTheme() as any;
  const router = useRouter();
  const { user } = useAuth();
  const role = (user?.role || '').toUpperCase();
  const designation = (user?.designation || '').toUpperCase();
  const isSuperAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(role);
  const isAdministrativeOperator = designation.includes('OPERATOR') || designation.includes('ADMINISTRATIVE');

  const cardBg = isDark ? '#111c35' : '#ffffff';
  const bgSecondary = isDark ? '#1a2744' : '#f1f5f9';
  const border = isDark ? '#1e2b4a' : '#e5e7eb';
  const textPrimary = isDark ? '#f1f5f9' : '#111827';
  const textMuted = isDark ? '#94a3b8' : '#6b7280';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [topPartners, setTopPartners] = useState<any[]>([]);
  const [productStats, setProductStats] = useState<any[]>([]);

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const jobs: Promise<any>[] = [apiClient.get('/reports/overview')];
      if (isSuperAdmin) {
        jobs.push(apiClient.get('/reports/top-partners', { params: { limit: 5 } }));
        jobs.push(apiClient.get('/reports/applications-by-product'));
      }
      const results = await Promise.allSettled(jobs);
      const overview = results[0].status === 'fulfilled' ? results[0].value?.data?.data : null;
      setStats(overview);
      if (isSuperAdmin && results[1]?.status === 'fulfilled') {
        const d = results[1].value?.data?.data;
        setTopPartners(Array.isArray(d) ? d : d?.partners || d?.rows || []);
      }
      if (isSuperAdmin && results[2]?.status === 'fulfilled') {
        const d = results[2].value?.data?.data;
        setProductStats(Array.isArray(d) ? d : d?.products || d?.rows || []);
      }
    } catch (e) {
      console.error('Admin dashboard fetch error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const appStats = stats?.applications || { total: 0, approved: 0, rejected: 0, pending: 0, total_commission: 0 };
  const partnerStats = stats?.Partners || stats?.partners || { total: 0, active: 0, pending_kyc: 0 };
  const leadStats = stats?.leads || { total_leads: 0, approved_leads: 0, rejected_leads: 0, pending_leads: 0, todays_leads: 0 };
  const withdrawalStats = stats?.withdrawal || { pending_withdrawals: 0, total_commission_paid: 0 };

  // Same cards as website, role-filtered (superAdminOnly hidden for operators; zero values hidden)
  const allStatCards = [
    { label: isAdministrativeOperator ? 'Total Leads' : 'Pending Leads', val: isAdministrativeOperator ? leadStats.total_leads || 0 : leadStats.pending_leads || 0, icon: 'people', color: '#F59E0B', bg: '#F59E0B15', path: '/leads' },
    { label: "Today's Leads", val: leadStats.todays_leads || 0, icon: 'trending-up', color: '#3B82F6', bg: '#3B82F615', path: '/leads' },
    { label: 'Pending KYC', val: partnerStats.pending_kyc || 0, icon: 'shield', color: '#8B5CF6', bg: '#8B5CF615', path: '/admin-partners', superAdminOnly: true },
    { label: 'Pending Withdrawals', val: withdrawalStats.pending_withdrawals || 0, icon: 'wallet', color: '#EF4444', bg: '#EF444415', path: '/admin-withdrawals', superAdminOnly: true },
    { label: 'Total Partners', val: partnerStats.total || 0, icon: 'people-circle', color: '#10B981', bg: '#10B98115', path: '/admin-partners', superAdminOnly: true },
    { label: 'Total Applications', val: appStats.total || 0, icon: 'document-text', color: '#06B6D4', bg: '#06B6D415', path: '/applications', superAdminOnly: true },
  ];
  const statCards = allStatCards.filter((c) => {
    if (c.superAdminOnly && !isSuperAdmin) return false;
    if (c.val === 0 || c.val === '0') return false;
    return true;
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: textMuted, marginTop: 10 }}>Loading admin dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: isDark ? '#0d1428' : colors.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 20 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={[colors.primary]} />}
    >
      {/* Top banner — "Admin Dashboard Analytics" */}
      <View style={[styles.headerCard, { backgroundColor: cardBg, borderColor: border }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '900', color: textPrimary }}>Admin Dashboard Analytics</Text>
          <Text style={{ fontSize: 12, color: textMuted, marginTop: 2 }}>{user?.full_name || 'Administrator'}</Text>
        </View>
        <TouchableOpacity style={[styles.refreshBtn, { backgroundColor: bgSecondary, borderColor: border }]} onPress={() => fetchData(true)}>
          <Icon name="refresh" size={15} color={textPrimary} />
          <Text style={{ fontSize: 12, fontWeight: '800', color: textPrimary, marginLeft: 6 }}>Refresh Data</Text>
        </TouchableOpacity>
      </View>

      {/* Stat cards — colored top border like website */}
      <View style={styles.statGrid}>
        {statCards.map((card, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.statCard, { backgroundColor: cardBg, borderColor: border, borderTopColor: card.color }]}
            onPress={() => router.push(card.path as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.statIcon, { backgroundColor: card.bg }]}>
              <Icon name={card.icon} size={22} color={card.color} />
            </View>
            <View>
              <Text style={{ fontSize: 22, fontWeight: '900', color: textPrimary }}>{card.val}</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: textMuted, marginTop: 3 }}>{card.label}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Lead pipeline — administrative operators (website parity) */}
      {isAdministrativeOperator && (
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ fontSize: 15, fontWeight: '900', color: textPrimary }}>Lead pipeline</Text>
            <TouchableOpacity onPress={() => router.push('/leads' as any)} style={[styles.smallBtn, { borderColor: border, backgroundColor: bgSecondary }]}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: textPrimary }}>Open leads</Text>
            </TouchableOpacity>
          </View>
          {[
            { label: 'Pending review', value: leadStats.pending_leads },
            { label: 'Approved', value: leadStats.approved_leads },
            { label: 'Rejected', value: leadStats.rejected_leads },
          ].map((item) => (
            <View key={item.label} style={[styles.pipeRow, { borderColor: border }]}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: textPrimary }}>{item.label}</Text>
              <Text style={{ fontSize: 14, fontWeight: '800', color: textPrimary, fontVariant: ['tabular-nums'] }}>{(item.value || 0).toLocaleString('en-IN')}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Super-admin analytics — top partners + applications by product */}
      {isSuperAdmin && (
        <>
          <View style={[styles.section, { backgroundColor: cardBg, borderColor: border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Icon name="trophy" size={18} color="#10B981" />
              <Text style={{ fontSize: 15, fontWeight: '900', color: textPrimary }}>Top Performing Partners</Text>
            </View>
            {topPartners.length === 0 ? (
              <Text style={{ fontSize: 13, color: textMuted, textAlign: 'center', paddingVertical: 20 }}>No active partner activity logged.</Text>
            ) : topPartners.map((p: any, idx: number) => (
              <View key={idx} style={[styles.pipeRow, { borderColor: border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: textPrimary }} numberOfLines={1}>{p.first_name} {p.last_name}</Text>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#3B82F6' }}>{p.partner_code || p.code || ''}</Text>
                </View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: textMuted }}>{p.total_cases ?? p.cases ?? p.applications ?? 0} cases</Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#10B981' }}>₹{parseFloat(p.total_commission || p.commission || 0).toLocaleString('en-IN')}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.section, { backgroundColor: cardBg, borderColor: border }]}>
            <Text style={{ fontSize: 15, fontWeight: '900', color: textPrimary, marginBottom: 12 }}>Applications by Product</Text>
            {productStats.length === 0 ? (
              <Text style={{ fontSize: 13, color: textMuted, textAlign: 'center', paddingVertical: 20 }}>No product data available.</Text>
            ) : productStats.slice(0, 10).map((p: any, idx: number) => (
              <View key={idx} style={[styles.pipeRow, { borderColor: border }]}>
                <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: textPrimary }} numberOfLines={1}>{p.product_name || p.name || p.bank_name || 'Product'}</Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#06B6D4' }}>{p.total ?? p.count ?? p.applications ?? 0}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Quick actions — website equivalent navigation cards */}
      <View style={styles.section}>
        <Text style={{ fontSize: 16, fontWeight: '900', color: textPrimary, marginBottom: 12 }}>Quick Actions</Text>
        {[
          { title: 'Manage Partners', desc: 'View and manage partner accounts', icon: 'people', path: '/admin-partners' },
          { title: 'Withdrawals', desc: 'Approve or reject withdrawal requests', icon: 'wallet', path: '/admin-withdrawals' },
          { title: 'Operational Queue', desc: 'Review applications and documents', icon: 'clipboard', path: '/op-queue' },
          { title: 'Leads', desc: 'View and manage leads', icon: 'flag', path: '/leads' },
          { title: 'Applications', desc: 'View all applications', icon: 'document-text', path: '/applications' },
        ].map((a) => (
          <TouchableOpacity key={a.title} style={[styles.actionCard, { backgroundColor: cardBg, borderColor: border }]} onPress={() => router.push(a.path as any)} activeOpacity={0.75}>
            <View style={[styles.actionIconWrap, { backgroundColor: bgSecondary }]}>
              <Icon name={a.icon} size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: textPrimary }}>{a.title}</Text>
              <Text style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>{a.desc}</Text>
            </View>
            <Icon name="chevron-forward" size={16} color={textMuted} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  headerCard: { borderRadius: 20, padding: 18, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { width: '48%', borderRadius: 20, padding: 18, borderWidth: 1, borderTopWidth: 3, flexDirection: 'row', alignItems: 'center', gap: 14 },
  statIcon: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  section: { borderRadius: 20, padding: 18, borderWidth: 1 },
  pipeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1, gap: 10 },
  smallBtn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  actionCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1 },
  actionIconWrap: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
});
