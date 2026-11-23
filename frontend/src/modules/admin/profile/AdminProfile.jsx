import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuthStore } from '../../../app/store/authStore';
import {
  MdPerson, MdEmail, MdPhone, MdBadge, MdDomain, MdFingerprint,
  MdLock, MdSave, MdCheckCircle, MdError, MdBusiness, MdLogin,
  MdVerifiedUser, MdFace, MdRefresh
} from 'react-icons/md';

const Field = ({ icon, label, value }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: 'rgba(148,163,184,0.06)', borderRadius: '12px', border: '1px solid rgba(148,163,184,0.12)' }}>
    <div style={{ color: '#3b82f6', fontSize: '18px', flexShrink: 0 }}>{icon}</div>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value || '—'}</div>
    </div>
  </div>
);

export default function AdminProfile() {
  const { C, isDark } = useTheme();
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const currentUser = useAuthStore((s) => s.user);

  const cardBg = isDark ? '#1E293B' : '#FFFFFF';
  const borderCol = isDark ? '#334155' : '#E2E8F0';
  const textPrimary = isDark ? '#F1F5F9' : '#0F172A';
  const textMuted = isDark ? '#94A3B8' : '#64748B';
  const inputBg = isDark ? '#0F172A' : '#F8FAFC';

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bio, setBio] = useState(null);
  const [bioLoading, setBioLoading] = useState(false);

  const [fullName, setFullName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);

  const [pw, setPw] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      const data = res.data?.data || res.data;
      setProfile(data);
      setFullName(data?.full_name || `${data?.first_name || ''} ${data?.last_name || ''}`.trim() || '');
      if (setUser && data) setUser({ ...currentUser, ...data });
    } catch (e) {
      console.error('Failed to load profile', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBiometric = useCallback(async () => {
    setBioLoading(true);
    try {
      const res = await api.get('/attendance/enrollment/status');
      setBio(res.data?.data || res.data || null);
    } catch (e) {
      setBio({ status: 'UNKNOWN', is_enrolled: false, message: 'Status unavailable' });
    } finally {
      setBioLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); fetchBiometric(); }, [fetchProfile, fetchBiometric]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) { setProfileMsg({ ok: false, text: 'Full name is required' }); return; }
    setSavingProfile(true); setProfileMsg(null);
    try {
      const res = await api.put('/auth/profile', { fullName: fullName.trim() });
      setProfileMsg({ ok: true, text: res.data?.message || 'Profile updated' });
      fetchProfile();
    } catch (err) {
      setProfileMsg({ ok: false, text: err.response?.data?.message || 'Failed to update profile' });
    } finally { setSavingProfile(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pw.newPassword.length < 6) { setPwMsg({ ok: false, text: 'New password must be at least 6 characters' }); return; }
    if (pw.newPassword !== pw.confirmPassword) { setPwMsg({ ok: false, text: 'Passwords do not match' }); return; }
    setSavingPw(true); setPwMsg(null);
    try {
      const res = await api.post('/auth/change-password', { oldPassword: pw.oldPassword, newPassword: pw.newPassword });
      setPwMsg({ ok: true, text: res.data?.message || 'Password updated' });
      setPw({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPwMsg({ ok: false, text: err.response?.data?.message || 'Failed to change password' });
    } finally { setSavingPw(false); }
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: '10px', fontSize: '13.5px',
    border: `1px solid ${borderCol}`, background: inputBg, color: textPrimary, boxSizing: 'border-box'
  };
  const cardStyle = { background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '16px', padding: '22px' };
  const sectionTitle = { fontSize: '15px', fontWeight: 800, color: textPrimary, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px' };

  const assignedBanks = Array.isArray(profile?.assigned_banks) ? profile.assigned_banks : (Array.isArray(profile?.assignedBanks) ? profile.assignedBanks : []);
  const bioStatus = (bio?.status || (bio?.is_enrolled ? 'ACTIVE' : 'NOT_ENROLLED') || 'NOT_ENROLLED').toUpperCase();
  const bioVerified = bio?.is_enrolled || ['ACTIVE', 'ENROLLED', 'VERIFIED', 'COMPLETED'].includes(bioStatus);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: textMuted }}>Loading profile…</div>;
  }

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 900, color: textPrimary, margin: 0 }}>My Profile</h1>
          <p style={{ fontSize: '13px', color: textMuted, margin: '4px 0 0' }}>
            {profile?.designation || profile?.role || 'Admin'} account details, biometrics &amp; security settings
          </p>
        </div>
        <button onClick={() => { fetchProfile(); fetchBiometric(); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', border: `1px solid ${borderCol}`, background: cardBg, color: textPrimary, fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
          <MdRefresh size={15} /> Refresh
        </button>
      </div>

      {/* Personal Details */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}><MdPerson style={{ color: '#3b82f6' }} /> Personal Details</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
          <Field icon={<MdPerson />} label="Full Name" value={profile?.full_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()} />
          <Field icon={<MdEmail />} label="Email" value={profile?.email} />
          <Field icon={<MdPhone />} label="Mobile" value={profile?.mobile} />
          <Field icon={<MdBadge />} label="Role" value={profile?.role} />
          <Field icon={<MdBusiness />} label="Designation" value={profile?.designation} />
          <Field icon={<MdDomain />} label="Department" value={profile?.department} />
          <Field icon={<MdBadge />} label="Employee Code" value={profile?.employee_code || profile?.employee_id} />
          <Field icon={<MdLogin />} label="Last Login" value={profile?.last_login ? new Date(profile.last_login).toLocaleString() : '—'} />
        </div>

        {assignedBanks.length > 0 && (
          <div style={{ marginTop: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>Assigned Banks</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {assignedBanks.map((b, i) => (
                <span key={i} style={{ padding: '5px 12px', borderRadius: '20px', background: '#3b82f615', color: '#3b82f6', fontSize: '12px', fontWeight: 700, border: '1px solid #3b82f630' }}>
                  {b.name || b.bank_name || b.short_code || b.code}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Face Verification / Biometrics */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
          <h3 style={{ ...sectionTitle, margin: 0 }}><MdFace style={{ color: '#10B981' }} /> Face Verification (Biometric)</h3>
          <button onClick={fetchBiometric} disabled={bioLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, background: 'transparent', color: textMuted, fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
            <MdRefresh size={14} /> {bioLoading ? 'Checking…' : 'Recheck'}
          </button>
        </div>

        {bioLoading && !bio ? (
          <div style={{ color: textMuted, fontSize: '13px' }}>Checking biometric status…</div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', flexShrink: 0,
              background: bioVerified ? '#10B98122' : '#EF444422', color: bioVerified ? '#10B981' : '#EF4444'
            }}>
              {bioVerified ? <MdVerifiedUser /> : <MdFingerprint />}
            </div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, color: textPrimary }}>
                  {bioVerified ? 'Face Verified' : 'Not Enrolled'}
                </span>
                <span style={{
                  padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 800,
                  background: bioVerified ? '#10B98122' : '#F59E0B22', color: bioVerified ? '#10B981' : '#F59E0B'
                }}>
                  {bioStatus}
                </span>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: '12.5px', color: textMuted, lineHeight: 1.5 }}>
                {bio?.message || (bioVerified
                  ? `Biometric reference enrolled${bio?.active_template_version ? ` (v${bio.active_template_version})` : ''}${bio?.enrolled_at ? ` on ${new Date(bio.enrolled_at).toLocaleDateString()}` : ''}. Used for attendance face verification.`
                  : 'Complete face enrollment to enable biometric attendance verification. Contact HR or Super Admin to schedule enrollment.')}
              </p>
            </div>
            {bio?.face_image_url && (
              <img src={bio.face_image_url} alt="Enrolled face" style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover', border: `1px solid ${borderCol}` }} />
            )}
          </div>
        )}
      </div>

      {/* Settings */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Edit Profile */}
        <form onSubmit={handleSaveProfile} style={cardStyle}>
          <h3 style={sectionTitle}><MdPerson style={{ color: '#3b82f6' }} /> Edit Profile</h3>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: textMuted, marginBottom: '6px' }}>Full Name</label>
          <input style={inputStyle} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
          {profileMsg && (
            <div style={{ marginTop: '10px', fontSize: '12.5px', fontWeight: 700, color: profileMsg.ok ? '#10B981' : '#EF4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {profileMsg.ok ? <MdCheckCircle /> : <MdError />} {profileMsg.text}
            </div>
          )}
          <button type="submit" disabled={savingProfile} style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 800, fontSize: '13px', cursor: 'pointer', opacity: savingProfile ? 0.6 : 1 }}>
            <MdSave size={16} /> {savingProfile ? 'Saving…' : 'Save Profile'}
          </button>
        </form>

        {/* Change Password */}
        <form onSubmit={handleChangePassword} style={cardStyle}>
          <h3 style={sectionTitle}><MdLock style={{ color: '#F59E0B' }} /> Change Password</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input style={inputStyle} type="password" placeholder="Current password" value={pw.oldPassword} onChange={(e) => setPw({ ...pw, oldPassword: e.target.value })} autoComplete="current-password" />
            <input style={inputStyle} type="password" placeholder="New password (min 6 chars)" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} autoComplete="new-password" />
            <input style={inputStyle} type="password" placeholder="Confirm new password" value={pw.confirmPassword} onChange={(e) => setPw({ ...pw, confirmPassword: e.target.value })} autoComplete="new-password" />
          </div>
          {pwMsg && (
            <div style={{ marginTop: '10px', fontSize: '12.5px', fontWeight: 700, color: pwMsg.ok ? '#10B981' : '#EF4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {pwMsg.ok ? <MdCheckCircle /> : <MdError />} {pwMsg.text}
            </div>
          )}
          <button type="submit" disabled={savingPw} style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', border: 'none', background: '#F59E0B', color: '#fff', fontWeight: 800, fontSize: '13px', cursor: 'pointer', opacity: savingPw ? 0.6 : 1 }}>
            <MdLock size={16} /> {savingPw ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Quick links */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/admin/messenger')} style={{ padding: '9px 16px', borderRadius: '10px', border: `1px solid ${borderCol}`, background: cardBg, color: textPrimary, fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>Open Messenger</button>
        <button onClick={() => navigate('/admin/dashboard')} style={{ padding: '9px 16px', borderRadius: '10px', border: `1px solid ${borderCol}`, background: cardBg, color: textPrimary, fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>Back to Dashboard</button>
      </div>
    </div>
  );
}
