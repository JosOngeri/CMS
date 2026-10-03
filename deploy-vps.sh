#!/bin/bash

# Msabato CMS Deployment Script for VPS
# This script deploys the latest changes from GitHub to cms.josongeri.co.ke

echo "=== Msabato CMS Deployment Script ==="
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

# Run database migrations — tracked, idempotent runner
echo "Running database migrations..."
cd ../backend
node scripts/apply-migrations.js --mark-applied 049
node scripts/apply-migrations.js

# Platform JWT secret — church tokens use JWT_SECRET; platform tokens get their own.
grep -q '^PLATFORM_JWT_SECRET=' .env 2>/dev/null \
  || echo "PLATFORM_JWT_SECRET=$(openssl rand -hex 48)" >> .env

# Restart PM2 application
echo "Restarting PM2 application..."
pm2 restart kmaincms-backend

# Restart Nginx
echo "Restarting Nginx..."
sudo systemctl restart nginx

echo "=== Deployment completed successfully ==="
echo "Application is now running at https://cms.josongeri.co.ke"