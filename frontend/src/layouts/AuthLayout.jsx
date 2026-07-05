import { Outlet } from 'react-router-dom'
import { Church } from 'lucide-react'
import { useColorPalette } from '../contexts/ColorPaletteContext'

const AuthLayout = () => {
  const { colors } = useColorPalette()

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.background }}>
      <div className="flex min-h-screen">
        {/* Left side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 church-gradient items-center justify-center p-12">
          <div className="max-w-md text-center text-white">
            <div className="flex justify-center mb-8">
              <Church className="h-16 w-16" />
            </div>
            <h1 className="text-4xl font-bold mb-6">
              SDA Church Kiserian Main
            </h1>
            <p className="text-xl mb-8" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
              Welcome to our digital community platform
            </p>
            <div className="space-y-4 text-left rounded-lg p-6" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)' }}>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'white' }}></div>
                <span>Access member-only announcements</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'white' }}></div>
                <span>Make secure online payments</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'white' }}></div>
                <span>Connect with your departments</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'white' }}></div>
                <span>Manage church activities</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Auth Forms */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthLayout
