# KMainCMS Navigation Map

This document maps all pages in the application to their UI navigation paths.

## Public Routes (No Authentication Required)

| Route | Page Component | UI Navigation |
|-------|---------------|---------------|
| `/` | PublicHome | Home page - default landing page |
| `/announcements` | Announcements | Public announcements page |
| `/announcements/:announcementId` | PublicAnnouncementDetail | Individual announcement detail (clicked from announcements list) |
| `/terms` | Terms | Terms of service (footer link) |
| `/privacy` | Privacy | Privacy policy (footer link) |
| `/gallery` | PhotoGalleryPage | Public photo gallery |

## Authentication Routes

| Route | Page Component | UI Navigation |
|-------|---------------|---------------|
| `/auth/login` | Login | Login button on home page or direct URL |
| `/auth/register` | Register | Register button on home page or direct URL |
| `/auth/forgot-password` | ForgotPassword | "Forgot password" link on login page |

## Dashboard Routes (Authentication Required)

### Main Sidebar Navigation

| Sidebar Item | Route | Page Component | UI Navigation Path |
|--------------|-------|---------------|-------------------|
| Dashboard | `/dashboard/overview` | Dashboard | Click "Dashboard" in sidebar |
| People | `/dashboard/members` | MembersList | Click "People" in sidebar |
| Gallery | `/dashboard/gallery` | GalleryManagement | Click "Gallery" in sidebar |
| Departments | `/dashboard/departments` | DepartmentsList | Click "Departments" in sidebar |
| Content | `/dashboard/documents` | Documents | Click "Content" in sidebar |
| Payments | `/dashboard/payments` | TreasuryDashboard | Click "Payments" in sidebar |
| Communications | `/dashboard/sms` | SMS | Click "Communications" in sidebar |
| Announcements | `/dashboard/announcements` | Announcements | Click "Announcements" in sidebar |
| Approvals | `/dashboard/approvals` | ApprovalInbox | Click "Approvals" in sidebar |
| Settings | `/dashboard/settings` | Settings | Click "Settings" in sidebar |

### Dashboard Quick Actions

| Quick Action | Route | Page Component | UI Navigation Path |
|--------------|-------|---------------|-------------------|
| Add Member | `/dashboard/members` | MembersList | Dashboard → Click "Add Member" quick action |
| Upload Photo | `/dashboard/gallery` | GalleryManagement | Dashboard → Click "Upload Photo" quick action |
| New Announcement | `/dashboard/announcements` | Announcements | Dashboard → Click "New Announcement" quick action |
| Send SMS | `/dashboard/sms` | SMS | Dashboard → Click "Send SMS" quick action |
| Analytics | `/dashboard/analytics` | Analytics | Dashboard → Click "Analytics" quick action |
| Testing | `/dashboard/testing` | Testing | Dashboard → Click "Testing" quick action |
| Reports | `/dashboard/reports` | Reports | Dashboard → Click "Reports" quick action |

### Profile Access

| Route | Page Component | UI Navigation Path |
|-------|---------------|-------------------|
| `/dashboard/profile` | Profile | Click on user avatar in sidebar header |
| `/dashboard/profile-management` | ProfileManagement | Profile management settings |

### Tabbed Interfaces

#### People Page (`/dashboard/members`)
| Tab | Route | Page Component | UI Navigation Path |
|-----|-------|---------------|-------------------|
| Users | `/dashboard/members` | MembersList | People → Click "Users" tab |
| Church Members | `/dashboard/members` | MembersList | People → Click "Church Members" tab |
| Department Heads | `/dashboard/members` | MembersList | People → Click "Department Heads" tab |
| Staff | `/dashboard/members` | MembersList | People → Click "Staff" tab |
| Volunteers | `/dashboard/members` | MembersList | People → Click "Volunteers" tab |
| Visitors | `/dashboard/members` | MembersList | People → Click "Visitors" tab |

#### Content Page (`/dashboard/documents`)
| Tab | Route | Page Component | UI Navigation Path |
|-----|-------|---------------|-------------------|
| Documents | `/dashboard/documents` | Documents | Content → Click "Documents" tab |
| Content Management | `/dashboard/content` | Content | Content → Click "Content Management" tab |

#### Payments/Treasury Page (`/dashboard/payments`)
| Tab | Route | Page Component | UI Navigation Path |
|-----|-------|---------------|-------------------|
| Overview | `/dashboard/payments` | TreasuryDashboard | Payments → Click "Overview" tab |
| Transactions | `/dashboard/payments/journal-entries` | JournalEntries | Payments → Click "Transactions" tab |
| Budgets | `/dashboard/payments/budgets` | Budgets | Payments → Click "Budgets" tab |
| Collections | `/dashboard/payments` | TreasuryDashboard | Payments → Click "Collections" tab |
| Reports | `/dashboard/payments/reports` | FinancialReports | Payments → Click "Reports" tab |
| Settings | `/dashboard/payments` | TreasuryDashboard | Payments → Click "Settings" tab |

**Collections Tab Sub-pages:**
| Sub-page | Route | Page Component | UI Navigation Path |
|----------|-------|---------------|-------------------|
| My Collections | `/dashboard/collections` | MyCollections | Payments → Collections tab → Click "My Collections" |
| Payment History | `/dashboard/payment-history` | PaymentHistory | Payments → Collections tab → Click "Payment History" |
| Payment Management | `/dashboard/payment-management` | PaymentManagement | Payments → Collections tab → Click "Payment Management" |
| Contribution Reports | `/dashboard/payments/contributions` | Contributions | Payments → Collections tab → Click "Contribution Reports" |

#### Communications Page (`/dashboard/sms`)
| Tab | Route | Page Component | UI Navigation Path |
|-----|-------|---------------|-------------------|
| Compose | `/dashboard/sms` | SMS | Communications → Click "Compose" tab |
| Templates | `/dashboard/sms` | SMS | Communications → Click "Templates" tab |
| Campaigns | `/dashboard/sms` | SMS | Communications → Click "Campaigns" tab |
| Analytics | `/dashboard/sms` | SMS | Communications → Click "Analytics" tab |
| Telegram | `/dashboard/telegram` | Telegram | Communications → Click "Telegram" tab |
| Notifications | `/dashboard/notifications` | NotificationDashboard | Communications → Click "Notifications" tab |

#### Settings Page (`/dashboard/settings`)
| Tab | Route | Page Component | UI Navigation Path |
|-----|-------|---------------|-------------------|
| General | `/dashboard/settings` | Settings | Settings → Click "General" tab |
| Members | `/dashboard/settings` | Settings | Settings → Click "Members" tab |
| Departments | `/dashboard/settings` | Settings | Settings → Click "Departments" tab |
| Treasury | `/dashboard/settings` | Settings | Settings → Click "Treasury" tab |
| Communications | `/dashboard/settings` | Settings | Settings → Click "Communications" tab |
| Notifications | `/dashboard/settings` | Settings | Settings → Click "Notifications" tab |
| Appearance | `/dashboard/settings` | Settings | Settings → Click "Appearance" tab |
| Security | `/dashboard/security` | Security | Settings → Click "Security" tab |
| Monitoring | `/dashboard/monitoring` | Monitoring | Settings → Click "Monitoring" tab |
| SEO | `/dashboard/seo` | SEO | Settings → Click "SEO" tab |
| Accessibility | `/dashboard/accessibility` | Accessibility | Settings → Click "Accessibility" tab |
| Mobile | `/dashboard/mobile` | Mobile | Settings → Click "Mobile" tab |
| Testing | `/dashboard/testing` | Testing | Settings → Click "Testing" tab |
| Documentation | `/dashboard/documentation` | Documentation | Settings → Click "Documentation" tab |

### Department Pages

| Route | Page Component | UI Navigation Path |
|-------|---------------|-------------------|
| `/dashboard/departments/overview` | DepartmentOverview | Departments → Click "Overview" (if available) |
| `/dashboard/departments/head-allocation` | DepartmentHeadAllocation | Departments → Click "Head Allocation" (if available) |
| `/dashboard/departments/settings` | DepartmentSettings | Departments → Click "Settings" (if available) |
| `/dashboard/departments/categories` | CategoryManagement | Departments → Click "Categories" (if available) |
| `/dashboard/my-departments` | MyDepartments | Departments → Click "My Departments" (if available) |
| `/dashboard/departments/:departmentSlug` | DepartmentDashboard | Departments → Click on specific department in list |
| `/dashboard/departments/:departmentSlug/activity` | DepartmentActivity | Department Dashboard → Click "Activity" |

### Treasury/Payment Sub-pages

| Route | Page Component | UI Navigation Path |
|-------|---------------|-------------------|
| `/dashboard/payments/accounts` | ChartOfAccounts | Payments → Transactions tab → Click "Chart of Accounts" |
| `/dashboard/payments/journal-entries` | JournalEntries | Payments → Transactions tab → Click "Journal Entries" |
| `/dashboard/payments/budgets` | Budgets | Payments → Budgets tab |
| `/dashboard/payments/expenses` | Expenses | Payments → Click "Expenses" (if available) |
| `/dashboard/payments/reports` | FinancialReports | Payments → Reports tab |
| `/dashboard/payments/funds` | Funds | Payments → Click "Funds" (if available) |
| `/dashboard/payments/reconciliations` | BankReconciliations | Payments → Click "Reconciliations" (if available) |
| `/dashboard/payments/contributions` | Contributions | Payments → Collections tab → Click "Contribution Reports" |
| `/dashboard/payments/vendors` | Vendors | Payments → Click "Vendors" (if available) |
| `/dashboard/payments/projects` | Projects | Payments → Click "Projects" (if available) |
| `/dashboard/payments/assets` | FixedAssets | Payments → Click "Assets" (if available) |
| `/dashboard/payments/pledges` | Pledges | Payments → Click "Pledges" (if available) |
| `/dashboard/payments/recurring` | RecurringPayments | Payments → Click "Recurring" (if available) |
| `/dashboard/payments/receipts` | Receipts | Payments → Click "Receipts" (if available) |
| `/dashboard/payments/analytics` | TreasuryAnalytics | Payments → Click "Analytics" (if available) |

### Admin Pages

| Route | Page Component | UI Navigation Path | Access Requirement |
|-------|---------------|-------------------|-------------------|
| `/dashboard/admin` | AdminDashboard | Navigate to `/dashboard/admin` | Super Admin, Pastor, First Elder |
| `/dashboard/admin/database` | AdminDatabase | Admin Dashboard → Click "Database" | Super Admin |
| `/dashboard/admin/settings` | SiteSettings | Admin Dashboard → Click "Settings" | Super Admin, Pastor, First Elder |
| `/dashboard/users` | UserManagement | Navigate to `/dashboard/users` | Super Admin, Pastor, First Elder |

### Other Dashboard Pages

| Route | Page Component | UI Navigation Path |
|-------|---------------|-------------------|
| `/dashboard/payment-history` | PaymentHistory | Payments → Collections tab → Click "Payment History" |
| `/dashboard/notifications` | NotificationDashboard | Communications → Click "Notifications" tab |
| `/dashboard/events` | Events | Sidebar "Events" (Department Head role only) |
| `/dashboard/collections` | MyCollections | Payments → Collections tab → Click "My Collections" |
| `/dashboard/payment-management` | PaymentManagement | Payments → Collections tab → Click "Payment Management" |
| `/dashboard/reports` | Reports | Dashboard → Click "Reports" quick action |
| `/dashboard/content` | Content | Content → Click "Content Management" tab |
| `/dashboard/analytics` | Analytics | Dashboard → Click "Analytics" quick action |
| `/dashboard/security` | Security | Settings → Click "Security" tab |
| `/dashboard/telegram` | Telegram | Communications → Click "Telegram" tab |
| `/dashboard/mobile` | Mobile | Settings → Click "Mobile" tab |
| `/dashboard/monitoring` | Monitoring | Settings → Click "Monitoring" tab |
| `/dashboard/seo` | SEO | Settings → Click "SEO" tab |
| `/dashboard/accessibility` | Accessibility | Settings → Click "Accessibility" tab |
| `/dashboard/testing` | Testing | Dashboard → Click "Testing" quick action OR Settings → Click "Testing" tab |
| `/dashboard/documentation` | Documentation | Settings → Click "Documentation" tab |

## Role-Based Navigation

### Super Admin
- Access to all sidebar items
- Access to all admin pages
- Access to user management
- Access to database management
- All tabs and quick actions available

### Pastor
- Access to all sidebar items except database management
- Access to admin dashboard and site settings
- Access to user management
- All tabs and quick actions available

### First Elder
- Access to all sidebar items except database management
- Access to admin dashboard and site settings
- Access to user management
- All tabs and quick actions available

### Department Head
- Access to standard sidebar items
- Additional "Events" menu item in sidebar
- Access to department-specific pages
- Access to own department dashboard
- Limited admin access

### Treasurer
- Access to standard sidebar items
- Additional "Treasury" menu item in sidebar (redirects to Payments)
- Access to all treasury/payment sub-pages and tabs
- Collections tab available

### Member
- Access to standard sidebar items
- Limited access based on permissions
- Can view own profile and assigned departments
- Some tabs may be restricted

## Navigation Patterns

### From Sidebar
1. Click on sidebar menu item
2. Navigates to corresponding route
3. Active item is highlighted

### From User Profile
1. Click on user avatar in sidebar header
2. Navigates to `/dashboard/profile`

### From Dashboard Quick Actions
1. Click quick action button on Dashboard
2. Navigates directly to the corresponding page
3. 7 quick actions available: Add Member, Upload Photo, New Announcement, Send SMS, Analytics, Testing, Reports

### From Tabbed Pages
1. Navigate to main page via sidebar
2. Click on specific tab to view content
3. Some tabs have sub-pages accessible via links within the tab content

### From Within Pages
- Many pages have internal navigation to related pages
- Example: Department list → Click department → Department dashboard
- Example: Payments → Click submenu item → Specific payment page
- Example: Collections tab → Click sub-page link → Specific collection page

### Role-Specific Items
- Some menu items only appear for specific roles
- Treasury item appears for Treasurer role
- Events item appears for Department Head role
- Admin pages restricted to Super Admin, Pastor, First Elder

## Quick Access Summary

- **Dashboard**: Always available in sidebar (top item)
- **Profile**: Click user avatar in sidebar header
- **Logout**: Logout button in sidebar header
- **Settings**: Available in sidebar (bottom item)
- **Quick Actions**: 7 buttons on Dashboard for frequently used pages
- **Tabs**: 5 main pages have tabbed interfaces for related functionality

## All Pages Coverage

✅ **Public Routes**: 6 pages - All accessible via home page or footer links
✅ **Auth Routes**: 3 pages - All accessible via login/register buttons
✅ **Sidebar Navigation**: 10 main items - All accessible via sidebar
✅ **Dashboard Quick Actions**: 7 pages - All accessible via Dashboard
✅ **Tabbed Pages**: 5 pages with tabs - All tabs accessible within their pages
✅ **Department Pages**: 7 routes - All accessible via Departments list
✅ **Treasury/Payment Pages**: 15 sub-pages - All accessible via Payments tabs
✅ **Admin Pages**: 4 routes - All accessible via Admin Dashboard or direct navigation
✅ **Other Dashboard Pages**: 15 routes - All accessible via tabs, quick actions, or links

**Total**: 67+ pages with clear UI navigation paths
