/**
 * Dashboard Routes
 * All authenticated dashboard routes - lazy loaded for performance and error isolation
 */

import React, { lazy, Suspense } from 'react';
import { Navigate } from 'react-router-dom';

// Spinner shown while a lazy chunk loads
const Loader = () => (
  <div className="flex items-center justify-center min-h-64 p-8">
    <div className="w-8 h-8 border-4 border-[var(--color-primary)]-800 border-t-transparent rounded-full animate-spin" />
  </div>
);

// Error boundary for individual lazy-loaded components
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
            <p className="text-red-600 mb-2">Failed to load this page</p>
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

// Wrap each lazy component so a single bad import doesn't crash the whole app
function SafeRoute({ children }) {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<Loader />}>
        {children}
      </Suspense>
    </RouteErrorBoundary>
  );
}

const Dashboard            = lazy(() => import('../pages/dashboard/Dashboard'));
const Payments             = lazy(() => import('../pages/payments/Payments'));
const PaymentHistory       = lazy(() => import('../pages/payments/PaymentHistory'));
const MyPayments            = lazy(() => import('../pages/payments/MyPayments'));
const MyCollections         = lazy(() => import('../pages/collections/MyCollections'));
const DepartmentDashboard  = lazy(() => import('../pages/departments/DepartmentDashboard'));
const DepartmentOverview   = lazy(() => import('../pages/departments/DepartmentOverview'));
const DepartmentsList      = lazy(() => import('../pages/departments/DepartmentsList'));
const MyDepartments        = lazy(() => import('../pages/departments/MyDepartments'));
const DepartmentHeadAllocation = lazy(() => import('../pages/departments/DepartmentHeadAllocation'));
const DepartmentSettings   = lazy(() => import('../pages/departments/DepartmentSettings'));
const DepartmentActivity   = lazy(() => import('../pages/departments/DepartmentActivity'));
const CategoryManagement   = lazy(() => import('../pages/departments/CategoryManagement'));
const AdminDashboard       = lazy(() => import('../pages/admin/AdminDashboard'));
const AdminDatabase        = lazy(() => import('../pages/admin/AdminDatabase'));
const SiteSettings         = lazy(() => import('../pages/admin/SiteSettings'));
const Profile              = lazy(() => import('../pages/profile/Profile'));
const ProfileManagement    = lazy(() => import('../pages/profile/ProfileManagement'));
const UserManagement       = lazy(() => import('../pages/users/UserManagement'));
const PaymentManagement    = lazy(() => import('../pages/payments/PaymentManagement'));
const MemberDirectory      = lazy(() => import('../pages/members/MemberDirectory'));
const SMS                  = lazy(() => import('../sms/SMS'));
const Announcements        = lazy(() => import('../pages/announcements/Announcements'));
const Events               = lazy(() => import('../pages/events/Events'));
const ApprovalInbox        = lazy(() => import('../pages/approvals/ApprovalInbox'));
const Notifications        = lazy(() => import('../pages/notifications/Notifications'));
const Reports              = lazy(() => import('../pages/reports/Reports'));
const Content              = lazy(() => import('../pages/content/Content'));
const Analytics            = lazy(() => import('../pages/analytics/Analytics'));
const Security             = lazy(() => import('../pages/security/Security'));
const Telegram             = lazy(() => import('../pages/telegram/Telegram'));
const TelegramAuth         = lazy(() => import('../pages/telegram/TelegramAuth'));
const Mobile               = lazy(() => import('../pages/mobile/Mobile'));
const Monitoring           = lazy(() => import('../pages/monitoring/Monitoring'));
const SEO                  = lazy(() => import('../pages/seo/SEO'));
const Accessibility        = lazy(() => import('../pages/accessibility/Accessibility'));
const Testing              = lazy(() => import('../pages/testing/Testing'));
const Documentation        = lazy(() => import('../pages/documentation/Documentation'));
const TreasuryDashboard    = lazy(() => import('../pages/treasury/TreasuryDashboard'));
const ChartOfAccounts      = lazy(() => import('../pages/treasury/ChartOfAccounts'));
const JournalEntries       = lazy(() => import('../pages/treasury/JournalEntries'));
const Budgets              = lazy(() => import('../pages/treasury/Budgets'));
const Expenses             = lazy(() => import('../pages/treasury/Expenses'));
const FinancialReports     = lazy(() => import('../pages/treasury/FinancialReports'));
const Funds                = lazy(() => import('../pages/treasury/Funds'));
const BankReconciliations  = lazy(() => import('../pages/treasury/BankReconciliations'));
const Contributions        = lazy(() => import('../pages/treasury/Contributions'));
const Vendors              = lazy(() => import('../pages/treasury/Vendors'));
const Projects             = lazy(() => import('../pages/treasury/Projects'));
const FixedAssets          = lazy(() => import('../pages/treasury/FixedAssets'));
const Pledges              = lazy(() => import('../pages/treasury/Pledges'));
const RecurringPayments    = lazy(() => import('../pages/treasury/RecurringPayments'));
const Receipts             = lazy(() => import('../pages/treasury/Receipts'));
const TreasuryAnalytics    = lazy(() => import('../pages/treasury/TreasuryAnalytics'));
const GalleryManagement    = lazy(() => import('../pages/gallery/GalleryManagement'));
const NotificationDashboard = lazy(() => import('../pages/notifications/NotificationDashboard'));
const Documents            = lazy(() => import('../pages/admin/Documents'));

const W = ({ C }) => <SafeRoute><C /></SafeRoute>;

export const dashboardRoutes = [
  { index: true,                    element: <Navigate to="/dashboard/overview" replace /> },
  { path: 'overview',               element: <W C={Dashboard} /> },
  { path: 'payments',               element: <W C={Payments} /> },
  { path: 'payment-history',        element: <W C={PaymentHistory} /> },
  { path: 'announcements',          element: <W C={Announcements} /> },
  { path: 'notifications',          element: <W C={NotificationDashboard} /> },
  { path: 'approvals',              element: <W C={ApprovalInbox} /> },
  { path: 'events',                 element: <W C={Events} /> },
  { path: 'profile',                element: <W C={Profile} /> },
  { path: 'profile-management',     element: <W C={ProfileManagement} /> },
  { path: 'users',                  element: <W C={UserManagement} /> },
  { path: 'members',                element: <W C={MemberDirectory} /> },
  { path: 'payment-management',     element: <W C={PaymentManagement} /> },
  { path: 'payments',               element: <W C={MyPayments} /> },
  { path: 'collections',            element: <W C={MyCollections} /> },
  { path: 'departments',            element: <W C={DepartmentsList} /> },
  { path: 'departments/overview',   element: <W C={DepartmentOverview} /> },
  { path: 'departments/head-allocation', element: <W C={DepartmentHeadAllocation} /> },
  { path: 'departments/settings',   element: <W C={DepartmentSettings} /> },
  { path: 'departments/categories', element: <W C={CategoryManagement} /> },
  { path: 'my-departments',         element: <W C={MyDepartments} /> },
  { path: 'departments/:departmentSlug',          element: <W C={DepartmentDashboard} /> },
  { path: 'departments/:departmentSlug/activity', element: <W C={DepartmentActivity} /> },
  { path: 'admin',                  element: <W C={AdminDashboard} /> },
  { path: 'admin/database',         element: <W C={AdminDatabase} /> },
  { path: 'admin/settings',         element: <W C={SiteSettings} /> },
  { path: 'sms',                    element: <W C={SMS} /> },
  { path: 'payments',               element: <W C={TreasuryDashboard} /> },
  { path: 'payments/accounts',      element: <W C={ChartOfAccounts} /> },
  { path: 'payments/journal-entries', element: <W C={JournalEntries} /> },
  { path: 'payments/budgets',       element: <W C={Budgets} /> },
  { path: 'payments/expenses',      element: <W C={Expenses} /> },
  { path: 'payments/reports',       element: <W C={FinancialReports} /> },
  { path: 'payments/funds',         element: <W C={Funds} /> },
  { path: 'payments/reconciliations', element: <W C={BankReconciliations} /> },
  { path: 'payments/contributions', element: <W C={Contributions} /> },
  { path: 'payments/vendors',       element: <W C={Vendors} /> },
  { path: 'payments/projects',      element: <W C={Projects} /> },
  { path: 'payments/assets',        element: <W C={FixedAssets} /> },
  { path: 'payments/pledges',       element: <W C={Pledges} /> },
  { path: 'payments/recurring',     element: <W C={RecurringPayments} /> },
  { path: 'payments/receipts',      element: <W C={Receipts} /> },
  { path: 'payments/analytics',     element: <W C={TreasuryAnalytics} /> },
  { path: 'gallery',                element: <W C={GalleryManagement} /> },
  { path: 'documents',              element: <W C={Documents} /> },
  { path: 'reports',               element: <W C={Reports} /> },
  { path: 'content',                element: <W C={Content} /> },
  { path: 'analytics',              element: <W C={Analytics} /> },
  { path: 'security',               element: <W C={Security} /> },
  { path: 'telegram',              element: <W C={Telegram} /> },
  { path: 'telegram/auth',         element: <W C={TelegramAuth} /> },
  { path: 'mobile',                 element: <W C={Mobile} /> },
  { path: 'monitoring',             element: <W C={Monitoring} /> },
  { path: 'seo',                   element: <W C={SEO} /> },
  { path: 'accessibility',          element: <W C={Accessibility} /> },
  { path: 'testing',               element: <W C={Testing} /> },
  { path: 'documentation',          element: <W C={Documentation} /> },
];
