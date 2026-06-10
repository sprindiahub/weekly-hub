import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect } from 'react'

interface Props {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' }

export default function Modal({ isOpen, onClose, title, subtitle, children, size = 'md' }: Props) {
  useEffect(() => {
    if (!isOpen) return
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,8,32,0.60)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className={cn('bg-white w-full flex flex-col max-h-[90vh] animate-scale-in', sizes[size])}
        style={{
          borderRadius: '1.25rem',
          boxShadow: '0 24px 64px rgba(77,14,56,0.25), 0 4px 16px rgba(0,0,0,0.1)',
          border: '1px solid rgba(77,14,56,0.08)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-7 pt-6 pb-5 flex-shrink-0"
             style={{ borderBottom: '1px solid #ece8e5' }}>
          <div>
            <h2 className="font-display text-xl" style={{ color: '#1a1512' }}>{title}</h2>
            {subtitle && (
              <p className="text-xs font-medium mt-0.5" style={{ color: '#a89f98' }}>{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 w-8 h-8 flex items-center justify-center rounded-xl flex-shrink-0 transition-colors"
            style={{ background: '#faf9f8', color: '#a89f98', border: '1px solid #ece8e5' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fdf2f7'; e.currentTarget.style.color = '#4d0e38' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#faf9f8'; e.currentTarget.style.color = '#a89f98' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-7 py-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
