# KMainCMS Developer Guide

## Overview
KMainCMS is a comprehensive church management system built with Node.js, Express, PostgreSQL, and React. This guide provides developers with the information needed to understand, extend, and maintain the system.

## Architecture

### Backend Structure
```
backend/
├── config/           # Configuration files (database, logging, etc.)
├── controllers/      # Request handlers for each module
├── helpers/          # Utility functions and services
├── middleware/       # Express middleware (auth, security, etc.)
├── models/           # Database models (if using ORM)
├── routes/           # API route definitions
├── tests/            # Test files
├── database/         # SQL schema files
├── server.js         # Main application entry point
└── package.json      # Dependencies and scripts
```

### Frontend Structure
```
frontend/
├── src/
│   ├── components/   # Reusable UI components
│   ├── pages/        # Page components
│   ├── contexts/     # React context providers
│   ├── services/     # API service layer
│   ├── utils/        # Utility functions
│   └── App.jsx       # Main application component
└── package.json      # Dependencies and scripts
```

## Module System

### Implemented Modules
1. **AUTH** - Authentication and authorization
2. **TELEGRAM** - Telegram channel integration
3. **CONTENT** - Website content management
4. **DEPARTMENTS** - Department management
5. **GALLERY** - Photo gallery management
6. **TREASURY** - Financial management
7. **PAYMENTS** - Payment processing
8. **SMS** - SMS messaging
9. **DOCUMENTS** - Document management
10. **APPROVALS** - Approval workflows
11. **NOTIFICATIONS** - Notification system
12. **SETTINGS** - System settings
13. **REPORTS** - Advanced reporting
14. **ANALYTICS** - Analytics dashboard
15. **SEARCH** - Advanced search
16. **SECURITY** - Security management
17. **MOBILE** - Mobile API support

## Database Schema

### Key Tables
- `users` - User accounts and authentication
- `roles` - Role definitions
- `user_roles` - User-role assignments
- `departments` - Department information
- `content_items` - Website content
- `transactions` - Financial transactions
- `documents` - Document management
- `approval_requests` - Approval workflow requests
- `notifications` - User notifications

### Database Connection
The system uses PostgreSQL with connection pooling. Database configuration is in `config/database.js`.

## API Design

### Authentication
All protected endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <token>
```

### Response Format
All API responses follow this format:
```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

### Error Handling
Errors are returned with appropriate HTTP status codes:
- 400 - Bad Request
- 401 - Unauthorized
- 403 - Forbidden
- 404 - Not Found
- 500 - Internal Server Error

## Security Features

### Implemented Security Measures
- JWT token authentication
- Password hashing with bcrypt
- Rate limiting on all endpoints
- XSS protection
- SQL injection prevention
- CORS configuration
- Security headers (Helmet)
- Input sanitization
- SQL injection detection
- IP blocking capability
- Session management

### Security Best Practices
1. Never commit sensitive data to version control
2. Use environment variables for configuration
3. Implement proper error handling
4. Validate all user input
5. Use parameterized queries
6. Keep dependencies updated
7. Implement proper logging

## Development Workflow

### Setting Up Development Environment
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up PostgreSQL database
4. Configure environment variables in `.env`
5. Run database migrations: `psql -U postgres -d kmaincms -f database/*.sql`
6. Start development server: `npm run dev`

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Code Style
- Use ESLint for code linting
- Follow existing code patterns
- Add JSDoc comments for functions
- Use meaningful variable names
- Keep functions small and focused

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Content
- `GET /api/content` - Get all content
- `POST /api/content` - Create content
- `GET /api/content/:slug` - Get content by slug
- `PUT /api/content/:id` - Update content
- `DELETE /api/content/:id` - Delete content

### Departments
- `GET /api/departments` - Get all departments
- `POST /api/departments` - Create department
- `GET /api/departments/:id` - Get department by ID
- `PUT /api/departments/:id` - Update department
- `DELETE /api/departments/:id` - Delete department

### Treasury
- `GET /api/treasury/accounts` - Get accounts
- `GET /api/treasury/transactions` - Get transactions
- `POST /api/treasury/transactions` - Create transaction
- `GET /api/treasury/income-categories` - Get income categories
- `GET /api/treasury/expense-categories` - Get expense categories

### SMS
- `GET /api/sms/providers` - Get SMS providers
- `POST /api/sms/send` - Send SMS
- `GET /api/sms/templates` - Get SMS templates
- `GET /api/sms/logs` - Get SMS logs

### Documents
- `GET /api/documents` - Get all documents
- `POST /api/documents` - Upload document
- `GET /api/documents/:id` - Get document by ID
- `PUT /api/documents/:id` - Update document
- `DELETE /api/documents/:id` - Delete document

### Approvals
- `GET /api/approvals/workflows` - Get approval workflows
- `POST /api/approvals/requests` - Create approval request
- `GET /api/approvals/requests` - Get approval requests
- `PUT /api/approvals/requests/:id/approve` - Approve request
- `PUT /api/approvals/requests/:id/reject` - Reject request

### Notifications
- `GET /api/notifications` - Get user notifications
- `GET /api/notifications/unread-count` - Get unread count
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read

### Reports
- `GET /api/reports/financial` - Get financial report
- `GET /api/reports/department` - Get department report
- `GET /api/reports/attendance` - Get attendance report
- `GET /api/reports/export` - Export report

### Analytics
- `GET /api/analytics/dashboard` - Get dashboard stats
- `GET /api/analytics/member-growth` - Get member growth
- `GET /api/analytics/financial-trends` - Get financial trends
- `GET /api/analytics/department-activity` - Get department activity

### Search
- `GET /api/search/global` - Global search
- `POST /api/search/advanced` - Advanced search
- `GET /api/search/suggestions` - Search suggestions

### Mobile
- `GET /api/mobile/dashboard` - Mobile dashboard
- `GET /api/mobile/content` - Mobile content
- `GET /api/mobile/announcements` - Mobile announcements
- `POST /api/mobile/sync` - Data synchronization

## Deployment

### Environment Variables
Required environment variables:
```
DATABASE_URL=postgresql://user:password@localhost:5432/kmaincms
JWT_SECRET=your-secret-key
NODE_ENV=production
PORT=5000
```

### Docker Deployment
```bash
# Build and start containers
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down
```

### PM2 Deployment
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start server.js --name kmaincms

# View logs
pm2 logs kmaincms

# Restart application
pm2 restart kmaincms
```

## Troubleshooting

### Common Issues

**Database Connection Error**
- Check DATABASE_URL in .env file
- Ensure PostgreSQL is running
- Verify database exists

**Authentication Failures**
- Check JWT_SECRET is set
- Verify token expiration
- Check user role permissions

**Rate Limiting Issues**
- Adjust rate limits in middleware/rateLimiter.js
- Check for stuck rate limit storage
- Verify IP address detection

**Performance Issues**
- Check database query performance
- Review cache hit rates
- Monitor memory usage
- Check for connection pool exhaustion

## Contributing

### Contribution Guidelines
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Review Process
- All changes require code review
- Follow existing code patterns
- Add appropriate documentation
- Update tests as needed
- Ensure backward compatibility

## Support

For issues, questions, or contributions, please refer to the project repository or contact the development team.