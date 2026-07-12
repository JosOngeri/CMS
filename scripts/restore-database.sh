#!/bin/bash

# Database Restore Script
# This script restores a PostgreSQL database from a backup

set -e

# Configuration
BACKUP_DIR="/opt/kmaincms/database/backups"
DB_CONTAINER="kmaincms-postgres"
DB_NAME="kmaincms"
DB_USER="kmaincms"

# Check if backup file is provided
if [ -z "$1" ]; then
    echo "❌ Usage: $0 <backup_file>"
    echo "Example: $0 kmaincms_20240623_120000.sql.gz"
    exit 1
fi

BACKUP_FILE="${BACKUP_DIR}/$1"

# Check if backup file exists
if [ ! -f ${BACKUP_FILE} ]; then
    echo "❌ Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

echo "⚠️  WARNING: This will replace the current database!"
echo "Backup file: ${BACKUP_FILE}"
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Restore cancelled"
    exit 0
fi

echo "🗄️  Starting database restore..."

# Drop existing database
echo "Dropping existing database..."
docker exec ${DB_CONTAINER} psql -U ${DB_USER} -c "DROP DATABASE IF EXISTS ${DB_NAME};"

# Create new database
echo "Creating new database..."
docker exec ${DB_CONTAINER} psql -U ${DB_USER} -c "CREATE DATABASE ${DB_NAME};"

# Restore from backup
echo "Restoring from backup..."
gunzip -c ${BACKUP_FILE} | docker exec -i ${DB_CONTAINER} psql -U ${DB_USER} ${DB_NAME}

echo "✅ Database restore completed successfully!"
