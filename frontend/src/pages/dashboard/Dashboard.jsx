/**
 * WHAT THIS FILE DOES
 * -------------------
 * This is the dashboard "front door". After login, every user lands here,
 * and this file picks the right home screen for their role:
 *
 *   - Super Admin              → system overview
 *   - Pastor / First Elder / Elder / Board Member → ministry overview
 *   - Treasurer              → church finances overview
 *   - Department leaders     → department overview
 *   - Member / Child         → simple personal home
 *
 * It keeps the experience simple: members see only what matters to them;
 * leaders see the tools they need.
 *
 * FILES IT TALKS TO
 * -----------------
 * - AuthContext.jsx            → reads user.roles
 * - MemberDashboard.jsx        → default simple home
 * - DepartmentHeadDashboard.jsx → department leaders
 * - TreasurerDashboard.jsx     → finance officer
 * - PastorDashboard.jsx        → pastoral / board leadership
 * - SuperAdminDashboard.jsx    → platform admin
 * - hooks/useChurchBranding.js → church name for welcome text
 */

import { useAuth } from '../../contexts/AuthContext'
import { useChurchBranding } from '../../hooks/useChurchBranding'
import { FullPageLoading } from '../../components/common/Loading'
import SuperAdminDashboard from './SuperAdminDashboard'
import PastorDashboard from './PastorDashboard'
import DepartmentHeadDashboard from './DepartmentHeadDashboard'
import CollectorDashboard from './CollectorDashboard'
import TreasurerDashboard from './TreasurerDashboard'
import MemberDashboard from './MemberDashboard'
import '../../styles/dashboard.css'

const Dashboard = () => {
  const { user, loading } = useAuth()
  const { churchName } = useChurchBranding()

  if (loading) {
    return <FullPageLoading message="Loading dashboard..." />
  }

  const userRoles = user?.roles || []
  const hasRole = (names) => names.some(r => userRoles.includes(r))

  // Pick the most specific dashboard first. Members/children fall through to
  // the simple MemberDashboard.
  let View = MemberDashboard
  if (hasRole(['Super Admin'])) {
    View = SuperAdminDashboard
  } else if (hasRole(['Treasurer'])) {
    View = TreasurerDashboard
  } else if (hasRole(['Pastor', 'First Elder', 'Elder', 'Church Board Member'])) {
    View = PastorDashboard
  } else if (hasRole(['Subcommittee Collector'])) {
    View = CollectorDashboard
  } else if (hasRole([
    'Department Head',
    'Assistant Department Head',
    'Subcommittee Head',
    'Deacon',
    'Deaconess'
  ])) {
    View = DepartmentHeadDashboard
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Home</h1>
          <p className="page-subtitle">
            Welcome back, {user?.first_name}! Here&rsquo;s what&rsquo;s happening at {churchName} today.
          </p>
        </div>
      </div>
      <View />
    </div>
  )
}

export default Dashboard
