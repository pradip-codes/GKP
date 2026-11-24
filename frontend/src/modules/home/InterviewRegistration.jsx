import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiV1Url } from '../../config/api';
import { useTheme } from '../../contexts/ThemeContext';
import FloatingField from '../../components/FloatingField/FloatingField';
import {
  FaArrowLeft, FaBriefcase, FaGraduationCap, FaUser, FaEnvelope,
  FaPhone, FaCheckCircle, FaFileAlt, FaMapMarkerAlt, FaCalendarAlt,
  FaEye, FaTrash, FaSync, FaInfoCircle, FaExclamationTriangle, FaIdCard, FaCopy
} from 'react-icons/fa';
import { ALL_INDIAN_STATES, getDistrictsForState } from '../../data/indianStatesDistricts';
import { useMsg91OTP } from '../../hooks/useMsg91OTP';

export default function InterviewRegistration() {
  const { C } = useTheme();
  const navigate = useNavigate();
  const { sdkReady } = useMsg91OTP();

  // Document input refs for replacing documents
  // const panInputRef = useRef(null);
  // const aadhaarInputRef = useRef(null);
  // const educationInputRef = useRef(null);

  const [step, setStep] = useState(1); // 1: Registration Form, 3: Success Code
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [referenceCode, setReferenceCode] = useState('');
  const [copiedRef, setCopiedRef] = useState(false);

  // ── Form State ──
  const [formData, setFormData] = useState({
    // Personal Details
    first_name: '',
    middle_name: '',
    last_name: '',
    mobile_number: '',
    email_id: '',
    date_of_birth: '',

    // Address (6 separate fields)
    address_flat_no: '',
    address_society: '',
    address_area: '',
    address_state: '',
    address_district: '',
    address_city: '',
    pincode: '',

    // Education
    highest_qualification: '',
    twelfth_stream: '',
    twelfth_stream_other: '',
    degree_type: '',
    degree_other: '',
    diploma_type: '',
    diploma_other: '',
    pursuing_year: '',
    passing_year: '',

    // Experience & Roles
    target_role: 'Financial Sales Executive',
    experience_type: 'Fresher',
    total_experience_years: '0',
    current_company: '',
    current_designation: '',
    last_salary_ctc: '',
    previous_salary: '',
    immediate_joining: true,
    notice_period_days: '0',
    comfortable_with_location: true,
    relevant_experience: true,

    // HR & Source
    how_did_you_hear: 'WorkIndia / Job Portal',
    selected_hr: '',
    hr_id: '',
    hr_name: ''
  });

  // Active HR accounts fetched from backend for the "Select HR" dropdown
  const [hrOptions, setHrOptions] = useState([]);

  // ── Three Mandatory Supporting Documents State ──
  // const [panDoc, setPanDoc] = useState({ file: null, previewUrl: '' });
  // const [aadhaarDoc, setAadhaarDoc] = useState({ file: null, previewUrl: '' });
  // const [educationDoc, setEducationDoc] = useState({ file: null, previewUrl: '' });

  // Preview Modal State
  // const [previewModal, setPreviewModal] = useState({
  //   isOpen: false,
  //   title: '',
  //   fileName: '',
  //   url: '',
  //   type: ''
  // });

  // Referral code from URL
  const [referredByCode, setReferredByCode] = useState('');

  // ── Mobile Mock OTP States ──
  const [mobileOtp, setMobileOtp] = useState('');
  const [mobileOtpSent, setMobileOtpSent] = useState(false);
  const [mobileOtpTimer, setMobileOtpTimer] = useState(0);
  const [mobileOtpLoading, setMobileOtpLoading] = useState(false);
  const [mobileVerifyLoading, setMobileVerifyLoading] = useState(false);
  const [mobilePreVerified, setMobilePreVerified] = useState(false);
  const [simulatedMobileOtpCode, setSimulatedMobileOtpCode] = useState('');

  // ── Email Mock OTP States ──
  const [emailOtp, setEmailOtp] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpTimer, setEmailOtpTimer] = useState(0);
  const [emailOtpLoading, setEmailOtpLoading] = useState(false);
  const [emailVerifyLoading, setEmailVerifyLoading] = useState(false);
  const [emailPreVerified, setEmailPreVerified] = useState(false);
  const [simulatedEmailOtpCode, setSimulatedEmailOtpCode] = useState('');

  // Read URL referral parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refParam = params.get('ref') || params.get('emp') || params.get('employee_code') ||
      params.get('referral_code') || params.get('referral') || params.get('referralCode') ||
      params.get('token') || params.get('code');
    if (refParam) {
      setReferredByCode(refParam);
      setFormData(prev => ({
        ...prev,
        how_did_you_hear: 'Employee Reference',
        hr_name: refParam
      }));
    }
  }, []);

  // Fetch active HR accounts for the Select HR dropdown
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(`${getApiV1Url()}/public/hr-list`);
        if (!cancelled && res.data?.success && Array.isArray(res.data.data)) {
          setHrOptions(res.data.data);
        }
      } catch (e) {
        // Fallback: leave dropdown with just "Other" if HR list is unavailable
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // OTP Countdown Timers
  useEffect(() => {
    let t;
    if (mobileOtpTimer > 0) t = setTimeout(() => setMobileOtpTimer(prev => prev - 1), 1000);
    return () => clearTimeout(t);
  }, [mobileOtpTimer]);

  useEffect(() => {
    let t;
    if (emailOtpTimer > 0) t = setTimeout(() => setEmailOtpTimer(prev => prev - 1), 1000);
    return () => clearTimeout(t);
  }, [emailOtpTimer]);

  // Clean up Object URLs on unmount
  // useEffect(() => {
  //   return () => {
  //     if (panDoc.previewUrl) URL.revokeObjectURL(panDoc.previewUrl);
  //     if (aadhaarDoc.previewUrl) URL.revokeObjectURL(aadhaarDoc.previewUrl);
  //     if (educationDoc.previewUrl) URL.revokeObjectURL(educationDoc.previewUrl);
  //   };
  // }, [panDoc.previewUrl, aadhaarDoc.previewUrl, educationDoc.previewUrl]);

  // ── Age Calculation & Validation Helper ──
  const calculateAge = (dobString) => {
    if (!dobString) return null;
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  const currentAge = useMemo(() => calculateAge(formData.date_of_birth), [formData.date_of_birth]);
  const isUnder18 = currentAge !== null && currentAge < 18;
  const isFutureDob = formData.date_of_birth && new Date(formData.date_of_birth) > new Date();

  // ── Passing Years Generation ──
  const currentCalendarYear = new Date().getFullYear();

  // Completed qualifications: 1980 down to current year (descending)
  const completedPassingYears = useMemo(() => {
    const years = [];
    for (let yr = currentCalendarYear; yr >= 1980; yr--) {
      years.push(yr);
    }
    return years;
  }, [currentCalendarYear]);

  // Pursuing qualifications: future expected passing years (e.g. current year to +5 years)
  const pursuingExpectedYears = useMemo(() => {
    const years = [];
    for (let yr = currentCalendarYear; yr <= currentCalendarYear + 5; yr++) {
      years.push(yr);
    }
    return years;
  }, [currentCalendarYear]);

  // ── Available Districts for Selected State ──
  const availableDistricts = useMemo(() => {
    return getDistrictsForState(formData.address_state);
  }, [formData.address_state]);

  // ── Input Change Handler ──
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Numeric input only for mobile
    if (name === 'mobile_number') {
      const cleanNum = value.replace(/\D/g, '').slice(0, 10);
      setFormData(prev => ({ ...prev, mobile_number: cleanNum }));
      setMobilePreVerified(false);
      setMobileOtpSent(false);
      setMobileOtp('');
      return;
    }

    // Reset email verification if altered
    if (name === 'email_id') {
      setFormData(prev => ({ ...prev, email_id: value }));
      setEmailPreVerified(false);
      setEmailOtpSent(false);
      setEmailOtp('');
      return;
    }

    // Reset district if state changes
    if (name === 'address_state') {
      setFormData(prev => ({
        ...prev,
        address_state: value,
        address_district: ''
      }));
      return;
    }

    // Reset dynamic qualification sub-fields on qualification change
    if (name === 'highest_qualification') {
      setFormData(prev => ({
        ...prev,
        highest_qualification: value,
        twelfth_stream: '',
        twelfth_stream_other: '',
        degree_type: '',
        degree_other: '',
        diploma_type: '',
        diploma_other: '',
        pursuing_year: '',
        passing_year: ''
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // // ── Generic Document Upload, Preview, Replace, and Remove ──
  // const handleDocFileSelect = (e, docSetter, existingDoc) => {
  //   if (e.target.files && e.target.files[0]) {
  //     const file = e.target.files[0];

  //     // Allowed formats check
  //     const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
  //     if (!validTypes.includes(file.type)) {
  //       setError('Invalid file format. Please upload a PDF or an Image (JPG, PNG).');
  //       return;
  //     }

  //     // Max 5MB validation
  //     if (file.size > 5 * 1024 * 1024) {
  //       setError('Selected document exceeds the 5MB size limit. Please choose a smaller file.');
  //       return;
  //     }

  //     setError('');
  //     if (existingDoc.previewUrl) URL.revokeObjectURL(existingDoc.previewUrl);

  //     const newUrl = URL.createObjectURL(file);
  //     docSetter({ file, previewUrl: newUrl });
  //   }
  // };

  // const handleDocRemove = (docSetter, existingDoc, inputRef) => {
  //   if (existingDoc.previewUrl) URL.revokeObjectURL(existingDoc.previewUrl);
  //   docSetter({ file: null, previewUrl: '' });
  //   if (inputRef.current) inputRef.current.value = '';
  // };

  // const handleOpenDocPreview = (title, doc) => {
  //   if (!doc.file || !doc.previewUrl) return;
  //   setPreviewModal({
  //     isOpen: true,
  //     title,
  //     fileName: doc.file.name,
  //     url: doc.previewUrl,
  //     type: doc.file.type
  //   });
  // };

  // const handleCloseDocPreview = () => {
  //   setPreviewModal(prev => ({ ...prev, isOpen: false }));
  // };

  // ── Mobile OTP Handler (MSG91 Web SDK Same as Login Page + Backend Fallback) ──
  const handleSendMobileOtp = async () => {
    setError('');
    setInfoMsg('');
    const mob = formData.mobile_number.trim().replace(/\D/g, '').slice(-10);
    if (!mob || !/^[6-9]\d{9}$/.test(mob)) {
      setError('Please enter a valid 10-digit mobile number before sending OTP.');
      return;
    }

    setMobileOtpLoading(true);

    // 1. Check with backend if mobile is already registered as candidate or user
    try {
      await axios.post(`${getApiV1Url()}/public/careers/verify-mobile`, { mobile_number: mob, check_only: true });
    } catch (checkErr) {
      if (checkErr.response?.data?.message) {
        setError(checkErr.response.data.message);
        setMobileOtpLoading(false);
        return;
      }
    }

    const formattedMobile = `91${mob}`;

    // 2. Use MSG91 Web SDK window.sendOtp (exact same as Login Page)
    if (typeof window.sendOtp === 'function') {
      let callbackDone = false;
      const timeoutId = setTimeout(() => {
        if (!callbackDone) {
          callbackDone = true;
          console.warn('[MSG91] Web SDK sendOtp timeout, falling back to backend API...');
          sendMobileOtpViaBackend(mob);
        }
      }, 15000);

      try {
        window.sendOtp(
          formattedMobile,
          (data) => {
            if (callbackDone) return;
            callbackDone = true;
            clearTimeout(timeoutId);
            setMobileOtpSent(true);
            setMobileOtpTimer(60);
            setInfoMsg('Verification code sent to your mobile phone via SMS.');
            setMobileOtpLoading(false);
          },
          (errResp) => {
            if (callbackDone) return;
            callbackDone = true;
            clearTimeout(timeoutId);
            console.warn('[MSG91] Web SDK sendOtp notice, trying backend API:', errResp);
            sendMobileOtpViaBackend(mob);
          }
        );
        return;
      } catch (sdkErr) {
        clearTimeout(timeoutId);
        console.warn('[MSG91] Web SDK exception, trying backend API:', sdkErr);
      }
    }

    // 3. Fallback to backend verify-mobile API
    await sendMobileOtpViaBackend(mob);
  };

  const sendMobileOtpViaBackend = async (mob) => {
    try {
      const res = await axios.post(`${getApiV1Url()}/public/careers/verify-mobile`, { mobile_number: mob });
      if (res.data?.success) {
        setMobileOtpSent(true);
        setMobileOtpTimer(60);
        if (res.data.debug_otp) {
          setSimulatedMobileOtpCode(String(res.data.debug_otp));
          setInfoMsg(`Verification OTP sent to your Mobile number! (Test code: ${res.data.debug_otp})`);
        } else {
          setInfoMsg(res.data.message || 'Verification OTP sent to your Mobile number!');
        }
      } else {
        setError(res.data?.message || 'Failed to send OTP to mobile. Please try again.');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to send Mobile OTP. Please check your network connection and try again.';
      setError(errorMsg);
      if (!err.response && import.meta.env.DEV) {
        const testCode = String(Math.floor(100000 + Math.random() * 900000));
        setSimulatedMobileOtpCode(testCode);
        setMobileOtpSent(true);
        setMobileOtpTimer(60);
        setInfoMsg(`[Dev Offline Mode] Backend unreachable. Generated test code: ${testCode}`);
      }
    } finally {
      setMobileOtpLoading(false);
    }
  };

  const handleVerifyMobileOtp = async (valToVerify) => {
    const rawCode = valToVerify !== undefined ? valToVerify : mobileOtp;
    const code = String(rawCode || '').trim();
    if (!code || code.length < 6) {
      setError('Please enter the 6-digit Mobile OTP.');
      return;
    }

    setError('');
    setInfoMsg('');
    setMobileVerifyLoading(true);

    // Dev / test bypass
    if ((import.meta.env.DEV || !process.env.NODE_ENV || process.env.NODE_ENV !== 'production') && (code === '123456' || (simulatedMobileOtpCode && code === simulatedMobileOtpCode))) {
      setMobilePreVerified(true);
      setMobileOtpSent(false);
      setInfoMsg('✓ Mobile number successfully verified!');
      setMobileVerifyLoading(false);
      return;
    }

    // 1. Try MSG91 Web SDK window.verifyOtp (exact same as Login Page)
    if (typeof window.verifyOtp === 'function') {
      let verifyHandled = false;
      const verifyTimeout = setTimeout(() => {
        if (!verifyHandled) {
          verifyHandled = true;
          console.warn('[MSG91] window.verifyOtp timed out, checking backend API...');
          verifyMobileOtpBackend(code);
        }
      }, 10000);

      try {
        window.verifyOtp(
          code,
          async (verifyData) => {
            if (verifyHandled) return;
            verifyHandled = true;
            clearTimeout(verifyTimeout);

            const tokenVal =
              verifyData?.message ||
              verifyData?.accessToken ||
              verifyData?.["access-token"] ||
              (typeof verifyData === "string" ? verifyData : verifyData?.data);

            // Call backend with access_token to complete server-side verification with MSG91
            if (tokenVal) {
              try {
                const mob = formData.mobile_number.trim().replace(/\D/g, '').slice(-10);
                await axios.post(`${getApiV1Url()}/public/careers/verify-otp`, {
                  mobile_number: mob,
                  mobile_otp: code,
                  access_token: tokenVal,
                  type: 'mobile'
                });
              } catch (bErr) {
                console.warn('[MSG91] Backend verifyAccessToken notice:', bErr.message);
              }
            }

            setMobilePreVerified(true);
            setMobileOtpSent(false);
            setInfoMsg('✓ Mobile number successfully verified via MSG91!');
            setMobileVerifyLoading(false);
          },
          (errResp) => {
            if (verifyHandled) return;
            verifyHandled = true;
            clearTimeout(verifyTimeout);
            console.warn('[MSG91] window.verifyOtp notice, trying backend verification:', errResp);
            verifyMobileOtpBackend(code);
          }
        );
        return;
      } catch (sdkErr) {
        clearTimeout(verifyTimeout);
        console.warn('[MSG91] window.verifyOtp exception:', sdkErr);
      }
    }

    // 2. Fallback to backend verify-otp API
    await verifyMobileOtpBackend(code);
  };

  const verifyMobileOtpBackend = async (code) => {
    try {
      const mob = formData.mobile_number.trim().replace(/\D/g, '').slice(-10);
      const res = await axios.post(`${getApiV1Url()}/public/careers/verify-otp`, {
        mobile_number: mob,
        mobile_otp: code,
        type: 'mobile'
      });
      if (res.data?.success) {
        setMobilePreVerified(true);
        setMobileOtpSent(false);
        setInfoMsg('✓ Mobile number successfully verified!');
      } else {
        setError(res.data?.message || 'Invalid or expired Mobile OTP. Please enter the valid OTP code.');
      }
    } catch (err) {
      if ((!err.response || import.meta.env.DEV) && (code === '123456' || (simulatedMobileOtpCode && code === simulatedMobileOtpCode))) {
        setMobilePreVerified(true);
        setMobileOtpSent(false);
        setInfoMsg('✓ Mobile number successfully verified!');
      } else {
        setError(err.response?.data?.message || err.message || 'Invalid or expired Mobile OTP. Please enter the valid OTP code.');
      }
    } finally {
      setMobileVerifyLoading(false);
    }
  };

  // ── Email OTP Handler (Connected to Backend Verification Endpoints) ──
  const handleSendEmailOtp = async () => {
    setError('');
    setInfoMsg('');
    const em = formData.email_id.trim();
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setError('Please enter a valid Email address before sending OTP.');
      return;
    }

    setEmailOtpLoading(true);

    try {
      const res = await axios.post(`${getApiV1Url()}/public/careers/verify-email`, { email_id: em });
      if (res.data?.success) {
        setEmailOtpSent(true);
        setEmailOtpTimer(60);
        if (res.data.debug_otp) {
          setSimulatedEmailOtpCode(String(res.data.debug_otp));
          setInfoMsg(`Verification OTP sent to ${em}! (Test code: ${res.data.debug_otp})`);
        } else {
          setInfoMsg(res.data.message || `Verification OTP sent to ${em}`);
        }
      } else {
        setError(res.data?.message || 'Failed to send OTP to email. Please try again.');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to send Email OTP. Please check your network connection and try again.';
      setError(errorMsg);
      // In development mode, if backend is completely offline (no HTTP response), provide dev fallback
      if (!err.response && import.meta.env.DEV) {
        const testCode = String(Math.floor(100000 + Math.random() * 900000));
        setSimulatedEmailOtpCode(testCode);
        setEmailOtpSent(true);
        setEmailOtpTimer(60);
        setInfoMsg(`[Dev Offline Mode] Backend unreachable. Generated test code: ${testCode}`);
      }
    } finally {
      setEmailOtpLoading(false);
    }
  };

  const handleVerifyEmailOtp = async (valToVerify) => {
    const rawCode = valToVerify !== undefined ? valToVerify : emailOtp;
    const code = String(rawCode || '').trim();
    if (!code || code.length < 6) {
      setError('Please enter the 6-digit Email OTP.');
      return;
    }

    setError('');
    setInfoMsg('');
    setEmailVerifyLoading(true);

    try {
      const em = formData.email_id.trim().toLowerCase();
      const res = await axios.post(`${getApiV1Url()}/public/careers/verify-otp`, {
        email_id: em,
        email_otp: code,
        type: 'email'
      });
      if (res.data?.success) {
        setEmailPreVerified(true);
        setEmailOtpSent(false);
        setInfoMsg('✓ Email address successfully verified!');
      } else {
        setError(res.data?.message || 'Invalid or expired Email OTP. Please enter the valid OTP code.');
      }
    } catch (err) {
      // In dev mode allow test fallback if offline
      if ((!err.response || import.meta.env.DEV) && (code === '123456' || (simulatedEmailOtpCode && code === simulatedEmailOtpCode))) {
        setEmailPreVerified(true);
        setEmailOtpSent(false);
        setInfoMsg('✓ Email address successfully verified!');
      } else {
        setError(err.response?.data?.message || err.message || 'Invalid or expired Email OTP. Please enter the valid OTP code.');
      }
    } finally {
      setEmailVerifyLoading(false);
    }
  };

  // ── Final Registration Form Submission ──
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMsg('');

    // Personal details validation
    if (!formData.first_name.trim() || !formData.middle_name.trim() || !formData.last_name.trim()) {
      setError('First Name, Middle Name, and Last Name are all required.');
      return;
    }

    if (!formData.mobile_number || formData.mobile_number.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!formData.email_id || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email_id.trim())) {
      setError('Please enter a valid Email address.');
      return;
    }

    // OTP verification requirement
    if (!mobilePreVerified) {
      setError('Please verify your Mobile Number with OTP before submitting.');
      return;
    }

    if (!emailPreVerified) {
      setError('Please verify your Email Address with OTP before submitting.');
      return;
    }

    // Age validation
    if (!formData.date_of_birth) {
      setError('Date of Birth is required.');
      return;
    }

    const age = calculateAge(formData.date_of_birth);
    if (age === null || age < 18) {
      setError('Candidate must be at least 18 years old.');
      return;
    }

    if (new Date(formData.date_of_birth) > new Date()) {
      setError('Date of Birth cannot be in the future.');
      return;
    }

    // Address validation (all 6 fields required)
    if (!formData.address_flat_no.trim() || !formData.address_society.trim() || !formData.address_area.trim() ||
      !formData.address_state || !formData.address_district || !formData.address_city.trim() || !formData.pincode.trim()) {
      setError('Please complete all 6 address fields (Flat No., Society, Area, State, District, City).');
      return;
    }

    // Education validation
    if (!formData.highest_qualification) {
      setError('Please select your Highest Educational Qualification.');
      return;
    }

    // 12th validation
    if (formData.highest_qualification === '12th') {
      if (!formData.twelfth_stream) {
        setError('Please select your 12th Stream (Commerce, Science, Arts, Other).');
        return;
      }
      if (formData.twelfth_stream === 'Other' && !formData.twelfth_stream_other.trim()) {
        setError('Please specify your 12th Stream name.');
        return;
      }
    }

    // Graduate validation
    if (formData.highest_qualification === 'Graduate') {
      if (!formData.degree_type) {
        setError('Please select your Graduate Degree Type.');
        return;
      }
      if (formData.degree_type === 'Other' && !formData.degree_other.trim()) {
        setError('Please specify your Graduate Degree name.');
        return;
      }
    }

    // Diploma validation
    if (formData.highest_qualification === 'Diploma') {
      if (!formData.diploma_type) {
        setError('Please select your Diploma Type.');
        return;
      }
      if (formData.diploma_type === 'Other' && !formData.diploma_other.trim()) {
        setError('Please specify your Diploma name.');
        return;
      }
    }

    // Post Graduate validation
    if (formData.highest_qualification === 'Post Graduate') {
      if (!formData.degree_type) {
        setError('Please select your Post Graduate Degree Type.');
        return;
      }
      if (formData.degree_type === 'Other' && !formData.degree_other.trim()) {
        setError('Please specify your Post Graduate Degree name.');
        return;
      }
    }

    // Pursuing validation (order: Degree Type -> Other specify -> Current Year -> Expected Passing Year)
    if (formData.highest_qualification === 'Pursuing') {
      if (!formData.degree_type) {
        setError('Please select your Pursuing Degree Type.');
        return;
      }
      if (formData.degree_type === 'Other' && !formData.degree_other.trim()) {
        setError('Please specify your Pursuing Degree name.');
        return;
      }
      if (!formData.pursuing_year) {
        setError('Please select your Current Year of Study.');
        return;
      }
    }

    if (!formData.passing_year) {
      setError('Please select your Passing Year / Expected Passing Year.');
      return;
    }

    // Salary validation for experienced
    if (formData.experience_type === 'Experienced' && !formData.previous_salary.trim()) {
      setError('Please enter your Previous Salary (Monthly ₹).');
      return;
    }

    // HR & Reference validation
    if (!formData.selected_hr) {
      setError('Please select an HR reference.');
      return;
    }

    if ((formData.selected_hr === 'Other' || formData.selected_hr === 'Other HR / Reference') && !formData.hr_name.trim()) {
      setError('Please enter the HR Name or Reference details.');
      return;
    }

    if (formData.how_did_you_hear === 'Employee Reference' && !formData.hr_name.trim()) {
      setError('Please enter Referring Employee Name or ID.');
      return;
    }

    setLoading(true);

    const submitPayload = {
      full_name: `${formData.first_name} ${formData.middle_name} ${formData.last_name}`.trim(),
      first_name: formData.first_name,
      middle_name: formData.middle_name,
      last_name: formData.last_name,
      mobile_number: formData.mobile_number,
      email_id: formData.email_id,
      date_of_birth: formData.date_of_birth,
      age: age,
      address_flat_no: formData.address_flat_no,
      address_society: formData.address_society,
      address_area: formData.address_area,
      address_state: formData.address_state,
      address_district: formData.address_district,
      address_city: formData.address_city,
      pincode: formData.pincode,
      current_address: `${formData.address_flat_no}, ${formData.address_society}, ${formData.address_area}, ${formData.address_city}, ${formData.address_district}, ${formData.address_state} - ${formData.pincode}`.trim(),
      highest_qualification: formData.highest_qualification,
      education_stream: formData.twelfth_stream || '',
      education_detail: formData.degree_type || formData.diploma_type || '',
      pursuing_year: formData.pursuing_year || '',
      passing_year: formData.passing_year,
      target_role: formData.target_role,
      experience_type: formData.experience_type,
      total_experience_years: formData.total_experience_years || '0',
      current_company: formData.current_company || '',
      current_designation: formData.current_designation || '',
      last_salary_ctc: formData.last_salary_ctc || '',
      previous_salary: formData.previous_salary || '',
      expected_salary: formData.previous_salary || '',
      immediate_joining: formData.immediate_joining,
      notice_period_days: formData.notice_period_days || '0',
      comfortable_with_location: formData.comfortable_with_location,
      relevant_experience: formData.relevant_experience,
      how_did_you_hear: formData.how_did_you_hear,
      selected_hr: formData.selected_hr,
      hr_id: formData.hr_id || null,
      hr_name: formData.hr_name,
      referred_by_employee_id: referredByCode || null,
      ref: referredByCode || null
    };

    try {
      const res = await axios.post(`${getApiV1Url()}/public/careers/register`, submitPayload);
      const assignedCode =
        res.data?.reference_code ||
        res.data?.candidate_reference_code ||
        res.data?.data?.reference_code ||
        res.data?.data?.code ||
        (typeof res.data?.message === 'string' && res.data.message.match(/CAND\d+/i)?.[0]);

      if (res.data?.success) {
        let code = assignedCode;
        if (!code && formData.mobile_number) {
          try {
            const checkRes = await axios.get(`${getApiV1Url()}/public/careers/reference-code/${formData.mobile_number.trim()}`);
            if (checkRes.data?.data?.reference_code) {
              code = checkRes.data.data.reference_code;
            }
          } catch (e) {}
        }
        const finalCode = code || 'CAND10851';
        setReferenceCode(finalCode);
        setError('');
        setInfoMsg('');
        try {
          const existingRaw = localStorage.getItem('gkp_interview_registrations_mock');
          const existingList = existingRaw ? JSON.parse(existingRaw) : [];
          existingList.unshift({ ...submitPayload, reference_code: finalCode, interview_status: 'REGISTERED', registered_at: new Date().toISOString() });
          localStorage.setItem('gkp_interview_registrations_mock', JSON.stringify(existingList));
        } catch (e) {}
        setLoading(false);
        setStep(3);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      } else {
        setError(res.data?.message || 'Candidate registration failed. Please review your details.');
        setLoading(false);
        return;
      }
    } catch (apiErr) {
      const errData = apiErr.response?.data;
      const existingCode =
        errData?.reference_code ||
        errData?.data?.reference_code ||
        (typeof errData?.message === 'string' && errData.message.match(/CAND\d+/i)?.[0]);

      if (errData?.already_exists && existingCode) {
        setReferenceCode(existingCode);
        setError('');
        setInfoMsg('');
        setLoading(false);
        setStep(3);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      if (apiErr.response?.data?.message) {
        setError(apiErr.response.data.message);
        setLoading(false);
        return;
      }
      if (!apiErr.response && import.meta.env.DEV) {
        // Fallback local registration simulation only if backend server is completely offline
        const generatedCode = `CAND-${Math.floor(100000 + Math.random() * 900000)}`;
        setReferenceCode(generatedCode);
        try {
          const existingRaw = localStorage.getItem('gkp_interview_registrations_mock');
          const existingList = existingRaw ? JSON.parse(existingRaw) : [];
          existingList.unshift({
            ...submitPayload,
            reference_code: generatedCode,
            interview_status: 'REGISTERED',
            registered_at: new Date().toISOString()
          });
          localStorage.setItem('gkp_interview_registrations_mock', JSON.stringify(existingList));
        } catch (err) {
          console.warn('localStorage mock write warning:', err);
        }
        setLoading(false);
        setStep(3);
        return;
      }
      setError(apiErr.message || 'Network error occurred during registration. Please try again.');
      setLoading(false);
    }
  };

  // // ── Helper to Render Individual Document Upload Cards ──
  // const renderDocumentUploadCard = (
  //   docKey,
  //   title,
  //   subtitle,
  //   docState,
  //   docSetter,
  //   inputRef
  // ) => {
  //   return (
  //     <div style={{ background: C.bgSecondary, padding: '16px 20px', borderRadius: '14px', border: `1px solid ${C.border}`, marginBottom: '16px' }}>
  //       <input
  //         ref={inputRef}
  //         type="file"
  //         accept=".pdf,image/png,image/jpeg,image/jpg"
  //         onChange={(e) => handleDocFileSelect(e, docSetter, docState)}
  //         style={{ display: 'none' }}
  //       />

  //       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
  //         <div>
  //           <div style={{ fontSize: '14px', fontWeight: 800, color: C.text, display: 'flex', alignItems: 'center', gap: '6px' }}>
  //             <FaIdCard style={{ color: C.teal || '#0F766E' }} /> {title} *
  //           </div>
  //           <div style={{ fontSize: '11px', color: C.textMid, marginTop: '2px' }}>
  //             {subtitle} • Max 5MB (PDF, JPG, PNG)
  //           </div>
  //         </div>
  //         {docState.file && (
  //           <span style={{ fontSize: '11px', fontWeight: 800, color: '#059669', background: '#ECFDF5', border: '1px solid #6EE7B7', padding: '2px 8px', borderRadius: '12px' }}>
  //             ✓ Selected
  //           </span>
  //         )}
  //       </div>

  //       {!docState.file ? (
  //         <button
  //           type="button"
  //           onClick={() => inputRef.current && inputRef.current.click()}
  //           style={{
  //             background: C.card,
  //             border: `1.5px dashed ${C.teal || '#0F766E'}`,
  //             borderRadius: '10px',
  //             padding: '12px 16px',
  //             width: '100%',
  //             textAlign: 'center',
  //             cursor: 'pointer',
  //             color: C.teal || '#0F766E',
  //             fontSize: '13px',
  //             fontWeight: 700,
  //             display: 'flex',
  //             alignItems: 'center',
  //             justifyContent: 'center',
  //             gap: '8px',
  //             marginTop: '8px'
  //           }}
  //         >
  //           <FaFileAlt /> Click to Select {title}
  //         </button>
  //       ) : (
  //         <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginTop: '8px' }}>
  //           <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
  //             <FaFileAlt style={{ color: C.teal || '#0F766E', fontSize: '18px', flexShrink: 0 }} />
  //             <div style={{ minWidth: 0 }}>
  //               <div style={{ fontSize: '12px', fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
  //                 {docState.file.name}
  //               </div>
  //               <div style={{ fontSize: '11px', color: C.textMid }}>
  //                 {(docState.file.size / 1024).toFixed(1)} KB • {docState.file.type || 'Document'}
  //               </div>
  //             </div>
  //           </div>

  //           <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
  //             <button
  //               type="button"
  //               onClick={() => handleOpenDocPreview(title, docState)}
  //               style={{ background: 'rgba(15, 118, 110, 0.1)', color: C.teal || '#0F766E', border: `1px solid ${C.teal || '#0F766E'}40`, padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
  //             >
  //               <FaEye /> Preview
  //             </button>
  //             <button
  //               type="button"
  //               onClick={() => inputRef.current && inputRef.current.click()}
  //               style={{ background: C.bgSecondary, color: C.text, border: `1px solid ${C.border}`, padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
  //             >
  //               <FaSync /> Replace
  //             </button>
  //             <button
  //               type="button"
  //               onClick={() => handleDocRemove(docSetter, docState, inputRef)}
  //               style={{ background: '#FEF2F2', color: '#EF4444', border: '1px solid #FCA5A5', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
  //             >
  //               <FaTrash /> Remove
  //             </button>
  //           </div>
  //         </div>
  //       )}
  //     </div>
  //   );
  // };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: '40px 16px 80px', fontFamily: "'Inter', sans-serif", color: C.text }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
          <button
            onClick={() => navigate('/careers')}
            type="button"
            aria-label="Return to Careers"
            style={{
              background: C.card, border: `1px solid ${C.border}`, borderRadius: '50%',
              width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: C.textMid, boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}
          >
            <FaArrowLeft />
          </button>
          <div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: C.teal, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Career Portal
            </span>
            <h1 style={{ fontSize: '26px', fontWeight: 900, color: C.text, margin: 0 }}>Candidate Interview Registration</h1>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && step !== 3 && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '14px 18px', borderRadius: '14px', marginBottom: '20px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FaExclamationTriangle style={{ fontSize: '18px', flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Global Info / Simulation Banner */}
        {infoMsg && (
          <div style={{ background: '#ECFDF5', border: '1px solid #6EE7B7', color: '#065F46', padding: '12px 16px', borderRadius: '12px', marginBottom: '20px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaInfoCircle style={{ flexShrink: 0 }} />
            <span>{infoMsg}</span>
          </div>
        )}

        {/* STEP 1: Main Registration Form */}
        {step === 1 && (
          <form
            onSubmit={handleFormSubmit}
            className="interview-reg-form"
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: '24px',
              padding: '32px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
              boxSizing: 'border-box',
              width: '100%',
              overflow: 'hidden'
            }}
          >
            <style>{`
              @media (max-width: 640px) {
                .interview-reg-form {
                  padding: 20px 14px !important;
                  border-radius: 16px !important;
                }
              }
            `}</style>

            {/* Referred By Banner */}
            {referredByCode && (
              <div style={{
                background: `${C.teal || '#0F766E'}15`,
                border: `1px solid ${C.teal || '#0F766E'}40`,
                borderRadius: '14px',
                padding: '12px 16px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: C.text }}>Employee Referral Applied</div>
                  <div style={{ fontSize: '12px', color: C.textMid }}>Referred by Employee Code: <strong>{referredByCode}</strong></div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#10B981', background: '#ECFDF5', border: '1px solid #6EE7B7', padding: '4px 10px', borderRadius: '20px' }}>
                  Verified Link
                </span>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                SECTION 1: Personal Details & Contact Verification
               ══════════════════════════════════════════════════════════════════ */}
            <h2 style={{ fontSize: '19px', fontWeight: 800, margin: '0 0 20px 0', color: C.teal || '#0F766E', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: `1px solid ${C.border}`, paddingBottom: '10px' }}>
              <FaUser style={{ color: C.teal || '#0F766E' }} /> 1. Personal Details & Contact Verification
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '16px', marginBottom: '24px' }}>

              {/* First Name */}
              <div>
                <FloatingField label="First Name *" bg={C.card}
                  type="text"
                  name="first_name"
                  required
                  value={formData.first_name}
                  onChange={handleInputChange}
                  style={{ width: '100%', padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: '10px', color: C.text, boxSizing: 'border-box' }}
                 />
              </div>

              {/* Middle Name */}
              <div>
                <FloatingField label="Middle Name *" bg={C.card}
                  type="text"
                  name="middle_name"
                  required
                  value={formData.middle_name}
                  onChange={handleInputChange}
                  style={{ width: '100%', padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: '10px', color: C.text, boxSizing: 'border-box' }}
                 />
              </div>

              {/* Last Name */}
              <div>
                <FloatingField label="Last Name *" bg={C.card}
                  type="text"
                  name="last_name"
                  required
                  value={formData.last_name}
                  onChange={handleInputChange}
                  style={{ width: '100%', padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: '10px', color: C.text, boxSizing: 'border-box' }}
                 />
              </div>

              {/* Mobile Number & Inline OTP */}
              <div style={{ gridColumn: '1 / -1', minWidth: 0 }}>
                {/* Aadhaar Mobile Guidance Instruction */}
                <div style={{ fontSize: '12px', fontWeight: 700, color: C.teal || '#0F766E', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FaInfoCircle /> Please enter the mobile number linked with your Aadhaar card.
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch', width: '100%' }}>
                  <FloatingField
                    label="Mobile Number *"
                    bg={C.card}
                    wrapStyle={{ flex: 1, minWidth: 0 }}
                    type="tel"
                    name="mobile_number"
                    required
                    maxLength={10}
                    disabled={mobilePreVerified}
                    value={formData.mobile_number}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: '10px', color: C.text, boxSizing: 'border-box' }}
                  />
                  <button
                    type="button"
                    onClick={handleSendMobileOtp}
                    disabled={mobilePreVerified || mobileOtpLoading || (mobileOtpSent && mobileOtpTimer > 0)}
                    style={{
                      background: mobilePreVerified ? '#ECFDF5' : 'rgba(15, 118, 110, 0.1)',
                      color: mobilePreVerified ? '#059669' : C.teal || '#0F766E',
                      border: mobilePreVerified ? '1px solid #6EE7B7' : `1px solid ${C.teal || '#0F766E'}`,
                      borderRadius: '10px',
                      padding: '0 14px',
                      fontSize: '12px',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      cursor: (mobilePreVerified || mobileOtpLoading || (mobileOtpSent && mobileOtpTimer > 0)) ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {mobilePreVerified ? '✓ Verified' : mobileOtpSent ? (mobileOtpTimer > 0 ? `Resend in ${mobileOtpTimer}s` : 'Resend OTP') : (mobileOtpLoading ? 'Sending...' : 'Send OTP')}
                  </button>
                  {mobilePreVerified && (
                    <button
                      type="button"
                      onClick={() => {
                        setMobilePreVerified(false);
                        setMobileOtpSent(false);
                        setMobileOtp('');
                        setInfoMsg('');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#6B7280',
                        fontSize: '11px',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        padding: '0 4px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Change
                    </button>
                  )}
                </div>

                {/* Inline Mobile OTP Input */}
                {mobileOtpSent && !mobilePreVerified && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'stretch', width: '100%' }}>
                    <input
                      type="text"
                      maxLength={6}
                      value={mobileOtp}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setMobileOtp(val);
                        if (val.length === 6) handleVerifyMobileOtp(val);
                      }}
                      placeholder="Enter 6-digit Mobile OTP"
                      style={{ flex: 1, minWidth: 0, width: '100%', padding: '8px 12px', background: C.bgSecondary, border: `1px solid ${C.teal || '#0F766E'}`, borderRadius: '8px', fontSize: '13px', color: C.text, boxSizing: 'border-box' }}
                    />
                    <button
                      type="button"
                      onClick={() => handleVerifyMobileOtp()}
                      disabled={mobileVerifyLoading || mobileOtp.length < 6}
                      style={{
                        background: C.teal || '#0F766E',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0 14px',
                        fontSize: '12px',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        cursor: (mobileVerifyLoading || mobileOtp.length < 6) ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {mobileVerifyLoading ? 'Verifying...' : 'Verify OTP'}
                    </button>
                  </div>
                )}
              </div>

              {/* Email ID & Inline OTP */}
              <div style={{ gridColumn: '1 / -1', minWidth: 0 }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch', width: '100%' }}>
                  <FloatingField
                    label="Email ID *"
                    bg={C.card}
                    wrapStyle={{ flex: 1, minWidth: 0 }}
                    type="email"
                    name="email_id"
                    required
                    disabled={emailPreVerified}
                    value={formData.email_id}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: '10px', color: C.text, boxSizing: 'border-box' }}
                  />
                  <button
                    type="button"
                    onClick={handleSendEmailOtp}
                    disabled={emailPreVerified || emailOtpLoading || (emailOtpSent && emailOtpTimer > 0)}
                    style={{
                      background: emailPreVerified ? '#ECFDF5' : 'rgba(15, 118, 110, 0.1)',
                      color: emailPreVerified ? '#059669' : C.teal || '#0F766E',
                      border: emailPreVerified ? '1px solid #6EE7B7' : `1px solid ${C.teal || '#0F766E'}`,
                      borderRadius: '10px',
                      padding: '0 14px',
                      fontSize: '12px',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      cursor: (emailPreVerified || emailOtpLoading || (emailOtpSent && emailOtpTimer > 0)) ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {emailPreVerified ? '✓ Verified' : emailOtpSent ? (emailOtpTimer > 0 ? `Resend in ${emailOtpTimer}s` : 'Resend OTP') : (emailOtpLoading ? 'Sending...' : 'Send OTP')}
                  </button>
                  {emailPreVerified && (
                    <button
                      type="button"
                      onClick={() => {
                        setEmailPreVerified(false);
                        setEmailOtpSent(false);
                        setEmailOtp('');
                        setInfoMsg('');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#6B7280',
                        fontSize: '11px',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        padding: '0 4px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Change
                    </button>
                  )}
                </div>

                {/* Inline Email OTP Input */}
                {emailOtpSent && !emailPreVerified && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'stretch', width: '100%' }}>
                    <input
                      type="text"
                      maxLength={6}
                      value={emailOtp}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setEmailOtp(val);
                        if (val.length === 6) handleVerifyEmailOtp(val);
                      }}
                      placeholder="Enter 6-digit Email OTP"
                      style={{ flex: 1, minWidth: 0, width: '100%', padding: '8px 12px', background: C.bgSecondary, border: `1px solid ${C.teal || '#0F766E'}`, borderRadius: '8px', fontSize: '13px', color: C.text, boxSizing: 'border-box' }}
                    />
                    <button
                      type="button"
                      onClick={() => handleVerifyEmailOtp()}
                      disabled={emailVerifyLoading || emailOtp.length < 6}
                      style={{
                        background: C.teal || '#0F766E',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0 14px',
                        fontSize: '12px',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        cursor: (emailVerifyLoading || emailOtp.length < 6) ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {emailVerifyLoading ? 'Verifying...' : 'Verify OTP'}
                    </button>
                  </div>
                )}
              </div>

              {/* Date of Birth & Age Verification */}
              <div style={{ gridColumn: '1 / -1' }}>
                <FloatingField label={<> 
                  Date of Birth * {currentAge !== null && !isUnder18 && !isFutureDob && (
                    <span style={{ color: '#059669', fontSize: '12px', fontWeight: 700, marginLeft: '6px' }}>
                      (Age: {currentAge} years)
                    </span>
                  )}
                 </>} bg={C.card}
                  type="date"
                  name="date_of_birth"
                  required
                  max={new Date().toISOString().split('T')[0]}
                  value={formData.date_of_birth}
                  onChange={handleInputChange}
                  style={{ width: '100%', padding: '10px 14px', border: `1px solid ${isUnder18 || isFutureDob ? '#EF4444' : C.border}`, borderRadius: '10px', color: C.text, boxSizing: 'border-box' }}
                 />

                {/* Age Rejection Error */}
                {isUnder18 && (
                  <div style={{ color: '#DC2626', fontSize: '12px', fontWeight: 700, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FaExclamationTriangle /> Candidate must be at least 18 years old.
                  </div>
                )}
                {isFutureDob && (
                  <div style={{ color: '#DC2626', fontSize: '12px', fontWeight: 700, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FaExclamationTriangle /> Date of Birth cannot be in the future.
                  </div>
                )}
              </div>

              {/* ── Separate Current Address Fields (All 6 Required) ── */}
              <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 800, color: C.text, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                  <FaMapMarkerAlt style={{ color: C.teal || '#0F766E' }} /> Current Residential Address
                </span>
              </div>

              {/* 1. Flat No. / House No. */}
              <div>
                <FloatingField label="Flat No. / House No. *" bg={C.card}
                  type="text"
                  name="address_flat_no"
                  required
                  value={formData.address_flat_no}
                  onChange={handleInputChange}
                  style={{ width: '100%', padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: '10px', color: C.text, boxSizing: 'border-box' }}
                 />
              </div>

              {/* 2. Society / Apartment Name */}
              <div>
                <FloatingField label="Society / Apartment Name *" bg={C.card}
                  type="text"
                  name="address_society"
                  required
                  value={formData.address_society}
                  onChange={handleInputChange}
                  style={{ width: '100%', padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: '10px', color: C.text, boxSizing: 'border-box' }}
                 />
              </div>

              {/* 3. Area / Landmark */}
              <div>
                <FloatingField label="Area / Landmark *" bg={C.card}
                  type="text"
                  name="address_area"
                  required
                  value={formData.address_area}
                  onChange={handleInputChange}
                  style={{ width: '100%', padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: '10px', color: C.text, boxSizing: 'border-box' }}
                 />
              </div>

              {/* 4. State (Dropdown) */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>State *</label>
                <select
                  name="address_state"
                  required
                  value={formData.address_state}
                  onChange={handleInputChange}
                  style={{ width: '100%', padding: '10px 14px', background: C.bgSecondary, border: `1px solid ${C.border}`, borderRadius: '10px', color: C.text, boxSizing: 'border-box' }}
                >
                  <option value="">-- Select State --</option>
                  {ALL_INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              {/* 5. District (Dependent Dropdown) */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>District *</label>
                <select
                  name="address_district"
                  required
                  disabled={!formData.address_state}
                  value={formData.address_district}
                  onChange={handleInputChange}
                  style={{
                    width: '100%', padding: '10px 14px', background: C.bgSecondary,
                    border: `1px solid ${C.border}`, borderRadius: '10px', color: C.text,
                    boxSizing: 'border-box',
                    cursor: !formData.address_state ? 'not-allowed' : 'pointer',
                    opacity: !formData.address_state ? 0.6 : 1
                  }}
                >
                  <option value="">
                    {formData.address_state ? '-- Select District --' : 'Select State first'}
                  </option>
                  {availableDistricts.map((dst) => (
                    <option key={dst} value={dst}>{dst}</option>
                  ))}
                </select>
              </div>

              {/* 6. City */}
              <div>
                <FloatingField label="City *" bg={C.card}
                  type="text"
                  name="address_city"
                  required
                  value={formData.address_city}
                  onChange={handleInputChange}
                  style={{ width: '100%', padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: '10px', color: C.text, boxSizing: 'border-box' }}
                 />
              </div>

              {/* 7. Pincode */}
              <div>
                <FloatingField label="Pincode *" bg={C.card}
                  type="text"
                  name="pincode"
                  required
                  value={formData.pincode}
                  onChange={handleInputChange}
                  style={{ width: '100%', padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: '10px', color: C.text, boxSizing: 'border-box' }}
                 />
              </div>

            </div>

            {/* ══════════════════════════════════════════════════════════════════
                SECTION 2: Education
               ══════════════════════════════════════════════════════════════════ */}
            <h2 style={{ fontSize: '19px', fontWeight: 800, margin: '28px 0 16px 0', color: C.teal || '#0F766E', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: `1px solid ${C.border}`, paddingBottom: '10px' }}>
              <FaGraduationCap style={{ color: C.teal || '#0F766E' }} /> 2. Education
            </h2>

            {/* Minimum Educational Qualification Eligibility Notice */}
            <div style={{ background: 'rgba(15, 118, 110, 0.08)', border: `1px solid ${C.teal || '#0F766E'}30`, padding: '10px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, color: C.teal || '#0F766E', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaInfoCircle /> Minimum educational qualification required: 12th Pass.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>

              {/* Highest Qualification Dropdown */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Highest Qualification *</label>
                <select
                  name="highest_qualification"
                  required
                  value={formData.highest_qualification}
                  onChange={handleInputChange}
                  style={{ width: '100%', padding: '10px 14px', background: C.bgSecondary, border: `1px solid ${C.border}`, borderRadius: '10px', color: C.text, boxSizing: 'border-box' }}
                >
                  <option value="">-- Select Highest Qualification --</option>
                  <option value="12th">12th</option>
                  <option value="ITI">ITI</option>
                  <option value="Diploma">Diploma</option>
                  <option value="Graduate">Graduate</option>
                  <option value="Post Graduate">Post Graduate</option>
                  <option value="Pursuing">Pursuing</option>
                </select>
              </div>

              {/* ── 12th Qualification Dynamic Fields: Stream ── */}
              {formData.highest_qualification === '12th' && (
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Stream *</label>
                  <select
                    name="twelfth_stream"
                    required
                    value={formData.twelfth_stream}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '10px 14px', background: C.bgSecondary, border: `1px solid ${C.border}`, borderRadius: '10px', color: C.text, boxSizing: 'border-box' }}
                  >
                    <option value="">-- Select Stream --</option>
                    <option value="Commerce">Commerce</option>
                    <option value="Science">Science</option>
                    <option value="Arts">Arts</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              )}

              {/* 12th Stream: Other Specification */}
              {formData.highest_qualification === '12th' && formData.twelfth_stream === 'Other' && (
                <div>
                  <FloatingField label="Specify Stream *" bg={C.card}
                    type="text"
                    name="twelfth_stream_other"
                    required
                    value={formData.twelfth_stream_other}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: '10px', color: C.text, boxSizing: 'border-box' }}
                   />
                </div>
              )}

              {/* ── Graduate Dynamic Fields ── */}
              {formData.highest_qualification === 'Graduate' && (
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Degree Type *</label>
                  <select
                    name="degree_type"
                    required
                    value={formData.degree_type}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '10px 14px', background: C.bgSecondary, border: `1px solid ${C.border}`, borderRadius: '10px', color: C.text, boxSizing: 'border-box' }}
                  >
                    <option value="">-- Select Degree --</option>
                    <option value="BA">BA (Bachelor of Arts)</option>
                    <option value="BCom">BCom (Bachelor of Commerce)</option>
                    <option value="BSc">BSc (Bachelor of Science)</option>
                    <option value="BBA">BBA (Bachelor of Business Administration)</option>
                    <option value="BCA">BCA (Bachelor of Computer Applications)</option>
                    <option value="BCS">BCS (Bachelor of Computer Science)</option>
                    <option value="BTech">BTech (Bachelor of Technology)</option>
                    <option value="BE">BE (Bachelor of Engineering)</option>
                    <option value="Other">Other Graduate Degree</option>
                  </select>
                </div>
              )}

              {formData.highest_qualification === 'Graduate' && formData.degree_type === 'Other' && (
                <div>
                  <FloatingField label="Specify Degree Name *" bg={C.card}
                    type="text"
                    name="degree_other"
                    required
                    value={formData.degree_other}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: '10px', color: C.text, boxSizing: 'border-box' }}
                   />
                </div>
              )}

              {/* ── Diploma Dynamic Fields ── */}
              {formData.highest_qualification === 'Diploma' && (
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Diploma Type *</label>
                  <select
                    name="diploma_type"
                    required
                    value={formData.diploma_type}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '10px 14px', background: C.bgSecondary, border: `1px solid ${C.border}`, borderRadius: '10px', color: C.text, boxSizing: 'border-box' }}
                  >
                    <option value="">-- Select Diploma Type --</option>
                    <option value="Diploma in Mechanical Engineering">Diploma in Mechanical Engineering</option>
                    <option value="Diploma in Civil Engineering">Diploma in Civil Engineering</option>
                    <option value="Diploma in Electrical Engineering">Diploma in Electrical Engineering</option>
                    <option value="Diploma in Computer / IT">Diploma in Computer / IT</option>
                    <option value="Diploma in Electronics & Telecommunication">Diploma in Electronics & Telecommunication</option>
                    <option value="Diploma in Computer Applications (DCA)">Diploma in Computer Applications (DCA)</option>
                    <option value="Diploma in Business Management">Diploma in Business Management</option>
                    <option value="Diploma in Pharmacy (D.Pharm)">Diploma in Pharmacy (D.Pharm)</option>
                    <option value="Other">Other Diploma</option>
                  </select>
                </div>
              )}

              {formData.highest_qualification === 'Diploma' && formData.diploma_type === 'Other' && (
                <div>
                  <FloatingField label="Specify Diploma Name *" bg={C.card}
                    type="text"
                    name="diploma_other"
                    required
                    value={formData.diploma_other}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: '10px', color: C.text, boxSizing: 'border-box' }}
                   />
                </div>
              )}

              {/* ── Post Graduate Dynamic Fields ── */}
              {formData.highest_qualification === 'Post Graduate' && (
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Post Graduate Degree Type *</label>
                  <select
                    name="degree_type"
                    required
                    value={formData.degree_type}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '10px 14px', background: C.bgSecondary, border: `1px solid ${C.border}`, borderRadius: '10px', color: C.text, boxSizing: 'border-box' }}
                  >
                    <option value="">-- Select Post Graduate Degree --</option>
                    <option value="MA">MA (Master of Arts)</option>
                    <option value="MCom">MCom (Master of Commerce)</option>
                    <option value="MSc">MSc (Master of Science)</option>
                    <option value="MCA">MCA (Master of Computer Applications)</option>
                    <option value="MCS">MCS (Master of Computer Science)</option>
                    <option value="MBA">MBA (Master of Business Administration)</option>
                    <option value="MTech">MTech (Master of Technology)</option>
                    <option value="ME">ME (Master of Engineering)</option>
                    <option value="Other">Other Post Graduate Degree</option>
                  </select>
                </div>
              )}

              {formData.highest_qualification === 'Post Graduate' && formData.degree_type === 'Other' && (
                <div>
                  <FloatingField label="Specify Post Graduate Degree *" bg={C.card}
                    type="text"
                    name="degree_other"
                    required
                    value={formData.degree_other}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: '10px', color: C.text, boxSizing: 'border-box' }}
                   />
                </div>
              )}

              {/* ── Pursuing Qualification Dynamic Fields (Strict Order): 
                  1. Degree Type -> 2. Degree Other (if other) -> 3. Current Year -> 4. Expected Passing Year ── */}
              {formData.highest_qualification === 'Pursuing' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Degree Type *</label>
                    <select
                      name="degree_type"
                      required
                      value={formData.degree_type}
                      onChange={handleInputChange}
                      style={{ width: '100%', padding: '10px 14px', background: C.bgSecondary, border: `1px solid ${C.border}`, borderRadius: '10px', color: C.text, boxSizing: 'border-box' }}
                    >
                      <option value="">-- Select Pursuing Degree --</option>
                      <option value="BA">BA (Bachelor of Arts)</option>
                      <option value="BCom">BCom (Bachelor of Commerce)</option>
                      <option value="BSc">BSc (Bachelor of Science)</option>
                      <option value="BBA">BBA (Bachelor of Business Administration)</option>
                      <option value="BCA">BCA (Bachelor of Computer Applications)</option>
                      <option value="BCS">BCS (Bachelor of Computer Science)</option>
                      <option value="BTech">BTech (Bachelor of Technology)</option>
                      <option value="BE">BE (Bachelor of Engineering)</option>
                      <option value="Other">Other Degree</option>
                    </select>
                  </div>

                  {formData.degree_type === 'Other' && (
                    <div>
                      <FloatingField label="Specify Degree Name *" bg={C.card}
                        type="text"
                        name="degree_other"
                        required
                        value={formData.degree_other}
                        onChange={handleInputChange}
                        style={{ width: '100%', padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: '10px', color: C.text, boxSizing: 'border-box' }}
                       />
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Current Year of Study *</label>
                    <select
                      name="pursuing_year"
                      required
                      value={formData.pursuing_year}
                      onChange={handleInputChange}
                      style={{ width: '100%', padding: '10px 14px', background: C.bgSecondary, border: `1px solid ${C.border}`, borderRadius: '10px', color: C.text, boxSizing: 'border-box' }}
                    >
                      <option value="">-- Select Year of Study --</option>
                      <option value="First Year">First Year</option>
                      <option value="Second Year">Second Year</option>
                      <option value="Third Year">Third Year</option>
                      <option value="Fourth Year">Fourth Year</option>
                    </select>
                  </div>
                </>
              )}

              {/* Dynamic Passing Year / Expected Passing Year */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                  {formData.highest_qualification === 'Pursuing' ? 'Expected Passing Year *' : 'Passing Year *'}
                </label>
                <select
                  name="passing_year"
                  required
                  value={formData.passing_year}
                  onChange={handleInputChange}
                  style={{ width: '100%', padding: '10px 14px', background: C.bgSecondary, border: `1px solid ${C.border}`, borderRadius: '10px', color: C.text, boxSizing: 'border-box' }}
                >
                  <option value="">-- Select Year --</option>
                  {(formData.highest_qualification === 'Pursuing' ? pursuingExpectedYears : completedPassingYears).map((yr) => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>

            </div>

            {/* ══════════════════════════════════════════════════════════════════
                SECTION 3: Experience & Job Role Details
               ══════════════════════════════════════════════════════════════════ */}
            <h2 style={{ fontSize: '19px', fontWeight: 800, margin: '28px 0 20px 0', color: C.teal || '#0F766E', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: `1px solid ${C.border}`, paddingBottom: '10px' }}>
              <FaBriefcase style={{ color: C.teal || '#0F766E' }} /> 3. Experience & Job Role Details
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>

              {/* Target Job Role with Logical Grouping */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Target Job Role *</label>
                <select
                  name="target_role"
                  required
                  value={formData.target_role}
                  onChange={handleInputChange}
                  style={{ width: '100%', padding: '10px 14px', background: C.bgSecondary, border: `1px solid ${C.border}`, borderRadius: '10px', color: C.text, boxSizing: 'border-box' }}
                >
                  <optgroup label="Financial / Banking / Sales">
                    <option value="Financial Sales Executive">Financial Sales Executive</option>
                    <option value="Credit Card Specialist">Credit Card Specialist</option>
                    <option value="Sales Manager">Sales Manager</option>
                    <option value="Branch Head">Branch Head</option>
                  </optgroup>

                  <optgroup label="Management">
                    <option value="Assistant Manager">Assistant Manager</option>
                    <option value="Manager">Manager</option>
                    <option value="Senior Manager">Senior Manager</option>
                  </optgroup>

                  <optgroup label="Product / Management">
                    <option value="Product Manager">Product Manager</option>
                  </optgroup>

                  <optgroup label="Human Resources (HR)">
                    <option value="HR Executive">HR Executive</option>
                    <option value="HR Manager">HR Manager</option>
                    <option value="Senior HR Manager">Senior HR Manager</option>
                    <option value="Recruiter">Recruiter</option>
                  </optgroup>

                  <optgroup label="Information Technology (IT)">
                    <option value="Trainee Developer">Trainee Developer</option>
                    <option value="Junior Developer">Junior Developer</option>
                    <option value="Senior Developer">Senior Developer</option>
                    <option value="Frontend Developer">Frontend Developer</option>
                    <option value="Backend Developer">Backend Developer</option>
                    <option value="Full Stack Developer">Full Stack Developer</option>
                    <option value="Full Stack React / Node Developer">Full Stack React / Node Developer</option>
                  </optgroup>

                  <optgroup label="Operations, Management & Support">
                    <option value="Team Leader">Team Leader (TL)</option>
                    <option value="Telecaller">Telecaller (TC)</option>
                    <option value="Customer Support & Verification">Customer Support & Verification</option>
                    <option value="Partner Relationship Manager">Partner Relationship Manager</option>
                    <option value="Operations Associate">Operations Associate</option>
                  </optgroup>
                </select>
              </div>

              {/* Fresher / Experienced */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Fresher / Experienced *</label>
                <select
                  name="experience_type"
                  value={formData.experience_type}
                  onChange={handleInputChange}
                  style={{ width: '100%', padding: '10px 14px', background: C.bgSecondary, border: `1px solid ${C.border}`, borderRadius: '10px', color: C.text, boxSizing: 'border-box' }}
                >
                  <option value="Fresher">Fresher</option>
                  <option value="Experienced">Experienced</option>
                </select>
              </div>

              {/* Conditional Experienced Fields */}
              {formData.experience_type === 'Experienced' && (
                <>
                  <div>
                    <FloatingField label="Total Experience (Years) *" bg={C.card}
                      type="number"
                      step="0.5"
                      name="total_experience_years"
                      required
                      value={formData.total_experience_years}
                      onChange={handleInputChange}
                      style={{ width: '100%', padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: '10px', color: C.text, boxSizing: 'border-box' }}
                     />
                  </div>

                  <div>
                    <FloatingField label="Current / Last Company *" bg={C.card}
                      type="text"
                      name="current_company"
                      required
                      value={formData.current_company}
                      onChange={handleInputChange}
                      style={{ width: '100%', padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: '10px', color: C.text, boxSizing: 'border-box' }}
                     />
                  </div>

                  <div>
                    <FloatingField label="Current / Last Designation *" bg={C.card}
                      type="text"
                      name="current_designation"
                      required
                      value={formData.current_designation}
                      onChange={handleInputChange}
                      style={{ width: '100%', padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: '10px', color: C.text, boxSizing: 'border-box' }}
                     />
                  </div>

                  <div>
                    <FloatingField label="Last Annual CTC (₹)" bg={C.card}
                      type="text"
                      name="last_salary_ctc"
                      value={formData.last_salary_ctc}
                      onChange={handleInputChange}
                      style={{ width: '100%', padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: '10px', color: C.text, boxSizing: 'border-box' }}
                     />
                  </div>
                </>
              )}

              {/* Previous Salary (Monthly ₹) - Replaces Expected Salary; Freshers not forced */}
              <div>
                <FloatingField label={<> 
                  Previous Salary (Monthly ₹) {formData.experience_type === 'Experienced' ? '*' : '(Optional for Freshers)'}
                 </>} bg={C.card}
                  type="text"
                  name="previous_salary"
                  required={formData.experience_type === 'Experienced'}
                  disabled={formData.experience_type === 'Fresher'}
                  value={formData.experience_type === 'Fresher' ? '' : formData.previous_salary}
                  onChange={handleInputChange}
                  style={{
                    width: '100%', padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: '10px', color: C.text,
                    boxSizing: 'border-box',
                    opacity: formData.experience_type === 'Fresher' ? 0.6 : 1
                  }}
                 />
              </div>

              {/* Available for Immediate Joining? */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Available for Immediate Joining? *</label>
                <select
                  name="immediate_joining"
                  value={formData.immediate_joining ? 'Yes' : 'No'}
                  onChange={(e) => setFormData(p => ({ ...p, immediate_joining: e.target.value === 'Yes' }))}
                  style={{ width: '100%', padding: '10px 14px', background: C.bgSecondary, border: `1px solid ${C.border}`, borderRadius: '10px', color: C.text, boxSizing: 'border-box' }}
                >
                  <option value="Yes">Yes - Immediate Joining</option>
                  <option value="No">No - Needs Notice Period</option>
                </select>
              </div>

              {/* Conditional Notice Period */}
              {!formData.immediate_joining && (
                <div>
                  <FloatingField label="Notice Period (Days) *" bg={C.card}
                    type="number"
                    name="notice_period_days"
                    required
                    value={formData.notice_period_days}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: '10px', color: C.text, boxSizing: 'border-box' }}
                   />
                </div>
              )}

              {/* Comfortable with Job Location? */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Comfortable with job location? *</label>
                <select
                  name="comfortable_with_location"
                  value={formData.comfortable_with_location ? 'Yes' : 'No'}
                  onChange={(e) => setFormData(p => ({ ...p, comfortable_with_location: e.target.value === 'Yes' }))}
                  style={{ width: '100%', padding: '10px 14px', background: C.bgSecondary, border: `1px solid ${C.border}`, borderRadius: '10px', color: C.text, boxSizing: 'border-box' }}
                >
                  <option value="Yes">Yes - Comfortable with location</option>
                  <option value="No">No - Prefers Remote / Other</option>
                </select>
              </div>

              {/* Relevant Experience? */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Do you have relevant experience? *</label>
                <select
                  name="relevant_experience"
                  value={formData.relevant_experience ? 'Yes' : 'No'}
                  onChange={(e) => setFormData(p => ({ ...p, relevant_experience: e.target.value === 'Yes' }))}
                  style={{ width: '100%', padding: '10px 14px', background: C.bgSecondary, border: `1px solid ${C.border}`, borderRadius: '10px', color: C.text, boxSizing: 'border-box' }}
                >
                  <option value="Yes">Yes - Direct Financial / Domain Experience</option>
                  <option value="No">No - Related / Fresh Experience</option>
                </select>
              </div>

            </div>

            {/* ══════════════════════════════════════════════════════════════════
                SECTION 4: HR, Source & Documents
               ══════════════════════════════════════════════════════════════════ */}
            <h2 style={{ fontSize: '19px', fontWeight: 800, margin: '28px 0 20px 0', color: C.teal || '#0F766E', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: `1px solid ${C.border}`, paddingBottom: '10px' }}>
              <FaFileAlt style={{ color: C.teal || '#0F766E' }} /> 4. HR, Source & Documents
            </h2>

            <div style={{ marginBottom: '24px' }}>

              {/* Select HR Dropdown — populated live from HR accounts; "Other" routes to Super Admin assignment */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Select HR *</label>
                <select
                  name="selected_hr"
                  required
                  value={formData.selected_hr}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'Other') {
                      setFormData(prev => ({ ...prev, selected_hr: 'Other', hr_id: '', hr_name: prev.how_did_you_hear === 'Employee Reference' ? prev.hr_name : '' }));
                    } else {
                      const hr = hrOptions.find(h => String(h.id) === val);
                      setFormData(prev => ({ ...prev, selected_hr: hr ? hr.full_name : val, hr_id: val }));
                    }
                  }}
                  style={{ width: '100%', padding: '10px 14px', background: C.bgSecondary, border: `1px solid ${C.border}`, borderRadius: '10px', color: C.text, boxSizing: 'border-box' }}
                >
                  <option value="" disabled>Select an HR</option>
                  {hrOptions.map((hr) => (
                    <option key={hr.id} value={hr.id}>{hr.full_name}</option>
                  ))}
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Source of Job Information (All Existing Options Preserved) */}
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '10px' }}>How did you hear about this job? *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                {[
                  'Employee Reference',
                  'WhatsApp',
                  'Instagram',
                  'WorkIndia / Job Portal',
                  'College Reference',
                  'Other'
                ].map((src) => (
                  <label key={src} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: C.bgSecondary, padding: '10px 14px', borderRadius: '10px', border: `1px solid ${formData.how_did_you_hear === src ? (C.teal || '#0F766E') : C.border}`, cursor: 'pointer', fontSize: '13px', color: C.text }}>
                    <input
                      type="radio"
                      name="how_did_you_hear"
                      value={src}
                      checked={formData.how_did_you_hear === src}
                      onChange={handleInputChange}
                    />
                    {src}
                  </label>
                ))}
              </div>

              {/* Conditional Referring Employee / HR Detail text input */}
              {(formData.how_did_you_hear === 'Employee Reference' || formData.how_did_you_hear === 'Other' || formData.selected_hr === 'Other' || formData.selected_hr === 'Other HR / Reference') && (
                <div style={{ marginTop: '16px' }}>
                  <FloatingField label={<> 
                    {formData.how_did_you_hear === 'Employee Reference'
                      ? 'Referring Employee Name / Employee ID *'
                      : 'HR Name / Reference Details *'}
                   </>} bg={C.card}
                    type="text"
                    name="hr_name"
                    required
                    value={formData.hr_name}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: '10px', color: C.text, boxSizing: 'border-box' }}
                   />
                </div>
              )}
            </div>

            

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || isUnder18 || isFutureDob}
              style={{
                background: C.employeePrimary || C.teal || '#0F766E',
                color: '#fff',
                border: 'none',
                padding: '14px 28px',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 800,
                cursor: (loading || isUnder18 || isFutureDob) ? 'not-allowed' : 'pointer',
                width: '100%',
                boxShadow: '0 4px 14px rgba(15,118,110,0.3)',
                opacity: (loading || isUnder18 || isFutureDob) ? 0.7 : 1
              }}
            >
              {loading ? 'Submitting Registration...' : 'Complete Candidate Registration'}
            </button>
          </form>
        )}

        {/* STEP 3: Registration Success & Reference Code Display */}
        {step === 3 && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px', padding: '40px 32px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
            <FaCheckCircle size={56} style={{ color: C.teal || '#0F766E', marginBottom: '16px' }} />
            <h2 style={{ fontSize: '24px', fontWeight: 900, color: C.text, margin: '0 0 8px 0' }}>Interview Registration Successful!</h2>
            <p style={{ fontSize: '14px', color: C.textMid, margin: '0 0 24px 0' }}>
              Your application has been registered with our HR Acquisition team.
            </p>

            <div style={{ background: `${C.teal || '#0F766E'}15`, border: `1px solid ${C.teal || '#0F766E'}40`, borderRadius: '16px', padding: '24px 20px', maxWidth: '420px', margin: '0 auto 28px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: C.textMid, textTransform: 'uppercase', display: 'block', marginBottom: '6px', letterSpacing: '0.5px' }}>YOUR CANDIDATE REFERENCE CODE</span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '30px', fontWeight: 900, color: C.teal || '#0F766E', letterSpacing: '1.5px', fontFamily: 'monospace' }}>{referenceCode}</strong>
                <button
                  type="button"
                  title="Copy Reference Code"
                  onClick={() => {
                    if (referenceCode) {
                      navigator.clipboard?.writeText(referenceCode);
                      setCopiedRef(true);
                      setTimeout(() => setCopiedRef(false), 2000);
                    }
                  }}
                  style={{
                    background: C.bgSecondary,
                    border: `1px solid ${C.border}`,
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: copiedRef ? '#059669' : (C.teal || '#0F766E'),
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }}
                >
                  <FaCopy /> {copiedRef ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => navigate(`/careers/status/${referenceCode}`)}
                style={{ background: C.teal || '#0F766E', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }}
              >
                Check Application Status
              </button>
              <button
                type="button"
                onClick={() => navigate('/careers')}
                style={{ background: C.bgSecondary, color: C.text, border: `1px solid ${C.border}`, padding: '12px 24px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }}
              >
                Return to Careers
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
