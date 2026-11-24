const express = require('express');
const router = express.Router();
const { query } = require('../../config/database');
const logger = require('../../config/logger');
const { sendSmsOtp } = require('../../services/otp/msg91.service');
const { sendOtpEmail, sendCandidateAssignedToHrEmail, sendCandidateRegistrationSuccessEmail } = require('../../services/email/email.service');
const { uploadToS3 } = require('../../services/aws/s3.service');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const crypto = require('crypto');
const { OTP_PEPPER } = require('../../config/jwt');

// Helper to hash OTP
const hashOtp = (otp) => crypto.createHmac('sha256', OTP_PEPPER || 'gkp-otp-secret-key').update(String(otp)).digest('hex');

// Helper: Ensure tables and sequence exist safely
// Schema is permanently provisioned via database migrations (migrate_runtime_ddl_cleanup.js).
// Runtime DDL eliminated to prevent AccessExclusiveLock contention and connection pool exhaustion.
async function ensurePublicTablesExist() {
  return;
}

// Helper: Generate candidate reference code (e.g. CAND10001)
async function generateCandidateReferenceCode() {
  await ensurePublicTablesExist();
  try {
    const { rows } = await query(`SELECT nextval('candidate_reference_seq') as seq`);
    const seqNum = rows[0]?.seq || Math.floor(10000 + Math.random() * 90000);
    return `CAND${seqNum}`;
  } catch (e) {
    const seqNum = Math.floor(10000 + Math.random() * 90000);
    return `CAND${seqNum}`;
  }
}

// POST /api/v1/public/careers/verify-mobile — Send mobile OTP
router.post('/verify-mobile', async (req, res, next) => {
  try {
    await ensurePublicTablesExist();
    const { mobile_number } = req.body;
    if (!mobile_number) {
      return res.status(400).json({ success: false, message: 'Valid 10-digit mobile number required' });
    }
    const cleanMob = String(mobile_number).trim().replace(/\D/g, '').slice(-10);
    if (!cleanMob || cleanMob.length < 10) {
      return res.status(400).json({ success: false, message: 'Valid 10-digit mobile number required' });
    }

    // 1. Check if mobile exists in users table (any existing role)
    const userCheck = await query(`SELECT id, role FROM users WHERE mobile = $1 OR mobile = $2`, [cleanMob, `91${cleanMob}`]);
    if (userCheck.rows.length > 0) {
      const roleName = userCheck.rows[0].role || 'User';
      return res.status(400).json({
        success: false,
        message: `This mobile number is already registered in the system as an active ${roleName}. Candidate registration is not allowed.`
      });
    }

    // 2. Check if mobile exists in employee_candidates table
    const candidateCheck = await query(`SELECT id, reference_code FROM employee_candidates WHERE mobile_number = $1 OR mobile_number = $2`, [cleanMob, `91${cleanMob}`]);
    if (candidateCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `This mobile number is already registered as a candidate with Reference Code: ${candidateCheck.rows[0].reference_code}.`
      });
    }

    if (req.body?.check_only) {
      return res.json({ success: true, message: 'Mobile number is eligible for registration.' });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    try {
      await query(`DELETE FROM otp_verifications WHERE identity IN ($1, $2, $3, $4)`, [
        `mobile_${cleanMob}`, cleanMob, `mobile_91${cleanMob}`, `91${cleanMob}`
      ]);
      await query(`
        INSERT INTO otp_verifications (identity, otp_hash, expires_at)
        VALUES ($1, $2, $3), ($4, $2, $3)
      `, [`mobile_${cleanMob}`, otpHash, expiresAt, cleanMob]);
    } catch (dbErr) {
      logger.warn(`OTP DB insert warning: ${dbErr.message}`);
    }
    
    let smsDelivered = false;
    try {
      const smsResult = await sendSmsOtp(cleanMob, otp);
      smsDelivered = smsResult !== false;
      if (!smsDelivered) {
        logger.warn(`[CAREERS OTP] MSG91 SMS not delivered for mobile ending ${cleanMob.slice(-4)}`);
      }
    } catch (smsErr) {
      logger.error(`[CAREERS OTP] SMS send failed for mobile ending ${cleanMob.slice(-4)}: ${smsErr.message}`);
    }

    if (!smsDelivered && process.env.NODE_ENV === 'production') {
      return res.status(502).json({
        success: false,
        message: 'Unable to deliver OTP SMS to this mobile number right now. Please verify the number or try again shortly.'
      });
    }

    res.json({
      success: true,
      sms_delivered: smsDelivered,
      message: 'OTP sent to mobile number',
      debug_otp: process.env.NODE_ENV !== 'production' ? otp : undefined
    });
  } catch (err) {
    logger.error('Verify mobile error:', err);
    res.status(500).json({ success: false, message: 'Failed to process mobile OTP request. Please try again.' });
  }
});

// POST /api/v1/public/careers/verify-email — Send email OTP
router.post('/verify-email', async (req, res, next) => {
  try {
    await ensurePublicTablesExist();
    const { email_id, email } = req.body;
    const targetEmail = email_id || email;
    if (!targetEmail) {
      return res.status(400).json({ success: false, message: 'Valid email address is required' });
    }
    const cleanEmail = String(targetEmail).trim().toLowerCase();

    // 1. Check if email exists in users table (any existing role)
    const userCheck = await query(`SELECT id, role FROM users WHERE LOWER(email) = LOWER($1)`, [cleanEmail]);
    if (userCheck.rows.length > 0) {
      const roleName = userCheck.rows[0].role || 'User';
      return res.status(400).json({
        success: false,
        message: `This email address is already registered in the system as an active ${roleName}. Candidate registration is not allowed.`
      });
    }

    // 2. Check if email exists in employee_candidates table
    const candidateCheck = await query(`SELECT id, reference_code FROM employee_candidates WHERE LOWER(email_id) = LOWER($1)`, [cleanEmail]);
    if (candidateCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `This email address is already registered as a candidate with Reference Code: ${candidateCheck.rows[0].reference_code}.`
      });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    if (process.env.NODE_ENV !== 'production') {
      logger.info(`[CAREER EMAIL OTP DISPATCH] Target: ${cleanEmail}`);
    }

    try {
      await query(`DELETE FROM otp_verifications WHERE identity = $1 OR identity = $2`, [`email_${cleanEmail}`, cleanEmail]);
      await query(`
        INSERT INTO otp_verifications (identity, otp_hash, expires_at)
        VALUES ($1, $2, $3)
      `, [`email_${cleanEmail}`, otpHash, expiresAt]);
      await query(`
        INSERT INTO otp_verifications (identity, otp_hash, expires_at)
        VALUES ($1, $2, $3)
      `, [cleanEmail, otpHash, expiresAt]);
    } catch (dbErr) {
      logger.warn(`OTP DB insert email warning: ${dbErr.message}`);
    }
    
    try {
      await sendOtpEmail(cleanEmail, otp);
    } catch (err) {
      logger.error(`[CAREER EMAIL OTP SEND ERROR] ${cleanEmail}: ${err.message}`);
    }

    res.json({
      success: true,
      message: `OTP dispatched to ${cleanEmail}.`,
      debug_otp: process.env.NODE_ENV !== 'production' ? otp : undefined
    });
  } catch (err) {
    logger.error('Verify email error:', err);
    res.status(500).json({ success: false, message: 'Failed to process email OTP request. Please try again.' });
  }
});

// POST /api/v1/public/careers/verify-otp — Verify OTP from PostgreSQL or MSG91 Access Token
router.post('/verify-otp', async (req, res, next) => {
  try {
    await ensurePublicTablesExist();
    const { mobile_number, email_id, otp, mobile_otp, email_otp, type, access_token, accessToken } = req.body;
    let verified = false;

    const tokenToVerify = access_token || accessToken;
    const cleanMobile = mobile_number ? String(mobile_number).trim().replace(/\D/g, '').slice(-10) : '';

    // If an MSG91 Widget Access Token is provided, verify it directly with MSG91
    if (tokenToVerify && (type === 'mobile' || !email_id)) {
      try {
        const { verifyAccessToken } = require('../../services/otp/msg91.service');
        await verifyAccessToken({ accessToken: tokenToVerify, expectedMobile: cleanMobile });
        verified = true;
        logger.info(`[CAREERS OTP] MSG91 access token verified successfully on backend for mobile: ${cleanMobile}`);
      } catch (tokenErr) {
        logger.warn(`[CAREERS OTP] MSG91 access token backend verification note: ${tokenErr.message}`);
      }
    }

    const mOtp = mobile_otp || otp;
    const eOtp = email_otp || otp;
    const cleanEmail = email_id ? String(email_id).trim().toLowerCase() : '';

    const isDev = process.env.NODE_ENV !== 'production';
    if (!verified && isDev && (mOtp === '123456' || eOtp === '123456' || mOtp === '1234' || eOtp === '1234' || otp === '123456')) {
      verified = true;
    } else if (!verified) {
      try {
        if (type === 'mobile' || (cleanMobile && mOtp && !cleanEmail)) {
          const mHash = hashOtp(mOtp);
          const { rows } = await query(
            `SELECT * FROM otp_verifications 
             WHERE identity IN ($1, $2, $3, $4) 
               AND otp_hash = $5 
               AND expires_at > NOW()`,
            [`mobile_${cleanMobile}`, cleanMobile, `mobile_91${cleanMobile}`, `91${cleanMobile}`, mHash]
          );
          if (rows.length > 0) {
            verified = true;
            await query(`DELETE FROM otp_verifications WHERE id = $1`, [rows[0].id]);
          }
        } else if (type === 'email' || (cleanEmail && eOtp && !cleanMobile)) {
          const eHash = hashOtp(eOtp);
          const { rows } = await query(
            `SELECT * FROM otp_verifications 
             WHERE identity IN ($1, $2) 
               AND otp_hash = $3 
               AND expires_at > NOW()`,
            [`email_${cleanEmail}`, cleanEmail, eHash]
          );
          if (rows.length > 0) {
            verified = true;
            await query(`DELETE FROM otp_verifications WHERE id = $1`, [rows[0].id]);
          }
        } else {
          const mHash = mOtp ? hashOtp(mOtp) : '';
          const eHash = eOtp ? hashOtp(eOtp) : '';
          const { rows } = await query(
            `SELECT * FROM otp_verifications 
             WHERE ((identity IN ($1, $2, $3, $4) AND otp_hash = $5) 
                OR (identity IN ($6, $7) AND otp_hash = $8)) 
               AND expires_at > NOW()`,
            [`mobile_${cleanMobile}`, cleanMobile, `mobile_91${cleanMobile}`, `91${cleanMobile}`, mHash, `email_${cleanEmail}`, cleanEmail, eHash]
          );
          if (rows.length > 0) {
            verified = true;
            await query(`DELETE FROM otp_verifications WHERE id = $1`, [rows[0].id]);
          }
        }
      } catch (dbErr) {
        logger.warn(`OTP DB select warning: ${dbErr.message}`);
      }
    }

    if (!verified) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP. Please enter the valid OTP code.' });
    }

    res.json({ success: true, message: 'OTP verified successfully' });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/public/hr-list — Active HR accounts for the interview registration "Select HR" dropdown.
// Returns minimal public-safe fields only (id + display name).
router.get('/hr-list', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, full_name FROM users
       WHERE UPPER(role) = 'HR' AND status = 'active' AND full_name IS NOT NULL AND full_name <> ''
       ORDER BY full_name ASC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/public/careers/register — Candidate Registration
router.post('/register', upload.single('resume'), async (req, res, next) => {
  try {
    await ensurePublicTablesExist();

    const {
      full_name, first_name, middle_name, last_name, age, mobile_number, email_id, date_of_birth, current_address,
      address_flat_no, address_society, address_area, address_state, address_district, address_city, pincode,
      highest_qualification, education_stream, education_detail, pursuing_year, passing_year,
      experience_type, total_experience_years,
      current_company, current_designation, last_salary_ctc, expected_salary, previous_salary,
      immediate_joining, notice_period_days, comfortable_with_location,
      relevant_experience, how_did_you_hear, referred_by_employee_id,
      target_role, hr_name, selected_hr, hr_reference, hr_id, assigned_hr_id
    } = req.body;

    if (!full_name || !mobile_number || !email_id || !highest_qualification) {
      return res.status(400).json({ success: false, message: 'Full name, mobile number, email and qualification are required' });
    }

    const cleanMob = mobile_number.trim();
    const cleanEmail = email_id.trim().toLowerCase();

    // 1. Check if mobile or email is already registered in users table
    const existingUser = await query(
      `SELECT id, role, email, mobile FROM users WHERE mobile = $1 OR LOWER(email) = LOWER($2)`,
      [cleanMob, cleanEmail]
    );

    if (existingUser.rows.length > 0) {
      const matchedUser = existingUser.rows[0];
      const roleName = matchedUser.role || 'User';
      const matchedField = matchedUser.mobile === cleanMob ? 'mobile number' : 'email address';
      return res.status(400).json({
        success: false,
        already_registered: true,
        message: `This ${matchedField} is already registered in the system as an active ${roleName}. Candidate registration is not allowed.`
      });
    }

    // 2. Check duplicate application in employee_candidates table
    const existingCandidate = await query(
      `SELECT id, reference_code, mobile_number, email_id FROM employee_candidates WHERE mobile_number = $1 OR LOWER(email_id) = LOWER($2)`,
      [cleanMob, cleanEmail]
    );

    if (existingCandidate.rows.length > 0) {
      const matchedCand = existingCandidate.rows[0];
      const matchedField = matchedCand.mobile_number === cleanMob ? 'mobile number' : 'email address';
      return res.status(400).json({
        success: false,
        already_exists: true,
        reference_code: matchedCand.reference_code,
        message: `This ${matchedField} is already registered as a candidate with Reference Code: ${matchedCand.reference_code}.`
      });
    }

    let resume_url = null;
    let resume_file_name = null;

    if (req.file) {
      resume_file_name = req.file.originalname;
      try {
        const s3Res = await uploadToS3(req.file.buffer, req.file.originalname, 'resumes');
        resume_url = s3Res.url;
      } catch (uploadErr) {
        logger.warn('Resume S3 upload warning:', uploadErr.message);
      }
    }

    const reference_code = await generateCandidateReferenceCode();

    const insertQuery = `
      INSERT INTO employee_candidates (
        reference_code, full_name, first_name, middle_name, last_name, age,
        mobile_number, email_id, date_of_birth, current_address,
        address_flat_no, address_society, address_area, address_state, address_district, address_city, pincode,
        highest_qualification, education_stream, education_detail, pursuing_year, passing_year,
        experience_type, total_experience_years,
        current_company, current_designation, last_salary_ctc, expected_salary, previous_salary,
        immediate_joining, notice_period_days, comfortable_with_location,
        relevant_experience, how_did_you_hear, referred_by_employee_id,
        resume_url, resume_file_name, target_role, hr_name, selected_hr, hr_reference,
        assigned_hr_id, assigned_hr_name,
        mobile_verified, email_verified, otp_verified,
        interview_status
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22,
        $23, $24,
        $25, $26, $27, $28, $29,
        $30, $31, $32,
        $33, $34, $35,
        $36, $37, $38, $39, $40, $41,
        $42, $43,
        true, true, true,
        'REGISTERED'
      ) RETURNING id, reference_code, interview_status, created_at
    `;

    const isUuid = (val) => typeof val === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val.trim());
    let validReferredByUuid = isUuid(referred_by_employee_id) ? referred_by_employee_id.trim() : null;
    const rawRefCode = req.body.ref || req.body.referral_code || referred_by_employee_id || hr_name;

    if (!validReferredByUuid && rawRefCode && typeof rawRefCode === 'string') {
      const cleanCode = rawRefCode.trim();
      try {
        const empMatch = await query(
          `SELECT id FROM employees WHERE LOWER(employee_id) = LOWER($1) OR id::text = $1 OR LOWER(mobile_number) = LOWER($1) LIMIT 1`,
          [cleanCode]
        );
        if (empMatch.rows.length > 0) {
          validReferredByUuid = empMatch.rows[0].id;
        }
      } catch (e) {
        logger.warn('Failed to resolve referring employee code:', e.message);
      }
    }

    const cleanStr = (val) => (val && typeof val === 'string' && val.trim() ? val.trim() : null);

    const cleanSelectedHr = cleanStr(selected_hr);
    const cleanHrName = cleanStr(hr_name);

    // Resolve explicitly selected HR account (dropdown sends hr_id)
    const requestedHrId = cleanStr(hr_id) || cleanStr(assigned_hr_id);
    let assignedHrUser = null;
    if (requestedHrId) {
      const hrUserRes = await query(
        `SELECT id, full_name, email FROM users WHERE id = $1 AND UPPER(role) = 'HR' AND status = 'active' LIMIT 1`,
        [requestedHrId]
      );
      if (hrUserRes.rows.length > 0) assignedHrUser = hrUserRes.rows[0];
    }

    const OTHER_HR_VALUES = ['Other HR / Reference', 'Other'];
    const isRealHrSelected = !!assignedHrUser;
    const isOtherHr = OTHER_HR_VALUES.includes(cleanSelectedHr) || (!isRealHrSelected && !cleanSelectedHr);
    const finalHrName = isRealHrSelected
      ? assignedHrUser.full_name
      : (!isOtherHr ? cleanSelectedHr : null)
        || cleanHrName
        || cleanStr(hr_reference)
        || (!isUuid(referred_by_employee_id) && referred_by_employee_id ? String(referred_by_employee_id).trim() : (rawRefCode ? String(rawRefCode).trim() : null));

    const addressParts = [address_flat_no, address_society, address_area, address_city, address_district, address_state, pincode]
      .map(v => cleanStr(v)).filter(Boolean);
    const composedAddress = addressParts.length ? addressParts.join(', ') : null;
    const finalAddress = cleanStr(current_address) || composedAddress;
    
    const parseDate = (val) => {
      if (!val || typeof val !== 'string' || !val.trim()) return null;
      const clean = val.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
      const d = new Date(clean);
      return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
    };

    const parseNum = (val) => {
      if (val === null || val === undefined || val === '') return null;
      const numStr = String(val).replace(/[^0-9.]/g, '');
      if (!numStr) return null;
      const n = parseFloat(numStr);
      return isNaN(n) ? null : n;
    };

    const parseExpYears = (val) => {
      const n = parseNum(val);
      if (n === null) return 0;
      if (n < 0) return 0;
      if (n > 99.9) return 99.9;
      return Math.round(n * 10) / 10;
    };

    const parseSalary = (val) => {
      const n = parseNum(val);
      if (n === null) return null;
      if (n < 0) return 0;
      if (n > 99999999) return 99999999;
      return Math.round(n * 100) / 100;
    };

    const parseIntNum = (val) => {
      if (val === null || val === undefined || val === '') return null;
      const numStr = String(val).replace(/[^0-9]/g, '');
      if (!numStr) return null;
      const n = parseInt(numStr, 10);
      return isNaN(n) ? null : n;
    };

    const parseNoticeDays = (val) => {
      const n = parseIntNum(val);
      if (n === null) return 0;
      if (n < 0) return 0;
      if (n > 365) return 365;
      return n;
    };

    const parseBool = (val, defaultVal = false) => {
      if (val === true || val === 'true' || val === 1 || val === '1') return true;
      if (val === false || val === 'false' || val === 0 || val === '0') return false;
      return defaultVal;
    };

    const values = [
      reference_code,
      full_name.trim(),
      cleanStr(first_name),
      cleanStr(middle_name),
      cleanStr(last_name),
      parseIntNum(age),
      mobile_number.trim(),
      email_id.trim().toLowerCase(),
      parseDate(date_of_birth),
      finalAddress,
      cleanStr(address_flat_no),
      cleanStr(address_society),
      cleanStr(address_area),
      cleanStr(address_state),
      cleanStr(address_district),
      cleanStr(address_city),
      cleanStr(pincode),
      (highest_qualification || '').trim(),
      cleanStr(education_stream),
      cleanStr(education_detail),
      cleanStr(pursuing_year),
      parseIntNum(passing_year),
      experience_type || 'Fresher',
      parseExpYears(total_experience_years),
      cleanStr(current_company),
      cleanStr(current_designation),
      parseSalary(last_salary_ctc),
      parseSalary(expected_salary),
      parseSalary(previous_salary),
      parseBool(immediate_joining, true),
      parseNoticeDays(notice_period_days),
      parseBool(comfortable_with_location, true),
      parseBool(relevant_experience, true),
      cleanStr(how_did_you_hear),
      validReferredByUuid,
      resume_url,
      resume_file_name,
      cleanStr(target_role),
      cleanStr(finalHrName),
      cleanSelectedHr,
      cleanStr(hr_reference) || (isOtherHr ? cleanHrName : null),
      isRealHrSelected ? assignedHrUser.id : null,
      isRealHrSelected ? assignedHrUser.full_name : null
    ];

    const { rows } = await query(insertQuery, values);
    const registeredCand = rows[0];

    // Automatically create initial employee and onboarding record for Super Admin & HR visibility
    (async () => {
      try {
        const empCode = reference_code.replace('REF', 'EMP');
        const userRes = await query(
          `INSERT INTO users (full_name, mobile, email, role, status, employee_id, designation, department, password_hash)
           VALUES ($1, $2, $3, 'EMPLOYEE', 'pending', $4, $5, 'Sales & Support', '$2a$10$e8w.oF/9Z9sK.9J0U.Y0c.Z0/0.0.0.0.0.0.0.0.0.0')
           ON CONFLICT (mobile) DO UPDATE SET employee_id = EXCLUDED.employee_id RETURNING id`,
          [full_name.trim(), mobile_number.trim(), email_id.trim().toLowerCase(), empCode, target_role || 'TC']
        );
        const uId = userRes.rows[0]?.id;

        if (uId) {
          const empRes = await query(
            `INSERT INTO employees (
              employee_id, user_id, candidate_id, full_name, mobile_number, email_id,
              date_of_birth, current_address, designation, department, joining_date,
              employment_type, offered_salary, recruitment_source, employee_status, activation_status
            ) VALUES (
              $1, $2, $3, $4, $5, $6,
              $7, $8, $9, 'Sales & Support', CURRENT_DATE,
              $10, $11, $12, 'ONBOARDING', 'PENDING'
            ) ON CONFLICT (mobile_number) DO NOTHING RETURNING id`,
            [
              empCode, uId, registeredCand.id, full_name.trim(), mobile_number.trim(), email_id.trim().toLowerCase(),
              parseDate(date_of_birth), finalAddress, target_role || 'TC',
              experience_type === 'Fresher' ? 'Full-time' : 'Experienced', parseNum(expected_salary) || parseNum(previous_salary) || 18000, how_did_you_hear || 'Career Portal'
            ]
          );
          const eId = empRes.rows[0]?.id;

          if (eId) {
            await query(
              `INSERT INTO employee_onboarding_checklist (employee_id, interview_completed, employee_created, overall_progress, current_stage)
               VALUES ($1, true, true, 20, 'JOINING_FORM_PENDING') ON CONFLICT (employee_id) DO NOTHING`,
              [eId]
            );
          }
        }
      } catch (autoErr) {
        logger.warn('Auto-create employee registration background note:', autoErr.message);
      }
    })();

    // Send registration confirmation email to the candidate (non-blocking)
    if (email_id) {
      sendCandidateRegistrationSuccessEmail({
        candidateEmail: email_id.trim(),
        candidateName: full_name.trim(),
        referenceCode: reference_code,
        targetRole: target_role || current_designation || 'Candidate',
        mobileNumber: mobile_number.trim()
      }).catch((e) => logger.warn(`Candidate registration email failed: ${e.message}`));
    }

    // Check if candidate is assigned to a specific HR user and notify them via email
    if (assignedHrUser || finalHrName || validReferredByUuid) {
      (async () => {
        try {
          let hrEmail = null;
          let hrDisplayName = null;
          if (assignedHrUser) {
            hrEmail = assignedHrUser.email;
            hrDisplayName = assignedHrUser.full_name;
          } else {
            let hrRes;
            if (validReferredByUuid) {
              hrRes = await query(`SELECT email, full_name FROM users WHERE id = $1 OR employee_id = $1 LIMIT 1`, [validReferredByUuid]);
            }
            if ((!hrRes || hrRes.rows.length === 0) && finalHrName) {
              hrRes = await query(`SELECT email, full_name FROM users WHERE (full_name ILIKE $1 OR email ILIKE $1) AND role IN ('HR', 'ADMIN', 'SUPER_ADMIN') LIMIT 1`, [finalHrName]);
            }
            if (hrRes && hrRes.rows.length > 0) {
              hrEmail = hrRes.rows[0].email;
              hrDisplayName = hrRes.rows[0].full_name;
            }
          }

          if (hrEmail) {
            await sendCandidateAssignedToHrEmail({
              hrEmail,
              hrName: hrDisplayName || finalHrName || 'HR Manager',
              candidateName: full_name.trim(),
              referenceCode: reference_code,
              targetRole: target_role || current_designation || 'Candidate',
              candidateMobile: mobile_number.trim(),
              candidateEmail: email_id.trim()
            });
          }
        } catch (hrNotifyErr) {
          logger.warn(`Failed to dispatch candidate registration notification to HR: ${hrNotifyErr.message}`);
        }
      })();
    }

    res.status(201).json({
      success: true,
      message: 'Interview registration submitted successfully',
      reference_code: registeredCand.reference_code,
      data: {
        id: registeredCand.id,
        reference_code: registeredCand.reference_code,
        interview_status: registeredCand.interview_status,
        created_at: registeredCand.created_at
      }
    });

  } catch (err) {
    console.error('[CAREER CANDIDATE REGISTER ERROR]:', err);
    logger.error('[CAREER CANDIDATE REGISTER ERROR]:', err);
    res.status(500).json({ success: false, message: err.message || 'Registration error occurred. Please try again.' });
  }
});

// GET /api/v1/public/careers/reference-code/:mobile — Lookup reference code
router.get('/reference-code/:mobile', async (req, res, next) => {
  try {
    const { mobile } = req.params;
    const { rows } = await query(
      `SELECT reference_code, full_name, interview_status, created_at FROM employee_candidates WHERE mobile_number = $1`,
      [mobile]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No registration found for this mobile number' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/public/careers/status/:reference_code — Check candidate status
router.get('/status/:reference_code', async (req, res, next) => {
  try {
    const { reference_code } = req.params;
    const { rows } = await query(
      `SELECT reference_code, full_name, interview_status, interview_date, offered_designation, rejection_reason, created_at FROM employee_candidates WHERE reference_code = $1`,
      [reference_code]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invalid Reference Code' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
