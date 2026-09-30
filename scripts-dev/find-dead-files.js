// Find source files never imported/required by any other file.
// Excludes: entry points, configs, tests, migrations, scripts, assets.
const fs = require('fs');
const path = require('path');

const ROOTS = ['backend', 'frontend/src'];
const EXTS = ['.js', '.jsx', '.ts', '.tsx'];
const EXCLUDE = /migrations[\\/]|scripts[\\/]|__tests__|[\\/]tests?[\\/]|\.test\.|\.spec\.|vite\.config|tailwind\.config|postcss|eslint|[\\/]main\.jsx?$|[\\/]index\.jsx?$|app\.js$|server\.js$|\.config\.|theme\.|seed/i;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!/node_modules|^dist|\.git/.test(e.name)) walk(p, out);
    } else if (EXTS.includes(path.extname(e.name))) out.push(p);
  }
  return out;
}

const files = ROOTS.flatMap(r => walk(r));
const contents = files.map(f => fs.readFileSync(f, 'utf8'));
const allSrc = contents.join('\n');

// Build regex per stem lazily — reuse the combined source
const orphans = [];
for (let i = 0; i < files.length; i++) {
  const f = files[i];
  const rel = path.relative(process.cwd(), f).replace(/\\/g, '/');
  if (EXCLUDE.test(rel)) continue;
  const stem = path.basename(f).replace(/\.(js|jsx|ts|tsx)$/, '');
  if (!stem || stem.length < 3) continue;
  const escaped = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`['"\`][^'"\`]*${escaped}(\\.(js|jsx|ts|tsx))?['"\`]`, 'g');
  let count = 0;
  for (let j = 0; j < contents.length; j++) {
    if (j === i) continue;
    const m = contents[j].match(re);
    if (m) count += m.length;
  }
  if (count === 0) orphans.push(rel);
}

console.log(orphans.join('\n'));
console.log(`--- ${orphans.length} candidates out of ${files.length} files`);
