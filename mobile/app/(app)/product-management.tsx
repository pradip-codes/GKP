import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import apiClient from '../../services/api';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

interface Product {
  id: string;
  name: string;
  category: string;
  sub_category?: string;
  bank_id?: string;
  bank_name?: string;
  annual_fee?: string;
  time_period?: string;
  commission_type?: string;
  commission_value?: number;
  status?: string;
  is_active: boolean;
  featured?: boolean;
  priority?: number;
  min_age?: number;
  max_age?: number;
  min_income?: number;
  features?: string;
  benefits?: string;
  eligibility_criteria?: string;
  documents_required?: string;
  fees_charges?: string;
  interest_rate?: string;
  processing_fee?: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  commission_enabled?: boolean;
  partner_share_value?: number;
  team_member_share_value?: number;
  min_commission?: number;
  max_commission?: number;
}

export default function ProductManagementScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [featuredFilter, setFeaturedFilter] = useState<string>('all');

  // Edit/Create modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<Partial<Product>>({});
  const [activeTab, setActiveTab] = useState<'core' | 'eligibility' | 'commission' | 'seo'>('core');

  const categories = ['credit_card', 'personal_loan', 'business_loan', 'insurance', 'health_insurance', 'life_insurance'];

  useEffect(() => {
    fetchProducts();
  }, [categoryFilter, statusFilter, featuredFilter]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = { limit: '200' };
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (featuredFilter !== 'all') params.featured = featuredFilter;
      const response = await apiClient.get('/products', { params });
      setProducts(response.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (productId: string, currentStatus: boolean) => {
    try {
      await apiClient.put(`/products/status`, {
        id: productId,
        is_active: !currentStatus,
      });
      fetchProducts();
    } catch (error) {
      console.error('Failed to update product:', error);
      Alert.alert('Error', 'Failed to update product status');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/products/${productId}`);
              fetchProducts();
            } catch (error) {
              console.error('Failed to delete product:', error);
              Alert.alert('Error', 'Failed to delete product');
            }
          },
        },
      ]
    );
  };

  const handleEditProduct = (product: Product) => {
    setEditProduct(product);
    setForm(product);
    setModalVisible(true);
  };

  const handleCreateProduct = () => {
    setEditProduct(null);
    setForm({
      is_active: true,
      featured: false,
      priority: 0,
      commission_enabled: true,
      commission_type: 'fixed',
      min_age: 18,
      max_age: 60,
      min_income: 0,
    });
    setModalVisible(true);
  };

  const handleSaveProduct = async () => {
    try {
      if (editProduct) {
        await apiClient.put(`/products/${editProduct.id}`, form);
        Alert.alert('Success', 'Product updated successfully');
      } else {
        await apiClient.post('/products', form);
        Alert.alert('Success', 'Product created successfully');
      }
      setModalVisible(false);
      fetchProducts();
    } catch (error) {
      console.error('Failed to save product:', error);
      Alert.alert('Error', 'Failed to save product');
    }
  };

  const filteredProducts = products.filter(p =>
    (p.name || '').toLowerCase().includes(searchText.toLowerCase()) ||
    (p.bank_name || '').toLowerCase().includes(searchText.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Product Management</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleCreateProduct}
        >
          <Text style={styles.addButtonText}>+ Add Product</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor={colors.textLight}
        />
      </View>

      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Category:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterChip, categoryFilter === 'all' && styles.filterChipActive]}
            onPress={() => setCategoryFilter('all')}
          >
            <Text style={[styles.filterChipText, categoryFilter === 'all' && styles.filterChipTextActive]}>All</Text>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.filterChip, categoryFilter === cat && styles.filterChipActive]}
              onPress={() => setCategoryFilter(cat)}
            >
              <Text style={[styles.filterChipText, categoryFilter === cat && styles.filterChipTextActive]}>
                {cat.replace('_', ' ').toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Status:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['all', 'Active', 'Inactive', 'Hidden'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.filterChip, statusFilter === status && styles.filterChipActive]}
              onPress={() => setStatusFilter(status)}
            >
              <Text style={[styles.filterChipText, statusFilter === status && styles.filterChipTextActive]}>
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Featured:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['all', 'true', 'false'].map((feat) => (
            <TouchableOpacity
              key={feat}
              style={[styles.filterChip, featuredFilter === feat && styles.filterChipActive]}
              onPress={() => setFeaturedFilter(feat)}
            >
              <Text style={[styles.filterChipText, featuredFilter === feat && styles.filterChipTextActive]}>
                {feat === 'all' ? 'All' : feat === 'true' ? 'Featured' : 'Regular'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.productsContainer}>
        {filteredProducts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No products found</Text>
          </View>
        ) : (
          filteredProducts.map((product) => (
            <View key={product.id} style={styles.productCard}>
              <View style={styles.productHeader}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.bankName}>{product.bank_name || '—'}</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.statusBadge,
                    { backgroundColor: product.is_active ? '#10B981' : '#EF4444' }
                  ]}
                  onPress={() => handleToggleActive(product.id, product.is_active)}
                >
                  <Text style={styles.statusText}>
                    {product.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.productDetails}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Category</Text>
                  <Text style={styles.detailValue}>{product.category || '—'}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Sub-category</Text>
                  <Text style={styles.detailValue}>{product.sub_category || '—'}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Annual Fee</Text>
                  <Text style={styles.detailValue}>{product.annual_fee || '—'}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Commission</Text>
                  <Text style={styles.detailValue}>
                    {product.commission_type === 'percentage'
                      ? `${product.commission_value ?? 0}%`
                      : `₹${Number(product.commission_value ?? 0).toLocaleString('en-IN')}`}
                  </Text>
                </View>
              </View>

              <View style={styles.productActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEditProduct(product)}
                >
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDeleteProduct(product.id)}
                >
                  <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Edit/Create Modal */}
      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editProduct ? 'Edit Product' : 'Create Product'}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tabContainer}>
            {['core', 'eligibility', 'commission', 'seo'].map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => setActiveTab(tab as any)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={styles.modalContent}>
            {activeTab === 'core' && (
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Product Name *</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.name}
                  onChangeText={(text) => setForm({ ...form, name: text })}
                  placeholderTextColor={colors.textLight}
                />
                <Text style={styles.formLabel}>Category *</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.category}
                  onChangeText={(text) => setForm({ ...form, category: text })}
                  placeholderTextColor={colors.textLight}
                />
                <Text style={styles.formLabel}>Sub Category</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.sub_category}
                  onChangeText={(text) => setForm({ ...form, sub_category: text })}
                  placeholderTextColor={colors.textLight}
                />
                <Text style={styles.formLabel}>Bank Name</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.bank_name}
                  onChangeText={(text) => setForm({ ...form, bank_name: text })}
                  placeholderTextColor={colors.textLight}
                />
                <Text style={styles.formLabel}>Annual Fee</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.annual_fee}
                  onChangeText={(text) => setForm({ ...form, annual_fee: text })}
                  placeholderTextColor={colors.textLight}
                />
                <Text style={styles.formLabel}>Time Period</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.time_period}
                  onChangeText={(text) => setForm({ ...form, time_period: text })}
                  placeholderTextColor={colors.textLight}
                />
                <View style={styles.toggleRow}>
                  <Text style={styles.formLabel}>Active</Text>
                  <TouchableOpacity
                    style={[styles.toggle, form.is_active && styles.toggleActive]}
                    onPress={() => setForm({ ...form, is_active: !form.is_active })}
                  >
                    <Text style={styles.toggleText}>{form.is_active ? 'ON' : 'OFF'}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.toggleRow}>
                  <Text style={styles.formLabel}>Featured</Text>
                  <TouchableOpacity
                    style={[styles.toggle, form.featured && styles.toggleActive]}
                    onPress={() => setForm({ ...form, featured: !form.featured })}
                  >
                    <Text style={styles.toggleText}>{form.featured ? 'ON' : 'OFF'}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.formLabel}>Priority</Text>
                <TextInput
                  style={styles.formInput}
                  value={String(form.priority || 0)}
                  onChangeText={(text) => setForm({ ...form, priority: parseInt(text) || 0 })}
                  keyboardType="numeric"
                  placeholderTextColor={colors.textLight}
                />
              </View>
            )}

            {activeTab === 'eligibility' && (
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Min Age</Text>
                <TextInput
                  style={styles.formInput}
                  value={String(form.min_age || 18)}
                  onChangeText={(text) => setForm({ ...form, min_age: parseInt(text) || 18 })}
                  keyboardType="numeric"
                  placeholderTextColor={colors.textLight}
                />
                <Text style={styles.formLabel}>Max Age</Text>
                <TextInput
                  style={styles.formInput}
                  value={String(form.max_age || 60)}
                  onChangeText={(text) => setForm({ ...form, max_age: parseInt(text) || 60 })}
                  keyboardType="numeric"
                  placeholderTextColor={colors.textLight}
                />
                <Text style={styles.formLabel}>Min Income</Text>
                <TextInput
                  style={styles.formInput}
                  value={String(form.min_income || 0)}
                  onChangeText={(text) => setForm({ ...form, min_income: parseInt(text) || 0 })}
                  keyboardType="numeric"
                  placeholderTextColor={colors.textLight}
                />
                <Text style={styles.formLabel}>Eligibility Criteria</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  value={form.eligibility_criteria}
                  onChangeText={(text) => setForm({ ...form, eligibility_criteria: text })}
                  multiline
                  numberOfLines={4}
                  placeholderTextColor={colors.textLight}
                />
                <Text style={styles.formLabel}>Documents Required</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  value={form.documents_required}
                  onChangeText={(text) => setForm({ ...form, documents_required: text })}
                  multiline
                  numberOfLines={4}
                  placeholderTextColor={colors.textLight}
                />
                <Text style={styles.formLabel}>Fees & Charges</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  value={form.fees_charges}
                  onChangeText={(text) => setForm({ ...form, fees_charges: text })}
                  multiline
                  numberOfLines={4}
                  placeholderTextColor={colors.textLight}
                />
                <Text style={styles.formLabel}>Interest Rate</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.interest_rate}
                  onChangeText={(text) => setForm({ ...form, interest_rate: text })}
                  placeholderTextColor={colors.textLight}
                />
                <Text style={styles.formLabel}>Processing Fee</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.processing_fee}
                  onChangeText={(text) => setForm({ ...form, processing_fee: text })}
                  placeholderTextColor={colors.textLight}
                />
              </View>
            )}

            {activeTab === 'commission' && (
              <View style={styles.formSection}>
                <View style={styles.toggleRow}>
                  <Text style={styles.formLabel}>Commission Enabled</Text>
                  <TouchableOpacity
                    style={[styles.toggle, form.commission_enabled && styles.toggleActive]}
                    onPress={() => setForm({ ...form, commission_enabled: !form.commission_enabled })}
                  >
                    <Text style={styles.toggleText}>{form.commission_enabled ? 'ON' : 'OFF'}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.formLabel}>Commission Type</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.commission_type}
                  onChangeText={(text) => setForm({ ...form, commission_type: text })}
                  placeholderTextColor={colors.textLight}
                />
                <Text style={styles.formLabel}>Commission Value</Text>
                <TextInput
                  style={styles.formInput}
                  value={String(form.commission_value || 0)}
                  onChangeText={(text) => setForm({ ...form, commission_value: parseFloat(text) || 0 })}
                  keyboardType="numeric"
                  placeholderTextColor={colors.textLight}
                />
                <Text style={styles.formLabel}>Partner Share Value</Text>
                <TextInput
                  style={styles.formInput}
                  value={String(form.partner_share_value || 0)}
                  onChangeText={(text) => setForm({ ...form, partner_share_value: parseFloat(text) || 0 })}
                  keyboardType="numeric"
                  placeholderTextColor={colors.textLight}
                />
                <Text style={styles.formLabel}>Team Member Share Value</Text>
                <TextInput
                  style={styles.formInput}
                  value={String(form.team_member_share_value || 0)}
                  onChangeText={(text) => setForm({ ...form, team_member_share_value: parseFloat(text) || 0 })}
                  keyboardType="numeric"
                  placeholderTextColor={colors.textLight}
                />
                <Text style={styles.formLabel}>Min Commission</Text>
                <TextInput
                  style={styles.formInput}
                  value={String(form.min_commission || 0)}
                  onChangeText={(text) => setForm({ ...form, min_commission: parseFloat(text) || 0 })}
                  keyboardType="numeric"
                  placeholderTextColor={colors.textLight}
                />
                <Text style={styles.formLabel}>Max Commission</Text>
                <TextInput
                  style={styles.formInput}
                  value={String(form.max_commission || 0)}
                  onChangeText={(text) => setForm({ ...form, max_commission: parseFloat(text) || 0 })}
                  keyboardType="numeric"
                  placeholderTextColor={colors.textLight}
                />
              </View>
            )}

            {activeTab === 'seo' && (
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>SEO Title</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.seo_title}
                  onChangeText={(text) => setForm({ ...form, seo_title: text })}
                  placeholderTextColor={colors.textLight}
                />
                <Text style={styles.formLabel}>SEO Description</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  value={form.seo_description}
                  onChangeText={(text) => setForm({ ...form, seo_description: text })}
                  multiline
                  numberOfLines={4}
                  placeholderTextColor={colors.textLight}
                />
                <Text style={styles.formLabel}>SEO Keywords</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  value={form.seo_keywords}
                  onChangeText={(text) => setForm({ ...form, seo_keywords: text })}
                  multiline
                  numberOfLines={4}
                  placeholderTextColor={colors.textLight}
                />
              </View>
            )}

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveProduct}>
              <Text style={styles.saveButtonText}>Save Product</Text>
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
  productsContainer: {
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
  productCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 4,
  },
  bankName: {
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
  productDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  detailItem: {
    width: '50%',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textLight,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontWeight: typography.weights.semibold,
  },
  productActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
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
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  deleteButtonText: {
    color: '#FFFFFF',
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: colors.card,
  },
  filterLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textLight,
    marginRight: 8,
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.bg,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: typography.weights.bold,
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: typography.sizes.sm,
    color: colors.textLight,
    fontWeight: typography.weights.semibold,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formSection: {
    gap: 16,
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
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    marginTop: 16,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
});
