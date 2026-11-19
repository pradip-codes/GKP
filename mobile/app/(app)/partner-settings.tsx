import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { useAuth } from '../../contexts/AuthContext';

export default function PartnerSettingsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const [notifications, setNotifications] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {
          Alert.alert('Success', 'Account deletion request submitted. Our team will contact you shortly.');
        }}
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextCol}>
          <Text style={styles.headerTitle}>Partner Settings</Text>
          <Text style={styles.headerSubtitle}>Manage your preferences</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <Card style={styles.settingCard}>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBg, { backgroundColor: '#EEF2FF' }]}>
                <Icon name="bell" size={16} color="#4F46E5" />
              </View>
              <View style={styles.settingTextCol}>
                <Text style={styles.settingLabel}>Push Notifications</Text>
                <Text style={styles.settingSublabel}>Receive real-time alerts</Text>
              </View>
            </View>
            <Switch value={notifications} onValueChange={setNotifications} />
          </View>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBg, { backgroundColor: '#ECFDF5' }]}>
                <Icon name="mail" size={16} color="#10B981" />
              </View>
              <View style={styles.settingTextCol}>
                <Text style={styles.settingLabel}>Email Alerts</Text>
                <Text style={styles.settingSublabel}>Get updates via email</Text>
              </View>
            </View>
            <Switch value={emailAlerts} onValueChange={setEmailAlerts} />
          </View>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBg, { backgroundColor: '#FEF3C7' }]}>
                <Icon name="message-square" size={16} color="#D97706" />
              </View>
              <View style={styles.settingTextCol}>
                <Text style={styles.settingLabel}>SMS Alerts</Text>
                <Text style={styles.settingSublabel}>Get SMS notifications</Text>
              </View>
            </View>
            <Switch value={smsAlerts} onValueChange={setSmsAlerts} />
          </View>
          <View style={[styles.settingItem, { borderBottomWidth: 0 }]}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBg, { backgroundColor: '#FDF2F8' }]}>
                <Icon name="volume-2" size={16} color="#DB2777" />
              </View>
              <View style={styles.settingTextCol}>
                <Text style={styles.settingLabel}>Sound Effects</Text>
                <Text style={styles.settingSublabel}>Play sounds for alerts</Text>
              </View>
            </View>
            <Switch value={soundEnabled} onValueChange={setSoundEnabled} />
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Account</Text>
        <Card style={styles.settingCard}>
          <TouchableOpacity style={styles.dangerButton} onPress={handleDeleteAccount}>
            <View style={[styles.settingIconBg, { backgroundColor: '#FEE2E2' }]}>
              <Icon name="trash-2" size={16} color="#EF4444" />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.dangerButtonText}>Delete Account</Text>
              <Text style={styles.dangerSublabel}>Permanently delete your account</Text>
            </View>
          </TouchableOpacity>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTextCol: {
    flex: 1,
    marginLeft: spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
  },
  content: {
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.md,
  },
  settingCard: {
    marginBottom: spacing.md,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  settingIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingTextCol: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  settingSublabel: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: 2,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    gap: spacing.md,
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.error,
  },
  dangerSublabel: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: 2,
  },
});
