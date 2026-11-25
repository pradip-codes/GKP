import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FaCopy, FaPlus, FaSearch, FaShareAlt, FaUserPlus } from 'react-icons/fa';
import { useAuthStore } from '../../app/store/authStore';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../services/api';

const RELATIONSHIPS = [
  'Parent',
  'Spouse',
  'Sibling',
  'Relative',
  'Friend',
  'Former colleague',
  'Other'
];

const statusColors = {
  Verified: { background: '#dcfce7', color: '#166534' },
  'Different employee link': { background: '#fee2e2', color: '#991b1b' },
  Pending: { background: '#fef3c7', color: '#92400e' },
  'Not registered': { background: '#f1f5f9', color: '#475569' },
  Selected: { background: '#dbeafe', color: '#1e40af' },
  'Interview in progress': { background: '#fef3c7', color: '#92400e' },
  Registered: { background: '#e0e7ff', color: '#3730a3' },
  'Not selected': { background: '#fee2e2', color: '#991b1b' },
  'Awaiting registration': { background: '#f1f5f9', color: '#475569' }
};

function StatusBadge({ value }) {
  const colors = statusColors[value] || { background: '#f1f5f9', color: '#475569' };
  return (
    <span style={{
      display: 'inline-block',
      background: colors.background,
      color: colors.color,
      borderRadius: 999,
      padding: '4px 9px',
      fontSize: 11,
      fontWeight: 800,
      whiteSpace: 'nowrap'
    }}>
      {value}
    </span>
  );
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || fallback;
}

export default function EmployeeReferralManagement() {
  const { C } = useTheme();
  const user = useAuthStore((state) => state.user);
  const role = String(user?.role || '').toUpperCase();
  const isEmployee = role === 'EMPLOYEE';
  const isSuperAdmin = role === 'SUPER_ADMIN';

  const [referrals, setReferrals] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    verified: 0,
    inPipeline: 0,
    bonusEligible: 0,
    bonusCredited: 0
  });
  const [metadata, setMetadata] = useState({ referralCode: '', hrOptions: [] });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [metaError, setMetaError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [form, setForm] = useState({
    candidate_name: '',
    mobile_number: '',
    relationship: '',
    preferred_hr_id: ''
  });
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [copied, setCopied] = useState(false);
  const activityRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchText.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');

    api.get('/employee-referrals', { params: search ? { search } : {} })
      .then((response) => {
        if (!response.data?.success || !Array.isArray(response.data.data)) {
          throw new Error('The referrals response was incomplete.');
        }
        if (!active) return;
        setReferrals(response.data.data);
        setSummary(response.data.summary || {});
      })
      .catch((error) => {
        if (active) setLoadError(getErrorMessage(error, 'Unable to load referrals.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [search, refreshKey]);

  useEffect(() => {
    if (!isEmployee && !isSuperAdmin) return undefined;
    let active = true;

    api.get('/employee-referrals/meta')
      .then((response) => {
        if (!response.data?.success || !response.data?.data) {
          throw new Error('Employee referral details are unavailable.');
        }
        if (active) setMetadata(response.data.data);
      })
      .catch((error) => {
        if (active) setMetaError(getErrorMessage(error, 'Unable to load referral details.'));
      });

    return () => {
      active = false;
    };
  }, [isEmployee, isSuperAdmin]);

  // Referral code = the employee's "Ref Code" (same value shown in the profile menu, e.g. CAND10440).
  // Backend meta is preferred; the logged-in user's own employee_id is the fallback so the link is always generated.
  const ownRefCode = String(user?.employee_id || user?.emp_code || '').trim();
  const effectiveReferralCode = String(metadata.referralCode || ownRefCode || '').trim();

  const referralLink = useMemo(() => {
    if (!effectiveReferralCode || typeof window === 'undefined') return '';
    return `${window.location.origin}/careers/register?ref=${encodeURIComponent(effectiveReferralCode)}`;
  }, [effectiveReferralCode]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch (error) {
      setMetaError('Could not copy the referral link. Copy it from the text field instead.');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    setSubmitSuccess('');

    try {
      const response = await api.post('/employee-referrals', form);
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Referral could not be saved.');
      }
      setForm({
        candidate_name: '',
        mobile_number: '',
        relationship: '',
        preferred_hr_id: ''
      });
      setSubmitSuccess(`${response.data.data.candidate_name} was saved. The referral list is refreshing.`);
      setSearchText('');
      setSearch('');
      setRefreshKey((current) => current + 1);
      window.requestAnimationFrame(() => {
        activityRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch (error) {
      setSubmitError(getErrorMessage(error, error.message || 'Referral could not be saved.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleBonusCredit = async (referral) => {
    const confirmed = window.confirm(
      'Mark this ₹1,000 referral bonus as manually credited? This only records the status; it will not transfer money or create a wallet/payroll transaction.'
    );
    if (!confirmed) return;

    setActionId(referral.id);
    setActionError('');
    try {
      const response = await api.post(`/employee-referrals/${referral.id}/bonus-credit`);
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Bonus status could not be updated.');
      }
      setRefreshKey((current) => current + 1);
    } catch (error) {
      setActionError(getErrorMessage(error, error.message || 'Bonus status could not be updated.'));
    } finally {
      setActionId(null);
    }
  };

  const handleAssign = async (referralId, preferredHrId) => {
    setActionId(referralId);
    setActionError('');
    try {
      const response = await api.post(`/employee-referrals/${referralId}/assign`, {
        preferred_hr_id: preferredHrId
      });
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Referral could not be assigned.');
      }
      setRefreshKey((current) => current + 1);
    } catch (error) {
      setActionError(getErrorMessage(error, error.message || 'Referral could not be assigned.'));
    } finally {
      setActionId(null);
    }
  };

  const title = role === 'HR'
    ? 'Referrals assigned to you'
    : isSuperAdmin
      ? 'Employee referrals'
      : 'My employee referrals';

  const cardStyle = {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: 18
  };
  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '11px 12px',
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    background: C.bg,
    color: C.text,
    font: 'inherit'
  };

  return (
    <main style={{ background: C.bg, color: C.text, minHeight: '100%', padding: '24px 20px 48px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <header style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <FaUserPlus color={C.employeePrimary || '#0f766e'} size={22} />
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>{title}</h1>
              <p style={{ margin: '5px 0 0', color: C.textMid, fontSize: 13 }}>
                Track registration, recruitment progress, and referral bonus status.
              </p>
            </div>
          </div>
        </header>

        {loadError && (
          <div role="alert" style={{ ...cardStyle, marginBottom: 16, color: '#b91c1c', borderColor: '#fecaca' }}>
            {loadError}
          </div>
        )}

        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 12,
          marginBottom: 18
        }}>
          {[
            ['Total referrals', summary.total || 0],
            ['Link verified', summary.verified || 0],
            ['Interview in progress', summary.inPipeline || 0],
            ['Bonus eligible', summary.bonusEligible || 0],
            ['Manually credited', summary.bonusCredited || 0]
          ].map(([label, value]) => (
            <div key={label} style={cardStyle}>
              <div style={{ color: C.textMid, fontSize: 12, fontWeight: 700 }}>{label}</div>
              <div style={{ fontSize: 25, fontWeight: 900, marginTop: 8 }}>{value}</div>
            </div>
          ))}
        </section>

        {isEmployee && (
          <section style={{ ...cardStyle, marginBottom: 18 }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 17 }}>Your referral link</h2>
            {metaError && !referralLink && <p role="alert" style={{ color: '#b91c1c', margin: '0 0 10px' }}>{metaError}</p>}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                aria-label="Referral link"
                readOnly
                value={referralLink}
                placeholder="Loading your employee referral link..."
                style={{ ...inputStyle, flex: '1 1 420px' }}
              />
              <button
                type="button"
                onClick={handleCopyLink}
                disabled={!referralLink}
                style={{
                  border: 0,
                  borderRadius: 10,
                  padding: '0 16px',
                  background: C.employeePrimary || '#0f766e',
                  color: '#fff',
                  fontWeight: 800,
                  cursor: referralLink ? 'pointer' : 'not-allowed'
                }}
              >
                <FaCopy /> {copied ? 'Copied' : 'Copy link'}
              </button>
              {referralLink && (
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Apply to join GharKaPaisa using my referral link: ${referralLink}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    borderRadius: 10,
                    padding: '0 15px',
                    background: '#16a34a',
                    color: '#fff',
                    textDecoration: 'none',
                    fontWeight: 800
                  }}
                >
                  <FaShareAlt /> Share
                </a>
              )}
            </div>
            <p style={{ color: C.textMid, fontSize: 12, margin: '9px 0 0' }}>
              Registration and link verification are matched using the candidate’s mobile number and employee referral code.
            </p>
          </section>
        )}

        {isEmployee && (
          <section style={{ ...cardStyle, marginBottom: 18 }}>
            <h2 style={{ margin: '0 0 14px', fontSize: 17 }}>Add a referral</h2>
            <form onSubmit={handleSubmit}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                gap: 12
              }}>
                <label style={{ fontSize: 12, fontWeight: 700 }}>
                  Candidate name
                  <input
                    required
                    maxLength={100}
                    value={form.candidate_name}
                    onChange={(event) => setForm({ ...form, candidate_name: event.target.value })}
                    style={{ ...inputStyle, marginTop: 6 }}
                  />
                </label>
                <label style={{ fontSize: 12, fontWeight: 700 }}>
                  Mobile number
                  <input
                    required
                    inputMode="numeric"
                    maxLength={15}
                    value={form.mobile_number}
                    onChange={(event) => setForm({ ...form, mobile_number: event.target.value })}
                    style={{ ...inputStyle, marginTop: 6 }}
                  />
                </label>
                <label style={{ fontSize: 12, fontWeight: 700 }}>
                  Relationship
                  <select
                    required
                    value={form.relationship}
                    onChange={(event) => setForm({ ...form, relationship: event.target.value })}
                    style={{ ...inputStyle, marginTop: 6 }}
                  >
                    <option value="">Select relationship</option>
                    {RELATIONSHIPS.map((relationship) => (
                      <option key={relationship} value={relationship}>{relationship}</option>
                    ))}
                  </select>
                </label>
                <label style={{ fontSize: 12, fontWeight: 700 }}>
                  Assign to HR
                  <select
                    required
                    value={form.preferred_hr_id}
                    onChange={(event) => setForm({ ...form, preferred_hr_id: event.target.value })}
                    style={{ ...inputStyle, marginTop: 6 }}
                  >
                    <option value="">Select HR representative</option>
                    {!(metadata.hrOptions || []).length && (
                      <option value="no-active-hr" disabled>No active HR accounts available</option>
                    )}
                    {(metadata.hrOptions || []).map((hr) => (
                      <option key={hr.id} value={hr.id}>{hr.full_name}</option>
                    ))}
                    <option value="unassigned">Other (unassigned — Super Admin will route)</option>
                  </select>
                </label>
              </div>
              {submitError && <p role="alert" style={{ color: '#b91c1c', margin: '12px 0 0' }}>{submitError}</p>}
              {submitSuccess && <p role="status" style={{ color: '#15803d', margin: '12px 0 0' }}>{submitSuccess}</p>}
              <button
                type="submit"
                disabled={submitting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 14,
                  padding: '10px 16px',
                  border: 0,
                  borderRadius: 10,
                  background: C.employeePrimary || '#0f766e',
                  color: '#fff',
                  fontWeight: 800,
                  cursor: submitting ? 'wait' : 'pointer'
                }}
              >
                <FaPlus /> {submitting ? 'Saving...' : 'Save referral'}
              </button>
            </form>
          </section>
        )}

        <section ref={activityRef} id="referral-activity" style={cardStyle}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 14
          }}>
            <h2 style={{ margin: 0, fontSize: 17 }}>Referral activity</h2>
            <label style={{ position: 'relative', width: 'min(100%, 320px)' }}>
              <FaSearch style={{ position: 'absolute', top: 13, left: 12, color: C.textMid }} />
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search name, mobile, or employee code"
                style={{ ...inputStyle, paddingLeft: 36 }}
              />
            </label>
          </div>

          {actionError && <p role="alert" style={{ color: '#b91c1c' }}>{actionError}</p>}
          {loading ? (
            <p style={{ color: C.textMid }}>Loading referrals...</p>
          ) : referrals.length === 0 ? (
            <p style={{ color: C.textMid }}>No referrals found.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: C.textMid, fontSize: 11 }}>
                    {[
                      'Candidate',
                      'Referral source',
                      'Assigned HR',
                      'Link status',
                      'Recruitment',
                      'Bonus status',
                      'Action'
                    ].map((heading) => (
                      <th key={heading} style={{ padding: '10px 9px', borderBottom: `1px solid ${C.border}` }}>
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((referral) => (
                    <tr key={referral.id} style={{ borderBottom: `1px solid ${C.border}`, fontSize: 12 }}>
                      <td style={{ padding: '12px 9px' }}>
                        <strong>{referral.candidate_name}</strong>
                        <div style={{ color: C.textMid, marginTop: 4 }}>
                          {referral.mobile_number} · {referral.relationship}
                        </div>
                      </td>
                      <td style={{ padding: '12px 9px' }}>
                        {referral.referring_employee_name}
                        <div style={{ color: C.textMid, marginTop: 4 }}>{referral.referral_code}</div>
                      </td>
                      <td style={{ padding: '12px 9px' }}>
                        {referral.preferred_hr_name || 'Other (unassigned)'}
                      </td>
                      <td style={{ padding: '12px 9px' }}><StatusBadge value={referral.link_status} /></td>
                      <td style={{ padding: '12px 9px' }}><StatusBadge value={referral.recruitment_status} /></td>
                      <td style={{ padding: '12px 9px' }}>
                        {referral.bonus_status === 'credited'
                          ? 'Manually credited'
                          : referral.bonus_status === 'eligible'
                            ? 'Eligible — ₹1,000'
                            : referral.bonus_status === 'waiting_period'
                              ? 'One-month wait'
                              : 'Not eligible'}
                      </td>
                      <td style={{ padding: '12px 9px' }}>
                        {isSuperAdmin && !referral.preferred_hr_id && (
                          <select
                            aria-label={`Assign ${referral.candidate_name} to HR`}
                            defaultValue=""
                            onChange={(event) => {
                              if (event.target.value) handleAssign(referral.id, event.target.value);
                            }}
                            disabled={actionId === referral.id}
                            style={{ ...inputStyle, minWidth: 150, padding: '7px 8px', fontSize: 11 }}
                          >
                            <option value="" disabled>Assign to HR</option>
                            {(metadata.hrOptions || []).map((hr) => (
                              <option key={hr.id} value={hr.id}>{hr.full_name}</option>
                            ))}
                          </select>
                        )}
                        {isSuperAdmin && referral.bonus_status === 'eligible' && (
                          <button
                            type="button"
                            onClick={() => handleBonusCredit(referral)}
                            disabled={actionId === referral.id}
                            style={{
                              border: 0,
                              borderRadius: 8,
                              padding: '7px 10px',
                              color: '#fff',
                              background: '#0f766e',
                              fontWeight: 800,
                              cursor: actionId === referral.id ? 'wait' : 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {actionId === referral.id ? 'Saving...' : 'Mark credited'}
                          </button>
                        )}
                        {referral.bonus_status === 'credited' && referral.bonus_credited_at && (
                          <span style={{ color: C.textMid, whiteSpace: 'nowrap' }}>
                            {new Date(referral.bonus_credited_at).toLocaleDateString()}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p style={{ color: C.textMid, fontSize: 11, margin: '14px 0 0' }}>
            Bonus eligibility is based on verified referral attribution, employee selection, and one month from the recorded joining date. Marking credited is tracking only; no payment is made here.
          </p>
        </section>
      </div>
    </main>
  );
}
