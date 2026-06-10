import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Users, FileText, ImageIcon, ChevronRight, Calendar,
  Building2, User, Eye, Layers,
} from 'lucide-react'
import api from '@/lib/api'
import { formatDate, formatDateTime } from '@/lib/utils'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import CombinedDownloadModal from '@/components/CombinedDownloadModal'
import type { WeeklyReport } from '@/types'

export default function SharedWithMePage() {
  const [showCombined, setShowCombined] = useState(false)

  const { data: reports = [], isLoading } = useQuery<WeeklyReport[]>({
    queryKey: ['shared-with-me'],
    queryFn: () => api.get('/reports/shared-with-me').then(r => r.data),
  })

  return (
    <div className="space-y-7 page-enter">

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Shared With Me</h1>
          <p className="page-subtitle">
            Reports that other team members have shared with you
          </p>
        </div>
        {reports.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCombined(true)}
              className="btn btn-secondary btn-sm"
              title="Download shared reports as a combined PDF"
            >
              <Layers className="w-3.5 h-3.5" /> Combined PDF
            </button>
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
              style={{ background: 'rgba(77,14,56,0.07)', color: '#4d0e38', border: '1px solid rgba(77,14,56,0.12)' }}
            >
              <Users className="w-4 h-4" />
              {reports.length} shared
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <PageLoader />
      ) : reports.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No reports shared yet"
          description="When a colleague shares a weekly activity report with you, it will appear here. You'll be able to view, annotate, and respond to shared reports."
        />
      ) : (
        <div className="grid gap-4">
          {reports.map(report => {
            const noteCount  = report.notes.length
            const imageCount = report.images.length
            return (
              <Link
                key={report.id}
                to={`/reports/${report.id}`}
                className="card p-5 flex items-start gap-5 group transition-all duration-200"
                style={{ textDecoration: 'none' }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(77,14,56,0.25)'
                  e.currentTarget.style.boxShadow   = '0 4px 20px rgba(77,14,56,0.09)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = ''
                  e.currentTarget.style.boxShadow   = ''
                }}
              >
                {/* Left: status stripe */}
                <div
                  className="w-1 self-stretch rounded-full flex-shrink-0"
                  style={{ background: report.status === 'published' ? '#22c55e' : '#f59e0b', minHeight: 48 }}
                />

                {/* Main content */}
                <div className="flex-1 min-w-0">

                  {/* Row 1: date + status badge */}
                  <div className="flex items-center gap-3 flex-wrap mb-1">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" style={{ color: '#a89f98' }} />
                      <span className="font-bold text-sm" style={{ color: '#1a1512' }}>
                        {formatDate(report.weekend_date, 'dd MMMM yyyy')}
                      </span>
                    </div>
                    <span
                      className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                      style={{
                        background: report.status === 'published' ? 'rgba(22,163,74,0.10)' : 'rgba(245,158,11,0.10)',
                        color:      report.status === 'published' ? '#15803d'              : '#92400e',
                      }}
                    >
                      {report.status === 'published' ? '● Shared' : '○ Local'}
                    </span>
                  </div>

                  {/* Row 2: who shared + department */}
                  <div className="flex items-center gap-4 flex-wrap mb-3">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" style={{ color: '#c9a84c' }} />
                      <span className="text-xs font-semibold" style={{ color: '#5c544e' }}>
                        Shared by{' '}
                        <span style={{ color: '#4d0e38', fontWeight: 700 }}>
                          {report.user?.username ?? 'Unknown'}
                        </span>
                      </span>
                    </div>
                    {report.department && (
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5" style={{ color: '#a89f98' }} />
                        <span className="text-xs font-medium" style={{ color: '#7a7068' }}>
                          {report.department.name}
                        </span>
                        <span
                          className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(77,14,56,0.07)', color: '#4d0e38' }}
                        >
                          {report.department.short_code}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Row 3: preview of first note */}
                  {noteCount > 0 && (
                    <p
                      className="text-xs leading-relaxed mb-3 line-clamp-2"
                      style={{ color: '#7a7068' }}
                    >
                      {report.notes[0].content}
                      {noteCount > 1 && (
                        <span style={{ color: '#a89f98' }}>
                          {' '}+{noteCount - 1} more item{noteCount - 1 !== 1 ? 's' : ''}
                        </span>
                      )}
                    </p>
                  )}

                  {/* Row 4: stats */}
                  <div className="flex items-center gap-3">
                    <div
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                      style={{ background: '#faf9f8', border: '1px solid #ece8e5' }}
                    >
                      <FileText className="w-3 h-3" style={{ color: '#4d0e38' }} />
                      <span className="text-xs font-bold" style={{ color: '#5c544e' }}>
                        {noteCount} item{noteCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {imageCount > 0 && (
                      <div
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                        style={{ background: '#faf9f8', border: '1px solid #ece8e5' }}
                      >
                        <ImageIcon className="w-3 h-3" style={{ color: '#7c3aed' }} />
                        <span className="text-xs font-bold" style={{ color: '#5c544e' }}>
                          {imageCount} attachment{imageCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                    <div className="text-xs font-medium" style={{ color: '#a89f98' }}>
                      Updated {formatDateTime(report.updated_at)}
                    </div>
                  </div>
                </div>

                {/* Right: view arrow */}
                <div className="flex flex-col items-center justify-center gap-1.5 flex-shrink-0 pl-2">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-200"
                    style={{ background: 'rgba(77,14,56,0.06)' }}
                  >
                    <Eye className="w-4 h-4" style={{ color: '#4d0e38' }} />
                  </div>
                  <ChevronRight
                    className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
                    style={{ color: '#d4cec8' }}
                  />
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {showCombined && (
        <CombinedDownloadModal
          initialIds={reports.map(r => r.id)}
          onClose={() => setShowCombined(false)}
        />
      )}
    </div>
  )
}
