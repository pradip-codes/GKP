const { query } = require('../../config/database');
const logger = require('../../config/logger');

// Per-card HDFC Bank apply links — each card variant uses its own CHANNELSOURCE code.
// Source: HDFC DSA applyonline links provided by ops.
const BASE = 'https://applyonline.hdfc.bank.in/cards/credit-cards.html';
const COMMON = 'CHANNEL=DSA&DSACode=XSPY&LGcode=PTY01&LCcode=PTY01&LC2=PTY01&SMcode=S54558';
const url = (extra) => `${BASE}?${extra}&${COMMON}`;

const CARD_LINKS = [
  // FUNC=FLOAT variant (no CHANNELSOURCE)
  { match: ['%freedom%', '%millennia%', '%money%back%'], url: `${BASE}?FUNC=FLOAT&${COMMON}` },
  // Branded / co-brand cards with CHANNELSOURCE
  { match: ['%tata%neu%plus%', '%tata%neu%infinity%'], url: url('CHANNELSOURCE=TDCC') },
  { match: ['%marriott%'], url: url('CHANNELSOURCE=MRTB') },
  { match: ['%swiggy%'], url: url('CHANNELSOURCE=SWCC') },
  { match: ['%irctc%'], url: url('CHANNELSOURCE=IRCT') },
  { match: ['%biz%grow%', '%biz%first%'], url: url('CHANNELSOURCE=BIZC') },
  { match: ['%indian%oil%', '%iocl%'], url: url('CHANNELSOURCE=IOCL') },
  { match: ['%giga%'], url: url('CHANNELSOURCE=GIGA') },
  { match: ['%pixel%play%', '%pixel%go%', '%zeta%'], url: url('CHANNELSOURCE=ZETA') },
  // Diners / Regalia family — generic HDFC apply page (no CHANNELSOURCE)
  { match: ['%diners%privilege%', '%diners%black%', '%regalia%', '%diners%club%'], url: `https://applyonline.hdfc.bank.in/cards/credit-cards?${COMMON}` },
];

async function migrateHdfcCardChannelLinks() {
  logger.info('[MIGRATION] Applying per-card HDFC channel links to products...');

  for (const rule of CARD_LINKS) {
    const conditions = rule.match.map((m, i) => `p.name ILIKE $${i + 2}`).join(' OR ');
    const result = await query(
      `UPDATE products p
       SET partner_url = $1,
           public_url = COALESCE(NULLIF(p.public_url, ''), $1),
           updated_at = NOW()
       FROM banks b
       WHERE p.bank_id = b.id
         AND (b.name ILIKE '%hdfc%' OR b.short_code ILIKE '%hdfc%' OR b.code ILIKE '%hdfc%')
         AND (${conditions})`,
      [rule.url, ...rule.match]
    ).catch((e) => {
      logger.warn(`[HDFC-LINKS] Rule failed for ${rule.match[0]}: ${e.message}`);
      return { rowCount: 0 };
    });
    logger.info(`[HDFC-LINKS] ${rule.match.join('/')} → ${result.rowCount || 0} product(s) updated`);
  }
}

module.exports = migrateHdfcCardChannelLinks;
