import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { 
  HiOutlineSquares2X2, 
  HiOutlineDocumentText, 
  HiOutlinePlus, 
  HiOutlineChatBubbleLeftRight, 
  HiOutlineBars3 
} from 'react-icons/hi2';

export default function AdminMobileBottomNav({ isHR = false, mobileMenuOpen, onToggleMenu, messengerUnread = 0 }) {
  const { C, isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : true);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isMobile) return null;

  const isActive = (path) => {
    if (path === '/admin/dashboard' || path === '/hr/dashboard') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const activeColor = C?.teal || (isDark ? '#00D4AA' : '#008A60');
  const inactiveColor = isDark ? '#94A3B8' : '#64748B';

  const handleNav = (path) => {
    if (mobileMenuOpen && onToggleMenu) {
      onToggleMenu(false);
    }
    navigate(path);
  };

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
        {/* 1. Dashboard */}
        <div
          onClick={() => handleNav(isHR ? '/hr/dashboard' : '/admin/dashboard')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            cursor: 'pointer',
            flex: 1
          }}
        >
          <div style={{ color: isActive(isHR ? '/hr/dashboard' : '/admin/dashboard') && !mobileMenuOpen ? activeColor : inactiveColor }}>
            <HiOutlineSquares2X2 size={22} />
          </div>
          <span style={{ fontSize: '11px', fontWeight: isActive(isHR ? '/hr/dashboard' : '/admin/dashboard') && !mobileMenuOpen ? 800 : 600, color: isActive(isHR ? '/hr/dashboard' : '/admin/dashboard') && !mobileMenuOpen ? activeColor : inactiveColor }}>
            {isHR ? 'HR' : 'Dashboard'}
          </span>
        </div>

        {/* 2. Applications / Attendance */}
        <div
          onClick={() => handleNav(isHR ? '/hr/attendance' : '/admin/applications')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            cursor: 'pointer',
            flex: 1
          }}
        >
          <div style={{ color: isActive(isHR ? '/hr/attendance' : '/admin/applications') && !mobileMenuOpen ? activeColor : inactiveColor }}>
            <HiOutlineDocumentText size={22} />
          </div>
          <span style={{ fontSize: '11px', fontWeight: isActive(isHR ? '/hr/attendance' : '/admin/applications') && !mobileMenuOpen ? 800 : 600, color: isActive(isHR ? '/hr/attendance' : '/admin/applications') && !mobileMenuOpen ? activeColor : inactiveColor }}>
            {isHR ? 'Attendance' : 'Apps'}
          </span>
        </div>

        {/* 3. CENTER ELEVATED CIRCLE BUTTON: Add Lead / Invite */}
        <div
          onClick={() => handleNav(isHR ? '/super-admin/employees' : '/admin/leads')}
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
              background: 'linear-gradient(135deg, #0F766E, #0D9488)',
              border: `3px solid ${isDark ? '#1E293B' : '#FFFFFF'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 18px rgba(15,118,110,0.45)'
            }}
          >
            <HiOutlinePlus size={24} color="#FFFFFF" />
          </div>
          <span style={{ fontSize: '11px', fontWeight: 700, marginTop: '2px', color: isDark ? '#F8FAFC' : '#1E293B' }}>
            {isHR ? 'Invite' : 'Add Lead'}
          </span>
        </div>

        {/* 4. Messages with Unread Badge */}
        <div
          onClick={() => handleNav('/admin/messenger')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            cursor: 'pointer',
            flex: 1,
            position: 'relative'
          }}
        >
          <div style={{ color: isActive('/admin/messenger') && !mobileMenuOpen ? activeColor : inactiveColor, position: 'relative', display: 'flex', alignItems: 'center' }}>
            <HiOutlineChatBubbleLeftRight size={22} />
            {messengerUnread > 0 && (
              <span style={{
                position: 'absolute',
                top: '-6px',
                right: '-10px',
                background: '#EF4444',
                color: '#FFFFFF',
                fontSize: '9.5px',
                fontWeight: 900,
                minWidth: '15px',
                height: '15px',
                borderRadius: '8px',
                padding: '0 3px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1.5px solid ${isDark ? '#1E293B' : '#FFFFFF'}`
              }}>
                {messengerUnread > 99 ? '99+' : messengerUnread}
              </span>
            )}
          </div>
          <span style={{ fontSize: '11px', fontWeight: isActive('/admin/messenger') && !mobileMenuOpen ? 800 : 600, color: isActive('/admin/messenger') && !mobileMenuOpen ? activeColor : inactiveColor }}>
            Message
          </span>
        </div>

        {/* 5. Menu Drawer Toggle */}
        <div
          onClick={() => onToggleMenu && onToggleMenu()}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            cursor: 'pointer',
            flex: 1
          }}
        >
          <div style={{ color: mobileMenuOpen ? activeColor : inactiveColor }}>
            <HiOutlineBars3 size={22} />
          </div>
          <span style={{ fontSize: '11px', fontWeight: mobileMenuOpen ? 800 : 600, color: mobileMenuOpen ? activeColor : inactiveColor }}>
            Menu
          </span>
        </div>

      </div>
    </div>
  );
}
