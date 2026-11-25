/**
 * One-off, guarded migration: HDFC CARD-WISE apply links (Partner + Public)
 * ---------------------------------------------------------------------------------
 * Source: HDFC_Process_Link.xlsx (sheet "Partner" -> products.partner_url, sheet "Public" -> products.public_url).
 * Each card variant has its own CHANNELSOURCE link, e.g. Pixel Play/Go = ZETA, Swiggy = SWCC.
 *
 * SAFE BY DEFAULT:
 *   node src/database/migrations/migrate_hdfc_card_wise_links.js            # DRY-RUN: prints matches, ROLLBACK
 *   node src/database/migrations/migrate_hdfc_card_wise_links.js --apply    # COMMIT (runs once, sets a flag)
 *   node src/database/migrations/migrate_hdfc_card_wise_links.js --apply --force   # re-apply even if flag exists
 *
 * It is NOT part of deploy.yml on purpose: it overwrites product links, so it must be run deliberately,
 * once, after checking the dry-run output (every product name must land under the right card).
 */
const FLAG_KEY = 'migration_hdfc_card_wise_links_v1';

// HDFC Bank + Tata Co-brand HDFC bank ids
const HDFC_BANK_IDS = ['f0b5742d-f04d-4a91-b162-6009ddf6e345', '1eacfa67-1187-48c7-adde-8a6edcfe9969'];

const BASE_HTML = 'https://applyonline.hdfc.bank.in/cards/credit-cards.html';
const BASE_PLAIN = 'https://applyonline.hdfc.bank.in/cards/credit-cards';
const tail = (dsa, lg) => `CHANNEL=DSA&DSACode=${dsa}&LGcode=${lg}&LCcode=${lg}&LC2=${lg}&SMcode=S54558`;
const PARTNER_TAIL = tail('XSPY', 'PTY01'); // sheet "Partner"
const PUBLIC_TAIL = tail('XYOH', 'DIG01');  // sheet "Public"

// prefix: 'CHANNELSOURCE=ZETA' | 'FUNC=FLOAT' | null (generic page without .html)
const link = (prefix, t) => (prefix ? `${BASE_HTML}?${prefix}&${t}` : `${BASE_PLAIN}?${t}`);
const card = (label, match, exclude, prefix, publicTail = PUBLIC_TAIL) => ({
  label, match, exclude,
  partner_url: link(prefix, PARTNER_TAIL),
  public_url: link(prefix, publicTail),
});

const CARD_LINKS = [
  card('Freedom, Millennia, Money Back', ['%freedom%', '%millennia%', '%money%back%'], [], 'FUNC=FLOAT'),
  // NOTE: the Public sheet row for Tata Neu has DSACode=XSPY with LGcode=DIG01 (all other Public rows use XYOH).
  // Copied verbatim from the sheet. Confirm with ops; if it is a typo change tail('XSPY', 'DIG01') to PUBLIC_TAIL.
  card('Tata Neu Plus, Tata Neu Infinity', ['%tata%neu%plus%', '%tata%neu%infinity%'], ['%business%', '%floater%'], 'CHANNELSOURCE=TDCC', tail('XSPY', 'DIG01')),
  card('Marriott Card', ['%marriott%'], [], 'CHANNELSOURCE=MRTB'),
  card('Swiggy Card', ['%swiggy%'], [], 'CHANNELSOURCE=SWCC'),
  card('IRCTC Card', ['%irctc%'], [], 'CHANNELSOURCE=IRCT'),
  card('Biz Grow, Biz First', ['%biz%grow%', '%biz%first%'], [], 'CHANNELSOURCE=BIZC'),
  card('Indian Oil', ['%indian%oil%', '%iocl%'], [], 'CHANNELSOURCE=IOCL'),
  card('GIGA Card', ['%giga%'], [], 'CHANNELSOURCE=GIGA'),
  card('Pixel Play, Pixel Go', ['%pixel%play%', '%pixel%go%', '%zeta%'], [], 'CHANNELSOURCE=ZETA'),
  card('Diners Privillege Card', ['%diners%priv%'], [], null),
  card('Diners Black', ['%diners%black%'], [], null),
  card('Regalia', ['%regalia%'], [], null),
];

// Cards whose Public link looks inconsistent in the sheet and must be double checked by ops.
// (Public sheet, Tata Neu row uses DSACode=XSPY with LGcode=DIG01, every other Public row uses DSACode=XYOH.)
const NEEDS_REVIEW = ['Tata Neu Plus, Tata Neu Infinity'];

const BANK_SCOPE_SQL = `(b.name ILIKE '%hdfc%' OR b.short_code ILIKE '%hdfc%' OR p.bank_id = ANY($1::uuid[]))`;

const buildMatchSql = (rule, startIdx) => {
  const params = [];
  const include = rule.match.map((m) => { params.push(m); return `p.name ILIKE $${startIdx + params.length - 1}`; }).join(' OR ');
  const exclude = rule.exclude.map((m) => { params.push(m); return `p.name NOT ILIKE $${startIdx + params.length - 1}`; }).join(' AND ');
  const sql = `(${include})${exclude ? ` AND ${exclude}` : ''}`;
  return { sql, params };
};

async function migrateHdfcCardWiseLinks({ apply = false, force = false, db = null, log = console.log } = {}) {
  const database = db || require('../../config/database');
  const client = await database.getClient();
  const summary = { apply, skipped: false, rules: [] };

  try {
    await client.query('BEGIN');

    if (apply && !force) {
      const { rows } = await client.query(`SELECT value FROM system_settings WHERE key = $1`, [FLAG_KEY]).catch(() => ({ rows: [] }));
      if (rows.length) {
        log(`[hdfc-card-links] Flag ${FLAG_KEY} already set (${rows[0].value}). Nothing to do. Use --force to re-apply.`);
        await client.query('ROLLBACK');
        summary.skipped = true;
        return summary;
      }
    }

    for (const rule of CARD_LINKS) {
      const { sql, params } = buildMatchSql(rule, 2);
      const where = `${BANK_SCOPE_SQL} AND ${sql}`;

      const { rows: matched } = await client.query(
        `SELECT p.id, p.name, p.partner_url AS old_partner_url, p.public_url AS old_public_url
           FROM products p LEFT JOIN banks b ON b.id = p.bank_id
          WHERE ${where}
          ORDER BY p.name`,
        [HDFC_BANK_IDS, ...params]
      );

      log(`\n[hdfc-card-links] ${rule.label}  ->  ${matched.length} product(s)${NEEDS_REVIEW.includes(rule.label) ? '   (!! REVIEW: see NEEDS_REVIEW note)' : ''}`);
      matched.forEach((m) => log(`    - ${m.name}`));

      let updated = 0;
      if (matched.length) {
        const res = await client.query(
          `UPDATE products p
              SET partner_url = $${params.length + 2},
                  public_url = $${params.length + 3},
                  updated_at = NOW()
             FROM banks b
            WHERE b.id = p.bank_id AND ${where}`,
          [HDFC_BANK_IDS, ...params, rule.partner_url, rule.public_url]
        );
        updated = res.rowCount || 0;
      }
      summary.rules.push({ label: rule.label, matched: matched.map((m) => m.name), updated });
    }

    if (apply) {
      await client.query(
        `INSERT INTO system_settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [FLAG_KEY, new Date().toISOString()]
      ).catch((e) => log(`[hdfc-card-links] Could not write flag (non-fatal): ${e.message}`));
      await client.query('COMMIT');
      log('\n[hdfc-card-links] COMMITTED.');
    } else {
      await client.query('ROLLBACK');
      log('\n[hdfc-card-links] DRY-RUN complete. ROLLED BACK. Pass --apply to commit.');
    }
    return summary;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    log(`[hdfc-card-links] ERROR, rolled back: ${err.message}`);
    throw err;
  } finally {
    if (typeof client.release === 'function') client.release();
  }
}

if (require.main === module) {
  require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
  const apply = process.argv.includes('--apply');
  const force = process.argv.includes('--force');
  console.log(`[hdfc-card-links] Mode: ${apply ? 'APPLY (COMMIT)' : 'DRY-RUN (ROLLBACK)'}${force ? ' + FORCE' : ''}`);
  migrateHdfcCardWiseLinks({ apply, force })
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { migrateHdfcCardWiseLinks, CARD_LINKS, HDFC_BANK_IDS, NEEDS_REVIEW, FLAG_KEY };
