import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, FilePlus2, Archive, Users2,
  Building2, ScrollText, X, ShieldCheck, BarChart2
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

interface SidebarProps { isOpen: boolean; onClose: () => void }

const navItems = [
  { to: '/',            icon: LayoutDashboard, label: 'Overview',       exact: true },
  { to: '/reports/new', icon: FilePlus2,       label: 'New Report' },
  { to: '/history',     icon: Archive,         label: 'Report Archive' },
]
const adminItems = [
  { to: '/admin/users',       icon: Users2,     label: 'User Management' },
  { to: '/admin/departments', icon: Building2,  label: 'Departments' },
  { to: '/admin/audit',       icon: ScrollText, label: 'Audit Trail' },
]

function NavItem({ to, icon: Icon, label, exact }: {
  to: string; icon: any; label: string; exact?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) => cn(
        'group flex items-center gap-3 px-3.5 py-2.5 rounded-lg',
        'text-sm font-semibold transition-all duration-200 ease-spring relative',
        isActive
          ? 'nav-active text-spr-700'
          : 'text-white/60 hover:text-white hover:bg-white/10'
      )}
    >
      {({ isActive }) => (
        <>
          {/* Active left bar */}
          {isActive && (
            <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-spr-700" />
          )}
          <Icon className={cn(
            'w-4 h-4 flex-shrink-0 transition-all duration-200',
            isActive ? 'text-spr-700' : 'text-white/50 group-hover:text-white group-hover:scale-110'
          )} />
          <span className="flex-1 tracking-wide">{label}</span>
          {isActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-gold-600 opacity-80" />
          )}
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth()
  const initials = (user?.username ?? 'U').slice(0, 2).toUpperCase()

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-spr-900/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex flex-col',
          'transform transition-transform duration-300 ease-spring',
          'lg:relative lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{
          width: '264px',
          background: 'linear-gradient(180deg, #3d0b2d 0%, #4d0e38 35%, #430c32 70%, #2c0820 100%)',
        }}
      >
        {/* Subtle diagonal stripe texture */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
             style={{
               backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,1) 0, rgba(255,255,255,1) 1px, transparent 0, transparent 50%)',
               backgroundSize: '8px 8px',
             }} />

        {/* ── Brand / Logo ──────────────────────────────────── */}
        <div className="relative flex items-center justify-between h-16 px-5"
             style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: 'rgba(201,168,76,0.18)', border: '1px solid rgba(201,168,76,0.35)' }}>
              <BarChart2 className="w-5 h-5" style={{ color: '#c9a84c' }} />
            </div>
            <div>
              <div className="text-white font-display text-base leading-tight tracking-tight">
                SPR India
              </div>
              <div className="text-[10px] font-semibold tracking-[0.12em] uppercase"
                   style={{ color: 'rgba(201,168,76,0.7)' }}>
                Activity Reports
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden w-7 h-7 flex items-center justify-center rounded-lg
                       text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Navigation ────────────────────────────────────── */}
        <nav className="relative flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="section-label" style={{ color: 'rgba(255,255,255,0.25)' }}>Navigation</p>
          {navItems.map(item => <NavItem key={item.to} {...item} />)}

          {user?.role === 'admin' && (
            <>
              <div className="my-3.5 mx-1" style={{ height: '1px', background: 'rgba(255,255,255,0.07)' }} />
              <p className="section-label flex items-center gap-1.5"
                 style={{ color: 'rgba(255,255,255,0.25)' }}>
                <ShieldCheck className="w-2.5 h-2.5" />
                Administration
              </p>
              {adminItems.map(item => <NavItem key={item.to} {...item} />)}
            </>
          )}
        </nav>

        {/* ── User Panel ────────────────────────────────────── */}
        <div className="relative px-3 pb-4 pt-3"
             style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-3 p-3 rounded-xl"
               style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {/* Avatar */}
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold"
                 style={{ background: 'rgba(201,168,76,0.2)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.3)' }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white truncate leading-tight">
                {user?.username}
              </div>
              <div className="text-[11px] font-medium truncate mt-0.5"
                   style={{ color: 'rgba(255,255,255,0.4)' }}>
                {user?.department?.name ?? (user?.role === 'admin' ? 'System Administrator' : 'Department Staff')}
              </div>
            </div>
            {user?.role === 'admin' && (
              <div className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
                   style={{ background: 'rgba(201,168,76,0.2)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.3)' }}>
                Admin
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
