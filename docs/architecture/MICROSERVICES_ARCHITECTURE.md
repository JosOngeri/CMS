# KMainCMS Microservices Architecture

## Overview
KMainCMS has been converted from a monolithic architecture to a microservices architecture where each sidebar item (module) is containerized as a separate mini app.

## Architecture

### Components

#### 1. API Gateway (Port 5000)
- **Purpose:** Routes requests to appropriate microservices
- **Technology:** Express.js with http-proxy-middleware
- **Responsibilities:**
  - Request routing and load balancing
  - Authentication and authorization
  - Rate limiting
  - Request logging and monitoring
  - Service discovery

#### 2. Individual Microservices (Ports 5001-5017)

Each microservice is a standalone Express.js application with:
- **Database:** Shared PostgreSQL database
- **Port:** Unique port for each service
- **Dependencies:** Express, pg, dotenv, cors, helmet, winston
- **Health Check:** `/health` endpoint for monitoring

**Service List:**
1. **auth-service** (5001) - Authentication & Authorization
2. **content-service** (5002) - Website Content Management
3. **departments-service** (5003) - Department Management
4. **gallery-service** (5004) - Photo Gallery
5. **treasury-service** (5005) - Financial Management
6. **payments-service** (5006) - Payment Processing
7. **sms-service** (5007) - SMS Messaging
8. **documents-service** (5008) - Document Management
9. **approvals-service** (5009) - Approval Workflows
10. **notifications-service** (5010) - Notification System
11. **settings-service** (5011) - System Settings
12. **reports-service** (5012) - Advanced Reporting
13. **analytics-service** (5013) - Analytics Dashboard
14. **search-service** (5014) - Advanced Search
15. **security-service** (5015) - Security Management
16. **mobile-service** (5016) - Mobile API
17. **telegram-service** (5017) - Telegram Integration

#### 3. Database Service
- **Technology:** PostgreSQL 15 Alpine
- **Port:** 5432
- **Volume:** Persistent data storage
- **Initialization:** Automatic schema loading from `/docker-entrypoint-initdb.d`

#### 4. Frontend Service
- **Technology:** React + Vite
- **Port:** 5180
- **Environment:** Production build
- **API Proxy:** Through API Gateway

#### 5. Nginx Reverse Proxy
- **Technology:** Nginx Alpine
- **Ports:** 80 (HTTP), 443 (HTTPS)
- **Responsibilities:**
  - SSL termination
  - Static file serving
  - API routing
  - Load balancing
  - Caching

## Deployment

### Prerequisites
- Docker and Docker Compose installed
- At least 4GB RAM available
- Ports 80, 443, 5000-5017, 5180 available

### Starting the System

```bash
# Build and start all services
docker-compose -f docker-compose.microservices.yml up -d

# View logs
docker-compose -f docker-compose.microservices.yml logs -f

# Stop all services
docker-compose -f docker-compose.microservices.yml down

# Rebuild specific service
docker-compose -f docker-compose.microservices.yml up -d --build auth-service
```

### Service URLs

- **Main Application:** http://localhost
- **API Gateway:** http://localhost:5000
- **Frontend:** http://localhost:5180
- **Auth Service:** http://localhost:5001
- **Content Service:** http://localhost:5002
- **Departments Service:** http://localhost:5003
- **Gallery Service:** http://localhost:5004
- **Treasury Service:** http://localhost:5005
- **Payments Service:** http://localhost:5006
- **SMS Service:** http://localhost:5007
- **Documents Service:** http://localhost:5008
- **Approvals Service:** http://localhost:5009
- **Notifications Service:** http://localhost:5010
- **Settings Service:** http://localhost:5011
- **Reports Service:** http://localhost:5012
- **Analytics Service:** http://localhost:5013
- **Search Service:** http://localhost:5014
- **Security Service:** http://localhost:5015
- **Mobile Service:** http://localhost:5016
- **Telegram Service:** http://localhost:5017

## Architecture Benefits

### Scalability
- Each service can be scaled independently
- Load balancing per service
- Resource optimization based on service needs

### Fault Isolation
- Failure in one service doesn't affect others
- Independent deployment and rollback
- Better error handling and recovery

### Development
- Teams can work on services independently
- Different technology stacks per service if needed
- Faster build and deployment times
- Parallel development

### Maintenance
- Easier to update individual services
- Clear service boundaries
- Better code organization
- Simplified testing

## Monitoring

### Health Checks
Each service has a `/health` endpoint:
```bash
curl http://localhost:5000/health
curl http://localhost:5001/health
curl http://localhost:5002/health
# ... etc
```

### Logs
```bash
# View all logs
docker-compose -f docker-compose.microservices.yml logs

# View specific service logs
docker-compose -f docker-compose.microservices.yml logs auth-service

# Follow logs in real-time
docker-compose -f docker-compose.microservices.yml logs -f api-gateway
```

## API Routing

### Through API Gateway
All API requests go through the API Gateway:
```
Client → Nginx → API Gateway → Specific Service → Database
```

### Example Routes
- `/api/auth/*` → auth-service
- `/api/content/*` → content-service
- `/api/departments/*` → departments-service
- `/api/gallery/*` → gallery-service
- `/api/treasury/*` → treasury-service
- `/api/payments/*` → payments-service
- `/api/sms/*` → sms-service
- `/api/documents/*` → documents-service
- `/api/approvals/*` → approvals-service
- `/api/notifications/*` → notifications-service
- `/api/settings/*` → settings-service
- `/api/reports/*` → reports-service
- `/api/analytics/*` → analytics-service
- `/api/search/*` → search-service
- `/api/security/*` → security-service
- `/api/mobile/*` → mobile-service
- `/api/telegram/*` → telegram-service

## Database

### Shared Database
All microservices share the same PostgreSQL database with connection pooling.

### Connection String
```
postgresql://postgres:postgres@db:5432/kmaincms
```

### Schema Management
- Database schemas are loaded from `/database` directory
- Each service has access to all tables
- Connection pooling is managed per service

## Security

### API Gateway Security
- Centralized authentication
- Rate limiting per service
- Request validation
- Security headers

### Service-to-Service Communication
- Internal network communication
- No external exposure for individual services
- API Gateway as single entry point

## Development Workflow

### Adding a New Service

1. Create service directory in `services/`
2. Add service to `docker-compose.microservices.yml`
3. Add routing in API Gateway
4. Update Nginx configuration if needed
5. Run setup script to scaffold service files

### Updating Existing Service

1. Modify service code in `services/{service-name}/`
2. Rebuild specific service:
   ```bash
   docker-compose -f docker-compose.microservices.yml up -d --build {service-name}
   ```

### Testing Services

```bash
# Test individual service health
curl http://localhost:5001/health

# Test through API Gateway
curl http://localhost:5000/api/auth/login

# Test with authentication
curl -H "Authorization: Bearer <token>" http://localhost:5000/api/content
```

## Troubleshooting

### Service Not Starting
```bash
# Check service logs
docker-compose -f docker-compose.microservices.yml logs {service-name}

# Check if port is available
netstat -tuln | grep {port}

# Restart specific service
docker-compose -f docker-compose.microservices.yml restart {service-name}
```

### Database Connection Issues
```bash
# Check database service status
docker-compose -f docker-compose.microservices.yml ps db

# Check database logs
docker-compose -f docker-compose.microservices.yml logs db

# Restart database
docker-compose -f docker-compose.microservices.yml restart db
```

### API Gateway Issues
```bash
# Check API Gateway logs
docker-compose -f docker-compose.microservices.yml logs api-gateway

# Verify service URLs are correct
docker-compose -f docker-compose.microservices.yml config

# Restart API Gateway
docker-compose -f docker-compose.microservices.yml restart api-gateway
```

## Performance Optimization

### Resource Limits
Add resource limits to docker-compose.yml:
```yaml
services:
  auth-service:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

### Connection Pooling
Each service has its own connection pool configured in the database connection.

### Caching
- API Gateway can implement request caching
- Individual services can implement their own caching strategies
- Redis can be added for distributed caching

## Future Enhancements

### Service Discovery
- Implement service registry (Consul, etcd)
- Dynamic service discovery
- Load balancing across multiple instances

### Message Queues
- Add RabbitMQ or Kafka for async communication
- Event-driven architecture
- Better decoupling of services

### Monitoring
- Add Prometheus for metrics collection
- Grafana for visualization
- ELK stack for centralized logging

### Auto-scaling
- Kubernetes integration
- Horizontal pod autoscaling
- Resource-based scaling

## Migration from Monolith

The original monolithic backend is preserved in the `backend/` directory and can still be used with the original `docker-compose.yml` for simpler deployments.

### Comparison

**Monolithic (Original):**
- Single container
- Easier to develop and test
- Simpler deployment
- Harder to scale individual components
- Single point of failure

**Microservices (New):**
- 17 independent containers
- Independent scaling
- Better fault isolation
- More complex deployment
- Requires service orchestration

## Conclusion

The microservices architecture provides better scalability, fault isolation, and independent development for each module of the KMainCMS system. Each sidebar item is now a standalone mini app that can be developed, deployed, and scaled independently.