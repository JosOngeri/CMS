# KMainCMS API Documentation

## Overview

KMainCMS is a comprehensive church management system API built with Node.js, Express, and PostgreSQL.

## Base URL

- Development: `http://localhost:5000/api`
- Production: `https://your-domain.com/api`

## Authentication

Most endpoints require authentication using JWT tokens.

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "roles": ["Member"]
    }
  }
}
```

### Using the Token

Include the token in the Authorization header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Modules

### 1. Authentication (`/api/auth`)

- `POST /register` - Register new user
- `POST /login` - Login user
- `POST /logout` - Logout user
- `POST /refresh` - Refresh access token
- `GET /me` - Get current user info
- `PUT /me` - Update current user profile

### 2. Content Management (`/api/content`)

- `GET /` - Get all content
- `GET /:id` - Get content by ID
- `POST /` - Create new content (Admin/Pastor)
- `PUT /:id` - Update content (Admin/Pastor)
- `DELETE /:id` - Delete content (Admin)
- `POST /:id/publish` - Publish content (Admin/Pastor)
- `GET /categories` - Get content categories
- `GET /tags` - Get content tags
- `GET /website-settings` - Get website settings

### 3. Departments (`/api/departments`)

- `GET /` - Get all departments
- `GET /:id` - Get department by ID
- `POST /` - Create department (Admin)
- `PUT /:id` - Update department (Admin)
- `DELETE /:id` - Delete department (Admin)
- `GET /:id/members` - Get department members
- `GET /:id/meetings` - Get department meetings
- `GET /:id/tasks` - Get department tasks
- `GET /:id/resources` - Get department resources

### 4. Treasury (`/api/treasury`)

- `GET /accounts` - Get church accounts
- `POST /accounts` - Create account (Admin/Treasurer)
- `GET /transactions` - Get transactions
- `POST /transactions` - Create transaction (Admin/Treasurer)
- `GET /income-categories` - Get income categories
- `GET /expense-categories` - Get expense categories
- `GET /budgets` - Get budgets
- `POST /budgets` - Create budget (Admin/Treasurer)
- `GET /summary` - Get financial summary

### 5. Payments (`/api/payments`)

- `GET /methods` - Get payment methods
- `POST /methods` - Create payment method (Admin)
- `GET /payments` - Get payments
- `POST /payments` - Create payment (Admin/Treasurer)
- `GET /pledges` - Get pledges
- `POST /pledges` - Create pledge
- `GET /summary` - Get payment summary

### 6. SMS (`/api/sms`)

- `GET /providers` - Get SMS providers
- `POST /providers` - Create provider (Admin)
- `GET /templates` - Get SMS templates
- `POST /templates` - Create template (Admin/Pastor)
- `POST /send` - Send SMS (Admin/Pastor/Dept Head)
- `GET /logs` - Get SMS logs
- `GET /campaigns` - Get SMS campaigns
- `POST /campaigns` - Create campaign (Admin/Pastor)
- `POST /campaigns/:id/send` - Send campaign (Admin/Pastor)
- `GET /stats` - Get SMS statistics

### 7. Documents (`/api/documents`)

- `GET /` - Get all documents
- `GET /:slug` - Get document by slug
- `POST /` - Upload document (Admin/Pastor/Dept Head)
- `PUT /:id` - Update document (Admin/Pastor/Dept Head)
- `DELETE /:id` - Delete document (Admin)
- `GET /categories` - Get document categories
- `GET /:id/versions` - Get document versions
- `POST /:id/rollback/:versionId` - Rollback to version (Admin/Pastor)
- `POST /:id/permissions` - Set permissions (Admin/Pastor)

### 8. Approvals (`/api/approvals`)

- `GET /workflows` - Get approval workflows
- `POST /workflows` - Create workflow (Admin/Pastor)
- `GET /requests` - Get approval requests
- `POST /requests` - Create approval request
- `POST /requests/:id/approve` - Approve request (Admin/Pastor/Dept Head)
- `POST /requests/:id/reject` - Reject request (Admin/Pastor/Dept Head)
- `GET /requests/:id/actions` - Get request actions

### 9. Notifications (`/api/notifications`)

- `GET /` - Get user notifications
- `GET /unread-count` - Get unread count
- `POST /:id/read` - Mark as read
- `POST /mark-all-read` - Mark all as read
- `DELETE /:id` - Delete notification
- `GET /types` - Get notification types
- `GET /preferences` - Get notification preferences
- `PUT /preferences` - Update preferences

### 10. Gallery (`/api/gallery`)

- `GET /albums` - Get all albums
- `GET /albums/:id` - Get album by ID
- `POST /albums` - Create album (Admin/Pastor)
- `PUT /albums/:id` - Update album (Admin/Pastor)
- `DELETE /albums/:id` - Delete album (Admin)
- `GET /albums/:id/photos` - Get album photos
- `POST /albums/:id/photos` - Upload photo (Admin/Pastor)
- `GET /tags` - Get gallery tags

### 11. Telegram (`/api/telegram`)

- `GET /channels` - Get Telegram channels
- `POST /channels` - Create channel (Admin)
- `GET /channels/:id/posts` - Get channel posts
- `POST /channels/:id/posts` - Create post (Admin/Pastor)
- `GET /photos/cache` - Get cached photos
- `POST /photos/cache` - Cache photo (Admin)

### 12. Settings (`/api/settings`)

- `GET /public` - Get public settings
- `GET /` - Get all settings (Admin)
- `GET /:key` - Get setting by key (Admin)
- `POST /` - Create setting (Admin)
- `PUT /bulk` - Update multiple settings (Admin)
- `PUT /:key` - Update setting (Admin)
- `DELETE /:key` - Delete setting (Admin)
- `GET /export/data` - Export settings (Admin)
- `POST /import/data` - Import settings (Admin)
- `POST /reset` - Reset to defaults (Admin)

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message description"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Rate Limiting

API endpoints are rate-limited to prevent abuse:
- Auth endpoints: 5 requests per 15 minutes
- General endpoints: 100 requests per 15 minutes

## Pagination

List endpoints support pagination via query parameters:
- `limit` - Number of items per page (default: 50)
- `offset` - Number of items to skip (default: 0)

Example:
```http
GET /api/content?limit=20&offset=40
```

## Filtering

Many endpoints support filtering via query parameters:
- `status` - Filter by status
- `category` - Filter by category
- `date` - Filter by date range

Example:
```http
GET /api/content?status=published&category=sermons
```

## Health Check

```http
GET /health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected"
}
```