import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, Trash2, Building2, Hash } from 'lucide-react'
import api from '@/lib/api'
import { formatDate } from '@/lib/utils'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import type { Department } from '@/types'
import toast from 'react-hot-toast'

function DeptForm({ initial, onSubmit, loading }: {
  initial?: Partial<Department>; onSubmit: (d: any) => void; loading: boolean
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [code, setCode] = useState(initial?.short_code ?? '')
  const [desc, setDesc] = useState(initial?.description ?? '')

  return (
    <form
      onSubmit={e => { e.preventDefault(); onSubmit({ name, short_code: code, description: desc }) }}
      className="space-y-5"
    >
      <div>
        <label className="label">Department Name *</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          className="input"
          required
          minLength={2}
          placeholder="e.g. Engineering & Development"
        />
      </div>
      <div>
        <label className="label">Short Code *</label>
        <input
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          className="input font-mono"
          required
          maxLength={20}
          placeholder="ENG"
          style={{ letterSpacing: '0.1em', fontWeight: 700 }}
        />
        <p className="text-xs font-medium mt-1.5" style={{ color: '#a89f98' }}>
          Used in file paths and report headers — automatically uppercased
        </p>
      </div>
      <div>
        <label className="label">Description <span style={{ color: '#a89f98', textTransform: 'none', fontWeight: 500 }}>(optional)</span></label>
        <input
          value={desc}
          onChange={e => setDesc(e.target.value)}
          className="input"
          placeholder="Brief description of department function"
        />
      </div>
      <div className="pt-2">
        <button type="submit" disabled={loading} className="btn btn-primary w-full btn-lg">
          {loading ? <span className="btn-spinner" /> : 'Save Department'}
        </button>
      </div>
    </form>
  )
}

export default function AdminDepartmentsPage() {
  const qc = useQueryClient()
  const [showModal, setShowModal]   = useState(false)
  const [editDept,  setEditDept]    = useState<Department | null>(null)
  const [deleteDept,setDeleteDept]  = useState<Department | null>(null)

  const { data: depts = [], isLoading } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments').then(r => r.data),
  })

  const createMut = useMutation({
    mutationFn: (d: any) => api.post('/departments', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); setShowModal(false); toast.success('Department created successfully') },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to create department'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, d }: any) => api.put(`/departments/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); setEditDept(null); toast.success('Department updated') },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to update'),
  })
  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/departments/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); setDeleteDept(null); toast.success('Department deactivated') },
    onError: () => toast.error('Failed to deactivate department'),
  })

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-7 page-enter">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Departments</h1>
          <p className="page-subtitle">{depts.length} active department{depts.length !== 1 ? 's' : ''} configured</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" /> Add Department
        </button>
      </div>

      {depts.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No departments configured"
          description="Create your first department to begin managing reports by division."
        />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 stagger">
          {depts.map(d => (
            <div key={d.id} className="card-hover p-6">
              {/* Top */}
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 font-display text-lg"
                     style={{
                       background: 'rgba(77,14,56,0.06)',
                       border: '1.5px solid rgba(77,14,56,0.12)',
                       color: '#4d0e38',
                       letterSpacing: '-0.01em',
                     }}>
                  {d.short_code.slice(0, 3)}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditDept(d)}
                          className="btn btn-icon btn-ghost btn-icon-sm"
                          title="Edit department">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteDept(d)}
                          className="btn btn-icon btn-ghost btn-icon-sm"
                          style={{ color: '#dc2626' }}
                          title="Deactivate department">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Name */}
              <h3 className="font-display text-xl mb-1" style={{ color: '#1a1512' }}>{d.name}</h3>
              {d.description && (
                <p className="text-xs font-medium mb-3" style={{ color: '#a89f98' }}>{d.description}</p>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 mt-4"
                   style={{ borderTop: '1px solid #f0ece8' }}>
                <span className={`badge ${d.is_active ? 'badge-green' : 'badge-gray'}`}>
                  {d.is_active ? '● Active' : '○ Inactive'}
                </span>
                <span className="text-xs font-medium" style={{ color: '#a89f98' }}>
                  Est. {formatDate(d.created_at, 'dd MMM yyyy')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add New Department"
             subtitle="Configure a new organisational department">
        <DeptForm onSubmit={d => createMut.mutate(d)} loading={createMut.isPending} />
      </Modal>

      <Modal isOpen={!!editDept} onClose={() => setEditDept(null)} title="Edit Department"
             subtitle={`Updating: ${editDept?.name}`}>
        {editDept && (
          <DeptForm
            initial={editDept}
            onSubmit={d => updateMut.mutate({ id: editDept.id, d })}
            loading={updateMut.isPending}
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteDept}
        title="Deactivate Department"
        message={`Are you sure you want to deactivate "${deleteDept?.name}"? This will prevent new reports from being filed under this department.`}
        onConfirm={() => deleteDept && deleteMut.mutate(deleteDept.id)}
        onCancel={() => setDeleteDept(null)}
        confirmLabel="Deactivate Department"
        danger
      />
    </div>
  )
}
