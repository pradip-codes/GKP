import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuthStore } from '../app/store/authStore';
import { 
  HiOutlineHome, 
  HiOutlineCreditCard, 
  HiOutlineBanknotes, 
  HiOutlinePhone, 
  HiOutlineArrowRightOnRectangle,
  HiOutlineSquares2X2,
  HiOutlinePlus
} from 'react-icons/hi2';

export default function HomeMobileBottomNav() {
  const { C, isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const user = useAuthStore(state => state.user);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : true);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isMobile) return null;

  const currentPath = location.pathname;

  const isActive = (path) => {
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  };

  const getDashboardPath = () => {
    if (!user) return '/partner/dashboard';
    switch (user.role) {
      case 'ADMIN':
        return '/admin/dashboard';
      case 'SUPER_ADMIN':
        return '/super-admin/dashboard';
      case 'EMPLOYEE':
        return '/employee/dashboard';
      case 'PARTNER':
      default:
        return '/partner/dashboard';
    }
  };

  const activeColor = C?.teal || (isDark ? '#00D4AA' : '#008A60');
  const inactiveColor = isDark ? '#94A3B8' : '#64748B';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
        left: '10px',
        right: '10px',
        zIndex: 990,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '540px',
          background: isDark ? '#1E293B' : '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          padding: '8px 12px',
          pointerEvents: 'auto',
          border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
          borderRadius: '20px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          backdropFilter: 'blur(10px)',
          height: '64px'
        }}
      >
        {/* 1. Home */}
        <div
          onClick={() => navigate('/')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            cursor: 'pointer',
            flex: 1
          }}
        >
          <div style={{ color: isActive('/') ? activeColor : inactiveColor }}>
            <HiOutlineHome size={22} />
          </div>
          <span style={{ fontSize: '11px', fontWeight: isActive('/') ? 800 : 600, color: isActive('/') ? activeColor : inactiveColor }}>
            Home
          </span>
        </div>

        {/* 2. Loans */}
        <div
          onClick={() => navigate('/loans')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            cursor: 'pointer',
            flex: 1
          }}
        >
          <div style={{ color: isActive('/loans') ? activeColor : inactiveColor }}>
            <HiOutlineBanknotes size={22} />
          </div>
          <span style={{ fontSize: '11px', fontWeight: isActive('/loans') ? 800 : 600, color: isActive('/loans') ? activeColor : inactiveColor }}>
            Loans
          </span>
        </div>

        {/* 3. CENTER ELEVATED CIRCLE BUTTON: Apply / Credit Cards */}
        <div
          onClick={() => navigate('/credit-cards')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: '-24px',
            cursor: 'pointer',
            flex: 1
          }}
        >
          <div
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
              border: `3px solid ${isDark ? '#1E293B' : '#FFFFFF'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 18px rgba(37,99,235,0.45)'
            }}
          >
            <HiOutlinePlus size={24} color="#FFFFFF" />
          </div>
          <span style={{ fontSize: '11px', fontWeight: 700, marginTop: '2px', color: isDark ? '#F8FAFC' : '#1E293B' }}>
            Apply
          </span>
        </div>

        {/* 4. Support */}
        <div
          onClick={() => navigate('/contact')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            cursor: 'pointer',
            flex: 1
          }}
        >
          <div style={{ color: isActive('/contact') ? activeColor : inactiveColor }}>
            <HiOutlinePhone size={22} />
          </div>
          <span style={{ fontSize: '11px', fontWeight: isActive('/contact') ? 800 : 600, color: isActive('/contact') ? activeColor : inactiveColor }}>
            Support
          </span>
        </div>

        {/* 5. Dashboard or Login */}
        <div
          onClick={() => navigate(isAuthenticated ? getDashboardPath() : '/login')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            cursor: 'pointer',
            flex: 1
          }}
        >
          <div style={{ color: isActive(isAuthenticated ? getDashboardPath() : '/login') ? activeColor : inactiveColor }}>
            {isAuthenticated ? <HiOutlineSquares2X2 size={22} /> : <HiOutlineArrowRightOnRectangle size={22} />}
          </div>
          <span style={{ fontSize: '11px', fontWeight: isActive(isAuthenticated ? getDashboardPath() : '/login') ? 800 : 600, color: isActive(isAuthenticated ? getDashboardPath() : '/login') ? activeColor : inactiveColor }}>
            {isAuthenticated ? 'Portal' : 'Login'}
          </span>
        </div>

      </div>
    </div>
  );
}
