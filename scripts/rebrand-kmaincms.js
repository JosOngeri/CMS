#!/usr/bin/env node
/**
 * rebrand-kmaincms.js
 *
 * Replaces all occurrences of the old product name `KMainCMS` / `kmaincms`
 * with the preferred new names in tracked source files.  Leaves build
 * artifacts, logs, and the git index untouched.
 *
 * New names:
 *   - KMainCMS            -> Msabato CMS
 *   - kmaincms            -> msabato
 *
 * Usage:
 *   node scripts/rebrand-kmaincms.js           (all tracked files)
 *   node scripts/rebrand-kmaincms.js backend   (only backend/*)
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const allowedExts = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.md', '.txt', '.json', '.html', '.css',
  '.py', '.sh', '.ps1', '.bat',
  '.sql', '.yaml', '.yml'
]);

function shouldProcess(file) {
  const ext = path.extname(file).toLowerCase();
  if (!allowedExts.has(ext)) return false;
  const parts = file.split('/');
  return !parts.some(p =>
    p === 'node_modules' ||
    p === 'dist' ||
    p === 'dist-new' ||
    p === 'dist-test' ||
    p === 'build' ||
    p === '.git' ||
    p.startsWith('app.log')
  );
}

function rebrandFile(file) {
  let text = fs.readFileSync(file, 'utf8');
  const original = text;
  // Product name (title case)
  text = text.replace(/KMainCMS/g, 'Msabato CMS');
  // Technical/package/database references (lowercase)
  text = text.replace(/kmaincms/g, 'msabato');
  if (text !== original) {
    fs.writeFileSync(file, text, 'utf8');
    return true;
  }
  return false;
}

function main() {
  const targetPrefix = process.argv[2] ? `${process.argv[2]}/` : null;
  const stdout = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' });
  const files = stdout.split('\n').filter(Boolean);
  let changed = 0;

  for (const rel of files) {
    if (targetPrefix && !rel.startsWith(targetPrefix)) continue;
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    if (!shouldProcess(rel)) continue;
    try {
      if (rebrandFile(abs)) {
        console.log(`✏️  ${rel}`);
        changed++;
      }
    } catch (e) {
      console.error(`⚠️  ${rel}: ${e.message}`);
    }
  }

  console.log(`\nRebranded ${changed} file(s).`);
}

main();
