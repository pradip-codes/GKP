import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import apiClient from '../../services/api';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { Video } from 'expo-av';

interface Partner {
  id: string;
  partner_code?: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  email?: string;
  mobile?: string;
  status: string;
  kyc_status?: string;
  parent_code?: string;
  created_at?: string;
  kyc_documents?: any[];
  partner_video?: any;
  parent_partner_id?: string;
  team_status?: string;
  allow_team_creation?: boolean;
  wallet_balance?: number;
}

interface KycDocument {
  id: string;
  doc_type: string;
  document_url?: string;
  signed_url?: string;
  verification_status?: string;
  rejection_reason?: string;
}

export default function AdminPartnersScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [kycFilter, setKycFilter] = useState<string>('all');

  // Partner details modal state
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Document verification state
  const [docReviews, setDocReviews] = useState<Record<string, string | null>>({});
  const [docRejectReasons, setDocRejectReasons] = useState<Record<string, string>>({});
  const [activeRejectDoc, setActiveRejectDoc] = useState<string | null>(null);
  const [rejectText, setRejectText] = useState('');

  // Video player state
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [showVideoModal, setShowVideoModal] = useState(false);

  // Wallet adjustment state
  const [showWalletForm, setShowWalletForm] = useState(false);
  const [walletForm, setWalletForm] = useState({ amount: '', txn_type: 'credit', description: '' });

  useEffect(() => {
    fetchPartners();
  }, [statusFilter, kycFilter]);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = { limit: '100' };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (kycFilter !== 'all') params.kyc_status = kycFilter;
      const response = await apiClient.get('/admin/partners', { params });
      setPartners(response.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch partners:', error);
      Alert.alert('Error', 'Failed to load partners');
    } finally {
      setLoading(false);
    }
  };

  const fetchPartnerProfile = async (partnerId: string) => {
    try {
      setLoadingProfile(true);
      const response = await apiClient.get(`/Partners/${partnerId}/profile`);
      if (response.data?.success) {
        setPartnerProfile(response.data.data);
        const profile = response.data.data;

        // Initialize document reviews
        const initialReviews: Record<string, string | null> = {};
        const initialReasons: Record<string, string> = {};

        if (profile.partner_video) {
          initialReviews['video'] = profile.partner_video.verification_status || null;
          initialReasons['video'] = profile.partner_video.rejection_reason || '';
        }

        profile.kyc_documents?.forEach((doc: any) => {
          initialReviews[doc.doc_type] = doc.verification_status || null;
          initialReasons[doc.doc_type] = doc.rejection_reason || '';
        });

        setDocReviews(initialReviews);
        setDocRejectReasons(initialReasons);

        // Set video URL
        const videoDoc = profile.partner_video;
        if (videoDoc) {
          const vUrl = videoDoc.signed_url || videoDoc.video_url;
          if (vUrl) {
            setVideoUrl(vUrl);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch partner profile:', error);
      Alert.alert('Error', 'Failed to load partner details');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleViewDetails = (partner: Partner) => {
    setSelectedPartner(partner);
    setModalVisible(true);
    fetchPartnerProfile(partner.id);
  };

  const handleDocReview = async (docType: string, status: string) => {
    try {
      await apiClient.post(`/admin/partner/kyc/document/${selectedPartner?.id}/review`, {
        doc_type: docType,
        verification_status: status,
        rejection_reason: status === 'rejected' ? docRejectReasons[docType] : undefined,
      });
      await fetchPartnerProfile(selectedPartner!.id);
      Alert.alert('Success', `Document ${status}`);
    } catch (error) {
      console.error('Failed to review document:', error);
      Alert.alert('Error', 'Failed to update document status');
    }
  };

  const handleWalletAdjustment = async () => {
    if (!walletForm.amount || parseFloat(walletForm.amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    try {
      await apiClient.post(`/admin/partner/${selectedPartner?.id}/wallet/adjust`, walletForm);
      Alert.alert('Success', 'Wallet adjusted successfully');
      setShowWalletForm(false);
      setWalletForm({ amount: '', txn_type: 'credit', description: '' });
      fetchPartnerProfile(selectedPartner!.id);
    } catch (error) {
      console.error('Failed to adjust wallet:', error);
      Alert.alert('Error', 'Failed to adjust wallet');
    }
  };

  const handleKycDecision = async (partnerId: string, approved: boolean) => {
    Alert.alert(
      approved ? 'Approve KYC' : 'Reject KYC',
      `Are you sure you want to ${approved ? 'approve' : 'reject'} this partner's KYC?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: approved ? 'Approve' : 'Reject',
          style: approved ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await apiClient.post('/admin/approve-kyc', {
                partnerId,
                approved,
                ...(approved ? {} : { rejection_reason: 'Rejected by admin' }),
              });
              fetchPartners();
              Alert.alert('Success', `KYC ${approved ? 'approved' : 'rejected'} successfully`);
            } catch (error) {
              console.error('Failed to update KYC:', error);
              Alert.alert('Error', 'Failed to update KYC status');
            }
          },
        },
      ]
    );
  };

  const filteredPartners = partners.filter(p => {
    const haystack = [
      p.first_name,
      p.last_name,
      p.email,
      p.mobile,
      p.partner_code,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(searchText.toLowerCase());
  });

  const statusOptions = ['all', 'active', 'inactive', 'pending', 'suspended'];
  const kycOptions = ['all', 'pending', 'approved', 'rejected'];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading partners...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Partner Management</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search partners..."
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor={colors.textLight}
        />
      </View>

      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Status:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {statusOptions.map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterChip,
                statusFilter === status && styles.filterChipActive
              ]}
              onPress={() => setStatusFilter(status)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === status && styles.filterChipTextActive
                ]}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>KYC:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {kycOptions.map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterChip,
                kycFilter === status && styles.filterChipActive
              ]}
              onPress={() => setKycFilter(status)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  kycFilter === status && styles.filterChipTextActive
                ]}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.partnersContainer}>
        {filteredPartners.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No partners found</Text>
          </View>
        ) : (
          filteredPartners.map((partner) => {
            const kycDecided = partner.kyc_status === 'approved' || partner.kyc_status === 'rejected';
            return (
            <View key={partner.id} style={styles.partnerCard}>
              <View style={styles.partnerHeader}>
                <View style={styles.partnerInfo}>
                  <Text style={styles.partnerName}>
                    {`${partner.first_name || 'Partner'} ${partner.last_name || ''}`.trim()}
                  </Text>
                  <Text style={styles.partnerEmail}>{partner.email || '—'}</Text>
                  <Text style={styles.partnerPhone}>{partner.mobile || ''}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(partner.status) }
                  ]}
                >
                  <Text style={styles.statusText}>
                    {(partner.status || 'unknown').charAt(0).toUpperCase() + (partner.status || 'unknown').slice(1)}
                  </Text>
                </View>
              </View>

              <View style={styles.partnerStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{partner.partner_code || '—'}</Text>
                  <Text style={styles.statLabel}>Partner Code</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue} numberOfLines={1}>{partner.company_name || '—'}</Text>
                  <Text style={styles.statLabel}>Company</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{partner.parent_code || '—'}</Text>
                  <Text style={styles.statLabel}>Parent</Text>
                </View>
              </View>

              <View style={styles.kycContainer}>
                <Text style={styles.kycLabel}>KYC Status:</Text>
                <Text
                  style={[
                    styles.kycStatus,
                    { color: partner.kyc_status === 'approved' ? '#10B981' : partner.kyc_status === 'rejected' ? '#EF4444' : '#F59E0B' }
                  ]}
                >
                  {(partner.kyc_status || 'pending').charAt(0).toUpperCase() + (partner.kyc_status || 'pending').slice(1)}
                </Text>
              </View>

              {!kycDecided && (
                <View style={styles.kycActions}>
                  <TouchableOpacity
                    style={[styles.kycButton, styles.kycApproveButton]}
                    onPress={() => handleKycDecision(partner.id, true)}
                  >
                    <Text style={styles.kycButtonText}>Approve KYC</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.kycButton, styles.kycRejectButton]}
                    onPress={() => handleKycDecision(partner.id, false)}
                  >
                    <Text style={styles.kycButtonText}>Reject KYC</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                style={styles.viewButton}
                onPress={() => handleViewDetails(partner)}
              >
                <Text style={styles.viewButtonText}>View Details</Text>
              </TouchableOpacity>
            </View>
            );
          })
        )}
      </View>

      {/* Partner Details Modal */}
      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Partner Details</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          {loadingProfile ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : partnerProfile ? (
            <ScrollView style={styles.modalContent}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Basic Information</Text>
                <Text style={styles.infoText}>Name: {selectedPartner?.first_name} {selectedPartner?.last_name}</Text>
                <Text style={styles.infoText}>Email: {selectedPartner?.email}</Text>
                <Text style={styles.infoText}>Mobile: {selectedPartner?.mobile}</Text>
                <Text style={styles.infoText}>Partner Code: {selectedPartner?.partner_code}</Text>
                <Text style={styles.infoText}>Company: {selectedPartner?.company_name}</Text>
                <Text style={styles.infoText}>Wallet Balance: ₹{partnerProfile.wallet_balance || 0}</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Wallet Adjustment</Text>
                <View style={styles.walletForm}>
                  <TextInput
                    style={styles.walletInput}
                    placeholder="Amount"
                    value={walletForm.amount}
                    onChangeText={(text) => setWalletForm({ ...walletForm, amount: text })}
                    keyboardType="numeric"
                    placeholderTextColor={colors.textLight}
                  />
                  <View style={styles.txnTypeButtons}>
                    <TouchableOpacity
                      style={[styles.txnTypeButton, walletForm.txn_type === 'credit' && styles.txnTypeButtonActive]}
                      onPress={() => setWalletForm({ ...walletForm, txn_type: 'credit' })}
                    >
                      <Text style={styles.txnTypeButtonText}>Credit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.txnTypeButton, walletForm.txn_type === 'debit' && styles.txnTypeButtonActive]}
                      onPress={() => setWalletForm({ ...walletForm, txn_type: 'debit' })}
                    >
                      <Text style={styles.txnTypeButtonText}>Debit</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={styles.walletInput}
                    placeholder="Description"
                    value={walletForm.description}
                    onChangeText={(text) => setWalletForm({ ...walletForm, description: text })}
                    placeholderTextColor={colors.textLight}
                  />
                  <TouchableOpacity style={styles.walletSubmitButton} onPress={handleWalletAdjustment}>
                    <Text style={styles.walletSubmitButtonText}>Adjust Wallet</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>KYC Documents</Text>
                {partnerProfile.partner_video && (
                  <View style={styles.docCard}>
                    <Text style={styles.docTitle}>Video KYC</Text>
                    <View style={styles.docStatusBadge}>
                      <Text style={styles.docStatusText}>
                        {partnerProfile.partner_video.verification_status || 'Pending'}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.playVideoButton} onPress={() => setShowVideoModal(true)}>
                      <Text style={styles.playVideoButtonText}>▶ Play Video</Text>
                    </TouchableOpacity>
                    <View style={styles.docActions}>
                      <TouchableOpacity
                        style={[styles.docActionButton, styles.approveDocButton]}
                        onPress={() => handleDocReview('video', 'approved')}
                      >
                        <Text style={styles.docActionButtonText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.docActionButton, styles.rejectDocButton]}
                        onPress={() => {
                          setActiveRejectDoc('video');
                          setRejectText(docRejectReasons['video'] || '');
                        }}
                      >
                        <Text style={styles.docActionButtonText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {partnerProfile.kyc_documents?.map((doc: any) => (
                  <View key={doc.id} style={styles.docCard}>
                    <Text style={styles.docTitle}>{doc.doc_type.replace('_', ' ').toUpperCase()}</Text>
                    <View style={[styles.docStatusBadge, { backgroundColor: doc.verification_status === 'approved' ? '#10B981' : doc.verification_status === 'rejected' ? '#EF4444' : '#F59E0B' }]}>
                      <Text style={styles.docStatusText}>
                        {doc.verification_status || 'Pending'}
                      </Text>
                    </View>
                    {doc.signed_url && (
                      <TouchableOpacity style={styles.viewDocButton}>
                        <Text style={styles.viewDocButtonText}>View Document</Text>
                      </TouchableOpacity>
                    )}
                    <View style={styles.docActions}>
                      <TouchableOpacity
                        style={[styles.docActionButton, styles.approveDocButton]}
                        onPress={() => handleDocReview(doc.doc_type, 'approved')}
                      >
                        <Text style={styles.docActionButtonText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.docActionButton, styles.rejectDocButton]}
                        onPress={() => {
                          setActiveRejectDoc(doc.doc_type);
                          setRejectText(docRejectReasons[doc.doc_type] || '');
                        }}
                      >
                        <Text style={styles.docActionButtonText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : null}
        </View>
      </Modal>

      {/* Video Modal */}
      <Modal visible={showVideoModal} animationType="slide" onRequestClose={() => setShowVideoModal(false)}>
        <View style={styles.videoModalContainer}>
          <View style={styles.videoModalHeader}>
            <Text style={styles.videoModalTitle}>Video KYC</Text>
            <TouchableOpacity onPress={() => setShowVideoModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          {videoUrl ? (
            <Video
              source={{ uri: videoUrl }}
              style={styles.videoPlayer}
              useNativeControls
              resizeMode="contain"
            />
          ) : (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
        </View>
      </Modal>

      {/* Document Rejection Modal */}
      <Modal visible={!!activeRejectDoc} animationType="fade" transparent onRequestClose={() => setActiveRejectDoc(null)}>
        <View style={styles.rejectModalOverlay}>
          <View style={styles.rejectModalContent}>
            <Text style={styles.rejectModalTitle}>Reject Document</Text>
            <Text style={styles.rejectModalSubtitle}>{activeRejectDoc?.replace('_', ' ').toUpperCase()}</Text>
            <TextInput
              style={styles.rejectReasonInput}
              placeholder="Enter rejection reason..."
              value={rejectText}
              onChangeText={setRejectText}
              multiline
              numberOfLines={4}
              placeholderTextColor={colors.textLight}
            />
            <View style={styles.rejectModalActions}>
              <TouchableOpacity
                style={[styles.rejectModalButton, styles.cancelRejectButton]}
                onPress={() => setActiveRejectDoc(null)}
              >
                <Text style={styles.rejectModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rejectModalButton, styles.confirmRejectButton]}
                onPress={async () => {
                  if (activeRejectDoc) {
                    setDocRejectReasons({ ...docRejectReasons, [activeRejectDoc]: rejectText });
                    await handleDocReview(activeRejectDoc, 'rejected');
                    setActiveRejectDoc(null);
                    setRejectText('');
                  }
                }}
              >
                <Text style={styles.rejectModalButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return '#10B981';
    case 'inactive': return '#6B7280';
    case 'pending': return '#F59E0B';
    case 'suspended': return '#EF4444';
    default: return '#6B7280';
  }
};

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
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: colors.card,
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
  partnersContainer: {
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
  partnerCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  partnerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  partnerInfo: {
    flex: 1,
  },
  partnerName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 4,
  },
  partnerEmail: {
    fontSize: typography.sizes.sm,
    color: colors.textLight,
    marginBottom: 2,
  },
  partnerPhone: {
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
  partnerStats: {
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
  kycContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  kycLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textLight,
    marginRight: 8,
  },
  kycStatus: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  kycActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  kycButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  kycApproveButton: {
    backgroundColor: '#10B981',
  },
  kycRejectButton: {
    backgroundColor: '#EF4444',
  },
  kycButtonText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  viewButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewButtonText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  filterLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textLight,
    marginRight: 8,
    marginBottom: 8,
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
  section: {
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
  infoText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    marginBottom: 8,
  },
  walletForm: {
    gap: 12,
  },
  walletInput: {
    backgroundColor: colors.bg,
    borderRadius: 8,
    padding: 12,
    fontSize: typography.sizes.sm,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  txnTypeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  txnTypeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  txnTypeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  txnTypeButtonText: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  walletSubmitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  walletSubmitButtonText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  docCard: {
    backgroundColor: colors.bg,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  docTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 8,
  },
  docStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F59E0B',
    marginBottom: 8,
  },
  docStatusText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  playVideoButton: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 8,
  },
  playVideoButtonText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  viewDocButton: {
    backgroundColor: colors.bg,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  viewDocButtonText: {
    color: colors.primary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  docActions: {
    flexDirection: 'row',
    gap: 8,
  },
  docActionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  approveDocButton: {
    backgroundColor: '#10B981',
  },
  rejectDocButton: {
    backgroundColor: '#EF4444',
  },
  docActionButtonText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  videoModalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  videoModalTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
  },
  videoPlayer: {
    flex: 1,
    margin: 20,
    borderRadius: 8,
  },
  rejectModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  rejectModalContent: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    width: '100%',
  },
  rejectModalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 4,
  },
  rejectModalSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textLight,
    marginBottom: 16,
  },
  rejectReasonInput: {
    backgroundColor: colors.bg,
    borderRadius: 8,
    padding: 12,
    fontSize: typography.sizes.sm,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    minHeight: 80,
  },
  rejectModalActions: {
    flexDirection: 'row',
    gap: 8,
  },
  rejectModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelRejectButton: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  confirmRejectButton: {
    backgroundColor: '#EF4444',
  },
  rejectModalButtonText: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
});
