/**
 * CombinedDownloadModal
 * Lets the user select multiple reports (own + shared) and download them
 * as a single merged PDF.
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  X, Download, FileText, CheckSquare, Square, ImageIcon,
  Building2, Calendar, Users, Layers, Search, Info,
} from 'lucide-react'
import api from '@/lib/api'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { WeeklyReport } from '@/types'

interface Props {
  /** Pre-selected report IDs (e.g. the report currently open) */
  initialIds?: number[]
  onClose: () => void
}

export default function CombinedDownloadModal({ initialIds = [], onClose }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set(initialIds))
  const [search, setSearch] = useState('')
  const [downloading, setDownloading] = useState(false)

  // Own reports
  const { data: ownReports = [] } = useQuery<WeeklyReport[]>({
    queryKey: ['reports'],
    queryFn: () => api.get('/reports?limit=50').then(r => r.data),
  })

  // Shared-with-me reports
  const { data: sharedReports = [] } = useQuery<WeeklyReport[]>({
    queryKey: ['shared-with-me'],
    queryFn: () => api.get('/reports/shared-with-me').then(r => r.data),
  })

  // Merge and deduplicate
  const allReports: WeeklyReport[] = []
  const seen = new Set<number>()
  for (const r of [...ownReports, ...sharedReports]) {
    if (!seen.has(r.id)) { seen.add(r.id); allReports.push(r) }
  }
  allReports.sort((a, b) => b.weekend_date.localeCompare(a.weekend_date))

  // Filter by search
  const filtered = allReports.filter(r => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      r.weekend_date.includes(q) ||
      (r.department?.name ?? '').toLowerCase().includes(q) ||
      (r.user?.username ?? '').toLowerCase().includes(q)
    )
  })

  const toggle = (id: number) =>
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(r => r.id)))
    }
  }

  const handleDownload = async () => {
    if (selected.size === 0) {
      toast.error('Select at least one report')
      return
    }
    setDownloading(true)
    try {
      const res = await api.post(
        '/reports/combined-pdf',
        { report_ids: Array.from(selected) },
        { responseType: 'blob' },
      )
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `SPR_Combined_Report_${selected.size}_reports.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`Combined PDF with ${selected.size} report(s) downloaded`)
      onClose()
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Failed to generate combined PDF')
    } finally {
      setDownloading(false)
    }
  }

  const isShared = (r: WeeklyReport) => sharedReports.some(s => s.id === r.id)
  const allFilteredSelected = filtered.length > 0 && filtered.every(r => selected.has(r.id))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,8,32,0.55)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-white w-full flex flex-col animate-scale-in"
        style={{
          maxWidth: 560,
          borderRadius: '1.25rem',
          boxShadow: '0 32px 80px rgba(77,14,56,0.24), 0 8px 24px rgba(0,0,0,0.10)',
          border: '1px solid rgba(77,14,56,0.10)',
          maxHeight: 'calc(100vh - 48px)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-4 px-6 pt-6 pb-5"
          style={{ borderBottom: '1px solid #f0ece8', flexShrink: 0 }}
        >
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(77,14,56,0.08)', border: '1.5px solid rgba(77,14,56,0.12)' }}
          >
            <Layers className="w-5 h-5" style={{ color: '#4d0e38' }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-xl" style={{ color: '#1a1512' }}>
              Download Combined Report
            </h2>
            <p className="text-xs font-medium mt-0.5" style={{ color: '#a89f98' }}>
              Select multiple reports to merge into one PDF
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ color: '#a89f98', border: '1px solid #ece8e5' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f4f2f0'; e.currentTarget.style.color = '#1a1512' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#a89f98' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4" style={{ minHeight: 0 }}>

          {/* Info strip */}
          <div
            className="flex items-start gap-3 p-3.5 rounded-xl"
            style={{ background: 'rgba(77,14,56,0.04)', border: '1px solid rgba(77,14,56,0.10)' }}
          >
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#4d0e38' }} />
            <p className="text-xs font-medium leading-relaxed" style={{ color: '#5c544e' }}>
              Your own reports and reports shared with you are listed here.
              Select any combination and the PDF will include all departments in order with a table of contents.
            </p>
          </div>

          {/* Search + select-all row */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: '#a89f98' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by date, department or name…"
                className="input pl-9"
              />
            </div>
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs font-bold whitespace-nowrap px-3 py-2 rounded-lg transition-colors"
              style={{
                color: '#4d0e38',
                background: 'rgba(77,14,56,0.06)',
                border: '1px solid rgba(77,14,56,0.12)',
              }}
            >
              {allFilteredSelected ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {/* Report list */}
          {filtered.length === 0 ? (
            <div className="py-10 text-center">
              <FileText className="w-10 h-10 mx-auto mb-2" style={{ color: '#e8e4e0' }} />
              <p className="text-sm font-medium" style={{ color: '#a89f98' }}>No reports found</p>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #ece8e5' }}>
              {filtered.map((r, i) => {
                const sel = selected.has(r.id)
                const shared = isShared(r)
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggle(r.id)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors"
                    style={{
                      borderTop: i > 0 ? '1px solid #f4f2f0' : 'none',
                      background: sel ? 'rgba(77,14,56,0.04)' : 'transparent',
                    }}
                    onMouseEnter={e => { if (!sel) e.currentTarget.style.background = '#faf9f8' }}
                    onMouseLeave={e => { e.currentTarget.style.background = sel ? 'rgba(77,14,56,0.04)' : 'transparent' }}
                  >
                    {/* Checkbox */}
                    <div className="flex-shrink-0">
                      {sel
                        ? <CheckSquare className="w-4 h-4" style={{ color: '#4d0e38' }} />
                        : <Square      className="w-4 h-4" style={{ color: '#d4cec8' }} />}
                    </div>

                    {/* Status dot */}
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: r.status === 'published' ? '#22c55e' : '#f59e0b' }}
                    />

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm" style={{ color: sel ? '#4d0e38' : '#1a1512' }}>
                          {formatDate(r.weekend_date, 'dd MMM yyyy')}
                        </span>
                        {shared && (
                          <span
                            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                            style={{ background: 'rgba(201,168,76,0.12)', color: '#92400e' }}
                          >
                            <Users className="w-2.5 h-2.5" /> Shared
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1 text-xs font-medium" style={{ color: '#7a7068' }}>
                          <Building2 className="w-3 h-3" />
                          {r.department?.name ?? 'Unknown'}
                        </span>
                        {shared && (
                          <span className="text-xs font-medium" style={{ color: '#a89f98' }}>
                            by {r.user?.username}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Counts */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className="flex items-center gap-1 px-2 py-1 rounded-lg"
                           style={{ background: '#faf9f8', border: '1px solid #ece8e5' }}>
                        <FileText className="w-3 h-3" style={{ color: '#4d0e38' }} />
                        <span className="text-xs font-bold" style={{ color: '#5c544e' }}>{r.notes.length}</span>
                      </div>
                      {r.images.length > 0 && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg"
                             style={{ background: '#faf9f8', border: '1px solid #ece8e5' }}>
                          <ImageIcon className="w-3 h-3" style={{ color: '#7c3aed' }} />
                          <span className="text-xs font-bold" style={{ color: '#5c544e' }}>{r.images.length}</span>
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 pt-4 pb-6 space-y-2"
          style={{ borderTop: '1px solid #f0ece8', flexShrink: 0 }}
        >
          {/* Selection summary */}
          {selected.size > 0 && (
            <div
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl mb-1"
              style={{ background: 'rgba(77,14,56,0.05)', border: '1px solid rgba(77,14,56,0.12)' }}
            >
              <Layers className="w-3.5 h-3.5" style={{ color: '#4d0e38' }} />
              <span className="text-xs font-bold" style={{ color: '#4d0e38' }}>
                {selected.size} report{selected.size !== 1 ? 's' : ''} selected
                {' '}— combined PDF will include all departments with a table of contents
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading || selected.size === 0}
            className="btn btn-primary w-full btn-lg"
            style={selected.size === 0 ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          >
            {downloading ? (
              <><span className="btn-spinner" /> Generating PDF…</>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download Combined PDF
                {selected.size > 0 && ` (${selected.size} Report${selected.size !== 1 ? 's' : ''})`}
              </>
            )}
          </button>

          <button type="button" onClick={onClose} className="btn btn-ghost w-full text-sm"
                  style={{ color: '#a89f98' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
