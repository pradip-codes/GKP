import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  FaCalendarCheck, FaFileAlt, FaTasks, FaArrowRight, FaCamera,
  FaLightbulb, FaCreditCard, FaShieldAlt, FaLandmark, FaCoins,
  FaChartLine, FaUserPlus, FaChartBar, FaChevronLeft, FaChevronRight,
  FaUsers, FaGift, FaComments, FaCheckCircle, FaClock, FaUserCircle,
  FaExclamationCircle, FaExternalLinkAlt, FaExclamationTriangle, FaSignOutAlt,
  FaBuilding, FaRupeeSign, FaFileInvoiceDollar, FaFolderOpen, FaChevronDown, FaChevronUp, FaArrowLeft
} from 'react-icons/fa';
import api from '../../services/api';
import { getApiV1Url } from '../../config/api';
import LoadingLogo from '../../components/Loader/LoadingLogo';
import { useLocalStorageCache } from '../../hooks/useLocalStorageCache';
import { useAttendanceGate } from './attendance/AttendanceGate';

// Lazy load existing HR department modules for embedded view
const MyIncentives = React.lazy(() => import('./incentives/MyIncentives'));
const EmployeeMySalary = React.lazy(() => import('./payroll/EmployeeMySalary'));
const EmployeePayslip = React.lazy(() => import('./payroll/EmployeePayslip'));
const EmployeeDocumentsReports = React.lazy(() => import('./payroll/EmployeeDocumentsReports'));
const EmployeeSalesReports = React.lazy(() => import('./reports/EmployeeSalesReports'));

// Static Banner Image Assets
import offerBanner from '../home/components/banner/offerbanner.webp';
import ltfBanner from '../home/components/banner/lifetimefree card.webp';
import loanBanner from '../home/components/banner/loan.webp';
import emiBanner from '../home/components/banner/smart emi.webp';
import emiNewBanner from '../home/components/banner/emi.webp';
import hdfcBanner from '../home/components/banner/hdfc pixel card.webp';
import insuranceBanner from '../home/components/banner/insurance.webp';

const localBannerMap = {
  'lifetimefree card.png': ltfBanner,
  'loan.png': loanBanner,
  'insurance.png': insuranceBanner,
  'smart emi.png': emiBanner,
  'emi.jpeg': emiNewBanner,
  'hdfc pixel card.png': hdfcBanner,
  'offerbanner.png': offerBanner
};

const resolveBannerImage = (url) => {
  if (!url) return offerBanner;
  const rawUrl = typeof url === 'string' ? url : (url.image_url || url.image || '');
  if (!rawUrl) return offerBanner;
  if (localBannerMap[rawUrl]) return localBannerMap[rawUrl];
  const cleanUrl = rawUrl.trim();
  const filename = cleanUrl.split('/').pop().split('\\').pop();
  if (localBannerMap[filename]) return localBannerMap[filename];
  try {
    const decoded = decodeURIComponent(filename);
    if (localBannerMap[decoded]) return localBannerMap[decoded];
  } catch (_) {}
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) return cleanUrl;
  if (cleanUrl.startsWith('/')) {
    const apiBase = getApiV1Url ? getApiV1Url() : '';
    const origin = apiBase.replace(/\/api\/v1\/?$/, '');
    return `${origin}${cleanUrl}`;
  }
  return offerBanner;
};

// 5 Existing HR Department Modules
const hrDepartmentModules = [
  {
    id: 'incentive',
    title: 'My Incentive',
    desc: 'Earnings, contests, bonus ledger & commission payouts',
    icon: FaGift,
    color: '#EC4899',
    bg: '#FCE7F3',
    route: '/employee/incentives'
  },
  {
    id: 'salary',
    title: 'My Salary',
    desc: 'Monthly salary structure, base pay, earnings & deductions',
    icon: FaRupeeSign,
    color: '#059669',
    bg: '#E8F7EF',
    route: '/employee/salary'
  },
  {
    id: 'payslip',
    title: 'Payslip',
    desc: 'Download, print & view official monthly salary payslips',
    icon: FaFileInvoiceDollar,
    color: '#3B82F6',
    bg: '#EAF2FF',
    route: '/employee/payslip'
  },
  {
    id: 'document',
    title: 'Document',
    desc: 'Payroll documents, PF statements, tax Form-16 & HR certificates',
    icon: FaFolderOpen,
    color: '#8B5CF6',
    bg: '#F1EBFF',
    route: '/employee/documents'
  },
  {
    id: 'report',
    title: 'Report',
    desc: 'Sales performance reports, card sales & operational insights',
    icon: FaChartBar,
    color: '#F59E0B',
    bg: '#FFF1DF',
    route: '/employee/sales-reports'
  }
];

export default function EmployeeDashboardRedesigned() {
  const { C, isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { openCheckOutReview } = useAttendanceGate() || {};
  const hrDepartmentRef = useRef(null);

  // HR Department state: toggled open/closed & selected active module
  const [hrDepartmentOpen, setHrDepartmentOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('tab') === 'hr' || 
             params.get('section') === 'hr' || 
             params.get('tab') === 'hr-department' || 
             window.location.hash === '#hr-department' ||
             window.location.pathname.includes('/hr-department');
    }
    return false;
  });

  const [activeHrModule, setActiveHrModule] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const mod = params.get('module');
      if (['incentive', 'salary', 'payslip', 'document', 'report'].includes(mod)) {
        return mod;
      }
    }
    return null;
  });

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;
  const [currentDate, setCurrentDate] = useState('');

  // Real data state
  const [attendanceToday, setAttendanceToday] = useState(null);
  const [recentApplications, setRecentApplications] = useState([]);
  const [totalApplicationsCount, setTotalApplicationsCount] = useState(null);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [applicationsError, setApplicationsError] = useState(false);
  const [verState, setVerState] = useState(null);
  const [apiBanners, setApiBanners] = useState([]);

  // Banner carousel state
  const [bannerIndex, setBannerIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [bannerLoading, setBannerLoading] = useState({});
  const [bannerErrors, setBannerErrors] = useState({});

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setCurrentDate(now.toLocaleDateString('en-IN', options));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const isHrParam = params.get('tab') === 'hr' || 
                      params.get('section') === 'hr' || 
                      params.get('tab') === 'hr-department' || 
                      location.hash === '#hr-department' ||
                      location.pathname.includes('/hr-department');
    if (isHrParam) {
      setHrDepartmentOpen(true);
      const mod = params.get('module');
      if (['incentive', 'salary', 'payslip', 'document', 'report'].includes(mod)) {
        setActiveHrModule(mod);
      }
      setTimeout(() => {
        hrDepartmentRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  }, [location.search, location.hash, location.pathname]);

  // Client-side cache helpers
  const CACHE_PREFIX = 'employee_dashboard_cache_';
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  const getCache = (key) => {
    try {
      const cached = localStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (!cached) return null;
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > CACHE_TTL) {
        localStorage.removeItem(`${CACHE_PREFIX}${key}`);
        return null;
      }
      return data;
    } catch (err) {
      return null;
    }
  };

  const setCache = (key, data) => {
    try {
      localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (err) {
      console.warn('Failed to set cache:', err);
    }
  };

  const clearCache = () => {
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (err) {
      console.warn('Failed to clear cache:', err);
    }
  };

  const fetchApplications = async () => {
    setApplicationsLoading(true);
    setApplicationsError(false);
    try {
      const appsRes = await api.get('/applications', {
        params: { limit: 5 },
        skipLoader: true
      });
      if (!appsRes.data?.success) {
        console.error('Employee dashboard applications response was unsuccessful');
        setApplicationsError(true);
        return;
      }

      const rawApps = appsRes.data;
      const appsData = Array.isArray(rawApps.data)
        ? rawApps.data
        : (Array.isArray(rawApps) ? rawApps : []);
      const totalCount = rawApps.pagination?.total !== undefined
        ? rawApps.pagination.total
        : (rawApps.total !== undefined ? rawApps.total : appsData.length);

      setRecentApplications(appsData.slice(0, 5));
      setTotalApplicationsCount(totalCount);
      setCache('applications', { items: appsData, total: totalCount });
    } catch (err) {
      const statusCode = err?.response?.status;
      console.error(`Employee dashboard applications fetch error: ${statusCode ? `HTTP ${statusCode}` : 'network error'}`);
      setApplicationsError(true);
    } finally {
      setApplicationsLoading(false);
    }
  };

  const fetchDashboardData = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/employee/login');
        return;
      }

      // Try client-side cache first (unless force refresh)
      if (!forceRefresh) {
        const cachedProfile = getCache('profile');
        const cachedAttendance = getCache('attendance');
        const cachedApps = getCache('applications');
        const cachedVer = getCache('verification');
        const cachedBanners = getCache('banners');

        if (cachedProfile && cachedAttendance && cachedApps && cachedVer && cachedBanners) {
          console.log('[Client Cache] Using cached dashboard data');
          const emp = cachedProfile.employee || cachedProfile.data?.employee || cachedProfile;
          setEmployee(emp);
          setAttendanceToday(cachedAttendance);
          const appsList = Array.isArray(cachedApps)
            ? cachedApps
            : (Array.isArray(cachedApps?.items)
                ? cachedApps.items
                : Object.keys(cachedApps || {}).filter(k => !isNaN(k)).map(k => cachedApps[k]));
          setRecentApplications(appsList.slice(0, 5));
          setTotalApplicationsCount(cachedApps?.total ?? (cachedApps?.length !== undefined ? cachedApps.length : appsList.length));
          setApplicationsLoading(false);
          setApplicationsError(false);
          setVerState(cachedVer);
          setApiBanners(cachedBanners);
          setLoading(false);
          return;
        }
      }

      void fetchApplications();
      const [profileRes, attendanceRes, verRes, bannersRes] = await Promise.allSettled([
        api.get('/employee/profile'),
        api.get('/attendance/today'),
        api.get('/employee/verification-status'),
        api.get('/banners', { params: { page: 'offer' } })
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value?.data?.success) {
        const profileData = profileRes.value.data;
        const emp = profileData.employee || profileData.data?.employee || profileData;
        setEmployee(emp);
        setCache('profile', profileData);
      }

      if (attendanceRes.status === 'fulfilled' && attendanceRes.value?.data?.data) {
        const attendanceData = attendanceRes.value.data.data;
        setAttendanceToday(attendanceData);
        setCache('attendance', attendanceData);
      }

      if (verRes.status === 'fulfilled' && verRes.value?.data?.success) {
        const verData = verRes.value.data.data;
        setVerState(verData);
        setCache('verification', verData);
      }

      if (bannersRes.status === 'fulfilled' && bannersRes.value?.data?.data) {
        const banners = bannersRes.value.data.data;
        if (Array.isArray(banners) && banners.length > 0) {
          setApiBanners(banners);
          setCache('banners', banners);
        }
      }
    } catch (err) {
      console.error('Employee Dashboard fetch error:', err);
      if (err.response?.status === 401) {
        navigate('/employee/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Clear cache when user logs out or switches (optional)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refresh data when tab becomes visible (optional - comment out if not needed)
        // fetchDashboardData(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Force refresh function
  const forceRefresh = () => {
    clearCache();
    fetchDashboardData(true);
  };

  // Built-in Default Offer Banners
  const defaultOfferBanners = [
    { 
      title: 'GharKaPaisa Mega Offers & Rewards', 
      subtitle: 'Earn top incentives on pre-approved credit cards & instant loans', 
      image_url: 'offerbanner.png', 
      click_url: '/employee/credit-cards' 
    },
    { 
      title: 'Lifetime Free Credit Cards', 
      subtitle: 'Zero annual charges with instant pre-approvals across 15+ top banks', 
      image_url: 'lifetimefree card.png', 
      click_url: '/employee/credit-cards' 
    },
    { 
      title: 'Instant Personal & Business Loans', 
      subtitle: 'Fast disbursement with competitive interest rates & minimal paperwork', 
      image_url: 'loan.png', 
      click_url: '/employee/loans/personal-loan' 
    },
    { 
      title: 'Smart EMI on Credit Card', 
      subtitle: 'Convert high-ticket client purchases into easy, flexible monthly EMIs', 
      image_url: 'smart emi.png', 
      click_url: '/employee/smart-emi' 
    },
    { 
      title: 'HDFC Bank Pixel Credit Card', 
      subtitle: '100% digital issuance with customizable cashback rewards', 
      image_url: 'hdfc pixel card.png', 
      click_url: '/employee/credit-cards' 
    },
    { 
      title: 'Comprehensive Insurance Plans', 
      subtitle: 'Protect family health & life with India’s leading insurance providers', 
      image_url: 'insurance.png', 
      click_url: '/employee/insurance' 
    }
  ];

  const activeBanners = apiBanners.length > 0 ? apiBanners : defaultOfferBanners;

  const bannerSlides = activeBanners.map(b => ({
    title: b.title,
    subtitle: b.subtitle,
    bgImage: resolveBannerImage(b.image_url || b.image),
    click_url: b.click_url || '/employee/credit-cards'
  }));

  // Initialize loading state for banners
  useEffect(() => {
    const initialLoading = {};
    bannerSlides.forEach((_, idx) => {
      initialLoading[idx] = true;
    });
    setBannerLoading(initialLoading);
  }, [bannerSlides.length]);

  // Auto-rotate offer banners
  useEffect(() => {
    if (isPaused || bannerSlides.length <= 1) return;
    const interval = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % bannerSlides.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isPaused, bannerSlides.length]);

  const handleNextBanner = (e) => {
    e.stopPropagation();
    setBannerIndex((prev) => (prev + 1) % bannerSlides.length);
  };

  const handlePrevBanner = (e) => {
    e.stopPropagation();
    setBannerIndex((prev) => (prev - 1 + bannerSlides.length) % bannerSlides.length);
  };

  const handleBannerClick = (slide) => {
    const target = slide.click_url || '/employee/credit-cards';
    if (target.startsWith('http://') || target.startsWith('https://')) {
      window.open(target, '_blank');
    } else {
      navigate(target);
    }
  };

  const handleBannerImageLoad = (idx) => {
    setBannerLoading(prev => ({ ...prev, [idx]: false }));
    setBannerErrors(prev => ({ ...prev, [idx]: false }));
  };

  const handleBannerImageError = (idx) => {
    setBannerLoading(prev => ({ ...prev, [idx]: false }));
    setBannerErrors(prev => ({ ...prev, [idx]: true }));
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '80vh', 
        background: C.bg 
      }}>
        <LoadingLogo size={110} />
      </div>
    );
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Determine attendance status
  const isPunchedIn = Boolean(attendanceToday?.check_in_time);
  const isPunchedOut = Boolean(attendanceToday?.check_out_time);
  const checkInTime = attendanceToday?.check_in_time ? attendanceToday.check_in_time.slice(0, 5) : null;
  const shouldRemindCheckout = Boolean(attendanceToday?.reminder?.should_remind);

  // Determine tasks status
  const missingItems = verState?.missing_items || [];
  const pendingTasksCount = Array.isArray(missingItems) ? missingItems.filter(i => i.status !== 'APPROVED' && i.status !== 'VERIFIED').length : 0;
  const isFullyVerified = verState?.overall_status === 'VERIFIED';

  return (
    <div style={{ 
      background: C.bg, 
      minHeight: '100%', 
      padding: isMobile ? '4px 0 24px' : '8px 0 32px',
      fontFamily: "'Inter', sans-serif", 
      color: C.text 
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Welcome Section */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: isMobile ? 'flex-start' : 'center',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '16px',
          marginBottom: '24px' 
        }}>
          <div>
            <h1 style={{ 
              fontSize: isMobile ? '22px' : '28px', 
              fontWeight: 700, 
              margin: '0 0 6px 0',
              color: C.text 
            }}>
              {getGreeting()}, {employee?.full_name?.split(' ')[0] || 'Employee'}
            </h1>
            {/* Account Applications Count */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              marginTop: '4px',
              flexWrap: 'wrap'
            }}>
              <div 
                onClick={() => navigate('/employee/applications')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: C.purpleLight || '#F3E8FF',
                  color: C.purple || '#7C3AED',
                  border: `1px solid ${C.purple || '#7C3AED'}30`,
                  padding: '4px 12px',
                  borderRadius: '16px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 6px rgba(124, 58, 237, 0.08)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <FaFileAlt size={13} />
                <span>Applications:</span>
                <span style={{
                  background: '#FFFFFF',
                  color: C.purple || '#7C3AED',
                  padding: '1px 8px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                }}>
                  {totalApplicationsCount !== null ? totalApplicationsCount : (applicationsLoading ? '...' : 0)}
                </span>
              </div>
              <span style={{ fontSize: '13px', color: C.textMid, fontWeight: 500 }}>
                Total submitted from your account
              </span>
            </div>
          </div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            {openCheckOutReview && (
              <button
                type="button"
                onClick={openCheckOutReview}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #008A60 0%, #065F46 100%)',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0, 138, 96, 0.25)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 138, 96, 0.35)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 138, 96, 0.25)';
                }}
              >
                <FaCalendarCheck />
                <span>Check-Out</span>
              </button>
            )}

            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              color: C.textMid,
              fontSize: '13px',
              background: C.card,
              padding: '8px 14px',
              borderRadius: '10px',
              border: `1px solid ${C.border}`
            }}>
              <FaCalendarCheck color={C.primary} />
              <span>{currentDate}</span>
            </div>

            <button
              onClick={() => navigate('/employee/profile')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: C.card,
                border: `1px solid ${C.border}`,
                padding: '8px 14px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                color: C.text,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = C.primary;
                e.currentTarget.style.color = C.primary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = C.border;
                e.currentTarget.style.color = C.text;
              }}
            >
              <FaUserCircle /> My Profile
            </button>
          </div>
        </div>

        {/* Working Hours End Attendance Reminder Alert */}
        {shouldRemindCheckout && (
          <div style={{
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: '16px',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
            boxShadow: '0 4px 14px rgba(217, 119, 6, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1 1 300px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: '#FEF3C7',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                flexShrink: 0
              }}>
                <FaExclamationTriangle />
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#92400E', marginBottom: '2px' }}>
                  Working Hours Ended
                </div>
                <div style={{ fontSize: '13px', color: '#78350F' }}>
                  Your assigned working hours have ended. Please complete your attendance checkout.
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/employee/attendance')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#D97706',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 18px',
                fontSize: '13.5px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(217, 119, 6, 0.25)',
                transition: 'all 0.2s ease',
                flexShrink: 0
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#B45309'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#D97706'}
            >
              <FaSignOutAlt /> End Attendance
            </button>
          </div>
        )}

        {/* Top 3 Summary Cards - Connected & Interactive */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: '16px',
          marginBottom: '24px' 
        }}>
          {/* Attendance Card */}
          <div 
            onClick={() => navigate('/employee/attendance')}
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: '16px',
              padding: '18px 20px',
              boxShadow: '0 4px 14px rgba(16, 24, 40, 0.04)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              transition: 'all 0.25s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.borderColor = C.green;
              e.currentTarget.style.boxShadow = '0 8px 22px rgba(0, 138, 96, 0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = C.border;
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(16, 24, 40, 0.04)';
            }}
          >
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '14px',
              background: C.greenLight,
              color: C.green,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              flexShrink: 0
            }}>
              <FaCalendarCheck />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>
                  Attendance
                </span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '10px',
                  background: isPunchedOut ? '#D1FAE5' : isPunchedIn ? (shouldRemindCheckout ? '#FEE2E2' : '#DBEAFE') : '#FEF3C7',
                  color: isPunchedOut ? '#065F46' : isPunchedIn ? (shouldRemindCheckout ? '#DC2626' : '#1D4ED8') : '#92400E'
                }}>
                  {isPunchedOut ? 'Completed' : isPunchedIn ? (shouldRemindCheckout ? 'Checkout Needed' : 'Working') : 'Not Marked'}
                </span>
              </div>
              <div style={{ fontSize: '13px', color: C.textMid, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {isPunchedOut 
                  ? 'Attendance completed for today' 
                  : isPunchedIn 
                    ? (shouldRemindCheckout ? 'Shift ended — Please complete checkout' : `Checked in at ${checkInTime || 'Today'}`)
                    : 'Mark your daily attendance with face scan'}
              </div>
            </div>
            <FaArrowRight style={{ color: C.green, fontSize: '16px', flexShrink: 0 }} />
          </div>

          {/* Applications Card */}
          <div 
            onClick={() => navigate('/employee/applications')}
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: '16px',
              padding: '18px 20px',
              boxShadow: '0 4px 14px rgba(16, 24, 40, 0.04)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              transition: 'all 0.25s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.borderColor = C.purple;
              e.currentTarget.style.boxShadow = '0 8px 22px rgba(139, 92, 246, 0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = C.border;
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(16, 24, 40, 0.04)';
            }}
          >
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '14px',
              background: C.purpleLight,
              color: C.purple,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              flexShrink: 0
            }}>
              <FaFileAlt />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>
                  Applications
                </span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '10px',
                  background: C.purpleLight,
                  color: C.purple
                }}>
                  {totalApplicationsCount !== null ? `${totalApplicationsCount} Applications` : (applicationsLoading ? 'Loading...' : '0 Applications')}
                </span>
              </div>
              <div style={{ fontSize: '13px', color: C.textMid, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {totalApplicationsCount !== null 
                  ? `${totalApplicationsCount} total application${totalApplicationsCount === 1 ? '' : 's'} on this account`
                  : 'Track and submit client applications'}
              </div>
            </div>
            <FaArrowRight style={{ color: C.purple, fontSize: '16px', flexShrink: 0 }} />
          </div>

          {/* Tasks & Verification Card */}
          <div 
            onClick={() => navigate('/employee/verification')}
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: '16px',
              padding: '18px 20px',
              boxShadow: '0 4px 14px rgba(16, 24, 40, 0.04)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              transition: 'all 0.25s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.borderColor = C.gold;
              e.currentTarget.style.boxShadow = '0 8px 22px rgba(245, 158, 11, 0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = C.border;
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(16, 24, 40, 0.04)';
            }}
          >
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '14px',
              background: C.goldLight,
              color: C.gold,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              flexShrink: 0
            }}>
              <FaTasks />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>
                  Tasks
                </span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '10px',
                  background: pendingTasksCount > 0 ? '#FEF3C7' : '#D1FAE5',
                  color: pendingTasksCount > 0 ? '#92400E' : '#065F46'
                }}>
                  {pendingTasksCount > 0 ? `${pendingTasksCount} Action Reqd` : 'Completed'}
                </span>
              </div>
              <div style={{ fontSize: '13px', color: C.textMid, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {pendingTasksCount > 0 ? 'KYC / Video verification pending' : 'All compliance tasks completed'}
              </div>
            </div>
            <FaArrowRight style={{ color: C.gold, fontSize: '16px', flexShrink: 0 }} />
          </div>
        </div>

        {/* Dynamic Offer Banner Carousel (Replacing Static Promotional Box) */}
        <div
          className="offer-banner"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          style={{
            marginBottom: '28px',
            boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.4)' : '0 8px 30px rgba(16, 24, 40, 0.08)',
            border: `1px solid ${C.border}`,
            background: isDark ? C.card : '#FFFFFF',
            position: 'relative'
          }}
        >
          {bannerSlides.map((slide, idx) => (
            <div
              key={idx}
              onClick={() => handleBannerClick(slide)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: idx === bannerIndex ? 1 : 0,
                pointerEvents: idx === bannerIndex ? 'auto' : 'none',
                transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}
            >
              {bannerLoading[idx] !== false && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#0F172A',
                  zIndex: 1
                }}>
                  <div className="banner-spinner" style={{
                    width: '32px',
                    height: '32px',
                    border: '3px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#008A60',
                    borderRadius: '50%'
                  }} />
                </div>
              )}

              <img
                src={bannerErrors[idx] ? offerBanner : slide.bgImage}
                alt={slide.title || 'GharKaPaisa Offer'}
                onLoad={() => handleBannerImageLoad(idx)}
                onError={() => handleBannerImageError(idx)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center center',
                  display: 'block'
                }}
              />

              {/* Bottom Gradient Overlay with Information & CTA */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: isMobile ? '14px 16px' : '20px 24px',
                  background: 'linear-gradient(to top, rgba(6, 63, 56, 0.95) 0%, rgba(6, 63, 56, 0.5) 60%, transparent 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  gap: '16px',
                  zIndex: 2
                }}
              >
                <div style={{ maxWidth: isMobile ? '70%' : '75%' }}>
                  <h3 style={{ 
                    margin: '0 0 4px 0', 
                    fontSize: isMobile ? '15px' : '20px', 
                    fontWeight: 800, 
                    color: '#ffffff',
                    textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                  }}>
                    {slide.title}
                  </h3>
                  {slide.subtitle && (
                    <p style={{ 
                      margin: 0, 
                      fontSize: isMobile ? '11px' : '13px', 
                      color: 'rgba(255, 255, 255, 0.9)',
                      lineHeight: 1.4,
                      display: isMobile ? '-webkit-box' : 'block',
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {slide.subtitle}
                    </p>
                  )}
                </div>

                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#008A60',
                  color: '#ffffff',
                  padding: isMobile ? '5px 10px' : '8px 16px',
                  borderRadius: '10px',
                  fontSize: isMobile ? '10.5px' : '13px',
                  fontWeight: 700,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  flexShrink: 0
                }}>
                  Explore <FaArrowRight style={{ fontSize: '10px' }} />
                </div>
              </div>
            </div>
          ))}

          {/* Previous / Next Slide Arrow Controls */}
          {bannerSlides.length > 1 && (
            <>
              <button
                onClick={handlePrevBanner}
                aria-label="Previous Slide"
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '12px',
                  transform: 'translateY(-50%)',
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'rgba(0, 0, 0, 0.45)',
                  backdropFilter: 'blur(6px)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 10,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.45)'}
              >
                <FaChevronLeft style={{ fontSize: '14px' }} />
              </button>

              <button
                onClick={handleNextBanner}
                aria-label="Next Slide"
                style={{
                  position: 'absolute',
                  top: '50%',
                  right: '12px',
                  transform: 'translateY(-50%)',
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'rgba(0, 0, 0, 0.45)',
                  backdropFilter: 'blur(6px)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 10,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.45)'}
              >
                <FaChevronRight style={{ fontSize: '14px' }} />
              </button>
            </>
          )}

          {/* Indicator Dots */}
          {bannerSlides.length > 1 && (
            <div
              style={{
                position: 'absolute',
                bottom: '10px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                zIndex: 10
              }}
            >
              {bannerSlides.map((_, i) => (
                <div
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setBannerIndex(i);
                  }}
                  style={{
                    width: i === bannerIndex ? '26px' : '8px',
                    height: '8px',
                    borderRadius: '4px',
                    background: i === bannerIndex ? '#FFFFFF' : 'rgba(255, 255, 255, 0.55)',
                    boxShadow: i === bannerIndex ? '0 2px 6px rgba(0,0,0,0.4)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Explore Services Section - Connected to Functional Routes */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '16px' 
          }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: C.text }}>
              Explore services
            </h3>
            <button 
              onClick={() => navigate('/employee/credit-cards')}
              style={{ 
                background: 'transparent', 
                border: 'none', 
                color: C.primary, 
                fontSize: '14px', 
                fontWeight: 600, 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              View all services →
            </button>
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
            gap: isMobile ? '10px' : '16px' 
          }}>
            {[
              { 
                icon: FaCreditCard, 
                color: '#8B5CF6', 
                bg: '#F1EBFF', 
                title: 'Credit Cards', 
                desc: 'Premium pre-approved credit cards', 
                route: '/employee/credit-cards' 
              },
              { 
                icon: FaCoins, 
                color: '#059669', 
                bg: '#E8F7EF', 
                title: 'Personal Loan', 
                desc: 'Instant disbursement with lowest rate', 
                route: '/employee/loans/personal-loan' 
              },
              { 
                icon: FaCreditCard, 
                color: '#3B82F6', 
                bg: '#EAF2FF', 
                title: 'Loan on Credit Card', 
                desc: 'Instant limit-backed cash loans', 
                route: '/employee/loan-on-credit-card' 
              },
              { 
                icon: FaChartLine, 
                color: '#F59E0B', 
                bg: '#FFF1DF', 
                title: 'Smart EMI', 
                desc: 'Convert transactions to monthly EMI', 
                route: '/employee/smart-emi' 
              },
              { 
                icon: FaShieldAlt, 
                color: '#F97316', 
                bg: '#FFF1DF', 
                title: 'Insurance', 
                desc: 'Life, health & vehicle insurance', 
                route: '/employee/insurance' 
              },
              { 
                icon: FaLandmark, 
                color: '#0D9488', 
                bg: '#CCFBF1', 
                title: 'All Loans', 
                desc: 'Business, home & collateral loans', 
                route: '/employee/loans' 
              }
            ].map((service, idx) => (
              <div
                key={idx}
                onClick={() => navigate(service.route)}
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: '16px',
                  padding: isMobile ? '14px 12px' : '18px',
                  boxShadow: '0 4px 14px rgba(16, 24, 40, 0.04)',
                  transition: 'all 0.25s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = service.color;
                  e.currentTarget.style.boxShadow = `0 10px 24px rgba(16, 24, 40, 0.08)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = C.border;
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(16, 24, 40, 0.04)';
                }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: service.bg,
                  color: service.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  marginBottom: '14px'
                }}>
                  <service.icon />
                </div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '4px' }}>
                  {service.title}
                </div>
                <div style={{ fontSize: '13px', color: C.textMid, marginBottom: '12px', lineHeight: 1.4 }}>
                  {service.desc}
                </div>
                <div style={{ 
                  fontSize: '13px', 
                  color: C.primary, 
                  fontWeight: 600, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px' 
                }}>
                  Explore <FaArrowRight style={{ fontSize: '11px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions - Connected to Real Navigation Routes */}
        <div style={{ marginBottom: '28px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 16px 0', color: C.text }}>
            Quick actions
          </h3>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: isMobile ? '10px' : '16px' 
          }}>
            {[
              { 
                icon: FaFileAlt, 
                color: '#8B5CF6', 
                bg: '#F1EBFF', 
                title: 'My Applications', 
                desc: 'Track and submit client applications',
                route: '/employee/applications'
              },
              { 
                icon: FaCalendarCheck, 
                color: '#059669', 
                bg: '#E8F7EF', 
                title: 'Mark Attendance', 
                desc: 'Face recognition daily check-in',
                route: '/employee/attendance'
              },
              { 
                icon: FaBuilding, 
                color: '#008A60', 
                bg: '#E6F4EA', 
                title: 'HR Department', 
                desc: 'Incentives, salary, payslips, documents & reports',
                onClick: () => {
                  setHrDepartmentOpen(true);
                  setTimeout(() => {
                    hrDepartmentRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }
              },
              { 
                icon: FaUsers, 
                color: '#3B82F6', 
                bg: '#EAF2FF', 
                title: 'My Team', 
                desc: 'Team members & partner network',
                route: '/employee/team'
              },
              { 
                icon: FaGift, 
                color: '#EC4899', 
                bg: '#FCE7F3', 
                title: 'Contests', 
                desc: 'Competitions, targets & awards',
                route: '/employee/contests'
              },
              { 
                icon: FaComments, 
                color: '#6366F1', 
                bg: '#EEF2FF', 
                title: 'Team Messenger', 
                desc: 'Direct staff messaging & queries',
                route: '/employee/messenger'
              }
            ].map((action, idx) => (
              <div
                key={idx}
                onClick={() => {
                  if (action.onClick) {
                    action.onClick();
                  } else if (action.route) {
                    navigate(action.route);
                  }
                }}
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: '14px',
                  padding: '16px',
                  boxShadow: '0 4px 14px rgba(16, 24, 40, 0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  transition: 'all 0.25s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.borderColor = action.color;
                  e.currentTarget.style.boxShadow = '0 6px 18px rgba(16, 24, 40, 0.07)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = C.border;
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(16, 24, 40, 0.04)';
                }}
              >
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: action.bg,
                  color: action.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  flexShrink: 0
                }}>
                  <action.icon />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14.5px', fontWeight: 700, color: C.text, marginBottom: '2px' }}>
                    {action.title}
                  </div>
                  <div style={{ fontSize: '12px', color: C.textMid, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {action.desc}
                  </div>
                </div>
                <FaArrowRight style={{ color: C.textLight, fontSize: '13px', flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Content Area: Recent Activity & Tips */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: (isMobile || isTablet) ? '1fr' : '0.62fr 0.38fr',
          gap: '24px' 
        }}>
          {/* Recent Activity */}
          <div style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 4px 14px rgba(16, 24, 40, 0.04)'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '16px' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: C.text }}>
                  Account Applications
                </h3>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '10px',
                  background: C.purpleLight,
                  color: C.purple
                }}>
                  {totalApplicationsCount !== null ? `${totalApplicationsCount} Total` : '...'}
                </span>
              </div>
              <button 
                onClick={() => navigate('/employee/applications')}
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  color: C.primary, 
                  fontSize: '13px', 
                  fontWeight: 600, 
                  cursor: 'pointer' 
                }}
              >
                View all →
              </button>
            </div>

            {applicationsLoading ? (
              <div
                role="status"
                style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  background: C.bgSecondary || '#F8FAFC',
                  borderRadius: '12px',
                  color: C.textMid
                }}
              >
                Loading recent activity…
              </div>
            ) : applicationsError ? (
              <div
                role="alert"
                style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  background: C.bgSecondary || '#F8FAFC',
                  borderRadius: '12px',
                  color: C.textMid
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 600, color: C.text, marginBottom: '10px' }}>
                  Recent activity unavailable.
                </div>
                <button
                  onClick={fetchApplications}
                  style={{
                    background: C.primaryButton,
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Retry
                </button>
              </div>
            ) : recentApplications.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {recentApplications.map((app, idx) => {
                  const statusRaw = String(app.status || 'Pending').toLowerCase();
                  let statusLabel = 'Under Review';
                  let statusBg = '#EFF6FF';
                  let statusColor = '#2563EB';

                  if (statusRaw === 'approved' || statusRaw === 'disbursed' || statusRaw === 'commission_released') {
                    statusLabel = 'Approved';
                    statusBg = '#ECFDF5';
                    statusColor = '#059669';
                  } else if (statusRaw === 'rejected' || statusRaw === 'cancelled') {
                    statusLabel = 'Rejected';
                    statusBg = '#FEE2E2';
                    statusColor = '#DC2626';
                  }

                  const customerName = app.customer_name || 'Customer Lead';
                  const initials = customerName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

                  return (
                    <div
                      key={app.id || idx}
                      onClick={() => navigate('/employee/applications')}
                      style={{
                        padding: '12px 14px',
                        background: C.bgSecondary || '#F8FAFC',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        cursor: 'pointer',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#E8F7EF'}
                      onMouseLeave={(e) => e.currentTarget.style.background = C.bgSecondary || '#F8FAFC'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          background: C.primary,
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '13px',
                          flexShrink: 0
                        }}>
                          {initials}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '13.5px', fontWeight: 600, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {customerName}
                          </div>
                          <div style={{ fontSize: '12px', color: C.textMid, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {app.product_name || 'Financial Service'} • {app.app_number || 'Lead'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '8px',
                          background: statusBg,
                          color: statusColor
                        }}>
                          {statusLabel}
                        </span>
                        <FaArrowRight style={{ fontSize: '11px', color: C.textLight }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ 
                padding: '24px 16px', 
                textAlign: 'center', 
                background: C.bgSecondary || '#F8FAFC', 
                borderRadius: '12px',
                color: C.textMid
              }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>📂</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: C.text, marginBottom: '4px' }}>
                  No recent activity
                </div>
                <p style={{ fontSize: '12.5px', color: C.textMid, margin: '0 0 14px 0' }}>
                  Submit leads for credit cards and loans to start earning incentives.
                </p>
                <button
                  onClick={() => navigate('/employee/credit-cards')}
                  style={{
                    background: C.primaryButton,
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Submit First Application
                </button>
              </div>
            )}
          </div>

          {/* Tips to Get Started / Verification Status */}
          <div style={{
            background: isDark ? C.card : '#F0FDF4',
            border: `1px solid ${isDark ? C.border : '#BBF7D0'}`,
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 4px 14px rgba(16, 24, 40, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '16px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: C.primary,
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  flexShrink: 0
                }}>
                  <FaLightbulb />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: C.text }}>
                    {pendingTasksCount > 0 ? 'Action Required' : !isPunchedIn ? 'Daily Reminder' : 'Performance Tip'}
                  </h3>
                  <span style={{ fontSize: '11px', color: C.textMid, fontWeight: 600 }}>
                    GharKaPaisa Employee Portal
                  </span>
                </div>
              </div>

              <p style={{ fontSize: '13.5px', color: C.textMid, margin: 0, lineHeight: 1.5 }}>
                {pendingTasksCount > 0 
                  ? 'Complete your KYC documents and teleprompter video verification to unlock full privileges and instant commission payouts.'
                  : !isPunchedIn
                  ? 'You haven\'t punched today\'s attendance. Check in with facial biometric verification to record your working presence.'
                  : 'Pre-approved lifetime free credit cards and instant personal loans are currently offering high payout rates. Recommend them to your clients today.'
                }
              </p>
            </div>

            <button 
              onClick={() => {
                if (pendingTasksCount > 0) {
                  navigate('/employee/verification');
                } else if (!isPunchedIn) {
                  navigate('/employee/attendance');
                } else {
                  navigate('/employee/credit-cards');
                }
              }}
              style={{
                background: C.primaryButton,
                color: '#FFFFFF',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '12px',
                fontWeight: 600,
                fontSize: '13.5px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'background 0.2s ease',
                width: '100%'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = C.primaryDark}
              onMouseLeave={(e) => e.currentTarget.style.background = C.primaryButton}
            >
              {pendingTasksCount > 0 
                ? 'Complete Verification' 
                : !isPunchedIn 
                ? 'Punch Attendance' 
                : 'Explore Products'
              } <FaArrowRight />
            </button>
          </div>
        </div>

        {/* Separate HR Department Section - Below Dashboard Sections */}
        <div
          id="hr-department"
          ref={hrDepartmentRef}
          style={{
            marginTop: '32px',
            background: C.card,
            border: `1.5px solid ${hrDepartmentOpen ? (C.teal || '#008A60') : C.border}`,
            borderRadius: '20px',
            padding: isMobile ? '18px 14px' : '26px 28px',
            boxShadow: hrDepartmentOpen
              ? (isDark ? '0 12px 36px rgba(0,0,0,0.5)' : '0 10px 30px rgba(0, 138, 96, 0.12)')
              : '0 4px 14px rgba(16, 24, 40, 0.04)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          {/* Section Header */}
          <div
            onClick={() => setHrDepartmentOpen(prev => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              userSelect: 'none',
              gap: '16px',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '16px' }}>
              <div style={{
                width: isMobile ? '46px' : '54px',
                height: isMobile ? '46px' : '54px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #008A60 0%, #047857 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '20px' : '24px',
                flexShrink: 0,
                boxShadow: '0 4px 14px rgba(0, 138, 96, 0.3)'
              }}>
                <FaBuilding />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h2 style={{
                    margin: 0,
                    fontSize: isMobile ? '18px' : '22px',
                    fontWeight: 800,
                    color: C.text,
                    letterSpacing: '-0.3px'
                  }}>
                    HR Department
                  </h2>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '3px 9px',
                    borderRadius: '12px',
                    background: isDark ? 'rgba(0, 212, 170, 0.15)' : '#E6F4EA',
                    color: isDark ? '#00D4AA' : '#008A60',
                    border: `1px solid ${isDark ? 'rgba(0, 212, 170, 0.3)' : '#A7F3D0'}`
                  }}>
                    5 Modules
                  </span>
                </div>
                <p style={{
                  margin: '4px 0 0 0',
                  fontSize: isMobile ? '12px' : '13.5px',
                  color: C.textMid,
                  lineHeight: 1.4
                }}>
                  Employee services hub: My Incentive, My Salary, Payslip, Document & Report
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setHrDepartmentOpen(prev => !prev);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: hrDepartmentOpen ? (isDark ? '#334155' : '#E2E8F0') : (C.primaryButton || '#008A60'),
                  color: hrDepartmentOpen ? C.text : '#FFFFFF',
                  border: 'none',
                  padding: isMobile ? '7px 14px' : '9px 18px',
                  borderRadius: '12px',
                  fontSize: isMobile ? '12px' : '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: hrDepartmentOpen ? 'none' : '0 2px 8px rgba(0, 138, 96, 0.25)'
                }}
              >
                <span>{hrDepartmentOpen ? 'Collapse HR Department' : 'Open HR Department'}</span>
                {hrDepartmentOpen ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
              </button>
            </div>
          </div>

          {/* Expanded Content: 5 Modules */}
          {hrDepartmentOpen && (
            <div style={{ marginTop: '24px', borderTop: `1px solid ${C.border}`, paddingTop: '22px' }}>
              {/* Tab Navigation across the 5 modules */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                overflowX: 'auto',
                paddingBottom: '12px',
                marginBottom: '20px',
                scrollbarWidth: 'none'
              }}>
                <button
                  type="button"
                  onClick={() => setActiveHrModule(null)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: activeHrModule === null ? `1.5px solid ${C.teal || '#008A60'}` : `1px solid ${C.border}`,
                    background: activeHrModule === null ? (isDark ? 'rgba(0, 212, 170, 0.15)' : '#E6F4EA') : C.bgSecondary,
                    color: activeHrModule === null ? (isDark ? '#00D4AA' : '#008A60') : C.text,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <FaBuilding size={13} />
                  <span>All 5 Modules</span>
                </button>

                {hrDepartmentModules.map((mod) => {
                  const isSelected = activeHrModule === mod.id;
                  const ModIcon = mod.icon;
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => setActiveHrModule(mod.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: isSelected ? 800 : 600,
                        cursor: 'pointer',
                        border: isSelected ? `1.5px solid ${mod.color}` : `1px solid ${C.border}`,
                        background: isSelected ? (isDark ? `${mod.color}25` : mod.bg) : C.bgSecondary,
                        color: isSelected ? mod.color : C.text,
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <ModIcon size={14} style={{ color: isSelected ? mod.color : C.textMid }} />
                      <span>{mod.title}</span>
                    </button>
                  );
                })}
              </div>

              {/* Module Cards Grid View (when activeHrModule === null) */}
              {activeHrModule === null ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : (isTablet ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)'),
                  gap: isMobile ? '12px' : '16px'
                }}>
                  {hrDepartmentModules.map((mod, idx) => {
                    const ModIcon = mod.icon;
                    return (
                      <div
                        key={mod.id}
                        onClick={() => setActiveHrModule(mod.id)}
                        style={{
                          background: isDark ? '#1E293B' : '#FFFFFF',
                          border: `1px solid ${C.border}`,
                          borderRadius: '16px',
                          padding: isMobile ? '16px' : '20px',
                          cursor: 'pointer',
                          transition: 'all 0.25s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          boxShadow: '0 4px 14px rgba(16, 24, 40, 0.04)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-3px)';
                          e.currentTarget.style.borderColor = mod.color;
                          e.currentTarget.style.boxShadow = `0 8px 24px ${mod.color}20`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.borderColor = C.border;
                          e.currentTarget.style.boxShadow = '0 4px 14px rgba(16, 24, 40, 0.04)';
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                            <div style={{
                              width: '48px',
                              height: '48px',
                              borderRadius: '14px',
                              background: isDark ? `${mod.color}25` : mod.bg,
                              color: mod.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '20px'
                            }}>
                              <ModIcon />
                            </div>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: '8px',
                              background: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
                              color: C.textMid
                            }}>
                              Module {idx + 1}
                            </span>
                          </div>

                          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 6px 0', color: C.text }}>
                            {mod.title}
                          </h3>
                          <p style={{ fontSize: '13px', color: C.textMid, margin: '0 0 16px 0', lineHeight: 1.4 }}>
                            {mod.desc}
                          </p>
                        </div>

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderTop: `1px solid ${C.border}`,
                          paddingTop: '12px'
                        }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: mod.color, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            View Module <FaArrowRight size={11} />
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(mod.route);
                            }}
                            title="Open in Dedicated Full Page"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: C.textLight,
                              cursor: 'pointer',
                              fontSize: '12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 6px'
                            }}
                          >
                            <FaExternalLinkAlt size={10} /> Full Page
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Selected Module View - Rendering the existing component directly inside HR Department */
                <div style={{
                  background: isDark ? '#0F172A' : '#FAFAFA',
                  border: `1px solid ${C.border}`,
                  borderRadius: '16px',
                  padding: isMobile ? '12px 8px' : '20px',
                  boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.03)'
                }}>
                  {/* Module Header Bar */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px',
                    paddingBottom: '12px',
                    borderBottom: `1px solid ${C.border}`,
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setActiveHrModule(null)}
                        style={{
                          background: C.card,
                          border: `1px solid ${C.border}`,
                          color: C.text,
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <FaArrowLeft size={10} /> Back to Modules
                      </button>
                      <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: C.text }}>
                        {hrDepartmentModules.find(m => m.id === activeHrModule)?.title}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const target = hrDepartmentModules.find(m => m.id === activeHrModule)?.route;
                        if (target) navigate(target);
                      }}
                      style={{
                        background: C.card,
                        border: `1px solid ${C.border}`,
                        color: C.primary,
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <FaExternalLinkAlt size={10} /> Open in Dedicated Full Page
                    </button>
                  </div>

                  {/* Render the Existing Component */}
                  <React.Suspense fallback={
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
                      <LoadingLogo size={80} />
                    </div>
                  }>
                    {activeHrModule === 'incentive' && <MyIncentives />}
                    {activeHrModule === 'salary' && <EmployeeMySalary />}
                    {activeHrModule === 'payslip' && <EmployeePayslip />}
                    {activeHrModule === 'document' && <EmployeeDocumentsReports />}
                    {activeHrModule === 'report' && <EmployeeSalesReports />}
                  </React.Suspense>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
