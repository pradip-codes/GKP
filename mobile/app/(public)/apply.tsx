import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Icon } from '../../components/Icon';
import {
  sendCardApplicationOtp,
  verifyCardApplicationOtp,
  submitCardApplication,
} from '../../services/application.service';

type Step = 'details' | 'otp' | 'success';

export default function InstantApplyScreen() {
  const params = useLocalSearchParams<{
    partnerCode?: string;
    partner_code?: string;
    productId?: string;
    product_id?: string;
    token?: string;
    productName?: string;
    product_name?: string;
    bankName?: string;
    bank_name?: string;
    category?: string;
  }>();

  const productName = params.productName || params.product_name || 'Credit Card';
  const bankName = params.bankName || params.bank_name || 'Bank';
  const category = params.category || 'credit_card';

  const [step, setStep] = useState<Step>('details');
  const [customerName, setCustomerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successApp, setSuccessApp] = useState<any>(null);

  useEffect(() => {
    if (otpTimer <= 0) return undefined;
    const t = setTimeout(() => setOtpTimer((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [otpTimer]);

  const handleSendOtp = async () => {
    setErrorMsg('');
    if (!customerName.trim()) {
      setErrorMsg('Enter your name.');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setErrorMsg('Enter a valid 10-digit mobile number.');
      return;
    }
    setLoading(true);
    try {
      const res = await sendCardApplicationOtp(mobile);
      if (res?.success === false) throw new Error(res.message || 'Could not send OTP. Try again.');
      setOtp('');
      setOtpTimer(120);
      setStep('otp');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await sendCardApplicationOtp(mobile);
      if (res?.success === false) throw new Error(res.message || 'Could not resend OTP. Try again.');
      setOtp('');
      setOtpTimer(120);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not resend OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setErrorMsg('');
    if (!/^\d{6}$/.test(otp)) {
      setErrorMsg('Enter the 6-digit OTP.');
      return;
    }
    setLoading(true);
    try {
      const verifyRes = await verifyCardApplicationOtp(mobile, otp);
      if (verifyRes?.success === false) {
        throw new Error(verifyRes.message || 'Incorrect OTP. Try again.');
      }

      // OTP verified — save the application (same as website flow)
      const submitRes = await submitCardApplication({
        customerName: customerName.trim(),
        mobile,
        bankName,
        cardName: productName,
        category,
      });
      const appData = submitRes?.data;
      if (!appData) {
        throw new Error('Could not save your application. Try again.');
      }
      setSuccessApp(appData);
      setStep('success');
    } catch (err: any) {
      setErrorMsg(err?.message || 'OTP verification failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const headerTitle =
    step === 'success' ? 'Mobile verified' : 'Continue your application';
  const headerSub =
    step === 'details'
      ? productName
      : step === 'otp'
        ? `OTP sent to +91 ${mobile}`
        : 'Taking you to the application…';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Icon name="chevron-left" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{headerTitle}</Text>
            <Text style={styles.headerSub} numberOfLines={1}>{headerSub}</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
        >
          {/* Product card */}
          <View style={styles.productCard}>
            <View style={styles.productIcon}>
              <Icon name="card" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.productName} numberOfLines={1}>{productName}</Text>
              <Text style={styles.productBank}>{bankName}</Text>
            </View>
          </View>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Icon name="alert-circle" size={14} color="#FCA5A5" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {step === 'details' && (
            <View style={styles.form}>
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                style={styles.fieldInput}
                value={customerName}
                onChangeText={setCustomerName}
                placeholder="Your name"
                placeholderTextColor={colors.textLight}
                autoComplete="name"
              />

              <Text style={styles.fieldLabel}>Mobile number</Text>
              <View style={styles.mobileRow}>
                <View style={styles.prefixBox}>
                  <Text style={styles.prefixText}>+91</Text>
                </View>
                <TextInput
                  style={[styles.fieldInput, { flex: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
                  value={mobile}
                  onChangeText={(t) => setMobile(t.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit mobile number"
                  placeholderTextColor={colors.textLight}
                  keyboardType="phone-pad"
                  maxLength={10}
                  autoComplete="tel"
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
                onPress={handleSendOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Send OTP</Text>
                )}
              </TouchableOpacity>

              <View style={styles.lockNote}>
                <Icon name="lock" size={11} color={colors.textLight} />
                <Text style={styles.lockNoteText}>Mobile verification is required to continue.</Text>
              </View>
            </View>
          )}

          {step === 'otp' && (
            <View style={styles.form}>
              <Text style={styles.fieldLabel}>6-digit OTP</Text>
              <TextInput
                style={[styles.fieldInput, styles.otpInput]}
                value={otp}
                onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter OTP"
                placeholderTextColor={colors.textLight}
                keyboardType="number-pad"
                maxLength={6}
                autoComplete="sms-otp"
              />

              <TouchableOpacity
                style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
                onPress={handleVerifyOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Verify and continue</Text>
                )}
              </TouchableOpacity>

              <View style={styles.otpFooter}>
                <TouchableOpacity
                  onPress={() => {
                    setStep('details');
                    setErrorMsg('');
                    setOtp('');
                  }}
                >
                  <Text style={styles.linkText}>Change number</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.back()}>
                  <Text style={[styles.linkText, { color: '#F87171' }]}>Cancel</Text>
                </TouchableOpacity>
                {otpTimer > 0 ? (
                  <Text style={styles.timerText}>Resend in {otpTimer}s</Text>
                ) : (
                  <TouchableOpacity onPress={handleResendOtp} disabled={loading}>
                    <Text style={styles.linkText}>Resend OTP</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {step === 'success' && successApp && (
            <View style={styles.successBox}>
              <View style={styles.successIcon}>
                <Icon name="check-circle" size={44} color="#10B981" />
              </View>
              <Text style={styles.successTitle}>Application Submitted!</Text>
              <Text style={styles.successSub}>
                Your {productName} application has been recorded successfully.
              </Text>
              <View style={styles.refBox}>
                <Text style={styles.refLabel}>APPLICATION NUMBER</Text>
                <Text style={styles.refNumber}>
                  {successApp.app_number || successApp.id || 'Pending'}
                </Text>
              </View>
              <Text style={styles.nextSteps}>
                Next Step: Keep your PAN & Aadhaar ready. Our bank relationship manager will contact you for verification.
              </Text>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => router.replace('/(public)/track-application' as any)}
              >
                <Text style={styles.primaryBtnText}>Track Application Status</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B1120' },
  container: { flex: 1, backgroundColor: '#0B1120' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backBtn: { marginRight: spacing.sm, padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  body: { padding: spacing.md, paddingBottom: spacing.xl },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  productIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productName: { fontSize: 14, fontWeight: '800', color: '#fff' },
  productBank: { fontSize: 11, color: colors.textLight, marginTop: 2 },
  form: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: spacing.md,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMid,
    marginBottom: 6,
    marginTop: spacing.xs,
  },
  fieldInput: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 14,
    color: '#fff',
    marginBottom: spacing.sm,
  },
  mobileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  prefixBox: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    borderRightWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  prefixText: { fontSize: 14, fontWeight: '700', color: colors.textMid },
  otpInput: { letterSpacing: 6, textAlign: 'center', fontSize: 18, fontWeight: '800' },
  primaryBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  lockNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
  },
  lockNoteText: { fontSize: 11, color: colors.textLight },
  otpFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  linkText: { fontSize: 12, fontWeight: '700', color: '#60A5FA' },
  timerText: { fontSize: 12, color: colors.textLight },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 10,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: { flex: 1, fontSize: 12, color: '#FCA5A5' },
  successBox: { alignItems: 'center', paddingVertical: spacing.lg },
  successIcon: { marginBottom: spacing.sm },
  successTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
  successSub: { fontSize: 13, color: colors.textLight, marginTop: 6, textAlign: 'center' },
  refBox: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
    width: '100%',
  },
  refLabel: { fontSize: 10, fontWeight: '800', color: '#60A5FA', letterSpacing: 1 },
  refNumber: { fontSize: 20, fontWeight: '900', color: '#fff', marginTop: 4, letterSpacing: 1 },
  nextSteps: {
    fontSize: 12,
    color: colors.textMid,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 18,
  },
});
