#!/usr/bin/env node
/**
 * build-release-apk.js
 *
 * Builds a versioned Android APK from the Flutter app, updates the local
 * CHANGELOG, and creates a manifest for the web download archive.
 *
 * Usage:
 *   node scripts/build-release-apk.js            (bump from pubspec.yaml)
 *   node scripts/build-release-apk.js 1.2.1+11   (explicit version)
 *
 * Then upload the APK + manifest to the VPS:
 *   scp -i ~/.ssh/deploy_vps_key releases/*.apk deploy@cms.josongeri.co.ke:/var/www/apk/
 *   scp -i ~/.ssh/deploy_vps_key releases/manifest.json deploy@cms.josongeri.co.ke:/var/www/apk/
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FLUTTER_DIR = path.join(ROOT, 'mobile', 'flutter', 'flutter-mobile');
const RELEASES_DIR = path.join(ROOT, 'releases');
const PUBSPEC = path.join(FLUTTER_DIR, 'pubspec.yaml');

function readVersionFromPubspec() {
  const text = fs.readFileSync(PUBSPEC, 'utf8');
  const match = text.match(/^version:\s*([^\s+]+)\+([0-9]+)/m);
  if (!match) throw new Error('Could not parse version from pubspec.yaml');
  return { versionName: match[1], versionCode: parseInt(match[2], 10) };
}

function parseArgs() {
  const arg = process.argv[2];
  if (!arg) return readVersionFromPubspec();
  const m = arg.match(/^([^\s+]+)\+([0-9]+)$/);
  if (!m) throw new Error('Version arg must be NAME+BUILD (e.g. 1.2.0+10)');
  return { versionName: m[1], versionCode: parseInt(m[2], 10) };
}

function extractChangelog(version) {
  const changelog = fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8');
  const re = new RegExp(`## \\[${version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\s*-\\s*[^\\n]*\\n([\\s\\S]*?)(?=\\n## |\\n---|$)`);
  const m = changelog.match(re);
  if (!m) return [];
  // Collapse multi-line bullets (indented continuation lines are appended to
  // the previous bullet so the manifest contains complete sentences.)
  const lines = m[1].split('\n');
  const bullets = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ')) {
      bullets.push(trimmed.replace(/^-\\s+/, ''));
    } else if (trimmed && bullets.length > 0) {
      bullets[bullets.length - 1] += ' ' + trimmed;
    }
  }
  return bullets;
}

function buildApk({ versionName }) {
  const out = path.join(FLUTTER_DIR, 'build', 'app', 'outputs', 'flutter-apk', 'app-release.apk');
  if (!fs.existsSync(out)) {
    throw new Error(`APK not found at ${out}. Run: flutter build apk --release`);
  }
  const filename = `sda-church-mobile-${versionName}.apk`;
  const dest = path.join(RELEASES_DIR, filename);
  fs.cpSync(out, dest, { force: true });
  const stats = fs.statSync(dest);
  console.log(`✅ Built ${filename} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
  return { filename, size: stats.size };
}

function updateManifest({ versionName, versionCode, filename, size, changes }) {
  fs.mkdirSync(RELEASES_DIR, { recursive: true });
  const manifestPath = path.join(RELEASES_DIR, 'manifest.json');
  const manifest = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    : { latest: null, archive: [] };

  const entry = {
    version: versionName,
    build: versionCode,
    date: new Date().toISOString().split('T')[0],
    filename,
    size,
    changes
  };

  let previous = manifest.archive || [];

  if (manifest.latest) {
    // Don't archive if it's the same version we're rebuilding; just overwrite.
    if (manifest.latest.version !== versionName) {
      previous = previous.filter(a => a.version !== manifest.latest.version);
      previous.unshift(manifest.latest);
    }
  }

  manifest.latest = entry;
  manifest.archive = previous;

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`✅ Updated ${manifestPath}`);
  return manifest;
}

function main() {
  try {
    const { versionName, versionCode } = parseArgs();
    console.log(`🚀 Building Msabato CMS Android app v${versionName}+${versionCode}`);
    const { filename, size } = buildApk({ versionName });
    const changes = extractChangelog(versionName);
    updateManifest({ versionName, versionCode, filename, size, changes });
    console.log('\nNext steps:');
    console.log(`  scp -i ~/.ssh/deploy_vps_key "${path.join(RELEASES_DIR, filename)}" deploy@cms.josongeri.co.ke:/var/www/apk/`);
    console.log(`  scp -i ~/.ssh/deploy_vps_key "${path.join(RELEASES_DIR, 'manifest.json')}" deploy@cms.josongeri.co.ke:/var/www/apk/`);
  } catch (err) {
    console.error('❌', err.message);
    process.exit(1);
  }
}

main();
