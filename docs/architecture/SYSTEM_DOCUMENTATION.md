# Kiserian Main SDA Church Website - System Documentation

**Last Updated:** June 4, 2026  
**Version:** 1.0

This document provides comprehensive information for maintaining and extending the Kiserian Main SDA Church Website system.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture & Folder Structure](#architecture--folder-structure)
3. [Environment Variables & Configuration](#environment-variables--configuration)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Frontend Structure](#frontend-structure)
7. [Deployment Process](#deployment-process)
8. [Common Troubleshooting](#common-troubleshooting)
9. [Adding New Features](#adding-new-features)
10. [Security Considerations](#security-considerations)
11. [Third-Party Services](#third-party-services)

---

## System Overview

The Kiserian Main SDA Church Website is a full-stack web application built with:

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **Mobile:** Flutter (separate app in `flutter-mobile/` directory)
- **Authentication:** JWT tokens

### Key Features

- Member management and directory
- Department management with dashboards
- Event management and registration
- Treasury/Financial management
- SMS messaging (Blessed Texts API)
- Gallery management
- Announcements and notifications
- Payment processing
- User roles and permissions

---

## Architecture & Folder Structure

```
Kiserian Main SDA Church Website/
├── backend/                      # Node.js/Express backend
│   ├── config/                   # Configuration files
│   │   ├── database.js          # PostgreSQL connection
│   │   └── logging.js           # Logging configuration
│   ├── constants/                # Constants and enums
│   ├── controllers/              # Request handlers
│   │   ├── auth.controller.js
│   │   ├── department.controller.js
│   │   ├── sms.controller.js
│   │   ├── treasury.controller.js
│   │   └── ...
│   ├── middleware/               # Express middleware
│   │   ├── auth.js              # JWT authentication
│   │   ├── validation.js        # Request validation
│   │   └── treasurySecurity.js  # Treasury-specific security
│   ├── routes/                   # API route definitions
│   ├── .env.example             # Environment variables template
│   ├── app.js                   # Express app configuration
│   └── server.js                # Server entry point
├── frontend/                     # React + Vite frontend
│   ├── src/
│   │   ├── components/          # Reusable components
│   │   ├── contexts/            # React contexts (Auth, Toast, etc.)
│   │   ├── constants/           # Frontend constants
│   │   ├── hooks/               # Custom React hooks
│   │   ├── layouts/             # Layout components
│   │   ├── modules/             # Feature modules
│   │   ├── pages/               # Page components
│   │   ├── router/              # Route configuration
│   │   ├── services/            # API service layer
│   │   ├── App.jsx              # Root component
│   │   └── main.jsx             # Entry point
│   ├── index.html
│   ├── package.json
│   └── vite.config.js           # Vite configuration
├── database/                     # SQL schema files
│   ├── departments_schema.sql
│   ├── departments_seed_updated.sql
│   ├── add_indexes.sql
│   └── documents_schema.sql
├── flutter-mobile/               # Flutter mobile app
├── Icons and Logos/              # Static assets
└── SYSTEM_DOCUMENTATION.md       # This file
```

---

## Environment Variables & Configuration

### Backend Environment Variables (.env in backend/)

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kiserian_main_db
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Secret
JWT_SECRET=your_jwt_secret_key_here

# Server
PORT=5005
NODE_ENV=development

# CORS
FRONTEND_ORIGIN=http://localhost:5180
PRODUCTION_FRONTEND_URL=https://kiserian-main-sda-church-website-c7u7oiydk.vercel.app

# SMS (Blessed Texts API)
BLESSED_TEXTS_API_KEY=your_api_key
BLESSED_TEXTS_SENDER_ID=23107

# Email (if configured)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASSWORD=your_app_password
```

### Frontend Configuration (vite.config.js)

```javascript
export default defineConfig({
  server: {
    port: 5180,
    host: true,  // Allows external access (for mobile testing)
    proxy: {
      '/api': {
        target: 'http://192.168.1.178:5005',  // Backend URL
        changeOrigin: true,
        secure: false
      }
    }
  }
})
```

**Important:** For mobile device access on local network:
- Backend must listen on `0.0.0.0` (configured in `backend/server.js`)
- Frontend proxy target should be the machine's IP address (e.g., `192.168.1.178:5005`)
- CORS must allow private network IPs (configured in `backend/app.js`)

---

## Database Schema

### Core Tables

#### users
- `id` (PK)
- `username`
- `email`
- `password_hash`
- `first_name`
- `last_name`
- `phone_number`
- `roles` (array)
- `is_active`
- `created_at`
- `updated_at`

#### departments
- `id` (PK)
- `name`
- `slug` (unique)
- `description`
- `category`
- `head_id` (FK to users)
- `parent_department_id` (FK to departments, for committees)
- `is_committee`
- `logo_url`
- `banner_url`
- `logo_color`
- `banner_color`
- `is_active`
- `created_at`
- `updated_at`

#### department_members
- `id` (PK)
- `user_id` (FK to users)
- `department_id` (FK to departments)
- `role_in_department`
- `joined_at`
- `is_active`

#### department_meetings
- `id` (PK)
- `department_id` (FK to departments)
- `title`
- `description`
- `meeting_date`
- `location`
- `created_at`

#### department_tasks
- `id` (PK)
- `department_id` (FK to departments)
- `title`
- `description`
- `assigned_to` (FK to users)
- `due_date`
- `status` (pending, in_progress, completed)
- `created_at`

#### department_communications
- `id` (PK)
- `department_id` (FK to departments)
- `subject`
- `message`
- `sent_by` (FK to users)
- `sent_at`

#### documents (CMS)
- `id` (PK)
- `title`
- `slug` (unique)
- `content` (HTML)
- `description`
- `is_published`
- `created_at`
- `updated_at`
- `updated_by` (FK to users)

#### settings
- `id` (PK)
- `key` (unique)
- `value`
- `category`
- `value_type` (string, number, boolean, color, select)
- `label`
- `description`
- `validation_rules` (JSON)
- `is_editable`

### Other Important Tables

- `announcements` - Church announcements
- `events` - Church events
- `gallery_photos` - Photo gallery
- `payments` - Payment records
- `treasury_*` - Financial management tables
- `sms_logs` - SMS message logs

---

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user info

### Users

- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Departments

- `GET /api/departments` - Get all departments
- `GET /api/departments/:id` - Get department by ID
- `GET /api/departments/:id/dashboard` - Get department dashboard data
- `POST /api/departments` - Create department
- `PUT /api/departments/:id` - Update department
- `DELETE /api/departments/:id` - Delete department
- `POST /api/departments/batch` - Batch operations on departments

### Department Members

- `GET /api/departments/:id/members` - Get department members
- `POST /api/departments/:id/members` - Add member to department
- `PUT /api/departments/:id/members/:userId` - Update member role
- `DELETE /api/departments/:id/members/:userId` - Remove member from department

### Documents (CMS)

- `GET /api/documents` - Get all documents
- `GET /api/documents/:id` - Get document by ID
- `GET /api/documents/slug/:slug` - Get document by slug
- `POST /api/documents` - Create document
- `PUT /api/documents/:id` - Update document
- `DELETE /api/documents/:id` - Delete document
- `PUT /api/documents/:id/publish` - Toggle publish status

### SMS

- `POST /api/sms/send-blessed` - Send SMS via Blessed Texts API
- `GET /api/sms/history` - Get SMS history
- `GET /api/sms/balance` - Get SMS balance

### Settings

- `GET /api/settings` - Get all settings
- `PUT /api/settings/bulk` - Bulk update settings

### Treasury

- Various endpoints for financial management (see `treasury.controller.js`)

---

## Frontend Structure

### Key Components

#### Authentication Context (`contexts/AuthContext.jsx`)
Provides user authentication state and API wrapper with JWT token handling.

#### Toast Context (`contexts/ToastContext.jsx`)
Provides toast notification system for success/error messages.

#### Color Palette Context (`contexts/ColorPaletteContext.jsx`)
Manages theme colors for department branding.

### Page Organization

Pages are organized by feature in `src/pages/`:

- `dashboard/` - Main dashboard
- `departments/` - Department management
- `members/` - Member directory
- `users/` - User management
- `admin/` - Admin settings
- `treasury/` - Financial management
- `sms/` - SMS messaging
- `announcements/` - Announcements
- `events/` - Events
- `gallery/` - Photo gallery

### Routing

Routes are defined in `src/router/dashboard.routes.jsx`. Protected routes use the `ProtectedRoute` component which checks user roles.

### API Service Layer

API calls are made through the `api` object from `AuthContext`, which automatically includes JWT tokens in headers.

---

## Deployment Process

### Local Development

1. **Start PostgreSQL database**
   ```bash
   # Ensure PostgreSQL is running
   # Database: kiserian_main_db
   ```

2. **Run database migrations**
   ```bash
   cd database
   psql -U postgres -d kiserian_main_db -f departments_schema.sql
   psql -U postgres -d kiserian_main_db -f documents_schema.sql
   ```

3. **Start backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env  # Configure environment variables
   node server.js
   # Backend runs on port 5005
   ```

4. **Start frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   # Frontend runs on port 5180
   ```

### Production Deployment

#### Backend (Vercel/Heroku/etc.)

1. Set environment variables in hosting platform
2. Deploy backend code
3. Ensure database is accessible from production
4. Update CORS settings in `backend/app.js` to include production URL

#### Frontend (Vercel)

1. Build frontend: `npm run build`
2. Deploy to Vercel
3. Update `vite.config.js` proxy target for production
4. Update CORS in backend to include Vercel URL

### Mobile Access on Local Network

For testing on mobile devices:

1. Backend: `server.js` must listen on `0.0.0.0`
2. Frontend: `vite.config.js` proxy target should be machine's IP (e.g., `192.168.1.178:5005`)
3. CORS: `app.js` must allow private network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
4. Access mobile: `http://192.168.1.178:5180`

---

## Common Troubleshooting

### Port Already in Use

**Error:** `Error: listen EADDRINUSE: address already in use :::5005`

**Solution:**
```bash
# Windows
taskkill /F /IM node.exe

# Linux/Mac
pkill -f node
```

### Database Connection Issues

**Error:** Connection refused or timeout

**Solutions:**
1. Check PostgreSQL is running
2. Verify database credentials in `.env`
3. Check database exists: `psql -U postgres -l`
4. Ensure database name matches `DB_NAME` in `.env`

### CORS Errors

**Error:** CORS policy blocked request

**Solutions:**
1. Check `backend/app.js` CORS configuration
2. Ensure frontend URL is in `allowedOrigins`
3. For local mobile testing, ensure private network IPs are allowed

### JWT Token Issues

**Error:** Invalid token or authentication failed

**Solutions:**
1. Check `JWT_SECRET` in backend `.env`
2. Verify token is being sent in `Authorization: Bearer <token>` header
3. Check token expiration
4. Clear browser localStorage and re-login

### SMS Not Sending

**Error:** Failed to send SMS

**Solutions:**
1. Check `BLESSED_TEXTS_API_KEY` in `.env`
2. Verify API key is valid and has credits
3. Check phone number format
4. Review backend console logs for API response

### Department Dashboard Shows Zeros

**Issue:** Metrics showing 0 despite data existing

**Solutions:**
1. Check backend console logs for "Raw member count" and "Department metrics"
2. Verify database queries in `department.controller.js`
3. Check frontend console logs for "Dashboard response"
4. Ensure department has active members in `department_members` table

---

## Adding New Features

### Adding a New Page

1. Create page component in `frontend/src/pages/`
2. Add route in `frontend/src/router/dashboard.routes.jsx`
3. Add navigation link in `frontend/src/components/common/Sidebar.jsx`
4. Create backend controller if needed
5. Add routes in backend routes file
6. Add authentication/authorization checks

### Adding a New Database Table

1. Create SQL migration file in `database/`
2. Run migration: `psql -U postgres -d kiserian_main_db -f your_file.sql`
3. Create controller in `backend/controllers/`
4. Create routes in `backend/routes/`
5. Register routes in `backend/app.js`
6. Create frontend API service calls
7. Create frontend UI components

### Adding New Settings

1. Add settings to `settings` table via SQL
2. Update `categoryNames` in `frontend/src/pages/admin/SiteSettings.jsx`
3. Settings will automatically appear in the UI

### Adding Department-Specific Features

1. Add endpoint to `department.controller.js`
2. Add route to `department.routes.js`
3. Call from frontend department dashboard
4. Use department context for state management

---

## Security Considerations

### Authentication

- JWT tokens expire after configurable time
- Tokens stored in localStorage
- Middleware checks token validity on protected routes
- Passwords hashed using bcrypt

### Authorization

- Role-based access control (RBAC)
- Roles: Super Admin, Pastor, First Elder, Department Head, Member
- Protected routes check user roles
- Treasury operations have additional security layer

### CORS

- Configured in `backend/app.js`
- Allows specific origins in development
- Allows private network IPs for local mobile testing
- Production URL must be explicitly allowed

### Input Validation

- Validation middleware in `backend/middleware/validation.js`
- SQL injection prevention via parameterized queries
- XSS prevention via React's built-in escaping

### File Uploads

- Multer configured for file uploads
- File type validation
- Size limits enforced
- Files stored in secure locations

---

## Third-Party Services

### Blessed Texts (SMS)

- **Purpose:** Send SMS messages
- **API Key:** Stored in `BLESSED_TEXTS_API_KEY` environment variable
- **Sender ID:** Configurable via `BLESSED_TEXTS_SENDER_ID`
- **Controller:** `backend/controllers/sms.controller.js`

### PostgreSQL (Database)

- **Purpose:** Primary data storage
- **Connection:** Via `backend/config/database.js`
- **Pool:** Connection pooling configured
- **Migrations:** Manual SQL files in `database/`

### Vercel (Hosting)

- **Purpose:** Frontend hosting
- **URL:** https://kiserian-main-sda-church-website-c7u7oiydk.vercel.app
- **Configuration:** Via Vercel dashboard

### Future Integrations

- Email service (SMTP)
- Payment gateway (if needed)
- Cloud storage (for file uploads)
- Analytics (Google Analytics)

---

## User Roles & Permissions

### Super Admin
- Full access to all features
- Can manage users and roles
- Can access treasury
- Can manage site settings

### Pastor
- Full access to most features
- Can manage users
- Can access treasury
- Can manage site settings

### First Elder
- Similar to Pastor
- Can manage users
- Can access treasury
- Can manage site settings

### Department Head
- Manage their department
- View department dashboard
- Manage department members
- Cannot access treasury

### Member
- View public content
- Update own profile
- Cannot access admin features

---

## Important Notes

### Database Migrations

- Migrations are manual SQL files
- Run them in order: schema → seed → indexes
- Always backup database before running migrations
- Document any schema changes in this file

### Code Style

- Frontend: React functional components with hooks
- Backend: Express with async/await
- Use existing patterns for consistency
- Comment complex logic

### Testing

- No automated tests currently
- Manual testing required for changes
- Test on multiple browsers
- Test mobile responsiveness

### Performance

- Use database indexes for frequently queried columns
- Implement pagination for large datasets
- Optimize images before upload
- Use caching where appropriate

---

## Contact & Support

For questions or issues:

1. Check this documentation first
2. Review error logs in backend console
3. Check browser console for frontend errors
4. Review database schema for data structure questions

---

## Change Log

### June 4, 2026
- Added sort dropdowns to Members, Users, Departments, and Department Dashboard
- Added SMS department recipient selection
- Created documents schema for CMS
- Created documentation controller
- Created this system documentation file

### Previous Changes
- See git commit history for detailed changes
