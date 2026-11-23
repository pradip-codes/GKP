import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Icon } from '../../components/Icon';
import { spacing } from '../../theme/spacing';
import {
  fetchEmployeeProfile,
  fetchEmployeeTeam,
  EmployeeProfileData,
  EmployeeTeamMember,
} from '../../services/employee.service';

const ACCENT = '#0F766E';

export default function EmployeeTeamScreen() {
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<EmployeeProfileData | null>(null);
  const [team, setTeam] = useState<EmployeeTeamMember[]>([]);
  const [designation, setDesignation] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      setError(null);
      const [profileRes, teamRes] = await Promise.all([fetchEmployeeProfile(), fetchEmployeeTeam()]);
      if (profileRes) setProfileData(profileRes);
      if (teamRes) {
        setTeam(teamRes.team || []);
        setDesignation(teamRes.designation || (profileRes as any)?.employee?.designation || '');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load team data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const cardBg = isDark ? '#1E293B' : '#FFFFFF';
  const bgSecondary = isDark ? '#0F172A' : '#F8FAFC';
  const borderCol = colors.border;

  const empCode = (m: any) => m.employee_code || m.employee_id || m.emp_code || m.code || (m.id ? String(m.id).slice(0, 8) : 'N/A');

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={ACCENT} />}
      >
        {/* Header — website: eyebrow + title */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: ACCENT, textTransform: 'uppercase', letterSpacing: 0.5 }}>Hierarchy Control</Text>
          <Text style={{ fontSize: 22, fontWeight: '900', color: colors.text }}>My Team & Reporting Hierarchy</Text>
        </View>

        {/* Team table card */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol, padding: 0, overflow: 'hidden' }]}>
          <View style={{ padding: 18, borderBottomWidth: 1, borderBottomColor: borderCol }}>
            <Text style={{ fontSize: 15.5, fontWeight: '800', color: colors.text }}>
              Direct Reports for {designation || 'Manager / TL'}
            </Text>
          </View>

          {loading ? (
            <View style={{ paddingVertical: 60, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={ACCENT} />
              <Text style={{ fontSize: 13, color: colors.textMid, marginTop: 10 }}>Loading team data...</Text>
            </View>
          ) : error ? (
            <View style={{ paddingVertical: 50, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: '#EF4444', marginBottom: 8 }}>{error}</Text>
              <TouchableOpacity onPress={() => load()}><Text style={{ fontSize: 13, fontWeight: '800', color: ACCENT }}>Retry</Text></TouchableOpacity>
            </View>
          ) : team.length === 0 ? (
            <View style={{ paddingVertical: 60, alignItems: 'center' }}>
              <Icon name="users" size={36} color={colors.textLight} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textMid, marginTop: 10 }}>No team members assigned yet.</Text>
            </View>
          ) : (
            team.map((m: any, i: number) => {
              const approved = m.activation_status === 'APPROVED';
              const progress = m.overall_progress ?? 20;
              return (
                <View key={m.id || i} style={{ padding: 16, borderBottomWidth: i < team.length - 1 ? 1 : 0, borderBottomColor: borderCol }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '900', color: ACCENT }}>{empCode(m)}</Text>
                      <Text style={{ fontSize: 14.5, fontWeight: '800', color: colors.text, marginTop: 2 }}>{m.full_name}</Text>
                    </View>
                    <View style={{ backgroundColor: approved ? '#D1FAE5' : '#FEF3C7', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: approved ? '#065F46' : '#92400E' }}>{m.activation_status || 'PENDING'}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                    <Text style={{ fontSize: 12, color: colors.textMid }}>📱 {m.mobile_number || 'N/A'}</Text>
                    <Text style={{ fontSize: 12, color: colors.textMid }}>🎯 {m.designation || 'Team Member'}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: ACCENT }}>Onboarding: {progress}%</Text>
                  </View>
                  {/* onboarding progress bar */}
                  <View style={{ height: 5, borderRadius: 4, backgroundColor: isDark ? '#334155' : '#E2E8F0', marginTop: 10, overflow: 'hidden' }}>
                    <View style={{ width: `${Math.min(100, Number(progress) || 0)}%`, height: '100%', backgroundColor: approved ? '#10B981' : ACCENT, borderRadius: 4 }} />
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Reporting chain summary (from profile hierarchy) */}
        {(profileData as any)?.hierarchy && (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol, marginTop: 14 }]}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textMid, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Your Reporting Chain</Text>
            {[
              ['Branch Head', (profileData as any).hierarchy.branch_head_name],
              ['Senior Manager', (profileData as any).hierarchy.senior_manager_name],
              ['Manager', (profileData as any).hierarchy.manager_name],
              ['Team Leader', (profileData as any).hierarchy.team_leader_name],
            ].filter(([, v]) => v).map(([label, v]) => (
              <View key={label as string} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: borderCol }}>
                <Text style={{ fontSize: 12.5, color: colors.textMid }}>{label}</Text>
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.text }}>{v}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, paddingBottom: spacing.xxl },
  card: { borderRadius: 18, borderWidth: 1 },
});
