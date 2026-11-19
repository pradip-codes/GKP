import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../app/store/authStore';
import employeeCommitmentsService from '../../../services/employeeCommitments.service';
import CheckInScreen from './components/CheckInScreen';
import CommitmentsScreen from './components/CommitmentsScreen';
import EndOfDayReviewModal from './components/EndOfDayReviewModal';
import AttendanceVerificationModal from './AttendanceVerificationModal';
import GkpLoader from '../../../components/Loader/GkpLoader';
import logo from '../../../assets/logos/logo.webp';
import { ShieldAlert, RefreshCw, Award, LogOut, RotateCcw, Clock } from 'lucide-react';

const AttendanceGateContext = createContext({
  dayState: 'LOADING',
  dayData: null,
  refreshDayStatus: () => { },
  openCheckOutReview: () => { },
  isReviewModalOpen: false,
  closeReviewModal: () => { }
});

export const useAttendanceGate = () => useContext(AttendanceGateContext);

/**
 * LockedHeader Component
 * ─────────────────────────────────────────────────────────────
 * Minimal branded header displayed while the employee panel is locked:
 * Shows only the logo, employee name, and Logout button.
 * Sidebar, bottom navigation, notifications, and menu items are hidden.
 */
function LockedHeader({ user, onLogout }) {
  const employeeName = user?.full_name || user?.name || user?.first_name || 'Team Member';

  return (
    <header
      style={{
        height: '64px',
        background: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img
          src={logo}
          alt="GharKaPaisa"
          style={{ height: '34px', width: 'auto', objectFit: 'contain' }}
        />
        <div>
          <span style={{ fontSize: '15px', fontWeight: 900, color: '#101828', display: 'block', lineHeight: 1.1 }}>
            GharKaPaisa
          </span>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#008A60', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Employee Portal
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #008A60 0%, #0D9488 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 800,
              flexShrink: 0
            }}
          >
            {employeeName.charAt(0).toUpperCase()}
          </div>
          <span
            style={{
              fontSize: '13.5px',
              fontWeight: 700,
              color: '#1E293B',
              maxWidth: '160px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {employeeName}
          </span>
        </div>

        <button
          type="button"
          onClick={onLogout}
          aria-label="Logout"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 12px',
            borderRadius: '10px',
            border: '1px solid #E2E8F0',
            background: '#F8FAFC',
            color: '#DC2626',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.18s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#FEE2E2';
            e.currentTarget.style.borderColor = '#FCA5A5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#F8FAFC';
            e.currentTarget.style.borderColor = '#E2E8F0';
          }}
        >
          <LogOut size={14} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}

/**
 * AttendanceGate
 * ─────────────────────────────────────────────────────────────
 * Route Guard wrapper around employee panel.
 * Enforces:
 *   Step 1: Mark Attendance (Check-In)
 *   Step 2: Submit Today's Commitments
 * Only when state === 'UNLOCKED' does the full panel render.
 * Also handles End-of-Day Review on Check-Out.
 */
export default function AttendanceGate({ children }) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const location = useLocation();
  const navigate = useNavigate();

  const [dayState, setDayState] = useState('LOADING'); // 'LOADING' | 'NOT_CHECKED_IN' | 'NEEDS_COMMITMENTS' | 'UNLOCKED' | 'CHECKED_OUT' | 'ERROR'
  const [dayData, setDayData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isCheckOutVerifying, setIsCheckOutVerifying] = useState(false);
  const [checkOutVerificationSessionId, setCheckOutVerificationSessionId] = useState(null);
  const [cancellingWork, setCancellingWork] = useState(false);
  const [cancelSecondsRemaining, setCancelSecondsRemaining] = useState(0);
  const autoAdvanceReviewTimerRef = useRef(null);

  // 10-Minute grace window timer for cancelling mistaken check-out
  useEffect(() => {
    if (dayState !== 'CHECKED_OUT' || !dayData?.checkOutTime) {
      setCancelSecondsRemaining(0);
      return;
    }

    const calculateRemaining = () => {
      const checkOutMs = new Date(dayData.checkOutTime).getTime();
      const elapsed = Math.floor((Date.now() - checkOutMs) / 1000);
      return Math.max(0, 600 - elapsed);
    };

    setCancelSecondsRemaining(calculateRemaining());

    const timer = setInterval(() => {
      const rem = calculateRemaining();
      setCancelSecondsRemaining(rem);
      if (rem <= 0) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [dayState, dayData?.checkOutTime]);

  const handleCancelCheckOut = async () => {
    if (cancellingWork) return;
    setCancellingWork(true);
    try {
      await employeeCommitmentsService.cancelCheckOut();
      await fetchStatus();
      navigate('/employee/dashboard', { replace: true });
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to cancel check-out');
    } finally {
      setCancellingWork(false);
    }
  };

  const isEmployee = (user?.role || '').toUpperCase() === 'EMPLOYEE' ||
    (user?.designation && !['SUPER_ADMIN', 'ADMIN'].includes((user?.role || '').toUpperCase()));

  const fetchStatus = useCallback(async () => {
    // If not an employee or no user logged in, bypass gate
    if (!user || ((user.role || '').toUpperCase() === 'SUPER_ADMIN' || (user.role || '').toUpperCase() === 'ADMIN')) {
      setDayState('UNLOCKED');
      return;
    }

    try {
      setErrorMessage('');
      const data = await employeeCommitmentsService.getDayStatus();
      setDayData(data);
      setDayState(data.state || 'NOT_CHECKED_IN');
    } catch (err) {
      console.error('[ATTENDANCE GATE STATUS ERROR]:', err);
      // If 403 DAY_LOCKED, error object may carry the state
      if (err.response?.data?.code === 'DAY_LOCKED' && err.response?.data?.state) {
        setDayState(err.response.data.state);
      } else {
        setErrorMessage(err.response?.data?.message || err.message || 'Unable to check daily attendance status.');
        setDayState('ERROR');
      }
    }
  }, [user]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Block browser back / URL typing: if user tries to manually navigate away while locked,
  // ensure we intercept and keep them on attendance route
  useEffect(() => {
    if (dayState !== 'LOADING' && dayState !== 'UNLOCKED' && isEmployee) {
      if (location.pathname !== '/employee/attendance') {
        navigate('/employee/attendance', { replace: true });
      }
    }
  }, [dayState, location.pathname, navigate, isEmployee]);

  const handleCheckInDone = async () => {
    await fetchStatus();
  };

  const handleCommitmentsDone = async () => {
    await fetchStatus();
    // After commitments submitted, navigate to dashboard
    navigate('/employee/dashboard', { replace: true });
  };

  const handleCheckOutDone = async () => {
    await fetchStatus();
  };

  const handleOpenReview = async (sessionId = null) => {
    if (sessionId) {
      setCheckOutVerificationSessionId(sessionId);
    }
    try {
      const taskRes = await employeeCommitmentsService.getTodayTasks();
      if (taskRes && taskRes.data) {
        setDayData((prev) => ({
          ...prev,
          allTasks: taskRes.data.all || [
            ...(taskRes.data.carryOver || []),
            ...(taskRes.data.today || []),
            ...(taskRes.data.extra || [])
          ],
          carryOverTasks: taskRes.data.carryOver || [],
          todayTasks: taskRes.data.today || [],
          extraTasks: taskRes.data.extra || []
        }));
      }
    } catch (e) {
      console.warn('Could not refresh tasks before review modal:', e);
    }
    setIsReviewModalOpen(true);
  };

  /**
   * Check-Out Trigger:
   * Mandatory Step 1 (Face verification) & Step 2 (Office geofence verification)
   * Before opening End-of-Day Review (Step 3).
   */
  const handleStartCheckOut = () => {
    setCheckOutVerificationSessionId(null);
    setIsCheckOutVerifying(true);
  };

  const handleCheckOutVerificationSuccess = (verResult) => {
    const verifiedSessionId = verResult?.sessionId || verResult?.data?.sessionId;
    if (verifiedSessionId) {
      setCheckOutVerificationSessionId(verifiedSessionId);
      // Auto-advance to End-of-Day Review after a brief 1.5s delay if user doesn't click "Proceed"
      if (autoAdvanceReviewTimerRef.current) clearTimeout(autoAdvanceReviewTimerRef.current);
      autoAdvanceReviewTimerRef.current = setTimeout(async () => {
        setIsCheckOutVerifying(false);
        await handleOpenReview(verifiedSessionId);
      }, 1500);
    }
  };

  const handleCloseVerificationModal = async () => {
    if (autoAdvanceReviewTimerRef.current) clearTimeout(autoAdvanceReviewTimerRef.current);
    setIsCheckOutVerifying(false);
    if (checkOutVerificationSessionId) {
      await handleOpenReview(checkOutVerificationSessionId);
    }
  };

  const handleLogout = () => {
    if (logout) logout();
    navigate('/login');
  };

  const contextValue = {
    dayState,
    dayData,
    refreshDayStatus: fetchStatus,
    openCheckOutReview: handleStartCheckOut,
    isReviewModalOpen,
    closeReviewModal: () => {
      setIsReviewModalOpen(false);
      setCheckOutVerificationSessionId(null);
    }
  };

  // Wrapper for locked screens with minimal branded header
  const renderLockedLayout = (content) => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#F5F8F7' }}>
      <LockedHeader user={user} onLogout={handleLogout} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {content}
      </div>
    </div>
  );

  // 1. Loading State
  if (dayState === 'LOADING') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
        <GkpLoader />
      </div>
    );
  }

  // 2. Error State with Retry
  if (dayState === 'ERROR') {
    return renderLockedLayout(
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ maxWidth: '440px', background: '#FFFFFF', padding: '32px', borderRadius: '20px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.06)' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#FEE2E2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
            <ShieldAlert size={28} />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1E293B', margin: '0 0 8px 0' }}>Connection Error</h2>
          <p style={{ fontSize: '13.5px', color: '#64748B', lineHeight: 1.5, margin: '0 0 20px 0' }}>
            {errorMessage || 'Failed to verify daily attendance. Please check your internet connection and try again.'}
          </p>
          <button
            type="button"
            onClick={fetchStatus}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              border: 'none',
              background: '#008A60',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <RefreshCw size={16} />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. Screen 1: NOT_CHECKED_IN
  if (dayState === 'NOT_CHECKED_IN') {
    return (
      <AttendanceGateContext.Provider value={contextValue}>
        {renderLockedLayout(
          <CheckInScreen onCheckInSuccess={handleCheckInDone} />
        )}
      </AttendanceGateContext.Provider>
    );
  }

  // 4. Screen 2: NEEDS_COMMITMENTS
  if (dayState === 'NEEDS_COMMITMENTS') {
    return (
      <AttendanceGateContext.Provider value={contextValue}>
        {renderLockedLayout(
          <CommitmentsScreen
            checkInTime={dayData?.checkInTime}
            initialCarryOver={dayData?.carryOverTasks || []}
            initialToday={dayData?.todayTasks || []}
            onSubmitSuccess={handleCommitmentsDone}
          />
        )}
      </AttendanceGateContext.Provider>
    );
  }

  // 5. CHECKED_OUT: Day Completed Screen
  if (dayState === 'CHECKED_OUT') {
    return (
      <AttendanceGateContext.Provider value={contextValue}>
        {renderLockedLayout(
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              background: 'linear-gradient(135deg, #F5F8F7 0%, #E8F7EF 100%)'
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '500px',
                background: '#FFFFFF',
                borderRadius: '24px',
                padding: '36px 28px',
                textAlign: 'center',
                boxShadow: '0 20px 40px -15px rgba(0, 138, 96, 0.15)'
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#E8F7EF',
                  color: '#008A60',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto'
                }}
              >
                <Award size={34} />
              </div>

              <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#101828', margin: '0 0 8px 0' }}>
                Work Completed for Today
              </h2>
              <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.5, margin: '0 0 24px 0' }}>
                You have completed your daily check-out and task review. The employee dashboard is locked until tomorrow's check-in.
              </p>

              {/* 10-Minute Grace Window: Option to Cancel Mistaken Check-Out and Resume Work */}
              {cancelSecondsRemaining > 0 && (
                <div
                  style={{
                    marginBottom: '20px',
                    padding: '16px',
                    background: '#FFFBEB',
                    border: '1.5px solid #FCD34D',
                    borderRadius: '16px',
                    textAlign: 'center'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      color: '#B45309',
                      fontWeight: 800,
                      fontSize: '14px',
                      marginBottom: '6px'
                    }}
                  >
                    <Clock size={16} />
                    <span>
                      Mistakenly ended work? ({Math.floor(cancelSecondsRemaining / 60)}:
                      {String(cancelSecondsRemaining % 60).padStart(2, '0')} left)
                    </span>
                  </div>
                  <p style={{ fontSize: '12.5px', color: '#78350F', margin: '0 0 14px 0', lineHeight: 1.4 }}>
                    You have a 10-minute grace window to cancel check-out and continue working on your dashboard tasks.
                  </p>
                  <button
                    type="button"
                    onClick={handleCancelCheckOut}
                    disabled={cancellingWork}
                    style={{
                      width: '100%',
                      height: '46px',
                      borderRadius: '12px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #008A60 0%, #0D9488 100%)',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      fontWeight: 800,
                      cursor: cancellingWork ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(0, 138, 96, 0.25)',
                      opacity: cancellingWork ? 0.7 : 1
                    }}
                  >
                    <RotateCcw size={16} />
                    <span>
                      {cancellingWork
                        ? 'Resuming Work...'
                        : `Cancel Check-Out & Resume Work (${Math.floor(cancelSecondsRemaining / 60)}:${String(
                          cancelSecondsRemaining % 60
                        ).padStart(2, '0')})`}
                    </span>
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={handleLogout}
                style={{
                  width: '100%',
                  height: '50px',
                  borderRadius: '14px',
                  border: 'none',
                  background: '#008A60',
                  color: '#FFFFFF',
                  fontSize: '15px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </AttendanceGateContext.Provider>
    );
  }

  // 6. UNLOCKED: Full Panel Unlocked
  return (
    <AttendanceGateContext.Provider value={contextValue}>
      {children}
      {/* Step 1 & 2: Mandatory Face & Office Location Geofence Verification Modal */}
      <AttendanceVerificationModal
        isOpen={isCheckOutVerifying}
        onClose={handleCloseVerificationModal}
        onSuccess={handleCheckOutVerificationSuccess}
        actionType="VERIFY_CHECK_OUT"
        user={user}
      />

      {/* Step 3: End-of-Day Review Modal (Unlocks ONLY after verification succeeds) */}
      <EndOfDayReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          setCheckOutVerificationSessionId(null);
        }}
        allTasks={
          dayData?.allTasks || [
            ...(dayData?.carryOverTasks || []),
            ...(dayData?.todayTasks || []),
            ...(dayData?.extraTasks || [])
          ]
        }
        verificationSessionId={checkOutVerificationSessionId}
        onCheckOutSuccess={handleCheckOutDone}
      />
    </AttendanceGateContext.Provider>
  );
}
