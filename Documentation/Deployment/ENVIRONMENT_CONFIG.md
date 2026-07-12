# Environment Configuration Guide

## Overview
This guide explains all environment variables required for KMainCMS deployment and provides best practices for configuration management.

## Environment Variables Reference

### Required Variables

#### Database Configuration
```env
DB_HOST=localhost              # Database host (default: localhost)
DB_PORT=5432                  # Database port (default: 5432)
DB_NAME=kmaincms              # Database name
DB_USER=kmaincms_user         # Database user
DB_PASSWORD=secure_password  # Database password (must be strong)
```

#### Redis Configuration
```env
REDIS_URL=redis://localhost:6379  # Redis connection URL
REDIS_PASSWORD=                    # Redis password (if configured)
```

#### Security Configuration
```env
JWT_SECRET=your_32_char_minimum_random_string_here
REFRESH_TOKEN_SECRET=another_32_char_minimum_random_string_here
SESSION_SECRET=another_secure_random_string_for_sessions
```

#### Server Configuration
```env
PORT=5005                      # Backend server port
NODE_ENV=production            # Environment (development/production)
LOG_LEVEL=info                 # Logging level (error/warn/info/debug)
```

#### Domain Configuration
```env
FRONTEND_URL=https://cms.josongeri.co.ke    # Frontend URL
BACKEND_URL=https://cms.josongeri.co.ke/api  # Backend API URL
```

### Optional Variables

#### M-Pesa Integration (Payment Processing)
```env
MPESA_CONSUMER_KEY=your_safaricom_consumer_key
MPESA_CONSUMER_SECRET=your_safaricom_consumer_secret
MPESA_PASSKEY=your_safaricom_passkey
MPESA_SHORTCODE=174379
MPESA_ENVIRONMENT=sandbox    # sandbox or production
MPESA_CALLBACK_URL=https://cms.josongeri.co.ke/api/payments/mpesa/callback
```

#### SMS Integration
```env
# Primary SMS Provider
SMS_PROVIDER=josms            # josms, blessed_texts, africas_talking
JOSMS_API_KEY=your_josms_api_key
JOSMS_SENDER_ID=KMainCMS

# Backup SMS Providers
BLESSED_TEXTS_API_KEY=your_blessed_texts_key
AFRICAS_TALKING_API_KEY=your_africas_talking_key
AFRICAS_TALKING_USERNAME=your_username
```

#### Telegram Integration
```env
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
TELEGRAM_API_ID=your_api_id_from_my_telegram
TELEGRAM_API_HASH=your_api_hash_from_my_telegram
TELEGRAM_SESSION_STRING=your_session_string
TELEGRAM_CHANNEL_ID=@your_channel_id
```

#### Google Gemini AI (Content Generation)
```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-pro
```

#### Email Configuration (Notifications)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM=noreply@cms.josongeri.co.ke
```

#### File Upload Configuration
```env
MAX_FILE_SIZE=10485760        # 10MB in bytes
ALLOWED_FILE_TYPES=.jpg,.jpeg,.png,.pdf,.doc,.docx
UPLOAD_DIR=/var/www/kmaincms/uploads
```

#### Rate Limiting
```env
RATE_LIMIT_WINDOW_MS=900000   # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100   # Max requests per window
```

#### Session Configuration
```env
SESSION_SECRET=secure_random_string
SESSION_MAX_AGE=86400000      # 24 hours in milliseconds
```

#### CORS Configuration
```env
CORS_ORIGIN=https://cms.josongeri.co.ke
CORS_CREDENTIALS=true
```

## Security Best Practices

### 1. Generate Secure Secrets
```bash
# Generate JWT secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate session secrets
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 2. Environment File Security
```bash
# Set correct permissions
chmod 600 .env
chown $USER:$USER .env

# Add to .gitignore
echo ".env" >> .gitignore
echo "*.env" >> .gitignore
```

### 3. Password Requirements
- Minimum 16 characters
- Mix of uppercase, lowercase, numbers, and special characters
- No dictionary words or common patterns
- Unique for each environment

### 4. API Key Management
- Never commit API keys to version control
- Rotate keys regularly
- Use different keys for development and production
- Monitor API key usage

## Configuration Templates

### Development Environment (.env.development)
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kmaincms_dev
DB_USER=postgres
DB_PASSWORD=dev_password

# Redis
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=dev_jwt_secret_change_in_production
REFRESH_TOKEN_SECRET=dev_refresh_secret_change_in_production
SESSION_SECRET=dev_session_secret_change_in_production

# Server
PORT=5005
NODE_ENV=development
LOG_LEVEL=debug

# Domains
FRONTEND_URL=http://localhost:5180
BACKEND_URL=http://localhost:5005

# Features
ENABLE_MOCK_PAYMENTS=true
ENABLE_MOCK_SMS=true
```

### Production Environment (.env.production)
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kmaincms
DB_USER=kmaincms_user
DB_PASSWORD=very_secure_production_password

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=redis_secure_password

# Security
JWT_SECRET=production_jwt_secret_32_chars_minimum
REFRESH_TOKEN_SECRET=production_refresh_secret_32_chars_minimum
SESSION_SECRET=production_session_secret_32_chars_minimum

# Server
PORT=5005
NODE_ENV=production
LOG_LEVEL=info

# Domains
FRONTEND_URL=https://cms.josongeri.co.ke
BACKEND_URL=https://cms.josongeri.co.ke/api

# External APIs (configure as needed)
MPESA_CONSUMER_KEY=production_key
MPESA_CONSUMER_SECRET=production_secret
SMS_PROVIDER=josms
JOSMS_API_KEY=production_sms_key
TELEGRAM_BOT_TOKEN=production_bot_token
GEMINI_API_KEY=production_gemini_key
```

## Environment-Specific Configuration

### Loading Environment Files
```javascript
// In your application entry point
const env = process.env.NODE_ENV || 'development';
require('dotenv').config({ path: `.env.${env}` });
```

### Validation Script
```javascript
// validate-env.js
const requiredVars = [
  'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD',
  'REDIS_URL', 'JWT_SECRET', 'REFRESH_TOKEN_SECRET',
  'PORT', 'NODE_ENV', 'FRONTEND_URL', 'BACKEND_URL'
];

const missing = requiredVars.filter(varName => !process.env[varName]);

if (missing.length > 0) {
  console.error('Missing required environment variables:', missing);
  process.exit(1);
}

console.log('All required environment variables are set');
```

## Configuration Management

### 1. Version Control
```bash
# Never commit .env files
echo ".env" >> .gitignore
echo ".env.*" >> .gitignore

# Commit example files
cp .env .env.example
git add .env.example
git commit -m "Add environment example file"
```

### 2. Environment Switching
```bash
# Development
export NODE_ENV=development
npm run dev

# Production
export NODE_ENV=production
npm start
```

### 3. Docker Environment
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
ENV NODE_ENV=production
CMD ["node", "server.js"]
```

### 4. Kubernetes ConfigMaps
```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kmaincms-config
data:
  NODE_ENV: "production"
  PORT: "5005"
  LOG_LEVEL: "info"
---
apiVersion: v1
kind: Secret
metadata:
  name: kmaincms-secrets
type: Opaque
stringData:
  DB_PASSWORD: "secure_password"
  JWT_SECRET: "secure_jwt_secret"
```

## Troubleshooting

### Common Issues

#### 1. Environment Variables Not Loading
```bash
# Check if .env file exists
ls -la .env

# Check file permissions
chmod 644 .env

# Verify dotenv is installed
npm list dotenv

# Test loading
node -e "require('dotenv').config(); console.log(process.env.DB_HOST)"
```

#### 2. Invalid Configuration Values
```bash
# Validate database connection
psql -U $DB_USER -d $DB_NAME -h $DB_HOST -c "SELECT version();"

# Test Redis connection
redis-cli -u $REDIS_URL ping

# Verify port availability
netstat -tlnp | grep $PORT
```

#### 3. Secret Rotation
```bash
# Generate new secrets
NEW_JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Update .env file
sed -i "s/JWT_SECRET=.*/JWT_SECRET=$NEW_JWT_SECRET/" .env

# Restart application
pm2 restart kmaincms-backend
```

## Monitoring Configuration

### 1. Environment Variable Monitoring
```javascript
// monitor-env.js
setInterval(() => {
  console.log('Environment Check:', {
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    dbHost: process.env.DB_HOST,
    redisUrl: process.env.REDIS_URL ? 'Set' : 'Not Set'
  });
}, 3600000); // Every hour
```

### 2. Configuration Health Check
```bash
# Add to health check endpoint
curl https://cms.josongeri.co.ke/api/health/config
```

## Backup and Recovery

### 1. Backup Configuration
```bash
# Backup environment files
cp .env .env.backup.$(date +%Y%m%d)

# Backup to secure location
scp .env user@backup-server:/backups/kmaincms/
```

### 2. Recovery Procedure
```bash
# Restore from backup
cp .env.backup.20231201 .env

# Verify configuration
node validate-env.js

# Restart application
pm2 restart kmaincms-backend
```

## Documentation Updates

Keep this documentation updated when:
- Adding new environment variables
- Changing variable requirements
- Updating security practices
- Modifying configuration templates

## Support

For configuration issues:
1. Check application logs
2. Validate environment variables
3. Test external service connections
4. Review security settings
5. Consult full deployment guide