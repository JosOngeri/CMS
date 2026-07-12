# KMainCMS Contabo Deployment Guide

## Resource Requirements

### Single VPS Deployment (Recommended for Most Use Cases)

**Minimum Recommended Specs:**
- **CPU:** 4 cores
- **RAM:** 8GB
- **Storage:** 80GB SSD
- **Cost:** ~$8-12/month on Contabo

**Recommended Specs for Production:**
- **CPU:** 8 cores
- **RAM:** 16GB
- **Storage:** 160GB SSD
- **Cost:** ~$20-25/month on Contabo

**High-Traffic Production:**
- **CPU:** 16 cores
- **RAM:** 32GB
- **Storage:** 320GB SSD
- **Cost:** ~$40-50/month on Contabo

## Why Single Server Works

### Docker Resource Efficiency
- **Container Overhead:** Each container adds minimal overhead (~10-50MB RAM)
- **Shared Resources:** All containers share the same CPU and RAM
- **Resource Management:** Docker manages allocation dynamically
- **Memory Optimization:** Idle containers use minimal resources

### Actual Resource Usage Estimates

**Per Service (Average):**
- API Gateway: ~100-200MB RAM
- Auth Service: ~150-250MB RAM
- Content Service: ~100-200MB RAM
- Other Services: ~50-150MB RAM each
- Database: ~1-2GB RAM
- Frontend: ~100-200MB RAM

**Total Estimated Usage:**
- **RAM:** ~3-5GB for all services (running simultaneously)
- **CPU:** 1-2 cores during normal operation
- **Storage:** ~20-30GB (including database and logs)

## Deployment Strategies

### Strategy 1: Single VPS (Recommended for Most Churches)

**Contabo VPS:**
- VPS XL (8GB RAM, 4 cores, 80GB SSD)
- Cost: ~$8.40/month

**Setup:**
```bash
# SSH into your Contabo VPS
ssh root@your-contabo-ip

# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Clone your repository
git clone your-repo-url
cd KMainCMS

# Start microservices
docker-compose -f docker-compose.microservices.yml up -d
```

**Pros:**
- Cost-effective (~$8-12/month)
- Simple deployment
- Easy to manage
- Sufficient for most church websites

**Cons:**
- Single point of failure
- Limited scalability
- All services share resources

### Strategy 2: Two VPS (Production Recommended)

**VPS 1 (Application Server):**
- VPS XL (8GB RAM, 4 cores, 80GB SSD)
- Cost: ~$8.40/month
- Runs: API Gateway, all microservices, Frontend

**VPS 2 (Database Server):**
- VPS L (4GB RAM, 2 cores, 40GB SSD)
- Cost: ~$4.50/month
- Runs: PostgreSQL only

**Total Cost:** ~$13/month

**Setup:**
```bash
# On VPS 1 (Application Server)
# Deploy all services except database
docker-compose -f docker-compose.microservices.yml up -d api-gateway auth-service content-service ... frontend nginx

# On VPS 2 (Database Server)
# Deploy only database
docker-compose -f docker-compose.microservices.yml up -d db
```

**Pros:**
- Better performance
- Database isolation
- More resources for application
- Better backup strategy

**Cons:**
- Higher cost
- More complex setup
- Network latency between servers

### Strategy 3: Three VPS (High Availability)

**VPS 1 (Application Server):**
- VPS XL (8GB RAM, 4 cores, 80GB SSD)
- Cost: ~$8.40/month
- Runs: API Gateway, Frontend, Nginx

**VPS 2 (Application Services):**
- VPS XL (8GB RAM, 4 cores, 80GB SSD)
- Cost: ~$8.40/month
- Runs: All microservices except database

**VPS 3 (Database Server):**
- VPS L (4GB RAM, 2 cores, 40GB SSD)
- Cost: ~$4.50/month
- Runs: PostgreSQL only

**Total Cost:** ~$21/month

**Pros:**
- High availability
- Better performance
- Isolated failures
- Better scalability

**Cons:**
- Higher cost
- Complex setup
- More maintenance

## Resource Optimization

### Docker Compose Resource Limits

Add resource limits to `docker-compose.microservices.yml`:

```yaml
services:
  api-gateway:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M

  auth-service:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M

  # Repeat for other services...
```

### Database Optimization

```yaml
db:
  image: postgres:15-alpine
  environment:
    - POSTGRES_SHARED_BUFFERS=256MB
    - POSTGRES_WORK_MEM=256MB
    - POSTGRES_MAINTENANCE_WORK_MEM=128MB
  deploy:
    resources:
      limits:
        cpus: '2'
        memory: 2G
      reservations:
        cpus: '1'
        memory: 1G
```

### Disable Unused Services

For smaller deployments, you can disable services you don't need:

```yaml
services:
  # Keep only services you need
  api-gateway:
    # ... config ...

  auth-service:
    # ... config ...

  content-service:
    # ... config ...

  # Comment out services you don't need
  # reports-service:
  #   # ... config ...

  # analytics-service:
  #   # ... config ...
```

## Monitoring on Contabo

### Check Resource Usage

```bash
# Check overall system resources
htop

# Check Docker container resource usage
docker stats

# Check specific container
docker stats auth-service

# Check disk usage
df -h

# Check memory usage
free -h
```

### Set Up Monitoring

```bash
# Install monitoring tools
apt update
apt install htop iotop

# Check Docker logs
docker-compose -f docker-compose.microservices.yml logs -f

# Check service health
curl http://localhost:5000/health
```

## Backup Strategy

### Database Backups

```bash
# Create backup script
cat > /root/backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec db pg_dump -U postgres kmaincms > /backups/kmaincms_$DATE.sql
find /backups -name "kmaincms_*.sql" -mtime +7 -delete
EOF

chmod +x /root/backup-db.sh

# Add to crontab for daily backups
crontab -e
# Add line: 0 2 * * * /root/backup-db.sh
```

### Application Backups

```bash
# Backup configuration and data
tar -czf /backups/kmaincms_$(date +%Y%m%d).tar.gz /root/KMainCMS
```

## Scaling Strategy

### Vertical Scaling (Single VPS)

**When to Scale Up:**
- High CPU usage (>80%)
- High memory usage (>80%)
- Slow response times
- Database connection issues

**How to Scale:**
1. Upgrade to larger Contabo VPS
2. Add more RAM and CPU
3. Increase storage

**Contabo Upgrade Path:**
- VPS M (2GB RAM, 1 core) → VPS L (4GB RAM, 2 cores) → VPS XL (8GB RAM, 4 cores) → VPS 4XL (16GB RAM, 8 cores)

### Horizontal Scaling (Multiple VPS)

**When to Add Servers:**
- Consistent high resource usage
- Need high availability
- Geographic distribution
- Load balancing requirements

**How to Scale:**
1. Add application server
2. Set up load balancer
3. Configure database replication
4. Implement caching layer

## Cost Comparison

### Single VPS vs Multiple Servers

**Single VPS (Recommended):**
- VPS XL: $8.40/month
- Total: $8.40/month
- 17 services on 1 server

**Multiple VPS (Traditional):**
- 17 separate VPS (VPS M each): $4.50 × 17 = $76.50/month
- Total: $76.50/month

**Savings:** $68.10/month (89% savings)

### Microservices on Single VPS vs Traditional

**Microservices on Single VPS:**
- Cost: $8.40/month
- 17 services running efficiently
- Docker resource management
- Easy deployment

**Traditional Microservices:**
- Cost: $76.50/month
- 17 separate servers
- Complex networking
- Difficult management

## Performance Optimization

### Enable Docker Swarm (Optional)

For even better resource management:

```bash
# Initialize swarm
docker swarm init

# Deploy services in swarm mode
docker stack deploy -c docker-compose.microservices.yml kmaincms
```

### Use Nginx Caching

Add caching to nginx.conf:

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m inactive=60m;

location /api/ {
    proxy_cache my_cache;
    proxy_pass http://api_gateway;
    proxy_cache_valid 200 5m;
}
```

### Database Connection Pooling

Each service has its own connection pool. Optimize in .env:

```env
DATABASE_URL=postgresql://postgres:postgres@db:5432/kmaincms?pool_size=10&connectionTimeout=30000
```

## Security on Contabo

### Firewall Configuration

```bash
# Configure UFW firewall
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw deny 5000/tcp   # Block direct API access
ufw enable
```

### SSL Certificate

```bash
# Install Certbot
apt install certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d your-domain.com
```

### SSH Security

```bash
# Disable root login
sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config

# Use SSH keys only
sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config

# Restart SSH
systemctl restart sshd
```

## Deployment Steps

### Initial Setup

1. **Purchase Contabo VPS**
   - Choose VPS XL (8GB RAM, 4 cores, 80GB SSD)
   - Select Ubuntu 22.04 LTS
   - Note your IP address and root password

2. **Connect to VPS**
   ```bash
   ssh root@your-contabo-ip
   ```

3. **Update System**
   ```bash
   apt update && apt upgrade -y
   ```

4. **Install Dependencies**
   ```bash
   apt install -y git curl ufw htop
   ```

5. **Install Docker**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   ```

6. **Install Docker Compose**
   ```bash
   curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   chmod +x /usr/local/bin/docker-compose
   ```

7. **Clone Repository**
   ```bash
   git clone your-repo-url
   cd KMainCMS
   ```

8. **Configure Environment**
   ```bash
   cp .env.example .env
   nano .env  # Update with your settings
   ```

9. **Start Services**
   ```bash
   docker-compose -f docker-compose.microservices.yml up -d
   ```

10. **Configure Nginx**
    ```bash
    nano nginx/nginx.conf
    ```

11. **Restart Nginx**
    ```bash
    docker-compose -f docker-compose.microservices.yml restart nginx
    ```

### Ongoing Maintenance

**Daily:**
- Check resource usage with `htop`
- Check service health: `curl http://localhost:5000/health`
- Review logs: `docker-compose -f docker-compose.microservices.yml logs --tail=50`

**Weekly:**
- Check disk usage: `df -h`
- Review all service logs
- Update system: `apt update && apt upgrade -y`

**Monthly:**
- Review and clean old logs
- Check for security updates
- Review backup integrity
- Update application code

## Troubleshooting

### High Memory Usage

```bash
# Check which service is using most memory
docker stats --no-stream

# Restart heavy services
docker-compose -f docker-compose.microservices.yml restart analytics-service
```

### High CPU Usage

```bash
# Check CPU usage
htop

# Identify and restart problematic service
docker-compose -f docker-compose.microservices.yml restart <service-name>
```

### Service Not Starting

```bash
# Check service logs
docker-compose -f docker-compose.microservices.yml logs <service-name>

# Rebuild service
docker-compose -f docker-compose.microservices.yml up -d --build <service-name>
```

### Database Connection Issues

```bash
# Check database status
docker-compose -f docker-compose.microservices.yml ps db

# Restart database
docker-compose -f docker-compose.microservices.yml restart db

# Check database logs
docker-compose -f docker-compose.microservices.yml logs db
```

## Conclusion

**For Most Churches:**
- Single Contabo VPS XL (8GB RAM, 4 cores) is sufficient
- Cost: ~$8.40/month
- All 17 microservices run efficiently
- Easy to manage and maintain

**For Larger Churches:**
- Two VPS setup (Application + Database)
- Cost: ~$13/month
- Better performance and isolation
- Still very cost-effective

**Key Benefits:**
- Docker makes microservices efficient on single server
- Resource sharing reduces costs significantly
- Easy to scale when needed
- Simple deployment and management

The microservices architecture provides enterprise-grade benefits without the enterprise-grade cost when deployed efficiently on a single Contabo VPS.