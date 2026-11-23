import React, { useEffect, useMemo, useState } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { Button } from '../../components/Button';
import { FloatingInput } from '../../components/FloatingInput';
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

// Option lists mirror the website InterviewRegistration form exactly
// ({ label, value } pairs where the website shows a descriptive label but stores a code)
const HR_OPTIONS = ['Hrutika', 'Nandini', 'Riya', 'Poonam', 'Riyakumari', 'Other'];
const SOURCE_OPTIONS = ['Employee Reference', 'WhatsApp', 'Instagram', 'WorkIndia / Job Portal', 'College Reference', 'Other'];
const EXPERIENCE_OPTIONS = ['Fresher', 'Experienced'];
const QUALIFICATION_OPTIONS = ['12th', 'ITI', 'Diploma', 'Graduate', 'Post Graduate', 'Pursuing'];
const TWELFTH_STREAMS = ['Commerce', 'Science', 'Arts', 'Other'];
const UG_DEGREES = [
  { label: 'BA (Bachelor of Arts)', value: 'BA' },
  { label: 'BCom (Bachelor of Commerce)', value: 'BCom' },
  { label: 'BSc (Bachelor of Science)', value: 'BSc' },
  { label: 'BBA (Bachelor of Business Administration)', value: 'BBA' },
  { label: 'BCA (Bachelor of Computer Applications)', value: 'BCA' },
  { label: 'BCS (Bachelor of Computer Science)', value: 'BCS' },
  { label: 'BTech (Bachelor of Technology)', value: 'BTech' },
  { label: 'BE (Bachelor of Engineering)', value: 'BE' },
  { label: 'Other', value: 'Other' },
];
const PG_DEGREES = [
  { label: 'MA (Master of Arts)', value: 'MA' },
  { label: 'MCom (Master of Commerce)', value: 'MCom' },
  { label: 'MSc (Master of Science)', value: 'MSc' },
  { label: 'MCA (Master of Computer Applications)', value: 'MCA' },
  { label: 'MCS (Master of Computer Science)', value: 'MCS' },
  { label: 'MBA (Master of Business Administration)', value: 'MBA' },
  { label: 'MTech (Master of Technology)', value: 'MTech' },
  { label: 'ME (Master of Engineering)', value: 'ME' },
  { label: 'Other', value: 'Other' },
];
const DIPLOMA_TYPES = [
  'Diploma in Mechanical Engineering',
  'Diploma in Civil Engineering',
  'Diploma in Electrical Engineering',
  'Diploma in Computer / IT',
  'Diploma in Electronics & Telecommunication',
  'Diploma in Computer Applications (DCA)',
  'Diploma in Business Management',
  'Diploma in Pharmacy (D.Pharm)',
  'Other',
];
const PURSUING_YEARS = ['First Year', 'Second Year', 'Third Year', 'Fourth Year'];
const IMMEDIATE_JOINING_OPTIONS = [
  { label: 'Yes - Immediate Joining', value: 'Yes' },
  { label: 'No - Needs Notice Period', value: 'No' },
];
const LOCATION_OPTIONS = [
  { label: 'Yes - Comfortable with location', value: 'Yes' },
  { label: 'No - Prefers Remote / Other', value: 'No' },
];
const RELEVANT_EXPERIENCE_OPTIONS = [
  { label: 'Yes - Direct Financial / Domain Experience', value: 'Yes' },
  { label: 'No - Related / Fresh Experience', value: 'No' },
];
const TARGET_ROLE_OPTIONS = [
  'Financial Sales Executive',
  'Credit Card Specialist',
  'Sales Manager',
  'Branch Head',
  'Assistant Manager',
  'Manager',
  'Senior Manager',
  'Product Manager',
  'HR Executive',
  'HR Manager',
  'Senior HR Manager',
  'Recruiter',
  'Trainee Developer',
  'Junior Developer',
  'Senior Developer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Full Stack React / Node Developer',
  'Team Leader',
  'Telecaller',
  'Customer Support & Verification',
  'Partner Relationship Manager',
  'Operations Associate',
];

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

type SelectOption = string | { label: string; value: string };

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
  options: SelectOption[];
  onSelect: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const normalized = options.map((o) => (typeof o === 'string' ? { label: o, value: o } : o));
  const selectedLabel = normalized.find((o) => o.value === value)?.label;
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
          {selectedLabel || value || placeholder}
        </Text>
        <Icon name="chevron-down" size={16} color={colors.textLight} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.modalCard}>
            <FlatList
              data={normalized}
              keyExtractor={(o) => o.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => {
                    onSelect(item.value);
                    setOpen(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{item.label}</Text>
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
  const params = useLocalSearchParams();

  // Application Form State (mirrors website InterviewRegistration formData)
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
    highest_qualification: '',
    twelfth_stream: '',
    twelfth_stream_other: '',
    degree_type: '',
    degree_other: '',
    diploma_type: '',
    diploma_other: '',
    pursuing_year: '',
    passing_year: '',
    target_role: 'Financial Sales Executive',
    experience_type: 'Fresher',
    total_experience_years: '0',
    current_company: '',
    current_designation: '',
    last_salary_ctc: '',
    previous_salary: '',
    immediate_joining: 'Yes',
    notice_period_days: '0',
    comfortable_with_location: 'Yes',
    relevant_experience: 'Yes',
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

  const degreeOptions = form.highest_qualification === 'Post Graduate' ? PG_DEGREES : UG_DEGREES;
  const passingYearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    if (form.highest_qualification === 'Pursuing') {
      return Array.from({ length: 6 }, (_, i) => String(currentYear + i));
    }
    return Array.from({ length: currentYear - 1980 + 1 }, (_, i) => String(currentYear - i));
  }, [form.highest_qualification]);

  // Referral code from deep-link params — same keys the website reads (?ref, ?emp, ...)
  const referredByCode = useMemo(() => {
    const raw =
      params.ref || params.emp || params.employee_code || params.referral_code ||
      params.referral || params.referralCode || params.token || params.code;
    const v = Array.isArray(raw) ? raw[0] : raw;
    return typeof v === 'string' ? v : '';
  }, [params]);

  useEffect(() => {
    if (referredByCode) {
      setForm((prev) => ({ ...prev, how_did_you_hear: 'Employee Reference' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referredByCode]);

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
    form.highest_qualification === '12th'
      ? form.twelfth_stream === 'Other' ? form.twelfth_stream_other : form.twelfth_stream
      : form.highest_qualification === 'Diploma'
        ? form.diploma_type === 'Other' ? form.diploma_other : form.diploma_type
        : form.degree_type === 'Other' ? form.degree_other : form.degree_type;

  const handleApply = async () => {
    const fullName = [form.first_name, form.middle_name, form.last_name]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(' ');

    // ── Validation mirrors the website form exactly ──
    if (!form.first_name.trim() || !form.middle_name.trim() || !form.last_name.trim()) {
      Alert.alert('Required', 'First Name, Middle Name, and Last Name are all required.');
      return;
    }
    if (!form.mobile_number || form.mobile_number.replace(/\D/g, '').length !== 10) {
      Alert.alert('Required', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email_id.trim())) {
      Alert.alert('Required', 'Please enter a valid Email address.');
      return;
    }
    if (!mobileVerified) {
      Alert.alert('Verification Required', 'Please verify your Mobile Number with OTP before submitting.');
      return;
    }
    if (!emailVerified) {
      Alert.alert('Verification Required', 'Please verify your Email Address with OTP before submitting.');
      return;
    }
    if (!form.date_of_birth) {
      Alert.alert('Required', 'Date of Birth is required.');
      return;
    }
    if (dobIsFuture) {
      Alert.alert('Invalid DOB', 'Date of Birth cannot be in the future.');
      return;
    }
    if (candidateAge === null || candidateAge < 18) {
      Alert.alert('Age Restriction', '⚠️ Candidate must be at least 18 years old to apply.');
      return;
    }
    if (!form.address_flat_no.trim() || !form.address_society.trim() || !form.address_area.trim() ||
        !form.address_state || !form.address_district || !form.address_city.trim() || !form.pincode.trim()) {
      Alert.alert('Required', 'Please complete all address fields (Flat No., Society, Area, State, District, City, Pincode).');
      return;
    }
    if (!form.highest_qualification) {
      Alert.alert('Required', 'Please select your Highest Educational Qualification.');
      return;
    }
    if (form.highest_qualification === '12th') {
      if (!form.twelfth_stream) {
        Alert.alert('Required', 'Please select your 12th Stream (Commerce, Science, Arts, Other).');
        return;
      }
      if (form.twelfth_stream === 'Other' && !form.twelfth_stream_other.trim()) {
        Alert.alert('Required', 'Please specify your 12th Stream name.');
        return;
      }
    }
    if (form.highest_qualification === 'Graduate') {
      if (!form.degree_type) {
        Alert.alert('Required', 'Please select your Graduate Degree Type.');
        return;
      }
      if (form.degree_type === 'Other' && !form.degree_other.trim()) {
        Alert.alert('Required', 'Please specify your Graduate Degree name.');
        return;
      }
    }
    if (form.highest_qualification === 'Diploma') {
      if (!form.diploma_type) {
        Alert.alert('Required', 'Please select your Diploma Type.');
        return;
      }
      if (form.diploma_type === 'Other' && !form.diploma_other.trim()) {
        Alert.alert('Required', 'Please specify your Diploma name.');
        return;
      }
    }
    if (form.highest_qualification === 'Post Graduate') {
      if (!form.degree_type) {
        Alert.alert('Required', 'Please select your Post Graduate Degree Type.');
        return;
      }
      if (form.degree_type === 'Other' && !form.degree_other.trim()) {
        Alert.alert('Required', 'Please specify your Post Graduate Degree name.');
        return;
      }
    }
    if (form.highest_qualification === 'Pursuing') {
      if (!form.degree_type) {
        Alert.alert('Required', 'Please select your Pursuing Degree Type.');
        return;
      }
      if (form.degree_type === 'Other' && !form.degree_other.trim()) {
        Alert.alert('Required', 'Please specify your Pursuing Degree name.');
        return;
      }
      if (!form.pursuing_year) {
        Alert.alert('Required', 'Please select your Current Year of Study.');
        return;
      }
    }
    if (!form.passing_year) {
      Alert.alert('Required', 'Please select your Passing Year / Expected Passing Year.');
      return;
    }
    if (form.experience_type === 'Experienced') {
      if (!form.total_experience_years.trim() || !form.current_company.trim() || !form.current_designation.trim()) {
        Alert.alert('Required', 'Please complete Total Experience, Current / Last Company and Designation.');
        return;
      }
      if (!form.previous_salary.trim()) {
        Alert.alert('Required', 'Please enter your Previous Salary (Monthly ₹).');
        return;
      }
    }
    if (!form.immediate_joining) {
      Alert.alert('Required', 'Please select if you are available for Immediate Joining.');
      return;
    }
    if (form.immediate_joining === 'No' && !form.notice_period_days.trim()) {
      Alert.alert('Required', 'Please enter your Notice Period (Days).');
      return;
    }
    if (!form.comfortable_with_location) {
      Alert.alert('Required', 'Please select if you are comfortable with the job location.');
      return;
    }
    if (!form.relevant_experience) {
      Alert.alert('Required', 'Please select if you have relevant experience.');
      return;
    }
    if (!form.selected_hr) {
      Alert.alert('Required', 'Please select an HR reference.');
      return;
    }
    const needsHrDetail =
      form.selected_hr === 'Other' || form.selected_hr === 'Other HR / Reference' ||
      form.how_did_you_hear === 'Employee Reference' || form.how_did_you_hear === 'Other';
    if (needsHrDetail && !form.hr_name.trim()) {
      Alert.alert('Required', form.how_did_you_hear === 'Employee Reference'
        ? 'Please enter Referring Employee Name or ID.'
        : 'Please enter the HR Name or Reference details.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.post('/public/careers/register', {
        full_name: fullName,
        first_name: form.first_name.trim(),
        middle_name: form.middle_name.trim(),
        last_name: form.last_name.trim(),
        age: candidateAge,
        mobile_number: form.mobile_number.replace(/\D/g, '').slice(-10),
        email_id: form.email_id.trim().toLowerCase(),
        date_of_birth: form.date_of_birth,
        current_address: `${form.address_flat_no.trim()}, ${form.address_society.trim()}, ${form.address_area.trim()}, ${form.address_city.trim()}, ${form.address_district}, ${form.address_state} - ${form.pincode.trim()}`,
        address_flat_no: form.address_flat_no.trim(),
        address_society: form.address_society.trim(),
        address_area: form.address_area.trim(),
        address_state: form.address_state,
        address_district: form.address_district,
        address_city: form.address_city.trim(),
        pincode: form.pincode.trim(),
        highest_qualification: form.highest_qualification,
        education_stream: form.highest_qualification === '12th' ? form.twelfth_stream : '',
        education_detail: educationDetail,
        pursuing_year: form.pursuing_year,
        passing_year: form.passing_year,
        experience_type: form.experience_type,
        total_experience_years: form.total_experience_years || '0',
        current_company: form.current_company.trim(),
        current_designation: form.current_designation.trim(),
        last_salary_ctc: form.last_salary_ctc,
        expected_salary: form.experience_type === 'Experienced' ? form.previous_salary : '',
        previous_salary: form.experience_type === 'Experienced' ? form.previous_salary : '',
        immediate_joining: form.immediate_joining === 'Yes',
        notice_period_days: form.immediate_joining === 'Yes' ? '0' : form.notice_period_days,
        comfortable_with_location: form.comfortable_with_location === 'Yes',
        relevant_experience: form.relevant_experience === 'Yes',
        how_did_you_hear: form.how_did_you_hear,
        selected_hr: form.selected_hr,
        hr_name: form.hr_name.trim(),
        hr_reference: form.hr_name.trim() || null,
        referred_by_employee_id: referredByCode || null,
        ref: referredByCode || null,
        target_role: form.target_role,
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
                  const role = job.role;
                  setField('target_role', role.includes('TC') ? 'Telecaller' : role.includes('TL') ? 'Team Leader' : 'Operations Associate');
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

          <FloatingInput label="First Name *" icon="person" value={form.first_name} onChangeText={(v) => setField('first_name', v)} />
          <FloatingInput label="Middle Name *" icon="person" value={form.middle_name} onChangeText={(v) => setField('middle_name', v)} />
          <FloatingInput label="Last Name *" icon="person" value={form.last_name} onChangeText={(v) => setField('last_name', v)} />

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
            <>
              <TextInput
                style={styles.textInput}
                placeholder="Enter 6-digit Mobile OTP"
                placeholderTextColor={colors.textLight}
                value={mobileOtp}
                onChangeText={setMobileOtp}
                keyboardType="number-pad"
                maxLength={6}
              />
              <TouchableOpacity
                style={styles.otpCancelRow}
                onPress={() => {
                  setMobileOtpSent(false);
                  setMobileOtp('');
                }}
              >
                <Icon name="close" size={12} color={colors.textLight} />
                <Text style={styles.otpCancelText}>Cancel verification</Text>
              </TouchableOpacity>
            </>
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
            <>
              <TextInput
                style={styles.textInput}
                placeholder="Enter 6-digit Email OTP"
                placeholderTextColor={colors.textLight}
                value={emailOtp}
                onChangeText={setEmailOtp}
                keyboardType="number-pad"
                maxLength={6}
              />
              <TouchableOpacity
                style={styles.otpCancelRow}
                onPress={() => {
                  setEmailOtpSent(false);
                  setEmailOtp('');
                }}
              >
                <Icon name="close" size={12} color={colors.textLight} />
                <Text style={styles.otpCancelText}>Cancel verification</Text>
              </TouchableOpacity>
            </>
          )}

          <FloatingInput label="Date of Birth *" icon="calendar" value={form.date_of_birth} onChangeText={(v) => setField('date_of_birth', v)} maxLength={10} />
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
          <FloatingInput label="Flat No. / House No. *" icon="location" value={form.address_flat_no} onChangeText={(v) => setField('address_flat_no', v)} />
          <FloatingInput label="Society / Apartment Name *" icon="location" value={form.address_society} onChangeText={(v) => setField('address_society', v)} />
          <FloatingInput label="Area / Landmark *" icon="location" value={form.address_area} onChangeText={(v) => setField('address_area', v)} />
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
          <FloatingInput label="City / Town *" icon="location" value={form.address_city} onChangeText={(v) => setField('address_city', v)} />
          <FloatingInput label="Pincode *" icon="map" value={form.pincode} onChangeText={(v) => setField('pincode', v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} />

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
              setField('diploma_other', '');
              setField('pursuing_year', '');
              setField('passing_year', '');
            }}
            required
          />
          {form.highest_qualification === '12th' && (
            <>
              <FormSelect label="Stream" value={form.twelfth_stream} options={TWELFTH_STREAMS} onSelect={(v) => { setField('twelfth_stream', v); setField('twelfth_stream_other', ''); }} required />
              {form.twelfth_stream === 'Other' && (
                <FloatingInput label="Specify Stream" icon="pricetag" value={form.twelfth_stream_other} onChangeText={(v) => setField('twelfth_stream_other', v)} />
              )}
            </>
          )}
          {(form.highest_qualification === 'Graduate' || form.highest_qualification === 'Pursuing') && (
            <>
              <FormSelect label="Degree Type" value={form.degree_type} options={degreeOptions} onSelect={(v) => { setField('degree_type', v); setField('degree_other', ''); }} required />
              {form.degree_type === 'Other' && (
                <FloatingInput label="Specify Degree" icon="pricetag" value={form.degree_other} onChangeText={(v) => setField('degree_other', v)} />
              )}
            </>
          )}
          {form.highest_qualification === 'Diploma' && (
            <>
              <FormSelect label="Diploma Type" value={form.diploma_type} options={DIPLOMA_TYPES} onSelect={(v) => { setField('diploma_type', v); setField('diploma_other', ''); }} required />
              {form.diploma_type === 'Other' && (
                <FloatingInput label="Specify Diploma Name" icon="pricetag" value={form.diploma_other} onChangeText={(v) => setField('diploma_other', v)} />
              )}
            </>
          )}
          {form.highest_qualification === 'Post Graduate' && (
            <>
              <FormSelect label="Degree Type" value={form.degree_type} options={degreeOptions} onSelect={(v) => { setField('degree_type', v); setField('degree_other', ''); }} required />
              {form.degree_type === 'Other' && (
                <FloatingInput label="Specify Degree" icon="pricetag" value={form.degree_other} onChangeText={(v) => setField('degree_other', v)} />
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
            options={TARGET_ROLE_OPTIONS}
            onSelect={(v) => setField('target_role', v)}
            required
          />
          <FormSelect
            label="Fresher / Experienced"
            value={form.experience_type}
            options={EXPERIENCE_OPTIONS}
            onSelect={(v) => {
              setField('experience_type', v);
              if (v === 'Fresher') setField('previous_salary', '');
            }}
            required
          />
          {form.experience_type === 'Experienced' && (
            <>
              <FloatingInput label="Total Experience (Years) *" icon="briefcase" value={form.total_experience_years} onChangeText={(v) => setField('total_experience_years', v)} keyboardType="decimal-pad" />
              <FloatingInput label="Current / Last Company *" icon="storefront" value={form.current_company} onChangeText={(v) => setField('current_company', v)} />
              <FloatingInput label="Current / Last Designation *" icon="person" value={form.current_designation} onChangeText={(v) => setField('current_designation', v)} />
              <FloatingInput label="Last Annual CTC (₹)" icon="cash" value={form.last_salary_ctc} onChangeText={(v) => setField('last_salary_ctc', v)} keyboardType="numeric" />
            </>
          )}
          {/* Previous Salary (Monthly ₹) — required for Experienced, disabled for Freshers (same as website) */}
          <FloatingInput
            label={form.experience_type === 'Experienced' ? 'Previous Salary (Monthly ₹) *' : 'Previous Salary (Monthly ₹)'}
            icon="cash"
            value={form.experience_type === 'Fresher' ? '' : form.previous_salary}
            onChangeText={(v) => setField('previous_salary', v)}
            keyboardType="numeric"
            editable={form.experience_type !== 'Fresher'}
          />
          <FormSelect
            label="Available for Immediate Joining?"
            value={form.immediate_joining}
            options={IMMEDIATE_JOINING_OPTIONS}
            onSelect={(v) => {
              setField('immediate_joining', v);
              if (v === 'Yes') setField('notice_period_days', '0');
            }}
            required
          />
          {form.immediate_joining === 'No' && (
            <>
              <FloatingInput label="Notice Period (Days) *" icon="time" value={form.notice_period_days} onChangeText={(v) => setField('notice_period_days', v)} keyboardType="number-pad" />
            </>
          )}
          <FormSelect
            label="Comfortable with job location?"
            value={form.comfortable_with_location}
            options={LOCATION_OPTIONS}
            onSelect={(v) => setField('comfortable_with_location', v)}
            required
          />
          <FormSelect
            label="Do you have relevant experience?"
            value={form.relevant_experience}
            options={RELEVANT_EXPERIENCE_OPTIONS}
            onSelect={(v) => setField('relevant_experience', v)}
            required
          />

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
          {(form.selected_hr === 'Other HR / Reference' || form.selected_hr === 'Other' || form.how_did_you_hear === 'Employee Reference' || form.how_did_you_hear === 'Other') && (
            <>
              <FloatingInput
                label={form.how_did_you_hear === 'Employee Reference' ? 'Referring Employee Name / Reference Details *' : 'HR Name / Reference Details *'}
                icon="person"
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
  otpCancelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: -4,
    marginBottom: 8,
    paddingVertical: 4,
  },
  otpCancelText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textLight,
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
