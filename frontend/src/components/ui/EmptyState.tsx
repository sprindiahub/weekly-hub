import { LucideIcon } from 'lucide-react'

interface Props {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

export default function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      {/* Icon box */}
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
           style={{
             background: 'linear-gradient(145deg, rgba(77,14,56,0.06), rgba(77,14,56,0.03))',
             border: '1.5px solid rgba(77,14,56,0.10)',
           }}>
        <Icon className="w-9 h-9" style={{ color: 'rgba(77,14,56,0.35)' }} />
      </div>

      <h3 className="font-display text-2xl mb-2" style={{ color: '#1a1512' }}>{title}</h3>

      {description && (
        <p className="text-sm font-medium leading-relaxed max-w-sm" style={{ color: '#a89f98' }}>
          {description}
        </p>
      )}

      {action && <div className="mt-7">{action}</div>}
    </div>
  )
}
