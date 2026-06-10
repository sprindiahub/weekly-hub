import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, ChevronDown, ChevronRight, FilePlus2, Clock, ArrowRight, Archive } from 'lucide-react'
import api from '@/lib/api'
import { getNextSaturday, getUpcomingSaturdays, toISODate, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { WeeklyReport } from '@/types'

export default function NewReportPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const qc = useQueryClient()

  const defaultDate = searchParams.get('date') || toISODate(getNextSaturday())
  const [selectedDate, setSelectedDate] = useState(defaultDate)
  const [showPicker, setShowPicker]     = useState(false)
  const [status, setStatus]             = useState<'draft' | 'published'>('draft')

  const upcomingSaturdays = getUpcomingSaturdays(8)

  const { data: pastReports = [] } = useQuery<WeeklyReport[]>({
    queryKey: ['reports', 'recent'],
    queryFn: () => api.get('/reports?limit=5').then(r => r.data),
  })

  const { mutate, isPending } = useMutation({
    mutationFn: (data: { weekend_date: string; status: string }) =>
      api.post('/reports', data).then(r => r.data),
    onSuccess: (report) => {
      qc.invalidateQueries({ queryKey: ['reports'] })
      toast.success('Report created — begin adding your activity items.')
      navigate(`/reports/${report.id}`)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Unable to create report. Please try again.')
    },
  })

  const nextSatIso = toISODate(getNextSaturday())

  const weekLabel = (iso: string) => {
    if (iso === nextSatIso) return 'This coming Saturday'
    const diff = Math.round(
      (new Date(iso).getTime() - new Date(nextSatIso).getTime()) / (7 * 24 * 60 * 60 * 1000)
    )
    if (diff === 1) return '1 week from now'
    return `${diff} weeks from now`
  }

  return (
    <div className="page-enter">

      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">New Activity Report</h1>
          <p className="page-subtitle">
            Select an upcoming reporting period and begin documenting activities
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6 items-start">
        {/* ── Create Form ─────────────────────────────────────────── */}
        <div className="lg:col-span-3 card p-7">
          <div className="flex items-center gap-3 mb-7 pb-5"
               style={{ borderBottom: '1px solid #ece8e5' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: 'rgba(77,14,56,0.08)' }}>
              <FilePlus2 className="w-5 h-5" style={{ color: '#4d0e38' }} />
            </div>
            <div>
              <h2 className="font-display text-xl" style={{ color: '#1a1512' }}>Report Details</h2>
              <p className="text-xs font-medium" style={{ color: '#a89f98' }}>Configure the reporting period and initial status</p>
            </div>
          </div>

          <form onSubmit={e => { e.preventDefault(); mutate({ weekend_date: selectedDate, status }) }}
                className="space-y-6">

            {/* Date picker */}
            <div>
              <label className="label">Reporting Period (Week Ending)</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowPicker(!showPicker)}
                  className="input flex items-center justify-between text-left cursor-pointer"
                  style={{ height: 'auto', paddingTop: '0.75rem', paddingBottom: '0.75rem' }}
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: '#4d0e38' }} />
                    <div>
                      <div className="font-bold text-sm" style={{ color: '#1a1512' }}>
                        {formatDate(selectedDate, 'EEEE, dd MMMM yyyy')}
                      </div>
                      <div className="text-xs font-medium mt-0.5" style={{ color: '#a89f98' }}>
                        {weekLabel(selectedDate)}
                      </div>
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${showPicker ? 'rotate-180' : ''}`}
                               style={{ color: '#a89f98' }} />
                </button>

                {showPicker && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 z-10 rounded-xl overflow-hidden animate-slide-up"
                       style={{ background: '#fff', border: '1px solid #ece8e5', boxShadow: '0 8px 32px rgba(77,14,56,0.15)' }}>
                    {upcomingSaturdays.map((sat, idx) => {
                      const iso = toISODate(sat)
                      const sel = iso === selectedDate
                      return (
                        <button
                          key={iso}
                          type="button"
                          onClick={() => { setSelectedDate(iso); setShowPicker(false) }}
                          className="w-full flex items-center justify-between px-5 py-3.5 text-sm transition-colors"
                          style={{
                            background:  sel ? 'rgba(77,14,56,0.05)' : 'transparent',
                            borderBottom: idx < upcomingSaturdays.length - 1 ? '1px solid #f0ece8' : 'none',
                          }}
                          onMouseEnter={e => { if (!sel) e.currentTarget.style.background = '#faf9f8' }}
                          onMouseLeave={e => { if (!sel) e.currentTarget.style.background = 'transparent' }}
                        >
                          <span className="font-bold" style={{ color: sel ? '#4d0e38' : '#1a1512' }}>
                            {formatDate(iso, 'EEEE, dd MMMM yyyy')}
                          </span>
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                                style={{
                                  background: sel ? 'rgba(77,14,56,0.1)' : '#f4f2f0',
                                  color:      sel ? '#4d0e38'            : '#7a7068',
                                }}>
                            {weekLabel(iso)}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
              <p className="flex items-center gap-1.5 text-xs font-medium mt-2" style={{ color: '#a89f98' }}>
                <Clock className="w-3.5 h-3.5" />
                Only upcoming Saturdays are valid reporting period end dates
              </p>
            </div>

            {/* Status */}
            <div>
              <label className="label">Initial Publication Status</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    key: 'draft' as const,
                    title: 'Save as Draft',
                    desc: 'Visible only to you — continue editing before submitting',
                    emoji: '✎',
                  },
                  {
                    key: 'published' as const,
                    title: 'Submit Immediately',
                    desc: 'Visible to all departments — ready for consolidation & distribution',
                    emoji: '✓',
                  },
                ].map(({ key, title, desc, emoji }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStatus(key)}
                    className="p-4 rounded-xl text-left transition-all duration-200"
                    style={{
                      border: `2px solid ${status === key ? '#4d0e38' : '#ece8e5'}`,
                      background: status === key ? 'rgba(77,14,56,0.04)' : '#ffffff',
                      transform: status === key ? 'scale(1.01)' : 'scale(1)',
                    }}
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <span className="text-lg">{emoji}</span>
                      <span className="font-bold text-sm" style={{ color: status === key ? '#4d0e38' : '#1a1512' }}>
                        {title}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: '#7a7068' }}>{desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary btn-lg w-full group"
            >
              {isPending ? (
                <span className="btn-spinner" />
              ) : (
                <>
                  <FilePlus2 className="w-5 h-5" />
                  Create Report &amp; Add Activity Items
                  <ArrowRight className="w-4 h-4 ml-auto group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* ── Right Column: Past Reports + Tips ───────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Previously Filed Reports */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <Archive className="w-4 h-4" style={{ color: '#a89f98' }} />
                <h3 className="font-display text-lg" style={{ color: '#1a1512' }}>
                  Recent Reports
                </h3>
              </div>
              <Link to="/history" className="btn btn-ghost btn-sm group"
                    style={{ color: '#4d0e38' }}>
                All
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {pastReports.length === 0 ? (
              <p className="text-sm font-medium text-center py-6" style={{ color: '#d4cec8' }}>
                No reports filed yet
              </p>
            ) : (
              <div className="space-y-2">
                {pastReports.map(r => (
                  <Link
                    key={r.id}
                    to={`/reports/${r.id}`}
                    className="flex items-center gap-4 p-4 rounded-xl transition-all duration-150 group"
                    style={{ border: '1px solid #ece8e5' }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'rgba(77,14,56,0.2)'
                      e.currentTarget.style.background = '#fdf2f7'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = '#ece8e5'
                      e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0"
                         style={{ background: r.status === 'published' ? '#22c55e' : '#f59e0b' }} />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate" style={{ color: '#1a1512' }}>
                        {formatDate(r.weekend_date, 'dd MMM yyyy')}
                      </div>
                      <div className="text-xs font-medium mt-0.5" style={{ color: '#a89f98' }}>
                        {r.notes.length} item{r.notes.length !== 1 ? 's' : ''} ·{' '}
                        <span style={{ color: r.status === 'published' ? '#15803d' : '#92400e' }}>
                          {r.status === 'published' ? 'Submitted' : 'In Progress'}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 flex-shrink-0 group-hover:translate-x-1 transition-transform"
                                  style={{ color: '#d4cec8' }} />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Quick Tips */}
          <div className="card p-6" style={{ background: 'rgba(77,14,56,0.03)', border: '1px solid rgba(77,14,56,0.10)' }}>
            <h4 className="font-display text-base mb-4" style={{ color: '#4d0e38' }}>Quick Guide</h4>
            <ul className="space-y-3">
              {[
                { step: '1', text: 'Choose the upcoming Saturday as the week-end date' },
                { step: '2', text: 'Save as Draft to keep editing, or Submit to publish immediately' },
                { step: '3', text: 'Add numbered activity points and attach supporting images' },
                { step: '4', text: 'Export as PDF or send directly via email once complete' },
              ].map(({ step, text }) => (
                <li key={step} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5"
                        style={{ background: 'rgba(77,14,56,0.10)', color: '#4d0e38' }}>
                    {step}
                  </span>
                  <span className="text-xs font-medium leading-relaxed" style={{ color: '#7a7068' }}>{text}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </div>
  )
}
