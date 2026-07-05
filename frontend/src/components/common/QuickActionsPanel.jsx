import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const QuickActionsPanel = ({ actions, title = "Quick Actions" }) => {
  const { user } = useAuth()
  
  // Filter actions based on permissions
  const filteredActions = actions.filter(action => {
    if (!action.permission) return true
    return user?.permissions?.includes(action.permission)
  })

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredActions.map((action, index) => (
          <Link
            key={index}
            to={action.link}
            className="flex items-center gap-4 p-4 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] hover:shadow-md transition-shadow"
            aria-label={`${action.title}: ${action.description}`}
          >
            <div className={`p-3 rounded-lg ${action.color}`}>
              <action.icon className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-[var(--color-text)]">{action.title}</h3>
              <p className="text-sm text-[var(--color-textSecondary)]">{action.description}</p>
            </div>
            {action.badge && (
              <span className="px-2 py-1 bg-red-100 text-red-600 text-xs font-medium rounded-full">
                {action.badge}
              </span>
            )}
            <ArrowRight className="h-5 w-5 text-[var(--color-textSecondary)] ml-auto" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </div>
  )
}

export default QuickActionsPanel
