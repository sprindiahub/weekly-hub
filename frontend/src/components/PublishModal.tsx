import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Send, X, CheckSquare, Square,
  Lock, Globe, Search, Shield, UserCheck, Users,
} from 'lucide-react'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import type { User, WeeklyReport } from '@/types'

interface Props {
  report: WeeklyReport
  onClose: () => void
  onPublished: () => void
}

export default function PublishModal({ report, onClose, onPublished }: Props) {
  const qc = useQueryClient()

  const [selectedIds, setSelectedIds] = useState<number[]>(report.shared_user_ids ?? [])
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState<'open' | 'restricted'>(
    (report.shared_user_ids ?? []).length > 0 ? 'restricted' : 'open'
  )

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ['users-shareable'],
    queryFn: () => api.get('/users/shareable').then(r => r.data),
  })

  // Exclude report owner — they always have access
  const otherUsers = allUsers.filter(u => u.id !== report.user_id && u.is_active)

  const filtered = otherUsers.filter(u => {
    const q = search.toLowerCase()
    return (
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.department?.name ?? '').toLowerCase().includes(q)
    )
  })

  const toggle = (id: number) =>
    setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  const handleModeChange = (m: 'open' | 'restricted') => {
    setMode(m)
    if (m === 'open') setSelectedIds([])
  }

  const effectiveIds = mode === 'open' ? [] : selectedIds

  const publishMutation = useMutation({
    mutationFn: () =>
      api.put(`/reports/${report.id}/shares`, {
        user_ids: effectiveIds,
        publish: true,
      }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['report', String(report.id)] })
      qc.invalidateQueries({ queryKey: ['reports'] })
      toast.success(
        mode === 'restricted' && effectiveIds.length > 0
          ? `Published — shared with ${effectiveIds.length} user${effectiveIds.length !== 1 ? 's' : ''}`
          : 'Published — visible to all users'
      )
      onPublished()
      onClose()
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to publish'),
  })

  const canPublish = mode === 'open' || selectedIds.length > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,8,32,0.55)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-white w-full animate-scale-in flex flex-col"
        style={{
          maxWidth: '480px',
          borderRadius: '1.25rem',
          boxShadow: '0 32px 80px rgba(77,14,56,0.24), 0 8px 24px rgba(0,0,0,0.10)',
          border: '1px solid rgba(77,14,56,0.10)',
          maxHeight: 'calc(100vh - 48px)',
          overflow: 'hidden',
        }}
      >

        {/* ── Header — fixed, never scrolls ── */}
        <div
          className="flex items-center gap-4 px-6 pt-6 pb-5"
          style={{ borderBottom: '1px solid #f0ece8', flexShrink: 0 }}
        >
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(77,14,56,0.08)', border: '1.5px solid rgba(77,14,56,0.12)' }}
          >
            <Send className="w-5 h-5" style={{ color: '#4d0e38' }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-xl" style={{ color: '#1a1512' }}>Publish Report</h2>
            <p className="text-xs font-medium mt-0.5" style={{ color: '#a89f98' }}>
              Choose who can access this report
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

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4" style={{ minHeight: 0 }}>

          {/* Access mode selector */}
          <div className="grid grid-cols-2 gap-3">
            {([
              { key: 'open'       as const, icon: Globe, label: 'Open Access',  desc: 'All users can view' },
              { key: 'restricted' as const, icon: Lock,  label: 'Restricted',   desc: 'Selected users only' },
            ]).map(({ key, icon: Icon, label, desc }) => {
              const active = mode === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleModeChange(key)}
                  className="flex items-center gap-3 p-4 rounded-xl text-left transition-all duration-200"
                  style={{
                    border:     `2px solid ${active ? '#4d0e38' : '#e8e4e0'}`,
                    background: active ? 'rgba(77,14,56,0.05)' : '#faf9f8',
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: active ? 'rgba(77,14,56,0.12)' : '#f0ece8',
                    }}
                  >
                    <Icon className="w-4 h-4" style={{ color: active ? '#4d0e38' : '#a89f98' }} />
                  </div>
                  <div>
                    <div className="font-bold text-sm leading-tight"
                         style={{ color: active ? '#4d0e38' : '#1a1512' }}>
                      {label}
                    </div>
                    <div className="text-[11px] font-medium mt-0.5" style={{ color: '#a89f98' }}>
                      {desc}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* User list — only shown in restricted mode */}
          {mode === 'restricted' && (
            <div className="space-y-3">

              {/* Header row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" style={{ color: '#4d0e38' }} />
                  <span className="text-xs font-black uppercase tracking-widest"
                        style={{ color: '#4d0e38' }}>
                    Select Users
                  </span>
                  {selectedIds.length > 0 && (
                    <span className="badge badge-spr">{selectedIds.length}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedIds(filtered.map(u => u.id))}
                    className="text-xs font-bold"
                    style={{ color: '#4d0e38' }}
                  >
                    Select All
                  </button>
                  <span style={{ color: '#d4cec8', fontSize: 12 }}>|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedIds([])}
                    className="text-xs font-medium"
                    style={{ color: '#a89f98' }}
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                  style={{ color: '#a89f98' }}
                />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name, email or department…"
                  className="input pl-9"
                />
              </div>

              {/* User list */}
              <div
                className="rounded-xl overflow-hidden"
                style={{ border: '1px solid #ece8e5' }}
              >
                {filtered.length === 0 ? (
                  <div className="py-8 text-center">
                    <Users className="w-8 h-8 mx-auto mb-2" style={{ color: '#e8e4e0' }} />
                    <p className="text-sm font-medium" style={{ color: '#a89f98' }}>
                      {search ? 'No users match your search' : 'No other users found'}
                    </p>
                  </div>
                ) : (
                  filtered.map((u, i) => {
                    const sel = selectedIds.includes(u.id)
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggle(u.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                        style={{
                          borderTop:  i > 0 ? '1px solid #f4f2f0' : 'none',
                          background: sel ? 'rgba(77,14,56,0.04)' : 'transparent',
                        }}
                        onMouseEnter={e => { if (!sel) e.currentTarget.style.background = '#faf9f8' }}
                        onMouseLeave={e => { e.currentTarget.style.background = sel ? 'rgba(77,14,56,0.04)' : 'transparent' }}
                      >
                        {/* Tick */}
                        <div className="flex-shrink-0">
                          {sel
                            ? <CheckSquare className="w-4 h-4" style={{ color: '#4d0e38' }} />
                            : <Square      className="w-4 h-4" style={{ color: '#d4cec8' }} />}
                        </div>

                        {/* Avatar */}
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0"
                          style={{
                            background: sel ? 'rgba(77,14,56,0.12)' : '#f0ece8',
                            color:      sel ? '#4d0e38' : '#7a7068',
                          }}
                        >
                          {u.username.slice(0, 2).toUpperCase()}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm leading-tight truncate"
                               style={{ color: sel ? '#4d0e38' : '#1a1512' }}>
                            {u.username}
                          </div>
                          <div className="text-[11px] font-medium mt-0.5 truncate"
                               style={{ color: '#a89f98' }}>
                            {u.department?.name ?? u.email}
                          </div>
                        </div>

                        {/* Role */}
                        <span
                          className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{
                            background: u.role === 'admin' ? 'rgba(77,14,56,0.08)' : '#f0ece8',
                            color:      u.role === 'admin' ? '#4d0e38' : '#7a7068',
                          }}
                        >
                          {u.role === 'admin'
                            ? <><Shield    className="w-2.5 h-2.5" /> Admin</>
                            : <><UserCheck className="w-2.5 h-2.5" /> Dept</>}
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* Status summary */}
          <div
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl"
            style={{
              background: mode === 'restricted' && selectedIds.length > 0
                ? 'rgba(77,14,56,0.05)'
                : 'rgba(22,163,74,0.05)',
              border: mode === 'restricted' && selectedIds.length > 0
                ? '1px solid rgba(77,14,56,0.14)'
                : '1px solid rgba(22,163,74,0.20)',
            }}
          >
            {mode === 'restricted' && selectedIds.length > 0
              ? <Lock  className="w-4 h-4 flex-shrink-0" style={{ color: '#4d0e38' }} />
              : <Globe className="w-4 h-4 flex-shrink-0" style={{ color: '#16a34a' }} />}
            <p
              className="text-xs font-semibold leading-relaxed"
              style={{
                color: mode === 'restricted' && selectedIds.length > 0 ? '#4d0e38' : '#15803d',
              }}
            >
              {mode === 'restricted' && selectedIds.length === 0
                ? 'Select at least one user to restrict access, or switch to Open Access.'
                : mode === 'restricted'
                ? `Only ${selectedIds.length} selected user${selectedIds.length !== 1 ? 's' : ''} will be able to view this report after publishing.`
                : 'All users in the system will be able to view this report after publishing.'}
            </p>
          </div>

        </div>

        {/* ── Footer — fixed, never scrolls ── */}
        <div
          className="px-6 pt-4 pb-6 space-y-2"
          style={{ borderTop: '1px solid #f0ece8', flexShrink: 0 }}
        >
          <button
            type="button"
            onClick={() => publishMutation.mutate()}
            disabled={publishMutation.isPending || !canPublish}
            className="btn btn-primary w-full btn-lg"
            style={!canPublish ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          >
            {publishMutation.isPending ? (
              <span className="btn-spinner" />
            ) : mode === 'restricted' && selectedIds.length > 0 ? (
              <>
                <Send className="w-4 h-4" />
                Publish &amp; Share with {selectedIds.length} User{selectedIds.length !== 1 ? 's' : ''}
              </>
            ) : (
              <>
                <Globe className="w-4 h-4" />
                Publish to All Users
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost w-full text-sm"
            style={{ color: '#a89f98' }}
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  )
}
