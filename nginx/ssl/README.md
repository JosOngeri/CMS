# SSL Certificates

This directory should contain your SSL certificates for production deployment.

## Required Files

- `cert.pem` - SSL certificate file
- `key.pem` - SSL private key file

## Getting SSL Certificates

### Option 1: Let's Encrypt (Free)

```bash
# Install certbot
sudo apt-get install certbot

# Generate certificates
sudo certbot certonly --standalone -d yourdomain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem
```

### Option 2: Self-Signed (Development Only)

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem
```

### Option 3: Cloud Provider SSL

Use SSL certificates from your cloud provider (AWS ACM, Google Cloud SSL, etc.)

## Security Notes

- Never commit private keys to version control
- Keep certificates secure with proper file permissions
- Set up automatic renewal for Let's Encrypt certificates
- Monitor certificate expiration dates

## File Permissions

```bash
chmod 600 nginx/ssl/key.pem
chmod 644 nginx/ssl/cert.pem
```
