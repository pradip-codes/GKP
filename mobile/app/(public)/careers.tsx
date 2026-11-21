import React, { useMemo, useState } from 'react';
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
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { Button } from '../../components/Button';
import apiClient from '../../services/api';
import { INDIAN_STATES, getDistrictsForState } from '../../data/indianStatesDistricts';

const JOB_OPENINGS = [
  {
    id: '1',
    role: 'Telecaller / Sales Associate (TC)',
    department: 'Sales & Telecalling Support',
    location: 'Pune, Maharashtra / Hybrid',
    salary: '₹18,000 - ₹28,000 / month + Incentives',
    type: 'Full-Time',
    openings: 12,
  },
  {
    id: '2',
    role: 'Team Leader (TL)',
    department: 'Sales & Team Management',
    location: 'Pune / Mumbai',
    salary: '₹35,000 - ₹50,000 / month + Team Override',
    type: 'Full-Time',
    openings: 4,
  },
  {
    id: '3',
    role: 'Operations & KYC Specialist',
    department: 'Verification & Banking Operations',
    location: 'Pune, Maharashtra',
    salary: '₹22,000 - ₹32,000 / month',
    type: 'Full-Time',
    openings: 5,
  },
];

const HR_OPTIONS = ['Hrutika', 'Nandini', 'Riya', 'Poonam', 'Riyakumari', 'Other HR / Reference'];
const SOURCE_OPTIONS = ['Employee Reference', 'WhatsApp', 'Instagram', 'WorkIndia / Job Portal', 'College Reference', 'Other'];
const EXPERIENCE_OPTIONS = ['Fresher', 'Experienced'];
const QUALIFICATION_OPTIONS = ['12th Pass', 'Graduate', 'Diploma', 'Post Graduate', 'Pursuing'];
const TWELFTH_STREAMS = ['Commerce', 'Science', 'Arts', 'Other'];
const GRADUATE_DEGREES = ['B.Com', 'B.Sc', 'B.A', 'BBA', 'BCA', 'B.Tech / B.E', 'Other'];
const PG_DEGREES = ['M.Com', 'M.Sc', 'M.A', 'MBA', 'MCA', 'M.Tech', 'Other'];
const DIPLOMA_TYPES = ['Engineering Diploma', 'Polytechnic', 'Commercial Practice', 'Other'];
const PURSUING_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Final Year'];

const calculateAge = (dob: string): number | null => {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
};

// Simple dropdown select built on Modal (no external picker dependency)
function FormSelect({
  label,
  value,
  options,
  onSelect,
  placeholder = 'Select',
  required,
  disabled,
}: {
  label: string;
  value: string;
  options: string[];
  onSelect: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Text style={styles.inputLabel}>
        {label}
        {required ? ' *' : ''}
      </Text>
      <TouchableOpacity
        style={[styles.selectBox, disabled && { opacity: 0.6 }]}
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
      >
        <Text style={[styles.selectText, !value && { color: colors.textLight }]}>
          {value || placeholder}
        </Text>
        <Icon name="chevron-down" size={16} color={colors.textLight} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.modalCard}>
            <FlatList
              data={options}
              keyExtractor={(i) => i}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => {
                    onSelect(item);
                    setOpen(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

export default function CareersScreen() {
  const [activeTab, setActiveTab] = useState<'openings' | 'apply' | 'status'>('openings');

  // Application Form State
  const [form, setForm] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    date_of_birth: '',
    mobile_number: '',
    email_id: '',
    address_flat_no: '',
    address_society: '',
    address_area: '',
    address_state: '',
    address_district: '',
    address_city: '',
    pincode: '',
    highest_qualification: 'Graduate',
    twelfth_stream: '',
    twelfth_stream_other: '',
    degree_type: '',
    degree_other: '',
    diploma_type: '',
    pursuing_year: '',
    passing_year: '',
    experience_type: 'Fresher',
    total_experience_years: '',
    current_company: '',
    current_designation: '',
    last_salary_ctc: '',
    expected_salary: '',
    previous_salary: '',
    target_role: 'TC',
    selected_hr: 'Riya',
    hr_name: '',
    how_did_you_hear: 'WorkIndia / Job Portal',
  });
  const setField = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const [submitting, setSubmitting] = useState(false);
  const [successRefCode, setSuccessRefCode] = useState<string | null>(null);

  // Mobile OTP state
  const [mobileOtpSent, setMobileOtpSent] = useState(false);
  const [mobileOtp, setMobileOtp] = useState('');
  const [mobileVerified, setMobileVerified] = useState(false);
  const [mobileOtpLoading, setMobileOtpLoading] = useState(false);

  // Email OTP state
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailOtpLoading, setEmailOtpLoading] = useState(false);

  // Status Search State
  const [statusSearch, setStatusSearch] = useState('');
  const [candidateStatus, setCandidateStatus] = useState<any>(null);
  const [searchingStatus, setSearchingStatus] = useState(false);

  const candidateAge = useMemo(() => calculateAge(form.date_of_birth), [form.date_of_birth]);
  const dobIsFuture = !!form.date_of_birth && candidateAge !== null && candidateAge < 0;
  const ageInvalid = dobIsFuture || (candidateAge !== null && candidateAge < 18);

  const degreeOptions = form.highest_qualification === 'Post Graduate' ? PG_DEGREES : GRADUATE_DEGREES;
  const passingYearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    if (form.highest_qualification === 'Pursuing') {
      return Array.from({ length: 6 }, (_, i) => String(currentYear + i));
    }
    return Array.from({ length: currentYear - 1980 + 1 }, (_, i) => String(currentYear - i));
  }, [form.highest_qualification]);

  const handleSendMobileOtp = async () => {
    const mob = form.mobile_number.replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(mob)) {
      Alert.alert('Invalid Mobile', 'Please enter a valid 10-digit mobile number');
      return;
    }
    setMobileOtpLoading(true);
    try {
      await apiClient.post('/public/careers/verify-mobile', { mobile_number: mob });
      setMobileOtpSent(true);
      Alert.alert('OTP Sent', 'Verification OTP dispatched to your mobile number');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setMobileOtpLoading(false);
    }
  };

  const handleVerifyMobileOtp = async () => {
    const code = mobileOtp.trim();
    if (code.length < 6) {
      Alert.alert('Required', 'Please enter the 6-digit OTP');
      return;
    }
    setMobileOtpLoading(true);
    try {
      const mob = form.mobile_number.replace(/\D/g, '').slice(-10);
      await apiClient.post('/public/careers/verify-otp', {
        mobile_number: mob,
        mobile_otp: code,
        type: 'mobile',
      });
      setMobileVerified(true);
      setMobileOtpSent(false);
      Alert.alert('Verified', 'Mobile number verified successfully');
    } catch (err: any) {
      Alert.alert('Invalid OTP', err.response?.data?.message || 'Incorrect OTP. Please try again.');
    } finally {
      setMobileOtpLoading(false);
    }
  };

  const handleSendEmailOtp = async () => {
    const em = form.email_id.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }
    setEmailOtpLoading(true);
    try {
      await apiClient.post('/public/careers/verify-email', { email_id: em });
      setEmailOtpSent(true);
      Alert.alert('OTP Sent', 'OTP sent to your email address');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setEmailOtpLoading(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    const code = emailOtp.trim();
    if (code.length < 6) {
      Alert.alert('Required', 'Please enter the 6-digit OTP');
      return;
    }
    setEmailOtpLoading(true);
    try {
      await apiClient.post('/public/careers/verify-otp', {
        email_id: form.email_id.trim(),
        email_otp: code,
        type: 'email',
      });
      setEmailVerified(true);
      setEmailOtpSent(false);
      Alert.alert('Verified', 'Email address verified successfully');
    } catch (err: any) {
      Alert.alert('Invalid OTP', err.response?.data?.message || 'Incorrect OTP. Please try again.');
    } finally {
      setEmailOtpLoading(false);
    }
  };

  const educationDetail =
    form.highest_qualification === '12th Pass'
      ? form.twelfth_stream === 'Other' ? form.twelfth_stream_other : form.twelfth_stream
      : form.highest_qualification === 'Diploma'
        ? form.diploma_type
        : form.degree_type === 'Other' ? form.degree_other : form.degree_type;

  const handleApply = async () => {
    const fullName = [form.first_name, form.middle_name, form.last_name]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(' ');

    if (!form.first_name.trim() || !form.last_name.trim()) {
      Alert.alert('Required', 'Please enter First Name and Last Name');
      return;
    }
    if (dobIsFuture) {
      Alert.alert('Invalid DOB', 'Date of Birth cannot be in the future');
      return;
    }
    if (candidateAge !== null && candidateAge < 18) {
      Alert.alert('Age Restriction', '⚠️ Candidate must be at least 18 years old to apply');
      return;
    }
    if (!mobileVerified) {
      Alert.alert('Verification Required', 'Please verify your Mobile Number with OTP');
      return;
    }
    if (!emailVerified) {
      Alert.alert('Verification Required', 'Please verify your Email Address with OTP');
      return;
    }
    if (!form.address_state || !form.address_district || !form.address_city.trim() || !form.pincode.trim()) {
      Alert.alert('Required', 'Please complete your address (State, District, City, Pincode)');
      return;
    }
    if (!form.selected_hr) {
      Alert.alert('Required', 'Please select an HR');
      return;
    }
    if ((form.selected_hr === 'Other HR / Reference' || form.selected_hr === 'Other') && !form.hr_name.trim()) {
      Alert.alert('Required', 'Please enter HR Name / Reference Details');
      return;
    }
    if (form.how_did_you_hear === 'Employee Reference' && !form.hr_name.trim()) {
      Alert.alert('Required', 'Please enter the Referring Employee Name / ID');
      return;
    }
    if (form.experience_type === 'Experienced' && !form.previous_salary.trim()) {
      Alert.alert('Required', 'Previous Salary (Monthly ₹) is mandatory for experienced candidates');
      return;
    }

    const composedAddress = [
      form.address_flat_no, form.address_society, form.address_area,
      form.address_city, form.address_district, form.address_state, form.pincode,
    ].map((v) => v.trim()).filter(Boolean).join(', ');

    const isOtherHr = form.selected_hr === 'Other HR / Reference' || form.selected_hr === 'Other';
    const finalHrName = isOtherHr ? form.hr_name.trim() : form.selected_hr;

    setSubmitting(true);
    try {
      const res = await apiClient.post('/public/careers/register', {
        full_name: fullName,
        first_name: form.first_name.trim(),
        middle_name: form.middle_name.trim(),
        last_name: form.last_name.trim(),
        age: candidateAge,
        mobile_number: form.mobile_number.trim(),
        email_id: form.email_id.trim().toLowerCase(),
        date_of_birth: form.date_of_birth,
        current_address: composedAddress,
        address_flat_no: form.address_flat_no.trim(),
        address_society: form.address_society.trim(),
        address_area: form.address_area.trim(),
        address_state: form.address_state,
        address_district: form.address_district,
        address_city: form.address_city.trim(),
        pincode: form.pincode.trim(),
        highest_qualification: (educationDetail ? `${form.highest_qualification} - ${educationDetail}` : form.highest_qualification).slice(0, 100),
        education_stream: form.highest_qualification === '12th Pass' ? (form.twelfth_stream === 'Other' ? form.twelfth_stream_other : form.twelfth_stream) : '',
        education_detail: educationDetail,
        pursuing_year: form.pursuing_year,
        passing_year: form.passing_year,
        experience_type: form.experience_type,
        total_experience_years: form.total_experience_years,
        current_company: form.current_company.trim(),
        current_designation: form.current_designation.trim(),
        last_salary_ctc: form.last_salary_ctc,
        expected_salary: form.expected_salary,
        previous_salary: form.previous_salary,
        target_role: form.target_role,
        selected_hr: form.selected_hr,
        hr_name: finalHrName,
        hr_reference: form.hr_name.trim() || null,
        how_did_you_hear: form.how_did_you_hear,
      });

      const ref = res?.data?.reference_code || res?.data?.data?.reference_code;
      setSuccessRefCode(ref || null);
      Alert.alert(
        'Application Submitted',
        ref
          ? `Your application has been received! Reference Code: ${ref}`
          : 'Your application has been received! Our HR team will reach out to you shortly.'
      );
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to submit job application');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!statusSearch.trim()) {
      Alert.alert('Required', 'Please enter Candidate Reference Code or Mobile');
      return;
    }
    setSearchingStatus(true);
    setCandidateStatus(null);
    try {
      const query = statusSearch.trim();
      const isMobile = /^\d{10}$/.test(query);
      const url = isMobile
        ? `/public/careers/reference-code/${query}`
        : `/public/careers/status/${query}`;
      const res = await apiClient.get(url);

      if (res?.data?.data) {
        setCandidateStatus(res.data.data);
      } else {
        Alert.alert('Not Found', 'No application found with the given reference code');
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Could not fetch status');
    } finally {
      setSearchingStatus(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Icon name="chevron-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerSubtitle}>CAREERS & HIRING</Text>
          <Text style={styles.headerTitle}>Join GharKaPaisa Team</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'openings' && styles.activeTabBtn]}
          onPress={() => setActiveTab('openings')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'openings' && styles.activeTabBtnText]}>
            Open Positions
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'apply' && styles.activeTabBtn]}
          onPress={() => setActiveTab('apply')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'apply' && styles.activeTabBtnText]}>
            Apply Online
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'status' && styles.activeTabBtn]}
          onPress={() => setActiveTab('status')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'status' && styles.activeTabBtnText]}>
            Check Status
          </Text>
        </TouchableOpacity>
      </View>

      {/* TAB 1: Openings */}
      {activeTab === 'openings' && (
        <View style={{ gap: spacing.sm }}>
          {JOB_OPENINGS.map((job) => (
            <Card key={job.id} style={styles.jobCard}>
              <View style={styles.jobHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.jobRole}>{job.role}</Text>
                  <Text style={styles.jobDept}>{job.department}</Text>
                </View>
                <View style={styles.openingBadge}>
                  <Text style={styles.openingText}>{job.openings} Openings</Text>
                </View>
              </View>

              <View style={styles.jobMetaRow}>
                <Text style={styles.jobMeta}>📍 {job.location}</Text>
                <Text style={styles.jobMeta}>💼 {job.type}</Text>
              </View>

              <View style={styles.salaryBox}>
                <Text style={styles.salaryLabel}>Package</Text>
                <Text style={styles.salaryValue}>{job.salary}</Text>
              </View>

              <Button
                title="Apply for this Role"
                onPress={() => {
                  setField('target_role', job.role.includes('TC') ? 'TC' : job.role.includes('TL') ? 'TL' : 'Operations');
                  setActiveTab('apply');
                }}
                style={{ marginTop: spacing.sm }}
              />
            </Card>
          ))}
        </View>
      )}

      {/* TAB 2: Apply Form */}
      {activeTab === 'apply' && (
        <Card style={styles.card}>
          <Text style={styles.formTitle}>Candidate Interview Registration</Text>
          <Text style={styles.formSubtitle}>
            Submit your profile for instant review by our Talent Acquisition team.
          </Text>

          {/* 1. Personal Details */}
          <Text style={styles.sectionTitle}>1. Personal Details & Contact Verification</Text>

          <Text style={styles.inputLabel}>First Name *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter first name"
            placeholderTextColor={colors.textLight}
            value={form.first_name}
            onChangeText={(v) => setField('first_name', v)}
          />
          <Text style={styles.inputLabel}>Middle Name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter middle name"
            placeholderTextColor={colors.textLight}
            value={form.middle_name}
            onChangeText={(v) => setField('middle_name', v)}
          />
          <Text style={styles.inputLabel}>Last Name *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter last name"
            placeholderTextColor={colors.textLight}
            value={form.last_name}
            onChangeText={(v) => setField('last_name', v)}
          />

          <Text style={styles.inputLabel}>Mobile Number *</Text>
          <View style={styles.otpRow}>
            <TextInput
              style={[styles.textInput, styles.otpInput, mobileVerified && { opacity: 0.6 }]}
              placeholder="10 digit mobile number"
              placeholderTextColor={colors.textLight}
              value={form.mobile_number}
              onChangeText={(v) => {
                setField('mobile_number', v);
                setMobileVerified(false);
                setMobileOtpSent(false);
                setMobileOtp('');
              }}
              keyboardType="phone-pad"
              maxLength={10}
              editable={!mobileVerified}
            />
            {!mobileVerified ? (
              <TouchableOpacity
                style={styles.otpBtn}
                onPress={mobileOtpSent ? handleVerifyMobileOtp : handleSendMobileOtp}
                disabled={mobileOtpLoading}
              >
                {mobileOtpLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.otpBtnText}>{mobileOtpSent ? 'Verify' : 'Send OTP'}</Text>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.verifiedBadge}>
                <Icon name="check" size={14} color="#059669" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>
          {mobileOtpSent && !mobileVerified && (
            <TextInput
              style={styles.textInput}
              placeholder="Enter 6-digit Mobile OTP"
              placeholderTextColor={colors.textLight}
              value={mobileOtp}
              onChangeText={setMobileOtp}
              keyboardType="number-pad"
              maxLength={6}
            />
          )}

          <Text style={styles.inputLabel}>Email Address *</Text>
          <View style={styles.otpRow}>
            <TextInput
              style={[styles.textInput, styles.otpInput, emailVerified && { opacity: 0.6 }]}
              placeholder="name@example.com"
              placeholderTextColor={colors.textLight}
              value={form.email_id}
              onChangeText={(v) => {
                setField('email_id', v);
                setEmailVerified(false);
                setEmailOtpSent(false);
                setEmailOtp('');
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!emailVerified}
            />
            {!emailVerified ? (
              <TouchableOpacity
                style={styles.otpBtn}
                onPress={emailOtpSent ? handleVerifyEmailOtp : handleSendEmailOtp}
                disabled={emailOtpLoading}
              >
                {emailOtpLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.otpBtnText}>{emailOtpSent ? 'Verify' : 'Send OTP'}</Text>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.verifiedBadge}>
                <Icon name="check" size={14} color="#059669" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>
          {emailOtpSent && !emailVerified && (
            <TextInput
              style={styles.textInput}
              placeholder="Enter 6-digit Email OTP"
              placeholderTextColor={colors.textLight}
              value={emailOtp}
              onChangeText={setEmailOtp}
              keyboardType="number-pad"
              maxLength={6}
            />
          )}

          <Text style={styles.inputLabel}>Date of Birth *</Text>
          <TextInput
            style={[styles.textInput, ageInvalid && { borderColor: '#FCA5A5' }]}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textLight}
            value={form.date_of_birth}
            onChangeText={(v) => setField('date_of_birth', v)}
            maxLength={10}
          />
          {dobIsFuture && (
            <Text style={styles.warnText}>⚠️ Date of Birth cannot be in the future.</Text>
          )}
          {!dobIsFuture && candidateAge !== null && candidateAge < 18 && (
            <Text style={styles.warnText}>⚠️ Candidate must be at least 18 years old to apply.</Text>
          )}
          {!dobIsFuture && candidateAge !== null && candidateAge >= 18 && (
            <View style={styles.ageBadge}>
              <Icon name="check" size={12} color="#059669" />
              <Text style={styles.ageBadgeText}>Age Verified: {candidateAge} years</Text>
            </View>
          )}

          {/* 2. Address */}
          <Text style={styles.sectionTitle}>2. Current Residential Address</Text>
          <Text style={styles.inputLabel}>Flat No. / House No.</Text>
          <TextInput style={styles.textInput} placeholder="Flat 402 / House 12" placeholderTextColor={colors.textLight} value={form.address_flat_no} onChangeText={(v) => setField('address_flat_no', v)} />
          <Text style={styles.inputLabel}>Society / Apartment Name</Text>
          <TextInput style={styles.textInput} placeholder="Green Valley Heights" placeholderTextColor={colors.textLight} value={form.address_society} onChangeText={(v) => setField('address_society', v)} />
          <Text style={styles.inputLabel}>Area / Landmark</Text>
          <TextInput style={styles.textInput} placeholder="Near Metro Station / Main Road" placeholderTextColor={colors.textLight} value={form.address_area} onChangeText={(v) => setField('address_area', v)} />
          <FormSelect
            label="State"
            value={form.address_state}
            options={INDIAN_STATES.map((s) => s.name)}
            onSelect={(v) => {
              setField('address_state', v);
              setField('address_district', '');
            }}
            placeholder="Select State"
            required
          />
          <FormSelect
            label="District"
            value={form.address_district}
            options={getDistrictsForState(form.address_state)}
            onSelect={(v) => setField('address_district', v)}
            placeholder={form.address_state ? 'Select District' : 'Select State first'}
            required
            disabled={!form.address_state}
          />
          <Text style={styles.inputLabel}>City / Town *</Text>
          <TextInput style={styles.textInput} placeholder="e.g. Pune" placeholderTextColor={colors.textLight} value={form.address_city} onChangeText={(v) => setField('address_city', v)} />
          <Text style={styles.inputLabel}>Pincode *</Text>
          <TextInput style={styles.textInput} placeholder="e.g. 411001" placeholderTextColor={colors.textLight} value={form.pincode} onChangeText={(v) => setField('pincode', v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} />

          {/* 3. Education */}
          <Text style={styles.sectionTitle}>3. Education</Text>
          <Text style={styles.minQualNote}>Minimum educational qualification required: 12th Pass.</Text>
          <FormSelect
            label="Highest Qualification"
            value={form.highest_qualification}
            options={QUALIFICATION_OPTIONS}
            onSelect={(v) => {
              setField('highest_qualification', v);
              setField('twelfth_stream', '');
              setField('twelfth_stream_other', '');
              setField('degree_type', '');
              setField('degree_other', '');
              setField('diploma_type', '');
              setField('pursuing_year', '');
              setField('passing_year', '');
            }}
            required
          />
          {form.highest_qualification === '12th Pass' && (
            <>
              <FormSelect label="Stream" value={form.twelfth_stream} options={TWELFTH_STREAMS} onSelect={(v) => { setField('twelfth_stream', v); setField('twelfth_stream_other', ''); }} required />
              {form.twelfth_stream === 'Other' && (
                <TextInput style={styles.textInput} placeholder="Specify stream" placeholderTextColor={colors.textLight} value={form.twelfth_stream_other} onChangeText={(v) => setField('twelfth_stream_other', v)} />
              )}
            </>
          )}
          {(form.highest_qualification === 'Graduate' || form.highest_qualification === 'Pursuing') && (
            <>
              <FormSelect label="Degree Type" value={form.degree_type} options={degreeOptions} onSelect={(v) => { setField('degree_type', v); setField('degree_other', ''); }} required />
              {form.degree_type === 'Other' && (
                <TextInput style={styles.textInput} placeholder="Specify degree" placeholderTextColor={colors.textLight} value={form.degree_other} onChangeText={(v) => setField('degree_other', v)} />
              )}
            </>
          )}
          {form.highest_qualification === 'Diploma' && (
            <FormSelect label="Diploma Type" value={form.diploma_type} options={DIPLOMA_TYPES} onSelect={setField.bind(null, 'diploma_type')} required />
          )}
          {form.highest_qualification === 'Post Graduate' && (
            <>
              <FormSelect label="Degree Type" value={form.degree_type} options={degreeOptions} onSelect={(v) => { setField('degree_type', v); setField('degree_other', ''); }} required />
              {form.degree_type === 'Other' && (
                <TextInput style={styles.textInput} placeholder="Specify degree" placeholderTextColor={colors.textLight} value={form.degree_other} onChangeText={(v) => setField('degree_other', v)} />
              )}
            </>
          )}
          {form.highest_qualification === 'Pursuing' && (
            <FormSelect label="Current Year of Study" value={form.pursuing_year} options={PURSUING_YEARS} onSelect={(v) => setField('pursuing_year', v)} required />
          )}
          <FormSelect
            label={form.highest_qualification === 'Pursuing' ? 'Expected Passing Year' : 'Passing Year'}
            value={form.passing_year}
            options={passingYearOptions}
            onSelect={(v) => setField('passing_year', v)}
            required
          />

          {/* 4. Experience */}
          <Text style={styles.sectionTitle}>4. Experience & Job Role</Text>
          <FormSelect
            label="Target Job Role"
            value={form.target_role}
            options={['TC', 'Team Leader', 'Operations', 'Financial Sales Executive', 'Credit Card Specialist', 'Telecaller', 'Customer Support & Verification', 'Full Stack React / Node Developer', 'Partner Relationship Manager', 'Operations Associate']}
            onSelect={(v) => setField('target_role', v)}
            required
          />
          <FormSelect
            label="Fresher / Experienced"
            value={form.experience_type}
            options={EXPERIENCE_OPTIONS}
            onSelect={(v) => setField('experience_type', v)}
            required
          />
          {form.experience_type === 'Experienced' && (
            <>
              <Text style={styles.inputLabel}>Total Experience (Years)</Text>
              <TextInput style={styles.textInput} placeholder="e.g. 2.5" placeholderTextColor={colors.textLight} value={form.total_experience_years} onChangeText={(v) => setField('total_experience_years', v)} keyboardType="decimal-pad" />
              <Text style={styles.inputLabel}>Current / Last Company</Text>
              <TextInput style={styles.textInput} placeholder="e.g. HDFC / Axis DSA" placeholderTextColor={colors.textLight} value={form.current_company} onChangeText={(v) => setField('current_company', v)} />
              <Text style={styles.inputLabel}>Current / Last Designation</Text>
              <TextInput style={styles.textInput} placeholder="e.g. Senior Executive" placeholderTextColor={colors.textLight} value={form.current_designation} onChangeText={(v) => setField('current_designation', v)} />
              <Text style={styles.inputLabel}>Last Salary / CTC</Text>
              <TextInput style={styles.textInput} placeholder="e.g. 3,50,000" placeholderTextColor={colors.textLight} value={form.last_salary_ctc} onChangeText={(v) => setField('last_salary_ctc', v)} keyboardType="numeric" />
              <Text style={styles.inputLabel}>Previous Salary (Monthly ₹) *</Text>
              <TextInput style={styles.textInput} placeholder="e.g. 30,000" placeholderTextColor={colors.textLight} value={form.previous_salary} onChangeText={(v) => setField('previous_salary', v)} keyboardType="numeric" />
            </>
          )}
          {form.experience_type === 'Fresher' && (
            <>
              <Text style={styles.inputLabel}>Expected Salary (Monthly ₹)</Text>
              <TextInput style={styles.textInput} placeholder="e.g. 25,000" placeholderTextColor={colors.textLight} value={form.expected_salary} onChangeText={(v) => setField('expected_salary', v)} keyboardType="numeric" />
            </>
          )}

          {/* 5. HR & Source */}
          <Text style={styles.sectionTitle}>5. HR & Source</Text>
          <FormSelect
            label="Select HR"
            value={form.selected_hr}
            options={HR_OPTIONS}
            onSelect={(v) => {
              setField('selected_hr', v);
              if (v !== 'Other HR / Reference' && v !== 'Other') setField('hr_name', '');
            }}
            required
          />
          {(form.selected_hr === 'Other HR / Reference' || form.selected_hr === 'Other' || form.how_did_you_hear === 'Employee Reference') && (
            <>
              <Text style={styles.inputLabel}>
                {form.how_did_you_hear === 'Employee Reference' ? 'Referring Employee Name / Reference Details *' : 'HR Name / Reference Details *'}
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder={form.how_did_you_hear === 'Employee Reference' ? 'Enter referring employee name / ID' : 'Enter HR name / reference details'}
                placeholderTextColor={colors.textLight}
                value={form.hr_name}
                onChangeText={(v) => setField('hr_name', v)}
              />
            </>
          )}
          <FormSelect
            label="How did you hear about this job?"
            value={form.how_did_you_hear}
            options={SOURCE_OPTIONS}
            onSelect={(v) => setField('how_did_you_hear', v)}
            required
          />

          <Button
            title="Complete Candidate Registration"
            onPress={handleApply}
            loading={submitting}
            disabled={ageInvalid}
            style={{ marginTop: spacing.md }}
          />
        </Card>
      )}

      {/* TAB 3: Status */}
      {activeTab === 'status' && (
        <Card style={styles.card}>
          <Text style={styles.formTitle}>Track Candidate Application</Text>
          <Text style={styles.formSubtitle}>
            Check your interview schedule and recruitment outcome.
          </Text>

          <Text style={styles.inputLabel}>Candidate Reference Code or Mobile</Text>
          <View style={styles.searchBox}>
            <Icon name="search" size={18} color={colors.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="e.g. CAND10072 or 9876543210"
              placeholderTextColor={colors.textLight}
              value={statusSearch}
              onChangeText={setStatusSearch}
              autoCapitalize="characters"
            />
          </View>

          <Button
            title="Search Candidate Record"
            onPress={handleCheckStatus}
            loading={searchingStatus}
            style={{ marginTop: spacing.md }}
          />

          {candidateStatus && (
            <View style={styles.statusResultCard}>
              <Text style={styles.candName}>{candidateStatus.full_name}</Text>
              <Text style={styles.candRef}>
                Ref: {candidateStatus.reference_code || candidateStatus.id} • Role: {candidateStatus.target_role || 'Staff'}
              </Text>
              <View style={styles.stagePill}>
                <Text style={styles.stagePillText}>
                  STATUS: {(candidateStatus.status || candidateStatus.interview_status || 'APPLICATION_RECEIVED').toUpperCase()}
                </Text>
              </View>
            </View>
          )}
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: spacing.md,
    backgroundColor: colors.bg,
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
    color: colors.textLight,
    letterSpacing: 1.5,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.textMid,
  },
  activeTabBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  card: {
    padding: spacing.lg,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 12,
    color: colors.textMid,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  minQualNote: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B45309',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 8,
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    marginTop: spacing.xs,
  },
  textInput: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.text,
    marginBottom: 4,
  },
  otpRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  otpInput: {
    flex: 1,
  },
  otpBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 76,
  },
  otpBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#6EE7B7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  verifiedText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
  },
  warnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
    marginTop: 2,
    marginBottom: 4,
  },
  ageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#6EE7B7',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 4,
  },
  ageBadgeText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  selectBox: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  selectText: {
    fontSize: 13,
    color: colors.text,
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    maxHeight: '60%',
    paddingVertical: spacing.sm,
  },
  modalOption: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalOptionText: {
    fontSize: 14,
    color: colors.text,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    padding: 0,
  },
  jobCard: {
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  jobRole: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  jobDept: {
    fontSize: 11,
    color: colors.textMid,
    marginTop: 2,
  },
  openingBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  openingText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  jobMetaRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  jobMeta: {
    fontSize: 11,
    color: colors.textMid,
  },
  salaryBox: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 8,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  salaryLabel: {
    fontSize: 10,
    color: colors.textMid,
    fontWeight: '600',
  },
  salaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 1,
  },
  statusResultCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  candName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  candRef: {
    fontSize: 11,
    color: colors.textMid,
    marginTop: 2,
  },
  stagePill: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  stagePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
});
