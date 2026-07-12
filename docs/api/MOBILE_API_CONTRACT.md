# Mobile API Contract Documentation

## Overview

This document defines the API contract for mobile app integration with KMainCMS. All endpoints follow RESTful principles and use standard HTTP methods.

**Base URL**: `https://cms.kiserianchurch.org/api/mobile`  
**API Version**: v1  
**Content Type**: application/json  
**Authentication**: Bearer Token (JWT)

## Authentication

### Authentication Flow

1. **Login**: User provides credentials → Server returns access token + refresh token
2. **Access**: Include access token in Authorization header → Server validates and processes request
3. **Refresh**: When access token expires → Use refresh token to get new access token
4. **Logout**: Invalidate tokens on server and client

### Token Format

**Access Token**: JWT with 1-hour expiration  
**Refresh Token**: JWT with 30-day expiration  
**Token Storage**: EncryptedSharedPreferences on mobile device

### Authentication Headers

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

## API Endpoints

### 1. Authentication Endpoints

#### 1.1 Mobile Login

**Endpoint**: `POST /api/mobile/auth/login`  
**Authentication**: None (public endpoint)  
**Rate Limit**: 5 requests per minute per IP

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "deviceId": "unique_device_id",
  "deviceName": "Samsung Galaxy S21",
  "platform": "android",
  "osVersion": "12",
  "appVersion": "1.0.0"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 123,
      "email": "user@example.com",
      "name": "John Doe",
      "roles": ["Department Head"],
      "permissions": [
        {
          "resource": "sms",
          "actions": ["read", "create", "update"]
        }
      ],
      "churchId": 1
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600
    }
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Invalid credentials
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

#### 1.2 Refresh Token

**Endpoint**: `POST /api/mobile/auth/refresh`  
**Authentication**: None (uses refresh token)  
**Rate Limit**: 10 requests per minute per device

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "accessToken": "new_access_token_here",
    "refreshToken": "new_refresh_token_here",
    "expiresIn": 3600
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Invalid or expired refresh token
- `429 Too Many Requests`: Rate limit exceeded

#### 1.3 Mobile Logout

**Endpoint**: `POST /api/mobile/auth/logout`  
**Authentication**: Required  
**Rate Limit**: 10 requests per minute per user

**Request Body**:
```json
{
  "deviceId": "unique_device_id"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### 2. Contact Sync Endpoints

#### 2.1 Sync Contacts (Delta)

**Endpoint**: `GET /api/mobile/contacts/sync`  
**Authentication**: Required  
**Rate Limit**: 30 requests per minute per user

**Query Parameters**:
- `lastSync` (optional): ISO 8601 timestamp for delta sync
- `limit` (optional): Maximum records to return (default: 100, max: 500)

**Example Request**:
```
GET /api/mobile/contacts/sync?lastSync=2024-01-01T00:00:00Z&limit=100
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "contacts": [
      {
        "id": "contact_123",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "phone": "+254712345678",
        "departmentId": "dept_456",
        "updatedAt": "2024-01-15T10:30:00Z",
        "createdAt": "2024-01-01T08:00:00Z"
      }
    ],
    "lastSync": "2024-01-15T12:00:00Z",
    "count": 1,
    "hasMore": false
  }
}
```

#### 2.2 Upload Contact Changes

**Endpoint**: `POST /api/mobile/contacts/upload`  
**Authentication**: Required  
**Rate Limit**: 10 requests per minute per user

**Request Body**:
```json
{
  "changes": [
    {
      "action": "create",
      "id": "contact_789",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane@example.com",
      "phone": "+254798765432",
      "departmentId": "dept_456",
      "updatedAt": "2024-01-15T11:00:00Z",
      "createdAt": "2024-01-15T11:00:00Z"
    },
    {
      "action": "update",
      "id": "contact_123",
      "firstName": "John",
      "lastName": "Doe Updated",
      "email": "john.updated@example.com",
      "phone": "+254712345678",
      "departmentId": "dept_789",
      "updatedAt": "2024-01-15T12:00:00Z"
    },
    {
      "action": "delete",
      "id": "contact_456",
      "updatedAt": "2024-01-15T12:00:00Z"
    }
  ]
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "processed": ["contact_789", "contact_123"],
    "conflicts": [
      {
        "id": "contact_456",
        "reason": "CMS version is newer",
        "localVersion": "2024-01-15T11:00:00Z",
        "cmsVersion": "2024-01-15T13:00:00Z"
      }
    ],
    "errors": []
  }
}
```

#### 2.3 Get Delta Contacts

**Endpoint**: `GET /api/mobile/contacts/delta`  
**Authentication**: Required  
**Rate Limit**: 30 requests per minute per user

**Query Parameters**:
- `lastSync` (optional): ISO 8601 timestamp for delta sync

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "contact_123",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+254712345678",
      "departmentId": "dept_456",
      "updatedAt": "2024-01-15T10:30:00Z",
      "createdAt": "2024-01-01T08:00:00Z"
    }
  ]
}
```

### 3. Template Sync Endpoints

#### 3.1 Sync Templates (Delta)

**Endpoint**: `GET /api/mobile/templates/sync`  
**Authentication**: Required  
**Rate Limit**: 20 requests per minute per user

**Query Parameters**:
- `lastSync` (optional): ISO 8601 timestamp for delta sync
- `limit` (optional): Maximum records to return (default: 50, max: 200)

**Example Request**:
```
GET /api/mobile/templates/sync?lastSync=2024-01-01T00:00:00Z&limit=50
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "id": "template_123",
        "name": "Sunday Service Reminder",
        "content": "Reminder: Sunday service starts at 9am. See you there!",
        "category": "Service",
        "isOfficial": true,
        "usageCount": 150,
        "lastUsed": "2024-01-14T09:00:00Z",
        "updatedAt": "2024-01-10T08:00:00Z",
        "createdAt": "2024-01-01T08:00:00Z"
      }
    ],
    "lastSync": "2024-01-15T12:00:00Z",
    "count": 1,
    "hasMore": false
  }
}
```

#### 3.2 Upload Template Analytics

**Endpoint**: `POST /api/mobile/templates/analytics`  
**Authentication**: Required  
**Rate Limit**: 10 requests per minute per user

**Request Body**:
```json
{
  "analytics": [
    {
      "templateId": "template_123",
      "usageCount": 5,
      "lastUsed": "2024-01-15T10:00:00Z",
      "avgResponseTime": 1200,
      "successRate": 0.95
    }
  ]
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "processed": 1
  }
}
```

#### 3.3 Get Official Templates

**Endpoint**: `GET /api/mobile/templates/official`  
**Authentication**: Required  
**Rate Limit**: 20 requests per minute per user

**Query Parameters**:
- `category` (optional): Filter by category
- `limit` (optional): Maximum records to return (default: 50, max: 200)

**Example Request**:
```
GET /api/mobile/templates/official?category=Service&limit=50
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "template_123",
      "name": "Sunday Service Reminder",
      "content": "Reminder: Sunday service starts at 9am. See you there!",
      "category": "Service",
      "usageCount": 150,
      "lastUsed": "2024-01-14T09:00:00Z",
      "updatedAt": "2024-01-10T08:00:00Z"
    }
  ]
}
```

### 4. SMS Log Endpoints

#### 4.1 Upload SMS Logs

**Endpoint**: `POST /api/mobile/sms/logs/upload`  
**Authentication**: Required  
**Rate Limit**: 10 requests per minute per user

**Request Body**:
```json
{
  "logs": [
    {
      "id": "log_123",
      "recipientCount": 100,
      "message": "Sunday service reminder",
      "status": "sent",
      "sentAt": "2024-01-15T10:00:00Z",
      "createdAt": "2024-01-15T09:55:00Z"
    }
  ]
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "processed": ["log_123"],
    "errors": []
  }
}
```

#### 4.2 Sync SMS Logs (Delta)

**Endpoint**: `GET /api/mobile/sms/logs/sync`  
**Authentication**: Required  
**Rate Limit**: 30 requests per minute per user

**Query Parameters**:
- `lastSync` (optional): ISO 8601 timestamp for delta sync
- `limit` (optional): Maximum records to return (default: 100, max: 500)

**Example Request**:
```
GET /api/mobile/sms/logs/sync?lastSync=2024-01-01T00:00:00Z&limit=100
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "log_456",
        "recipientCount": 200,
        "message": "Event reminder",
        "status": "sent",
        "sentAt": "2024-01-15T11:00:00Z",
        "createdAt": "2024-01-15T10:55:00Z"
      }
    ],
    "lastSync": "2024-01-15T12:00:00Z",
    "count": 1,
    "hasMore": false
  }
}
```

#### 4.3 Get Pending SMS Logs

**Endpoint**: `GET /api/mobile/sms/logs/pending`  
**Authentication**: Required  
**Rate Limit**: 20 requests per minute per user

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "log_789",
      "recipientCount": 50,
      "message": "Pending message",
      "status": "pending",
      "createdAt": "2024-01-15T11:30:00Z"
    }
  ]
}
```

### 5. Campaign Endpoints

#### 5.1 Create Mobile Campaign

**Endpoint**: `POST /api/mobile/campaigns/mobile`  
**Authentication**: Required  
**Rate Limit**: 5 requests per minute per user  
**Required Roles**: Super Admin, Pastor, Department Head

**Request Body**:
```json
{
  "name": "Sunday Service Reminder",
  "templateId": "template_123",
  "scheduledDate": "2024-01-21T09:00:00Z",
  "targetAudience": {
    "type": "ALL_MEMBERS",
    "filters": [],
    "estimatedCount": 500
  }
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "campaign_456",
    "name": "Sunday Service Reminder",
    "status": "scheduled",
    "scheduledDate": "2024-01-21T09:00:00Z",
    "totalRecipients": 500,
    "source": "mobile",
    "createdAt": "2024-01-15T12:00:00Z"
  }
}
```

**Error Responses**:
- `403 Forbidden`: Insufficient permissions
- `400 Bad Request`: Invalid campaign data

#### 5.2 Get Campaign Progress

**Endpoint**: `GET /api/mobile/campaigns/:id/progress`  
**Authentication**: Required  
**Rate Limit**: 30 requests per minute per user

**Example Request**:
```
GET /api/mobile/campaigns/campaign_456/progress
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "campaign_456",
    "name": "Sunday Service Reminder",
    "status": "sending",
    "totalRecipients": 500,
    "sentRecipients": 350,
    "failedRecipients": 5,
    "progress": 0.7,
    "sentCount": 350,
    "failedCount": 5
  }
}
```

#### 5.3 Get Mobile Campaigns

**Endpoint**: `GET /api/mobile/campaigns/mobile`  
**Authentication**: Required  
**Rate Limit**: 20 requests per minute per user

**Query Parameters**:
- `status` (optional): Filter by status (draft, scheduled, sending, completed, cancelled, failed)
- `limit` (optional): Maximum records to return (default: 20, max: 100)

**Example Request**:
```
GET /api/mobile/campaigns/mobile?status=scheduled&limit=20
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "campaign_456",
      "name": "Sunday Service Reminder",
      "status": "scheduled",
      "scheduledDate": "2024-01-21T09:00:00Z",
      "totalRecipients": 500,
      "sentRecipients": 0,
      "failedRecipients": 0,
      "createdAt": "2024-01-15T12:00:00Z"
    }
  ]
}
```

### 6. Analytics Endpoints

#### 6.1 Get Unified Analytics

**Endpoint**: `GET /api/mobile/analytics/unified`  
**Authentication**: Required  
**Rate Limit**: 10 requests per minute per user

**Query Parameters**:
- `startDate` (optional): ISO 8601 start date (default: 30 days ago)
- `endDate` (optional): ISO 8601 end date (default: now)

**Example Request**:
```
GET /api/mobile/analytics/unified?startDate=2024-01-01&endDate=2024-01-31
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "sms": {
      "totalSent": 1500,
      "successful": 1450,
      "failed": 50,
      "successRate": 0.9667,
      "avgRecipients": 100
    },
    "members": {
      "totalMembers": 500,
      "activeMembers": 450,
      "newMembers": 25,
      "engagementRate": 0.9
    },
    "engagement": {
      "totalInteractions": 5000,
      "uniqueUsers": 400,
      "avgInteractionsPerUser": 12.5
    },
    "period": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-01-31T23:59:59Z"
    }
  }
}
```

#### 6.2 Get SMS Analytics

**Endpoint**: `GET /api/mobile/analytics/sms`  
**Authentication**: Required  
**Rate Limit**: 10 requests per minute per user

**Query Parameters**:
- `startDate` (optional): ISO 8601 start date (default: 30 days ago)
- `endDate` (optional): ISO 8601 end date (default: now)

**Example Request**:
```
GET /api/mobile/analytics/sms?startDate=2024-01-01&endDate=2024-01-31
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-15",
      "totalSent": 50,
      "successful": 48,
      "failed": 2,
      "totalRecipients": 5000
    }
  ]
}
```

### 7. Sync Status Endpoints

#### 7.1 Get Sync Status

**Endpoint**: `GET /api/mobile/sync/status`  
**Authentication**: Required  
**Rate Limit**: 30 requests per minute per user

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "syncType": "contacts",
      "status": "completed",
      "lastSync": "2024-01-15T12:00:00Z",
      "nextSync": "2024-01-15T12:15:00Z",
      "errorMessage": null
    },
    {
      "syncType": "templates",
      "status": "completed",
      "lastSync": "2024-01-15T11:00:00Z",
      "nextSync": "2024-01-15T12:00:00Z",
      "errorMessage": null
    },
    {
      "syncType": "analytics",
      "status": "failed",
      "lastSync": "2024-01-15T10:00:00Z",
      "nextSync": "2024-01-15T11:00:00Z",
      "errorMessage": "Network timeout during sync"
    }
  ]
}
```

#### 7.2 Update Sync Status

**Endpoint**: `POST /api/mobile/sync/status`  
**Authentication**: Required  
**Rate Limit**: 30 requests per minute per user

**Request Body**:
```json
{
  "syncType": "contacts",
  "status": "syncing",
  "timestamp": "2024-01-15T12:05:00Z"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Sync status updated"
}
```

#### 7.3 Reset Sync (Admin Only)

**Endpoint**: `POST /api/mobile/sync/reset`  
**Authentication**: Required  
**Rate Limit**: 5 requests per minute per user  
**Required Roles**: Super Admin

**Request Body**:
```json
{
  "userId": 123
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Sync reset successfully"
}
```

### 8. Mobile Device Management

#### 8.1 Get Mobile Devices

**Endpoint**: `GET /api/mobile/devices`  
**Authentication**: Required  
**Rate Limit**: 20 requests per minute per user

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "deviceId": "unique_device_id",
      "deviceName": "Samsung Galaxy S21",
      "platform": "android",
      "osVersion": "12",
      "appVersion": "1.0.0",
      "isActive": true,
      "lastUsed": "2024-01-15T12:00:00Z",
      "createdAt": "2024-01-01T08:00:00Z"
    }
  ]
}
```

#### 8.2 Register Mobile Device

**Endpoint**: `POST /api/mobile/devices/register`  
**Authentication**: Required  
**Rate Limit**: 10 requests per minute per user

**Request Body**:
```json
{
  "deviceId": "unique_device_id",
  "deviceName": "Samsung Galaxy S21",
  "platform": "android",
  "osVersion": "12",
  "appVersion": "1.0.0"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "deviceId": "unique_device_id",
    "deviceName": "Samsung Galaxy S21",
    "platform": "android",
    "osVersion": "12",
    "appVersion": "1.0.0",
    "isActive": true,
    "lastUsed": "2024-01-15T12:00:00Z",
    "createdAt": "2024-01-15T12:00:00Z"
  }
}
```

#### 8.3 Unregister Mobile Device

**Endpoint**: `DELETE /api/mobile/devices/:id`  
**Authentication**: Required  
**Rate Limit**: 10 requests per minute per user

**Example Request**:
```
DELETE /api/mobile/devices/1
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Device unregistered successfully"
}
```

### 9. Existing Mobile Endpoints

#### 9.1 Mobile Dashboard

**Endpoint**: `GET /api/mobile/dashboard`  
**Authentication**: Required  
**Rate Limit**: 30 requests per minute per user

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "notifications": {
      "unread": 5
    },
    "approvals": {
      "pending": 3
    },
    "stats": {
      "totalMembers": 500,
      "totalDepartments": 12,
      "monthlyIncome": 150000,
      "monthlyExpense": 120000
    }
  }
}
```

#### 9.2 Mobile Content

**Endpoint**: `GET /api/mobile/content`  
**Authentication**: Required  
**Rate Limit**: 20 requests per minute per user

**Query Parameters**:
- `limit` (optional): Maximum records to return (default: 20, max: 100)

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Weekly Announcement",
      "slug": "weekly-announcement",
      "contentType": "article",
      "status": "published",
      "publishedAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

#### 9.3 Mobile Announcements

**Endpoint**: `GET /api/mobile/announcements`  
**Authentication**: Required  
**Rate Limit**: 20 requests per minute per user

**Query Parameters**:
- `limit` (optional): Maximum records to return (default: 10, max: 50)

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Special Service",
      "content": "Join us for a special service this Sunday...",
      "priority": "high",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

#### 9.4 Mobile Departments

**Endpoint**: `GET /api/mobile/departments`  
**Authentication**: Required  
**Rate Limit**: 20 requests per minute per user

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Music Ministry",
      "description": "Church music and worship team",
      "category": "Ministry"
    }
  ]
}
```

#### 9.5 Mobile Events

**Endpoint**: `GET /api/mobile/events`  
**Authentication**: Required  
**Rate Limit**: 20 requests per minute per user

**Query Parameters**:
- `startDate` (optional): ISO 8601 start date
- `endDate` (optional): ISO 8601 end date

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Sunday Service",
      "description": "Regular Sunday worship service",
      "eventDate": "2024-01-21",
      "eventTime": "09:00:00",
      "location": "Main Sanctuary"
    }
  ]
}
```

#### 9.6 Mobile Data Sync

**Endpoint**: `POST /api/mobile/sync`  
**Authentication**: Required  
**Rate Limit**: 10 requests per minute per user

**Request Body**:
```json
{
  "lastSync": "2024-01-01T00:00:00Z",
  "userId": 123
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "lastSync": "2024-01-15T12:00:00Z",
    "content": [...],
    "announcements": [...],
    "events": [...],
    "departments": [...]
  }
}
```

## Error Handling

### Standard Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "additional": "error context"
    }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|------------|-------------|
| `AUTH_FAILED` | 401 | Authentication failed |
| `TOKEN_EXPIRED` | 401 | Access token expired |
| `INVALID_TOKEN` | 401 | Invalid or malformed token |
| `INSUFFICIENT_PERMISSIONS` | 403 | User lacks required permissions |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource does not exist |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `SYNC_CONFLICT` | 409 | Data sync conflict detected |
| `RATE_LIMIT_EXCEEDED` | 429 | API rate limit exceeded |
| `NETWORK_ERROR` | 503 | Network connectivity issue |
| `SERVER_ERROR` | 500 | Internal server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

### Retry Strategy

**Retryable Errors**:
- `NETWORK_ERROR` (503)
- `SERVER_ERROR` (500)
- `SERVICE_UNAVAILABLE` (503)

**Non-Retryable Errors**:
- `AUTH_FAILED` (401)
- `INVALID_TOKEN` (401)
- `INSUFFICIENT_PERMISSIONS` (403)
- `VALIDATION_ERROR` (400)
- `SYNC_CONFLICT` (409)

**Retry Configuration**:
- Initial delay: 1 second
- Max delay: 30 seconds
- Max retries: 3
- Backoff strategy: Exponential

## Rate Limiting

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642245600
```

### Rate Limit Tiers

| Tier | Requests | Time Window | Applies To |
|------|----------|-------------|------------|
| Auth | 5 | 1 minute | Per IP |
| Standard | 30 | 1 minute | Per user |
| Write Operations | 10 | 1 minute | Per user |
| Admin Operations | 5 | 1 minute | Per user |

## Pagination

### Pagination Parameters

- `limit`: Number of records per page (default: 20, max: 100)
- `offset`: Number of records to skip (default: 0)

### Pagination Response

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 100,
    "hasMore": true
  }
}
```

## Data Types

### Common Data Types

**Timestamp**: ISO 8601 format (`2024-01-15T12:00:00Z`)  
**Boolean**: `true` or `false`  
**Integer**: Whole number  
**Float**: Decimal number  
**String**: Text string  
**Array**: JSON array `[]`  
**Object**: JSON object `{}`  
**JSONB**: JSON data with binary encoding

### Enumerations

**Sync Status**: `never_synced`, `pending`, `syncing`, `completed`, `failed`  
**Campaign Status**: `draft`, `scheduled`, `sending`, `completed`, `cancelled`, `failed`  
**SMS Status**: `pending`, `sent`, `failed`, `delivered`  
**Sync Type**: `contacts`, `templates`, `analytics`, `campaigns`  
**Platform**: `android`, `ios`  
**Audience Type**: `ALL_MEMBERS`, `DEPARTMENT`, `GROUP`, `CUSTOM_SELECTION`

## Security Considerations

### HTTPS Required
All API requests must use HTTPS. HTTP requests will be redirected to HTTPS.

### Token Security
- Access tokens expire after 1 hour
- Refresh tokens expire after 30 days
- Tokens should be stored securely on the device
- Tokens should be invalidated on logout

### Data Encryption
- Sensitive data should be encrypted at rest
- Use certificate pinning for API communication
- Validate SSL certificates

### Input Validation
- All inputs should be validated on the server
- Sanitize all user inputs
- Use parameterized queries for database operations

## Versioning

### API Versioning
- API version is included in the URL: `/api/mobile/v1/`
- Backward compatibility is maintained within major versions
- Breaking changes will increment the major version

### Deprecation Policy
- Deprecated endpoints will be announced 3 months in advance
- Deprecated endpoints will continue to function for 6 months
- After 6 months, deprecated endpoints may be removed

## Testing

### Test Environment
- Test API URL: `https://test-cms.kiserianchurch.org/api/mobile`
- Test credentials provided in development documentation
- Test data is reset daily

### Mock Data
- Mock endpoints are available for development
- Mock data follows the same schema as production
- Mock endpoints are prefixed with `/mock`

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-15  
**API Version**: v1  
**Status**: Ready for Implementation  
**Next Review**: After Phase 1 Completion
