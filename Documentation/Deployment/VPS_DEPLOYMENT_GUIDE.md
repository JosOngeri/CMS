# VPS Deployment Guide for cms.josongeri.co.ke

## Overview
This guide provides step-by-step instructions for deploying KMainCMS to a VPS at `cms.josongeri.co.ke`.

## Prerequisites

### VPS Requirements
- **OS**: Ubuntu 20.04 LTS or newer (recommended)
- **RAM**: Minimum 2GB, recommended 4GB+
- **Storage**: Minimum 20GB, recommended 50GB+
- **CPU**: Minimum 2 cores, recommended 4+ cores

### Software Requirements
- Node.js 18+ 
- npm 9+
- PostgreSQL 14+
- Redis 6+
- Nginx
- PM2 (Process Manager)
- Git
- SSL Certificate (Let's Encrypt recommended)

## Initial VPS Setup

### 1. Connect to VPS
```bash
ssh user@your-vps-ip
```

### 2. Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 3. Install Required Dependencies
```bash
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Redis
sudo apt install -y redis-server

# Install Nginx
sudo apt install -y nginx

# Install PM2 globally
sudo npm install -g pm2

# Install Git
sudo apt install -y git

# Install build tools
sudo apt install -y build-essential
```

### 4. Configure PostgreSQL
```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE kmaincms;
CREATE USER kmaincms_user WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE kmaincms TO kmaincms_user;
\q
```

### 5. Configure Redis
```bash
# Start Redis service
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Test Redis
redis-cli ping
# Should return: PONG
```

### 6. Configure Firewall
```bash
# Allow SSH
sudo ufw allow OpenSSH

# Allow HTTP
sudo ufw allow 80

# Allow HTTPS
sudo ufw allow 443

# Enable firewall
sudo ufw enable
```

## Application Deployment

### 1. Create Project Directory
```bash
sudo mkdir -p /var/www/kmaincms
sudo chown -R $USER:$USER /var/www/kmaincms
cd /var/www/kmaincms
```

### 2. Upload CMS Codebase
**Option A: Using SCP (from local machine)**
```bash
# From your local machine
cd "D:/VIbeCode/KMainCMS/CMS Codebase"
scp -r . user@your-vps-ip:/var/www/kmaincms/
```

**Option B: Using Git (if code is in repository)**
```bash
git clone your-repository-url .
```

**Option C: Using SFTP**
```bash
sftp user@your-vps-ip
cd /var/www/kmaincms
put -r /local/path/to/CMS\ Codebase/*
exit
```

### 3. Install Dependencies
```bash
cd /var/www/kmaincms

# Install root dependencies
npm install --production

# Install backend dependencies
cd backend
npm install --production

# Install frontend dependencies
cd ../frontend
npm install --production
```

### 4. Build Frontend
```bash
cd /var/www/kmaincms/frontend
npm run build
```

### 5. Configure Environment Variables
```bash
cd /var/www/kmaincms/backend
cp .env.example .env
nano .env
```

**Set the following environment variables:**
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kmaincms
DB_USER=kmaincms_user
DB_PASSWORD=secure_password_here

# Redis
REDIS_URL=redis://localhost:6379

# JWT Security (generate secure random strings)
JWT_SECRET=your_very_secure_random_string_minimum_32_characters
REFRESH_TOKEN_SECRET=another_secure_random_string_minimum_32_characters

# Server Configuration
PORT=5005
NODE_ENV=production

# Domain Configuration
FRONTEND_URL=https://cms.josongeri.co.ke
BACKEND_URL=https://cms.josongeri.co.ke/api

# Optional: External APIs (configure as needed)
# MPESA_CONSUMER_KEY=your_key
# MPESA_CONSUMER_SECRET=your_secret
# TELEGRAM_BOT_TOKEN=your_token
# GEMINI_API_KEY=your_key
```

### 6. Run Database Migrations
```bash
cd /var/www/kmaincms/backend

# Run migration scripts
psql -U kmaincms_user -d kmaincms -f migrations/004_gallery_schema.sql
psql -U kmaincms_user -d kmaincms -f migrations/005_fix_missing_columns.sql
psql -U kmaincms_user -d kmaincms -f migrations/006_settings_schema.sql
psql -U kmaincms_user -d kmaincms -f migrations/007_auth_tables.sql
psql -U kmaincms_user -d kmaincms -f migrations/008_permissions_schema.sql
```

### 7. Create Initial Admin User
```bash
cd /var/www/kmaincms/backend
node create-admin.js
```

Follow the prompts to create the initial admin account.

## Nginx Configuration

### 1. Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/kmaincms
```

**Add the following configuration:**
```nginx
# HTTP Server - Redirect to HTTPS
server {
    listen 80;
    server_name cms.josongeri.co.ke;

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name cms.josongeri.co.ke;

    # SSL Configuration (will be updated by Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/cms.josongeri.co.ke/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cms.josongeri.co.ke/privkey.pem;

    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Frontend Static Files
    location / {
        root /var/www/kmaincms/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket Support (if needed)
    location /socket.io {
        proxy_pass http://localhost:5005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

### 2. Enable Configuration
```bash
sudo ln -s /etc/nginx/sites-available/kmaincms /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## SSL Certificate Setup

### 1. Install Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Obtain SSL Certificate
```bash
sudo certbot --nginx -d cms.josongeri.co.ke
```

Follow the prompts to obtain and configure the SSL certificate.

### 3. Auto-Renewal Setup
```bash
sudo certbot renew --dry-run
```

Certbot should automatically set up cron job for renewal.

## PM2 Configuration

### 1. Create PM2 Ecosystem File
```bash
cd /var/www/kmaincms/backend
nano ecosystem.config.cjs
```

**Add the following configuration:**
```javascript
module.exports = {
  apps: [{
    name: 'kmaincms-backend',
    script: './server.js',
    cwd: '/var/www/kmaincms/backend',
    instances: 2,
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5005
    },
    error_file: '/var/log/kmaincms/error.log',
    out_file: '/var/log/kmaincms/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
```

### 2. Create Log Directory
```bash
sudo mkdir -p /var/log/kmaincms
sudo chown -R $USER:$USER /var/log/kmaincms
```

### 3. Start Application with PM2
```bash
cd /var/www/kmaincms/backend
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### 4. Monitor Application
```bash
# Check status
pm2 status

# View logs
pm2 logs kmaincms-backend

# Restart application
pm2 restart kmaincms-backend

# Stop application
pm2 stop kmaincms-backend
```

## Post-Deployment Verification

### 1. Check Application Status
```bash
# Check PM2 status
pm2 status

# Check Nginx status
sudo systemctl status nginx

# Check PostgreSQL status
sudo systemctl status postgresql

# Check Redis status
sudo systemctl status redis-server
```

### 2. Test Application
```bash
# Test backend health
curl https://cms.josongeri.co.ke/api/health

# Test frontend
curl https://cms.josongeri.co.ke

# Test database connection
cd /var/www/kmaincms/backend
node check-tables.js
```

### 3. Verify SSL
```bash
# Check SSL certificate
sudo certbot certificates

# Test SSL configuration
openssl s_client -connect cms.josongeri.co.ke:443 -servername cms.josongeri.co.ke
```

## Monitoring and Maintenance

### 1. Log Monitoring
```bash
# Application logs
pm2 logs kmaincms-backend

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### 2. Database Backup Setup
```bash
# Create backup directory
sudo mkdir -p /backups/kmaincms
sudo chown -R $USER:$USER /backups

# Create backup script
nano /backups/backup-kmaincms.sh
```

**Add the following backup script:**
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/kmaincms"
DB_NAME="kmaincms"
DB_USER="kmaincms_user"

# Create database backup
pg_dump -U $DB_USER $DB_NAME > $BACKUP_DIR/kmaincms_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/kmaincms_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "kmaincms_*.sql.gz" -mtime +7 -delete

echo "Backup completed: kmaincms_$DATE.sql.gz"
```

```bash
# Make script executable
chmod +x /backups/backup-kmaincms.sh

# Add to cron (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /backups/backup-kmaincms.sh
```

### 3. System Monitoring
```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check CPU usage
top

# Check running processes
ps aux
```

## Security Hardening

### 1. Configure Fail2Ban
```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 2. Configure Automatic Security Updates
```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 3. Secure SSH
```bash
sudo nano /etc/ssh/sshd_config
```

**Recommended SSH settings:**
```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

```bash
sudo systemctl restart sshd
```

## Troubleshooting

### Application Not Starting
```bash
# Check PM2 logs
pm2 logs kmaincms-backend --lines 100

# Check if port is in use
sudo netstat -tlnp | grep 5005

# Check environment variables
cd /var/www/kmaincms/backend
cat .env
```

### Database Connection Issues
```bash
# Test PostgreSQL connection
psql -U kmaincms_user -d kmaincms -c "SELECT version();"

# Check PostgreSQL status
sudo systemctl status postgresql

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### Nginx Issues
```bash
# Test Nginx configuration
sudo nginx -t

# Check Nginx status
sudo systemctl status nginx

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### SSL Certificate Issues
```bash
# Renew certificate manually
sudo certbot renew

# Check certificate status
sudo certbot certificates

# Test SSL configuration
sudo nginx -t
```

## Performance Optimization

### 1. Enable Nginx Caching
```bash
sudo nano /etc/nginx/nginx.conf
```

**Add to http block:**
```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g inactive=60m;
```

### 2. Optimize PostgreSQL
```bash
sudo nano /etc/postgresql/14/main/postgresql.conf
```

**Recommended settings:**
```ini
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 2621kB
min_wal_size = 1GB
max_wal_size = 4GB
```

```bash
sudo systemctl restart postgresql
```

### 3. Configure Redis Persistence
```bash
sudo nano /etc/redis/redis.conf
```

**Enable persistence:**
```ini
save 900 1
save 300 10
save 60 10000
appendonly yes
```

```bash
sudo systemctl restart redis-server
```

## Scaling Considerations

### Horizontal Scaling
For higher traffic, consider:
1. Load balancer (Nginx or HAProxy)
2. Multiple application servers
3. Database replication
4. Redis clustering

### Vertical Scaling
For resource-intensive operations:
1. Increase server RAM
2. Upgrade CPU cores
3. Use SSD storage
4. Optimize database queries

## Backup and Disaster Recovery

### Full System Backup
```bash
# Create full backup script
nano /backups/full-backup.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/full"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U kmaincms_user kmaincms > $BACKUP_DIR/kmaincms_$DATE.sql

# Backup application files
tar -czf $BACKUP_DIR/kmaincms_files_$DATE.tar.gz /var/www/kmaincms

# Backup configuration
tar -czf $BACKUP_DIR/nginx_config_$DATE.tar.gz /etc/nginx
tar -czf $BACKUP_DIR/pm2_config_$DATE.tar.gz /root/.pm2

# Compress database backup
gzip $BACKUP_DIR/kmaincms_$DATE.sql

echo "Full backup completed: $DATE"
```

### Restore Procedure
```bash
# Restore database
gunzip /backups/kmaincms_YYYYMMDD_HHMMSS.sql.gz
psql -U kmaincms_user kmaincms < /backups/kmaincms_YYYYMMDD_HHMMSS.sql

# Restore application files
tar -xzf /backups/kmaincms_files_YYYYMMDD_HHMMSS.tar.gz -C /

# Restore configurations
tar -xzf /backups/nginx_config_YYYYMMDD_HHMMSS.tar.gz -C /
tar -xzf /backups/pm2_config_YYYYMMDD_HHMMSS.tar.gz -C /

# Restart services
pm2 restart kmaincms-backend
sudo systemctl restart nginx
```

## Support and Maintenance

### Regular Maintenance Tasks
- **Daily**: Monitor logs and application health
- **Weekly**: Review system resources and performance
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Review backup strategy and disaster recovery plan

### Update Procedure
```bash
# Backup current version
/backups/full-backup.sh

# Pull latest changes
cd /var/www/kmaincms
git pull origin main

# Install dependencies
npm install --production
cd backend && npm install --production
cd ../frontend && npm install --production

# Build frontend
cd frontend
npm run build

# Run migrations
cd ../backend
# Run any new migration scripts

# Restart application
pm2 restart kmaincms-backend
```

## Contact and Support

For issues specific to this deployment:
- Check logs: `/var/log/kmaincms/`
- Application logs: `pm2 logs kmaincms-backend`
- System logs: `/var/log/`
- Documentation: `/var/www/kmaincms/Documentation/`

## Appendix

### Useful Commands
```bash
# System information
uname -a
df -h
free -h
top

# Service management
sudo systemctl status nginx
sudo systemctl restart nginx
sudo systemctl stop nginx

# PM2 management
pm2 list
pm2 monit
pm2 restart all
pm2 delete all

# Database management
psql -U kmaincms_user -d kmaincms
pg_dump -U kmaincms_user kmaincms > backup.sql
psql -U kmaincms_user kmaincms < backup.sql

# Network debugging
ping cms.josongeri.co.ke
curl -I https://cms.josongeri.co.ke
netstat -tlnp
```

### Configuration Files Locations
- **Nginx**: `/etc/nginx/`
- **PostgreSQL**: `/etc/postgresql/14/main/`
- **Redis**: `/etc/redis/`
- **Application**: `/var/www/kmaincms/`
- **Logs**: `/var/log/kmaincms/`
- **Backups**: `/backups/`