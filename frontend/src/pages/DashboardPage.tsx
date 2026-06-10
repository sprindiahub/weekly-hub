import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, FileText, ImageIcon, TrendingUp, ChevronRight, Download, Eye, FilePlus2, Clock, Send } from 'lucide-react'
import api from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { formatDate, getNearestPastSaturday, toISODate, getStatusColor } from '@/lib/utils'
import { PageLoader, SkeletonCard } from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import type { WeeklyReport } from '@/types'
import toast from 'react-hot-toast'

// ── Stat card ─────────────────────────────────────────────────────────────
function StatCard({ value, label, icon: Icon, color, borderColor }: {
  value: number | string; label: string; icon: any; color: string; borderColor: string
}) {
  return (
    <div className="stat-card" style={{ borderTop: `3px solid ${borderColor}` }}>
      <div className="flex-1">
        <div className="font-display text-4xl mb-0.5 animate-fade-in"
             style={{ color: borderColor }}>
          {value}
        </div>
        <div className="text-xs font-bold uppercase tracking-widest" style={{ color: '#a89f98' }}>
          {label}
        </div>
      </div>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
           style={{ background: color }}>
        <Icon className="w-5 h-5" style={{ color: borderColor }} />
      </div>
    </div>
  )
}

// ── Report card ───────────────────────────────────────────────────────────
function ReportCard({ report }: { report: WeeklyReport }) {
  const navigate = useNavigate()
  const isPublished = report.status === 'published'

  const handlePDF = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const res = await api.get(`/reports/${report.id}/pdf`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url; a.download = `SPR_Report_${report.weekend_date}.pdf`
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch { toast.error('Failed to generate PDF') }
  }

  return (
    <div className="card-hover p-5 group" onClick={() => navigate(`/reports/${report.id}`)}>
      {/* Top row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          {/* Date — display font */}
          <div className="font-display text-lg leading-tight mb-1.5"
               style={{ color: '#1a1512' }}>
            {formatDate(report.weekend_date, 'dd MMMM yyyy')}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`badge ${isPublished ? 'badge-green' : 'badge-amber'}`}>
              {isPublished ? '● Submitted' : '○ In Progress'}
            </span>
            <span className="text-xs font-medium" style={{ color: '#a89f98' }}>
              {report.department?.name}
            </span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 flex-shrink-0 mt-1 transition-all duration-200
                                  group-hover:translate-x-1"
                      style={{ color: '#d4cec8' }} />
      </div>

      {/* Counts */}
      <div className="flex gap-2 mb-4">
        {[
          { icon: FileText,   val: report.notes.length,  label: 'item' },
          { icon: ImageIcon,  val: report.images.length, label: 'doc' },
        ].map(({ icon: Icon, val, label }) => (
          <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
               style={{ background: '#faf9f8', border: '1px solid #ece8e5' }}>
            <Icon className="w-3 h-3" style={{ color: '#a89f98' }} />
            <span className="text-xs font-bold" style={{ color: '#5c544e' }}>
              {val} {label}{val !== 1 ? 's' : ''}
            </span>
          </div>
        ))}
      </div>

      {/* Preview text */}
      {report.notes[0] && (
        <p className="text-xs leading-relaxed mb-4 line-clamp-2 italic px-3 py-2.5 rounded-lg"
           style={{ color: '#7a7068', background: '#faf9f8', borderLeft: '2px solid #ece8e5' }}>
          {report.notes[0].content}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2" onClick={e => e.stopPropagation()}>
        <button
          onClick={() => navigate(`/reports/${report.id}`)}
          className="btn btn-secondary btn-sm flex-1"
        >
          <Eye className="w-3.5 h-3.5" /> View Report
        </button>
        <button onClick={handlePDF} className="btn btn-secondary btn-sm" title="Export PDF">
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth()
  const thisSat = toISODate(getNearestPastSaturday())

  const { data: reports = [], isLoading } = useQuery<WeeklyReport[]>({
    queryKey: ['reports'],
    queryFn: () => api.get('/reports').then(r => r.data),
  })

  const totalNotes  = reports.reduce((s, r) => s + r.notes.length,  0)
  const totalImages = reports.reduce((s, r) => s + r.images.length, 0)
  const published   = reports.filter(r => r.status === 'published').length
  const thisWeek    = reports.find(r => r.weekend_date === thisSat)

  return (
    <div className="space-y-8 page-enter">

      {/* ── Welcome Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] mb-2"
             style={{ color: '#c9a84c' }}>
            Weekly Activity Report System
          </p>
          <h1 className="font-display text-4xl sm:text-5xl mb-2" style={{ color: '#1a1512' }}>
            Welcome, {user?.username?.split(' ')[0]}
          </h1>
          <p className="text-sm font-medium" style={{ color: '#7a7068' }}>
            {user?.department?.name
              ? `${user.department.name} Department — SPR India`
              : 'System Administrator — SPR India'}
          </p>
        </div>
        <Link to="/reports/new" className="btn btn-primary btn-lg flex-shrink-0">
          <FilePlus2 className="w-5 h-5" />
          Create New Report
        </Link>
      </div>

      {/* ── This Week's Report Banner ───────────────────────────────── */}
      <div className="rounded-2xl p-6 flex items-center justify-between gap-4 flex-wrap relative overflow-hidden"
           style={{
             background: 'linear-gradient(135deg, #3d0b2d 0%, #4d0e38 55%, #5c1448 100%)',
           }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
             style={{
               backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,1) 0, rgba(255,255,255,1) 1px, transparent 0, transparent 50%)',
               backgroundSize: '8px 8px',
             }} />
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
               style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.25)' }}>
            <Clock className="w-6 h-6" style={{ color: '#c9a84c' }} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-1"
               style={{ color: 'rgba(201,168,76,0.7)' }}>
              Current Week Ending
            </p>
            <p className="font-display text-xl text-white">
              {formatDate(thisSat, 'dd MMMM yyyy')}
            </p>
          </div>
        </div>
        <div className="relative">
          {thisWeek ? (
            <Link to={`/reports/${thisWeek.id}`}
                  className="btn btn-gold btn-lg">
              <Send className="w-4 h-4" />
              Open This Week's Report
            </Link>
          ) : (
            <Link to={`/reports/new?date=${thisSat}`}
                  className="btn"
                  style={{
                    background: 'rgba(255,255,255,0.95)',
                    color: '#4d0e38',
                    fontWeight: 800,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.20)',
                  }}>
              <Plus className="w-4 h-4" />
              Begin This Week's Report
            </Link>
          )}
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 stagger">
        <StatCard value={reports.length} label="Total Reports"    icon={FileText}   color="rgba(77,14,56,0.08)"  borderColor="#4d0e38" />
        <StatCard value={totalNotes}     label="Activity Items"   icon={FileText}   color="rgba(34,197,94,0.1)"  borderColor="#15803d" />
        <StatCard value={totalImages}    label="Documents Filed"  icon={ImageIcon}  color="rgba(124,58,237,0.1)" borderColor="#7c3aed" />
        <StatCard value={published}      label="Submitted Reports"icon={TrendingUp} color="rgba(201,168,76,0.1)" borderColor="#c9a84c" />
      </div>

      {/* ── Recent Reports ──────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-display text-2xl" style={{ color: '#1a1512' }}>Recent Reports</h2>
            <p className="text-xs font-medium mt-0.5" style={{ color: '#a89f98' }}>
              Your most recently created activity reports
            </p>
          </div>
          <Link to="/history"
                className="btn btn-secondary btn-sm group">
            View Archive
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1,2,3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : reports.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No reports filed yet"
            description="Create your first weekly activity report to begin tracking departmental progress."
            action={
              <Link to="/reports/new" className="btn btn-primary btn-lg">
                <FilePlus2 className="w-5 h-5" /> Create First Report
              </Link>
            }
          />
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 stagger">
            {reports.slice(0, 6).map(r => <ReportCard key={r.id} report={r} />)}
          </div>
        )}
      </div>
    </div>
  )
}
