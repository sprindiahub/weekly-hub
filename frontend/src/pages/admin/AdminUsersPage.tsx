import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, Trash2, Shield, UserCheck, Users2 } from 'lucide-react'
import api from '@/lib/api'
import { formatDate } from '@/lib/utils'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import type { User, Department } from '@/types'
import toast from 'react-hot-toast'

interface UserFormData {
  email: string; username: string; password: string
  role: 'admin' | 'department_head'; department_id: string; is_active: boolean
}

function UserForm({ initial, departments, onSubmit, loading }: {
  initial?: Partial<UserFormData>; departments: Department[]
  onSubmit: (data: UserFormData) => void; loading: boolean
}) {
  const [form, setForm] = useState<UserFormData>({
    email:         initial?.email         ?? '',
    username:      initial?.username      ?? '',
    password:      '',
    role:          initial?.role          ?? 'department_head',
    department_id: String(initial?.department_id ?? ''),
    is_active:     initial?.is_active     ?? true,
  })

  const set = (k: keyof UserFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({
        ...f,
        [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value,
      }))

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form) }} className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Full Name *</label>
          <input value={form.username} onChange={set('username')} className="input" required minLength={2} placeholder="John Doe" />
        </div>
        <div>
          <label className="label">Email Address *</label>
          <input type="email" value={form.email} onChange={set('email')} className="input" required placeholder="john@sprindia.com" />
        </div>
      </div>

      <div>
        <label className="label">Password {initial ? <span style={{ textTransform: 'none', fontWeight: 400, color: '#a89f98' }}>(leave blank to retain current)</span> : '*'}</label>
        <input type="password" value={form.password} onChange={set('password')}
               className="input" minLength={6} required={!initial} placeholder="Minimum 6 characters" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">System Role *</label>
          <select value={form.role} onChange={set('role')} className="input">
            <option value="department_head">Department Head</option>
            <option value="admin">System Administrator</option>
          </select>
        </div>
        <div>
          <label className="label">Department Assignment</label>
          <select value={form.department_id} onChange={set('department_id')} className="input">
            <option value="">None / Unassigned</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: '#faf9f8', border: '1px solid #ece8e5' }}>
        <input type="checkbox" id="is_active" checked={form.is_active} onChange={set('is_active')} />
        <label htmlFor="is_active" className="text-sm font-semibold cursor-pointer" style={{ color: '#1a1512' }}>
          Account is Active
        </label>
        <span className="text-xs font-medium ml-auto" style={{ color: '#a89f98' }}>
          Inactive users cannot sign in
        </span>
      </div>

      <button type="submit" disabled={loading} className="btn btn-primary w-full btn-lg">
        {loading ? <span className="btn-spinner" /> : 'Save User Account'}
      </button>
    </form>
  )
}

export default function AdminUsersPage() {
  const qc = useQueryClient()
  const [showModal,   setShowModal]   = useState(false)
  const [editUser,    setEditUser]    = useState<User | null>(null)
  const [deleteUser,  setDeleteUser]  = useState<User | null>(null)

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data),
  })
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments').then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/users', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setShowModal(false); toast.success('User account created') },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to create user'),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.put(`/users/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setEditUser(null); toast.success('User account updated') },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to update user'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setDeleteUser(null); toast.success('User deactivated') },
    onError: () => toast.error('Failed to deactivate user'),
  })

  const handleCreate = (form: any) => {
    createMutation.mutate({ ...form, department_id: form.department_id ? Number(form.department_id) : null })
  }
  const handleUpdate = (form: any) => {
    const payload: any = { ...form, department_id: form.department_id ? Number(form.department_id) : null }
    if (!form.password) delete payload.password
    updateMutation.mutate({ id: editUser!.id, data: payload })
  }

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-7 page-enter">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">{users.length} user account{users.length !== 1 ? 's' : ''} registered</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" /> Add User Account
        </button>
      </div>

      {users.length === 0 ? (
        <EmptyState
          icon={Users2}
          title="No user accounts"
          description="Create user accounts for department heads to begin filing reports."
        />
      ) : (
        <div className="card overflow-hidden">
          {/* Desktop */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>System Role</th>
                  <th>Department</th>
                  <th>Account Status</th>
                  <th>Date Added</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                             style={{
                               background: 'rgba(77,14,56,0.08)',
                               color: '#4d0e38',
                               border: '1px solid rgba(77,14,56,0.12)',
                             }}>
                          {u.username.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-sm" style={{ color: '#1a1512' }}>{u.username}</div>
                          <div className="text-xs font-medium" style={{ color: '#a89f98' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'badge-spr' : 'badge-gray'} items-center`}>
                        {u.role === 'admin'
                          ? <><Shield className="w-3 h-3" /> System Admin</>
                          : <><UserCheck className="w-3 h-3" /> Dept. Head</>}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm font-medium" style={{ color: '#5c544e' }}>
                        {u.department?.name ?? <span style={{ color: '#d4cec8' }}>Unassigned</span>}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.is_active ? 'badge-green' : 'badge-gray'}`}>
                        {u.is_active ? '● Active' : '○ Inactive'}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs font-medium" style={{ color: '#a89f98' }}>
                        {formatDate(u.created_at)}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-1.5 justify-end">
                        <button onClick={() => setEditUser(u)}
                                className="btn btn-secondary btn-sm"
                                title="Edit user">
                          <Edit2 className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button onClick={() => setDeleteUser(u)}
                                className="btn btn-ghost btn-sm"
                                style={{ color: '#dc2626' }}
                                title="Deactivate user">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="sm:hidden divide-y" style={{ borderColor: '#f0ece8' }}>
            {users.map(u => (
              <div key={u.id} className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold flex-shrink-0"
                     style={{ background: 'rgba(77,14,56,0.08)', color: '#4d0e38' }}>
                  {u.username.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm" style={{ color: '#1a1512' }}>{u.username}</div>
                  <div className="text-xs" style={{ color: '#a89f98' }}>
                    {u.department?.name ?? 'Unassigned'} ·{' '}
                    {u.role === 'admin' ? 'Admin' : 'Dept Head'}
                  </div>
                </div>
                <button onClick={() => setEditUser(u)} className="btn btn-ghost btn-icon-sm">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add New User Account"
             subtitle="Create access credentials for a department head">
        <UserForm departments={departments} onSubmit={handleCreate} loading={createMutation.isPending} />
      </Modal>

      <Modal isOpen={!!editUser} onClose={() => setEditUser(null)} title="Edit User Account"
             subtitle={`Modifying: ${editUser?.username}`}>
        {editUser && (
          <UserForm
            initial={{ ...editUser, department_id: String(editUser.department_id ?? '') }}
            departments={departments}
            onSubmit={handleUpdate}
            loading={updateMutation.isPending}
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteUser}
        title="Deactivate User Account"
        message={`This will revoke login access for "${deleteUser?.username}". Their reports will be retained. This action can be reversed by editing the user.`}
        onConfirm={() => deleteUser && deleteMutation.mutate(deleteUser.id)}
        onCancel={() => setDeleteUser(null)}
        confirmLabel="Deactivate Account"
        danger
      />
    </div>
  )
}
