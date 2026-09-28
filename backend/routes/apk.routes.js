/**
 * APK download and version metadata routes
 *
 * Reads a manifest from the server-apk directory and serves binaries with
 * the correct filename for the browser. Versions live in `/var/www/apk`.
 */
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { createLogger } = require('../helpers/controllerLogger');

const logger = createLogger('apk.routes');
const APK_DIR = process.env.APK_DIR || '/var/www/apk';
const MANIFEST = path.join(APK_DIR, 'manifest.json');

function loadManifest() {
  try {
    if (!fs.existsSync(MANIFEST)) return { latest: null, archive: [] };
    return JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  } catch (e) {
    logger.error('loadManifest', e);
    return { latest: null, archive: [] };
  }
}

function resolveVersion(version) {
  const manifest = loadManifest();
  const all = manifest.latest ? [manifest.latest, ...manifest.archive] : manifest.archive;
  if (version === 'latest') return all[0] || null;
  return all.find(v => v.version === version || v.filename === version) || null;
}

// GET /api/apk/versions - full manifest + changelog
router.get('/versions', (req, res) => {
  try {
    const manifest = loadManifest();
    res.json({
      success: true,
      data: manifest,
      downloadBase: '/api/apk/download'
    });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to load version manifest' });
  }
});

// GET /api/apk/download/:version - serve the binary
router.get('/download/:version', (req, res) => {
  try {
    const version = req.params.version;
    const entry = resolveVersion(version);
    if (!entry) {
      return res.status(404).json({ success: false, error: 'APK version not found' });
    }
    const filePath = path.join(APK_DIR, entry.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'APK file missing on server' });
    }
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', `attachment; filename="${entry.filename}"`);
    res.setHeader('Content-Length', fs.statSync(filePath).size);
    fs.createReadStream(filePath).pipe(res);
  } catch (e) {
    logger.error('download', e);
    res.status(500).json({ success: false, error: 'Failed to serve APK' });
  }
});

module.exports = router;
