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
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { Button } from '../../components/Button';
import {
  fetchDailySalesReports,
  submitDailySalesReport,
} from '../../services/employee.service';
import { fetchBanks } from '../../services/application.service';

export default function EmployeeSalesReportScreen() {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<'submit' | 'history'>('submit');

  // Submit Form State
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [totalCards, setTotalCards] = useState('');
  const [remark, setRemark] = useState('');
  const [bankCounts, setBankCounts] = useState<{ [key: string]: number }>({});
  const [submitting, setSubmitting] = useState(false);
  const [banks, setBanks] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);

  // Photo Upload State
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  // History State
  const [reportsHistory, setReportsHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    loadBanks();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  const loadBanks = async () => {
    setLoadingBanks(true);
    try {
      const res = await fetchBanks();
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setBanks(
        list
          .filter((b: any) => b && (b.id || b.bank_id))
          .map((b: any) => ({ id: String(b.id || b.bank_id), name: b.name || b.bank_name || 'Bank' }))
      );
    } catch (err: any) {
      console.warn('Could not fetch banks:', err);
      setBanks([]);
    } finally {
      setLoadingBanks(false);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetchDailySalesReports();
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setReportsHistory(list);
    } catch (err: any) {
      console.warn('Could not fetch sales reports history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleBankCountChange = (bankId: string, countStr: string) => {
    const val = parseInt(countStr) || 0;
    const updated = { ...bankCounts, [bankId]: val };
    setBankCounts(updated);

    // Auto-calculate sum
    const total = Object.values(updated).reduce((sum, n) => sum + n, 0);
    setTotalCards(String(total));
  };

  const handlePickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
        setShowPhotoModal(false);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick photo');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
        setShowPhotoModal(false);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleRemovePhoto = () => {
    setPhotoUri(null);
  };

  const handleSubmit = async () => {
    const cardsNum = parseInt(totalCards) || 0;
    if (cardsNum <= 0) {
      Alert.alert('Required', 'Please enter total number of cards sold today.');
      return;
    }

    setSubmitting(true);
    try {
      await submitDailySalesReport({
        report_date: reportDate,
        total_cards: cardsNum,
        remark: remark.trim(),
        photo_url: photoUri || undefined,
        banks: Object.entries(bankCounts)
          .filter(([_, count]) => count > 0)
          .map(([bId, count]) => ({
            bank_id: bId,
            bank_name: banks.find((b) => b.id === bId)?.name || 'Bank',
            cards_sold: count,
          })),
      });

      Alert.alert('Report Submitted', 'Your daily sales report has been submitted for team leader verification.');
      setTotalCards('');
      setRemark('');
      setBankCounts({});
      setPhotoUri(null);
      setActiveTab('history');
    } catch (err: any) {
      Alert.alert('Submission Failed', err.message || 'Could not submit sales report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Icon name="chevron-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: spacing.xs }}>
          <Text style={styles.headerSubtitle}>EMPLOYEE PORTAL</Text>
          <Text style={styles.headerTitle}>Daily Sales Report</Text>
          <Text style={styles.headerDesc}>Submit daily card sales & track history</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'submit' && styles.activeTabBtn]}
          onPress={() => setActiveTab('submit')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'submit' && styles.activeTabBtnText]}>
            Submit Today's Report
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'history' && styles.activeTabBtn]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'history' && styles.activeTabBtnText]}>
            Report History
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'submit' ? (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Daily Cards Log ({reportDate})</Text>
          <Text style={styles.cardSubtitle}>
            Break down the customer cards processed across partnered banks today.
          </Text>

          {/* Bank-wise Breakdown */}
          <Text style={styles.inputLabel}>Bank-wise Card Counts</Text>
          <View style={styles.bankGrid}>
            {loadingBanks ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: spacing.md }} />
            ) : banks.length === 0 ? (
              <Text style={styles.emptyBankText}>
                No banks available for your account. Please contact your administrator.
              </Text>
            ) : (
              banks.map((b) => (
                <View key={b.id} style={styles.bankInputRow}>
                  <Text style={styles.bankNameLabel}>{b.name}</Text>
                  <TextInput
                    style={styles.countInput}
                    placeholder="0"
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                    value={bankCounts[b.id] ? String(bankCounts[b.id]) : ''}
                    onChangeText={(t) => handleBankCountChange(b.id, t)}
                  />
                </View>
              ))
            )}
          </View>

          {/* Total Cards */}
          <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>Total Cards Sold *</Text>
          <TextInput
            style={[styles.textInput, { fontSize: 16, fontWeight: '800', color: '#10B981' }]}
            placeholder="0"
            placeholderTextColor={colors.textLight}
            value={totalCards}
            onChangeText={setTotalCards}
            keyboardType="numeric"
          />

          {/* Remark */}
          <Text style={styles.inputLabel}>Remark / Highlights (Optional)</Text>
          <TextInput
            style={[styles.textInput, { height: 70, textAlignVertical: 'top' }]}
            placeholder="e.g. 2 HDFC Tata Neu cards approved with pre-approved limits."
            placeholderTextColor={colors.textLight}
            value={remark}
            onChangeText={setRemark}
            multiline
            numberOfLines={3}
          />

          {/* Photo Upload Section */}
          <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>Photo Evidence (Optional)</Text>
          {photoUri ? (
            <View style={styles.photoPreviewContainer}>
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
              <TouchableOpacity style={styles.removePhotoBtn} onPress={handleRemovePhoto}>
                <Icon name="x" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.uploadPhotoBtn} onPress={() => setShowPhotoModal(true)}>
              <Icon name="camera" size={20} color={colors.primary} />
              <Text style={styles.uploadPhotoText}>Add Photo Evidence</Text>
            </TouchableOpacity>
          )}

          <Button
            title="Submit Daily Sales Report"
            onPress={handleSubmit}
            loading={submitting}
            style={{ marginTop: spacing.md }}
          />
        </Card>
      ) : (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Sales Report Log</Text>
          <Text style={styles.cardSubtitle}>Past submissions reviewed by Manager / TL.</Text>

          {loadingHistory ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
          ) : reportsHistory.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="file-text" size={36} color={colors.textLight} />
              <Text style={styles.emptyTitle}>No Sales Reports Logged</Text>
              <Text style={styles.emptyDesc}>Submit your end-of-day sales figures above.</Text>
            </View>
          ) : (
            reportsHistory.map((rep, idx) => (
              <View key={rep.id || idx} style={styles.historyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.repDate}>
                    {new Date(rep.report_date || Date.now()).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                  {rep.remark && <Text style={styles.repRemark}>{rep.remark}</Text>}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.repCount}>{rep.total_cards} Cards</Text>
                  <Text
                    style={[
                      styles.repStatus,
                      { color: rep.status === 'Approved' ? '#10B981' : '#F59E0B' },
                    ]}
                  >
                    {rep.status || 'Submitted'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </Card>
      )}
    </ScrollView>

    {/* Photo Selection Modal */}
    <Modal
      visible={showPhotoModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowPhotoModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Photo</Text>
          <TouchableOpacity style={styles.modalOption} onPress={handleTakePhoto}>
            <Icon name="camera" size={24} color={colors.primary} />
            <Text style={styles.modalOptionText}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalOption} onPress={handlePickPhoto}>
            <Icon name="image" size={24} color={colors.primary} />
            <Text style={styles.modalOptionText}>Choose from Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalOption, styles.cancelOption]}
            onPress={() => setShowPhotoModal(false)}
          >
            <Text style={styles.cancelOptionText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: spacing.md,
    backgroundColor: '#0B1120',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  backBtn: {
    marginRight: spacing.sm,
    padding: 4,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1.5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  headerDesc: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 4,
    marginBottom: spacing.md,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTabBtn: {
    backgroundColor: colors.primary,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textLight,
  },
  activeTabBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  card: {
    padding: spacing.lg,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textLight,
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  bankGrid: {
    gap: spacing.xs,
  },
  emptyBankText: {
    fontSize: 12,
    color: colors.textLight,
    fontStyle: 'italic',
    paddingVertical: spacing.sm,
  },
  bankInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bankNameLabel: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
  countInput: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    width: 60,
  },
  textInput: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 13,
    color: '#fff',
    marginBottom: spacing.xs,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginTop: spacing.xs,
  },
  emptyDesc: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: 2,
    textAlign: 'center',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: spacing.sm,
    borderRadius: 10,
    marginBottom: spacing.xs,
  },
  repDate: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  repRemark: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: 2,
  },
  repCount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10B981',
  },
  repStatus: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  uploadPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  uploadPhotoText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  photoPreviewContainer: {
    position: 'relative',
    marginTop: spacing.xs,
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 10,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  modalOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  cancelOption: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#334155',
  },
  cancelOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMid,
    textAlign: 'center',
  },
});
