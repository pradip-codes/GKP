// Fills still-English leaf values in frontend/public/locales/{lng}/translation.json
// using the free Google Translate gtx endpoint (via curl — node fetch is TLS-blocked).
// Skips strings with {{ }} placeholders to protect i18next interpolation.
// Usage: node scripts/translate-web-gaps.js [lng ...]
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const LOCALES = path.join(__dirname, '..', 'public', 'locales');
const LANGS = process.argv.slice(2).length ? process.argv.slice(2) : ['hi', 'bn', 'gu', 'mr', 'kn', 'or', 'ta', 'te'];

function flatten(obj, prefix = '', out = {}) {
  for (const k of Object.keys(obj)) {
    const p = prefix ? prefix + '.' + k : k;
    if (obj[k] && typeof obj[k] === 'object') flatten(obj[k], p, out);
    else out[p] = obj[k];
  }
  return out;
}
function setPath(obj, p, v) {
  const ks = p.split('.');
  let o = obj;
  for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]] = o[ks[i]] || {};
  o[ks[ks.length - 1]] = v;
}

const SKIP = /^(GharKaPaisa|OTP|PAN|KYC|HR|PDF|FAQ|EMI|Udyam|GSTIN|API|UIDAI|NPCI|TDS|PF|ESI|PT|CIBIL|DOB|ID|DTH|FASTag|UPI|NEFT|RTGS|IMPS|VPA|BBPS|CKYC|SMS|URL|IP|OS|UI|JSON|SQL|HTTP|HTTPS|SSL|AES|RSA|OTP)$/;
const HAS_PLACEHOLDER = /\{\{|\}\}/;

function curlJson(url) {
  return new Promise((resolve, reject) => {
    execFile('curl', ['-s', '--max-time', '20', url], { maxBuffer: 4 * 1024 * 1024 }, (err, stdout) => {
      if (err) return reject(err);
      try { resolve(JSON.parse(stdout)); } catch (e) { reject(e); }
    });
  });
}
async function translate(text, tl) {
  const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=' + tl + '&dt=t&q=' + encodeURIComponent(text);
  const data = await curlJson(url);
  return (data[0] || []).map((s) => s[0]).join('');
}
async function pool(items, fn, size = 6) {
  const results = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }));
  return results;
}

(async () => {
  const enFlat = flatten(JSON.parse(fs.readFileSync(path.join(LOCALES, 'en', 'translation.json'), 'utf8')));

  for (const lng of LANGS) {
    const file = path.join(LOCALES, lng, 'translation.json');
    const cur = JSON.parse(fs.readFileSync(file, 'utf8'));
    const curFlat = flatten(cur);
    const gaps = Object.keys(enFlat).filter((p) =>
      curFlat[p] !== undefined && curFlat[p] === enFlat[p] && typeof enFlat[p] === 'string' && !SKIP.test(enFlat[p]) && !HAS_PLACEHOLDER.test(enFlat[p]));
    console.log(lng + ': ' + gaps.length + ' strings to translate');
    if (!gaps.length) continue;

    const translated = await pool(gaps, async (p) => {
      for (let attempt = 0; attempt < 3; attempt++) {
        try { return await translate(enFlat[p], lng); }
        catch (e) { await new Promise((r) => setTimeout(r, 500 * (attempt + 1))); }
      }
      return null;
    });

    let ok = 0;
    gaps.forEach((p, i) => {
      if (translated[i]) { setPath(cur, p, translated[i]); ok++; }
    });
    fs.writeFileSync(file, JSON.stringify(cur, null, 2) + '\n', 'utf8');
    console.log(lng + ': applied ' + ok + '/' + gaps.length);
    await new Promise((r) => setTimeout(r, 300));
  }
  console.log('DONE');
})();
