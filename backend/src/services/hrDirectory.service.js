const { query } = require('../config/database');

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v.trim());

/**
 * Active HR login accounts for "Select HR" dropdowns (candidate registration, My Referrals).
 * Source of truth = users (role HR, status active) - the same rule registration uses to accept an HR.
 * hr_profiles is only used to prefer the profile's display name, so HR accounts that were never synced
 * into hr_profiles still appear. Returns [{ id: users.id, full_name }].
 */
async function listActiveHrAccounts() {
  const { rows } = await query(
    `SELECT u.id,
            COALESCE(NULLIF(TRIM(u.full_name), ''), NULLIF(TRIM(hp.full_name), '')) AS full_name
       FROM users u
       LEFT JOIN LATERAL (
         SELECT full_name FROM hr_profiles WHERE user_id = u.id ORDER BY updated_at DESC NULLS LAST LIMIT 1
       ) hp ON TRUE
      WHERE UPPER(u.role::text) = 'HR'
        AND LOWER(u.status::text) = 'active'
        AND COALESCE(NULLIF(TRIM(u.full_name), ''), NULLIF(TRIM(hp.full_name), '')) IS NOT NULL
      ORDER BY 2 ASC`
  );
  return rows;
}

/**
 * Resolves the HR user a candidate selected. Prefers the id sent by the dropdown (must be a UUID);
 * falls back to an exact, unique, case-insensitive name match. Returns { id, full_name, email } or null.
 */
async function resolveActiveHr({ hrId, hrName } = {}) {
  if (isUuid(hrId)) {
    const { rows } = await query(
      `SELECT id, full_name, email FROM users
        WHERE id = $1 AND UPPER(role::text) = 'HR' AND LOWER(status::text) = 'active' LIMIT 1`,
      [hrId.trim()]
    );
    if (rows[0]) return rows[0];
  }
  const name = typeof hrName === 'string' ? hrName.trim() : '';
  if (name && !['other', 'other hr / reference'].includes(name.toLowerCase())) {
    const { rows } = await query(
      `SELECT id, full_name, email FROM users
        WHERE UPPER(role::text) = 'HR' AND LOWER(status::text) = 'active'
          AND LOWER(TRIM(full_name)) = LOWER($1) LIMIT 2`,
      [name]
    );
    if (rows.length === 1) return rows[0]; // ambiguous names are not auto-assigned
  }
  return null;
}

module.exports = { listActiveHrAccounts, resolveActiveHr, isUuid };

