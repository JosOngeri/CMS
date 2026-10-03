/**
 * WHAT THIS FILE DOES
 * -------------------
 * Defines every page that lives inside the dashboard. Each route is lazy-loaded
 * so the browser only downloads the code for the page the user visits.
 *
 * Some routes are gated by role or permission. If a user does not have the
 * right role, they are sent back to their home page.
 *
 * FILES IT TALKS TO
 * -----------------
 * - constants/roles.js        → ADMIN_ROLES, FINANCE_ROLES, LEADERSHIP_ROLES
 * - components/ProtectedRoute.jsx → role/permission checks
 * - pages/*                    → every dashboard page
 */

import React, { lazy, Suspense } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import { ADMIN_ROLES, FINANCE_ROLES, LEADERSHIP_ROLES } from '../constants/roles';

const Loader = () => (
  <div className="flex items-center justify-center min-h-64 p-8">
    <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
  </div>
);

class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Route Error] Component failed to load:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-64 p-8">
          <div className="text-center">
            <p className="text-[var(--color-error)] mb-2">Failed to load this page</p>
            <p className="text-sm text-[var(--color-textSecondary)] mb-4">
              {this.state.error?.message || 'An error occurred while loading this module'}
            </p>
            <button
              onClick={() => window.location.href = '/dashboard/overview'}
              className="btn btn-primary"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function SafeRoute({ children }) {
  // Keying by pathname remounts the boundary on navigation so one page's
  // crash can't leave the error screen stuck on every subsequent tab.
  const { pathname } = useLocation();
  return (
    <RouteErrorBoundary key={pathname}>
      <Suspense fallback={<Loader />}>
        {children}
      </Suspense>
    </RouteErrorBoundary>
  );
}

// Lazy-loaded pages.
const Dashboard               = lazy(() => import('../pages/dashboard/Dashboard'));
const Payments                = lazy(() => import('../pages/payments/Payments'));
const PaymentHistory          = lazy(() => import('../pages/payments/PaymentHistory'));
const MyPayments              = lazy(() => import('../pages/payments/MyPayments'));
const MyCollections           = lazy(() => import('../pages/collections/MyCollections'));
const DepartmentDashboard     = lazy(() => import('../pages/departments/DepartmentDashboard'));
const DepartmentOverview      = lazy(() => import('../pages/departments/DepartmentOverview'));
const DepartmentsList         = lazy(() => import('../pages/departments/DepartmentsList'));
const MyDepartments           = lazy(() => import('../pages/departments/MyDepartments'));
const DepartmentHeadAllocation = lazy(() => import('../pages/departments/DepartmentHeadAllocation'));
const DepartmentHandover      = lazy(() => import('../pages/departments/DepartmentHandover'));
const DepartmentSettings      = lazy(() => import('../pages/departments/DepartmentSettings'));
const DepartmentActivity      = lazy(() => import('../pages/departments/DepartmentActivity'));
const CategoryManagement      = lazy(() => import('../pages/departments/CategoryManagement'));
const AdminDashboard          = lazy(() => import('../pages/admin/AdminDashboard'));
const AdminDatabase           = lazy(() => import('../pages/admin/AdminDatabase'));
const SiteSettings            = lazy(() => import('../pages/admin/SiteSettings'));
const Profile                 = lazy(() => import('../pages/profile/Profile'));
const ProfileManagement       = lazy(() => import('../pages/profile/ProfileManagement'));
const MFASetup                = lazy(() => import('../pages/auth/MFASetup'));
const Sessions                = lazy(() => import('../pages/auth/Sessions'));
const UserManagement          = lazy(() => import('../pages/users/UserManagement'));
const PaymentManagement       = lazy(() => import('../pages/payments/PaymentManagement'));
const MemberDirectory         = lazy(() => import('../pages/members/MemberDirectory'));
const SMS                     = lazy(() => import('../sms/SMS'));
const SMSDashboard            = lazy(() => import('../modules/sms/pages/Dashboard'));
const SMSContacts             = lazy(() => import('../modules/sms/pages/Contacts'));
const SMSGroups               = lazy(() => import('../modules/sms/pages/Groups'));
const Announcements           = lazy(() => import('../pages/announcements/Announcements'));
const Events                  = lazy(() => import('../pages/events/Events'));
const ApprovalInbox           = lazy(() => import('../pages/approvals/ApprovalInbox'));
const Reports                 = lazy(() => import('../pages/reports/Reports'));
const Content                 = lazy(() => import('../pages/content/Content'));
const Analytics               = lazy(() => import('../pages/analytics/Analytics'));
const Security                = lazy(() => import('../pages/security/Security'));
const TelegramAuth            = lazy(() => import('../pages/telegram/TelegramAuth'));
const TelegramChurchSettings  = lazy(() => import('../pages/telegram/TelegramChurchSettings'));
const Mobile                  = lazy(() => import('../pages/mobile/Mobile'));
const Monitoring              = lazy(() => import('../pages/monitoring/Monitoring'));
const SEO                     = lazy(() => import('../pages/seo/SEO'));
const Accessibility           = lazy(() => import('../pages/accessibility/Accessibility'));
const Testing                 = lazy(() => import('../pages/testing/Testing'));
const Documentation           = lazy(() => import('../pages/documentation/Documentation'));
const TreasuryDashboard       = lazy(() => import('../pages/treasury/TreasuryDashboard'));
const ChartOfAccounts         = lazy(() => import('../pages/treasury/ChartOfAccounts'));
const JournalEntries          = lazy(() => import('../pages/treasury/JournalEntries'));
const Budgets                 = lazy(() => import('../pages/treasury/Budgets'));
const Expenses                = lazy(() => import('../pages/treasury/Expenses'));
const FinancialReports        = lazy(() => import('../pages/treasury/FinancialReports'));
const Funds                   = lazy(() => import('../pages/treasury/Funds'));
const BankReconciliations     = lazy(() => import('../pages/treasury/BankReconciliations'));
const Contributions           = lazy(() => import('../pages/treasury/Contributions'));
const Vendors                 = lazy(() => import('../pages/treasury/Vendors'));
const Projects                = lazy(() => import('../pages/treasury/Projects'));
const FixedAssets             = lazy(() => import('../pages/treasury/FixedAssets'));
const Pledges                 = lazy(() => import('../pages/treasury/Pledges'));
const RecurringPayments       = lazy(() => import('../pages/treasury/RecurringPayments'));
const Receipts                = lazy(() => import('../pages/treasury/Receipts'));
const TreasuryAnalytics       = lazy(() => import('../pages/treasury/TreasuryAnalytics'));
const GalleryManagement       = lazy(() => import('../pages/gallery/GalleryManagement'));
const NotificationDashboard   = lazy(() => import('../pages/notifications/NotificationDashboard'));
const Documents               = lazy(() => import('../pages/admin/Documents'));
const MyObligations           = lazy(() => import('../pages/obligations/MyObligations'));

// Wrapper that optionally adds a role gate.
const W = ({ C, roles }) => (
  <SafeRoute>
    {roles && roles.length > 0
      ? <ProtectedRoute requiredRoles={roles}><C /></ProtectedRoute>
      : <C />}
  </SafeRoute>
);

export const dashboardRoutes = [
  { index: true, element: <Navigate to="/dashboard/overview" replace /> },
  { path: 'overview', element: <W C={Dashboard} /> },

  // People & Members
  { path: 'members',        element: <W C={MemberDirectory} roles={LEADERSHIP_ROLES} /> },
  { path: 'users',          element: <W C={UserManagement} roles={ADMIN_ROLES} /> },
  { path: 'profile',        element: <W C={Profile} /> },
  { path: 'profile-management', element: <W C={ProfileManagement} /> },
  { path: 'profile/mfa',    element: <W C={MFASetup} /> },
  { path: 'profile/sessions', element: <W C={Sessions} /> },

  // Treasury & Payments
  { path: 'treasury',                element: <W C={TreasuryDashboard} roles={FINANCE_ROLES} /> },
  { path: 'payments/my',             element: <W C={MyPayments} /> },
  { path: 'payments/new',            element: <W C={Payments} /> },
  { path: 'obligations',             element: <W C={MyObligations} /> },
  { path: 'payments/history',        element: <W C={PaymentHistory} /> },
  { path: 'payments/management',     element: <W C={PaymentManagement} roles={FINANCE_ROLES} /> },
  { path: 'collections',             element: <W C={MyCollections} /> },

  // Treasury detail pages
  { path: 'treasury/accounts',         element: <W C={ChartOfAccounts} roles={FINANCE_ROLES} /> },
  { path: 'treasury/journal-entries',  element: <W C={JournalEntries} roles={FINANCE_ROLES} /> },
  { path: 'treasury/budgets',          element: <W C={Budgets} roles={FINANCE_ROLES} /> },
  { path: 'treasury/expenses',         element: <W C={Expenses} roles={FINANCE_ROLES} /> },
  { path: 'treasury/reports',          element: <W C={FinancialReports} roles={FINANCE_ROLES} /> },
  { path: 'treasury/funds',            element: <W C={Funds} roles={FINANCE_ROLES} /> },
  { path: 'treasury/reconciliations',  element: <W C={BankReconciliations} roles={FINANCE_ROLES} /> },
  { path: 'treasury/contributions',    element: <W C={Contributions} roles={FINANCE_ROLES} /> },
  { path: 'treasury/vendors',          element: <W C={Vendors} roles={FINANCE_ROLES} /> },
  { path: 'treasury/projects',         element: <W C={Projects} roles={FINANCE_ROLES} /> },
  { path: 'treasury/assets',           element: <W C={FixedAssets} roles={FINANCE_ROLES} /> },
  { path: 'treasury/pledges',          element: <W C={Pledges} roles={FINANCE_ROLES} /> },
  { path: 'treasury/recurring',        element: <W C={RecurringPayments} roles={FINANCE_ROLES} /> },
  { path: 'treasury/receipts',         element: <W C={Receipts} roles={FINANCE_ROLES} /> },
  { path: 'treasury/analytics',        element: <W C={TreasuryAnalytics} roles={FINANCE_ROLES} /> },

  // Departments
  { path: 'departments',                  element: <W C={DepartmentsList} /> },
  { path: 'departments/overview',         element: <W C={DepartmentOverview} /> },
  { path: 'departments/head-allocation',  element: <W C={DepartmentHeadAllocation} roles={ADMIN_ROLES} /> },
  { path: 'departments/handovers',        element: <W C={DepartmentHandover} /> },
  { path: 'departments/settings',         element: <W C={DepartmentSettings} roles={ADMIN_ROLES} /> },
  { path: 'departments/categories',     element: <W C={CategoryManagement} roles={ADMIN_ROLES} /> },
  { path: 'my-departments',               element: <W C={MyDepartments} /> },
  { path: 'departments/:departmentSlug',          element: <W C={DepartmentDashboard} /> },
  { path: 'departments/:departmentSlug/activity', element: <W C={DepartmentActivity} /> },

  // System & Administration
  { path: 'admin',           element: <W C={AdminDashboard} roles={ADMIN_ROLES} /> },
  { path: 'admin/database',  element: <W C={AdminDatabase} roles={ADMIN_ROLES} /> },
  { path: 'admin/settings',  element: <W C={SiteSettings} roles={ADMIN_ROLES} /> },
  { path: 'admin/documents', element: <W C={Documents} roles={ADMIN_ROLES} /> },
  { path: 'security',        element: <W C={Security} roles={ADMIN_ROLES} /> },
  { path: 'monitoring',      element: <W C={Monitoring} roles={ADMIN_ROLES} /> },
  { path: 'analytics',       element: <W C={Analytics} roles={FINANCE_ROLES} /> },

  // Communication & Media
  { path: 'sms',            element: <W C={SMS} roles={LEADERSHIP_ROLES} /> },
  { path: 'sms/dashboard',  element: <W C={SMSDashboard} roles={LEADERSHIP_ROLES} /> },
  { path: 'sms/contacts',   element: <W C={SMSContacts} roles={LEADERSHIP_ROLES} /> },
  { path: 'sms/groups',     element: <W C={SMSGroups} roles={LEADERSHIP_ROLES} /> },
  { path: 'announcements',  element: <W C={Announcements} /> },
  { path: 'documents',      element: <W C={Documents} /> },
  { path: 'notifications',  element: <W C={NotificationDashboard} /> },
  { path: 'telegram',       element: <Navigate to="church" replace /> },
  { path: 'telegram/auth',  element: <W C={TelegramAuth} /> },
  { path: 'telegram/church', element: <W C={TelegramChurchSettings} roles={ADMIN_ROLES} /> },
  { path: 'gallery',        element: <W C={GalleryManagement} /> },

  // Other Modules
  { path: 'events',         element: <W C={Events} /> },
  { path: 'approvals',      element: <W C={ApprovalInbox} roles={LEADERSHIP_ROLES} /> },
  { path: 'reports',        element: <W C={Reports} roles={FINANCE_ROLES} /> },
  { path: 'content',        element: <W C={Content} roles={LEADERSHIP_ROLES} /> },
  { path: 'mobile',         element: <W C={Mobile} roles={ADMIN_ROLES} /> },
  { path: 'seo',            element: <W C={SEO} roles={ADMIN_ROLES} /> },
  { path: 'accessibility',  element: <W C={Accessibility} roles={ADMIN_ROLES} /> },
  { path: 'testing',        element: <W C={Testing} roles={ADMIN_ROLES} /> },
  { path: 'documentation',  element: <W C={Documentation} roles={ADMIN_ROLES} /> },
];
