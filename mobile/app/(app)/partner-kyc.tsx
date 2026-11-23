import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePickerVideo from 'expo-image-picker';
import { useTheme } from '../../contexts/ThemeContext';
import { Icon } from '../../components/Icon';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import apiClient from '../../services/api';
import {
  fetchPartnerKycDetails,
  fetchPartnerKycStatus,
  submitPartnerKycPan,
  submitPartnerKycCheque,
  submitPartnerKycFinal,
} from '../../services/partner.service';

export default function PartnerKycScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [kycData, setKycData] = useState<any>(null);

  // Form states
  const [panNumber, setPanNumber] = useState<string>('');
  const [panImageUri, setPanImageUri] = useState<string | null>(null);

  const [accountNumber, setAccountNumber] = useState<string>('');
  const [ifscCode, setIfscCode] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [accountHolderName, setAccountHolderName] = useState<string>('');
  const [chequeImageUri, setChequeImageUri] = useState<string | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState<boolean>(false);

  const loadKyc = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await fetchPartnerKycDetails();
      if (res?.success && res.data) {
        setKycData(res.data);
        const panDoc = res.data.documents?.find((d: any) => d.doc_type === 'pan');
        setPanNumber(panDoc?.doc_number || res.data.partner?.pan_number || '');
        const bank = res.data.bank_details;
        if (bank) {
          setAccountHolderName(bank.account_holder_name || '');
          setAccountNumber(bank.account_number || '');
          setIfscCode(bank.ifsc_code || '');
          setBankName(bank.bank_name || '');
        }
      }
    } catch (e) {
      // Fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadKyc();
  }, [loadKyc]);

  const handlePickImage = async (type: 'pan' | 'cheque') => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Storage permission is required to upload documents.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        if (type === 'pan') {
          setPanImageUri(result.assets[0].uri);
        } else {
          setChequeImageUri(result.assets[0].uri);
        }
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const handlePickVideo = async () => {
    try {
      const permission = await ImagePickerVideo.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Storage permission is required to upload video.');
        return;
      }

      const result = await ImagePickerVideo.launchImageLibraryAsync({
        mediaTypes: ImagePickerVideo.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setVideoUri(result.assets[0].uri);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to select video');
    }
  };

  const handleUploadVideo = async () => {
    if (!videoUri) {
      Alert.alert('No Video Selected', 'Please select a video first.');
      return;
    }

    try {
      setUploadingVideo(true);
      const formData = new FormData();
      formData.append('video', {
        uri: videoUri,
        type: 'video/mp4',
        name: 'kyc_verification_video.mp4',
      } as any);

      await apiClient.post('/partner/kyc/upload-video', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      Alert.alert('Success', 'Video uploaded successfully for face verification.');
      loadKyc();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to upload video');
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleSavePan = async () => {
    if (!panNumber.trim() || panNumber.trim().length !== 10) {
      Alert.alert('Invalid PAN', 'Please enter a valid 10-character PAN number.');
      return;
    }

    try {
      setSubmitting(true);
      await submitPartnerKycPan(panNumber.trim().toUpperCase(), panImageUri || undefined);
      Alert.alert('Success', 'PAN card details saved successfully.');
      loadKyc();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save PAN details');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveBank = async () => {
    if (!accountNumber.trim() || !ifscCode.trim()) {
      Alert.alert('Required Fields', 'Account number and IFSC code are required.');
      return;
    }

    try {
      setSubmitting(true);
      await submitPartnerKycCheque({
        account_number: accountNumber.trim(),
        ifsc_code: ifscCode.trim().toUpperCase(),
        bank_name: bankName.trim() || undefined,
        account_holder_name: accountHolderName.trim() || undefined,
        chequeImageUri: chequeImageUri || undefined,
      });
      Alert.alert('Success', 'Bank details & cheque proof submitted successfully.');
      loadKyc();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save bank details');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (uploadedCount < 3) {
      Alert.alert('Incomplete KYC', 'Please upload all 3 items first: PAN Card, Cancelled Cheque / Bank Proof, and Verification Video.');
      return;
    }
    try {
      setSubmitting(true);
      const res = await submitPartnerKycFinal();
      Alert.alert('KYC Submitted! 🎉', res.message || 'Your KYC has been submitted for review by the compliance team.');
      loadKyc();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit KYC for review');
    } finally {
      setSubmitting(false);
    }
  };

  const kycStatus = (kycData?.kyc_status || 'draft').toLowerCase();
  const isApproved = kycStatus === 'approved';
  const isUnderReview = kycStatus === 'under_review';
  const isRejected = kycStatus === 'rejected';
  const rejectionReason = kycData?.rejection_reason;

  const getDoc = (type: string) => kycData?.documents?.find((d: any) => d.doc_type === type);
  const docStatus = (type: string) => {
    const doc = getDoc(type);
    if (!doc) return 'missing';
    return doc.verification_status || 'pending';
  };
  const videoUploaded = !!kycData?.video;
  const videoStatus = kycData?.video?.verification_status || (videoUploaded ? 'pending' : 'missing');
  const uploadedCount = [docStatus('pan'), docStatus('cancelled_cheque'), videoStatus].filter((s) => s !== 'missing').length;

  const statusMeta: Record<string, { label: string; bg: string; fg: string }> = {
    approved: { label: 'Approved', bg: '#DCFCE7', fg: '#059669' },
    pending: { label: 'Pending Review', bg: '#FEF3C7', fg: '#D97706' },
    rejected: { label: 'Rejected', bg: '#FEE2E2', fg: '#DC2626' },
    missing: { label: 'Not Uploaded', bg: '#F1F5F9', fg: '#94A3B8' },
  };
  const StatusChip = ({ status }: { status: string }) => {
    const meta = statusMeta[status] || statusMeta.missing;
    return (
      <View style={{ backgroundColor: meta.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: meta.fg }}>{meta.label}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadKyc(true)} colors={[colors.primary]} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="arrow-left" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTextCol}>
            <Text style={styles.title}>Partner KYC Centre</Text>
            <Text style={styles.subtitle}>Verify identity for instant commission settlements</Text>
          </View>
        </View>

        {/* Status Card - Website Style */}
        <View style={[styles.statusCard, isApproved ? styles.statusCardApproved : isRejected ? styles.statusCardRejected : styles.statusCardPending]}>
          <View style={styles.statusRow}>
            <View style={[styles.statusIconBg, { backgroundColor: isApproved ? '#DCFCE7' : isRejected ? '#FEE2E2' : '#FEF3C7' }]}>
              <Icon name={isApproved ? 'check-circle' : isRejected ? 'alert-circle' : 'clock'} size={20} color={isApproved ? '#059669' : isRejected ? '#DC2626' : '#D97706'} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.statusHeading}>
                {isApproved ? 'KYC Approved' : isUnderReview ? 'KYC Under Review' : isRejected ? 'KYC Rejected' : 'KYC Pending'}
              </Text>
              <Text style={styles.statusDescription}>
                {isApproved
                  ? 'Your account is verified. You have full access to withdrawals & payouts.'
                  : isUnderReview
                  ? 'Your documents have been submitted and are pending compliance team approval.'
                  : isRejected
                  ? `Reason: ${rejectionReason || 'Document needs correction'}. Please re-upload the rejected items below.`
                  : `Submit your PAN card, bank details and verification video — ${uploadedCount} of 3 items uploaded.`}
              </Text>
            </View>
          </View>
        </View>

        {/* Step 1: PAN Card - Website Style */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
              <Text style={styles.stepNumText}>1</Text>
            </View>
            <Text style={styles.sectionTitle}>PAN Card Verification</Text>
            <View style={{ flex: 1 }} />
            <StatusChip status={docStatus('pan')} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>10-Digit PAN Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. ABCDE1234F"
              placeholderTextColor="#94A3B8"
              autoCapitalize="characters"
              maxLength={10}
              value={panNumber}
              onChangeText={setPanNumber}
            />
          </View>

          <TouchableOpacity style={styles.uploadBtn} onPress={() => handlePickImage('pan')}>
            <Icon name="camera" size={16} color={colors.primary} />
            <Text style={styles.uploadBtnText}>
              {panImageUri ? 'PAN Image Attached ✓' : 'Upload PAN Document Photo'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveBtn, submitting && styles.btnDisabled]}
            onPress={handleSavePan}
            disabled={submitting}
          >
            <Text style={styles.saveBtnText}>Save PAN Details</Text>
          </TouchableOpacity>
        </View>

        {/* Step 2: Bank Account & Cancelled Cheque */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>2</Text>
            </View>
            <Text style={styles.sectionTitle}>Bank Account & Payout Details</Text>
            <View style={{ flex: 1 }} />
            <StatusChip status={docStatus('cancelled_cheque')} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Account Holder Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Name as per bank passbook"
              placeholderTextColor="#94A3B8"
              value={accountHolderName}
              onChangeText={setAccountHolderName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Bank Account Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter account number"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={accountNumber}
              onChangeText={setAccountNumber}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>IFSC Code *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. HDFC0000123"
              placeholderTextColor="#94A3B8"
              autoCapitalize="characters"
              maxLength={11}
              value={ifscCode}
              onChangeText={setIfscCode}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Bank Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. HDFC Bank"
              placeholderTextColor="#94A3B8"
              value={bankName}
              onChangeText={setBankName}
            />
          </View>

          <TouchableOpacity style={styles.uploadBtn} onPress={() => handlePickImage('cheque')}>
            <Icon name="file-text" size={16} color={colors.primary} />
            <Text style={styles.uploadBtnText}>
              {chequeImageUri ? 'Cheque / Passbook Attached ✓' : 'Upload Cancelled Cheque / Passbook'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveBtn, submitting && styles.btnDisabled]}
            onPress={handleSaveBank}
            disabled={submitting}
          >
            <Text style={styles.saveBtnText}>Save Bank Details</Text>
          </TouchableOpacity>
        </View>

        {/* Step 3: Face Verification Video */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>3</Text>
            </View>
            <Text style={styles.sectionTitle}>Face Verification Video</Text>
            <View style={{ flex: 1 }} />
            <StatusChip status={videoStatus} />
          </View>

          <Text style={styles.inputDescription}>
            Upload a short video (max 30 seconds) of yourself holding your PAN card for identity verification.
          </Text>

          {videoUploaded && !videoUri && (
            <View style={styles.videoUploadedNote}>
              <Icon name="check-circle" size={16} color="#059669" />
              <Text style={styles.videoUploadedText}>
                Verification video already uploaded{kycData?.video?.video_duration ? ` (${kycData.video.video_duration}s)` : ''} — status: {videoStatus}
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.uploadBtn} onPress={handlePickVideo}>
            <Icon name="video" size={16} color={colors.primary} />
            <Text style={styles.uploadBtnText}>
              {videoUri ? 'Video Selected ✓' : 'Select Verification Video'}
            </Text>
          </TouchableOpacity>

          {videoUri && (
            <TouchableOpacity
              style={[styles.saveBtn, uploadingVideo && styles.btnDisabled]}
              onPress={handleUploadVideo}
              disabled={uploadingVideo}
            >
              {uploadingVideo ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>Upload Video</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Final Submit for Review */}
        {!isApproved && (
          <TouchableOpacity
            style={[styles.finalSubmitBtn, submitting && styles.btnDisabled]}
            onPress={handleFinalSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.finalSubmitBtnText}>Submit Complete KYC for Approval 🚀</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerTextCol: {
    flex: 1,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textLight,
    marginTop: 2,
  },
  statusCard: {
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  statusCardApproved: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statusCardPending: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  statusCardRejected: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusHeading: {
    fontSize: typography.sizes.sm,
    fontWeight: '800',
    color: colors.text,
  },
  statusDescription: {
    fontSize: typography.sizes.xs,
    color: colors.textLight,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: 8,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: '800',
    color: colors.text,
  },
  inputGroup: {
    marginBottom: spacing.sm,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  inputDescription: {
    fontSize: 12,
    color: colors.textLight,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 12,
    backgroundColor: '#EEF2FF',
    marginVertical: spacing.xs,
  },
  uploadBtnText: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    color: colors.primary,
  },
  saveBtn: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.xs,
    fontWeight: '700',
  },
  finalSubmitBtn: {
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
    elevation: 3,
    shadowColor: '#059669',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  finalSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
    fontWeight: '800',
  },
  videoUploadedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    padding: 10,
    marginBottom: spacing.xs,
  },
  videoUploadedText: {
    flex: 1,
    fontSize: 12,
    color: '#065F46',
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
