import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Calendar, CheckCircle2, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../../../app/store/authStore';
import attendanceService from '../../../../services/attendance.service';
import employeeCommitmentsService from '../../../../services/employeeCommitments.service';
import AttendanceVerificationModal from '../AttendanceVerificationModal';
import FaceVerificationModal from '../../profile/FaceVerificationModal';

/**
 * Screen 1: Attendance Check-In Screen
 * ─────────────────────────────────────────────────────────────
 * Full-screen centered card, greeting, live clock, date,
 * big primary "Mark Attendance" button (min height 56px).
 * Tapping "Mark Attendance" verifies face biometric and location geofence
 * (same full verification modal as the employee attendance page).
 * On successful verification, transitions to Screen 2 (Today's Commitments).
 */
export default function CheckInScreen({ onCheckInSuccess }) {
  const user = useAuthStore((state) => state.user);
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [greeting, setGreeting] = useState('Good morning');
  const [loading, setLoading] = useState(false);
  const [successPop, setSuccessPop] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Biometric & Location Verification Modal states
  const [isFaceEnrolled, setIsFaceEnrolled] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [faceEnrollModalOpen, setFaceEnrollModalOpen] = useState(false);
  const [verifiedResult, setVerifiedResult] = useState(null);
  const autoAdvanceTimerRef = useRef(null);

  // Live clock & dynamic greeting
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      
      // Live clock in HH:MM:SS
      const timeFormatted = now.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      setTimeStr(timeFormatted);

      // Date formatted (e.g. Wednesday, 18 Nov 2026)
      const dateFormatted = now.toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
      setDateStr(dateFormatted);

      // Dynamic greeting
      const hour = now.getHours();
      if (hour < 12) setGreeting('Good morning');
      else if (hour < 17) setGreeting('Good afternoon');
      else setGreeting('Good evening');
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Check face enrollment status on mount
  useEffect(() => {
    let isMounted = true;
    const checkEnrollment = async () => {
      try {
        const res = await attendanceService.getEnrollmentStatus();
        const data = res?.data || res;
        const enrolled = typeof data?.is_enrolled === 'boolean'
          ? data.is_enrolled
          : (data?.status === 'ACTIVE');
        if (isMounted) setIsFaceEnrolled(!!enrolled);
      } catch (err) {
        if (isMounted) setIsFaceEnrolled(false);
      }
    };
    checkEnrollment();
    return () => {
      isMounted = false;
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    };
  }, []);

  const employeeName = user?.full_name || user?.name || user?.first_name || 'Team Member';

  // Mark Attendance trigger: opens Face & Location Verification Modal
  const handleMarkAttendance = async () => {
    if (loading || successPop) return;
    setErrorMessage('');

    if (isFaceEnrolled === false) {
      setFaceEnrollModalOpen(true);
      return;
    }

    if (isFaceEnrolled === null) {
      setLoading(true);
      try {
        const res = await attendanceService.getEnrollmentStatus();
        const data = res?.data || res;
        const enrolled = typeof data?.is_enrolled === 'boolean'
          ? data.is_enrolled
          : (data?.status === 'ACTIVE');
        setIsFaceEnrolled(!!enrolled);
        setLoading(false);

        if (!enrolled) {
          setFaceEnrollModalOpen(true);
          return;
        }
      } catch (err) {
        setLoading(false);
      }
    }

    setIsModalOpen(true);
  };

  const handleFaceEnrollmentSuccess = () => {
    setIsFaceEnrolled(true);
    setFaceEnrollModalOpen(false);
    setIsModalOpen(true);
  };

  const handleVerificationSuccess = async (result) => {
    setVerifiedResult(result);
    try {
      await employeeCommitmentsService.checkIn();
    } catch (e) {
      console.warn('Commitments check-in sync notice:', e?.message);
    }

    // Auto-advance after 3.5 seconds if user stays on success confirmation card
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    autoAdvanceTimerRef.current = setTimeout(() => {
      setIsModalOpen(false);
      setSuccessPop(true);
      setTimeout(() => {
        onCheckInSuccess && onCheckInSuccess(result);
      }, 600);
    }, 3500);
  };

  const handleModalClose = async () => {
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    setIsModalOpen(false);
    if (verifiedResult) {
      setSuccessPop(true);
      try {
        await employeeCommitmentsService.checkIn();
      } catch (e) {}
      setTimeout(() => {
        onCheckInSuccess && onCheckInSuccess(verifiedResult);
      }, 600);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: 'linear-gradient(135deg, #F5F8F7 0%, #E8F7EF 100%)',
        boxSizing: 'border-box'
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        style={{
          width: '100%',
          maxWidth: '540px',
          background: '#FFFFFF',
          borderRadius: '24px',
          boxShadow: '0 20px 40px -15px rgba(0, 138, 96, 0.12), 0 0 0 1px rgba(0, 138, 96, 0.08)',
          padding: '36px 28px',
          textAlign: 'center',
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Soft background header accent */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '6px',
            background: 'linear-gradient(90deg, #008A60 0%, #8DC22F 100%)'
          }}
        />

        {/* Brand Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '20px',
            background: '#E8F7EF',
            color: '#008A60',
            fontSize: '13px',
            fontWeight: 700,
            marginBottom: '20px'
          }}
        >
          <ShieldCheck size={16} />
          <span>GharKaPaisa Employee Portal</span>
        </div>

        {/* Large Greeting */}
        <h1
          style={{
            fontSize: '26px',
            fontWeight: 900,
            color: '#101828',
            margin: '0 0 8px 0',
            lineHeight: 1.3
          }}
        >
          {greeting}, <span style={{ color: '#008A60' }}>{employeeName}</span>
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 28px 0' }}>
          Please mark your attendance to get started with your day.
        </p>

        {/* Live Clock & Date Box */}
        <div
          style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '18px',
            padding: '20px',
            marginBottom: '28px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <div
            style={{
              fontSize: '34px',
              fontWeight: 800,
              fontFamily: 'monospace',
              color: '#008A60',
              letterSpacing: '1px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <Clock size={28} />
            <span>{timeStr || '--:--:--'}</span>
          </div>

          <div
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Calendar size={15} />
            <span>{dateStr || 'Loading date...'}</span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            style={{
              background: '#FEE2E2',
              border: '1px solid #F87171',
              color: '#B91C1C',
              padding: '12px 16px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '20px',
              textAlign: 'left'
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* Big Primary Button: min height 56px */}
        <motion.button
          type="button"
          onClick={handleMarkAttendance}
          disabled={loading || successPop}
          whileHover={!loading && !successPop ? { scale: 1.02 } : {}}
          whileTap={!loading && !successPop ? { scale: 0.98 } : {}}
          style={{
            width: '100%',
            minHeight: '56px',
            borderRadius: '16px',
            border: 'none',
            background: successPop
              ? '#10B981'
              : 'linear-gradient(135deg, #008A60 0%, #007F5B 100%)',
            color: '#FFFFFF',
            fontSize: '16px',
            fontWeight: 800,
            cursor: loading || successPop ? 'default' : 'pointer',
            boxShadow: '0 8px 20px -4px rgba(0, 138, 96, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            transition: 'background-color 0.25s, box-shadow 0.25s',
            outline: 'none'
          }}
          aria-label="Mark Attendance"
        >
          <AnimatePresence mode="wait">
            {successPop ? (
              <motion.div
                key="success"
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: [0, 1.25, 1], rotate: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <CheckCircle2 size={24} color="#FFFFFF" />
                <span>Attendance Marked!</span>
              </motion.div>
            ) : loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <Loader2 size={22} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} />
                <span>Verifying Biometric Status...</span>
              </motion.div>
            ) : (
              <motion.div
                key="default"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <CheckCircle2 size={22} />
                <span>Mark Attendance</span>
                <ArrowRight size={18} style={{ opacity: 0.8 }} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Small Note */}
        <p
          style={{
            fontSize: '12px',
            color: '#64748B',
            marginTop: '16px',
            marginBottom: 0,
            lineHeight: 1.5
          }}
        >
          Dashboard unlocks after you mark attendance and add today's tasks.
        </p>
      </motion.div>

      {/* Attendance Verification Modal: Full Face Biometric & GPS Geofence Verification (a01e952c logic) */}
      {isModalOpen && (
        <AttendanceVerificationModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSuccess={handleVerificationSuccess}
          actionType="CHECK_IN"
          user={user}
        />
      )}

      {/* Face Verification Enrollment Modal (if biometric not enrolled) */}
      {faceEnrollModalOpen && (
        <FaceVerificationModal
          isOpen={faceEnrollModalOpen}
          onClose={() => setFaceEnrollModalOpen(false)}
          onSuccess={handleFaceEnrollmentSuccess}
        />
      )}
    </div>
  );
}
