# Quick Start Guide - KMainCMS VPS Deployment

## Prerequisites Checklist
- [ ] VPS with Ubuntu 20.04+ 
- [ ] Domain name pointing to VPS (cms.josongeri.co.ke)
- [ ] SSH access to VPS
- [ ] Local CMS Codebase ready for upload

## 30-Minute Deployment

### Step 1: Initial VPS Setup (5 minutes)
```bash
# Connect to VPS
ssh user@your-vps-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y nodejs npm postgresql postgresql-contrib redis-server nginx git build-essential

# Install PM2 globally
sudo npm install -g pm2

# Configure PostgreSQL
sudo -u postgres psql
CREATE DATABASE kmaincms;
CREATE USER kmaincms_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE kmaincms TO kmaincms_user;
\q

# Start services
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### Step 2: Upload Application (5 minutes)
```bash
# On local machine
cd "D:/VIbeCode/KMainCMS/CMS Codebase"

# Upload using SCP
scp -r . user@your-vps-ip:/var/www/kmaincms/

# Or create archive first
tar -czf kmaincms-deploy.tar.gz .
scp kmaincms-deploy.tar.gz user@your-vps-ip:/var/www/
```

### Step 3: Install Dependencies (5 minutes)
```bash
# On VPS
cd /var/www/kmaincms

# Install dependencies
npm install --production
cd backend && npm install --production
cd ../frontend && npm install --production

# Build frontend
npm run build
```

### Step 4: Configure Environment (3 minutes)
```bash
cd /var/www/kmaincms/backend
cp .env.example .env
nano .env
```

**Minimum required settings:**
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kmaincms
DB_USER=kmaincms_user
DB_PASSWORD=your_secure_password
REDIS_URL=redis://localhost:6379
JWT_SECRET=generate_32_char_random_string
REFRESH_TOKEN_SECRET=generate_32_char_random_string
PORT=5005
NODE_ENV=production
FRONTEND_URL=https://cms.josongeri.co.ke
BACKEND_URL=https://cms.josongeri.co.ke/api
```

### Step 5: Database Setup (5 minutes)
```bash
cd /var/www/kmaincms/backend

# Run migrations
psql -U kmaincms_user -d kmaincms -f migrations/004_gallery_schema.sql
psql -U kmaincms_user -d kmaincms -f migrations/005_fix_missing_columns.sql
psql -U kmaincms_user -d kmaincms -f migrations/006_settings_schema.sql
psql -U kmaincms_user -d kmaincms -f migrations/007_auth_tables.sql
psql -U kmaincms_user -d kmaincms -f migrations/008_permissions_schema.sql

# Create admin user
node create-admin.js
```

### Step 6: Nginx Configuration (5 minutes)
```bash
# Create basic Nginx config
sudo nano /etc/nginx/sites-available/kmaincms
```

**Basic configuration:**
```nginx
server {
    listen 80;
    server_name cms.josongeri.co.ke;

    location / {
        root /var/www/kmaincms/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5005;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/kmaincms /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 7: Start Application (2 minutes)
```bash
cd /var/www/kmaincms/backend

# Start with PM2
pm2 start server.js --name kmaincms-backend
pm2 save
pm2 startup
```

### Step 8: SSL Setup (5 minutes)
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d cms.josongeri.co.ke
```

## Verification

### Test Application
```bash
# Test backend
curl https://cms.josongeri.co.ke/api/health

# Test frontend
curl https://cms.josongeri.co.ke

# Check PM2 status
pm2 status

# Check Nginx status
sudo systemctl status nginx
```

### Access Application
- **Frontend**: https://cms.josongeri.co.ke
- **Backend API**: https://cms.josongeri.co.ke/api
- **Admin Login**: Use credentials created in Step 5

## Common Issues

### Port Already in Use
```bash
# Find process using port 5005
sudo lsof -i :5005

# Kill process
sudo kill -9 <PID>
```

### Permission Issues
```bash
# Fix permissions
sudo chown -R $USER:$USER /var/www/kmaincms
sudo chmod -R 755 /var/www/kmaincms
```

### Database Connection Failed
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -U kmaincms_user -d kmaincms -c "SELECT version();"
```

### Nginx 502 Bad Gateway
```bash
# Check if backend is running
pm2 status

# Check backend logs
pm2 logs kmaincms-backend

# Restart backend
pm2 restart kmaincms-backend
```

## Next Steps

1. **Configure backups**: Set up automated database backups
2. **Monitor logs**: Set up log monitoring and alerts
3. **Security hardening**: Configure firewall and fail2ban
4. **Performance tuning**: Optimize Nginx, PostgreSQL, and Redis
5. **Domain configuration**: Update DNS records if needed

## Support

For detailed troubleshooting, see `VPS_DEPLOYMENT_GUIDE.md`
For application-specific issues, check application logs in `/var/log/kmaincms/`