# Phase 16: Deployment & DevOps - Implementation Guide

## Overview
This document provides comprehensive guidance for deploying and operating the KMainCMS system in production.

## Table of Contents
1. [Docker Deployment](#docker-deployment)
2. [Environment Configuration](#environment-configuration)
3. [CI/CD Pipeline](#cicd-pipeline)
4. [SSL/TLS Setup](#ssltls-setup)
5. [Monitoring & Alerting](#monitoring--alerting)
6. [Backup & Recovery](#backup--recovery)
7. [Log Aggregation](#log-aggregation)
8. [Production Checklist](#production-checklist)

---

## Docker Deployment

### Prerequisites
- Docker Engine 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum
- 20GB disk space minimum

### Quick Start

1. **Clone repository**
```bash
git clone <repository-url>
cd KMainCMS
```

2. **Configure environment**
```bash
cp .env.production .env
# Edit .env with your production values
```

3. **Run setup script**
```bash
chmod +x scripts/setup-production.sh
./scripts/setup-production.sh
```

4. **Start services**
```bash
docker-compose up -d
```

5. **Check health**
```bash
curl http://localhost/api/health
```

### Docker Services

| Service | Port | Description |
|---------|------|-------------|
| postgres | 5432 | PostgreSQL database |
| redis | 6379 | Redis cache |
| backend | 3000 | Node.js API server |
| frontend | 80 | React frontend (nginx) |
| nginx | 443, 8080 | Reverse proxy |

### Docker Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Restart specific service
docker-compose restart backend

# Update and restart
docker-compose pull
docker-compose up -d

# View resource usage
docker stats
```

---

## Environment Configuration

### Required Environment Variables

#### Database
- `DB_HOST` - Database host (default: postgres)
- `DB_PORT` - Database port (default: 5432)
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name

#### Redis
- `REDIS_HOST` - Redis host (default: redis)
- `REDIS_PORT` - Redis port (default: 6379)
- `REDIS_PASSWORD` - Redis password

#### Security
- `JWT_SECRET` - JWT signing secret
- `SESSION_SECRET` - Session encryption secret

#### External Services
- `TELEGRAM_BOT_TOKEN` - Telegram bot token
- `MPESA_CONSUMER_KEY` - M-Pesa consumer key
- `MPESA_CONSUMER_SECRET` - M-Pesa consumer secret
- `OPENAI_API_KEY` - OpenAI API key

### Security Best Practices

1. **Never commit .env files** to version control
2. **Use strong passwords** (minimum 32 characters)
3. **Rotate secrets regularly** (every 90 days)
4. **Use different secrets** for each environment
5. **Store secrets securely** (use secret management tools)

---

## CI/CD Pipeline

### GitHub Actions Workflows

#### Production Deployment (`.github/workflows/deploy.yml`)
- Triggers: Push to `main` branch
- Builds and pushes Docker images
- Deploys to production server
- Runs database migrations
- Performs health checks

#### Staging Deployment (`.github/workflows/deploy-staging.yml`)
- Triggers: Push to `develop` branch
- Deploys to staging environment
- Runs automated tests

### Required GitHub Secrets

Configure these secrets in your GitHub repository settings:

| Secret | Description |
|--------|-------------|
| `DOCKER_USERNAME` | Docker Hub username |
| `DOCKER_PASSWORD` | Docker Hub password |
| `SERVER_HOST` | Production server IP/hostname |
| `SERVER_USER` | SSH username for server |
| `SSH_PRIVATE_KEY` | SSH private key for server |
| `STAGING_SERVER_HOST` | Staging server IP/hostname |
| `STAGING_SERVER_USER` | SSH username for staging |

### Manual Deployment

```bash
# Build images
docker-compose build

# Push to registry
docker push your-username/kmaincms-backend:latest
docker push your-username/kmaincms-frontend:latest

# Deploy to server
ssh user@server
cd /opt/kmaincms
docker-compose pull
docker-compose up -d
```

---

## SSL/TLS Setup

### Option 1: Let's Encrypt (Recommended)

```bash
# Run SSL setup script
chmod +x scripts/setup-ssl.sh
./scripts/setup-ssl.sh
```

The script will:
- Install certbot
- Obtain SSL certificate for your domain
- Configure auto-renewal
- Copy certificates to nginx directory

### Option 2: Self-Signed (Development Only)

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem
```

### SSL Configuration

SSL certificates are configured in `nginx/nginx.conf`:
- Certificate: `nginx/ssl/cert.pem`
- Private key: `nginx/ssl/key.pem`
- Protocols: TLSv1.2, TLSv1.3
- Auto-renewal: Configured via cron

### SSL Testing

Test your SSL configuration:
```bash
# Online test
https://www.ssllabs.com/ssltest/

# Manual test
openssl s_client -connect yourdomain.com:443
```

---

## Monitoring & Alerting

### Stack Components

- **Prometheus** - Metrics collection (port 9090)
- **Grafana** - Visualization (port 3001)
- **Alertmanager** - Alert management (port 9093)
- **Node Exporter** - System metrics (port 9100)
- **cAdvisor** - Container metrics (port 8080)

### Starting Monitoring Stack

```bash
docker-compose -f docker-compose.monitoring.yml up -d
```

### Accessing Dashboards

- **Grafana**: http://your-server:3001
  - Default user: `admin`
  - Default password: `changeme` (change immediately)
- **Prometheus**: http://your-server:9090
- **Alertmanager**: http://your-server:9093

### Configured Alerts

The system includes pre-configured alerts for:
- Application downtime
- High error rates
- High response times
- Database connection issues
- High memory/CPU usage
- Low disk space
- Container failures

### Alert Configuration

Configure alert notifications in `monitoring/alertmanager/alertmanager.yml`:
- Email alerts
- Slack webhooks
- Custom webhooks

---

## Backup & Recovery

### Backup Types

1. **Database Backups** - Daily automated backups
2. **File Backups** - Daily automated backups of uploads
3. **Configuration Backups** - Manual backup of config files

### Automated Backups

Backups are configured via cron:
- Database: Daily at 2:00 AM
- Files: Daily at 3:00 AM
- Verification: Weekly on Sundays at 4:00 AM

### Manual Backup

```bash
# Database backup
./scripts/backup-database.sh

# Files backup
./scripts/backup-files.sh
```

### Restore from Backup

```bash
# Database restore
./scripts/restore-database.sh kmaincms_20240623_120000.sql.gz

# Files restore
tar -xzf database/backups/kmaincms_files_20240623_120000.tar.gz -C backend/uploads
```

### Backup Verification

```bash
# Verify backups
./scripts/verify-backups.sh
```

### Backup Retention

- Database backups: 30 days
- File backups: 30 days
- Older backups are automatically removed

---

## Log Aggregation

### Stack Components

- **Elasticsearch** - Log storage and search (port 9200)
- **Logstash** - Log processing (port 5044)
- **Kibana** - Log visualization (port 5601)
- **Filebeat** - Log collection agent

### Starting Logging Stack

```bash
docker-compose -f docker-compose.logging.yml up -d
```

### Accessing Kibana

- **Kibana**: http://your-server:5601
- Create index pattern: `kmaincms-*`
- Time field: `@timestamp`

### Log Sources

- Docker container logs
- Backend application logs
- Frontend nginx logs
- System logs

### Log Queries

Example Kibana queries:
```
# Backend errors
service:backend AND log_level:error

# High response times
response_time:>1000

# Specific user
user_id:12345

# Time range
@timestamp:[now-1h TO now]
```

---

## Production Checklist

### Pre-Deployment

- [ ] Update `.env` with production values
- [ ] Generate strong secrets (JWT, session, database)
- [ ] Configure SSL/TLS certificates
- [ ] Set up monitoring and alerting
- [ ] Configure backup scripts
- [ ] Test all services locally
- [ ] Run security audit: `npm run security-audit`
- [ ] Run performance benchmarks: `npm run benchmark`

### Deployment

- [ ] Deploy to staging first
- [ ] Run full test suite on staging
- [ ] Verify staging deployment
- [ ] Deploy to production
- [ ] Run database migrations
- [ ] Verify health endpoints
- [ ] Check monitoring dashboards
- [ ] Test critical user workflows

### Post-Deployment

- [ ] Verify SSL certificate
- [ ] Test backup restoration
- [ ] Configure alert notifications
- [ ] Set up log aggregation
- [ ] Document any issues
- [ ] Update runbook
- [ ] Train team on new processes

### Ongoing Maintenance

- [ ] Monitor system health daily
- [ ] Review alerts weekly
- [ ] Verify backups weekly
- [ ] Update dependencies monthly
- [ ] Review security advisories
- [ ] Performance tuning quarterly
- [ ] Disaster recovery testing annually

---

## Troubleshooting

### Common Issues

#### Container won't start
```bash
# Check logs
docker-compose logs backend

# Check resource usage
docker stats

# Restart service
docker-compose restart backend
```

#### Database connection failed
```bash
# Check database is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Verify environment variables
docker-compose exec backend env | grep DB_
```

#### High memory usage
```bash
# Check container memory
docker stats

# Restart services
docker-compose restart

# Check for memory leaks
docker-compose exec backend npm run benchmark
```

#### SSL certificate expired
```bash
# Renew certificate
certbot renew

# Restart nginx
docker-compose restart nginx
```

### Emergency Procedures

#### Application down
1. Check monitoring dashboards
2. Review application logs
3. Restart affected services
4. If persistent, restore from backup

#### Database corruption
1. Stop application services
2. Restore from latest backup
3. Verify data integrity
4. Restart services

#### Security incident
1. Immediately change all secrets
2. Review access logs
3. Rotate SSL certificates
4. Scan for malware
5. Document incident

---

## Support and Resources

### Documentation
- [Docker Documentation](https://docs.docker.com/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [ELK Stack Documentation](https://www.elastic.co/guide/)

### Monitoring
- Grafana: http://your-server:3001
- Prometheus: http://your-server:9090
- Kibana: http://your-server:5601

### Emergency Contacts
- System Administrator: [contact]
- DevOps Team: [contact]
- Security Team: [contact]

---

## Conclusion

This deployment guide provides a comprehensive framework for deploying and operating KMainCMS in production. Follow the checklists and procedures to ensure reliable, secure, and maintainable operations.

For questions or issues, refer to the troubleshooting section or contact the support team.
