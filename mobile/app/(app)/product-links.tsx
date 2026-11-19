import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, Clipboard, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import apiClient from '../../services/api';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

interface ProductLink {
  id: string;
  name: string;
  category?: string;
  bank_name?: string;
  is_active?: boolean;
  public_url?: string;
  partner_url?: string;
  tracking_enabled?: boolean;
  button_text?: string;
  redirect_type?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  priority?: number;
  last_updated_at?: string;
  updated_by?: string;
}

export default function ProductLinksScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [links, setLinks] = useState<ProductLink[]>([]);
  const [searchText, setSearchText] = useState('');

  // Edit/Create modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editLink, setEditLink] = useState<ProductLink | null>(null);
  const [form, setForm] = useState<Partial<ProductLink>>({});

  useEffect(() => {
    fetchProductLinks();
  }, []);

  const fetchProductLinks = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/products/links', { params: { limit: '200' } });
      setLinks(response.data?.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch product links:', error);
      Alert.alert('Error', 'Failed to load product links');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async (url?: string) => {
    if (!url) {
      Alert.alert('Info', 'No tracking URL configured for this product');
      return;
    }
    try {
      Clipboard.setString(url);
      Alert.alert('Success', 'Link copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy link');
    }
  };

  const handleToggleTracking = async (link: ProductLink) => {
    try {
      await apiClient.put(`/products/link/${link.id}`, {
        product_id: link.id,
        public_url: link.public_url,
        partner_url: link.partner_url,
        tracking_enabled: !link.tracking_enabled,
        button_text: link.button_text,
        redirect_type: link.redirect_type,
        utm_source: link.utm_source,
        utm_medium: link.utm_medium,
        utm_campaign: link.utm_campaign,
        utm_term: link.utm_term,
        utm_content: link.utm_content,
        priority: link.priority,
        reason: 'Tracking toggled from mobile app',
      });
      fetchProductLinks();
    } catch (error) {
      console.error('Failed to update link:', error);
      Alert.alert('Error', 'Failed to update tracking status');
    }
  };

  const handleEditLink = (link: ProductLink) => {
    setEditLink(link);
    setForm(link);
    setModalVisible(true);
  };

  const handleCreateLink = () => {
    setEditLink(null);
    setForm({
      is_active: true,
      tracking_enabled: true,
      priority: 0,
      redirect_type: 'new_tab',
    });
    setModalVisible(true);
  };

  const handleSaveLink = async () => {
    try {
      if (editLink) {
        await apiClient.put(`/products/link/${editLink.id}`, form);
        Alert.alert('Success', 'Link updated successfully');
      } else {
        await apiClient.post('/products/link', form);
        Alert.alert('Success', 'Link created successfully');
      }
      setModalVisible(false);
      fetchProductLinks();
    } catch (error) {
      console.error('Failed to save link:', error);
      Alert.alert('Error', 'Failed to save link');
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this link config?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/products/link/${linkId}`);
              fetchProductLinks();
            } catch (error) {
              console.error('Failed to delete link:', error);
              Alert.alert('Error', 'Failed to delete link');
            }
          },
        },
      ]
    );
  };

  const filteredLinks = links.filter(l =>
    (l.name || '').toLowerCase().includes(searchText.toLowerCase()) ||
    (l.bank_name || '').toLowerCase().includes(searchText.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading product links...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Product Links</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleCreateLink}
        >
          <Text style={styles.addButtonText}>+ Create Link</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search links..."
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor={colors.textLight}
        />
      </View>

      <View style={styles.linksContainer}>
        {filteredLinks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No product links found</Text>
          </View>
        ) : (
          filteredLinks.map((link) => {
            const trackingUrl = link.public_url || link.partner_url;
            return (
            <View key={link.id} style={styles.linkCard}>
              <View style={styles.linkHeader}>
                <View style={styles.linkInfo}>
                  <Text style={styles.productName}>{link.name}</Text>
                  <Text style={styles.linkCode}>{link.bank_name || '—'}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: link.is_active ? '#10B981' : '#EF4444' }
                  ]}
                >
                  <Text style={styles.statusText}>
                    {link.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>

              <View style={styles.urlContainer}>
                <Text style={styles.urlLabel}>Tracking URL:</Text>
                <Text style={styles.urlText} numberOfLines={2}>
                  {trackingUrl || 'Not configured'}
                </Text>
              </View>

              <View style={styles.linkStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{link.priority ?? 0}</Text>
                  <Text style={styles.statLabel}>Priority</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{link.redirect_type || '—'}</Text>
                  <Text style={styles.statLabel}>Redirect</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {link.tracking_enabled ? 'On' : 'Off'}
                  </Text>
                  <Text style={styles.statLabel}>Tracking</Text>
                </View>
              </View>

              <View style={styles.linkActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleCopyLink(trackingUrl)}
                >
                  <Text style={styles.actionButtonText}>Copy Link</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => handleEditLink(link)}
                >
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.toggleButton]}
                  onPress={() => handleToggleTracking(link)}
                >
                  <Text style={styles.actionButtonText}>
                    {link.tracking_enabled ? 'Track Off' : 'Track On'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDeleteLink(link.id)}
                >
                  <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
            );
          })
        )}
      </View>

      {/* Edit/Create Modal */}
      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editLink ? 'Edit Link' : 'Create Link'}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Public URL</Text>
              <TextInput
                style={styles.formInput}
                value={form.public_url}
                onChangeText={(text) => setForm({ ...form, public_url: text })}
                placeholderTextColor={colors.textLight}
              />
              <Text style={styles.formLabel}>Partner URL</Text>
              <TextInput
                style={styles.formInput}
                value={form.partner_url}
                onChangeText={(text) => setForm({ ...form, partner_url: text })}
                placeholderTextColor={colors.textLight}
              />
              <Text style={styles.formLabel}>Button Text</Text>
              <TextInput
                style={styles.formInput}
                value={form.button_text}
                onChangeText={(text) => setForm({ ...form, button_text: text })}
                placeholderTextColor={colors.textLight}
              />
              <Text style={styles.formLabel}>Redirect Type</Text>
              <TextInput
                style={styles.formInput}
                value={form.redirect_type}
                onChangeText={(text) => setForm({ ...form, redirect_type: text })}
                placeholderTextColor={colors.textLight}
              />
              <Text style={styles.formLabel}>Priority</Text>
              <TextInput
                style={styles.formInput}
                value={String(form.priority || 0)}
                onChangeText={(text) => setForm({ ...form, priority: parseInt(text) || 0 })}
                keyboardType="numeric"
                placeholderTextColor={colors.textLight}
              />
              <View style={styles.toggleRow}>
                <Text style={styles.formLabel}>Tracking Enabled</Text>
                <TouchableOpacity
                  style={[styles.toggle, form.tracking_enabled && styles.toggleActive]}
                  onPress={() => setForm({ ...form, tracking_enabled: !form.tracking_enabled })}
                >
                  <Text style={styles.toggleText}>{form.tracking_enabled ? 'ON' : 'OFF'}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.toggleRow}>
                <Text style={styles.formLabel}>Active</Text>
                <TouchableOpacity
                  style={[styles.toggle, form.is_active && styles.toggleActive]}
                  onPress={() => setForm({ ...form, is_active: !form.is_active })}
                >
                  <Text style={styles.toggleText}>{form.is_active ? 'ON' : 'OFF'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>UTM Parameters</Text>
              <Text style={styles.formLabel}>UTM Source</Text>
              <TextInput
                style={styles.formInput}
                value={form.utm_source}
                onChangeText={(text) => setForm({ ...form, utm_source: text })}
                placeholderTextColor={colors.textLight}
              />
              <Text style={styles.formLabel}>UTM Medium</Text>
              <TextInput
                style={styles.formInput}
                value={form.utm_medium}
                onChangeText={(text) => setForm({ ...form, utm_medium: text })}
                placeholderTextColor={colors.textLight}
              />
              <Text style={styles.formLabel}>UTM Campaign</Text>
              <TextInput
                style={styles.formInput}
                value={form.utm_campaign}
                onChangeText={(text) => setForm({ ...form, utm_campaign: text })}
                placeholderTextColor={colors.textLight}
              />
              <Text style={styles.formLabel}>UTM Term</Text>
              <TextInput
                style={styles.formInput}
                value={form.utm_term}
                onChangeText={(text) => setForm({ ...form, utm_term: text })}
                placeholderTextColor={colors.textLight}
              />
              <Text style={styles.formLabel}>UTM Content</Text>
              <TextInput
                style={styles.formInput}
                value={form.utm_content}
                onChangeText={(text) => setForm({ ...form, utm_content: text })}
                placeholderTextColor={colors.textLight}
              />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveLink}>
              <Text style={styles.saveButtonText}>Save Link</Text>
            </TouchableOpacity>
          </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: colors.card,
  },
  searchInput: {
    backgroundColor: colors.bg,
    borderRadius: 8,
    padding: 12,
    fontSize: typography.sizes.sm,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linksContainer: {
    padding: 16,
    gap: 12,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.sizes.md,
    color: colors.textLight,
  },
  linkCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  linkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  linkInfo: {
    flex: 1,
  },
  productName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 4,
  },
  linkCode: {
    fontSize: typography.sizes.sm,
    color: colors.textLight,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  urlContainer: {
    backgroundColor: colors.bg,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  urlLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textLight,
    marginBottom: 4,
  },
  urlText: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontFamily: 'monospace',
  },
  linkStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textLight,
    marginTop: 2,
  },
  linkActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  toggleButton: {
    backgroundColor: '#F59E0B',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  deleteButtonText: {
    color: '#FFFFFF',
  },
  editButton: {
    backgroundColor: '#3B82F6',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  closeButton: {
    fontSize: 24,
    color: colors.text,
    padding: 8,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formSection: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 12,
  },
  formLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 4,
  },
  formInput: {
    backgroundColor: colors.bg,
    borderRadius: 8,
    padding: 12,
    fontSize: typography.sizes.sm,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  toggle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
});
