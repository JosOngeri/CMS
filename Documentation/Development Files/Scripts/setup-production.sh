#!/bin/bash

# Production Environment Setup Script
# This script helps set up the production environment

set -e

echo "🚀 KMainCMS Production Environment Setup"
echo "=========================================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.production template..."
    cp .env.production .env
    echo "⚠️  IMPORTANT: Edit .env file with your production values before continuing!"
    echo ""
    read -p "Press Enter after editing .env file..."
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p backend/uploads
mkdir -p backend/logs
mkdir -p nginx/ssl
mkdir -p database/backups

# Set proper permissions
echo "🔒 Setting proper permissions..."
chmod 700 backend/uploads
chmod 700 backend/logs
chmod 700 nginx/ssl
chmod 700 database/backups

# Generate self-signed SSL certificate if not exists
if [ ! -f nginx/ssl/cert.pem ]; then
    echo "🔐 Generating self-signed SSL certificate (for development)..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/key.pem \
        -out nginx/ssl/cert.pem \
        -subj "/C=KE/ST=Nairobi/L=Nairobi/O=KMainCMS/CN=localhost"
    chmod 600 nginx/ssl/key.pem
    chmod 644 nginx/ssl/cert.pem
    echo "⚠️  For production, replace with proper SSL certificates (Let's Encrypt)"
fi

# Build Docker images
echo "🐳 Building Docker images..."
docker-compose build

# Initialize database
echo "🗄️  Initializing database..."
docker-compose up -d postgres redis
sleep 10
docker-compose exec backend npm run migrate

echo ""
echo "✅ Production environment setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env with your production values"
echo "2. Replace SSL certificates with production certificates"
echo "3. Run: docker-compose up -d"
echo "4. Check health: curl http://localhost/api/health"
echo ""
