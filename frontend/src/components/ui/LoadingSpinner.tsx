export function LoadingSpinner({ size = 20 }: { size?: number }) {
  return (
    <div
      className="rounded-full animate-spin"
      style={{
        width: size, height: size,
        border: `${Math.max(2, size / 10)}px solid rgba(77,14,56,0.15)`,
        borderTopColor: '#4d0e38',
      }}
    />
  )
}

export function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-28 gap-4">
      <LoadingSpinner size={40} />
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#d4cec8' }}>
        Loading…
      </p>
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="card p-5 space-y-3.5">
      <div className="flex justify-between items-start">
        <div className="skeleton h-5 w-36 rounded-lg" />
        <div className="skeleton h-5 w-16 rounded-full" />
      </div>
      <div className="skeleton h-3.5 w-48 rounded-lg" />
      <div className="flex gap-2">
        <div className="skeleton h-7 w-20 rounded-lg" />
        <div className="skeleton h-7 w-20 rounded-lg" />
      </div>
      <div className="skeleton h-10 w-full rounded-lg" />
      <div className="flex gap-2 pt-1">
        <div className="skeleton h-9 flex-1 rounded-lg" />
        <div className="skeleton h-9 w-12 rounded-lg" />
      </div>
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b" style={{ borderColor: '#f0ece8' }}>
      <div className="skeleton h-9 w-9 rounded-xl" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-4 w-32 rounded" />
        <div className="skeleton h-3 w-24 rounded" />
      </div>
      <div className="skeleton h-6 w-20 rounded-full" />
      <div className="skeleton h-6 w-24 rounded" />
    </div>
  )
}
