import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import apiClient from '../../services/api';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';

interface CommissionRule {
  id: string;
  rule_name?: string;
  designation?: string;
  product_category?: string;
  bank_id?: string;
  bank_name?: string;
  commission_type?: 'percentage' | 'fixed';
  commission_value?: number;
  min_amount?: number;
  max_amount?: number;
  is_active?: boolean;
  effective_from?: string;
  effective_to?: string;
  created_at?: string;
}

export default function CommissionRulesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [searchText, setSearchText] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state for new rule
  const [formData, setFormData] = useState({
    rule_name: '',
    designation: '',
    product_category: '',
    bank_id: '',
    commission_type: 'percentage' as 'percentage' | 'fixed',
    commission_value: '',
    min_amount: '',
    max_amount: '',
    effective_from: '',
    effective_to: '',
  });

  useEffect(() => {
    fetchCommissionRules();
  }, []);

  const fetchCommissionRules = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/commission-rules', { params: { limit: '200' } });
      setRules(response.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch commission rules:', error);
      Alert.alert('Error', 'Failed to load commission rules');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (ruleId: string, currentStatus: boolean) => {
    try {
      await apiClient.put(`/commission-rules/${ruleId}`, {
        is_active: !currentStatus,
      });
      fetchCommissionRules();
    } catch (error) {
      console.error('Failed to update rule:', error);
      Alert.alert('Error', 'Failed to update rule status');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this commission rule?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/commission-rules/${ruleId}`);
              fetchCommissionRules();
            } catch (error) {
              console.error('Failed to delete rule:', error);
              Alert.alert('Error', 'Failed to delete rule');
            }
          },
        },
      ]
    );
  };

  const handleSubmitRule = async () => {
    if (!formData.rule_name.trim()) {
      Alert.alert('Required', 'Please enter a rule name');
      return;
    }
    if (!formData.designation.trim()) {
      Alert.alert('Required', 'Please enter a designation');
      return;
    }
    if (!formData.commission_value) {
      Alert.alert('Required', 'Please enter commission value');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        rule_name: formData.rule_name.trim(),
        designation: formData.designation.trim(),
        product_category: formData.product_category.trim() || null,
        bank_id: formData.bank_id.trim() || null,
        commission_type: formData.commission_type,
        commission_value: Number(formData.commission_value),
        min_amount: formData.min_amount ? Number(formData.min_amount) : null,
        max_amount: formData.max_amount ? Number(formData.max_amount) : null,
        effective_from: formData.effective_from || null,
        effective_to: formData.effective_to || null,
      };

      await apiClient.post('/commission-rules', payload);
      Alert.alert('Success', 'Commission rule created successfully');
      setShowAddModal(false);
      setFormData({
        rule_name: '',
        designation: '',
        product_category: '',
        bank_id: '',
        commission_type: 'percentage',
        commission_value: '',
        min_amount: '',
        max_amount: '',
        effective_from: '',
        effective_to: '',
      });
      fetchCommissionRules();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to create rule');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRules = rules.filter(r =>
    (r.rule_name || '').toLowerCase().includes(searchText.toLowerCase()) ||
    (r.designation || '').toLowerCase().includes(searchText.toLowerCase()) ||
    (r.bank_name || '').toLowerCase().includes(searchText.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading commission rules...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Commission Rules</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Icon name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Icon name="search" size={18} color={colors.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search rules..."
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor={colors.textLight}
          />
        </View>
      </View>

      <View style={styles.rulesContainer}>
        {filteredRules.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="percent" size={48} color={colors.textLight} />
            <Text style={styles.emptyText}>No commission rules found</Text>
          </View>
        ) : (
          filteredRules.map((rule) => (
            <Card key={rule.id} style={styles.ruleCard}>
              <View style={styles.ruleHeader}>
                <View style={styles.ruleInfo}>
                  <Text style={styles.ruleName}>{rule.rule_name || 'Unnamed Rule'}</Text>
                  <Text style={styles.designation}>{rule.designation || 'All Designations'}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleToggleActive(rule.id, rule.is_active ?? true)}
                >
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: rule.is_active ? '#10B981' : '#EF4444' }
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {rule.is_active ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.ruleDetails}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Product Category</Text>
                  <Text style={styles.detailValue}>{rule.product_category || 'All'}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Bank</Text>
                  <Text style={styles.detailValue}>{rule.bank_name || 'All Banks'}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Commission</Text>
                  <Text style={styles.detailValue}>
                    {rule.commission_type === 'percentage'
                      ? `${rule.commission_value ?? 0}%`
                      : `₹${Number(rule.commission_value ?? 0).toLocaleString()}`}
                  </Text>
                </View>
                {rule.min_amount && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Min Amount</Text>
                    <Text style={styles.detailValue}>₹{Number(rule.min_amount).toLocaleString()}</Text>
                  </View>
                )}
                {rule.max_amount && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Max Amount</Text>
                    <Text style={styles.detailValue}>₹{Number(rule.max_amount).toLocaleString()}</Text>
                  </View>
                )}
              </View>

              <View style={styles.ruleActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    // TODO: Implement edit functionality
                    Alert.alert('Info', 'Edit functionality coming soon');
                  }}
                >
                  <Icon name="edit" size={16} color={colors.primary} />
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDeleteRule(rule.id)}
                >
                  <Icon name="trash-2" size={16} color="#EF4444" />
                  <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}
      </View>

      {/* Add Rule Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Commission Rule</Text>

            <Text style={styles.inputLabel}>Rule Name *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. HDFC Credit Card Gold Commission"
              value={formData.rule_name}
              onChangeText={(text) => setFormData({ ...formData, rule_name: text })}
            />

            <Text style={styles.inputLabel}>Designation *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. SD, DSA, FOS"
              value={formData.designation}
              onChangeText={(text) => setFormData({ ...formData, designation: text })}
            />

            <Text style={styles.inputLabel}>Product Category</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. credit-card"
              value={formData.product_category}
              onChangeText={(text) => setFormData({ ...formData, product_category: text })}
            />

            <Text style={styles.inputLabel}>Bank ID (Optional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Bank UUID"
              value={formData.bank_id}
              onChangeText={(text) => setFormData({ ...formData, bank_id: text })}
            />

            <Text style={styles.inputLabel}>Commission Type</Text>
            <View style={styles.typeSelector}>
              {(['percentage', 'fixed'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeChoice,
                    formData.commission_type === type && styles.typeChoiceActive,
                  ]}
                  onPress={() => setFormData({ ...formData, commission_type: type })}
                >
                  <Text
                    style={[
                      styles.typeChoiceText,
                      formData.commission_type === type && styles.typeChoiceTextActive,
                    ]}
                  >
                    {type.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Commission Value *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder={formData.commission_type === 'percentage' ? 'e.g. 1.5' : 'e.g. 500'}
              keyboardType="numeric"
              value={formData.commission_value}
              onChangeText={(text) => setFormData({ ...formData, commission_value: text })}
            />

            <Text style={styles.inputLabel}>Min Amount (Optional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 10000"
              keyboardType="numeric"
              value={formData.min_amount}
              onChangeText={(text) => setFormData({ ...formData, min_amount: text })}
            />

            <Text style={styles.inputLabel}>Max Amount (Optional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 1000000"
              keyboardType="numeric"
              value={formData.max_amount}
              onChangeText={(text) => setFormData({ ...formData, max_amount: text })}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowAddModal(false);
                  setFormData({
                    rule_name: '',
                    designation: '',
                    product_category: '',
                    bank_id: '',
                    commission_type: 'percentage',
                    commission_value: '',
                    min_amount: '',
                    max_amount: '',
                    effective_from: '',
                    effective_to: '',
                  });
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleSubmitRule}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>Create Rule</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  loadingText: {
    marginTop: 12,
    color: colors.textLight,
    fontSize: typography.sizes.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: spacing.xs,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    padding: spacing.md,
    backgroundColor: colors.card,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  rulesContainer: {
    padding: spacing.md,
    gap: spacing.md,
  },
  emptyContainer: {
    padding: spacing.xl * 2,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.textLight,
  },
  ruleCard: {
    padding: spacing.md,
  },
  ruleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  ruleInfo: {
    flex: 1,
  },
  ruleName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  designation: {
    fontSize: typography.sizes.sm,
    color: colors.textLight,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  ruleDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailItem: {
    width: '50%',
    marginBottom: spacing.xs,
  },
  detailLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textLight,
  },
  detailValue: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontWeight: typography.weights.semibold,
  },
  ruleActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonText: {
    marginLeft: spacing.xs,
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  deleteButton: {
    borderColor: '#EF4444',
  },
  deleteButtonText: {
    color: '#EF4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.lg,
    width: '100%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textLight,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  modalInput: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeChoice: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  typeChoiceActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '15',
  },
  typeChoiceText: {
    fontSize: typography.sizes.sm,
    color: colors.textLight,
    fontWeight: typography.weights.semibold,
  },
  typeChoiceTextActive: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalButtonConfirm: {
    backgroundColor: colors.primary,
  },
  modalButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
});
