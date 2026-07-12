# Troubleshooting Guide - KMainCMS VPS Deployment

## Common Issues and Solutions

### Application Startup Issues

#### Issue: Application Won't Start
**Symptoms:**
- PM2 shows application as "errored"
- Port already in use errors
- Missing dependency errors

**Solutions:**
```bash
# Check PM2 logs
pm2 logs kmaincms-backend --lines 50

# Check if port is in use
sudo netstat -tlnp | grep 5005
sudo lsof -i :5005

# Kill process using port
sudo kill -9 <PID>

# Reinstall dependencies
cd /var/www/kmaincms/backend
rm -rf node_modules package-lock.json
npm install --production

# Check environment variables
cat .env
node -e "require('dotenv').config(); console.log(process.env.DB_HOST)"
```

#### Issue: Database Connection Failed
**Symptoms:**
- "Connection refused" errors
- "Authentication failed" errors
- Timeout errors

**Solutions:**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Start PostgreSQL if not running
sudo systemctl start postgresql

# Test database connection
psql -U kmaincms_user -d kmaincms -c "SELECT version();"

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log

# Verify database exists
sudo -u postgres psql -l

# Reset database password
sudo -u postgres psql
ALTER USER kmaincms_user WITH PASSWORD 'new_secure_password';
\q

# Update .env file with new password
nano /var/www/kmaincms/backend/.env
```

#### Issue: Redis Connection Failed
**Symptoms:**
- "Redis connection failed" errors
- Cache not working
- Session errors

**Solutions:**
```bash
# Check Redis status
sudo systemctl status redis-server

# Start Redis if not running
sudo systemctl start redis-server

# Test Redis connection
redis-cli ping
# Should return: PONG

# Check Redis logs
sudo tail -f /var/log/redis/redis-server.log

# Restart Redis
sudo systemctl restart redis-server

# Check Redis configuration
sudo nano /etc/redis/redis.conf
```

### Nginx Issues

#### Issue: 502 Bad Gateway
**Symptoms:**
- Nginx returns 502 error
- Backend not accessible through Nginx
- Works when accessing backend directly

**Solutions:**
```bash
# Check if backend is running
pm2 status
curl http://localhost:5005/api/health

# Check Nginx configuration
sudo nginx -t

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx

# Check upstream configuration
sudo nano /etc/nginx/sites-available/kmaincms
# Verify proxy_pass points to correct backend address
```

#### Issue: 504 Gateway Timeout
**Symptoms:**
- Requests timeout after 60 seconds
- Long-running operations fail
- File uploads fail

**Solutions:**
```bash
# Increase timeout in Nginx config
sudo nano /etc/nginx/sites-available/kmaincms

# Add to location block:
proxy_connect_timeout 300s;
proxy_send_timeout 300s;
proxy_read_timeout 300s;

# Restart Nginx
sudo systemctl restart nginx

# Check application performance
pm2 monit
```

#### Issue: SSL Certificate Errors
**Symptoms:**
- Browser shows SSL warnings
- Certificate expired
- Domain mismatch

**Solutions:**
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Force renewal
sudo certbot renew --force-renewal

# Check certificate expiration
openssl x509 -in /etc/letsencrypt/live/cms.josongeri.co.ke/cert.pem -noout -dates

# Re-obtain certificate
sudo certbot --nginx -d cms.josongeri.co.ke --force-renewal

# Check Nginx SSL configuration
sudo nginx -t
```

### Performance Issues

#### Issue: Slow Application Response
**Symptoms:**
- Pages load slowly
- API calls timeout
- High CPU usage

**Solutions:**
```bash
# Check system resources
htop
df -h
free -h

# Check PM2 resource usage
pm2 monit

# Check database performance
psql -U kmaincms_user -d kmaincms -c "SELECT * FROM pg_stat_activity;"

# Enable query logging in PostgreSQL
sudo nano /etc/postgresql/14/main/postgresql.conf
# Add: log_min_duration_statement = 1000

# Restart PostgreSQL
sudo systemctl restart postgresql

# Check slow queries
sudo tail -f /var/log/postgresql/postgresql-*.log | grep "duration:"
```

#### Issue: High Memory Usage
**Symptoms:**
- Application crashes due to OOM
- System becomes unresponsive
- Swap usage high

**Solutions:**
```bash
# Check memory usage
free -h
pm2 monit

# Increase PM2 memory limit
pm2 restart kmaincms-backend --max-memory-restart 2G

# Add to ecosystem.config.cjs:
max_memory_restart: '2G'

# Check for memory leaks
node --inspect backend/server.js
# Connect Chrome DevTools to inspect

# Restart application regularly
pm2 restart kmaincms-backend
```

#### Issue: Database Performance
**Symptoms:**
- Slow queries
- Database locks
- High database CPU usage

**Solutions:**
```bash
# Check active connections
psql -U kmaincms_user -d kmaincms -c "SELECT count(*) FROM pg_stat_activity;"

# Check long-running queries
psql -U kmaincms_user -d kmaincms -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';"

# Kill long-running queries
psql -U kmaincms_user -d kmaincms -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid = <PID>;"

# Analyze database tables
psql -U kmaincms_user -d kmaincms -c "ANALYZE;"

# Reindex database
psql -U kmaincms_user -d kmaincms -c "REINDEX DATABASE kmaincms;"

# Update PostgreSQL statistics
psql -U kmaincms_user -d kmaincms -c "VACUUM ANALYZE;"
```

### File Upload Issues

#### Issue: File Upload Fails
**Symptoms:**
- Uploads timeout
- File size errors
- Permission denied errors

**Solutions:**
```bash
# Check upload directory permissions
ls -la /var/www/kmaincms/uploads
sudo chown -R www-data:www-data /var/www/kmaincms/uploads
sudo chmod -R 755 /var/www/kmaincms/uploads

# Check Nginx upload limit
sudo nano /etc/nginx/nginx.conf
# Add: client_max_body_size 20M;

# Check application upload limit
nano /var/www/kmaincms/backend/.env
# Set: MAX_FILE_SIZE=20971520 (20MB)

# Restart services
sudo systemctl restart nginx
pm2 restart kmaincms-backend
```

### Authentication Issues

#### Issue: Login Fails
**Symptoms:**
- Invalid credentials error
- JWT token errors
- Session timeout

**Solutions:**
```bash
# Check JWT secrets
cat /var/www/kmaincms/backend/.env | grep JWT_SECRET

# Verify admin user exists
psql -U kmaincms_user -d kmaincms -c "SELECT id, email, role FROM users WHERE role = 'admin';"

# Reset admin password
cd /var/www/kmaincms/backend
node create-admin.js

# Check session configuration
cat /var/www/kmaincms/backend/.env | grep SESSION

# Clear Redis cache
redis-cli FLUSHALL
```

### External API Issues

#### Issue: M-Pesa Integration Fails
**Symptoms:**
- Payment processing fails
- Callback not received
- Authentication errors

**Solutions:**
```bash
# Check M-Pesa configuration
cat /var/www/kmaincms/backend/.env | grep MPESA

# Test M-Pesa credentials
curl -X POST https://sandbox.safaricom.co.ke/mpesa/c2b/v1/registerurl \
  -H "Authorization: Bearer <access_token>" \
  -d "<test_data>"

# Check callback URL configuration
curl https://cms.josongeri.co.ke/api/payments/mpesa/test

# Review M-Pesa logs
pm2 logs kmaincms-backend | grep mpesa
```

#### Issue: SMS Integration Fails
**Symptoms:**
- SMS not sent
- API authentication errors
- Delivery reports not received

**Solutions:**
```bash
# Check SMS configuration
cat /var/www/kmaincms/backend/.env | grep SMS

# Test SMS API directly
curl -X POST https://api.josms.com/send \
  -d "api_key=<key>&message=test&recipient=2547XXXXXXXX"

# Check SMS logs
pm2 logs kmaincms-backend | grep sms

# Verify API key validity
# Contact SMS provider support
```

### Backup and Recovery Issues

#### Issue: Backup Fails
**Symptoms:**
- Backup script errors
- Incomplete backups
- Permission denied

**Solutions:**
```bash
# Test database backup manually
pg_dump -U kmaincms_user kmaincms > test_backup.sql

# Check backup directory permissions
ls -la /backups
sudo chown -R $USER:$USER /backups

# Test backup script
bash /backups/backup-kmaincms.sh

# Check disk space
df -h

# Verify PostgreSQL user permissions
psql -U postgres -c "\du"
```

#### Issue: Restore Fails
**Symptoms:**
- Database restore errors
- Data corruption
- Missing tables

**Solutions:**
```bash
# Verify backup file integrity
gunzip -t /backups/kmaincms_YYYYMMDD.sql.gz

# Test restore on test database
createdb test_restore
psql -U kmaincms_user test_restore < /backups/kmaincms_YYYYMMDD.sql
dropdb test_restore

# Restore with error handling
psql -U kmaincms_user kmaincms < /backups/kmaincms_YYYYMMDD.sql 2>&1 | tee restore.log

# Check for missing tables
psql -U kmaincms_user kmaincms -c "\dt"
```

### Security Issues

#### Issue: Brute Force Attacks
**Symptoms:**
- Multiple failed login attempts
- High CPU usage from auth requests
- Suspicious IP addresses in logs

**Solutions:**
```bash
# Check auth logs
pm2 logs kmaincms-backend | grep "failed login"

# Install and configure fail2ban
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Create fail2ban filter
sudo nano /etc/fail2ban/jail.local
```

```ini
[kmaincms-auth]
enabled = true
port = 80,443
filter = kmaincms-auth
logpath = /var/log/kmaincms/error.log
maxretry = 5
bantime = 3600
findtime = 600
```

```bash
# Restart fail2ban
sudo systemctl restart fail2ban

# Check banned IPs
sudo fail2ban-client status kmaincms-auth
```

#### Issue: SSL/TLS Vulnerabilities
**Symptoms:**
- Security scanner warnings
- Outdated protocols
- Weak ciphers

**Solutions:**
```bash
# Test SSL configuration
openssl s_client -connect cms.josongeri.co.ke:443 -servername cms.josongeri.co.ke

# Update Nginx SSL configuration
sudo nano /etc/nginx/sites-available/kmaincms

# Add strong SSL settings:
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5;
ssl_prefer_server_ciphers on;

# Restart Nginx
sudo systemctl restart nginx

# Test with SSL labs
# Visit: https://www.ssllabs.com/ssltest/
```

### Monitoring and Debugging

#### Enable Debug Logging
```bash
# Update environment
nano /var/www/kmaincms/backend/.env
# Set: LOG_LEVEL=debug

# Restart application
pm2 restart kmaincms-backend

# Monitor debug logs
pm2 logs kmaincms-backend
```

#### Database Query Analysis
```bash
# Enable query logging
sudo nano /etc/postgresql/14/main/postgresql.conf
# Add: log_min_duration_statement = 1000

# Restart PostgreSQL
sudo systemctl restart postgresql

# Monitor slow queries
sudo tail -f /var/log/postgresql/postgresql-*.log | grep "duration:"
```

#### Real-time Monitoring
```bash
# System resources
htop

# Application monitoring
pm2 monit

# Network monitoring
sudo netstat -tlnp

# Disk I/O monitoring
sudo iotop
```

## Emergency Procedures

### Application Down
```bash
# 1. Check application status
pm2 status

# 2. Check logs
pm2 logs kmaincms-backend --lines 100

# 3. Restart application
pm2 restart kmaincms-backend

# 4. If restart fails, check system resources
htop
df -h

# 5. Check database connectivity
psql -U kmaincms_user -d kmaincms -c "SELECT version();"

# 6. Check Nginx
sudo systemctl status nginx
sudo nginx -t
sudo systemctl restart nginx
```

### Database Corruption
```bash
# 1. Stop application
pm2 stop kmaincms-backend

# 2. Backup current state
pg_dump -U kmaincms_user kmaincms > emergency_backup.sql

# 3. Check database integrity
psql -U kmaincms_user kmaincms -c "VACUUM FULL;"

# 4. If corruption persists, restore from backup
psql -U kmaincms_user kmaincms < /backups/kmaincms_YYYYMMDD.sql

# 5. Restart application
pm2 start kmaincms-backend
```

### Security Breach
```bash
# 1. Immediately change all secrets
nano /var/www/kmaincms/backend/.env
# Update: JWT_SECRET, REFRESH_TOKEN_SECRET, SESSION_SECRET

# 2. Change database passwords
sudo -u postgres psql
ALTER USER kmaincms_user WITH PASSWORD 'new_secure_password';
\q

# 3. Restart all services
pm2 restart all
sudo systemctl restart nginx
sudo systemctl restart postgresql
sudo systemctl restart redis-server

# 4. Review logs for suspicious activity
sudo tail -1000 /var/log/nginx/access.log
pm2 logs kmaincms-backend --lines 1000

# 5. Enable additional security
sudo ufw enable
sudo fail2ban-client reload
```

## Getting Help

### Log Locations
- **Application logs**: `/var/log/kmaincms/`
- **Nginx logs**: `/var/log/nginx/`
- **PostgreSQL logs**: `/var/log/postgresql/`
- **System logs**: `/var/log/syslog`

### Useful Commands
```bash
# System information
uname -a
df -h
free -h

# Service status
sudo systemctl status nginx
sudo systemctl status postgresql
sudo systemctl status redis-server

# Process management
pm2 list
pm2 monit
pm2 logs

# Network debugging
ping cms.josongeri.co.ke
curl -I https://cms.josongeri.co.ke
netstat -tlnp
```

### Support Resources
- Full deployment guide: `VPS_DEPLOYMENT_GUIDE.md`
- Environment configuration: `ENVIRONMENT_CONFIG.md`
- Application documentation: `/var/www/kmaincms/README.md`
- Session logs: Check your Windsurf chat logs directory