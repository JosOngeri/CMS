#!/bin/bash

# SSL Certificate Setup Script
# This script sets up SSL certificates using Let's Encrypt

set -e

echo "🔐 SSL Certificate Setup"
echo "========================"
echo ""

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing certbot..."
    sudo apt-get update
    sudo apt-get install -y certbot
fi

# Get domain name
read -p "Enter your domain name (e.g., example.com): " DOMAIN

# Validate domain
if [ -z "$DOMAIN" ]; then
    echo "❌ Domain name is required"
    exit 1
fi

# Stop nginx if running
echo "🛑 Stopping nginx..."
sudo systemctl stop nginx || docker-compose stop nginx || true

# Obtain certificate
echo "🔑 Obtaining SSL certificate for $DOMAIN..."
sudo certbot certonly --standalone -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

# Copy certificates to nginx ssl directory
echo "📋 Copying certificates to nginx ssl directory..."
sudo mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem nginx/ssl/key.pem

# Set proper permissions
sudo chmod 644 nginx/ssl/cert.pem
sudo chmod 600 nginx/ssl/key.pem

# Setup auto-renewal
echo "🔄 Setting up auto-renewal..."
(crontab -l 2>/dev/null; echo "0 0 * * 0 certbot renew --quiet && docker-compose restart nginx") | crontab -

# Start nginx
echo "🚀 Starting nginx..."
sudo systemctl start nginx || docker-compose start nginx || true

echo ""
echo "✅ SSL certificate setup complete!"
echo ""
echo "Certificate details:"
echo "  Domain: $DOMAIN"
echo "  Certificate: nginx/ssl/cert.pem"
echo "  Private Key: nginx/ssl/key.pem"
echo "  Auto-renewal: Enabled (weekly)"
echo ""
echo "Next steps:"
echo "1. Update nginx configuration to use your domain"
echo "2. Test SSL: https://www.ssllabs.com/ssltest/"
echo ""
