# KMainCMS Testing Guide

## Overview
This document describes the testing infrastructure for KMainCMS, including unit tests, integration tests, and end-to-end (E2E) tests that simulate real user actions.

## Test Structure

### Backend Tests
```
backend/tests/
├── api/tests/              # Unit and integration tests
│   ├── auth.test.js
│   ├── approvals.test.js
│   ├── database.test.js
│   ├── documents.test.js
│   ├── health.test.js
│   └── notifications.test.js
└── e2e/                    # End-to-end workflow tests
    └── user-workflows.test.js
```

### Frontend Tests
```
frontend/
├── cypress/
│   ├── e2e/                # E2E tests with Cypress
│   │   └── user-workflows.cy.js
│   └── cypress.config.js
└── cypress.config.js
```

## Running Tests

### Backend Tests

#### Run all backend tests
```bash
cd backend
npm test
```

#### Run specific test file
```bash
cd backend
npm test -- tests/e2e/user-workflows.test.js
```

#### Run tests in watch mode
```bash
cd backend
npm run test:watch
```

#### Generate coverage report
```bash
cd backend
npm run test:coverage
```

### Frontend E2E Tests

#### Install Cypress dependencies
```bash
cd frontend
npm install cypress --save-dev
```

#### Open Cypress Test Runner (interactive)
```bash
cd frontend
npm run test:e2e
```

#### Run E2E tests in headless mode
```bash
cd frontend
npm run test:e2e:headless
```

## Test Coverage

### Backend E2E User Workflows
The backend E2E tests cover:

1. **Authentication Workflows**
   - Super Admin login
   - Protected route access
   - Invalid credential rejection
   - Token validation

2. **User Management Workflows**
   - Creating users
   - Role assignment
   - User login with different roles
   - Permission-based access

3. **Department Management Workflows**
   - Creating departments
   - Viewing departments
   - Updating departments
   - Permission enforcement

4. **Gallery Management Workflows**
   - Viewing gallery
   - Creating albums
   - Permission-based access

5. **Document Management Workflows**
   - Viewing documents
   - Permission-based access

6. **SMS Management Workflows**
   - Viewing SMS history
   - Sending SMS
   - Permission enforcement

7. **Announcement Management Workflows**
   - Creating announcements
   - Viewing announcements
   - Permission enforcement

8. **Approval Workflows**
   - Viewing approvals
   - Requesting approvals
   - Approving/rejecting requests

9. **Settings Management Workflows**
   - Viewing settings
   - Updating settings
   - Permission enforcement

10. **Permission Enforcement**
    - Role-based access control
    - Admin vs member access
    - Protected route validation

11. **Session Management**
    - User logout
    - Token expiration
    - Session validation

12. **Error Handling**
    - Invalid routes
    - Invalid JSON
    - Missing required fields

### Frontend E2E User Workflows
The frontend E2E tests cover:

1. **Authentication Workflows**
   - Login with valid credentials
   - Invalid credential handling
   - User logout

2. **Navigation Workflows**
   - Sidebar navigation
   - Route navigation
   - URL validation

3. **Department Management Workflows**
   - Viewing departments
   - Creating departments
   - Editing departments
   - Deleting departments

4. **Gallery Management Workflows**
   - Viewing gallery
   - Uploading photos
   - Deleting photos

5. **SMS Management Workflows**
   - Viewing SMS history
   - Sending SMS

6. **Announcement Management Workflows**
   - Viewing announcements
   - Creating announcements
   - Editing announcements
   - Deleting announcements

7. **Approval Workflows**
   - Viewing approval requests
   - Approving requests
   - Rejecting requests

8. **Settings Management Workflows**
   - Viewing settings
   - Updating settings

9. **Responsive Design**
   - Mobile viewport testing
   - Tablet viewport testing
   - Desktop viewport testing

10. **Permission-Based Access**
    - Member sidebar items
    - Admin vs member access
    - Protected route validation

11. **Error Handling**
    - API failure handling
    - Network error handling
    - User-friendly error messages

12. **Performance**
    - Page load times
    - Lazy-loaded components
    - Loading states

## Test Data

### Test Users
The tests use the following test users:

- **Super Admin**: `admin@sda.org` / `admin123`
- **Test Pastor**: `test-pastor@sda.org` / `TestPassword123!`
- **Test Member**: `test-member@sda.org` / `TestPassword123!`

### Test Data Cleanup
The E2E tests automatically clean up test data:
- Delete users with email pattern `test-%`
- Delete departments with name pattern `Test Department%`

## Pre-requisites

### Backend
- Node.js installed
- PostgreSQL database running
- Environment variables configured
- Test database configured

### Frontend
- Node.js installed
- Vite dev server running on port 5180
- Backend API running on port 5005

## Continuous Integration

### GitHub Actions Example
```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: cd backend && npm install
      - name: Run tests
        run: cd backend && npm test

  frontend-e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: cd frontend && npm install
      - name: Start backend
        run: cd backend && npm start &
      - name: Start frontend
        run: cd frontend && npm run dev &
      - name: Run E2E tests
        run: cd frontend && npm run test:e2e:headless
```

## Best Practices

1. **Test Isolation**: Each test should be independent and not depend on other tests
2. **Test Data**: Use test-specific data that gets cleaned up after tests
3. **Assertions**: Use specific assertions to validate expected behavior
4. **Error Messages**: Include clear error messages when tests fail
5. **Test Coverage**: Aim for high coverage of critical user workflows
6. **Performance**: Keep tests fast and efficient
7. **Maintenance**: Keep tests updated as the application evolves

## Troubleshooting

### Backend Tests Fail
- Check database connection
- Verify environment variables
- Ensure test database is configured
- Check for data conflicts

### Frontend E2E Tests Fail
- Ensure backend API is running
- Check frontend dev server is running
- Verify CORS configuration
- Check network connectivity

### Tests Timeout
- Increase timeout values in test configuration
- Check for slow API responses
- Verify database performance

## Adding New Tests

### Backend Test Template
```javascript
describe('Feature Name', () => {
  beforeAll(async () => {
    // Setup
  });

  afterAll(async () => {
    // Cleanup
  });

  test('should do something', async () => {
    const response = await request(app)
      .post('/api/endpoint')
      .send({ data: 'value' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

### Frontend E2E Test Template
```javascript
describe('Feature Name', () => {
  beforeEach(() => {
    cy.visit('http://localhost:5180');
    // Login if needed
  });

  it('should do something', () => {
    cy.get('selector').click();
    cy.contains('expected text').should('be.visible');
  });
});
```

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Cypress Documentation](https://docs.cypress.io/)
- [React Testing Library](https://testing-library.com/react)
