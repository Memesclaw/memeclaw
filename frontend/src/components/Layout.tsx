import { Link, useLocation } from 'react-router-dom'
import { MessageSquare, Wrench, Settings, Home } from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
  isConnected: boolean
}

export default function Layout({ children, isConnected }: LayoutProps) {
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/chat', label: 'Chat', icon: MessageSquare },
    { path: '/skills', label: 'Skills', icon: Wrench },
    { path: '/settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-800/50 backdrop-blur-sm border-r border-slate-700/50 p-4 flex flex-col">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-500/20">
            <span className="text-2xl">🦞</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">MemeClaw</h1>
            <p className="text-xs text-amber-400 font-medium">BNB Chain AI Agent</p>
          </div>
        </div>

        {/* Connection Status */}
        <div className="mb-6 px-2">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
            isConnected ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
            <span className="text-sm font-medium">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-yellow-600 to-amber-600 text-white shadow-lg shadow-yellow-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="mt-auto pt-6 border-t border-slate-700/50">
          <div className="text-center space-y-1">
            <p className="text-xs text-slate-500">MemeClaw v1.0.0</p>
            <p className="text-xs text-slate-600">OpenClaw Architecture</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
