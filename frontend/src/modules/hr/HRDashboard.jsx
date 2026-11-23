import React, { useCallback, useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuthStore } from '../../app/store/authStore';
import { 
  FaUsers, FaUserCheck, FaClock, FaTimesCircle, FaSearch, 
  FaFilter, FaStar, FaUserPlus, FaFileAlt, FaCheckCircle, FaPhone, FaEnvelope,
  FaUserShield, FaTrash, FaBan, FaCheck, FaSync, FaEye, FaIdCard, FaTimes,
  FaArrowRight
} from 'react-icons/fa';
import api from '../../services/api';
import FaqAccordion from '../../components/FaqAccordion';

const MONO_FONT = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";

export default function HRDashboard() {
  const { C } = useTheme();
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  
  // Tab state: 'candidates' or 'hr_team'
  const [activeTab, setActiveTab] = useState('candidates');

  // Candidate state
  const [candidates, setCandidates] = useState([]);
  const [stats, setStats] = useState({
    total_candidates: 0,
    registered: 0,
    interview_pending: 0,
    selected: 0,
    rejected: 0,
    converted: 0
  });
  const [candLoading, setCandLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // HR Accounts state
  const [hrAccounts, setHrAccounts] = useState([]);
  const [hrLoading, setHrLoading] = useState(true);
  const [hrSearchTerm, setHrSearchTerm] = useState('');

  // Selected candidate modal state
  const [viewCandModal, setViewCandModal] = useState(null);
  const [selectedCandModal, setSelectedCandModal] = useState(null);
  const [interviewModal, setInterviewModal] = useState(null);
  
  const [selectionForm, setSelectionForm] = useState({
    offered_salary: '',
    offered_designation: 'Sales Executive',
    offered_department: 'Sales & Distribution',
    expected_joining_date: ''
  });

  const [feedbackForm, setFeedbackForm] = useState({
    interview_status: 'SELECTED',
    interview_rating: 4,
    interview_feedback: ''
  });

  // Create HR Account modal state
  const [createHRModalOpen, setCreateHRModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [hrForm, setHrForm] = useState({
    fullName: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    designation: 'HR Manager',
    department: 'Human Resources'
  });

  // Fetch HR Accounts list from SuperAdmin API
  const fetchHRAccounts = useCallback(async () => {
    setHrLoading(true);
    try {
      const res = await api.get('/superadmin/admins?role=HR');
      if (res.data && res.data.success) {
        setHrAccounts(res.data.data || []);
      }
    } catch (err) {
      console.error('Fetch HR accounts error:', err);
    } finally {
      setHrLoading(false);
    }
  }, []);

  // Fetch Candidates and Candidate Stats
  const fetchHRData = useCallback(async () => {
    setCandLoading(true);
    try {
      const statsRes = await api.get('/hr/candidates/stats');
      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }

      const candRes = await api.get('/hr/candidates', {
        params: { status: statusFilter, search: searchTerm }
      });
      if (candRes.data.success) {
        setCandidates(candRes.data.data);
      }
    } catch (err) {
      console.error('HR Dashboard fetch error:', err);
    } finally {
      setCandLoading(false);
    }
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    fetchHRData();
  }, [fetchHRData]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchHRAccounts();
    }
  }, [isSuperAdmin, fetchHRAccounts]);

  // Handle HR Account creation
  const handleCreateHRSubmit = async (e) => {
    e.preventDefault();
    if (hrForm.password !== hrForm.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    setCreateLoading(true);
    try {
      const res = await api.post('/superadmin/create-admin', {
        ...hrForm,
        role: 'HR'
      });
      if (res.data && res.data.success) {
        alert(`HR Account Created Successfully!\nName: ${hrForm.fullName}\nEmail: ${hrForm.email}`);
        setCreateHRModalOpen(false);
        setHrForm({
          fullName: '',
          email: '',
          mobile: '',
          password: '',
          confirmPassword: '',
          designation: 'HR Manager',
          department: 'Human Resources'
        });
        fetchHRAccounts();
        setActiveTab('hr_team');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create HR account');
    } finally {
      setCreateLoading(false);
    }
  };

  // Toggle HR block/suspend status
  const handleToggleHRBlock = async (userId, currentStatus) => {
    const shouldBlock = currentStatus === 'active';
    const actionLabel = shouldBlock ? 'suspend' : 'activate';
    
    if (!window.confirm(`Are you sure you want to ${actionLabel} this HR Account?`)) {
      return;
    }

    try {
      const res = await api.post('/superadmin/block-user', {
        userId,
        block: shouldBlock
      });
      if (res.data && res.data.success) {
        fetchHRAccounts();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    }
  };

  // Delete HR Account
  const handleDeleteHRAccount = async (userId) => {
    if (!window.confirm('Are you sure you want to PERMANENTLY delete this HR Manager account?')) {
      return;
    }

    try {
      const res = await api.delete(`/superadmin/admins/${userId}`);
      if (res.data && res.data.success) {
        alert('HR Account deleted successfully.');
        fetchHRAccounts();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleOpenSelectModal = (cand) => {
    setSelectedCandModal(cand);
    setSelectionForm({
      offered_salary: cand.offered_salary || cand.expected_salary || '',
      offered_designation: cand.offered_designation || cand.target_role || 'Sales Executive',
      offered_department: cand.offered_department || 'Sales & Distribution',
      expected_joining_date: cand.expected_joining_date ? String(cand.expected_joining_date).split('T')[0] : ''
    });
  };

  const handleAssignHR = async (candidateId, hrId) => {
    const hrObj = hrAccounts.find(h => String(h.id || h._id) === String(hrId));
    const hrName = hrObj ? (hrObj.fullName || hrObj.email) : '';
    try {
      const res = await api.post(`/hr/candidates/${candidateId}/assign-hr`, {
        hr_id: hrId || null,
        hr_name: hrName || null
      });
      if (res.data && res.data.success) {
        fetchHRData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign candidate to HR');
    }
  };

  const handleSelectCandidateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCandModal) return;
    try {
      const res = await api.post(`/hr/candidates/${selectedCandModal.id}/select`, selectionForm);
      if (res.data.success) {
        const empId = res.data.data?.employee_id;
        const tempPass = res.data.data?.temp_password;
        alert(`Candidate Selection Confirmed!\n\nEmployee ID: ${empId}\nTemporary Password: ${tempPass}\n\nCredentials dispatched to ${selectedCandModal.full_name}.`);
        setSelectedCandModal(null);
        fetchHRData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Selection failed');
    }
  };

  const handleRejectCandidate = async (cand) => {
    const reason = window.prompt(`Reject candidate ${cand.full_name} (${cand.reference_code})?\n\nEnter reason for rejection:`, 'Not meeting selection criteria');
    if (reason === null) return;
    if (!window.confirm(`Are you sure you want to reject and archive ${cand.full_name}'s application? A formal notification email will be dispatched.`)) return;
    try {
      const res = await api.post(`/hr/candidates/${cand.id}/reject`, { rejection_reason: reason || 'Not meeting selection criteria' });
      if (res.data.success) {
        alert('Candidate record updated and notification email sent.');
        fetchHRData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Rejection failed');
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!interviewModal) return;
    try {
      const res = await api.post(`/hr/candidates/${interviewModal.id}/interview`, feedbackForm);
      if (res.data.success) {
        alert('Interview feedback recorded successfully.');
        setInterviewModal(null);
        fetchHRData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Save failed');
    }
  };

  const filteredHRAccounts = (Array.isArray(hrAccounts) ? hrAccounts : []).filter(hr => {
    if (!hrSearchTerm) return true;
    const term = hrSearchTerm.toLowerCase();
    return (
      (hr.fullName && hr.fullName.toLowerCase().includes(term)) ||
      (hr.email && hr.email.toLowerCase().includes(term)) ||
      (hr.mobile && hr.mobile.includes(term)) ||
      (hr.employeeId && hr.employeeId.toLowerCase().includes(term))
    );
  });

  // Calm semantic status pill mapper
  const renderStatusBadge = (status) => {
    let bg = 'rgba(100, 116, 139, 0.08)';
    let color = '#475569';
    let border = 'rgba(100, 116, 139, 0.2)';
    let label = status || 'REGISTERED';

    if (status === 'SELECTED' || status === 'EMPLOYEE_CREATED') {
      bg = '#ECFDF5';
      color = '#065F46';
      border = '#A7F3D0';
      label = status === 'EMPLOYEE_CREATED' ? 'Onboarded' : 'Selected';
    } else if (status === 'INTERVIEW_PENDING') {
      bg = '#FFFBEB';
      color = '#92400E';
      border = '#FDE68A';
      label = 'Interview Pending';
    } else if (status === 'REJECTED') {
      bg = '#FEF2F2';
      color = '#991B1B';
      border = '#FECACA';
      label = 'Rejected';
    } else if (status === 'REGISTERED') {
      bg = '#EFF6FF';
      color = '#1E40AF';
      border = '#BFDBFE';
      label = 'Registered';
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: 600,
          background: bg,
          color: color,
          border: `1px solid ${border}`,
          whiteSpace: 'nowrap'
        }}
      >
        {label}
      </span>
    );
  };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: '24px 20px 48px', fontFamily: "'Inter', -apple-system, sans-serif", color: C.text }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        
        {/* ── Screen Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: C.textMid, marginBottom: '4px' }}>
              HR Operations &amp; Candidate Acquisition
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: 600, color: C.text, margin: 0, letterSpacing: '-0.01em' }}>
              Candidate Pipeline
            </h1>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button 
              onClick={() => {
                fetchHRData();
                if (isSuperAdmin) fetchHRAccounts();
              }}
              style={{ 
                background: C.card, 
                color: C.text, 
                border: `1px solid ${C.border}`, 
                padding: '7px 12px', 
                borderRadius: '6px', 
                fontSize: '13px', 
                fontWeight: 500, 
                cursor: 'pointer', 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '6px'
              }}
            >
              <FaSync style={{ fontSize: '11px', color: C.textMid }} /> Refresh
            </button>
            {isSuperAdmin && (
              <button 
                onClick={() => setCreateHRModalOpen(true)}
                style={{ 
                  background: C.teal || '#0F766E', 
                  color: '#ffffff', 
                  border: 'none', 
                  padding: '7px 14px', 
                  borderRadius: '6px', 
                  fontSize: '13px', 
                  fontWeight: 600, 
                  cursor: 'pointer', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '6px'
                }}
              >
                <FaUserPlus style={{ fontSize: '12px' }} /> Provision HR Account
              </button>
            )}
          </div>
        </div>

        {/* ── Metric Summary Bar (Quiet Chrome, Tabular Figures) ── */}
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', 
            gap: '8px', 
            marginBottom: '20px' 
          }}
        >
          {[
            { label: 'Applications', count: stats.total_candidates, hint: 'Total registered' },
            { label: 'New Registered', count: stats.registered, hint: 'Initial review' },
            { label: 'Interviewing', count: stats.interview_pending, hint: 'Awaiting review' },
            { label: 'Selected', count: stats.selected, hint: 'Approved offer' },
            { label: 'Rejected', count: stats.rejected, hint: 'Declined' },
            { label: 'Onboarded', count: stats.converted, hint: 'Assigned EMP ID' },
            ...(isSuperAdmin ? [{ label: 'HR Managers', count: hrAccounts.length, hint: 'Active accounts' }] : [])
          ].map((st, i) => (
            <div 
              key={i} 
              style={{ 
                background: C.card, 
                border: `1px solid ${C.border}`, 
                borderRadius: '8px', 
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <span style={{ fontSize: '11px', fontWeight: 500, color: C.textMid }}>
                {st.label}
              </span>
              <div 
                style={{ 
                  fontSize: '20px', 
                  fontWeight: 600, 
                  color: C.text, 
                  fontFamily: MONO_FONT, 
                  fontVariantNumeric: 'tabular-nums',
                  margin: '4px 0 2px' 
                }}
              >
                {st.count}
              </div>
              <span style={{ fontSize: '10px', color: C.textMid, opacity: 0.85 }}>
                {st.hint}
              </span>
            </div>
          ))}
        </div>

        {/* ── Navigation Tabs (Quiet Unterlined Bar) ── */}
        {isSuperAdmin && (
          <div style={{ display: 'flex', gap: '20px', marginBottom: '16px', borderBottom: `1px solid ${C.border}` }}>
            <button 
              onClick={() => setActiveTab('candidates')}
              style={{
                padding: '8px 0 10px',
                fontSize: '13px',
                fontWeight: activeTab === 'candidates' ? 600 : 500,
                color: activeTab === 'candidates' ? (C.teal || '#0F766E') : C.textMid,
                borderBottom: activeTab === 'candidates' ? `2px solid ${C.teal || '#0F766E'}` : '2px solid transparent',
                background: 'transparent',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                cursor: 'pointer',
                marginBottom: '-1px'
              }}
            >
              Candidate Pipeline ({stats.total_candidates})
            </button>
            
            <button 
              onClick={() => setActiveTab('hr_team')}
              style={{
                padding: '8px 0 10px',
                fontSize: '13px',
                fontWeight: activeTab === 'hr_team' ? 600 : 500,
                color: activeTab === 'hr_team' ? (C.teal || '#0F766E') : C.textMid,
                borderBottom: activeTab === 'hr_team' ? `2px solid ${C.teal || '#0F766E'}` : '2px solid transparent',
                background: 'transparent',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                cursor: 'pointer',
                marginBottom: '-1px'
              }}
            >
              HR Personnel Directory ({hrAccounts.length})
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 1: Candidate Applications Pipeline
           ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'candidates' && (
          <>
            {/* Filter & Search Bar */}
            <div 
              style={{ 
                background: C.card, 
                border: `1px solid ${C.border}`, 
                borderRadius: '8px', 
                padding: '12px 14px', 
                marginBottom: '16px', 
                display: 'flex', 
                gap: '12px', 
                flexWrap: 'wrap', 
                alignItems: 'center', 
                justifyContent: 'space-between' 
              }}
            >
              <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
                <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: C.textMid, fontSize: '12px' }} />
                <input 
                  type="text" 
                  placeholder="Search by candidate name, mobile, reference code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '8px 12px 8px 34px', 
                    background: C.bgSecondary, 
                    border: `1px solid ${C.border}`, 
                    borderRadius: '6px', 
                    fontSize: '13px', 
                    color: C.text, 
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: C.textMid, fontWeight: 500 }}>Status:</span>
                <select 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ 
                    padding: '7px 10px', 
                    background: C.bgSecondary, 
                    border: `1px solid ${C.border}`, 
                    borderRadius: '6px', 
                    fontSize: '13px', 
                    color: C.text, 
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">All Applications</option>
                  <option value="REGISTERED">Registered</option>
                  <option value="INTERVIEW_PENDING">Interview Pending</option>
                  <option value="SELECTED">Selected</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="EMPLOYEE_CREATED">Onboarded</option>
                </select>
              </div>
            </div>

            {/* Candidate Table */}
            <div 
              style={{ 
                background: C.card, 
                border: `1px solid ${C.border}`, 
                borderRadius: '8px', 
                overflow: 'hidden' 
              }}
            >
              {candLoading ? (
                <div style={{ padding: '36px', textAlign: 'center', color: C.textMid, fontSize: '13px' }}>
                  Loading candidate directory...
                </div>
              ) : candidates.length === 0 ? (
                <div style={{ padding: '36px', textAlign: 'center', color: C.textMid, fontSize: '13px' }}>
                  No candidate records match the current filter.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: C.bgSecondary, borderBottom: `1px solid ${C.border}`, color: C.textMid, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        <th style={{ padding: '10px 16px', fontWeight: 600 }}>Reference</th>
                        <th style={{ padding: '10px 16px', fontWeight: 600 }}>Candidate</th>
                        <th style={{ padding: '10px 16px', fontWeight: 600 }}>Contact Details</th>
                        <th style={{ padding: '10px 16px', fontWeight: 600 }}>Qualification</th>
                        <th style={{ padding: '10px 16px', fontWeight: 600 }}>Experience</th>
                        {isSuperAdmin && <th style={{ padding: '10px 16px', fontWeight: 600 }}>Assigned HR</th>}
                        <th style={{ padding: '10px 16px', fontWeight: 600 }}>Status</th>
                        <th style={{ padding: '10px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidates.map((cand) => (
                        <tr 
                          key={cand.id} 
                          style={{ borderBottom: `1px solid ${C.border}` }}
                        >
                          <td style={{ padding: '12px 16px', fontFamily: MONO_FONT, fontWeight: 600, color: C.teal || '#0F766E' }}>
                            {cand.reference_code}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 600, color: C.text }}>{cand.full_name}</div>
                            {cand.target_role && (
                              <div style={{ fontSize: '11px', color: C.textMid }}>{cand.target_role}</div>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', color: C.textMid }}>
                            <div style={{ color: C.text, fontFamily: MONO_FONT, fontSize: '12px' }}>{cand.mobile_number}</div>
                            <div style={{ fontSize: '11px' }}>{cand.email_id}</div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div>{cand.highest_qualification || '—'}</div>
                            {cand.passing_year && (
                              <div style={{ fontSize: '11px', color: C.textMid }}>Passout: {cand.passing_year}</div>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div>{cand.experience_type || 'Fresher'}</div>
                            {cand.total_experience_years ? (
                              <div style={{ fontSize: '11px', color: C.textMid }}>{cand.total_experience_years} yrs</div>
                            ) : null}
                          </td>
                          {isSuperAdmin && (
                            <td style={{ padding: '12px 16px' }}>
                              <select
                                value={cand.assigned_hr_id || ''}
                                onChange={(e) => handleAssignHR(cand.id, e.target.value)}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  background: C.bgSecondary,
                                  border: `1px solid ${C.border}`,
                                  color: C.text,
                                  cursor: 'pointer'
                                }}
                              >
                                <option value="">-- Assign HR --</option>
                                {hrAccounts.map((hr) => (
                                  <option key={hr.id || hr._id} value={hr.id || hr._id}>
                                    {hr.fullName || hr.email}
                                  </option>
                                ))}
                              </select>
                            </td>
                          )}
                          <td style={{ padding: '12px 16px' }}>
                            {renderStatusBadge(cand.interview_status)}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                              <button 
                                onClick={() => setViewCandModal(cand)}
                                title="Review candidate file"
                                style={{ 
                                  background: C.bgSecondary, 
                                  color: C.text, 
                                  border: `1px solid ${C.border}`, 
                                  padding: '5px 9px', 
                                  borderRadius: '4px', 
                                  fontSize: '12px', 
                                  fontWeight: 500, 
                                  cursor: 'pointer', 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '4px' 
                                }}
                              >
                                <FaEye style={{ fontSize: '11px', color: C.textMid }} /> Review
                              </button>
                              {!isSuperAdmin && (
                                <button 
                                  onClick={() => setInterviewModal(cand)}
                                  title="Enter interview evaluation"
                                  style={{ 
                                    background: C.card, 
                                    color: C.text, 
                                    border: `1px solid ${C.border}`, 
                                    padding: '5px 9px', 
                                    borderRadius: '4px', 
                                    fontSize: '12px', 
                                    fontWeight: 500, 
                                    cursor: 'pointer', 
                                    display: 'inline-flex', 
                                    alignItems: 'center', 
                                    gap: '4px' 
                                  }}
                                >
                                  <FaStar style={{ fontSize: '11px', color: '#D97706' }} /> Feedback
                                </button>
                              )}
                              {!isSuperAdmin && cand.interview_status !== 'EMPLOYEE_CREATED' && (
                                <button 
                                  onClick={() => handleOpenSelectModal(cand)}
                                  title="Allocate Employee ID and complete onboarding"
                                  style={{ 
                                    background: C.teal || '#0F766E', 
                                    color: '#ffffff', 
                                    border: 'none', 
                                    padding: '5px 10px', 
                                    borderRadius: '4px', 
                                    fontSize: '12px', 
                                    fontWeight: 600, 
                                    cursor: 'pointer', 
                                    display: 'inline-flex', 
                                    alignItems: 'center', 
                                    gap: '4px' 
                                  }}
                                >
                                  <FaUserCheck style={{ fontSize: '11px' }} /> Onboard
                                </button>
                              )}
                              {!isSuperAdmin && (
                                <button 
                                  onClick={() => handleRejectCandidate(cand)}
                                  title="Archive application and dispatch rejection notification"
                                  style={{ 
                                    background: 'transparent', 
                                    color: '#991B1B', 
                                    border: '1px solid rgba(239, 68, 68, 0.3)', 
                                    padding: '5px 8px', 
                                    borderRadius: '4px', 
                                    fontSize: '12px', 
                                    fontWeight: 500, 
                                    cursor: 'pointer', 
                                    display: 'inline-flex', 
                                    alignItems: 'center', 
                                    gap: '4px' 
                                  }}
                                >
                                  <FaTimesCircle style={{ fontSize: '11px' }} /> Reject
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 2: HR Team Personnel Directory (Super Admin)
           ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'hr_team' && (
          <>
            <div 
              style={{ 
                background: C.card, 
                border: `1px solid ${C.border}`, 
                borderRadius: '8px', 
                padding: '12px 14px', 
                marginBottom: '16px', 
                display: 'flex', 
                gap: '16px', 
                alignItems: 'center', 
                justifyContent: 'space-between' 
              }}
            >
              <div style={{ position: 'relative', flex: 1, maxWidth: '360px' }}>
                <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: C.textMid, fontSize: '12px' }} />
                <input 
                  type="text" 
                  placeholder="Filter HR manager by name, email, employee ID..."
                  value={hrSearchTerm}
                  onChange={(e) => setHrSearchTerm(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '8px 12px 8px 34px', 
                    background: C.bgSecondary, 
                    border: `1px solid ${C.border}`, 
                    borderRadius: '6px', 
                    fontSize: '13px', 
                    color: C.text, 
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ fontSize: '12px', color: C.textMid, fontWeight: 500 }}>
                {filteredHRAccounts.length} Active Accounts
              </div>
            </div>

            {/* HR Accounts Table */}
            <div 
              style={{ 
                background: C.card, 
                border: `1px solid ${C.border}`, 
                borderRadius: '8px', 
                overflow: 'hidden' 
              }}
            >
              {hrLoading ? (
                <div style={{ padding: '36px', textAlign: 'center', color: C.textMid, fontSize: '13px' }}>
                  Loading HR directory...
                </div>
              ) : filteredHRAccounts.length === 0 ? (
                <div style={{ padding: '36px', textAlign: 'center', color: C.textMid, fontSize: '13px' }}>
                  <p style={{ margin: '0 0 12px 0' }}>No HR manager accounts found.</p>
                  <button 
                    onClick={() => setCreateHRModalOpen(true)}
                    style={{ background: C.teal, color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    + Provision First HR Account
                  </button>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: C.bgSecondary, borderBottom: `1px solid ${C.border}`, color: C.textMid, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        <th style={{ padding: '10px 16px', fontWeight: 600 }}>HR Manager</th>
                        <th style={{ padding: '10px 16px', fontWeight: 600 }}>Employee ID</th>
                        <th style={{ padding: '10px 16px', fontWeight: 600 }}>Contact Info</th>
                        <th style={{ padding: '10px 16px', fontWeight: 600 }}>Designation / Department</th>
                        <th style={{ padding: '10px 16px', fontWeight: 600 }}>Status</th>
                        <th style={{ padding: '10px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHRAccounts.map((hr) => (
                        <tr key={hr.id || hr._id} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 600, color: C.text }}>{hr.fullName || 'HR Manager'}</div>
                            <span style={{ fontSize: '10px', color: C.textMid, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                              {hr.role}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontFamily: MONO_FONT, fontWeight: 500, color: C.teal }}>
                            {hr.employeeId || '—'}
                          </td>
                          <td style={{ padding: '12px 16px', color: C.textMid }}>
                            <div style={{ color: C.text, fontSize: '12px' }}>{hr.email}</div>
                            <div style={{ fontSize: '11px', fontFamily: MONO_FONT }}>{hr.mobile}</div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div>{hr.designation || 'HR Manager'}</div>
                            <div style={{ fontSize: '11px', color: C.textMid }}>{hr.department || 'Human Resources'}</div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            {hr.status === 'active' || hr.isActive ? (
                              <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' }}>
                                Active
                              </span>
                            ) : (
                              <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA' }}>
                                Suspended
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button 
                                onClick={() => handleToggleHRBlock(hr.id || hr._id, hr.status)}
                                style={{ 
                                  background: C.bgSecondary, 
                                  color: hr.status === 'active' ? '#991B1B' : '#065F46', 
                                  border: `1px solid ${C.border}`, 
                                  padding: '5px 9px', 
                                  borderRadius: '4px', 
                                  fontSize: '12px', 
                                  fontWeight: 500, 
                                  cursor: 'pointer', 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '4px' 
                                }}
                              >
                                {hr.status === 'active' ? <><FaBan style={{ fontSize: '10px' }} /> Suspend</> : <><FaCheck style={{ fontSize: '10px' }} /> Activate</>}
                              </button>
                              <button 
                                onClick={() => handleDeleteHRAccount(hr.id || hr._id)}
                                style={{ 
                                  background: 'transparent', 
                                  color: '#991B1B', 
                                  border: '1px solid rgba(239, 68, 68, 0.3)', 
                                  padding: '5px 9px', 
                                  borderRadius: '4px', 
                                  fontSize: '12px', 
                                  fontWeight: 500, 
                                  cursor: 'pointer', 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '4px' 
                                }}
                              >
                                <FaTrash style={{ fontSize: '10px' }} /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── HR Help & FAQ ── */}
        <div style={{ marginTop: '28px' }}>
          <FaqAccordion categories={['general', 'employee', 'partner', 'credit-cards', 'loans', 'insurance']} title="Help & FAQ" />
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            MODAL 1: Candidate Review Drawer
           ══════════════════════════════════════════════════════════════════ */}
        {viewCandModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
            <div style={{ background: C.card, borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '640px', maxHeight: '88vh', overflowY: 'auto', border: `1px solid ${C.border}`, boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', borderBottom: `1px solid ${C.border}`, paddingBottom: '14px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontFamily: MONO_FONT, fontWeight: 600, color: C.teal || '#0F766E', letterSpacing: '0.02em' }}>
                    {viewCandModal.reference_code}
                  </div>
                  <h2 style={{ fontSize: '18px', fontWeight: 600, color: C.text, margin: '2px 0 0' }}>{viewCandModal.full_name}</h2>
                </div>
                <button 
                  onClick={() => setViewCandModal(null)} 
                  style={{ background: C.bgSecondary, border: `1px solid ${C.border}`, color: C.textMid, width: '30px', height: '30px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <FaTimes style={{ fontSize: '12px' }} />
                </button>
              </div>

              {/* Status Row */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
                {renderStatusBadge(viewCandModal.interview_status)}
                {viewCandModal.employee_id && (
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: C.bgSecondary, color: C.text, border: `1px solid ${C.border}`, fontFamily: MONO_FONT }}>
                    ID: {viewCandModal.employee_id}
                  </span>
                )}
              </div>

              {/* Candidate Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                <div style={{ background: C.bgSecondary, padding: '10px 12px', borderRadius: '6px', border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: '11px', color: C.textMid, fontWeight: 500 }}>Contact</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginTop: '2px', fontFamily: MONO_FONT }}>{viewCandModal.mobile_number}</div>
                  <div style={{ fontSize: '12px', color: C.textMid }}>{viewCandModal.email_id}</div>
                </div>

                <div style={{ background: C.bgSecondary, padding: '10px 12px', borderRadius: '6px', border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: '11px', color: C.textMid, fontWeight: 500 }}>Qualification</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginTop: '2px' }}>{viewCandModal.highest_qualification || '—'}</div>
                  <div style={{ fontSize: '12px', color: C.textMid }}>Passout: {viewCandModal.passing_year || 'N/A'}</div>
                </div>

                <div style={{ background: C.bgSecondary, padding: '10px 12px', borderRadius: '6px', border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: '11px', color: C.textMid, fontWeight: 500 }}>Experience</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginTop: '2px' }}>{viewCandModal.experience_type || 'Fresher'} ({viewCandModal.total_experience_years || 0} yrs)</div>
                  <div style={{ fontSize: '12px', color: C.textMid }}>Company: {viewCandModal.current_company || 'N/A'}</div>
                </div>

                <div style={{ background: C.bgSecondary, padding: '10px 12px', borderRadius: '6px', border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: '11px', color: C.textMid, fontWeight: 500 }}>Salary Expectations</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginTop: '2px', fontFamily: MONO_FONT }}>
                    {viewCandModal.expected_salary ? `₹${Number(viewCandModal.expected_salary).toLocaleString('en-IN')}` : 'Not specified'}
                  </div>
                </div>

                <div style={{ background: C.bgSecondary, padding: '10px 12px', borderRadius: '6px', border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: '11px', color: C.textMid, fontWeight: 500 }}>Joining Availability</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginTop: '2px' }}>
                    {viewCandModal.immediate_joining ? 'Immediate' : `${viewCandModal.notice_period_days || 0} days notice`}
                  </div>
                </div>

                <div style={{ background: C.bgSecondary, padding: '10px 12px', borderRadius: '6px', border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: '11px', color: C.textMid, fontWeight: 500 }}>Address</div>
                  <div style={{ fontSize: '12px', color: C.text, marginTop: '2px' }}>{viewCandModal.current_address || '—'}</div>
                </div>
              </div>

              {/* Offer Terms */}
              <div style={{ background: C.bgSecondary, padding: '12px 14px', borderRadius: '6px', border: `1px solid ${C.border}`, marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: C.textMid, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                  Terms &amp; Allocation
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: C.textMid }}>Offered Compensation:</span>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, fontFamily: MONO_FONT }}>
                      {viewCandModal.offered_salary ? `₹${Number(viewCandModal.offered_salary).toLocaleString('en-IN')}` : 'Pending assignment'}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: C.textMid }}>Designation:</span>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>
                      {viewCandModal.offered_designation || viewCandModal.target_role || 'Sales Executive'}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: C.textMid }}>Assigned HR:</span>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>
                      {viewCandModal.assigned_hr_name || viewCandModal.hr_name || 'Unassigned'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Feedback History */}
              {viewCandModal.interview_feedback && (
                <div style={{ background: C.bgSecondary, padding: '12px 14px', borderRadius: '6px', border: `1px solid ${C.border}`, marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: C.textMid, marginBottom: '4px' }}>Interview Evaluation</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>Rating: {viewCandModal.interview_rating || 0} / 5</div>
                  <div style={{ fontSize: '12px', color: C.textMid, marginTop: '2px', fontStyle: 'italic' }}>
                    "{viewCandModal.interview_feedback}"
                  </div>
                </div>
              )}

              {/* Resume Document Link */}
              {viewCandModal.resume_url && (
                <div style={{ marginBottom: '20px' }}>
                  <a 
                    href={viewCandModal.resume_url} 
                    target="_blank" 
                    rel="noreferrer" 
                    style={{ 
                      background: C.bgSecondary, 
                      color: C.teal || '#0F766E', 
                      border: `1px solid ${C.border}`, 
                      padding: '8px 14px', 
                      borderRadius: '6px', 
                      textDecoration: 'none', 
                      fontSize: '12px', 
                      fontWeight: 600, 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '6px' 
                    }}
                  >
                    <FaFileAlt style={{ fontSize: '12px' }} /> View Candidate Resume
                  </a>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: `1px solid ${C.border}`, paddingTop: '14px' }}>
                <button 
                  onClick={() => setViewCandModal(null)} 
                  style={{ background: C.bgSecondary, border: `1px solid ${C.border}`, color: C.text, padding: '7px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
                >
                  Dismiss
                </button>
                {viewCandModal.interview_status !== 'EMPLOYEE_CREATED' && !isSuperAdmin && (
                  <button 
                    onClick={() => { 
                      const cand = viewCandModal; 
                      setViewCandModal(null); 
                      handleOpenSelectModal(cand); 
                    }} 
                    style={{ background: C.teal || '#0F766E', color: '#fff', border: 'none', padding: '7px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Onboard Candidate
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            MODAL 2: Approve & Allocate Employee ID
           ══════════════════════════════════════════════════════════════════ */}
        {selectedCandModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
            <div style={{ background: C.card, borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '480px', border: `1px solid ${C.border}`, boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', borderBottom: `1px solid ${C.border}`, paddingBottom: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 600, color: C.text, margin: 0 }}>Candidate Selection &amp; Onboarding</h2>
                  <div style={{ fontSize: '12px', color: C.textMid, marginTop: '2px' }}>
                    {selectedCandModal.full_name} ({selectedCandModal.reference_code})
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedCandModal(null)} 
                  style={{ background: C.bgSecondary, border: `1px solid ${C.border}`, color: C.textMid, width: '28px', height: '28px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <FaTimes style={{ fontSize: '11px' }} />
                </button>
              </div>

              <form onSubmit={handleSelectCandidateSubmit}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: C.text, marginBottom: '4px' }}>Offered Monthly Compensation (₹) *</label>
                  <input 
                    type="number" 
                    required 
                    value={selectionForm.offered_salary} 
                    onChange={(e) => setSelectionForm({ ...selectionForm, offered_salary: e.target.value })} 
                    placeholder="e.g. 25000" 
                    style={{ width: '100%', padding: '8px 12px', background: C.bgSecondary, border: `1px solid ${C.border}`, borderRadius: '6px', fontSize: '13px', color: C.text, boxSizing: 'border-box' }} 
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: C.text, marginBottom: '4px' }}>Allocated Designation *</label>
                  <select 
                    value={selectionForm.offered_designation} 
                    onChange={(e) => setSelectionForm({ ...selectionForm, offered_designation: e.target.value })} 
                    style={{ width: '100%', padding: '8px 12px', background: C.bgSecondary, border: `1px solid ${C.border}`, borderRadius: '6px', fontSize: '13px', color: C.text, boxSizing: 'border-box' }}
                  >
                    <option value="TC">Telecaller (TC)</option>
                    <option value="Team Leader">Team Leader</option>
                    <option value="Manager">Manager</option>
                    <option value="Sales Executive">Sales Executive</option>
                  </select>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: C.text, marginBottom: '4px' }}>Department *</label>
                  <input 
                    type="text" 
                    required 
                    value={selectionForm.offered_department} 
                    onChange={(e) => setSelectionForm({ ...selectionForm, offered_department: e.target.value })} 
                    style={{ width: '100%', padding: '8px 12px', background: C.bgSecondary, border: `1px solid ${C.border}`, borderRadius: '6px', fontSize: '13px', color: C.text, boxSizing: 'border-box' }} 
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: C.text, marginBottom: '4px' }}>Expected Date of Joining</label>
                  <input 
                    type="date" 
                    value={selectionForm.expected_joining_date} 
                    onChange={(e) => setSelectionForm({ ...selectionForm, expected_joining_date: e.target.value })} 
                    style={{ width: '100%', padding: '8px 12px', background: C.bgSecondary, border: `1px solid ${C.border}`, borderRadius: '6px', fontSize: '13px', color: C.text, boxSizing: 'border-box' }} 
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: `1px solid ${C.border}`, paddingTop: '14px' }}>
                  <button 
                    type="button" 
                    onClick={() => setSelectedCandModal(null)} 
                    style={{ background: C.bgSecondary, border: `1px solid ${C.border}`, color: C.text, padding: '7px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    style={{ background: C.teal || '#0F766E', color: '#fff', border: 'none', padding: '7px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Allocate EMP ID &amp; Provision
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            MODAL 3: Interview Feedback
           ══════════════════════════════════════════════════════════════════ */}
        {interviewModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
            <div style={{ background: C.card, borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '480px', border: `1px solid ${C.border}`, boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', borderBottom: `1px solid ${C.border}`, paddingBottom: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 600, color: C.text, margin: 0 }}>Interview Evaluation</h2>
                  <div style={{ fontSize: '12px', color: C.textMid, marginTop: '2px' }}>
                    {interviewModal.full_name} ({interviewModal.reference_code})
                  </div>
                </div>
                <button 
                  onClick={() => setInterviewModal(null)} 
                  style={{ background: C.bgSecondary, border: `1px solid ${C.border}`, color: C.textMid, width: '28px', height: '28px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <FaTimes style={{ fontSize: '11px' }} />
                </button>
              </div>

              <form onSubmit={handleFeedbackSubmit}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: C.text, marginBottom: '4px' }}>Evaluation Stage *</label>
                  <select 
                    value={feedbackForm.interview_status} 
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, interview_status: e.target.value })} 
                    style={{ width: '100%', padding: '8px 12px', background: C.bgSecondary, border: `1px solid ${C.border}`, borderRadius: '6px', fontSize: '13px', color: C.text, boxSizing: 'border-box' }}
                  >
                    <option value="REGISTERED">Registered</option>
                    <option value="INTERVIEW_PENDING">Interview Pending</option>
                    <option value="SELECTED">Selected for Offer</option>
                    <option value="REJECTED">Declined / Rejected</option>
                  </select>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: C.text, marginBottom: '4px' }}>Score (1 - 5)</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="5" 
                    value={feedbackForm.interview_rating} 
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, interview_rating: e.target.value })} 
                    style={{ width: '100%', padding: '8px 12px', background: C.bgSecondary, border: `1px solid ${C.border}`, borderRadius: '6px', fontSize: '13px', color: C.text, boxSizing: 'border-box' }} 
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: C.text, marginBottom: '4px' }}>Evaluation Notes</label>
                  <textarea 
                    rows="3" 
                    value={feedbackForm.interview_feedback} 
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, interview_feedback: e.target.value })} 
                    placeholder="Enter interview evaluation notes and candidate observations..." 
                    style={{ width: '100%', padding: '8px 12px', background: C.bgSecondary, border: `1px solid ${C.border}`, borderRadius: '6px', fontSize: '13px', color: C.text, boxSizing: 'border-box' }} 
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: `1px solid ${C.border}`, paddingTop: '14px' }}>
                  <button 
                    type="button" 
                    onClick={() => setInterviewModal(null)} 
                    style={{ background: C.bgSecondary, border: `1px solid ${C.border}`, color: C.text, padding: '7px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    style={{ background: C.teal || '#0F766E', color: '#fff', border: 'none', padding: '7px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Save Notes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            MODAL 4: Provision HR Manager Account
           ══════════════════════════════════════════════════════════════════ */}
        {createHRModalOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
            <div style={{ background: C.card, borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '520px', border: `1px solid ${C.border}`, boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', borderBottom: `1px solid ${C.border}`, paddingBottom: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: C.text }}>Provision HR Account</h2>
                  <div style={{ fontSize: '12px', color: C.textMid, marginTop: '2px' }}>Administrative account for talent operations</div>
                </div>
                <button 
                  onClick={() => setCreateHRModalOpen(false)} 
                  style={{ background: C.bgSecondary, border: `1px solid ${C.border}`, color: C.textMid, width: '28px', height: '28px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <FaTimes style={{ fontSize: '11px' }} />
                </button>
              </div>

              <form onSubmit={handleCreateHRSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: C.text, marginBottom: '4px' }}>Full Name *</label>
                    <input type="text" required value={hrForm.fullName} onChange={(e) => setHrForm({ ...hrForm, fullName: e.target.value })} placeholder="Full name" style={{ width: '100%', padding: '8px 12px', background: C.bgSecondary, border: `1px solid ${C.border}`, borderRadius: '6px', fontSize: '13px', color: C.text, boxSizing: 'border-box' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: C.text, marginBottom: '4px' }}>Corporate Email *</label>
                    <input type="email" required value={hrForm.email} onChange={(e) => setHrForm({ ...hrForm, email: e.target.value })} placeholder="hr@gharkapaisa.in" style={{ width: '100%', padding: '8px 12px', background: C.bgSecondary, border: `1px solid ${C.border}`, borderRadius: '6px', fontSize: '13px', color: C.text, boxSizing: 'border-box' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: C.text, marginBottom: '4px' }}>Mobile Number *</label>
                    <input type="tel" required value={hrForm.mobile} onChange={(e) => setHrForm({ ...hrForm, mobile: e.target.value })} placeholder="10-digit mobile" style={{ width: '100%', padding: '8px 12px', background: C.bgSecondary, border: `1px solid ${C.border}`, borderRadius: '6px', fontSize: '13px', color: C.text, boxSizing: 'border-box' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: C.text, marginBottom: '4px' }}>Designation *</label>
                    <input type="text" required value={hrForm.designation} onChange={(e) => setHrForm({ ...hrForm, designation: e.target.value })} placeholder="HR Manager" style={{ width: '100%', padding: '8px 12px', background: C.bgSecondary, border: `1px solid ${C.border}`, borderRadius: '6px', fontSize: '13px', color: C.text, boxSizing: 'border-box' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: C.text, marginBottom: '4px' }}>Initial Password *</label>
                    <input type="password" required value={hrForm.password} onChange={(e) => setHrForm({ ...hrForm, password: e.target.value })} placeholder="••••••••" style={{ width: '100%', padding: '8px 12px', background: C.bgSecondary, border: `1px solid ${C.border}`, borderRadius: '6px', fontSize: '13px', color: C.text, boxSizing: 'border-box' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: C.text, marginBottom: '4px' }}>Confirm Password *</label>
                    <input type="password" required value={hrForm.confirmPassword} onChange={(e) => setHrForm({ ...hrForm, confirmPassword: e.target.value })} placeholder="••••••••" style={{ width: '100%', padding: '8px 12px', background: C.bgSecondary, border: `1px solid ${C.border}`, borderRadius: '6px', fontSize: '13px', color: C.text, boxSizing: 'border-box' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: `1px solid ${C.border}`, paddingTop: '14px' }}>
                  <button 
                    type="button" 
                    onClick={() => setCreateHRModalOpen(false)} 
                    style={{ background: C.bgSecondary, border: `1px solid ${C.border}`, color: C.text, padding: '7px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={createLoading} 
                    style={{ background: C.teal || '#0F766E', color: '#fff', border: 'none', padding: '7px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {createLoading ? 'Provisioning...' : 'Provision Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
