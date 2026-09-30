// Resolve every require/import in live files to an actual path;
// flag any that resolve to a deleted (dead) file.
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const dead = fs.readFileSync('scripts-dev/dead-files.txt', 'utf8')
  .split(/\r?\n/).map(s => s.trim()).filter(Boolean);
const deadSet = new Set(dead);

const live = cp.execSync('git ls-files', { encoding: 'utf8' })
  .split(/\r?\n/).filter(f => /\.(jsx?|tsx?)$/.test(f));

const REQ = /(?:require\(|from\s+|import\s*\(\s*|import\s+[^'"]*from\s*)['"`]([^'"`]+)['"`]/g;
const EXTS = ['.js', '.jsx', '.ts', '.tsx', '/index.js', '/index.jsx', '/index.ts', '/index.tsx'];

function resolveImport(spec, importer) {
  if (!spec.startsWith('.')) return null; // package or alias — skip
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(importer), spec));
  const cands = [base, ...EXTS.map(e => base + e)];
  for (const c of cands) if (deadSet.has(c)) return c;
  return null;
}

const hits = [];
for (const f of live) {
  let src; try { src = fs.readFileSync(f, 'utf8'); } catch { continue; }
  let m;
  while ((m = REQ.exec(src))) {
    const r = resolveImport(m[1], f.replace(/\\/g, '/'));
    if (r) hits.push(`${r}  <-  ${f}  (${m[1]})`);
  }
}
console.log(`REAL broken references: ${hits.length}`);
hits.forEach(h => console.log(h));
