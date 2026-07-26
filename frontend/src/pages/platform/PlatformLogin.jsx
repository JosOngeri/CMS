import { useState } from 'react'
import { Building, Lock, Mail, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import Card from '../../components/common/Card'
import { FullPageLoading } from '../../components/common/Loading'

const PlatformLogin = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { api } = useAuth()
  const toast = useToast()

  const handleLogin = async (e) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast.error('Please fill in all fields')
      return
    }

    try {
      setLoading(true)
      
      const response = await api.post('/api/platform/auth/login', {
        email,
        password
      })

      if (response.data.success) {
        toast.success('Platform login successful')
        navigate('/platform')
      }
    } catch (error) {
      console.error('Platform login failed:', error)
      toast.error(error.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <FullPageLoading message="Logging in..." />
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex p-4 bg-[var(--color-primary)]-100 bg-[var(--color-primary)]-900 rounded-full mb-4">
            <Building className="h-8 w-8 text-[var(--color-primary)]-600 text-[var(--color-primary)]-400" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] text-white mb-2">
            Platform Admin
          </h1>
          <p className="text-[var(--color-textSecondary)]">
            Sign in to manage your SaaS platform
          </p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] text-white mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[var(--color-textSecondary)]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] text-white placeholder-[var(--color-textSecondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  placeholder="admin@kmaincms.org"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] text-white mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[var(--color-textSecondary)]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] text-white placeholder-[var(--color-textSecondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                'Signing in...'
              ) : (
                <>
                  Sign In to Platform
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </button>
          </form>

        </Card>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/dashboard/overview')}
            className="text-sm text-[var(--color-textSecondary)] hover:text-[var(--color-primary)]"
          >
            ← Back to Church Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

export default PlatformLogin