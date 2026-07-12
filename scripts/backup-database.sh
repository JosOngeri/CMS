#!/bin/bash

# Database Backup Script
# This script creates automated backups of the PostgreSQL database

set -e

# Configuration
BACKUP_DIR="/opt/kmaincms/database/backups"
DB_CONTAINER="kmaincms-postgres"
DB_NAME="kmaincms"
DB_USER="kmaincms"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/kmaincms_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=30

# Create backup directory if it doesn't exist
mkdir -p ${BACKUP_DIR}

echo "🗄️  Starting database backup..."
echo "Timestamp: ${TIMESTAMP}"

# Create backup
docker exec ${DB_CONTAINER} pg_dump -U ${DB_USER} ${DB_NAME} | gzip > ${BACKUP_FILE}

# Check if backup was successful
if [ -f ${BACKUP_FILE} ]; then
    BACKUP_SIZE=$(du -h ${BACKUP_FILE} | cut -f1)
    echo "✅ Backup created successfully: ${BACKUP_FILE}"
    echo "   Size: ${BACKUP_SIZE}"
else
    echo "❌ Backup failed!"
    exit 1
fi

# Remove old backups (older than RETENTION_DAYS)
echo "🧹 Cleaning up old backups (older than ${RETENTION_DAYS} days)..."
find ${BACKUP_DIR} -name "kmaincms_*.sql.gz" -mtime +${RETENTION_DAYS} -delete

# List remaining backups
echo ""
echo "📋 Current backups:"
ls -lh ${BACKUP_DIR}/kmaincms_*.sql.gz | tail -5

echo ""
echo "✅ Database backup completed successfully!"
