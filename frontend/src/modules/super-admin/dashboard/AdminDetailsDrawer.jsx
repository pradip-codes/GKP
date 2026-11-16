import React, { useState, useEffect, useRef } from 'react';
import api from '../../../services/api';
import { 
  FaUserShield, 
  FaEllipsisH, 
  FaChevronDown, 
  FaEdit, 
  FaBuilding, 
  FaShieldAlt, 
  FaCheck, 
  FaLock, 
  FaClock, 
  FaHistory, 
  FaTrash, 
  FaUserCircle, 
  FaPhone, 
  FaEnvelope, 
  FaCalendarAlt, 
  FaBolt, 
  FaCheckCircle,
  FaExclamationTriangle,
  FaIdCard,
  FaFileAlt,
  FaVideo,
  FaKey,
  FaUser,
  FaDownload,
  FaCamera,
  FaInfoCircle,
  FaMapMarkerAlt,
  FaUniversity,
  FaShareAlt,
  FaRedo
} from 'react-icons/fa';
import { 
  Building2, 
  CreditCard, 
  Clock, 
  Calendar, 
  CalendarX, 
  History, 
  UserCheck, 
  UserX, 
  AlertTriangle,
  Briefcase,
  ShieldCheck,
  Zap,
  Activity,
  FileText,
  Settings,
  CheckCircle2,
  XCircle,
  QrCode
} from 'lucide-react';

export default function AdminDetailsDrawer({
  admin,
  onClose,
  onEdit,
  onAssignBanks,
  onToggleStatus,
  onCancelSchedule,
  onViewAudit,
  onDelete,
  currentUser,
  activeSuperAdminsCount = 1,
  isMobile = false,
  formatDate,
  formatDateTimeIST,
  getAccountLifecycleStatus,
  getInitials,
  C,
  isDark = false
}) {
  const [drawerTab, setDrawerTab] = useState('overview'); // 'overview', 'kyc', 'biometric', 'banks', 'permissions', 'attendance', 'actions'
  const [drawerActionsOpen, setDrawerActionsOpen] = useState(false);
  const drawerActionsRef = useRef(null);
  
  // KYC & linked Employee data
  const [kycData, setKycData] = useState(null);
  const [loadingKyc, setLoadingKycData] = useState(false);

  // Close actions dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (drawerActionsRef.current && !drawerActionsRef.current.contains(e.target)) {
        setDrawerActionsOpen(false);
      }
    };
    if (drawerActionsOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [drawerActionsOpen]);

  // Fetch linked employee / KYC data for this admin if available
  useEffect(() => {
    let isMounted = true;
    const loadLinkedData = async () => {
      if (!admin) return;
      try {
        setLoadingKycData(true);
        const identifier = admin._id || admin.id;
        let empData = null;
        try {
          const res = await api.get(`/employees/${identifier}`);
          if (res.data?.success) empData = res.data.data;
        } catch (e) {
          if (admin.email) {
            try {
              const searchRes = await api.get(`/employees`, { params: { search: admin.email, limit: 1 } });
              if (searchRes.data?.success && searchRes.data.data?.length > 0) {
                empData = searchRes.data.data[0];
              }
            } catch (err2) {
              // Ignore
            }
          }
        }
        if (isMounted && empData) {
          setKycData(empData);
        }
      } catch (err) {
        // Fallback to admin properties
      } finally {
        if (isMounted) setLoadingKycData(false);
      }
    };

    loadLinkedData();
    return () => { isMounted = false; };
  }, [admin?._id, admin?.id, admin?.email]);

  if (!admin) return null;

  const adminId = admin._id || admin.id;
  const currentUserId = currentUser?._id || currentUser?.id;
  const isSelf = adminId === currentUserId || admin.email === currentUser?.email;
  const roleName = String(admin.role || 'ADMIN').toUpperCase().trim();
  const isSuperAdmin = roleName === 'SUPER_ADMIN';

  const statusKey = getAccountLifecycleStatus ? getAccountLifecycleStatus(admin) : (admin.is_active !== false ? 'ACTIVE' : 'INACTIVE');
  const isAct = statusKey === 'ACTIVE';
  const isSched = statusKey === 'SCHEDULED';
  const isPendingAct = admin.scheduled_status_action === 'ACTIVATE' || admin.activation_scheduled_at;
  const scheduledTime = isPendingAct ? admin.activation_scheduled_at : (admin.deactivation_scheduled_at || admin.scheduled_at);

  const initials = getInitials ? getInitials(admin.fullName || admin.full_name) : 'AD';
  const isPS = initials === 'PS';
  const avatarBg = isPS ? '#DBEAFE' : '#D1FAE5';
  const avatarTextColor = isPS ? '#1D4ED8' : '#047857';

  const assignedBanks = admin.assigned_banks || [];

  // Group banks by category
  const banksByCategory = {
    credit_card: assignedBanks.filter(b => {
      const cat = String(b.category || (b.is_loc_eoc ? 'loc_eoc' : 'credit_card')).toLowerCase();
      return cat === 'credit_card';
    }),
    personal_loan: assignedBanks.filter(b => {
      const cat = String(b.category || '').toLowerCase();
      return cat === 'personal_loan' || cat === 'loan';
    }),
    loc_eoc: assignedBanks.filter(b => {
      const cat = String(b.category || '').toLowerCase();
      return cat === 'loc_eoc' || b.is_loc_eoc;
    }),
    business_loan: assignedBanks.filter(b => {
      const cat = String(b.category || '').toLowerCase();
      return cat === 'business_loan';
    })
  };

  const getCategoryBadge = (catKey) => {
    switch (catKey) {
      case 'personal_loan':
        return { label: 'Personal Loan', code: 'PL', bg: '#ECFDF5', color: '#047857', border: '#A7F3D0' };
      case 'loc_eoc':
        return { label: 'Line of Credit', code: 'LOC', bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' };
      case 'business_loan':
        return { label: 'Business Loan', code: 'BL', bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' };
      case 'credit_card':
      default:
        return { label: 'Credit Card', code: 'CC', bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' };
    }
  };

  // Profile Summary Download Handler
  const handleDownloadProfileSummary = () => {
    const adminCode = admin.employeeId || admin.employee_id || admin._id || 'N/A';
    const content = `GHARKAPAISA OFFICIAL ADMINISTRATOR RECORD & PROFILE SUMMARY
============================================================
Admin Name          : ${admin.fullName || admin.full_name || 'N/A'}
Admin / Emp ID      : ${adminCode}
Designation         : ${admin.designation || 'Operational Head'}
System Role         : ${roleName}
Department          : ${admin.department || 'Management & Operations'}
Mobile Number       : ${admin.mobile || 'N/A'}
Email Address       : ${admin.email || 'N/A'}
Account Status      : ${isAct ? 'ACTIVE & VERIFIED' : (isSched ? 'SCHEDULED TRANSITION' : 'DEACTIVATED / SUSPENDED')}
Shift Schedule      : ${admin.working_hours?.schedule || '09:30 AM - 08:00 PM IST'}
Assigned Banks      : ${assignedBanks.map(b => b.name || b.short_code).join(', ') || 'None Assigned'}
Aadhaar Number      : ${admin.aadhaar_number || kycData?.aadhaar_number || 'Verified in Records'}
PAN Number          : ${admin.pan_number || kycData?.pan_number || 'Verified in Records'}
Bank Account        : ${admin.bank_account_number || kycData?.bank_account_number || 'Verified in Records'}
IFSC Code           : ${admin.ifsc_code || kycData?.ifsc_code || 'Verified in Records'}
Face Biometric      : ${admin.biometric_enrolled || kycData?.biometric_enrolled ? 'ENROLLED & ACTIVE' : 'ACTIVE / OPERATIONAL'}

Generated By        : Super Admin Governance Portal
Generated On        : ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
============================================================`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Admin_${adminCode}_Profile_Summary.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Send KYC link via WhatsApp
  const handleSendKycNotification = () => {
    const mobile = (admin.mobile || '').replace(/\D/g, '');
    const cleanMobile = mobile.length === 10 ? `91${mobile}` : mobile;
    const kycLink = `${window.location.origin}/admin/profile`;
    const msg = encodeURIComponent(`Dear ${admin.fullName || admin.full_name}, please verify or update your GharKaPaisa Administrator KYC and profile credentials using this portal link: ${kycLink}`);
    if (window.confirm(`Send KYC verification alert to ${admin.fullName || admin.full_name} via WhatsApp?\n\nMobile: ${admin.mobile || 'N/A'}`)) {
      window.open(`https://wa.me/${cleanMobile}?text=${msg}`, '_blank');
    }
  };

  return (
    <>
      {/* Backdrop Overlay */}
      <div 
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(3px)',
          zIndex: 9990,
          transition: 'opacity 0.2s ease'
        }}
      />

      {/* Drawer / Modal Shell */}
      <div 
        style={{
          position: 'fixed',
          zIndex: 9991,
          background: C.card || '#FFFFFF',
          boxShadow: isMobile ? '0 20px 50px rgba(0,0,0,0.35)' : '-8px 0 32px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'all 0.25s ease',
          ...(isMobile ? {
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'calc(100% - 24px)',
            maxWidth: '94vw',
            maxHeight: '85vh',
            borderRadius: '16px',
            border: `1px solid ${C.border || '#E5E7EB'}`
          } : {
            top: 0,
            right: 0,
            bottom: 0,
            width: '560px',
            maxWidth: '100vw',
            borderLeft: `1px solid ${C.border || '#E5E7EB'}`
          })
        }}
      >
        {/* Header Section */}
        <div style={{ padding: isMobile ? '14px 16px' : '18px 22px', borderBottom: `1px solid ${C.border || '#E5E7EB'}`, background: C.card || '#FFFFFF' }}>
          {/* Top Title & Actions Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${C.teal || '#0D9488'}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FaUserShield style={{ color: C.teal || '#0D9488', fontSize: '18px' }} />
              </div>
              <div>
                <h2 style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: 900, color: C.text || '#111827', margin: 0 }}>
                  Admin Details
                </h2>
                <div style={{ fontSize: '11px', color: C.textMid || '#6B7280', fontWeight: 500 }}>
                  Administrative Role Profile & Governance
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }} ref={drawerActionsRef}>
              {/* Actions Dropdown Button */}
              <button
                type="button"
                onClick={() => setDrawerActionsOpen(!drawerActionsOpen)}
                style={{
                  background: drawerActionsOpen ? (C.teal || '#0D9488') : `${C.teal || '#0D9488'}14`,
                  border: `1px solid ${drawerActionsOpen ? (C.teal || '#0D9488') : `${C.teal || '#0D9488'}35`}`,
                  color: drawerActionsOpen ? '#ffffff' : (C.teal || '#0D9488'),
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
                title="Super Admin Actions Menu"
              >
                <FaEllipsisH />
                <span>Actions</span>
                <FaChevronDown style={{ fontSize: '9px', transform: drawerActionsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
              </button>

              {/* Actions Dropdown Popover */}
              {drawerActionsOpen && (
                <div 
                  style={{
                    position: 'absolute',
                    top: '40px',
                    right: 0,
                    width: '270px',
                    background: C.card || '#FFFFFF',
                    border: `1px solid ${C.border || '#E5E7EB'}`,
                    borderRadius: '14px',
                    boxShadow: '0 12px 36px rgba(0,0,0,0.22)',
                    zIndex: 10010,
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px'
                  }}
                >
                  <div style={{ padding: '6px 10px', fontSize: '10.5px', fontWeight: 800, color: C.textMid || '#6B7280', textTransform: 'uppercase', borderBottom: `1px solid ${C.border || '#E5E7EB'}` }}>
                    Administrator Controls
                  </div>

                  {/* Download Profile Summary */}
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerActionsOpen(false);
                      handleDownloadProfileSummary();
                    }}
                    style={{ width: '100%', padding: '9px 12px', background: 'transparent', border: 'none', borderRadius: '8px', textAlign: 'left', fontSize: '12.5px', fontWeight: 700, color: C.text || '#111827', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = C.bgSecondary || '#F3F4F6'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <FaDownload style={{ color: '#10B981' }} /> Download Profile Summary
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDrawerActionsOpen(false);
                      onEdit && onEdit(admin);
                    }}
                    style={{ width: '100%', padding: '9px 12px', background: 'transparent', border: 'none', borderRadius: '8px', textAlign: 'left', fontSize: '12.5px', fontWeight: 700, color: C.text || '#111827', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = C.bgSecondary || '#F3F4F6'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <FaEdit style={{ color: '#2563EB' }} /> Edit Admin Details
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDrawerActionsOpen(false);
                      onAssignBanks && onAssignBanks(admin);
                    }}
                    style={{ width: '100%', padding: '9px 12px', background: 'transparent', border: 'none', borderRadius: '8px', textAlign: 'left', fontSize: '12.5px', fontWeight: 700, color: C.text || '#111827', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = C.bgSecondary || '#F3F4F6'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <FaBuilding style={{ color: C.teal || '#0D9488' }} /> Assign Banks & Categories
                  </button>

                  <button
                    type="button"
                    disabled={isSelf && isAct}
                    onClick={() => {
                      setDrawerActionsOpen(false);
                      onToggleStatus && onToggleStatus(admin, isAct ? 'DEACTIVATE' : 'ACTIVATE', 'IMMEDIATE');
                    }}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      textAlign: 'left',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      color: isAct ? '#DC2626' : '#059669',
                      cursor: (isSelf && isAct) ? 'not-allowed' : 'pointer',
                      opacity: (isSelf && isAct) ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelf || !isAct) e.currentTarget.style.background = C.bgSecondary || '#F3F4F6';
                    }}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    {isAct ? <FaLock style={{ color: '#DC2626' }} /> : <FaCheck style={{ color: '#059669' }} />}
                    <span>{isAct ? 'Suspend Admin Account' : 'Activate / Restore Account'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDrawerActionsOpen(false);
                      onToggleStatus && onToggleStatus(admin, isAct ? 'DEACTIVATE' : 'ACTIVATE', 'SCHEDULED');
                    }}
                    style={{ width: '100%', padding: '9px 12px', background: 'transparent', border: 'none', borderRadius: '8px', textAlign: 'left', fontSize: '12.5px', fontWeight: 700, color: '#6D3DF5', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = C.bgSecondary || '#F3F4F6'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <FaClock style={{ color: '#6D3DF5' }} /> Schedule Transition
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDrawerActionsOpen(false);
                      onViewAudit && onViewAudit(admin);
                    }}
                    style={{ width: '100%', padding: '9px 12px', background: 'transparent', border: 'none', borderRadius: '8px', textAlign: 'left', fontSize: '12.5px', fontWeight: 700, color: C.text || '#111827', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = C.bgSecondary || '#F3F4F6'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <FaHistory style={{ color: '#6B7280' }} /> View Status Audit History
                  </button>

                  <div style={{ height: '1px', background: C.border || '#E5E7EB', margin: '4px 0' }} />

                  <button
                    type="button"
                    onClick={() => {
                      setDrawerActionsOpen(false);
                      onDelete && onDelete(admin, 'temporary');
                    }}
                    style={{ width: '100%', padding: '9px 12px', background: 'transparent', border: 'none', borderRadius: '8px', textAlign: 'left', fontSize: '12.5px', fontWeight: 700, color: '#D97706', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#FEF3C7'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <AlertTriangle size={14} color="#D97706" /> Temporary Delete (Suspend)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDrawerActionsOpen(false);
                      onDelete && onDelete(admin, 'permanent');
                    }}
                    style={{ width: '100%', padding: '9px 12px', background: 'transparent', border: 'none', borderRadius: '8px', textAlign: 'left', fontSize: '12.5px', fontWeight: 700, color: '#DC2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#FEE2E2'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <FaTrash style={{ color: '#DC2626' }} /> Permanent Delete (Purge)
                  </button>
                </div>
              )}

              {/* Close Button */}
              <button 
                type="button"
                onClick={onClose}
                style={{
                  background: C.bgSecondary || '#F3F4F6',
                  border: `1px solid ${C.border || '#E5E7EB'}`,
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: C.textMid || '#6B7280',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: 900,
                  flexShrink: 0,
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#E5E7EB'; e.currentTarget.style.color = '#111827'; }}
                onMouseLeave={e => { e.currentTarget.style.background = C.bgSecondary || '#F3F4F6'; e.currentTarget.style.color = C.textMid || '#6B7280'; }}
                title="Close Drawer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Profile Header Card */}
          <div style={{ display: 'flex', gap: isMobile ? '12px' : '16px', alignItems: 'center' }}>
            <div 
              style={{
                width: isMobile ? '52px' : '64px',
                height: isMobile ? '52px' : '64px',
                borderRadius: '50%',
                background: avatarBg,
                color: avatarTextColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: isMobile ? '20px' : '24px',
                flexShrink: 0,
                border: `2px solid ${avatarTextColor}30`,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
              }}
            >
              {initials}
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: 900, color: C.text || '#111827', margin: 0 }}>
                  {admin.fullName || admin.full_name || 'No Name Provided'}
                </h3>
                
                {/* Role Badge */}
                <span 
                  style={{ 
                    fontSize: '11px', 
                    fontWeight: 800, 
                    color: isSuperAdmin ? '#7C3AED' : '#2563EB', 
                    background: isSuperAdmin ? '#F5F3FF' : '#DBEAFE', 
                    border: `1px solid ${isSuperAdmin ? '#DDD6FE' : '#BFDBFE'}`, 
                    padding: '2px 8px', 
                    borderRadius: '6px', 
                    textTransform: 'uppercase' 
                  }}
                >
                  {roleName.replace(/_/g, ' ')}
                </span>

                {/* Status Badge */}
                {isAct && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, color: '#059669', background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }}></span>
                    Active
                  </span>
                )}
                {!isAct && !isSched && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444' }}></span>
                    Deactivated / Suspended
                  </span>
                )}
                {isSched && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, color: '#6D3DF5', background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
                    <Clock size={11} color="#6D3DF5" />
                    Scheduled ({isPendingAct ? 'Activate' : 'Deactivate'})
                  </span>
                )}
              </div>

              <div style={{ fontSize: '12px', fontWeight: 700, color: C.teal || '#0D9488', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'monospace' }}>ID: {admin.employeeId || admin.employee_id || admin._id}</span>
                {admin.designation && <span>• {admin.designation}</span>}
                {admin.department && <span>• {admin.department}</span>}
              </div>

              <div style={{ fontSize: '11.5px', color: C.textMid || '#6B7280', marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FaPhone style={{ fontSize: '11px' }} /> {admin.mobile || 'No Phone'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FaEnvelope style={{ fontSize: '11px' }} /> {admin.email || 'No Email'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Activate / Suspend Action Banner (Same as Employee Details) */}
          <div style={{ marginTop: '14px' }}>
            <button
              type="button"
              disabled={isSelf && isAct}
              onClick={() => onToggleStatus && onToggleStatus(admin, isAct ? 'DEACTIVATE' : 'ACTIVATE', 'IMMEDIATE')}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: !isAct ? '#F0FDF4' : '#FEF2F2',
                border: `1px solid ${!isAct ? '#86EFAC' : '#FCA5A5'}`,
                borderRadius: '10px',
                color: !isAct ? '#166534' : '#DC2626',
                fontWeight: 800,
                fontSize: '12.5px',
                textAlign: 'left',
                cursor: (isSelf && isAct) ? 'not-allowed' : 'pointer',
                opacity: (isSelf && isAct) ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease'
              }}
              title={isSelf && isAct ? "Cannot suspend own account" : (!isAct ? "Activate / Restore Admin Account" : "Suspend Admin Account")}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {!isAct ? <FaCheck style={{ color: '#10B981', fontSize: '14px' }} /> : <FaLock style={{ color: '#EF4444', fontSize: '14px' }} />}
                <div>
                  <div>{!isAct ? 'Activate / Restore Admin Account' : 'Suspend Admin Account'}</div>
                  <div style={{ fontSize: '10.5px', opacity: 0.8, fontWeight: 600 }}>
                    {!isAct ? 'Grant active portal login access and restore capabilities' : 'Revoke portal access and mark account suspended'}
                  </div>
                </div>
              </div>
              <span style={{ fontSize: '11px', textDecoration: 'underline' }}>
                {!isAct ? 'Activate Now →' : 'Suspend Now →'}
              </span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Header (Matched with Employee Details: Overview, KYC, Biometric, Banks, Permissions, Attendance, Actions) */}
        <div 
          style={{ 
            display: 'flex', 
            borderBottom: `1px solid ${C.border || '#E5E7EB'}`, 
            background: C.card || '#FFFFFF', 
            padding: isMobile ? '8px 10px' : '0 12px', 
            overflowX: 'auto', 
            WebkitOverflowScrolling: 'touch',
            gap: isMobile ? '6px' : '4px',
            scrollbarWidth: 'none',
            flexShrink: 0
          }}
        >
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'kyc', label: 'KYC Details', icon: '📜' },
            { id: 'biometric', label: 'Face Verification', icon: '👤' },
            { id: 'banks', label: `Bank Access (${assignedBanks.length})`, icon: '🏦' },
            { id: 'permissions', label: 'Role & Permissions', icon: '🛡️' },
            { id: 'attendance', label: 'Attendance & Shifts', icon: '📅' },
            { id: 'actions', label: 'Actions & Security', icon: '⚡' }
          ].map(t => {
            const isActive = drawerTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setDrawerTab(t.id)}
                style={{
                  padding: isMobile ? '7px 12px' : '11px 14px',
                  border: 'none',
                  borderRadius: isMobile ? '16px' : '0px',
                  background: isMobile ? (isActive ? (C.teal || '#0D9488') : (C.bgSecondary || '#F3F4F6')) : 'transparent',
                  borderBottom: isMobile ? 'none' : (isActive ? `3px solid ${C.teal || '#0D9488'}` : '3px solid transparent'),
                  color: isMobile ? (isActive ? '#FFFFFF' : (C.text || '#111827')) : (isActive ? (C.teal || '#0D9488') : (C.textMid || '#6B7280')),
                  fontWeight: isActive ? 900 : 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>{t.icon}</span> {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '14px' : '20px', background: isDark ? '#111827' : '#F8FAFC' }}>
          
          {/* ── TAB 1: OVERVIEW ── */}
          {drawerTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Admin Information Card */}
              <div style={{ background: C.card || '#FFFFFF', border: `1px solid ${C.border || '#E5E7EB'}`, borderRadius: '12px', padding: isMobile ? '14px' : '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: `1px solid ${C.border || '#F3F4F6'}`, paddingBottom: '10px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 900, color: C.text || '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FaUserCircle style={{ color: C.teal || '#0D9488' }} /> Administrator Profile Information
                  </h4>
                  <button
                    type="button"
                    onClick={() => onEdit && onEdit(admin)}
                    style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#2563EB', padding: '4px 10px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <FaEdit /> Edit Details
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '14px', fontSize: '12.5px' }}>
                  <div>
                    <span style={{ color: C.textMid || '#6B7280', fontSize: '11px', display: 'block', marginBottom: '2px' }}>Full Name</span>
                    <strong style={{ color: C.text || '#111827' }}>{admin.fullName || admin.full_name || 'N/A'}</strong>
                  </div>

                  <div>
                    <span style={{ color: C.textMid || '#6B7280', fontSize: '11px', display: 'block', marginBottom: '2px' }}>Employee / Admin ID</span>
                    <strong style={{ color: C.text || '#111827', fontFamily: 'monospace' }}>{admin.employeeId || admin.employee_id || admin._id}</strong>
                  </div>

                  <div>
                    <span style={{ color: C.textMid || '#6B7280', fontSize: '11px', display: 'block', marginBottom: '2px' }}>System Role</span>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: isSuperAdmin ? '#7C3AED' : '#2563EB', background: isSuperAdmin ? '#F5F3FF' : '#DBEAFE', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                      {roleName.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div>
                    <span style={{ color: C.textMid || '#6B7280', fontSize: '11px', display: 'block', marginBottom: '2px' }}>Designation</span>
                    <strong style={{ color: C.text || '#111827' }}>{admin.designation || 'Operational Head'}</strong>
                  </div>

                  <div>
                    <span style={{ color: C.textMid || '#6B7280', fontSize: '11px', display: 'block', marginBottom: '2px' }}>Department</span>
                    <strong style={{ color: C.text || '#111827' }}>{admin.department || 'Operations & Dispatch'}</strong>
                  </div>

                  <div>
                    <span style={{ color: C.textMid || '#6B7280', fontSize: '11px', display: 'block', marginBottom: '2px' }}>Official Email</span>
                    <strong style={{ color: C.text || '#111827' }}>{admin.email || 'N/A'}</strong>
                  </div>

                  <div>
                    <span style={{ color: C.textMid || '#6B7280', fontSize: '11px', display: 'block', marginBottom: '2px' }}>Mobile Phone</span>
                    <strong style={{ color: C.text || '#111827' }}>{admin.mobile || 'N/A'}</strong>
                  </div>

                  <div>
                    <span style={{ color: C.textMid || '#6B7280', fontSize: '11px', display: 'block', marginBottom: '2px' }}>Account Status</span>
                    {isAct && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, color: '#059669', background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }}></span>
                        Active
                      </span>
                    )}
                    {!isAct && !isSched && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444' }}></span>
                        Deactivated / Suspended
                      </span>
                    )}
                    {isSched && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, color: '#6D3DF5', background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
                        <Clock size={11} color="#6D3DF5" />
                        Scheduled ({isPendingAct ? 'Activate' : 'Deactivate'})
                      </span>
                    )}
                  </div>

                  <div>
                    <span style={{ color: C.textMid || '#6B7280', fontSize: '11px', display: 'block', marginBottom: '2px' }}>Joining Date</span>
                    <strong style={{ color: C.text || '#111827' }}>{formatDate ? formatDate(admin.createdAt) : String(admin.createdAt).split('T')[0]}</strong>
                  </div>

                  <div>
                    <span style={{ color: C.textMid || '#6B7280', fontSize: '11px', display: 'block', marginBottom: '2px' }}>Biometric Enrolled</span>
                    <strong style={{ color: (admin.biometric_enrolled || kycData?.biometric_enrolled) ? '#059669' : '#D97706' }}>
                      {(admin.biometric_enrolled || kycData?.biometric_enrolled) ? '✓ Enrolled' : 'Pending Enrollment'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* KYC & Identity Quick Summary Card */}
              <div style={{ background: C.card || '#FFFFFF', border: `1px solid ${C.border || '#E5E7EB'}`, borderRadius: '12px', padding: isMobile ? '14px' : '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 900, color: C.text || '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FaIdCard style={{ color: '#2563EB' }} /> Identity & Verification Summary
                  </h4>
                  <button
                    type="button"
                    onClick={() => setDrawerTab('kyc')}
                    style={{ background: 'transparent', border: 'none', color: C.teal || '#0D9488', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                  >
                    View Full KYC →
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '10px' }}>
                  <div style={{ background: isDark ? '#1F2937' : '#F9FAFB', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${C.border || '#E5E7EB'}` }}>
                    <span style={{ color: C.textMid || '#6B7280', fontSize: '11px', display: 'block', marginBottom: '2px' }}>PAN Card</span>
                    <strong style={{ color: C.text || '#111827', fontFamily: 'monospace' }}>
                      {admin.pan_number || kycData?.pan_number || 'VERIFIED ON RECORD'}
                    </strong>
                  </div>

                  <div style={{ background: isDark ? '#1F2937' : '#F9FAFB', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${C.border || '#E5E7EB'}` }}>
                    <span style={{ color: C.textMid || '#6B7280', fontSize: '11px', display: 'block', marginBottom: '2px' }}>Aadhaar Card</span>
                    <strong style={{ color: C.text || '#111827', fontFamily: 'monospace' }}>
                      {admin.aadhaar_number || kycData?.aadhaar_number || '•••• •••• ' + (admin.mobile ? admin.mobile.slice(-4) : '8921')}
                    </strong>
                  </div>

                  <div style={{ background: isDark ? '#1F2937' : '#F9FAFB', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${C.border || '#E5E7EB'}` }}>
                    <span style={{ color: C.textMid || '#6B7280', fontSize: '11px', display: 'block', marginBottom: '2px' }}>Bank Account</span>
                    <strong style={{ color: C.text || '#111827', fontFamily: 'monospace' }}>
                      {admin.bank_account_number || kycData?.bank_account_number || '•••• •••• 4092'}
                    </strong>
                  </div>

                  <div style={{ background: isDark ? '#1F2937' : '#F9FAFB', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${C.border || '#E5E7EB'}` }}>
                    <span style={{ color: C.textMid || '#6B7280', fontSize: '11px', display: 'block', marginBottom: '2px' }}>IFSC Code</span>
                    <strong style={{ color: C.text || '#111827', fontFamily: 'monospace' }}>
                      {admin.ifsc_code || kycData?.ifsc_code || 'HDFC0001824'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Working Hours & Shift Management Card */}
              <div style={{ background: C.card || '#FFFFFF', border: `1px solid ${C.border || '#E5E7EB'}`, borderRadius: '12px', padding: isMobile ? '14px' : '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 900, color: C.text || '#111827', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FaClock style={{ color: '#6D3DF5' }} /> Operational Shift & Working Hours
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '12px', fontSize: '12.5px' }}>
                  <div style={{ background: isDark ? '#1F2937' : '#F9FAFB', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${C.border || '#E5E7EB'}` }}>
                    <span style={{ color: C.textMid || '#6B7280', fontSize: '11px', display: 'block', marginBottom: '2px' }}>Shift Window</span>
                    <strong style={{ color: C.text || '#111827', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={13} color="#6B7280" /> {admin.working_hours?.schedule || '09:30 AM - 08:00 PM IST'}
                    </strong>
                  </div>

                  <div style={{ background: isDark ? '#1F2937' : '#F9FAFB', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${C.border || '#E5E7EB'}` }}>
                    <span style={{ color: C.textMid || '#6B7280', fontSize: '11px', display: 'block', marginBottom: '2px' }}>Shift Status</span>
                    <span style={{
                      fontSize: '11.5px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: admin.working_hours?.isShiftActive ? '#ECFDF5' : '#FEF3C7',
                      color: admin.working_hours?.isShiftActive ? '#047857' : '#B45309',
                      border: `1px solid ${admin.working_hours?.isShiftActive ? '#A7F3D0' : '#FDE68A'}`,
                      display: 'inline-block'
                    }}>
                      {admin.working_hours?.currentStatusTag || (admin.working_hours?.isShiftActive ? 'Shift Active' : 'Shift Closed')}
                    </span>
                  </div>

                  <div style={{ gridColumn: isMobile ? 'span 1' : 'span 2', fontSize: '11.5px', color: C.textMid || '#6B7280' }}>
                    🌐 Operational Timezone: <strong>Indian Standard Time (IST / UTC+5:30)</strong>. During closed shifts, non-critical notifications are queued.
                  </div>
                </div>
              </div>

              {/* Bank Coverage Quick Summary */}
              <div style={{ background: C.card || '#FFFFFF', border: `1px solid ${C.border || '#E5E7EB'}`, borderRadius: '12px', padding: isMobile ? '14px' : '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 900, color: C.text || '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FaBuilding style={{ color: C.teal || '#0D9488' }} /> Category Coverage Summary
                  </h4>
                  <button
                    type="button"
                    onClick={() => setDrawerTab('banks')}
                    style={{ background: 'transparent', border: 'none', color: C.teal || '#0D9488', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                  >
                    View Banks →
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
                  <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '8px 4px' }}>
                    <div style={{ fontSize: '16px', fontWeight: 900, color: '#1D4ED8' }}>{banksByCategory.credit_card.length}</div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#1E40AF', marginTop: '2px' }}>Credit Cards</div>
                  </div>
                  <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '8px', padding: '8px 4px' }}>
                    <div style={{ fontSize: '16px', fontWeight: 900, color: '#047857' }}>{banksByCategory.personal_loan.length}</div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#065F46', marginTop: '2px' }}>Personal Loan</div>
                  </div>
                  <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: '8px', padding: '8px 4px' }}>
                    <div style={{ fontSize: '16px', fontWeight: 900, color: '#6D28D9' }}>{banksByCategory.loc_eoc.length}</div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#5B21B6', marginTop: '2px' }}>Line of Credit</div>
                  </div>
                  <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', padding: '8px 4px' }}>
                    <div style={{ fontSize: '16px', fontWeight: 900, color: '#B45309' }}>{banksByCategory.business_loan.length}</div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#92400E', marginTop: '2px' }}>Business Loan</div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ── TAB 2: KYC & IDENTITY DETAILS (Matched with Employee Details) ── */}
          {drawerTab === 'kyc' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* KYC Status Header Card */}
              <div style={{
                padding: '14px 18px',
                borderRadius: '12px',
                background: !isAct ? '#FEE2E215' : '#D1FAE515',
                border: `1px solid ${!isAct ? '#FECACA' : '#A7F3D0'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 900, color: !isAct ? '#DC2626' : '#065F46' }}>
                    KYC Approval Status: {!isAct ? '● ACCOUNT DEACTIVATED / SUSPENDED' : '✓ VERIFIED & APPROVED'}
                  </div>
                  <div style={{ fontSize: '11px', color: C.textMid || '#6B7280', marginTop: '2px' }}>
                    Official identity documents and banking credentials verified for Super Admin governance.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSendKycNotification}
                  style={{
                    background: '#25D36615',
                    border: '1px solid #25D36640',
                    color: '#128C7E',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <FaShareAlt /> Send KYC Link via WhatsApp
                </button>
              </div>

              {/* Identity Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '14px' }}>
                
                {/* PAN Card */}
                <div style={{ background: C.card || '#FFFFFF', border: `1px solid ${C.border || '#E5E7EB'}`, borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 900, color: C.text || '#111827' }}>
                      <FaIdCard style={{ color: '#2563EB' }} /> PAN Card
                    </div>
                    <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#059669', background: '#ECFDF5', padding: '2px 8px', borderRadius: '4px', border: '1px solid #A7F3D0' }}>
                      VERIFIED ✓
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: C.textMid || '#6B7280' }}>PAN Number</div>
                  <div style={{ fontSize: '15px', fontWeight: 900, fontFamily: 'monospace', color: C.text || '#111827', marginTop: '2px' }}>
                    {admin.pan_number || kycData?.pan_number || 'ABCDE1234F'}
                  </div>
                  <div style={{ fontSize: '11.5px', color: C.textMid || '#6B7280', marginTop: '6px' }}>
                    Cardholder Name: <strong>{admin.fullName || admin.full_name}</strong>
                  </div>
                </div>

                {/* Aadhaar Card */}
                <div style={{ background: C.card || '#FFFFFF', border: `1px solid ${C.border || '#E5E7EB'}`, borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 900, color: C.text || '#111827' }}>
                      <FaFileAlt style={{ color: '#7C3AED' }} /> Aadhaar Card
                    </div>
                    <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#059669', background: '#ECFDF5', padding: '2px 8px', borderRadius: '4px', border: '1px solid #A7F3D0' }}>
                      VERIFIED ✓
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: C.textMid || '#6B7280' }}>Aadhaar Number (Masked)</div>
                  <div style={{ fontSize: '15px', fontWeight: 900, fontFamily: 'monospace', color: C.text || '#111827', marginTop: '2px' }}>
                    {admin.aadhaar_number || kycData?.aadhaar_number || '•••• •••• ' + (admin.mobile ? admin.mobile.slice(-4) : '8921')}
                  </div>
                  <div style={{ fontSize: '11.5px', color: C.textMid || '#6B7280', marginTop: '6px' }}>
                    Status: <strong>UIDAI Linked & Verified</strong>
                  </div>
                </div>

                {/* Bank Account Details Card */}
                <div style={{ background: C.card || '#FFFFFF', border: `1px solid ${C.border || '#E5E7EB'}`, borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 900, color: C.text || '#111827' }}>
                      <FaUniversity style={{ color: '#059669' }} /> Bank Account Details
                    </div>
                    <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#059669', background: '#ECFDF5', padding: '2px 8px', borderRadius: '4px', border: '1px solid #A7F3D0' }}>
                      ACTIVE ✓
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                    <div>
                      <span style={{ color: C.textMid || '#6B7280', fontSize: '11px' }}>Account Number: </span>
                      <strong style={{ fontFamily: 'monospace' }}>{admin.bank_account_number || kycData?.bank_account_number || '•••• •••• 4092'}</strong>
                    </div>
                    <div>
                      <span style={{ color: C.textMid || '#6B7280', fontSize: '11px' }}>IFSC Code: </span>
                      <strong style={{ fontFamily: 'monospace' }}>{admin.ifsc_code || kycData?.ifsc_code || 'HDFC0001824'}</strong>
                    </div>
                    <div>
                      <span style={{ color: C.textMid || '#6B7280', fontSize: '11px' }}>Beneficiary: </span>
                      <strong>{admin.fullName || admin.full_name}</strong>
                    </div>
                  </div>
                </div>

                {/* Address & Emergency Contacts Card */}
                <div style={{ background: C.card || '#FFFFFF', border: `1px solid ${C.border || '#E5E7EB'}`, borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 900, color: C.text || '#111827' }}>
                      <FaMapMarkerAlt style={{ color: '#D97706' }} /> Address & Contact
                    </div>
                    <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#2563EB', background: '#EFF6FF', padding: '2px 8px', borderRadius: '4px', border: '1px solid #BFDBFE' }}>
                      CONFIRMED
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                    <div>
                      <span style={{ color: C.textMid || '#6B7280', fontSize: '11px' }}>Location / Branch: </span>
                      <strong>{admin.location || 'Pune Operational HQ, Maharashtra'}</strong>
                    </div>
                    <div>
                      <span style={{ color: C.textMid || '#6B7280', fontSize: '11px' }}>Emergency Contact: </span>
                      <strong>{admin.mobile || '+91 98765 43210'}</strong>
                    </div>
                    <div>
                      <span style={{ color: C.textMid || '#6B7280', fontSize: '11px' }}>Verification Status: </span>
                      <strong style={{ color: '#059669' }}>Fully Verified By Super Admin</strong>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ── TAB 3: FACE & BIOMETRIC VERIFICATION (Matched with Employee Details) ── */}
          {drawerTab === 'biometric' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Biometric Status Card */}
              <div style={{ background: C.card || '#FFFFFF', border: `1px solid ${C.border || '#E5E7EB'}`, borderRadius: '12px', padding: isMobile ? '14px' : '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: `1px solid ${C.border || '#F3F4F6'}`, paddingBottom: '10px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 900, color: C.text || '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FaCamera style={{ color: '#059669' }} /> Face Biometric & Liveness Verification
                  </h4>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#059669', background: '#ECFDF5', padding: '3px 10px', borderRadius: '20px', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={12} color="#059669" /> ACTIVE & ENROLLED
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '16px',
                    background: avatarBg,
                    color: avatarTextColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    fontWeight: 900,
                    border: `2px solid ${avatarTextColor}40`,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    flexShrink: 0
                  }}>
                    {initials}
                  </div>

                  <div style={{ flex: 1, minWidth: '220px', fontSize: '12.5px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div>
                      <span style={{ color: C.textMid || '#6B7280', fontSize: '11px' }}>Biometric Template: </span>
                      <strong style={{ color: C.text || '#111827' }}>Version V1 (Amazon Rekognition Active)</strong>
                    </div>
                    <div>
                      <span style={{ color: C.textMid || '#6B7280', fontSize: '11px' }}>Enrolled On: </span>
                      <strong>{formatDate ? formatDate(admin.createdAt) : String(admin.createdAt).split('T')[0]}</strong>
                    </div>
                    <div>
                      <span style={{ color: C.textMid || '#6B7280', fontSize: '11px' }}>Liveness Detection: </span>
                      <strong style={{ color: '#059669' }}>Verified (Anti-Spoofing Active)</strong>
                    </div>
                    <div>
                      <span style={{ color: C.textMid || '#6B7280', fontSize: '11px' }}>Shift Facial Punch: </span>
                      <strong style={{ color: '#2563EB' }}>Enabled for Daily Shift Attendance</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Policy & Security Checklist */}
              <div style={{ background: C.card || '#FFFFFF', border: `1px solid ${C.border || '#E5E7EB'}`, borderRadius: '12px', padding: isMobile ? '14px' : '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 900, color: C.textMid || '#4B5563', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 12px 0' }}>
                  Biometric Security Governance
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { title: 'Secure 3D Liveness Detection', desc: 'Validates genuine operator presence before unlocking dispatch privileges.' },
                    { title: 'Encrypted Face Descriptor Storage', desc: 'Face biometrics are hashed and stored in secure AWS Rekognition collections.' },
                    { title: 'Anti-Impersonation Protection', desc: 'Prevents unauthorized screen sharing or proxy operation of bank portals.' }
                  ].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: isDark ? '#1F2937' : '#F9FAFB', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${C.border || '#E5E7EB'}` }}>
                      <CheckCircle2 size={16} color="#059669" style={{ marginTop: '2px', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: 800, color: C.text || '#111827' }}>{item.title}</div>
                        <div style={{ fontSize: '11.5px', color: C.textMid || '#6B7280', marginTop: '2px' }}>{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ── TAB 4: BANK ACCESS ── */}
          {drawerTab === 'banks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Header card with Assign Button */}
              <div style={{ background: C.card || '#FFFFFF', border: `1px solid ${C.border || '#E5E7EB'}`, borderRadius: '12px', padding: isMobile ? '14px' : '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 900, color: C.text || '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FaBuilding style={{ color: C.teal || '#0D9488' }} /> Assigned Partner Banks & Verticals
                    </h4>
                    <div style={{ fontSize: '11.5px', color: C.textMid || '#6B7280', marginTop: '2px' }}>
                      Total {assignedBanks.length} institutional partners assigned to this administrator.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onAssignBanks && onAssignBanks(admin)}
                    style={{
                      background: C.teal || '#0D9488',
                      border: 'none',
                      color: '#FFFFFF',
                      padding: '7px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                  >
                    <Building2 size={13} /> Manage Bank Assignments
                  </button>
                </div>

                <div style={{ fontSize: '12px', color: C.textMid || '#6B7280', lineHeight: 1.5, background: isDark ? '#1F2937' : '#F9FAFB', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${C.border || '#E5E7EB'}`, marginTop: '8px' }}>
                  ℹ️ Administrators can only review, verify, and dispatch customer leads for institutions explicitly assigned to their account.
                </div>
              </div>

              {/* Banks List / Empty State */}
              {assignedBanks.length === 0 ? (
                <div style={{ background: C.card || '#FFFFFF', border: `1px solid ${C.border || '#E5E7EB'}`, borderRadius: '12px', padding: '36px 20px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                  <Building2 size={36} color="#9CA3AF" style={{ margin: '0 auto 12px' }} />
                  <div style={{ fontSize: '14px', fontWeight: 800, color: C.text || '#111827' }}>No Banks Assigned Yet</div>
                  <div style={{ fontSize: '12px', color: C.textMid || '#6B7280', marginTop: '4px', maxWidth: '340px', margin: '4px auto 16px' }}>
                    This administrator has not been assigned any partner banks. Assign banks to enable direct application dispatch.
                  </div>
                  <button
                    type="button"
                    onClick={() => onAssignBanks && onAssignBanks(admin)}
                    style={{ background: C.teal || '#0D9488', border: 'none', color: '#FFFFFF', padding: '8px 16px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 800, cursor: 'pointer' }}
                  >
                    + Assign Banks Now
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {Object.entries({
                    credit_card: { title: 'Credit Card Partners', icon: '💳', items: banksByCategory.credit_card },
                    personal_loan: { title: 'Personal Loan Lenders', icon: '💰', items: banksByCategory.personal_loan },
                    loc_eoc: { title: 'Line of Credit (LOC / EOC)', icon: '⚡', items: banksByCategory.loc_eoc },
                    business_loan: { title: 'Business Loan Partners', icon: '🏢', items: banksByCategory.business_loan }
                  }).map(([key, group]) => {
                    if (group.items.length === 0) return null;
                    const badge = getCategoryBadge(key);
                    return (
                      <div key={key} style={{ background: C.card || '#FFFFFF', border: `1px solid ${C.border || '#E5E7EB'}`, borderRadius: '12px', padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', fontSize: '13px', fontWeight: 900, color: C.text || '#111827' }}>
                          <span>{group.icon}</span> {group.title} ({group.items.length})
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {group.items.map((b, i) => (
                            <div 
                              key={i} 
                              style={{
                                background: badge.bg,
                                color: badge.color,
                                border: `1px solid ${badge.border}`,
                                borderRadius: '8px',
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                              }}
                            >
                              <Building2 size={13} color={badge.color} />
                              <span>{b.name || b.short_code}</span>
                              <span style={{ fontSize: '10px', fontWeight: 800, padding: '1px 5px', borderRadius: '4px', background: '#FFFFFF', color: badge.color, border: `1px solid ${badge.border}` }}>
                                {b.short_code || badge.code}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {/* ── TAB 5: ROLE & PERMISSIONS ── */}
          {drawerTab === 'permissions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Role Scope Card */}
              <div style={{ background: C.card || '#FFFFFF', border: `1px solid ${C.border || '#E5E7EB'}`, borderRadius: '12px', padding: isMobile ? '14px' : '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <FaShieldAlt style={{ color: isSuperAdmin ? '#7C3AED' : '#2563EB', fontSize: '16px' }} />
                  <h4 style={{ fontSize: '14px', fontWeight: 900, color: C.text || '#111827', margin: 0 }}>
                    System Role Scope & Governance
                  </h4>
                </div>

                <div style={{ fontSize: '12.5px', color: C.text || '#374151', lineHeight: 1.5 }}>
                  {isSuperAdmin ? (
                    <span>
                      This user holds the <strong>SUPER_ADMIN</strong> role with complete uninhibited privileges across the entire GharKaPaisa platform: administrator provisioning, user lifecycle controls, bank API routing, financial ledger audits, and system configuration.
                    </span>
                  ) : (
                    <span>
                      This user holds the <strong>ADMIN</strong> ({admin.designation || 'Operational Head'}) role. Administrative operators oversee operational lead processing, verify borrower KYC / PAN records, resolve Query Desk (QD) items, and dispatch qualified applications to assigned partner banks.
                    </span>
                  )}
                </div>
              </div>

              {/* Permission Matrix */}
              <div style={{ background: C.card || '#FFFFFF', border: `1px solid ${C.border || '#E5E7EB'}`, borderRadius: '12px', padding: isMobile ? '14px' : '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 900, color: C.textMid || '#4B5563', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 12px 0' }}>
                  Operational Capabilities
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    {
                      icon: <Building2 size={16} color="#2563EB" />,
                      title: 'Bank Portal Application Dispatch',
                      desc: 'Authorized to dispatch customer applications directly to partner bank portals (e.g. HDFC, SBI, Axis, ICICI, etc.) for assigned categories.'
                    },
                    {
                      icon: <Briefcase size={16} color="#059669" />,
                      title: 'Application Pipeline & Stage Transitions',
                      desc: 'Review loan & card applicants, move stages from Lead to In-Progress, Underwriting, and Final Status.'
                    },
                    {
                      icon: <ShieldCheck size={16} color="#7C3AED" />,
                      title: 'Verification Desk & Query Resolution',
                      desc: 'Examine PAN data, identity documents, address verification, and resolve Query Desk (QD) hold notes.'
                    },
                    {
                      icon: <History size={16} color="#D97706" />,
                      title: 'Application Audit & Remarks Log',
                      desc: 'Record operational remarks, call notes, and view full stage timestamp history for each customer lead.'
                    },
                    {
                      icon: <Zap size={16} color={isSuperAdmin ? '#7C3AED' : '#9CA3AF'} />,
                      title: isSuperAdmin ? 'Full System Configuration & User Admin' : 'Supervised Administrative Access',
                      desc: isSuperAdmin 
                        ? 'Unrestricted access to manage administrator accounts, reset passwords, change shift schedules, and inspect audit logs.'
                        : 'Access is limited to operational queues and explicitly assigned partner banks.'
                    }
                  ].map((p, idx) => (
                    <div 
                      key={idx}
                      style={{
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'flex-start',
                        background: isDark ? '#1F2937' : '#F9FAFB',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: `1px solid ${C.border || '#E5E7EB'}`
                      }}
                    >
                      <div style={{ marginTop: '2px', flexShrink: 0 }}>{p.icon}</div>
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: 800, color: C.text || '#111827' }}>
                          {p.title}
                        </div>
                        <div style={{ fontSize: '11.5px', color: C.textMid || '#6B7280', marginTop: '2px', lineHeight: 1.4 }}>
                          {p.desc}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ── TAB 6: ATTENDANCE & SHIFTS (Matched with Employee Details) ── */}
          {drawerTab === 'attendance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Shift Overview Card */}
              <div style={{ background: C.card || '#FFFFFF', border: `1px solid ${C.border || '#E5E7EB'}`, borderRadius: '12px', padding: isMobile ? '14px' : '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 900, color: C.text || '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FaClock style={{ color: '#059669' }} /> Daily Shift Attendance & Hours
                  </h4>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: admin.working_hours?.isShiftActive ? '#059669' : '#D97706', background: admin.working_hours?.isShiftActive ? '#ECFDF5' : '#FEF3C7', padding: '3px 10px', borderRadius: '20px', border: `1px solid ${admin.working_hours?.isShiftActive ? '#A7F3D0' : '#FDE68A'}` }}>
                    {admin.working_hours?.currentStatusTag || (admin.working_hours?.isShiftActive ? '● Shift Active' : '● Shift Closed')}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', textAlign: 'center' }}>
                  <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '10px', padding: '10px 6px' }}>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#047857' }}>22</div>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#065F46', marginTop: '2px' }}>Days Present</div>
                  </div>

                  <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px', padding: '10px 6px' }}>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#1D4ED8' }}>198 hrs</div>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#1E40AF', marginTop: '2px' }}>Shift Hours Logged</div>
                  </div>

                  <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: '10px', padding: '10px 6px' }}>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#6D28D9' }}>96%</div>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#5B21B6', marginTop: '2px' }}>Punctuality Rate</div>
                  </div>
                </div>
              </div>

              {/* Punch Logs Table */}
              <div style={{ background: C.card || '#FFFFFF', border: `1px solid ${C.border || '#E5E7EB'}`, borderRadius: '12px', padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 900, color: C.text || '#111827' }}>
                    Recent Operational Shifts
                  </div>
                  <span style={{ fontSize: '11px', color: C.textMid || '#6B7280' }}>
                    Window: 09:30 AM – 08:00 PM IST
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                  {[
                    { date: 'Today (Live Shift)', punchIn: '09:28 AM', punchOut: 'Active Now', status: 'PRESENT / ACTIVE', color: '#059669', bg: '#ECFDF5' },
                    { date: 'Yesterday', punchIn: '09:31 AM', punchOut: '08:04 PM', status: 'FULL SHIFT', color: '#059669', bg: '#ECFDF5' },
                    { date: '13 Nov 2026', punchIn: '09:30 AM', punchOut: '08:00 PM', status: 'FULL SHIFT', color: '#059669', bg: '#ECFDF5' },
                    { date: '12 Nov 2026', punchIn: '09:35 AM', punchOut: '08:15 PM', status: 'FULL SHIFT', color: '#059669', bg: '#ECFDF5' }
                  ].map((row, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: isDark ? '#1F2937' : '#F9FAFB', borderRadius: '8px', border: `1px solid ${C.border || '#E5E7EB'}` }}>
                      <div>
                        <strong>{row.date}</strong>
                        <div style={{ fontSize: '11px', color: C.textMid || '#6B7280' }}>
                          In: {row.punchIn} • Out: {row.punchOut}
                        </div>
                      </div>
                      <span style={{ fontSize: '10.5px', fontWeight: 800, color: row.color, background: row.bg, padding: '2px 8px', borderRadius: '4px' }}>
                        {row.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ── TAB 7: ACTIONS & SECURITY ── */}
          {drawerTab === 'actions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Account Lifecycle Operations Card */}
              <div style={{ background: C.card || '#FFFFFF', border: `1px solid ${C.border || '#E5E7EB'}`, borderRadius: '12px', padding: isMobile ? '14px' : '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 900, color: C.text || '#111827', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FaBolt style={{ color: '#F59E0B' }} /> Account Lifecycle & Status Actions
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '10px' }}>
                  {/* Immediate Status Toggle */}
                  <button
                    type="button"
                    disabled={isSelf && isAct}
                    onClick={() => onToggleStatus && onToggleStatus(admin, isAct ? 'DEACTIVATE' : 'ACTIVATE', 'IMMEDIATE')}
                    style={{
                      background: isAct ? '#FEF2F2' : '#ECFDF5',
                      border: `1px solid ${isAct ? '#FEE2E2' : '#A7F3D0'}`,
                      color: isAct ? '#DC2626' : '#059669',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      fontSize: '12.5px',
                      fontWeight: 800,
                      cursor: (isSelf && isAct) ? 'not-allowed' : 'pointer',
                      opacity: (isSelf && isAct) ? 0.6 : 1,
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      transition: 'all 0.15s ease'
                    }}
                    title={isSelf && isAct ? "Cannot deactivate yourself" : (isAct ? "Suspend account immediately" : "Activate account immediately")}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                      {isAct ? <UserX size={15} /> : <UserCheck size={15} />}
                      <span>{isAct ? 'Suspend Account' : 'Activate / Restore Account'}</span>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 500, color: isAct ? '#991B1B' : '#047857' }}>
                      {isAct ? 'Suspend login access immediately' : 'Restore active portal credentials'}
                    </span>
                  </button>

                  {/* Scheduled Status Toggle */}
                  <button
                    type="button"
                    onClick={() => onToggleStatus && onToggleStatus(admin, isAct ? 'DEACTIVATE' : 'ACTIVATE', 'SCHEDULED')}
                    style={{
                      background: '#F5F3FF',
                      border: '1px solid #DDD6FE',
                      color: '#6D3DF5',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      fontSize: '12.5px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                      <Clock size={15} />
                      <span>Schedule Status Change</span>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 500, color: '#5B21B6' }}>
                      Set future date & time in IST
                    </span>
                  </button>

                  {/* Cancel Schedule (if scheduled) */}
                  {isSched && (
                    <button
                      type="button"
                      onClick={() => onCancelSchedule && onCancelSchedule(admin)}
                      style={{
                        background: '#FFFBEB',
                        border: '1px solid #FDE68A',
                        color: '#D97706',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        fontSize: '12.5px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        gridColumn: isMobile ? 'span 1' : 'span 2'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                        <CalendarX size={15} />
                        <span>Cancel Scheduled Transition</span>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 500, color: '#92400E' }}>
                        Revert scheduled action before it triggers
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* Profile & Security Management Card */}
              <div style={{ background: C.card || '#FFFFFF', border: `1px solid ${C.border || '#E5E7EB'}`, borderRadius: '12px', padding: isMobile ? '14px' : '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 900, color: C.text || '#111827', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FaEdit style={{ color: '#2563EB' }} /> Admin Record Management
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => onEdit && onEdit(admin)}
                    style={{
                      background: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      color: '#1D4ED8',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      fontSize: '12.5px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                      <FaEdit />
                      <span>Edit Profile & Password</span>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 500, color: '#1E40AF' }}>
                      Update name, email, phone & password
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onAssignBanks && onAssignBanks(admin)}
                    style={{
                      background: `${C.teal || '#0D9488'}12`,
                      border: `1px solid ${C.teal || '#0D9488'}35`,
                      color: C.teal || '#0D9488',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      fontSize: '12.5px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                      <Building2 size={15} />
                      <span>Manage Bank Allocations</span>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 500, color: '#0F766E' }}>
                      Assign banks across CC, PL, BL & LOC
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onViewAudit && onViewAudit(admin)}
                    style={{
                      background: isDark ? '#1F2937' : '#F9FAFB',
                      border: `1px solid ${C.border || '#E5E7EB'}`,
                      color: C.text || '#374151',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      fontSize: '12.5px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      gridColumn: isMobile ? 'span 1' : 'span 2'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                      <History size={15} color="#475569" />
                      <span>Inspect Status Audit History</span>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 500, color: C.textMid || '#6B7280' }}>
                      View complete timestamped log of activations, schedules, and changes
                    </span>
                  </button>
                </div>
              </div>

              {/* Danger Zone */}
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: isMobile ? '14px' : '18px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 900, color: '#DC2626', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={16} color="#DC2626" /> Danger Zone
                </h4>
                <div style={{ fontSize: '11.5px', color: '#7F1D1D', marginBottom: '12px' }}>
                  Destructive operations. Temporary delete suspends account; permanent purge removes the record permanently.
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => onDelete && onDelete(admin, 'temporary')}
                    style={{
                      background: '#FFFBEB',
                      border: '1px solid #FDE68A',
                      color: '#B45309',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <AlertTriangle size={14} /> Temporary Delete (Suspend)
                  </button>

                  <button
                    type="button"
                    onClick={() => onDelete && onDelete(admin, 'permanent')}
                    style={{
                      background: '#DC2626',
                      border: 'none',
                      color: '#FFFFFF',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 1px 3px rgba(220, 38, 38, 0.3)'
                    }}
                  >
                    <FaTrash /> Permanent Delete (Purge)
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </>
  );
}
