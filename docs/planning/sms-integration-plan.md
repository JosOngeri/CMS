# SMS Platform Integration Plan

## Overview
Integrate JOSms WebApp into KMainCMS to create a unified church management system with SMS capabilities.

## Current Architecture Analysis

### KMainCMS
- **Backend**: Node.js/Express with modular architecture
- **Frontend**: React/Vite
- **Database**: PostgreSQL
- **Authentication**: JWT with Passport
- **Modules**: Auth, Payments, Treasury, and 60+ controllers

### JOSms WebApp
- **Backend**: Node.js/Express (minimal structure)
- **Frontend**: Next.js 16 with React 19
- **Database**: PostgreSQL with SMS-specific tables
- **Authentication**: NextAuth.js
- **Features**: Contact management, groups, messaging, templates

## Integration Strategy

### Phase 1: Backend Integration
**Objective**: Merge SMS functionality into KMainCMS backend as a new module

**Steps**:
1. Create SMS module structure in `backend/modules/sms/`
2. Migrate SMS database schema to KMainCMS database
3. Port SMS controllers from JOSms to KMainCMS
4. Integrate SMS routes with KMainCMS routing system
5. Adapt SMS authentication to use KMainCMS JWT
6. Update SMS API to follow KMainCMS modular architecture

**Files to Create**:
- `backend/modules/sms/sms.controller.js`
- `backend/modules/sms/sms.routes.js`
- `backend/modules/sms/sms.service.js`
- `backend/modules/sms/sms.repository.js`
- `backend/modules/sms/contacts.controller.js`
- `backend/modules/sms/groups.controller.js`
- `backend/modules/sms/messages.controller.js`
- `backend/modules/sms/templates.controller.js`
- `backend/modules/sms/import.controller.js`

**Database Changes**:
- Add SMS tables to KMainCMS database schema
- Create migration file for SMS tables
- Add organization_id to existing users table if needed
- Create indexes for SMS tables

**Verification**:
- Test SMS API endpoints
- Verify database tables created correctly
- Test authentication integration
- Verify modular architecture compliance

### Phase 2: Frontend Integration
**Objective**: Convert Next.js frontend to React/Vite and integrate with KMainCMS

**Steps**:
1. Convert Next.js app directory structure to React/Vite structure
2. Port SMS components to KMainCMS frontend structure
3. Integrate SMS pages into KMainCMS routing
4. Adapt SMS API calls to use KMainCMS backend
5. Replace NextAuth with KMainCMS authentication context
6. Integrate SMS state management with KMainCMS context system

**Files to Create**:
- `frontend/src/modules/sms/pages/Dashboard.jsx`
- `frontend/src/modules/sms/pages/Contacts.jsx`
- `frontend/src/modules/sms/pages/Groups.jsx`
- `frontend/src/modules/sms/pages/Messages.jsx`
- `frontend/src/modules/sms/pages/Templates.jsx`
- `frontend/src/modules/sms/pages/Import.jsx`
- `frontend/src/modules/sms/components/ContactList.jsx`
- `frontend/src/modules/sms/components/GroupList.jsx`
- `frontend/src/modules/sms/components/MessageForm.jsx`
- `frontend/src/modules/sms/contexts/SMSContext.jsx`

**Files to Modify**:
- `frontend/src/router/index.jsx` - Add SMS routes
- `frontend/src/contexts/AuthContext.jsx` - Add SMS permissions
- `frontend/package.json` - Add SMS dependencies

**Verification**:
- Test SMS pages load correctly
- Verify routing works
- Test authentication integration
- Verify responsive design

### Phase 3: Database Schema Integration
**Objective**: Merge SMS database schema with KMainCMS schema

**Steps**:
1. Review existing KMainCMS database schema
2. Identify any table conflicts
3. Create migration file for SMS tables
4. Add foreign key relationships to users table
5. Create indexes for performance
6. Add Row Level Security policies

**Tables to Add**:
- `organizations` - SMS organizations
- `sms_groups` - Contact groups (renamed to avoid conflict)
- `sms_contacts` - SMS contacts
- `sms_messages` - SMS messages
- `message_templates` - Message templates
- `import_logs` - Import history
- `user_group_permissions` - Group access permissions

**Migration File**:
- `backend/migrations/add_sms_tables.sql`

**Verification**:
- Run migration successfully
- Verify table relationships
- Test foreign key constraints
- Verify indexes created

### Phase 4: Authentication Integration
**Objective**: Unify authentication systems

**Steps**:
1. Remove NextAuth dependency from SMS frontend
2. Use KMainCMS JWT authentication
3. Add SMS-specific permissions to KMainCMS auth
4. Update user roles to include SMS permissions
5. Integrate SMS organization concept with KMainCMS church concept

**Permission Changes**:
- Add `sms:admin` permission
- Add `sms:send` permission
- Add `sms:view` permission
- Add `sms:import` permission
- Add `sms:export` permission

**Verification**:
- Test login with SMS permissions
- Verify permission-based access control
- Test role-based feature access

### Phase 5: Testing and Validation
**Objective**: Ensure integrated system works correctly

**Steps**:
1. Test all SMS functionality
2. Test integration with existing KMainCMS features
3. Test user permissions
4. Test data import/export
5. Test message sending
6. Test mobile app compatibility

**Test Cases**:
- User can access SMS module with correct permissions
- Contact management works
- Group management works
- Message sending works
- Import/export works
- Authentication works across both systems

**Verification**:
- All test cases pass
- No breaking changes to existing KMainCMS
- Performance is acceptable
- Mobile app still works

## Implementation Status

### Completed
- ✅ **Phase 1**: Backend Integration
  - Created SMS contact management controllers
  - Created SMS group management controllers
  - Added routes for SMS contacts and groups
  - Integrated with existing KMainCMS middleware
  - Added file upload middleware for imports

- ✅ **Phase 3**: Database Schema Integration
  - Created migration script for SMS tables
  - Fixed data type compatibility issues (UUID vs INTEGER)
  - Successfully migrated database with all SMS tables
  - Added proper indexes and triggers

- ✅ **Phase 4**: Authentication Integration
  - Using existing KMainCMS JWT authentication
  - Integrated with existing role-based access control
  - Added permission checks for SMS operations

- ✅ **Phase 2**: Frontend Integration
  - Created SMS Dashboard component
  - Created SMS Contacts management page
  - Created SMS Groups management page
  - Added routes to existing router configuration
  - Integrated with existing authentication context

### Remaining
- ⏳ **Phase 5**: Testing and Validation
  - Test SMS API endpoints
  - Test frontend components
  - Test integration with existing features
  - Verify mobile app compatibility

## Implementation Order

1. **Phase 1**: Backend Integration (highest priority) ✅ COMPLETED
2. **Phase 3**: Database Schema Integration (backend dependency) ✅ COMPLETED
3. **Phase 4**: Authentication Integration (backend dependency) ✅ COMPLETED
4. **Phase 2**: Frontend Integration (frontend dependency) ✅ COMPLETED
5. **Phase 5**: Testing and Validation (final step) ⏳ IN PROGRESS

## Risk Mitigation

**Backup Strategy**:
- Backup KMainCMS database before migration
- Backup JOSms database before migration
- Create git branch for integration work

**Rollback Plan**:
- Database rollback script
- Code rollback via git
- Separate deployment for testing

**Testing Strategy**:
- Test environment first
- Staging environment second
- Production deployment last

## Success Criteria

- SMS functionality fully integrated into KMainCMS
- No breaking changes to existing KMainCMS features
- Unified authentication system
- Single database for all functionality
- Mobile app compatibility maintained
- Performance not degraded
- All tests pass

## Next Steps

1. Create feature branch for integration
2. Begin Phase 1: Backend Integration
3. Create SMS module structure
4. Migrate database schema
5. Test backend integration
6. Proceed to frontend integration