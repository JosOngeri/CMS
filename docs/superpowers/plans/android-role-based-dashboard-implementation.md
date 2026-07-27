# Android App Role-Based Dashboard Implementation Plan

## Overview
Make the Android app display the same data and functionality as the webapp based on user roles. The app should be a true extension of the webapp with role-specific dashboards and data access.

## Current State Analysis
- **Webapp**: Has role-based dashboards (SuperAdmin, Pastor, DepartmentHead, Treasurer, Member)
- **Android App**: Currently has a generic dashboard that doesn't match webapp role-based approach
- **Authentication**: Both use same auth endpoint and JWT tokens
- **Data Access**: Android app needs to fetch role-specific data like webapp

## Implementation Tasks

### 1. Add Role-Based Routing to Android App
**File**: `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\lib\app\router.dart`
- Add role-based route definitions
- Create routes for each role-specific dashboard
- Implement role-based navigation logic
- Add middleware to check user roles before navigation

**Verification**: Router contains role-based routes and navigation logic

### 2. Create Role-Specific Dashboard Screens
**Files**: 
- `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\lib\screens\super_admin_dashboard.dart`
- `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\lib\screens\pastor_dashboard.dart`
- `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\lib\screens\department_head_dashboard.dart`
- `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\lib\screens\treasurer_dashboard.dart`
- `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\lib\screens\member_dashboard.dart`

**Task**: Create role-specific dashboard screens matching webapp functionality
- Super Admin: Platform management, tenant management, system stats
- Pastor: Church overview, member management, announcements
- Department Head: Department management, member assignments, department stats
- Treasurer: Payment tracking, financial reports, budget management
- Member: Personal profile, payments, announcements, events

**Verification**: Each dashboard screen exists and implements role-specific features

### 3. Update API Service for Role-Specific Data
**File**: `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\lib\services\api_service.dart`

**Task**: Add API methods to fetch role-specific data
- `getSuperAdminDashboardData()` - Platform stats, tenant list, system health
- `getPastorDashboardData()` - Church stats, member count, recent activities
- `getDepartmentHeadDashboardData()` - Department stats, member assignments, tasks
- `getTreasurerDashboardData()` - Payment stats, financial reports, budget info
- `getMemberDashboardData()` - Personal payments, announcements, events

**Verification**: API service has role-specific data fetching methods

### 4. Update Auth Service to Handle Roles
**File**: `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\lib\services\auth_service.dart`

**Task**: Enhance auth service to properly handle user roles
- Add role parsing from JWT token
- Create role providers for role-based access control
- Add role checking utilities
- Implement role-based permission system

**Verification**: Auth service properly extracts and manages user roles

### 5. Update Main Dashboard Screen for Role Routing
**File**: `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\lib\screens\dashboard_screen.dart`

**Task**: Update main dashboard to route to role-specific screens
- Check user roles from auth provider
- Navigate to appropriate role-specific dashboard
- Handle role transitions and permissions
- Add role-based UI elements

**Verification**: Dashboard screen routes to correct role-specific screen

### 6. Add Role-Based Navigation Components
**File**: `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\lib\widgets\role_based_navigation.dart`

**Task**: Create navigation component that adapts to user roles
- Show/hide navigation items based on roles
- Implement role-specific bottom navigation
- Add role-based menu options
- Handle navigation permissions

**Verification**: Navigation component shows role-appropriate options

### 7. Implement Data Fetching for Each Role
**Files**: Create role-specific data fetching services
- `lib/services/super_admin_data_service.dart`
- `lib/services/pastor_data_service.dart`
- `lib/services/department_head_data_service.dart`
- `lib/services/treasurer_data_service.dart`
- `lib/services/member_data_service.dart`

**Task**: Implement data fetching logic for each role
- Fetch role-specific statistics
- Load role-appropriate data
- Handle data caching and updates
- Implement error handling

**Verification**: Each role has dedicated data service with proper API calls

### 8. Add Role-Based UI Components
**Files**: Create role-specific UI components
- `lib/widgets/super_admin_stats_card.dart`
- `lib/widgets/pastor_member_list.dart`
- `lib/widgets/department_head_task_list.dart`
- `lib/widgets/treasurer_payment_chart.dart`
- `lib/widgets/member_announcement_card.dart`

**Task**: Create UI components matching webapp functionality
- Implement role-specific stat cards
- Add role-appropriate data displays
- Match webapp visual design
- Ensure mobile responsiveness

**Verification**: UI components match webapp functionality and design

### 9. Update Color Scheme and Theme
**File**: `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\lib\app\theme.dart`

**Task**: Ensure color scheme matches webapp
- Use same color palette as webapp
- Maintain consistent branding
- Apply theme across all role screens
- Ensure accessibility compliance

**Verification**: App theme matches webapp color scheme

### 10. Add Role-Based Permissions System
**File**: `D:\VIbeCode\KMainCMS\mobile\flutter\flutter-mobile\lib\services\permission_service.dart`

**Task**: Implement permission system matching webapp
- Define role-based permissions
- Add permission checking utilities
- Implement permission-based UI hiding
- Handle permission errors gracefully

**Verification**: Permission system matches webapp access control

### 11. Test Role-Based Functionality
**Files**: Create comprehensive tests
- `test/unit/services/role_data_service_test.dart`
- `test/unit/services/permission_service_test.dart`
- `test/widgets/screens/role_dashboard_test.dart`
- `test/integration/role_based_access_test.dart`

**Task**: Test all role-based functionality
- Test role detection and routing
- Test data fetching for each role
- Test permission enforcement
- Test UI rendering for each role

**Verification**: All tests pass and role-based functionality works correctly

### 12. Deploy and Verify
**Task**: Deploy changes and verify functionality
- Build updated APK
- Install on test device
- Test each role's dashboard
- Verify data matches webapp
- Test role transitions and permissions

**Verification**: App displays correct data for each role matching webapp

## Implementation Order
1. Update auth service to handle roles properly
2. Add role-based routing to router
3. Create role-specific dashboard screens
4. Update API service for role-specific data
5. Implement data fetching services
6. Create role-based UI components
7. Add permission system
8. Update main dashboard for role routing
9. Add role-based navigation
10. Test all functionality
11. Deploy and verify

## Success Criteria
- Android app displays same data as webapp for each role
- Role-based routing works correctly
- All role-specific features are accessible
- UI matches webapp design and functionality
- Permissions system matches webapp access control
- User can access all data available in their role

## Notes
- Follow webapp's role-based architecture exactly
- Maintain consistency with webapp UI patterns
- Ensure mobile responsiveness for all role screens
- Test with actual user accounts for each role
- Document any differences between mobile and web implementations