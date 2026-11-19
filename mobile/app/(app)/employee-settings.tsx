import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import {
  fetchEmployeeSettings,
  updateEmployeeSettings,
  requestAccountDeletion,
  EmployeeSettings,
} from '../../services/employee.service';

export default function EmployeeSettingsScreen() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<EmployeeSettings>({
    push_notifications_enabled: true,
    email_alerts_enabled: true,
    sms_alerts_enabled: true,
    sound_enabled: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await fetchEmployeeSettings();
      if (data) {
        setSettings(data);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = async (key: keyof EmployeeSettings, value: boolean) => {
    const updatedSettings = { ...settings, [key]: value };
    setSettings(updatedSettings);

    try {
      setSaving(true);
      await updateEmployeeSettings({ [key]: value });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update setting');
      // Revert on error
      setSettings(settings);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const reason = 'User requested deletion';
              await requestAccountDeletion(reason);
              Alert.alert(
                'Request Submitted',
                'Your account deletion request has been submitted. You will receive a confirmation email shortly.'
              );
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to submit deletion request');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Employee Settings</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Employee Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <Card style={styles.settingCard}>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Icon name="bell" size={20} color={colors.text} />
              <Text style={styles.settingLabel}>Push Notifications</Text>
            </View>
            <Switch
              value={settings.push_notifications_enabled}
              onValueChange={(value) => handleSettingChange('push_notifications_enabled', value)}
              disabled={saving}
            />
          </View>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Icon name="mail" size={20} color={colors.text} />
              <Text style={styles.settingLabel}>Email Alerts</Text>
            </View>
            <Switch
              value={settings.email_alerts_enabled}
              onValueChange={(value) => handleSettingChange('email_alerts_enabled', value)}
              disabled={saving}
            />
          </View>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Icon name="message-square" size={20} color={colors.text} />
              <Text style={styles.settingLabel}>SMS Alerts</Text>
            </View>
            <Switch
              value={settings.sms_alerts_enabled}
              onValueChange={(value) => handleSettingChange('sms_alerts_enabled', value)}
              disabled={saving}
            />
          </View>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Icon name="volume-2" size={20} color={colors.text} />
              <Text style={styles.settingLabel}>Sound Enabled</Text>
            </View>
            <Switch
              value={settings.sound_enabled}
              onValueChange={(value) => handleSettingChange('sound_enabled', value)}
              disabled={saving}
            />
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Account</Text>
        <Card style={styles.settingCard}>
          <TouchableOpacity style={styles.dangerButton} onPress={handleDeleteAccount}>
            <Icon name="trash-2" size={20} color={colors.error} />
            <Text style={styles.dangerButtonText}>Delete Account</Text>
          </TouchableOpacity>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: { padding: spacing.xs },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  content: { padding: spacing.md },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: spacing.md },
  settingCard: { marginBottom: spacing.md },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  settingLabel: { fontSize: 14, color: colors.text },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    gap: spacing.sm,
  },
  dangerButtonText: { fontSize: 14, fontWeight: '700', color: colors.error },
});
