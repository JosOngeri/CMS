// Verify each "dead" file is truly unreferenced by live files.
// Reads dead list from scripts-dev/dead-files.txt (CRLF-tolerant).
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const dead = fs.readFileSync('scripts-dev/dead-files.txt', 'utf8')
  .split(/\r?\n/).map(s => s.trim()).filter(Boolean);
const deadSet = new Set(dead);

const live = cp.execSync('git ls-files', { encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(f => /\.(jsx?|tsx?|dart)$/.test(f))
  .filter(f => !deadSet.has(f));

const importLine = /require\(|^\s*import |from\s+['"]|export\s+.*from\s+['"]/;
const flagged = [];

for (const d of dead) {
  const stem = path.basename(d).replace(/\.(jsx?|tsx?|dart)$/, '');
  if (stem.length < 3) continue;
  const needle = '/' + stem; // match path-style imports like ../x/pagination
  const bareNeedle = stem;
  for (const f of live) {
    let src;
    try { src = fs.readFileSync(f, 'utf8'); } catch { continue; }
    const hit = src.split('\n').some(l =>
      importLine.test(l) && (l.includes(needle) || new RegExp(`['"\`]${bareNeedle}['"\`]`).test(l))
    );
    if (hit) { flagged.push(`${d}  <-  ${f}`); break; }
  }
}

console.log(`checked ${dead.length} dead files against ${live.length} live files`);
console.log(`REFERENCED BY LIVE FILES: ${flagged.length}`);
flagged.forEach(x => console.log(x));
