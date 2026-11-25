// Codemod: replace hardcoded hex/rgba literals in super-admin screens with
// theme `colors.*` tokens — only for values that map to exactly ONE token
// (ambiguous values like #FFFFFF are left untouched to preserve contrast).
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'app', '(app)', 'super-admin');

// value(lowercase) -> token   (unambiguous entries only, verified against theme/colors.ts)
const MAP = {
  '#1b74bb': 'primary',
  '#0851a1': 'primaryDark',
  '#9cd83d': 'accent',
  '#3b82f6': 'primaryLight',
  '#ebf3fb': 'primarySoft',
  '#7bc32e': 'accentDark',
  '#d9f7b3': 'accentLight',
  '#fff1df': 'goldSoft',
  '#8b5cf6': 'purple',
  '#f1ebff': 'purpleLight',
  '#eaf2ff': 'blueLight',
  '#008a60': 'teal',
  '#007f5b': 'tealDim',
  'rgba(27, 116, 187, 0.15)': 'tealGlow',
  '#f5f8fc': 'bg',
  '#f8fafc': 'bgTertiary',
  '#cbd5e1': 'inputBorder',
  '#172b43': 'text',
  '#64748b': 'textMid',
  '#94a3b8': 'textLight',
  '#e2e8f0': 'border',
  '#f1f5f9': 'borderLight',
  '#10b981': 'success',
  '#d1fae5': 'successSoft',
  '#fef3c7': 'warningSoft',
  '#fee2e2': 'errorSoft',
  '#dbeafe': 'infoSoft',
};

const files = fs.readdirSync(DIR).filter(f => f.endsWith('.tsx'));
let totalRepl = 0;
for (const file of files) {
  const fp = path.join(DIR, file);
  let src = fs.readFileSync(fp, 'utf8');
  if (!/import\s*\{[^}]*\bcolors\b[^}]*\}\s*from\s*['"][^'"]*theme\/colors['"]/.test(src)) {
    console.log(`SKIP ${file} (no colors import)`);
    continue;
  }
  let count = 0;
  // replace quoted literals only: '#xxx' or 'rgba(...)'
  src = src.replace(/'(#[0-9a-fA-F]{6}|rgba?\([^)]+\))'/g, (m, val) => {
    const key = val.toLowerCase().replace(/\s+/g, ' ');
    const token = MAP[key];
    if (token) { count++; return `colors.${token}`; }
    return m;
  });
  if (count > 0) {
    fs.writeFileSync(fp, src);
    totalRepl += count;
    console.log(`${file}: ${count} replacements`);
  }
}
console.log(`TOTAL: ${totalRepl} replacements across ${files.length} files`);
