/**
 * Generates a README.md map in every source folder.
 * Purpose lines come from each file's header docblock (see
 * .devin/rules/file-headers-and-folder-readmes.md). Folders without headers
 * fall back to the first plain comment, then the filename.
 *
 * Run: node scripts/generate-folder-readmes.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC_EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.dart', '.sql', '.css']);
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.dart_tool', '.idea', '.vite-cache',
  'coverage', 'lcov-report', 'logs', 'sessions', 'uploads', 'android', 'ios',
  'assets', 'public', 'assets.xcassets', '__pycache__'
]);
// Anchors we walk; everything below them that contains source files gets a README.
const WALK_ROOTS = ['backend', 'frontend/src', 'mobile/flutter/flutter-mobile/lib', 'scripts', 'docs'];

const FOLDER_PURPOSE = {
  'backend': 'Express API entry (`server.js` boots, `app.js` wires middleware/routes).',
  'backend/config': 'Environment-driven config: DB pool, env validation, pino logger, platform JWT secret.',
  'backend/controllers': 'Request handlers — thin layer over repositories; one file per domain.',
  'backend/helpers': 'Shared helper functions (logging, audit, security/crypto, finance, websockets).',
  'backend/middleware': 'Express middleware: auth, tenancy, CSRF, rate limits, validation, response envelope.',
  'backend/migrations': 'Numbered SQL migrations applied in order.',
  'backend/modules/treasury': 'Isolated treasury module (canonical finance surface — replaces legacy treasury.*).',
  'backend/repositories': 'Data access — the only layer that should touch SQL.',
  'backend/routes': 'Express routers; `index.routes.js` mounts everything under /api.',
  'backend/scripts': 'One-off ops/maintenance scripts.',
  'backend/services': 'Business logic + external integrations (M-Pesa, SMS, Telegram, cache).',
  'backend/tests': 'Jest suites (unit / integration / e2e / services / jobs / migrations).',
  'backend/utils': 'Small stateless utilities (pagination, email, error handler, response envelope).',
  'frontend/src': 'React app root — providers, shells, router; feature code lives in the subfolders.',
  'frontend/src/components': 'Reusable UI components by domain.',
  'frontend/src/components/common': 'Shared primitives: Sidebar, Header, Card, modals, lists.',
  'frontend/src/components/ui': 'Design-system primitives (Input, Label, Toolbar, PageTitle).',
  'frontend/src/config': 'Static configuration (palettes, feature flags).',
  'frontend/src/constants': 'Enumerations shared with the backend contract (roles, permissions, API paths).',
  'frontend/src/contexts': 'React contexts — auth, theme palette, settings, toast, members, gallery.',
  'frontend/src/hooks': 'Custom hooks (data fetching, permissions, activity feed, branding).',
  'frontend/src/layouts': 'Layout wrappers (dashboard w/ bottom nav, public, auth).',
  'frontend/src/modules': 'Self-contained feature modules (SMS sub-app).',
  'frontend/src/pages': 'Route-level pages grouped by feature area.',
  'frontend/src/router': 'react-router route tables (public/dashboard) + per-route error boundaries.',
  'frontend/src/shells': 'Top-level shells that own providers + layouts per app area.',
  'frontend/src/styles': 'Global CSS (Tailwind directives + theme tokens).',
  'frontend/src/utils': 'Formatters, cache, date grouping — pure functions.',
  'mobile/flutter/flutter-mobile/lib': 'Flutter app root — app.dart wiring, router, theme.',
  'mobile/flutter/flutter-mobile/lib/app': 'App shell + GoRouter configuration.',
  'mobile/flutter/flutter-mobile/lib/models': 'Data models.',
  'mobile/flutter/flutter-mobile/lib/screens': 'Full-screen pages (login, dashboard, gallery, …).',
  'mobile/flutter/flutter-mobile/lib/services': 'API client (api_service.dart), config, sockets, push/update services.',
  'mobile/flutter/flutter-mobile/lib/widgets': 'Reusable widgets.',
};

const HEADER_EXTS = { '.js': 'block', '.jsx': 'block', '.ts': 'block', '.tsx': 'block', '.dart': 'slash3', '.sql': 'dash', '.css': 'block' };

function extractPurpose(filePath) {
  const ext = path.extname(filePath);
  let head;
  try {
    head = fs.readFileSync(filePath, 'utf8').slice(0, 4000);
  } catch { return '—'; }

  const clip = (s) => {
    if (s.length <= 140) return s;
    const cut = s.slice(0, 137);
    return cut.slice(0, cut.lastIndexOf(' ')) + '…';
  };

  // 1) Prefer the first /** ... */ docblock anywhere in the file head.
  const block = head.match(/\/\*\*([\s\S]*?)\*\//);
  if (block) {
    const lines = block[1]
      .split('\n')
      .map(l => l.replace(/^\s*\*\s?/, '').trim())
      .filter(l => l && !l.startsWith('@'));
    if (lines.length) return clip(lines[0]);
  }
  // 2) Leading line comments (// or /// or --).
  const lineRe = HEADER_EXTS[ext] === 'dash' ? /^--\s?(.*)/ : HEADER_EXTS[ext] === 'slash3' ? /^\/\/\/\s?(.*)/ : /^\/\/\s?(.*)/;
  for (const l of head.split('\n').slice(0, 15)) {
    const m = l.match(lineRe);
    if (m && m[1] && !m[1].startsWith('!') && !/eslint|generated|license/i.test(m[1])) {
      return clip(m[1]);
    }
  }
  // 3) Class or exported symbol as a weak fallback (skip `const x = require()`).
  const cls = head.match(/class\s+(\w+)/) || head.match(/module\.exports\s*=\s*(?:new\s+)?(\w+)/);
  return cls ? cls[1] : '—';
}

function walk(dir) {
  const rel = path.relative(ROOT, dir).replace(/\\/g, '/');
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = entries
    .filter(e => e.isFile() && SRC_EXT.has(path.extname(e.name)))
    .map(e => e.name)
    .sort();
  const subdirs = entries
    .filter(e => e.isDirectory() && !SKIP_DIRS.has(e.name))
    .map(e => e.name)
    .sort();

  if (files.length) {
    writeReadme(dir, rel, files, subdirs.filter(s => hasSource(path.join(dir, s))));
  }
  for (const s of subdirs) walk(path.join(dir, s));
}

function hasSource(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isFile() && SRC_EXT.has(path.extname(e.name))) return true;
    if (e.isDirectory() && !SKIP_DIRS.has(e.name) && hasSource(path.join(dir, e.name))) return true;
  }
  return false;
}

function writeReadme(dir, rel, files, subdirs) {
  const purpose = FOLDER_PURPOSE[rel] || '';
  const readmePath = path.join(dir, 'README.md');
  let intro = '';
  if (fs.existsSync(readmePath)) {
    const m = fs.readFileSync(readmePath, 'utf8').match(/<!-- intro:start -->([\s\S]*?)<!-- intro:end -->/);
    if (m) intro = m[0];
  }

  const rows = files
    .filter(f => f !== 'README.md')
    .map(f => `| \`${f}\` | ${extractPurpose(path.join(dir, f)).replace(/\|/g, '\\|')} |`)
    .join('\n');
  const subLines = subdirs.map(s => `- [\`${s}/\`](${s}/README.md)`).join('\n');

  const out = [
    `# ${rel || 'root'}/`,
    '',
    purpose,
    intro,
    '## Files',
    '',
    '| File | Purpose |',
    '|---|---|',
    rows,
    subdirs.length ? `\n## Subfolders\n\n${subLines}` : '',
    '',
    '_Generated by `scripts/generate-folder-readmes.js` — edit file headers, not this table._',
    ''
  ].filter(x => x !== '').join('\n');

  fs.writeFileSync(readmePath, out, 'utf8');
  written.push(readmePath);
  return readmePath;
}

const written = [];
for (const root of WALK_ROOTS) {
  const abs = path.join(ROOT, root);
  if (fs.existsSync(abs)) walk(abs);
}
console.log(`READMEs written: ${written.length}`);
written.forEach(p => console.log('  ' + path.relative(ROOT, p).replace(/\\/g, '/')));
