# KMainCMS Deployment Guide

## Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Nginx (for production)
- PM2 (for process management)

## Development Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   cd backend
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Run database migrations:
   ```bash
   cd database
   psql -U postgres -d kmaincms -f init_schema.sql
   psql -U postgres -d kmaincms -f role_hierarchy.sql
   psql -U postgres -d kmaincms -f content_schema.sql
   psql -U postgres -d kmaincms -f departments_schema.sql
   psql -U postgres -d kmaincms -f gallery_schema.sql
   psql -U postgres -d kmaincms -f treasury_schema.sql
   psql -U postgres -d kmaincms -f payments_schema.sql
   psql -U postgres -d kmaincms -f sms_schema.sql
   psql -U postgres -d kmaincms -f documents_schema.sql
   psql -U postgres -d kmaincms -f approvals_schema.sql
   psql -U postgres -d kmaincms -f notifications_schema.sql
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Production Setup

### Using Docker

1. Build and start containers:
   ```bash
   docker-compose up -d
   ```

2. Check logs:
   ```bash
   docker-compose logs -f
   ```

### Using PM2

1. Install PM2 globally:
   ```bash
   npm install -g pm2
   ```

2. Start the application:
   ```bash
   cd backend
   pm2 start server.js --name kmaincms-backend
   pm2 save
   pm2 startup
   ```

3. Monitor the application:
   ```bash
   pm2 logs kmaincms-backend
   pm2 monit
   ```

## Environment Variables

Required:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `JWT_EXPIRES_IN`: Token expiration time (default: 7d)
- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port (default: 5000)

Optional:
- `TELEGRAM_BOT_TOKEN`: Telegram bot token
- `TELEGRAM_BOT_USERNAME`: Telegram bot username
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `FACEBOOK_CLIENT_ID`: Facebook OAuth client ID
- `FACEBOOK_CLIENT_SECRET`: Facebook OAuth client secret

## Nginx Configuration

Create an Nginx configuration file to proxy requests to the backend:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Backup Strategy

### Database Backup

```bash
# Backup
pg_dump -U postgres kmaincms > backup_$(date +%Y%m%d).sql

# Restore
psql -U postgres kmaincms < backup_20240101.sql
```

### Automated Backup

Set up a cron job for automated backups:

```bash
# Daily backup at 2 AM
0 2 * * * pg_dump -U postgres kmaincms > /backups/kmaincms_$(date +\%Y\%m\%d).sql
```

## Monitoring

### Health Check Endpoint

The application provides a health check endpoint at `/health`:

```bash
curl http://localhost:5000/health
```

### Logs

Application logs are stored in:
- Development: Console output
- Production: PM2 logs (`pm2 logs`)

## Security Considerations

1. Change default passwords
2. Use strong JWT secrets
3. Enable HTTPS in production
4. Configure firewall rules
5. Regular security updates
6. Monitor access logs
7. Implement rate limiting
8. Use environment variables for sensitive data

## Troubleshooting

### Database Connection Issues

- Check PostgreSQL is running
- Verify DATABASE_URL is correct
- Ensure database exists

### Port Already in Use

```bash
# Find process using port 5000
netstat -ano | findstr :5000

# Kill the process
taskkill /PID <PID> /F
```

### Application Not Starting

- Check logs for errors
- Verify all dependencies are installed
- Ensure environment variables are set correctly