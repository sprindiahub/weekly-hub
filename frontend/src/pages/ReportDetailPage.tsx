import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import {
  ArrowLeft, Plus, Trash2, Edit2, Save, X, Download,
  Image, FileText, Calendar, User, Building2,
  Upload, CheckCircle, Clock, Send, Link2
} from 'lucide-react'
import api from '@/lib/api'
import { formatDate, formatDateTime, formatFileSize, getStatusColor } from '@/lib/utils'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmailModal from '@/components/EmailModal'
import PublishModal from '@/components/PublishModal'
import toast from 'react-hot-toast'
import type { WeeklyReport, ReportNote } from '@/types'

// ── Note Item ─────────────────────────────────────────────────────────────────
function NoteItem({
  note, index, onUpdate, onDelete
}: {
  note: ReportNote
  index: number
  onUpdate: (id: number, content: string) => void
  onDelete: (id: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [value,   setValue]   = useState(note.content)

  const save = () => {
    if (!value.trim()) return
    onUpdate(note.id, value)
    setEditing(false)
  }

  return (
    <div className="group border border-gray-100 rounded-lg bg-white hover:border-brand-200 transition-all overflow-hidden">
      {/* Left accent bar */}
      <div className="flex">
        <div className="w-1 bg-brand-500 flex-shrink-0 rounded-l-lg" />
        <div className="flex-1 p-4">
          {editing ? (
            <div className="space-y-2">
              <textarea
                value={value}
                onChange={e => setValue(e.target.value)}
                className="input min-h-[80px] resize-none text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={save} className="btn-primary btn-sm">
                  <Save className="w-3.5 h-3.5" /> Save
                </button>
                <button onClick={() => { setValue(note.content); setEditing(false) }} className="btn-secondary btn-sm">
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-6 h-6 bg-brand-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-white">{index}</span>
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap break-words">
                    {note.content}
                  </p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button onClick={() => setEditing(true)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-brand-600" title="Edit">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => onDelete(note.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2 ml-9">
                <Clock className="w-3 h-3 text-gray-300" />
                <span className="text-xs text-gray-400">{formatDateTime(note.created_at)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Image Upload Panel ────────────────────────────────────────────────────────
function ImageUploadPanel({
  report,
  onUploaded,
}: { report: WeeklyReport; onUploaded: () => void }) {
  const [uploading, setUploading] = useState(false)
  const [linkedNoteId, setLinkedNoteId] = useState<number | ''>('')
  const [deleteId,     setDeleteId]     = useState<number | null>(null)
  const qc = useQueryClient()

  const { mutate: deleteImg } = useMutation({
    mutationFn: (imgId: number) => api.delete(`/reports/${report.id}/images/${imgId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['report', String(report.id)] }); setDeleteId(null) },
    onError: () => toast.error('Failed to delete image'),
  })

  const onDrop = useCallback(async (accepted: File[]) => {
    if (!accepted.length) return
    setUploading(true)
    try {
      const form = new FormData()
      accepted.forEach(f => form.append('files', f))
      if (linkedNoteId) form.append('note_id', String(linkedNoteId))
      await api.post(`/reports/${report.id}/images`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onUploaded()
      toast.success(`${accepted.length} image(s) uploaded${linkedNoteId ? ' and linked to point ' + report.notes.find(n => n.id === linkedNoteId)?.order_index + 1 : ''}`)
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }, [report.id, linkedNoteId])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'] },
    maxSize: 10 * 1024 * 1024,
  })

  const imagesByNote: Record<number | 'loose', typeof report.images> = { loose: [] }
  report.images.forEach(img => {
    if (img.note_id) {
      if (!imagesByNote[img.note_id]) imagesByNote[img.note_id] = []
      imagesByNote[img.note_id].push(img)
    } else {
      imagesByNote.loose.push(img)
    }
  })

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Image className="w-5 h-5 text-purple-500" />
        <h2 className="font-semibold text-gray-900">Attachments</h2>
        <span className="badge badge-blue">{report.images.length}</span>
      </div>

      {/* Link to a note */}
      {report.notes.length > 0 && (
        <div className="mb-3">
          <label className="label flex items-center gap-1">
            <Link2 className="w-3.5 h-3.5 text-brand-500" />
            Link image to a specific point (optional)
          </label>
          <select
            value={linkedNoteId}
            onChange={e => setLinkedNoteId(e.target.value ? Number(e.target.value) : '')}
            className="input text-sm"
          >
            <option value="">— General attachment (not linked) —</option>
            {report.notes
              .slice()
              .sort((a, b) => a.order_index - b.order_index)
              .map((n, i) => (
                <option key={n.id} value={n.id}>
                  Point {i + 1}: {n.content.slice(0, 60)}{n.content.length > 60 ? '…' : ''}
                </option>
              ))}
          </select>
          {linkedNoteId && (
            <p className="text-xs text-brand-600 mt-1 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Image will appear below Point {report.notes.findIndex(n => n.id === linkedNoteId) + 1} in the PDF/email
            </p>
          )}
        </div>
      )}

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all mb-4
          ${isDragActive ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-brand-300 hover:bg-gray-50'}
          ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-gray-500">Uploading…</span>
          </div>
        ) : (
          <div className="py-2">
            <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-500 font-medium">
              {isDragActive ? 'Drop images here' : 'Drag & drop or click to upload'}
            </p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG, GIF, WebP · Max 10 MB each</p>
          </div>
        )}
      </div>

      {/* Image list grouped by note */}
      {report.images.length > 0 ? (
        <div className="space-y-4">
          {/* Linked images per note */}
          {report.notes
            .slice()
            .sort((a, b) => a.order_index - b.order_index)
            .map((note, ni) => {
              const linked = imagesByNote[note.id] || []
              if (!linked.length) return null
              return (
                <div key={note.id}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="w-5 h-5 bg-brand-600 rounded-full flex items-center justify-center text-xs font-bold text-white">{ni + 1}</span>
                    <span className="text-xs text-gray-500 truncate">{note.content.slice(0, 50)}</span>
                  </div>
                  <div className="space-y-2">
                    {linked.map(img => <ImageThumb key={img.id} img={img} onDelete={setDeleteId} />)}
                  </div>
                </div>
              )
            })}

          {/* Loose images */}
          {imagesByNote.loose.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-400 mb-2">General Attachments</div>
              <div className="space-y-2">
                {imagesByNote.loose.map(img => <ImageThumb key={img.id} img={img} onDelete={setDeleteId} />)}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-400 text-center py-4">No images attached yet</p>
      )}

      <ConfirmDialog
        isOpen={deleteId !== null}
        title="Remove Image"
        message="This image will be permanently deleted."
        onConfirm={() => deleteId && deleteImg(deleteId)}
        onCancel={() => setDeleteId(null)}
        confirmLabel="Remove"
        danger
      />
    </div>
  )
}

function ImageThumb({ img, onDelete }: { img: any; onDelete: (id: number) => void }) {
  return (
    <div className="group relative rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
      <img src={img.url} alt={img.original_name} className="w-full object-cover max-h-40" loading="lazy" />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
        <button
          onClick={() => onDelete(img.id)}
          className="opacity-0 group-hover:opacity-100 p-2 bg-red-600 rounded-full text-white"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="px-2 py-1.5">
        <p className="text-xs text-gray-500 truncate">{img.original_name}</p>
        <p className="text-xs text-gray-400">{formatFileSize(img.file_size)}</p>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ReportDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc       = useQueryClient()

  const [newNote,       setNewNote]       = useState('')
  const [deleteNoteId,  setDeleteNoteId]  = useState<number | null>(null)
  const [showEmail,     setShowEmail]     = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showPublish,   setShowPublish]   = useState(false)

  const { data: report, isLoading } = useQuery<WeeklyReport>({
    queryKey: ['report', id],
    queryFn: () => api.get(`/reports/${id}`).then(r => r.data),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['report', id] })

  const addNoteMutation = useMutation({
    mutationFn: (content: string) =>
      api.post(`/reports/${id}/notes`, { content, order_index: report?.notes.length ?? 0 }),
    onSuccess: () => { invalidate(); setNewNote(''); toast.success('Point added') },
    onError:   () => toast.error('Failed to add point'),
  })

  const updateNoteMutation = useMutation({
    mutationFn: ({ noteId, content }: { noteId: number; content: string }) =>
      api.put(`/reports/${id}/notes/${noteId}`, { content }),
    onSuccess: () => { invalidate(); toast.success('Updated') },
    onError:   () => toast.error('Failed to update'),
  })

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: number) => api.delete(`/reports/${id}/notes/${noteId}`),
    onSuccess: () => { invalidate(); setDeleteNoteId(null); toast.success('Removed') },
    onError:   () => toast.error('Failed to delete'),
  })

  const statusMutation = useMutation({
    mutationFn: (status: string) => api.put(`/reports/${id}`, { status }),
    onSuccess: () => {
      invalidate()
      qc.invalidateQueries({ queryKey: ['reports'] })
      toast.success('Status updated')
    },
  })

  const deleteReportMutation = useMutation({
    mutationFn: () => api.delete(`/reports/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reports'] })
      toast.success('Report deleted')
      navigate('/history')
    },
    onError: () => toast.error('Failed to delete report'),
  })

  const handlePDF = async () => {
    try {
      const res = await api.get(`/reports/${id}/pdf`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a   = document.createElement('a')
      a.href     = url
      a.download = `SPR_Report_${report?.weekend_date}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('PDF downloaded')
    } catch { toast.error('PDF generation failed') }
  }

  const addNote = () => {
    if (!newNote.trim()) return
    addNoteMutation.mutate(newNote.trim())
  }

  if (isLoading) return <PageLoader />
  if (!report) return <div className="text-center py-20 text-gray-400">Report not found</div>

  const sortedNotes = report.notes.slice().sort((a, b) => a.order_index - b.order_index)

  return (
    <div className="space-y-5 page-enter">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate(-1)} className="btn-ghost btn-sm">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">
              {formatDate(report.weekend_date, 'EEEE, dd MMMM yyyy')}
            </h1>
            <span className={`badge ${getStatusColor(report.status)}`}>{report.status}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 flex-wrap">
            <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{report.department?.name}</span>
            <span className="flex items-center gap-1"><User className="w-3 h-3" />{report.user?.username}</span>
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Updated {formatDateTime(report.updated_at)}</span>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {report.status === 'draft' ? (
            <button
              onClick={() => setShowPublish(true)}
              className="btn-secondary btn-sm"
              title="Publish and choose who can access this report"
            >
              <CheckCircle className="w-3.5 h-3.5 text-green-500" /> Publish
            </button>
          ) : (
            <button
              onClick={() => statusMutation.mutate('draft')}
              className="btn-secondary btn-sm"
              title="Revert to draft"
            >
              <Clock className="w-3.5 h-3.5" /> Revert to Draft
            </button>
          )}
          <button onClick={handlePDF} className="btn-secondary btn-sm">
            <Download className="w-3.5 h-3.5" /> PDF
          </button>
          <button onClick={() => setShowEmail(true)} className="btn-primary btn-sm">
            <Send className="w-3.5 h-3.5" /> Email
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="btn-secondary btn-sm"
            style={{ color: '#dc2626', borderColor: '#fecaca' }}
            title="Delete this report"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {report.status === 'draft' && (
        <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-lg text-xs text-yellow-700 flex items-center gap-2">
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span>This report is a <strong>draft</strong>. Publish it so other departments can include it in combined reports.</span>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Notes — 2/3 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-brand-500" />
              <h2 className="font-semibold text-gray-900">Report Points</h2>
              <span className="badge badge-blue">{report.notes.length}</span>
              <span className="text-xs text-gray-400 ml-1">Each point = one numbered line in the final report</span>
            </div>

            {/* Add note */}
            <div className="mb-4">
              <textarea
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) addNote() }}
                placeholder="Type a report point… (Ctrl+Enter to add)"
                className="input min-h-[80px] resize-none text-sm"
                rows={3}
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-400">{newNote.length} chars</span>
                <button
                  onClick={addNote}
                  disabled={!newNote.trim() || addNoteMutation.isPending}
                  className="btn-primary btn-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Point
                </button>
              </div>
            </div>

            {/* Points list */}
            <div className="space-y-2">
              {sortedNotes.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No points yet. Add your first activity above.
                </div>
              ) : (
                sortedNotes.map((note, i) => (
                  <NoteItem
                    key={note.id}
                    note={note}
                    index={i + 1}
                    onUpdate={(noteId, content) => updateNoteMutation.mutate({ noteId, content })}
                    onDelete={setDeleteNoteId}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Images — 1/3 */}
        <div>
          <ImageUploadPanel report={report} onUploaded={invalidate} />
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteNoteId !== null}
        title="Remove Point"
        message="This report point will be permanently deleted."
        onConfirm={() => deleteNoteId && deleteNoteMutation.mutate(deleteNoteId)}
        onCancel={() => setDeleteNoteId(null)}
        confirmLabel="Delete"
        danger
      />

      <ConfirmDialog
        isOpen={confirmDelete}
        title="Delete This Report"
        message={`Permanently delete the report for the week ending ${formatDate(report.weekend_date, 'dd MMMM yyyy')}? All activity points and attachments will be removed. This cannot be undone.`}
        onConfirm={() => deleteReportMutation.mutate()}
        onCancel={() => setConfirmDelete(false)}
        confirmLabel="Delete Report"
        danger
      />

      {showEmail && (
        <EmailModal
          reportId={report.id}
          weekendDate={report.weekend_date}
          onClose={() => setShowEmail(false)}
        />
      )}

      {showPublish && (
        <PublishModal
          report={report}
          onClose={() => setShowPublish(false)}
          onPublished={invalidate}
        />
      )}
    </div>
  )
}
