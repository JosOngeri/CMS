#!/bin/bash

# Files Backup Script
# This script creates backups of uploaded files and other important data

set -e

# Configuration
BACKUP_DIR="/opt/kmaincms/database/backups"
FILES_DIR="/opt/kmaincms/backend/uploads"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/kmaincms_files_${TIMESTAMP}.tar.gz"
RETENTION_DAYS=30

# Create backup directory if it doesn't exist
mkdir -p ${BACKUP_DIR}

echo "📁 Starting files backup..."
echo "Timestamp: ${TIMESTAMP}"

# Check if files directory exists
if [ ! -d ${FILES_DIR} ]; then
    echo "⚠️  Files directory not found: ${FILES_DIR}"
    echo "Creating empty backup..."
    tar -czf ${BACKUP_FILE} -T /dev/null
else
    # Create backup
    tar -czf ${BACKUP_FILE} -C ${FILES_DIR} .
fi

# Check if backup was successful
if [ -f ${BACKUP_FILE} ]; then
    BACKUP_SIZE=$(du -h ${BACKUP_FILE} | cut -f1)
    echo "✅ Files backup created: ${BACKUP_FILE}"
    echo "   Size: ${BACKUP_SIZE}"
else
    echo "❌ Files backup failed!"
    exit 1
fi

# Remove old backups
echo "🧹 Cleaning up old file backups (older than ${RETENTION_DAYS} days)..."
find ${BACKUP_DIR} -name "kmaincms_files_*.tar.gz" -mtime +${RETENTION_DAYS} -delete

echo "✅ Files backup completed successfully!"
