import { AlertTriangle, Trash2, Info } from 'lucide-react'

interface Props {
  isOpen: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
  danger?: boolean
}

export default function ConfirmDialog({
  isOpen, title, message, onConfirm, onCancel,
  confirmLabel = 'Confirm', danger = false
}: Props) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,8,32,0.60)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="bg-white max-w-sm w-full p-7 animate-scale-in"
        style={{
          borderRadius: '1.25rem',
          boxShadow: '0 24px 64px rgba(77,14,56,0.25), 0 4px 16px rgba(0,0,0,0.08)',
          border: '1px solid rgba(77,14,56,0.08)',
        }}
      >
        {/* Icon + content */}
        <div className="flex gap-4 mb-6">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0`}
               style={{
                 background: danger ? '#fee2e2' : '#fef3c7',
                 border:     danger ? '1px solid #fecaca' : '1px solid #fde68a',
               }}>
            {danger
              ? <Trash2 className="w-5 h-5" style={{ color: '#dc2626' }} />
              : <AlertTriangle className="w-5 h-5" style={{ color: '#d97706' }} />}
          </div>
          <div>
            <h3 className="font-display text-xl mb-1" style={{ color: '#1a1512' }}>{title}</h3>
            <p className="text-sm font-medium leading-relaxed" style={{ color: '#7a7068' }}>{message}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn btn-secondary btn-sm">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`btn btn-sm ${danger ? 'btn-danger' : 'btn-primary'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
