import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { Icon } from '../../components/Icon';
import { FloatingInput } from '../../components/FloatingInput';
import { registerUser } from '../../services/auth.service';
import { useAuth } from '../../contexts/AuthContext';

const STEPS = ['Personal', 'Business', 'Bank', 'KYC'];

const COMPANY_TYPES = [
  { label: 'Individual', value: 'individual' },
  { label: 'Proprietorship', value: 'proprietorship' },
  { label: 'Partnership', value: 'partnership' },
  { label: 'Pvt. Ltd.', value: 'pvt_ltd' },
];

const INDIAN_BANKS = [
  'State Bank of India',
  'HDFC Bank',
  'ICICI Bank',
  'Axis Bank',
  'Kotak Mahindra Bank',
  'Punjab National Bank',
  'Bank of Baroda',
  'IDFC First Bank',
  'Yes Bank',
  'Federal Bank',
  'RBL Bank',
  'IndusInd Bank',
  'Union Bank of India',
  'Canara Bank',
  'Bank of India',
  'Central Bank of India',
  'Indian Bank',
  'UCO Bank',
  'Bank of Maharashtra',
  'Punjab & Sind Bank',
];

export default function RegisterScreen() {
  const { loginSession } = useAuth();
  const { colors, isDark } = useTheme();

  const [showWelcome, setShowWelcome] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [form, setForm] = useState({
    // Step 0: Personal
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    referralCode: '',
    // Step 1: Business
    companyType: 'individual',
    companyName: '',
    currentAddress: '',
    pincode: '',
    city: '',
    // Step 2: Bank
    bankName: '',
    accountNumber: '',
    confirmAccountNumber: '',
    ifsc: '',
    accountHolderName: '',
    // Step 3: KYC
    pan: '',
    aadhaar: '',
    termsAgreed: true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [bankDropdownVisible, setBankDropdownVisible] = useState(false);
  const [otpMode, setOtpMode] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);

  const updateField = (field: string, val: any) => {
    setForm((prev) => ({ ...prev, [field]: val }));
    setErrorMsg(null);
  };

  // Step Validation
  const validateStep = (stepIdx: number): boolean => {
    if (stepIdx === 0) {
      if (!form.firstName.trim()) {
        setErrorMsg('Please enter your first name');
        return false;
      }
      if (!form.mobile.trim() || form.mobile.trim().length !== 10) {
        setErrorMsg('Please enter a valid 10-digit mobile number');
        return false;
      }
      if (!form.email.trim() || !form.email.includes('@')) {
        setErrorMsg('Please enter a valid email address');
        return false;
      }
      if (!form.password || form.password.length < 6) {
        setErrorMsg('Password must be at least 6 characters');
        return false;
      }
      if (form.password !== form.confirmPassword) {
        setErrorMsg('Passwords do not match');
        return false;
      }
    } else if (stepIdx === 1) {
      if (form.companyType !== 'individual' && !form.companyName.trim()) {
        setErrorMsg('Company name is required for business entities');
        return false;
      }
      if (!form.currentAddress.trim()) {
        setErrorMsg('Please enter your current address');
        return false;
      }
      if (!form.pincode.trim() || form.pincode.trim().length !== 6) {
        setErrorMsg('Please enter a valid 6-digit PIN code');
        return false;
      }
    } else if (stepIdx === 2) {
      if (!form.bankName.trim()) {
        setErrorMsg('Please enter your bank name');
        return false;
      }
      if (!form.accountNumber.trim()) {
        setErrorMsg('Please enter your bank account number');
        return false;
      }
      if (form.confirmAccountNumber && form.accountNumber !== form.confirmAccountNumber) {
        setErrorMsg('Account numbers do not match');
        return false;
      }
      if (!form.ifsc.trim() || form.ifsc.trim().length < 4) {
        setErrorMsg('Please enter a valid IFSC code');
        return false;
      }
    } else if (stepIdx === 3) {
      if (!form.pan.trim() || form.pan.trim().length !== 10) {
        setErrorMsg('Please enter a valid 10-character PAN number');
        return false;
      }
      if (!form.termsAgreed) {
        setErrorMsg('You must agree to the Terms & Conditions to proceed');
        return false;
      }
    }
    setErrorMsg(null);
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < STEPS.length - 1) {
        setCurrentStep((prev) => prev + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handlePrev = () => {
    setErrorMsg(null);
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    } else {
      router.replace('/(auth)/login');
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const payload = {
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        mobile: form.mobile.trim(),
        password: form.password,
        role: 'PARTNER',
        company_type: form.companyType,
        company_name: form.companyName.trim() || `${form.firstName} ${form.lastName}`,
        current_address: form.currentAddress.trim(),
        business_location: form.city.trim() || form.currentAddress.trim(),
        pincode: form.pincode.trim(),
        city: form.city.trim(),
        bank_name: form.bankName.trim(),
        account_number: form.accountNumber.trim(),
        ifsc_code: form.ifsc.trim().toUpperCase(),
        account_holder_name: form.accountHolderName.trim() || `${form.firstName} ${form.lastName}`,
        pan: form.pan.trim().toUpperCase(),
        aadhaar: form.aadhaar.trim() || undefined,
        aadhaar_number: form.aadhaar.trim() || undefined,
        referral_code: form.referralCode.trim() || undefined,
      };

      const res = await registerUser(payload);
      if (res?.success) {
        setSuccessData(res.data || res.partner || res);
        if (res.token && res.user) {
          await loginSession(res.user, res.token, res.refreshToken);
        }
      } else {
        setErrorMsg(res?.message || 'Registration failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration error. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  // ── WELCOME SCREEN (same layout as website PartnerRegister welcome step) ──
  if (showWelcome) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
        <View style={[styles.welcomePage, { backgroundColor: colors.bg }]}>
          {/* Logo */}
          <View style={styles.welcomeLogoWrap}>
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.welcomeLogo}
              resizeMode="contain"
            />
          </View>

          {/* Header text */}
          <View style={styles.welcomeHeader}>
            <Text style={[styles.welcomeTitle, { color: colors.text }]}>
              Welcome to{' '}
              <Text style={{ color: colors.primary }}>GharKaPaisa</Text>
            </Text>
            <Text style={[styles.welcomeSubtitle, { color: colors.textLight }]}>
              India's Trusted Financial Partner Platform
            </Text>
            <Text style={[styles.welcomeDesc, { color: colors.textMid }]}>
              Start earning by offering Credit Cards, Loans, Insurance and Financial Services to your customers.
            </Text>
          </View>

          {/* Illustration — same asset as website welcome step */}
          <View style={styles.welcomeIllustration}>
            <Image
              source={require('../../assets/images/welcome-pg-bg.webp')}
              style={styles.welcomeIllustrationImg}
              resizeMode="contain"
            />
          </View>

          {/* Bottom actions */}
          <View style={styles.welcomeActions}>
            <TouchableOpacity
              style={[styles.welcomePrimaryBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowWelcome(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.welcomePrimaryBtnText}>Get Started</Text>
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800' }}> →</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.replace('/(auth)/login')}
              activeOpacity={0.7}
            >
              <Text style={[styles.welcomeLoginLink, { color: colors.primary }]}>
                Already have an account? Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── SUCCESS CONFIRMATION SCREEN ──
  if (successData) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
        <ScrollView contentContainerStyle={styles.successScroll}>
          <View style={[styles.successCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.successIconCircle}>
              <Icon name="check-circle" size={40} color={colors.primary} />
            </View>
            <Text style={[styles.successTitle, { color: colors.text }]}>Welcome to GharKaPaisa!</Text>
            <Text style={[styles.successSubtitle, { color: colors.textMid }]}>
              Your partner account has been created successfully. Start earning commissions today!
            </Text>

            {successData.partner_code && (
              <View style={[styles.codeBox, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
                <Text style={[styles.codeBoxLabel, { color: colors.textLight }]}>YOUR PARTNER CODE</Text>
                <Text style={[styles.codeBoxValue, { color: colors.primary }]}>{successData.partner_code}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.replace('/(app)/partner-dashboard')}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryActionBtnText}>Go to Partner Dashboard</Text>
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800' }}> →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* ── TOP NAV BAR ── */}
        <View style={[styles.navBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.backNavBtn, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}
            onPress={handlePrev}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 13, color: colors.text }}>{currentStep === 0 ? '← Sign In' : '← Back'}</Text>
          </TouchableOpacity>

          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />

          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login')}
            activeOpacity={0.7}
          >
            <Text style={[styles.signInLink, { color: colors.primary }]}>Sign In</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── HEADER CARD & STEP TIMELINE ── */}
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.badgeRow}>
              <View style={styles.partnerBadge}>
                <Text style={styles.partnerBadgeText}>Partner Program</Text>
              </View>
            </View>

            <Text style={[styles.mainTitle, { color: colors.text }]}>Register as Partner / DSA</Text>
            <Text style={[styles.mainSubtitle, { color: colors.textMid }]}>
              Earn top commissions, track leads in real-time, and expand your financial business
            </Text>

            {/* 4-Step Progress Indicator */}
            <View style={styles.stepProgressRow}>
              {STEPS.map((stepLabel, idx) => {
                const isActive = idx === currentStep;
                const isCompleted = idx < currentStep;

                return (
                  <React.Fragment key={stepLabel}>
                    <View style={styles.stepIndicatorNode}>
                      <View
                        style={[
                          styles.stepCircle,
                          {
                            backgroundColor: isActive
                              ? colors.primary
                              : isCompleted
                              ? '#10B981'
                              : colors.bgSecondary,
                            borderColor: isActive
                              ? colors.primary
                              : isCompleted
                              ? '#10B981'
                              : colors.border,
                          },
                        ]}
                      >
                        {isCompleted ? (
                          <Icon name="check" size={12} color="#FFF" />
                        ) : (
                          <Text
                            style={[
                              styles.stepNumberText,
                              { color: isActive ? '#FFF' : colors.textLight },
                            ]}
                          >
                            {idx + 1}
                          </Text>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.stepNodeLabel,
                          {
                            color: isActive
                              ? colors.primary
                              : isCompleted
                              ? colors.text
                              : colors.textLight,
                            fontWeight: isActive ? '800' : '600',
                          },
                        ]}
                      >
                        {stepLabel}
                      </Text>
                    </View>

                    {idx < STEPS.length - 1 && (
                      <View
                        style={[
                          styles.stepLine,
                          {
                            backgroundColor: isCompleted ? '#10B981' : colors.border,
                          },
                        ]}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </View>

            {/* Error Banner */}
            {errorMsg && (
              <View style={styles.errorBanner}>
                <Icon name="alert-circle" size={14} color={colors.error} />
                <Text style={styles.errorBannerText}>{errorMsg}</Text>
              </View>
            )}

            {/* ── STEP 0: Personal Details ── */}
            {currentStep === 0 && (
              <View style={styles.stepForm}>
                <Text style={[styles.stepSectionHeading, { color: colors.text }]}>1. Personal Information</Text>

                <View style={styles.twoColRow}>
                  <View style={{ flex: 1 }}>
                    <FloatingInput
                      label="First Name *"
                      icon="person"
                      value={form.firstName}
                      onChangeText={(t) => updateField('firstName', t)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FloatingInput
                      label="Last Name"
                      icon="person"
                      value={form.lastName}
                      onChangeText={(t) => updateField('lastName', t)}
                    />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <FloatingInput
                    label="Mobile Number *"
                    icon="call"
                    prefix="+91"
                    value={form.mobile}
                    onChangeText={(t) => updateField('mobile', t)}
                    keyboardType="number-pad"
                    maxLength={10}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <FloatingInput
                    label="Email Address *"
                    icon="mail"
                    value={form.email}
                    onChangeText={(t) => updateField('email', t)}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <FloatingInput
                    label="Password (Min. 6 chars) *"
                    icon="lock"
                    value={form.password}
                    onChangeText={(t) => updateField('password', t)}
                    secureTextEntry={!showPassword}
                    rightElement={
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 6 }}>
                        <Icon name={showPassword ? 'eye' : 'eye-off'} size={15} color={colors.textLight} />
                      </TouchableOpacity>
                    }
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <FloatingInput
                    label="Confirm Password *"
                    icon="lock"
                    value={form.confirmPassword}
                    onChangeText={(t) => updateField('confirmPassword', t)}
                    secureTextEntry={!showConfirmPassword}
                    rightElement={
                      <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ padding: 6 }}>
                        <Icon name={showConfirmPassword ? 'eye' : 'eye-off'} size={15} color={colors.textLight} />
                      </TouchableOpacity>
                    }
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <FloatingInput
                    label="Referral Code (Optional)"
                    icon="gift"
                    value={form.referralCode}
                    onChangeText={(t) => updateField('referralCode', t)}
                    autoCapitalize="characters"
                  />
                </View>
              </View>
            )}

            {/* ── STEP 1: Business Details ── */}
            {currentStep === 1 && (
              <View style={styles.stepForm}>
                <Text style={[styles.stepSectionHeading, { color: colors.text }]}>2. Business & Location</Text>

                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>Entity / Company Type</Text>
                  <View style={styles.pillsRow}>
                    {COMPANY_TYPES.map((type) => {
                      const selected = form.companyType === type.value;
                      return (
                        <TouchableOpacity
                          key={type.value}
                          style={[
                            styles.companyPill,
                            {
                              backgroundColor: selected ? `${colors.primary}15` : colors.bgSecondary,
                              borderColor: selected ? colors.primary : colors.border,
                            },
                          ]}
                          onPress={() => updateField('companyType', type.value)}
                        >
                          <Text
                            style={[
                              styles.companyPillText,
                              { color: selected ? colors.primary : colors.text, fontWeight: selected ? '800' : '600' },
                            ]}
                          >
                            {type.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <FloatingInput
                    label="Company / Agency Name"
                    icon="storefront"
                    value={form.companyName}
                    onChangeText={(t) => updateField('companyName', t)}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <FloatingInput
                    label="Office / Current Address *"
                    icon="location"
                    value={form.currentAddress}
                    onChangeText={(t) => updateField('currentAddress', t)}
                    multiline
                  />
                </View>

                <View style={styles.twoColRow}>
                  <View style={{ flex: 1 }}>
                    <FloatingInput
                      label="PIN Code *"
                      icon="map"
                      value={form.pincode}
                      onChangeText={(t) => updateField('pincode', t)}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FloatingInput
                      label="City"
                      icon="location"
                      value={form.city}
                      onChangeText={(t) => updateField('city', t)}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* ── STEP 2: Bank Details ── */}
            {currentStep === 2 && (
              <View style={styles.stepForm}>
                <Text style={[styles.stepSectionHeading, { color: colors.text }]}>3. Payout & Bank Account</Text>
                <Text style={[styles.stepSubDesc, { color: colors.textMid }]}>
                  Your commissions will be directly deposited into this verified bank account.
                </Text>

                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>Bank Name *</Text>
                  <TouchableOpacity
                    style={[styles.dropdownTrigger, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}
                    onPress={() => setBankDropdownVisible(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dropdownText, { color: form.bankName ? colors.text : colors.textLight }]}>
                      {form.bankName || 'Select your bank'}
                    </Text>
                    <Icon name="chevron-down" size={14} color={colors.textLight} />
                  </TouchableOpacity>
                </View>

                <View style={styles.fieldGroup}>
                  <FloatingInput
                    label="Account Number *"
                    icon="wallet"
                    value={form.accountNumber}
                    onChangeText={(t) => updateField('accountNumber', t)}
                    keyboardType="number-pad"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <FloatingInput
                    label="Confirm Account Number"
                    icon="wallet"
                    value={form.confirmAccountNumber}
                    onChangeText={(t) => updateField('confirmAccountNumber', t)}
                    keyboardType="number-pad"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <FloatingInput
                    label="IFSC Code *"
                    icon="pricetag"
                    value={form.ifsc}
                    onChangeText={(t) => updateField('ifsc', t)}
                    autoCapitalize="characters"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <FloatingInput
                    label="Account Holder Name"
                    icon="person"
                    value={form.accountHolderName}
                    onChangeText={(t) => updateField('accountHolderName', t)}
                  />
                </View>
              </View>
            )}

            {/* ── STEP 3: KYC Details ── */}
            {currentStep === 3 && (
              <View style={styles.stepForm}>
                <Text style={[styles.stepSectionHeading, { color: colors.text }]}>4. Identity & Verification</Text>

                <View style={styles.fieldGroup}>
                  <FloatingInput
                    label="PAN Card Number *"
                    icon="id-card"
                    value={form.pan}
                    onChangeText={(t) => updateField('pan', t.toUpperCase())}
                    autoCapitalize="characters"
                    maxLength={10}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <FloatingInput
                    label="Aadhaar Card Number"
                    icon="finger-print"
                    value={form.aadhaar}
                    onChangeText={(t) => updateField('aadhaar', t)}
                    keyboardType="number-pad"
                    maxLength={12}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <FloatingInput
                    label="Team Code (Optional)"
                    icon="people"
                    value={form.referralCode}
                    onChangeText={(t) => updateField('referralCode', t)}
                    autoCapitalize="characters"
                  />
                </View>

                <TouchableOpacity
                  style={styles.termsRow}
                  onPress={() => updateField('termsAgreed', !form.termsAgreed)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: form.termsAgreed ? colors.primary : colors.bgSecondary,
                        borderColor: form.termsAgreed ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    {form.termsAgreed && <Icon name="check" size={11} color="#FFF" />}
                  </View>
                  <Text style={[styles.termsText, { color: colors.textMid }]}>
                    I confirm that the details provided are accurate and I agree to the{' '}
                    <Text style={{ color: colors.primary, fontWeight: '700' }}>Terms & Conditions</Text> and{' '}
                    <Text style={{ color: colors.primary, fontWeight: '700' }}>Privacy Policy</Text>.
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── BOTTOM ACTIONS ROW ── */}
            <View style={styles.actionsRow}>
              {currentStep > 0 && (
                <TouchableOpacity
                  style={[styles.prevBtn, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}
                  onPress={handlePrev}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.prevBtnText, { color: colors.text }]}>Back</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.nextBtn, { backgroundColor: colors.primary }]}
                onPress={handleNext}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Text style={styles.nextBtnText}>
                      {currentStep === STEPS.length - 1 ? 'Submit Registration' : 'Continue'}
                    </Text>
                    <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800' }}> →</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* ── BANK SELECTION MODAL ── */}
        <Modal
          visible={bankDropdownVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setBankDropdownVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.bankModalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Select Bank</Text>
                <TouchableOpacity onPress={() => setBankDropdownVisible(false)}>
                  <Icon name="close" size={18} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.bankList} showsVerticalScrollIndicator={false}>
                {INDIAN_BANKS.map((bank) => (
                  <TouchableOpacity
                    key={bank}
                    style={[
                      styles.bankOption,
                      { backgroundColor: colors.bgSecondary, borderColor: colors.border },
                      form.bankName === bank && { backgroundColor: `${colors.primary}15`, borderColor: colors.primary },
                    ]}
                    onPress={() => {
                      updateField('bankName', bank);
                      setBankDropdownVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.bankOptionText, { color: colors.text }]}>{bank}</Text>
                    {form.bankName === bank && <Icon name="check" size={16} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  welcomePage: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 28,
  },
  welcomeLogoWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeLogo: {
    width: 170,
    height: 46,
  },
  welcomeHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
  },
  welcomeSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  welcomeDesc: {
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  welcomeIllustration: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeIllustrationImg: {
    width: '100%',
    height: '100%',
    maxHeight: 320,
  },
  welcomeActions: {
    width: '100%',
    alignItems: 'center',
  },
  welcomePrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 52,
    borderRadius: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  welcomePrimaryBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  welcomeLoginLink: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 14,
  },
  navBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backNavBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  headerLogo: {
    width: 130,
    height: 36,
  },
  signInLink: {
    fontSize: 13,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  formCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  partnerBadge: {
    backgroundColor: '#DCFCE7',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  partnerBadgeText: {
    color: '#166534',
    fontSize: 11.5,
    fontWeight: '800',
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  mainSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    marginBottom: 20,
  },
  stepProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  stepIndicatorNode: {
    alignItems: 'center',
    gap: 4,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '800',
  },
  stepNodeLabel: {
    fontSize: 10.5,
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 4,
    marginBottom: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  errorBannerText: {
    flex: 1,
    color: '#991B1B',
    fontSize: 12.5,
    fontWeight: '600',
  },
  stepForm: {
    gap: 14,
  },
  stepSectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  stepSubDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: -4,
    marginBottom: 6,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13.5,
    fontWeight: '500',
  },
  inputWithPrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  prefixText: {
    fontSize: 13.5,
    fontWeight: '700',
    marginRight: 6,
  },
  textInputInPrefix: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '500',
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  passwordInput: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '500',
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  companyPill: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  companyPillText: {
    fontSize: 12,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 6,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },
  prevBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prevBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    shadowColor: '#1B74BB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  nextBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  successScroll: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  successCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  successSubtitle: {
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  codeBox: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  codeBoxLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  codeBoxValue: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 48,
    borderRadius: 12,
  },
  primaryActionBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  dropdownText: {
    fontSize: 13.5,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bankModalBox: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  bankList: {
    padding: 12,
  },
  bankOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  bankOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
