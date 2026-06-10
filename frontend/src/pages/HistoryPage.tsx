import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Search, Download, Eye, FileText, ImageIcon, ChevronRight, X, SlidersHorizontal, Trash2 } from 'lucide-react'
import api from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { formatDate, formatDateTime } from '@/lib/utils'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import type { WeeklyReport, Department } from '@/types'
import toast from 'react-hot-toast'

export default function HistoryPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [search, setSearch]           = useState('')
  const [deptFilter, setDeptFilter]   = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [fromDate, setFromDate]         = useState('')
  const [toDate, setToDate]             = useState('')
  const [deleteTarget, setDeleteTarget] = useState<WeeklyReport | null>(null)

  const { data: reports = [], isLoading } = useQuery<WeeklyReport[]>({
    queryKey: ['reports', deptFilter, fromDate, toDate, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams()
      if (deptFilter)   params.append('department_id', deptFilter)
      if (fromDate)     params.append('from_date', fromDate)
      if (toDate)       params.append('to_date', toDate)
      if (statusFilter) params.append('status', statusFilter)
      return api.get(`/reports?${params}`).then(r => r.data)
    },
  })

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments').then(r => r.data),
    enabled: user?.role === 'admin',
  })

  const filtered = reports.filter(r => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      r.weekend_date.includes(s) ||
      r.department?.name.toLowerCase().includes(s) ||
      r.notes.some(n => n.content.toLowerCase().includes(s))
    )
  })

  const handlePDF = async (reportId: number, date: string) => {
    try {
      const res = await api.get(`/reports/${reportId}/pdf`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a'); a.href = url
      a.download = `SPR_Report_${date}.pdf`
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch { toast.error('PDF generation failed') }
  }

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/reports/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reports'] })
      setDeleteTarget(null)
      toast.success('Report permanently deleted')
    },
    onError: () => toast.error('Failed to delete report'),
  })

  const clearFilters = () => { setSearch(''); setDeptFilter(''); setStatusFilter(''); setFromDate(''); setToDate('') }
  const hasFilters   = !!(search || deptFilter || statusFilter || fromDate || toDate)

  return (
    <div className="space-y-7 page-enter">

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Report Archive</h1>
          <p className="page-subtitle">
            {filtered.length} report{filtered.length !== 1 ? 's' : ''} on record
            {hasFilters && ' (filtered)'}
          </p>
        </div>
        {hasFilters && (
          <button onClick={clearFilters} className="btn btn-ghost btn-sm"
                  style={{ color: '#dc2626' }}>
            <X className="w-3.5 h-3.5" /> Clear All Filters
          </button>
        )}
      </div>

      {/* Filter Panel */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <SlidersHorizontal className="w-4 h-4" style={{ color: '#4d0e38' }} />
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: '#4d0e38' }}>
            Filter Records
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                    style={{ color: '#a89f98' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search activity content…"
              className="input pl-9"
            />
          </div>

          {user?.role === 'admin' && (
            <select
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              className="input"
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}

          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input">
            <option value="">All Statuses</option>
            <option value="draft">In Progress (Draft)</option>
            <option value="published">Submitted (Published)</option>
          </select>

          <div className="flex gap-2">
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                   className="input text-xs flex-1" title="From date" />
            <input type="date" value={toDate}   onChange={e => setToDate(e.target.value)}
                   className="input text-xs flex-1" title="To date" />
          </div>
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No reports found"
          description={hasFilters
            ? 'No records match the current filter criteria. Try adjusting your search.'
            : 'No activity reports have been filed yet.'}
          action={!hasFilters
            ? <Link to="/reports/new" className="btn btn-primary btn-lg">Create First Report</Link>
            : undefined}
        />
      ) : (
        <div className="card overflow-hidden">

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reporting Period</th>
                  <th>Department</th>
                  <th>Activity Items</th>
                  <th>Status</th>
                  <th>Last Modified</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const isPublished = r.status === 'published'
                  return (
                    <tr key={r.id} className="animate-fade-in">
                      <td>
                        <div className="font-bold" style={{ color: '#1a1512' }}>
                          {formatDate(r.weekend_date, 'dd MMMM yyyy')}
                        </div>
                        <div className="text-xs font-medium mt-0.5" style={{ color: '#a89f98' }}>
                          Week ending · by {r.user?.username}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="badge badge-spr text-[10px]">{r.department?.short_code}</span>
                          <span className="text-sm" style={{ color: '#5c544e' }}>{r.department?.name}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                               style={{ background: '#faf9f8', border: '1px solid #ece8e5' }}>
                            <FileText className="w-3 h-3" style={{ color: '#4d0e38' }} />
                            <span className="text-xs font-bold" style={{ color: '#5c544e' }}>
                              {r.notes.length}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                               style={{ background: '#faf9f8', border: '1px solid #ece8e5' }}>
                            <ImageIcon className="w-3 h-3" style={{ color: '#7c3aed' }} />
                            <span className="text-xs font-bold" style={{ color: '#5c544e' }}>
                              {r.images.length}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${isPublished ? 'badge-green' : 'badge-amber'}`}>
                          {isPublished ? '● Submitted' : '○ In Progress'}
                        </span>
                      </td>
                      <td>
                        <div className="text-sm" style={{ color: '#5c544e' }}>
                          {formatDateTime(r.updated_at)}
                        </div>
                      </td>
                      <td>
                        <div className="flex gap-1.5 justify-end">
                          <Link to={`/reports/${r.id}`} className="btn btn-secondary btn-sm">
                            <Eye className="w-3.5 h-3.5" /> View
                          </Link>
                          <button
                            onClick={() => handlePDF(r.id, r.weekend_date)}
                            className="btn btn-secondary btn-sm"
                            title="Export PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(r)}
                            className="btn btn-ghost btn-sm"
                            style={{ color: '#dc2626' }}
                            title="Delete report"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <div className="sm:hidden divide-y" style={{ borderColor: '#f0ece8' }}>
            {filtered.map(r => (
              <Link key={r.id} to={`/reports/${r.id}`}
                    className="flex items-center gap-4 p-4 hover:bg-warm-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm" style={{ color: '#1a1512' }}>
                      {formatDate(r.weekend_date)}
                    </span>
                    <span className={`badge ${r.status === 'published' ? 'badge-green' : 'badge-amber'}`}>
                      {r.status === 'published' ? 'Submitted' : 'In Progress'}
                    </span>
                  </div>
                  <div className="text-xs font-medium mt-0.5" style={{ color: '#a89f98' }}>
                    {r.department?.name} · {r.notes.length} items
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: '#d4cec8' }} />
              </Link>
            ))}
          </div>
        </div>
      )}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Report"
        message={`Permanently delete the report for the week ending ${deleteTarget ? formatDate(deleteTarget.weekend_date, 'dd MMMM yyyy') : ''}? All activity items and attachments will be removed. This cannot be undone.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        confirmLabel="Delete Report"
        danger
      />
    </div>
  )
}
