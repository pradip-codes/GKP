const ALLOWED_RELATIONSHIPS = [
  'Parent',
  'Spouse',
  'Sibling',
  'Relative',
  'Friend',
  'Former colleague',
  'Other'
];

function normalizeIndianMobile(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  const ten = digits.length >= 10 ? digits.slice(-10) : '';
  return /^[6-9]\d{9}$/.test(ten) ? ten : null;
}

function computeLinkStatus(row) {
  if (!row.cand_id) return 'Not registered';
  if (
    row.cand_referred_by_employee_id &&
    String(row.cand_referred_by_employee_id) === String(row.referring_employee_id)
  ) {
    return 'Verified';
  }
  const refCode = String(row.referral_code || '').trim().toLowerCase();
  const candHrName = String(row.cand_hr_name || '').trim().toLowerCase();
  const candHrRef = String(row.cand_hr_reference || '').trim().toLowerCase();
  if (refCode && (candHrName === refCode || candHrRef === refCode)) {
    return 'Verified';
  }
  if (
    row.cand_referred_by_employee_id &&
    String(row.cand_referred_by_employee_id) !== String(row.referring_employee_id)
  ) {
    return 'Different employee link';
  }
  return 'Pending';
}

function computeRecruitmentStatus(row) {
  if (!row.cand_id) return 'Awaiting registration';
  const st = String(row.cand_interview_status || '').toUpperCase();
  if (st.includes('REJECT') || st.includes('NOT_SELECTED') || st.includes('NOT SELECTED')) return 'Not selected';
  if (st === 'SELECTED' || st === 'EMPLOYEE_CREATED' || st.includes('SELECT') || st.includes('HIRED') || st.includes('ONBOARD')) {
    return 'Selected';
  }
  if (st.includes('INTERVIEW') || st.includes('SCHEDULE') || st.includes('PROGRESS')) {
    return 'Interview in progress';
  }
  return 'Registered';
}

function computeBonusStatus(dbBonusStatus, linkStatus, recruitmentStatus) {
  if (String(dbBonusStatus || '').toLowerCase() === 'credited') {
    return 'credited';
  }
  if (linkStatus === 'Verified' && recruitmentStatus === 'Selected') {
    return 'eligible';
  }
  return 'not_eligible';
}

function mapReferralRow(row) {
  const linkStatus = computeLinkStatus(row);
  const recruitmentStatus = computeRecruitmentStatus(row);
  const bonusStatus = computeBonusStatus(row.db_bonus_status, linkStatus, recruitmentStatus);

  return {
    id: row.id,
    candidate_name: row.candidate_name,
    mobile_number: row.mobile_number,
    relationship: row.relationship,
    preferred_hr_id: row.preferred_hr_id || null,
    preferred_hr_name: row.preferred_hr_name || null,
    referral_code: row.referral_code,
    referring_employee_name: row.referring_employee_name || null,
    link_status: linkStatus,
    recruitment_status: recruitmentStatus,
    bonus_status: bonusStatus,
    bonus_credited_at: row.bonus_credited_at || null
  };
}

function summarizeReferrals(referrals) {
  return referrals.reduce(
    (acc, item) => {
      acc.total += 1;
      if (item.link_status === 'Verified') acc.verified += 1;
      if (['Registered', 'Interview in progress'].includes(item.recruitment_status)) acc.inPipeline += 1;
      if (item.bonus_status === 'eligible') acc.bonusEligible += 1;
      if (item.bonus_status === 'credited') acc.bonusCredited += 1;
      return acc;
    },
    { total: 0, verified: 0, inPipeline: 0, bonusEligible: 0, bonusCredited: 0 }
  );
}

module.exports = {
  ALLOWED_RELATIONSHIPS,
  normalizeIndianMobile,
  computeLinkStatus,
  computeRecruitmentStatus,
  computeBonusStatus,
  mapReferralRow,
  summarizeReferrals
};
