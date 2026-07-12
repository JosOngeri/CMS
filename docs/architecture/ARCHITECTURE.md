# KMainCMS System Architecture

## Overview
KMainCMS is a modular church management system designed for scalability, security, and maintainability. This document describes the system architecture, design patterns, and technical decisions.

## Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: Helmet, bcrypt, rate limiting
- **Caching**: Node-cache
- **Testing**: Jest, Supertest

### Frontend
- **Framework**: React
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Styling**: CSS Modules
- **Build Tool**: Vite

### Infrastructure
- **Containerization**: Docker
- **Process Management**: PM2
- **Reverse Proxy**: Nginx
- **Database**: PostgreSQL

## Architecture Patterns

### Modular Architecture
The system follows a modular architecture where each functional area is a self-contained module:

```
KMainCMS/
├── AUTH Module
├── TELEGRAM Module
├── CONTENT Module
├── DEPARTMENTS Module
├── GALLERY Module
├── TREASURY Module
├── PAYMENTS Module
├── SMS Module
├── DOCUMENTS Module
├── APPROVALS Module
├── NOTIFICATIONS Module
├── SETTINGS Module
├── REPORTS Module
├── ANALYTICS Module
├── SEARCH Module
├── SECURITY Module
└── MOBILE Module
```

### Layered Architecture
Each module follows a layered architecture:

```
┌─────────────────┐
│   Routes Layer   │  - API endpoint definitions
├─────────────────┤
│ Controllers     │  - Request handling logic
├─────────────────┤
│ Services/Helpers│  - Business logic
├─────────────────┤
│   Database      │  - Data persistence
└─────────────────┘
```

### API Design Patterns

#### RESTful API
- Resource-based URLs
- HTTP methods for operations (GET, POST, PUT, DELETE)
- Standard HTTP status codes
- Consistent response format

#### Authentication Flow
```
1. User submits credentials
2. Server validates credentials
3. Server generates JWT token
4. Client stores token
5. Client includes token in subsequent requests
6. Server validates token on each request
```

## Database Design

### Schema Design Principles
- Normalized database structure
- Foreign key constraints for referential integrity
- Indexes for performance optimization
- Audit fields (created_at, updated_at, created_by)
- Soft deletes where appropriate

### Key Relationships
- Users → Roles (Many-to-Many)
- Users → Departments (Many-to-Many)
- Content → Categories (Many-to-One)
- Documents → Categories (Many-to-One)
- Transactions → Accounts (Many-to-One)
- Approval Requests → Workflows (Many-to-One)

## Security Architecture

### Authentication & Authorization
- JWT-based stateless authentication
- Role-based access control (RBAC)
- Hierarchical role system
- Department-specific permissions

### Security Layers
1. **Network Layer**: CORS, rate limiting
2. **Application Layer**: Input validation, sanitization
3. **Data Layer**: Parameterized queries, encryption
4. **Session Layer**: JWT tokens, refresh tokens

### Security Features
- Password hashing with bcrypt
- SQL injection prevention
- XSS protection
- CSRF protection
- Security headers (Helmet)
- IP blocking capability
- Failed login tracking
- Session management

## Performance Optimization

### Caching Strategy
- Three-tier caching system:
  - Short-term cache (1 minute) - Real-time data
  - Medium-term cache (10 minutes) - Frequently accessed data
  - Long-term cache (1 hour) - Static data

### Database Optimization
- Connection pooling
- Query optimization
- Indexes on frequently queried columns
- Batch operations for bulk data

### API Optimization
- Rate limiting to prevent abuse
- Response compression
- Lazy loading for large datasets
- Pagination for list endpoints

## Scalability Considerations

### Horizontal Scaling
- Stateless API design
- Load balancer support
- Database connection pooling
- Cache invalidation strategy

### Vertical Scaling
- Efficient code execution
- Memory optimization
- Database query optimization
- Resource monitoring

## Error Handling

### Error Types
- Validation errors (400)
- Authentication errors (401)
- Authorization errors (403)
- Not found errors (404)
- Server errors (500)

### Error Response Format
```json
{
  "success": false,
  "error": "Error message",
  "details": { ... }
}
```

### Logging Strategy
- Structured logging with Winston
- Log levels: error, warn, info, debug
- Request/response logging
- Error stack traces in development
- Sensitive data redaction

## Monitoring & Observability

### Health Checks
- `/health` endpoint for basic health
- Database connectivity check
- External service availability
- Cache status monitoring

### Metrics to Monitor
- Response times
- Error rates
- Database query performance
- Cache hit rates
- Active user sessions
- API rate limit hits

## Deployment Architecture

### Development Environment
- Local development with hot reload
- Local PostgreSQL database
- Environment variables in .env file
- Debug logging enabled

### Production Environment
- Docker containerization
- Docker Compose orchestration
- Nginx reverse proxy
- PM2 process management
- Environment-specific configuration
- Production logging

### CI/CD Pipeline
- Automated testing
- Code quality checks
- Security scanning
- Automated deployment
- Rollback capability

## Integration Points

### External Services
- Telegram Bot API
- SMS providers (Africas Talking, etc.)
- Email service (SMTP)
- Payment gateways
- Cloud storage (for documents)

### Integration Patterns
- Service layer abstraction
- Error handling and retry logic
- Fallback mechanisms
- Rate limiting for external APIs
- Webhook support

## Data Flow

### Request Flow
```
Client → Nginx → Express → Middleware → Controller → Service → Database
```

### Authentication Flow
```
Client → Login → Validate → Generate JWT → Return Token
Client → API → Validate JWT → Process Request → Return Response
```

### Approval Workflow Flow
```
User → Create Request → Route to Approver → Approver Action → Next Step → Complete
```

## Future Enhancements

### Planned Features
- Real-time notifications with WebSockets
- Advanced analytics with machine learning
- Mobile app development
- Multi-language support
- Advanced reporting with data visualization
- Integration with church management software
- API versioning
- GraphQL support

### Technical Debt
- Frontend implementation
- Comprehensive test coverage
- Performance monitoring dashboard
- Automated security scanning
- Documentation improvements
- Code refactoring for maintainability

## Conclusion

KMainCMS is designed with a focus on modularity, security, and scalability. The architecture supports easy addition of new modules, maintains clean separation of concerns, and provides a solid foundation for future enhancements.