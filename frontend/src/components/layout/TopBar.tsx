import { Menu, LogOut, Bell } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { format } from 'date-fns'

interface TopBarProps { onMenuClick: () => void }

export default function TopBar({ onMenuClick }: TopBarProps) {
  const { user, logout } = useAuth()
  const today   = format(new Date(), 'EEEE, dd MMMM yyyy')
  const initials = (user?.username ?? 'U').slice(0, 2).toUpperCase()

  return (
    <header
      className="relative flex-shrink-0 flex items-center justify-between px-5 sm:px-8"
      style={{
        height: '64px',
        background: '#ffffff',
        borderBottom: '1px solid #ece8e5',
        boxShadow: '0 1px 0 0 rgba(0,0,0,0.04)',
        zIndex: 10,
      }}
    >
      {/* Left */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="btn btn-icon btn-ghost lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" style={{ color: '#5c544e' }} />
        </button>

        <div>
          <h1 className="font-semibold text-sm tracking-tight hidden sm:block"
              style={{ color: '#1a1512' }}>
            Weekly Activity Report System
          </h1>
          <p className="text-xs font-medium" style={{ color: '#a89f98' }}>{today}</p>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Status pill */}
        <div className="hidden sm:flex items-center gap-2.5 px-4 py-2 rounded-lg"
             style={{ background: '#faf9f8', border: '1px solid #ece8e5' }}>
          <span className="relative flex">
            <span className="w-2 h-2 rounded-full block"
                  style={{ background: '#22c55e', animation: 'pulseRing 2s ease infinite' }} />
          </span>
          <span className="text-xs font-bold" style={{ color: '#5c544e' }}>{user?.username}</span>
          {user?.role === 'admin' && (
            <span className="badge badge-spr">Admin</span>
          )}
        </div>

        {/* Logout */}
        <div className="tooltip-wrap relative">
          <button
            onClick={logout}
            className="btn btn-icon"
            style={{ background: 'transparent', border: 'none', color: '#a89f98' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#4d0e38')}
            onMouseLeave={e => (e.currentTarget.style.color = '#a89f98')}
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4 transition-all duration-200" />
          </button>
          <span className="tooltip">Sign Out</span>
        </div>
      </div>
    </header>
  )
}
