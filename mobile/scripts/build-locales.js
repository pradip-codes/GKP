// Builds mobile/locales/{lng}/translation.json by merging:
//   1. website translations (frontend/public/locales/{lng}/translation.json)
//      - explicit key map (WEB_MAP)
//      - automatic value matching: if a mobile English string exists verbatim
//        anywhere in the website English file, reuse that key's translation
//   2. existing mobile file (hand-written translations win)
//   3. per-language overrides (mobile/i18n/overrides/{lng}.js)
//   4. English mobile file as final fallback
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WEB_LOCALES = path.join(ROOT, '..', 'frontend', 'public', 'locales');
const LANGS = ['en', 'hi', 'bn', 'gu', 'mr', 'kn', 'or', 'ta', 'te'];

const OVERRIDES = {};
for (const lng of LANGS) {
  try { OVERRIDES[lng] = require(path.join(ROOT, 'i18n', 'overrides', lng + '.js')); }
  catch { OVERRIDES[lng] = {}; }
}

const enMobile = JSON.parse(fs.readFileSync(path.join(ROOT, 'locales', 'en', 'translation.json'), 'utf8'));

const WEB_MAP = {
  'common.loading': ['common', 'loading'],
  'common.save': ['common', 'save'],
  'common.cancel': ['common', 'cancel'],
  'common.submit': ['common', 'submit'],
  'common.confirm': ['common', 'confirm'],
  'common.delete': ['common', 'delete'],
  'common.edit': ['common', 'edit'],
  'common.close': ['common', 'close'],
  'common.back': ['common', 'back'],
  'common.next': ['common', 'next'],
  'common.search': ['common', 'search'],
  'common.refresh': ['common', 'refresh'],
  'common.viewAll': ['common', 'viewDetails'],
  'common.noData': ['common', 'noData'],
  'common.retry': ['common', 'error'],
  'common.actions': ['common', 'actions'],
  'common.download': ['common', 'download'],
  'common.pending': ['status', 'pending'],
  'common.approved': ['status', 'approved'],
  'common.rejected': ['status', 'rejected'],
  'common.active': ['status', 'active'],
  'common.inactive': ['status', 'inactive'],
  'nav.home': ['nav', 'home'],
  'nav.login': ['nav', 'login'],
  'nav.register': ['nav', 'register'],
  'nav.dashboard': ['adminLayout', 'dashboard'],
  'nav.partners': ['adminLayout', 'partners'],
  'nav.withdrawals': ['adminLayout', 'withdrawals'],
  'nav.wallet': ['partnerLayout', 'wallet'],
  'nav.profile': ['partnerLayout', 'profile'],
  'nav.support': ['partnerLayout', 'support'],
  'nav.applications': ['adminLayout', 'applications'],
  'nav.leads': ['adminLayout', 'leads'],
  'nav.reports': ['superAdminLayout', 'reports'],
  'nav.products': ['superAdminLayout', 'products'],
  'settings.title': ['settings', 'title'],
  'settings.changePassword': ['settings', 'changePassword'],
  'settings.notifications': ['settings', 'notifications'],
  'settings.oldPassword': ['settings', 'currentPassword'],
  'settings.newPassword': ['settings', 'newPassword'],
  'settings.confirmPassword': ['settings', 'confirmNewPassword'],
  'status.pending': ['status', 'pending'],
  'status.approved': ['status', 'approved'],
  'status.rejected': ['status', 'rejected'],
  'status.active': ['status', 'active'],
  'status.inactive': ['status', 'inactive'],
};

function getPath(obj, p) {
  return p.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}
function setPath(obj, p, v) {
  const ks = p.split('.');
  let o = obj;
  for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]] = o[ks[i]] || {};
  o[ks[ks.length - 1]] = v;
}
function flatten(obj, prefix = '', out = {}) {
  for (const k of Object.keys(obj)) {
    const p = prefix ? prefix + '.' + k : k;
    if (obj[k] && typeof obj[k] === 'object') flatten(obj[k], p, out);
    else out[p] = obj[k];
  }
  return out;
}
function deepMerge(base, over) {
  for (const k of Object.keys(over)) {
    if (over[k] && typeof over[k] === 'object' && !Array.isArray(over[k])) {
      base[k] = deepMerge(base[k] && typeof base[k] === 'object' ? base[k] : {}, over[k]);
    } else if (over[k] !== undefined && over[k] !== null) {
      base[k] = over[k];
    }
  }
  return base;
}

const enFlat = flatten(enMobile);
const webEn = JSON.parse(fs.readFileSync(path.join(WEB_LOCALES, 'en', 'translation.json'), 'utf8'));
const webEnFlat = flatten(webEn);
// english string -> website dot path (first occurrence wins)
const enValueToPath = {};
for (const [p, v] of Object.entries(webEnFlat)) {
  if (typeof v === 'string' && v.trim() && !enValueToPath[v]) enValueToPath[v] = p;
}

for (const lng of LANGS) {
  if (lng === 'en') continue;
  const web = JSON.parse(fs.readFileSync(path.join(WEB_LOCALES, lng, 'translation.json'), 'utf8'));
  const webLngFlat = flatten(web);
  const out = {};

  for (const [mKey, v] of Object.entries(enFlat)) {
    // a) explicit map
    if (WEB_MAP[mKey]) {
      const [ns, wKey] = WEB_MAP[mKey];
      const val = getPath(web[ns], wKey);
      if (val) { setPath(out, mKey, val); continue; }
    }
    // b) value match against website english
    const wPath = enValueToPath[v];
    if (wPath && webLngFlat[wPath]) { setPath(out, mKey, webLngFlat[wPath]); continue; }
  }

  // c) existing hand-written mobile file
  const existingPath = path.join(ROOT, 'locales', lng, 'translation.json');
  if (fs.existsSync(existingPath)) {
    try { deepMerge(out, JSON.parse(fs.readFileSync(existingPath, 'utf8'))); } catch {}
  }

  // d) overrides
  deepMerge(out, OVERRIDES[lng] || {});

  // e) english fallback for anything missing
  const outFlat = flatten(out);
  for (const [p, v2] of Object.entries(enFlat)) {
    if (outFlat[p] === undefined) setPath(out, p, v2);
  }

  const dir = path.join(ROOT, 'locales', lng);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'translation.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');

  const finalFlat = flatten(out);
  const stillEnglish = Object.keys(enFlat).filter((p) => finalFlat[p] === enFlat[p]);
  console.log(lng + ': ' + Object.keys(enFlat).length + ' keys, ' + stillEnglish.length + ' still-english');
  if (stillEnglish.length) console.log('   e.g. ' + stillEnglish.slice(0, 12).join(', '));
}
console.log('DONE');
