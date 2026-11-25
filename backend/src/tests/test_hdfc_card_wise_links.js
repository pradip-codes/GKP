/**
 * HDFC card-wise Direct Process links.
 * Bug: "direct bank process" for Pixel opened the Swiggy link because ONE bank-level link beat the card's own link.
 */
const assert = require('assert');
const path = require('path');
const crypto = require('crypto');
const { pathToFileURL } = require('url');
const { resolveDirectProcessLinkForProductRow: resolve, isHdfcProductRow, getBankApplyLinkBackend } = require('../services/bankLink.service');
const { CARD_LINKS, migrateHdfcCardWiseLinks, FLAG_KEY, HDFC_BANK_IDS } = require('../database/migrations/migrate_hdfc_card_wise_links');

const SWIGGY = 'https://applyonline.hdfc.bank.in/cards/credit-cards.html?CHANNELSOURCE=SWCC&CHANNEL=DSA&DSACode=XSPY&LGcode=PTY01&LCcode=PTY01&LC2=PTY01&SMcode=S54558';
const ZETA = SWIGGY.replace('SWCC', 'ZETA');

(async () => {
  // 1. backend resolver
  const pixel = { name: 'HDFC Pixel Play Credit Card', bank_name: 'HDFC Bank', partner_url: ZETA, bank_direct_process_link: SWIGGY };
  assert.strictEqual(resolve(pixel, getBankApplyLinkBackend).url, ZETA, 'Pixel must use its own link, not the bank-level Swiggy link');
  assert.strictEqual(resolve({ ...pixel, partner_url: '', public_url: '' }, getBankApplyLinkBackend).url, SWIGGY, 'no card link -> bank-level link');
  assert.strictEqual(resolve({ ...pixel, partner_url: 'not a url' }, getBankApplyLinkBackend).url, SWIGGY, 'invalid card link -> bank-level link');
  assert(isHdfcProductRow({ name: 'Tata Neu Plus', bank_id: HDFC_BANK_IDS[1] }));
  const other = { name: 'Poonawalla Loan', bank_name: 'Poonawalla', partner_url: 'https://old.example.com/p', bank_direct_process_link: 'https://bank.example.com/direct' };
  assert.strictEqual(resolve(other).url, 'https://bank.example.com/direct', 'non-HDFC unchanged');
  console.log('✓ backend resolver: HDFC card link wins, fallbacks kept, other banks unchanged');

  // 2. frontend helper
  const h = await import(pathToFileURL(path.join(__dirname, '../../../frontend/src/modules/home/components/CreditCards/cardLinkHelper.js')).href);
  assert.strictEqual(h.getDirectProcessLink(pixel), ZETA);
  assert.strictEqual(h.getDirectProcessLink({ ...pixel, partner_url: '' }), SWIGGY);
  assert.strictEqual(h.getDirectProcessLink({ name: 'SBI Card', bank_name: 'SBI', partner_url: 'https://www.sbicard.com/a', bank_direct_process_link: 'https://b.example.com/d' }), 'https://b.example.com/d');
  console.log('✓ frontend getDirectProcessLink: same rule');

  // 3. data = Excel (24 links, exact) + structure
  assert.strictEqual(CARD_LINKS.length, 12);
  const sha = crypto.createHash('sha256').update(CARD_LINKS.map((c) => `${c.partner_url}|${c.public_url}`).join('\n')).digest('hex');
  assert.strictEqual(sha, '4a9893b238d55185d347bfb914d288fcd0fe56f74328f871a3ce13c0c0923952', 'links must equal HDFC_Process_Link.xlsx');
  CARD_LINKS.forEach((c) => assert(/DSACode=XSPY&LGcode=PTY01/.test(c.partner_url) && /LGcode=DIG01/.test(c.public_url), c.label));
  console.log('✓ 12 cards / 24 links are byte-for-byte the Excel (Partner -> partner_url, Public -> public_url)');
  if (/DSACode=XSPY/.test(CARD_LINKS[1].public_url)) console.log('! Public Tata Neu link has DSACode=XSPY (other Public rows use XYOH). Verbatim from sheet - confirm with ops.');

  // 4. every sample name maps to exactly one rule
  const ilike = (n, p) => new RegExp('^' + p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$', 'i').test(n);
  const ruleFor = (n) => CARD_LINKS.filter((r) => r.match.some((m) => ilike(n, m)) && !r.exclude.some((m) => ilike(n, m))).map((r) => r.label);
  const samples = {
    'HDFC Pixel Play Credit Card': 'Pixel Play, Pixel Go', 'HDFC Pixel Go Credit Card': 'Pixel Play, Pixel Go', 'Swiggy HDFC Bank Credit Card': 'Swiggy Card',
    'HDFC Freedom Credit Card': 'Freedom, Millennia, Money Back', 'HDFC MoneyBack+ Credit Card': 'Freedom, Millennia, Money Back',
    'Tata Neu Plus HDFC Bank Credit Card': 'Tata Neu Plus, Tata Neu Infinity', 'Marriott Bonvoy HDFC Bank Credit Card': 'Marriott Card',
    'IRCTC HDFC Bank Credit Card': 'IRCTC Card', 'HDFC Biz Grow Credit Card': 'Biz Grow, Biz First', 'Indian Oil HDFC Bank Credit Card': 'Indian Oil',
    'HDFC Giga Credit Card': 'GIGA Card', 'Diners Club Privilege Credit Card': 'Diners Privillege Card', 'Diners Club Black Credit Card': 'Diners Black',
    'HDFC Regalia Gold Credit Card': 'Regalia', 'Tata Neu Business Credit Card': null, 'Tata Neu Plus Floater Credit Card': null, 'HDFC Infinia Credit Card': null,
  };
  for (const [n, want] of Object.entries(samples)) assert.deepStrictEqual(ruleFor(n), want ? [want] : [], n);
  console.log('✓ product names map to exactly one card rule (Pixel never gets Swiggy; Business/Floater/Infinia untouched)');

  // 5. migration safety with a fake DB
  const fakeDb = (flag = false) => {
    const calls = [];
    const client = { release() {}, async query(sql, params) {
      const s = String(sql).trim(); calls.push({ s, params });
      if (/^SELECT value FROM system_settings/i.test(s)) return { rows: flag ? [{ value: 'done' }] : [] };
      if (/^SELECT p\.id, p\.name/i.test(s)) return { rows: [{ id: '1', name: 'Fake Card' }] };
      if (/^UPDATE products/i.test(s)) return { rowCount: 1 };
      return { rows: [], rowCount: 0 };
    } };
    return { db: { getClient: async () => client }, calls };
  };
  const q = () => {};
  let f = fakeDb(); await migrateHdfcCardWiseLinks({ db: f.db, log: q });
  assert(f.calls.some((c) => c.s === 'ROLLBACK') && !f.calls.some((c) => c.s === 'COMMIT'), 'dry-run must roll back');
  f = fakeDb(); await migrateHdfcCardWiseLinks({ apply: true, db: f.db, log: q });
  const ups = f.calls.filter((c) => /^UPDATE products/i.test(c.s));
  assert.strictEqual(ups.length, 12);
  assert(ups.every((u) => /SET partner_url = \$\d+,\s+public_url = \$\d+/.test(u.s)), 'only partner_url/public_url are written');
  const px = ups.find((u) => u.params.includes('%pixel%play%'));
  assert(px.params.some((p) => /CHANNELSOURCE=ZETA/.test(String(p))) && !px.params.some((p) => /SWCC/.test(String(p))));
  assert(f.calls.some((c) => c.s === 'COMMIT') && f.calls.some((c) => /INSERT INTO system_settings/i.test(c.s) && c.params[0] === FLAG_KEY));
  f = fakeDb(true); const r = await migrateHdfcCardWiseLinks({ apply: true, db: f.db, log: q });
  assert(r.skipped && !f.calls.some((c) => /^UPDATE products/i.test(c.s)), 'flag must block a second run');
  f = fakeDb(true); await migrateHdfcCardWiseLinks({ apply: true, force: true, db: f.db, log: q });
  assert(f.calls.some((c) => c.s === 'COMMIT'), '--force re-applies');
  console.log('✓ migration: dry-run rolls back, --apply commits once + sets flag, flag blocks re-run, --force works');

  console.log('\n✓ All HDFC card-wise link tests passed!');
})().catch((e) => { console.error('✗ TEST FAILED:', e.message); process.exit(1); });
