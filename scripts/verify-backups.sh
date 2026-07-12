#!/bin/bash

# Backup Verification Script
# This script verifies that backups are working correctly

set -e

BACKUP_DIR="/opt/kmaincms/database/backups"
MIN_BACKUPS=7  # Require at least 7 days of backups

echo "🔍 Verifying database backups..."

# Check if backup directory exists
if [ ! -d ${BACKUP_DIR} ]; then
    echo "❌ Backup directory not found: ${BACKUP_DIR}"
    exit 1
fi

# Count backup files
BACKUP_COUNT=$(ls -1 ${BACKUP_DIR}/kmaincms_*.sql.gz 2>/dev/null | wc -l)

echo "Found ${BACKUP_COUNT} backup files"

# Check if we have enough backups
if [ ${BACKUP_COUNT} -lt ${MIN_BACKUPS} ]; then
    echo "❌ Insufficient backups: ${BACKUP_COUNT} (required: ${MIN_BACKUPS})"
    exit 1
fi

# Check if latest backup is valid
LATEST_BACKUP=$(ls -t ${BACKUP_DIR}/kmaincms_*.sql.gz | head -1)
echo "Latest backup: ${LATEST_BACKUP}"

# Try to decompress and validate
if gzip -t ${LATEST_BACKUP}; then
    echo "✅ Latest backup is valid"
else
    echo "❌ Latest backup is corrupted"
    exit 1
fi

# Check backup size
BACKUP_SIZE=$(stat -f%z ${LATEST_BACKUP} 2>/dev/null || stat -c%s ${LATEST_BACKUP} 2>/dev/null)
if [ ${BACKUP_SIZE} -lt 1024 ]; then
    echo "❌ Latest backup is too small: ${BACKUP_SIZE} bytes"
    exit 1
fi

echo "✅ Backup verification completed successfully!"
echo "   Total backups: ${BACKUP_COUNT}"
echo "   Latest backup size: ${BACKUP_SIZE} bytes"
