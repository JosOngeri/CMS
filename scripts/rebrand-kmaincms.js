#!/usr/bin/env node
/**
 * rebrand-kmaincms.js
 *
 * Replaces all occurrences of the old product name `Msabato CMS` with the
 * preferred new names in tracked source files.  Leaves build artifacts, logs,
 * and the git index untouched.
 *
 * New names:
 *   - Msabato CMS            -> Msabato CMS
 *   - Msabato CMS Android    -> Msabato CMS Android
 *   - Msabato CMS Mobile     -> Msabato CMS Mobile
 *   - Msabato CMS server     -> Msabato CMS server
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
  text = text.replace(/Msabato CMS/g, 'Msabato CMS');
  if (text !== original) {
    fs.writeFileSync(file, text, 'utf8');
    return true;
  }
  return false;
}

function main() {
  const stdout = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' });
  const files = stdout.split('\n').filter(Boolean);
  let changed = 0;

  for (const rel of files) {
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
