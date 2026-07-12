# KMainCMS Developer Guide

## Overview

This guide is for developers who want to contribute to KMainCMS or build integrations with the system. It covers API documentation, development setup, contribution guidelines, and technical architecture.

## Table of Contents
1. [Getting Started](#getting-started)
2. [API Documentation](#api-documentation)
3. [Development Setup](#development-setup)
4. [Architecture](#architecture)
5. [Contributing](#contributing)
6. [Testing](#testing)
7. [Deployment](#deployment)
8. [Best Practices](#best-practices)

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Git
- Docker (optional but recommended)

### Project Structure

```
KMainCMS/
├── backend/              # Node.js API server
│   ├── controllers/     # Request handlers
│   ├── services/        # Business logic
│   ├── repositories/    # Data access layer
│   ├── routes/          # API routes
│   ├── middleware/      # Express middleware
│   ├── __tests__/       # Unit tests
│   └── tests/           # Integration/E2E tests
├── frontend/            # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── contexts/    # React contexts
│   │   ├── services/    # API services
│   │   └── utils/       # Utility functions
│   └── public/          # Static assets
├── mobile/              # React Native mobile app
│   └── react-native/
│       └── mobile-app/
├── database/            # Database migrations
│   └── migrations/
├── docs/                # Documentation
├── scripts/             # Utility scripts
└── docker-compose.yml   # Docker orchestration
```

### Quick Start

1. **Clone the repository**
```bash
git clone <repository-url>
cd KMainCMS
```

2. **Install dependencies**
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

3. **Set up environment**
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
```

4. **Start development servers**
```bash
# Backend (from project root)
cd backend
npm run dev

# Frontend (from project root)
cd frontend
npm run dev
```

5. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Documentation: http://localhost:3001/api/docs

---

## API Documentation

### Base URL

- Development: `http://localhost:3001/api`
- Production: `https://your-domain.com/api`

### Authentication

Most endpoints require authentication using JWT tokens.

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "user@example.com",
      "role": "member"
    }
  }
}
```

#### Using the Token
Include the token in the Authorization header:
```http
Authorization: Bearer jwt_token_here
```

### API Endpoints

#### Members

**Get All Members**
```http
GET /api/members
Authorization: Bearer token
```

**Get Member by ID**
```http
GET /api/members/:id
Authorization: Bearer token
```

**Create Member**
```http
POST /api/members
Authorization: Bearer token
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+254700000000",
  "department_id": 1
}
```

**Update Member**
```http
PUT /api/members/:id
Authorization: Bearer token
Content-Type: application/json

{
  "name": "John Updated",
  "phone": "+254711111111"
}
```

**Delete Member**
```http
DELETE /api/members/:id
Authorization: Bearer token
```

#### Events

**Get All Events**
```http
GET /api/events
Authorization: Bearer token
```

**Create Event**
```http
POST /api/events
Authorization: Bearer token
Content-Type: application/json

{
  "name": "Sunday Service",
  "description": "Weekly worship service",
  "date": "2024-06-30T10:00:00Z",
  "location": "Main Sanctuary",
  "max_attendees": 500
}
```

**Register for Event**
```http
POST /api/events/:id/register
Authorization: Bearer token
```

#### Announcements

**Get Announcements**
```http
GET /api/announcements
Authorization: Bearer token
```

**Create Announcement**
```http
POST /api/announcements
Authorization: Bearer token
Content-Type: application/json

{
  "title": "Special Event",
  "content": "Join us for a special event...",
  "category": "general",
  "target_audience": "all"
}
```

#### Giving

**Process Donation**
```http
POST /api/giving/donate
Authorization: Bearer token
Content-Type: application/json

{
  "amount": 1000,
  "type": "tithe",
  "payment_method": "mpesa",
  "phone": "+254700000000"
}
```

**Get Giving History**
```http
GET /api/giving/history
Authorization: Bearer token
```

### Response Format

All API responses follow this format:

**Success Response**
```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "message": "Operation successful"
}
```

**Error Response**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "details": {}
  }
}
```

### Error Codes

| Code | Description |
|------|-------------|
| AUTH_REQUIRED | Authentication required |
| INVALID_TOKEN | Invalid or expired token |
| PERMISSION_DENIED | Insufficient permissions |
| VALIDATION_ERROR | Input validation failed |
| NOT_FOUND | Resource not found |
| CONFLICT | Resource conflict |
| SERVER_ERROR | Internal server error |

---

## Development Setup

### Backend Development

#### Environment Setup

1. **Install dependencies**
```bash
cd backend
npm install
```

2. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your settings
```

3. **Set up database**
```bash
# Run migrations
npm run migrate

# Seed database (optional)
npm run seed
```

4. **Start development server**
```bash
npm run dev
```

#### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run test         # Run tests
npm run test:coverage # Run tests with coverage
npm run migrate      # Run database migrations
npm run seed         # Seed database with sample data
npm run lint         # Run linter
npm run lint:fix     # Fix linting issues
```

### Frontend Development

#### Environment Setup

1. **Install dependencies**
```bash
cd frontend
npm install
```

2. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your settings
```

3. **Start development server**
```bash
npm run dev
```

#### Available Scripts

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run preview          # Preview production build
npm run test             # Run tests
npm run test:e2e         # Run E2E tests
npm run lint             # Run linter
npm run lint:fix         # Fix linting issues
```

### Mobile Development

#### Environment Setup

1. **Install dependencies**
```bash
cd mobile/react-native/mobile-app
npm install
```

2. **Install iOS dependencies (Mac only)**
```bash
cd ios
pod install
```

3. **Start development server**
```bash
npm start
```

4. **Run on device/simulator**
```bash
# iOS
npm run ios

# Android
npm run android
```

---

## Architecture

### Backend Architecture

KMainCMS backend follows a layered architecture:

```
┌─────────────────┐
│   Routes        │  API endpoints
├─────────────────┤
│  Controllers    │  Request handlers
├─────────────────┤
│   Services      │  Business logic
├─────────────────┤
│  Repositories   │  Data access
├─────────────────┤
│   Database      │  PostgreSQL
└─────────────────┘
```

#### Module Structure

Each module follows this pattern:
- `routes/{module}.routes.js` - API route definitions
- `controllers/{module}.controller.js` - Request handlers
- `services/{module}.service.js` - Business logic
- `repositories/{module}.repository.js` - Data access

#### Example: Creating a New Module

1. **Create repository**
```javascript
// backend/repositories/ExampleRepository.js
class ExampleRepository {
  async findAll() {
    // Database query
  }

  async findById(id) {
    // Database query
  }

  async create(data) {
    // Database insert
  }

  async update(id, data) {
    // Database update
  }

  async delete(id) {
    // Database delete
  }
}

module.exports = new ExampleRepository();
```

2. **Create service**
```javascript
// backend/services/exampleService.js
const exampleRepository = require('../repositories/ExampleRepository');

class ExampleService {
  async getAllExamples() {
    return await exampleRepository.findAll();
  }

  async getExampleById(id) {
    return await exampleRepository.findById(id);
  }

  async createExample(data) {
    // Business logic
    return await exampleRepository.create(data);
  }
}

module.exports = new ExampleService();
```

3. **Create controller**
```javascript
// backend/controllers/example.controller.js
const exampleService = require('../services/exampleService');

class ExampleController {
  async getAll(req, res) {
    try {
      const examples = await exampleService.getAllExamples();
      res.json({ success: true, data: examples });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getById(req, res) {
    try {
      const example = await exampleService.getExampleById(req.params.id);
      res.json({ success: true, data: example });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new ExampleController();
```

4. **Create routes**
```javascript
// backend/routes/example.routes.js
const express = require('express');
const router = express.Router();
const exampleController = require('../controllers/example.controller');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, exampleController.getAll);
router.get('/:id', authenticate, exampleController.getById);

module.exports = router;
```

5. **Register routes**
```javascript
// backend/server.js
const exampleRoutes = require('./routes/example.routes');
app.use('/api/examples', exampleRoutes);
```

### Frontend Architecture

The frontend uses React with Context API for state management:

```
┌─────────────────┐
│    Pages        │  Page components
├─────────────────┤
│  Components     │  Reusable components
├─────────────────┤
│   Contexts      │  State management
├─────────────────┤
│   Services      │  API calls
├─────────────────┤
│    API          │  Backend
└─────────────────┘
```

#### Context Pattern

```javascript
// frontend/src contexts/ExampleContext.jsx
import React, { createContext, useContext, useState } from 'react';

const ExampleContext = createContext();

export function ExampleProvider({ children }) {
  const [examples, setExamples] = useState([]);

  const fetchExamples = async () => {
    // API call
  };

  return (
    <ExampleContext.Provider value={{ examples, fetchExamples }}>
      {children}
    </ExampleContext.Provider>
  );
}

export function useExample() {
  return useContext(ExampleContext);
}
```

---

## Contributing

### Contribution Guidelines

We welcome contributions! Please follow these guidelines:

#### Code Style

- Follow existing code style
- Use meaningful variable names
- Add comments for complex logic
- Keep functions small and focused
- Use ES6+ features

#### Commit Messages

Follow conventional commits format:
```
type(scope): subject

body

footer
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build process or auxiliary tool changes

Example:
```
feat(members): add member export functionality

Added ability to export member list to CSV and Excel formats.
Includes filtering options and column selection.

Closes #123
```

#### Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests for new functionality
5. Ensure all tests pass
6. Update documentation
7. Submit a pull request

#### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated
- [ ] All tests passing
```

### Testing

#### Backend Testing

**Unit Tests**
```bash
cd backend
npm test -- __tests__/unit/
```

**Integration Tests**
```bash
npm test -- tests/integration/
```

**E2E Tests**
```bash
npm test -- tests/e2e/
```

**Test Coverage**
```bash
npm run test:coverage
```

#### Frontend Testing

**Unit Tests**
```bash
cd frontend
npm test
```

**E2E Tests**
```bash
npm run test:e2e
```

#### Writing Tests

**Backend Unit Test Example**
```javascript
// backend/__tests__/unit/exampleService.test.js
const exampleService = require('../../services/exampleService');

describe('ExampleService', () => {
  describe('getAllExamples', () => {
    it('should return all examples', async () => {
      const examples = await exampleService.getAllExamples();
      expect(examples).toBeDefined();
      expect(Array.isArray(examples)).toBe(true);
    });
  });
});
```

**Frontend Component Test Example**
```javascript
// frontend/src/components/__tests__/ExampleComponent.test.jsx
import { render, screen } from '@testing-library/react';
import ExampleComponent from '../ExampleComponent';

describe('ExampleComponent', () => {
  it('renders correctly', () => {
    render(<ExampleComponent />);
    expect(screen.getByText('Example')).toBeInTheDocument();
  });
});
```

---

## Deployment

### Local Deployment with Docker

1. **Build and start containers**
```bash
docker-compose up -d
```

2. **Run migrations**
```bash
docker-compose exec backend npm run migrate
```

3. **Access the application**
- Frontend: http://localhost
- Backend: http://localhost:3001

### Production Deployment

See [Phase 16 Deployment Guide](./PHASE16_DEPLOYMENT_DEVOPS.md) for detailed production deployment instructions.

### Environment Variables

Required environment variables for production:

```env
# Database
DB_HOST=postgres
DB_PORT=5432
DB_USER=kmaincms
DB_PASSWORD=secure_password
DB_NAME=kmaincms

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=secure_password

# Security
JWT_SECRET=secure_jwt_secret
SESSION_SECRET=secure_session_secret

# External Services
TELEGRAM_BOT_TOKEN=your_bot_token
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
OPENAI_API_KEY=your_api_key
```

---

## Best Practices

### Security

- **Never commit secrets** - Use environment variables
- **Validate all inputs** - Prevent injection attacks
- **Use parameterized queries** - Prevent SQL injection
- **Implement rate limiting** - Prevent abuse
- **Keep dependencies updated** - Security patches
- **Use HTTPS** - Encrypt data in transit
- **Hash passwords** - Never store plain text passwords

### Performance

- **Use database indexes** - Optimize queries
- **Implement caching** - Reduce database load
- **Use pagination** - Limit result sets
- **Optimize images** - Reduce file sizes
- **Minimize API calls** - Batch requests
- **Use CDN** - Serve static assets
- **Enable compression** - Reduce transfer size

### Code Quality

- **Write tests** - Ensure code quality
- **Use linters** - Maintain code style
- **Document code** - Help other developers
- **Review code** - Catch issues early
- **Refactor regularly** - Improve maintainability
- **Follow patterns** - Consistent architecture

### Documentation

- **Update README** - Project information
- **Document APIs** - API reference
- **Write guides** - User documentation
- **Comment code** - Complex logic
- **Maintain changelog** - Track changes

---

## Troubleshooting

### Common Development Issues

#### Port Already in Use

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

#### Database Connection Failed

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection string in .env
# Ensure database exists
```

#### Module Not Found

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Tests Failing

```bash
# Clear cache
npm test -- --clearCache

# Run specific test file
npm test -- path/to/test.test.js
```

---

## Resources

### Documentation

- [User Guide](./USER_GUIDE.md)
- [Administrator Guide](./ADMINISTRATOR_GUIDE.md)
- [Deployment Guide](./PHASE16_DEPLOYMENT_DEVOPS.md)

### External Resources

- [Node.js Documentation](https://nodejs.org/docs/)
- [React Documentation](https://react.dev/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/docs/)
- [Docker Documentation](https://docs.docker.com/)

### Community

- GitHub Issues
- Discussion Forums
- Stack Overflow

---

## Support

For development support:
- Create a GitHub issue
- Contact the development team
- Join the developer community

---

## License

This project is licensed under the MIT License.

---

## Conclusion

This developer guide provides the foundation for contributing to KMainCMS. By following these guidelines and best practices, you can help build a robust, secure, and maintainable church management system.

Thank you for your interest in contributing to KMainCMS!
