#!/bin/bash

# KMainCMS Deployment Script for VPS
# This script deploys the latest changes from GitHub to cms.josongeri.co.ke

echo "=== KMainCMS Deployment Script ==="
echo "Starting deployment process..."

# Navigate to project directory
cd /var/www/kmaincms || { echo "Project directory not found"; exit 1; }

# Pull latest changes from GitHub
echo "Pulling latest changes from GitHub..."
git pull origin main

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install --production

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd ../frontend
npm install --production

# Build frontend
echo "Building frontend..."
npm run build

# Run database migrations if needed
echo "Running database migrations..."
cd ../backend
# Add any new migration files here
# psql -U kmaincms_user -d kmaincms -f database/migrations/003_add_snapshot_tables.sql
# psql -U kmaincms_user -d kmaincms -f database/migrations/020_platform_admin_schema.sql

# Restart PM2 application
echo "Restarting PM2 application..."
pm2 restart kmaincms-backend

# Restart Nginx
echo "Restarting Nginx..."
sudo systemctl restart nginx

echo "=== Deployment completed successfully ==="
echo "Application is now running at https://cms.josongeri.co.ke"