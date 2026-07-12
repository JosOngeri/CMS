#!/bin/bash

# Setup Automated Backups with Cron
# This script configures automated database backups

set -e

SCRIPT_DIR="/opt/kmaincms/scripts"
BACKUP_SCRIPT="${SCRIPT_DIR}/backup-database.sh"

echo "🔄 Setting up automated database backups..."

# Make backup script executable
chmod +x ${BACKUP_SCRIPT}

# Add cron job for daily database backups at 2 AM
(crontab -l 2>/dev/null; echo "0 2 * * * ${BACKUP_SCRIPT} >> /var/log/kmaincms-backup.log 2>&1") | crontab -

# Add cron job for daily file backups at 3 AM
(crontab -l 2>/dev/null; echo "0 3 * * * ${SCRIPT_DIR}/backup-files.sh >> /var/log/kmaincms-backup.log 2>&1") | crontab -

# Add cron job for weekly backup verification (Sundays at 4 AM)
(crontab -l 2>/dev/null; echo "0 4 * * 0 ${SCRIPT_DIR}/verify-backups.sh >> /var/log/kmaincms-backup.log 2>&1") | crontab -

echo "✅ Automated backups configured:"
echo "  - Daily database backups at 2:00 AM"
echo "  - Daily file backups at 3:00 AM"
echo "  - Weekly verification at 4:00 AM on Sundays"
echo "  - Logs: /var/log/kmaincms-backup.log"
echo ""
echo "To view cron jobs: crontab -l"
echo "To test backup: ${BACKUP_SCRIPT}"
