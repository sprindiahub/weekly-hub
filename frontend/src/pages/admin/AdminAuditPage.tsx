import { useQuery } from '@tanstack/react-query'
import { ClipboardList, Shield } from 'lucide-react'
import api from '@/lib/api'
import { formatDateTime, getActionColor } from '@/lib/utils'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import type { AuditLog, AdminStats } from '@/types'

export default function AdminAuditPage() {
  const { data: logs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ['audit-logs'],
    queryFn: () => api.get('/admin/audit-logs').then(r => r.data),
  })
  const { data: stats } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then(r => r.data),
  })

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-sm text-gray-400">{logs.length} recent events</p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: 'Users', value: stats.total_users },
            { label: 'Departments', value: stats.total_departments },
            { label: 'Reports', value: stats.total_reports },
            { label: 'Notes', value: stats.total_notes },
            { label: 'Images', value: stats.total_images },
          ].map(s => (
            <div key={s.label} className="card p-4 text-center">
              <div className="text-2xl font-bold text-brand-700">{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {logs.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No audit events yet" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Time</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">User</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Entity</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">
                    {formatDateTime(log.created_at)}
                  </td>
                  <td className="px-5 py-3">
                    {log.user ? (
                      <div>
                        <div className="text-sm font-medium text-gray-900">{log.user.username}</div>
                        <div className="text-xs text-gray-400">{log.user.email}</div>
                      </div>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-semibold font-mono ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs text-gray-500">{log.entity_type}</span>
                    {log.entity_id && <span className="text-xs text-gray-300 ml-1">#{log.entity_id}</span>}
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-400 max-w-xs truncate">
                    {log.details ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
