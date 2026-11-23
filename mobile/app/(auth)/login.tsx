import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { Icon } from '../../components/Icon';
import {
  sendOtp,
  loginWithOtp,
  loginWithPassword,
  forgotPassword,
} from '../../services/auth.service';
import {
  checkBiometricCapability,
  isBiometricEnabled,
  getBiometricSession,
  authenticateWithBiometrics,
  saveBiometricSession,
} from '../../services/biometric.service';
import { useAuth } from '../../contexts/AuthContext';
import { FloatingInput } from '../../components/FloatingInput';
import { useTranslation } from 'react-i18next';

export default function LoginScreen() {
  const { loginSession } = useAuth();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  // Login Mode: 'password' | 'otp'
  const [loginMode, setLoginMode] = useState<'password' | 'otp'>('password');

  // Form Fields
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [maskedIdentity, setMaskedIdentity] = useState('');
  const [timer, setTimer] = useState(0);
  // Progressive lockout: after 3 wrong passwords → 2-min cooldown → OTP required
  const [otpRequired, setOtpRequired] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [identityFocused, setIdentityFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // Biometric Auth State
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricName, setBiometricName] = useState('Fingerprint / Face ID');
  const [hasSavedBiometric, setHasSavedBiometric] = useState(false);

  // Forgot Password Modal State
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    const initBiometrics = async () => {
      try {
        const cap = await checkBiometricCapability();
        const enabled = await isBiometricEnabled();
        const saved = await getBiometricSession();
        if (cap.hasHardware && cap.isEnrolled && enabled && saved?.token) {
          setBiometricAvailable(true);
          setBiometricName(cap.biometricName);
          setHasSavedBiometric(true);
        }
      } catch {}
    };
    initBiometrics();
  }, []);

  // Countdown timer for OTP
  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // Login-attempt cooldown countdown (2-minute lock after 3 failed passwords)
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const t = setTimeout(() => setCooldownSeconds((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(t);
  }, [cooldownSeconds]);

  const formatCooldown = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // Shared handler for progressive-lockout responses from /auth/login-password
  const handlePasswordLoginError = (data: any) => {
    if (data?.require_otp || data?.code === 'OTP_REQUIRED' || data?.code === 'LOGIN_COOLDOWN') {
      setOtpRequired(true);
      setLoginMode('otp');
      if (data?.retry_after_seconds) setCooldownSeconds(Math.ceil(data.retry_after_seconds));
      setErrorMsg(data?.message || 'Too many attempts. Please login using OTP.');
      return;
    }
    if (data?.attempts_left != null) {
      setErrorMsg(`${data?.message || 'Invalid credentials'} — ${data.attempts_left} attempt${data.attempts_left === 1 ? '' : 's'} remaining`);
      return;
    }
    setErrorMsg(data?.message || 'Login failed. Please check your credentials.');
  };

  const resolveRoleRedirect = (user: any) => {
    const role = (user?.role || '').toUpperCase();
    const designation = user?.designation || '';
    if (role === 'SUPER_ADMIN') {
      router.replace('/(app)/super-admin/dashboard');
    } else if (role === 'ADMIN') {
      router.replace('/(app)/admin-dashboard');
    } else if (role === 'HR') {
      router.replace('/(app)/hr-dashboard');
    } else if (role === 'EMPLOYEE') {
      router.replace(designation ? '/(app)/dashboard' : '/(app)/employee-dashboard');
    } else if (role === 'TEAM_MEMBER') {
      router.replace('/(app)/team-dashboard');
    } else {
      router.replace('/(app)/partner-dashboard');
    }
  };

  const handlePasswordLogin = async () => {
    if (!identity.trim()) {
      setErrorMsg('Please enter your email or mobile number');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('Please enter your password');
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await loginWithPassword(identity.trim(), password.trim());
      if (res?.success && res?.token && res?.user) {
        await loginSession(res.user, res.token, res.refreshToken);
        const bioEnabled = await isBiometricEnabled();
        if (bioEnabled) {
          await saveBiometricSession(res.token, res.user);
        }
        resolveRoleRedirect(res.user);
      } else {
        handlePasswordLoginError(res);
      }
    } catch (err: any) {
      handlePasswordLoginError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!identity.trim()) {
      setErrorMsg('Please enter your email or mobile number to receive OTP');
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await sendOtp(identity.trim());
      if (res?.success) {
        setMaskedIdentity(res.identity || identity);
        setOtpSent(true);
        setTimer(60);
      } else {
        setErrorMsg(res?.message || 'Failed to send OTP');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpLogin = async () => {
    if (!otp.trim() || otp.trim().length < 6) {
      setErrorMsg('Please enter the 6-digit verification code');
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await loginWithOtp(identity.trim(), otp.trim());
      if (res?.success && res?.token && res?.user) {
        await loginSession(res.user, res.token, res.refreshToken);
        const bioEnabled = await isBiometricEnabled();
        if (bioEnabled) {
          await saveBiometricSession(res.token, res.user);
        }
        resolveRoleRedirect(res.user);
      } else {
        setErrorMsg(res?.message || 'Invalid or expired OTP');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const authRes = await authenticateWithBiometrics(`Verify identity to sign in with ${biometricName}`);
      if (!authRes.success) {
        setErrorMsg(authRes.error || 'Biometric authentication was cancelled.');
        setLoading(false);
        return;
      }
      const saved = await getBiometricSession();
      if (saved?.token && saved?.user) {
        await loginSession(saved.user, saved.token);
        resolveRoleRedirect(saved.user);
      } else {
        setErrorMsg('No saved credentials for biometric login. Please sign in with password.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Biometric login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) {
      Alert.alert('Required', 'Please enter your registered email address');
      return;
    }
    setForgotLoading(true);
    try {
      await forgotPassword(forgotEmail.trim());
      setForgotModalVisible(false);
      setForgotEmail('');
      Alert.alert('Reset Link Sent', 'Password reset instructions have been sent to your email.');
    } catch (err: any) {
      Alert.alert('Failed', err.message || 'Could not send reset email. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* ── AMBIENT BACKGROUND ORBS (same as website login page) ── */}
        <View pointerEvents="none" style={[styles.orb, styles.orbBlue, { opacity: isDark ? 0.10 : 0.5 }]} />
        <View pointerEvents="none" style={[styles.orb, styles.orbGreen, { opacity: isDark ? 0.08 : 0.4 }]} />

        {/* ── TOP NAV BAR ── */}
        <View style={[styles.navBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.homeBackBtn, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}
            onPress={() => router.replace('/(auth)/home')}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 13, color: colors.text }}>← Home</Text>
          </TouchableOpacity>

          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />

          <TouchableOpacity
            style={[styles.langBtn, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}
            onPress={() => router.push('/(public)/language-settings')}
            activeOpacity={0.7}
          >
            <Icon name="globe" size={16} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── HERO / WELCOME CARD ── */}
          <View style={[styles.loginCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Welcome Badge */}
            <View style={styles.welcomeBadge}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="hand-left" size={14} color={colors.primary} />
                <Text style={styles.welcomeBadgeText}>{t('auth.welcomeBack')}</Text>
              </View>
            </View>

            {/* Headline */}
            <Text style={[styles.loginTitle, { color: colors.text }]}>
              {t('auth.loginToYour')}{' '}
              <Text style={{ color: colors.primary }}>{t('auth.accountWord')}</Text>
            </Text>

            {/* ── TABS SWITCHER: Password vs OTP ── */}
            <View style={[styles.tabContainer, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  loginMode === 'password' && [styles.activeTabBtn, { backgroundColor: colors.card, borderColor: colors.border }],
                ]}
                onPress={() => {
                  setLoginMode('password');
                  setErrorMsg(null);
                }}
                activeOpacity={0.8}
              >
                <Icon
                  name="lock"
                  size={14}
                  color={loginMode === 'password' ? colors.primary : colors.textLight}
                />
                <Text
                  style={[
                    styles.tabBtnText,
                    { color: loginMode === 'password' ? colors.primary : colors.textLight },
                  ]}
                >
                  {t('auth.passwordTab')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  loginMode === 'otp' && [styles.activeTabBtn, { backgroundColor: colors.card, borderColor: colors.border }],
                ]}
                onPress={() => {
                  setLoginMode('otp');
                  setErrorMsg(null);
                }}
                activeOpacity={0.8}
              >
                <Icon
                  name="device"
                  size={14}
                  color={loginMode === 'otp' ? colors.primary : colors.textLight}
                />
                <Text
                  style={[
                    styles.tabBtnText,
                    { color: loginMode === 'otp' ? colors.primary : colors.textLight },
                  ]}
                >
                  {t('auth.otpTab')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Error Message Box */}
            {errorMsg && (
              <View style={styles.errorBox}>
                <Icon name="alert-circle" size={14} color={colors.error} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            {/* ── FORM FIELDS ── */}
            <View style={styles.formArea}>
              {/* Email / Mobile Input */}
              {!(loginMode === 'otp' && otpSent) && (
                <FloatingInput
                  label={t('auth.emailOrMobile')}
                  icon="person"
                  value={identity}
                  onChangeText={(t) => {
                    setIdentity(t);
                    setErrorMsg(null);
                    setOtpRequired(false);
                    setCooldownSeconds(0);
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              )}

              {/* Password Mode Fields */}
              {loginMode === 'password' && (
                <>
                  <View>
                    <FloatingInput
                      label={t('auth.password')}
                      icon="lock"
                      value={password}
                      onChangeText={(t) => {
                        setPassword(t);
                        setErrorMsg(null);
                      }}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      rightElement={
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                          <Icon name={showPassword ? 'eye' : 'eye-off'} size={15} color={colors.textLight} />
                        </TouchableOpacity>
                      }
                    />
                    <View style={{ alignItems: 'flex-end', marginTop: 6 }}>
                      <TouchableOpacity onPress={() => setForgotModalVisible(true)}>
                        <Text style={[styles.forgotLink, { color: colors.primary }]}>{t('auth.forgotPassword')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Primary Sign In Button */}
                  <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                    onPress={handlePasswordLogin}
                    disabled={loading || otpRequired}
                    activeOpacity={0.85}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : otpRequired ? (
                      <>
                        <Icon name="shield" size={15} color="#FFF" />
                        <Text style={styles.submitBtnText}>{t('auth.otpVerificationRequired')}</Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.submitBtnText}>{t('auth.signInToAccount')}</Text>
                        <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800' }}> →</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {otpRequired && (
                    <TouchableOpacity onPress={() => setLoginMode('otp')} style={{ alignItems: 'center', marginTop: 4 }}>
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.primary }}>
                        {t('auth.switchToOtp')}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Biometric Quick Login Button */}
                  {biometricAvailable && hasSavedBiometric && (
                    <TouchableOpacity
                      style={[styles.biometricBtn, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}
                      onPress={handleBiometricLogin}
                      disabled={loading}
                      activeOpacity={0.8}
                    >
                      <Icon name="finger-print" size={18} color={colors.text} />
                      <Text style={[styles.biometricBtnText, { color: colors.text }]}>
                        {t('auth.biometricSignIn', { method: biometricName })}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}

              {/* OTP Mode Fields */}
              {loginMode === 'otp' && (
                <>
                  {otpRequired && (
                    <View style={[styles.otpInfoBox, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B40' }]}>
                      <Icon name="shield" size={14} color="#F59E0B" />
                      <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: '#B45309' }}>
                        {t('auth.otpRequiredInfo')}
                      </Text>
                    </View>
                  )}
                  {!otpSent ? (
                    <TouchableOpacity
                      style={[styles.submitBtn, { backgroundColor: colors.primary, marginTop: 12 }]}
                      onPress={handleSendOtp}
                      disabled={loading}
                      activeOpacity={0.85}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <>
                          <Text style={styles.submitBtnText}>{t('auth.sendVerificationOtp')}</Text>
                          <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800' }}> →</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <>
                      <View style={[styles.otpInfoBox, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.otpSentLabel, { color: colors.textLight }]}>{t('auth.otpSentTo')}</Text>
                          <Text style={[styles.otpSentTarget, { color: colors.text }]}>{maskedIdentity}</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => {
                            setOtpSent(false);
                            setOtp('');
                          }}
                        >
                          <Text style={[styles.editLink, { color: colors.primary }]}>{t('auth.change')}</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={[styles.fieldLabel, { color: colors.text }]}>{t('auth.sixDigitCode')}</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
                          <Icon name="key" size={16} color={colors.textLight} />
                          <TextInput
                            style={[styles.textInput, { color: colors.text, letterSpacing: 4, fontWeight: '800' }]}
                            placeholder="• • • • • •"
                            placeholderTextColor={colors.textLight}
                            value={otp}
                            onChangeText={(t) => {
                              setOtp(t);
                              setErrorMsg(null);
                            }}
                            keyboardType="number-pad"
                            maxLength={6}
                          />
                        </View>
                      </View>

                      {/* Resend Timer */}
                      <View style={styles.resendRow}>
                        {timer > 0 ? (
                          <Text style={[styles.timerText, { color: colors.textLight }]}>
                            {t('auth.resendCodeIn', { seconds: timer })}
                          </Text>
                        ) : (
                          <TouchableOpacity onPress={handleSendOtp} disabled={loading}>
                            <Text style={[styles.resendLink, { color: colors.primary }]}>
                              {t('auth.sendVerificationOtp')}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Verify & Login Button */}
                      <TouchableOpacity
                        style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                        onPress={handleOtpLogin}
                        disabled={loading}
                        activeOpacity={0.85}
                      >
                        {loading ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <>
                            <Text style={styles.submitBtnText}>{t('auth.verifyAndSignIn')}</Text>
                            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800' }}> →</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </>
                  )}
                </>
              )}
            </View>

            {/* ── REGISTER PROMPT LINK ── */}
            <View style={styles.signUpPromptRow}>
              <Text style={[styles.promptText, { color: colors.textMid }]}>
                {t('auth.dontHaveAccount')}{' '}
              </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                <Text style={[styles.signUpLink, { color: colors.primary }]}>{t('auth.signUpAsPartner')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Trust Guarantees */}
          <View style={styles.trustRow}>
            <Icon name="shield" size={14} color={colors.textLight} />
            <Text style={[styles.trustText, { color: colors.textLight }]}>
              {t('auth.trustText')}
            </Text>
          </View>

          {/* Chatbot Floating Button */}
          <TouchableOpacity
            style={[styles.chatbotFab, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(public)/chatbot')}
            activeOpacity={0.85}
          >
            <Icon name="chatbubble-ellipses" size={20} color="#FFF" />
          </TouchableOpacity>
        </ScrollView>

        {/* ── FORGOT PASSWORD MODAL ── */}
        <Modal
          visible={forgotModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setForgotModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('auth.resetPassword')}</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textMid }]}>
                Enter your registered email address to receive password reset instructions.
              </Text>

              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.bgSecondary, borderColor: colors.border, color: colors.text }]}
                placeholder="Enter your email"
                placeholderTextColor={colors.textLight}
                value={forgotEmail}
                onChangeText={setForgotEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                  onPress={() => setForgotModalVisible(false)}
                >
                  <Text style={[styles.modalCancelText, { color: colors.textMid }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSendBtn, { backgroundColor: colors.primary }]}
                  onPress={handleForgotPassword}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.modalSendText}>{t('auth.sendLink')}</Text>
                  )}
                </TouchableOpacity>
              </View>
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
  navBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  homeBackBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  headerLogo: {
    width: 130,
    height: 36,
  },
  langBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  orb: {
    position: 'absolute',
    borderRadius: 9999,
  },
  orbBlue: {
    width: 320,
    height: 320,
    right: -120,
    top: 90,
    backgroundColor: 'rgba(37, 99, 235, 0.35)',
  },
  orbGreen: {
    width: 300,
    height: 300,
    left: -110,
    top: 340,
    backgroundColor: 'rgba(16, 185, 129, 0.30)',
  },
  loginCard: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.10,
    shadowRadius: 32,
    elevation: 6,
  },
  welcomeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 10,
  },
  welcomeBadgeText: {
    color: '#166534',
    fontSize: 11.5,
    fontWeight: '800',
  },
  loginTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  loginSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    marginBottom: 18,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
  },
  activeTabBtn: {
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  tabBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    color: '#991B1B',
    fontSize: 12.5,
    fontWeight: '600',
  },
  formArea: {
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  forgotLink: {
    fontSize: 12,
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  floatWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 54,
  },
  floatInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 0,
    marginLeft: 8,
  },
  floatLabel: {
    position: 'absolute',
    left: 38,
    top: -8,
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 5,
    letterSpacing: 0.3,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  eyeBtn: {
    padding: 4,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    marginTop: 6,
    shadowColor: '#1B74BB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  biometricBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  otpInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  otpSentLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  otpSentTarget: {
    fontSize: 13.5,
    fontWeight: '800',
    marginTop: 2,
  },
  editLink: {
    fontSize: 12,
    fontWeight: '800',
  },
  resendRow: {
    alignItems: 'center',
    marginTop: -4,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  resendLink: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  signUpPromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  promptText: {
    fontSize: 13,
    fontWeight: '500',
  },
  signUpLink: {
    fontSize: 13,
    fontWeight: '800',
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
  },
  trustText: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  modalInput: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCancelBtn: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalSendBtn: {
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  modalSendText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  chatbotFab: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
});
