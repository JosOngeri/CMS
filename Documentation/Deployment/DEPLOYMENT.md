# KMainCMS Deployment Guide

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Redis 6+
- PM2 (for process management)
- SSL certificate (for production)

## Environment Configuration

### 1. Copy Environment Example

```bash
cd backend
cp .env.example .env
```

### 2. Configure Environment Variables

Edit `backend/.env` and set the following required values:

**Database:**
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kmaincms
DB_USER=postgres
DB_PASSWORD=your_secure_password
```

**Redis:**
```
REDIS_URL=redis://localhost:6379
```

**JWT Security:**
```
JWT_SECRET=generate_a_secure_random_string_32_chars_or_more
REFRESH_TOKEN_SECRET=generate_another_secure_random_string
```

**External APIs (Optional - for full functionality):**

**M-Pesa (Phase 12):**
```
MPESA_CONSUMER_KEY=your_safaricom_consumer_key
MPESA_CONSUMER_SECRET=your_safaricom_consumer_secret
MPESA_PASSKEY=your_safaricom_passkey
MPESA_SHORTCODE=174379
MPESA_ENVIRONMENT=sandbox
```

**SMS Providers (Phase 9):**
```
JOSMS_API_KEY=your_josms_key
BLESSED_TEXTS_API_KEY=your_blessedtexts_key
AFRICAS_TALKING_API_KEY=your_africas_talking_key
```

**Telegram (Phase 11):**
```
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
TELEGRAM_SESSION_STRING=your_session_string
```

**Google Gemini AI (Phase 13):**
```
GEMINI_API_KEY=your_gemini_api_key
```

## Database Setup

### 1. Create Database

```bash
psql -U postgres
CREATE DATABASE kmaincms;
\q
```

### 2. Run Migrations

```bash
cd backend
# Run all migrations in order
psql -U postgres -d kmaincms -f database/migrations/add_tenancy_core.sql
psql -U postgres -d kmaincms -f database/migrations/add_church_slug_indexes.sql
psql -U postgres -d kmaincms -f database/migrations/enable_rls_policies.sql
psql -U postgres -d kmaincms -f database/migrations/add_sms_providers.sql
psql -U postgres -d kmaincms -f database/migrations/add_notification_templates.sql
psql -U postgres -d kmaincms -f database/migrations/add_gallery_sync.sql
psql -U postgres -d kmaincms -f database/migrations/add_payment_tracking.sql
psql -U postgres -d kmaincms -f database/migrations/add_document_approval_workflow.sql
psql -U postgres -d kmaincms -f database/migrations/add_ai_audit_logging.sql
```

### 3. Verify Database

```bash
psql -U postgres -d kmaincms -c "\dt"
```

You should see tables including: `churches`, `users`, `members`, `payments`, `announcements`, `events`, `departments`, `gallery_albums`, `gallery_photos`, `sms_logs`, `settings`, `sms_providers`, `notification_templates`, `notification_delivery`, `gallery_sync_status`, `bank_transactions`, `payment_discrepancies`, `payment_audit_log`, `document_approvals`, `approval_requests`, `notifications`, `ai_usage_logs`, `ai_rate_limits`

## Installation

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 3. Build Frontend

```bash
cd frontend
npm run build
```

## Testing

### Run All Tests

```bash
# From project root
node run-tests.js
```

Or on Windows:
```bash
run-tests.bat
```

### Run Backend Tests Only

```bash
cd backend
npm test -- --coverage
```

### Run Frontend Tests Only

```bash
cd frontend
npm test -- --coverage --watchAll=false
```

## Development Mode

### Start Backend

```bash
cd backend
npm start
```

Backend will run on port 5005 (or as configured in .env)

### Start Frontend (Development)

```bash
cd frontend
npm run dev
```

Frontend will run on port 5180 (or as configured)

## Production Deployment

### 1. Build Frontend for Production

```bash
cd frontend
npm run build
```

### 2. Configure PM2

```bash
cd backend
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### 3. Configure Nginx (Optional but Recommended)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. Configure SSL with Let's Encrypt (Recommended)

```bash
sudo certbot --nginx -d your-domain.com
```

### 5. Start Application

```bash
cd backend
pm2 start ecosystem.config.cjs
```

## Multi-Tenancy Setup

### Subdomain Configuration

For multi-tenancy via subdomains (e.g., kiserian-main-sda.kmaincms.org):

1. Configure DNS to point `*.kmaincms.org` to your server
2. The system will automatically extract the subdomain and route to the correct church
3. Default church: `kiserian-main-sda` (configurable via DEFAULT_CHURCH_SLUG)

### Add New Church

```bash
psql -U postgres -d kmaincms
INSERT INTO churches (name, slug, settings) 
VALUES ('New Church Name', 'new-church-slug', '{"timezone": "Africa/Nairobi", "currency": "KES"}');
```

## Monitoring

### View PM2 Logs

```bash
pm2 logs
```

### View Application Status

```bash
pm2 status
```

### Health Check Endpoints

- `GET /api/health` - Overall health
- `GET /api/health/db` - Database health
- `GET /api/health/redis` - Redis health

## Backup Strategy

### Database Backup

```bash
pg_dump -U postgres kmaincms > backup_$(date +%Y%m%d).sql
```

### Automated Backup (Cron)

```bash
0 2 * * * pg_dump -U postgres kmaincms > /backups/kmaincms_$(date +\%Y\%m\%d).sql
```

## Troubleshooting

### Database Connection Issues

Check PostgreSQL is running:
```bash
sudo systemctl status postgresql
```

### Redis Connection Issues

Check Redis is running:
```bash
redis-cli ping
```

### Port Already in Use

Use the kill port utility:
```bash
node backend/utils/killPort.js 5005
```

## Security Checklist

- [ ] Change all default passwords
- [ ] Set strong JWT secrets
- [ ] Enable HTTPS in production
- [ ] Configure firewall rules
- [ ] Enable rate limiting
- [ ] Set up regular backups
- [ ] Monitor logs for suspicious activity
- [ ] Keep dependencies updated
- [ ] Configure CORS properly
- [ ] Enable MFA for admin accounts

## Support

For issues or questions:
- Check logs in `backend/logs/`
- Review session logs in `docs/logs/`
- Check health endpoints
- Review PM2 logs
