import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, subDays, addDays } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getNearestPastSaturday(from: Date = new Date()): Date {
  const day = from.getDay() // 0=Sun, 6=Sat
  const diff = (day + 1) % 7 // days since Saturday
  const sat = new Date(from)
  sat.setDate(from.getDate() - diff)
  sat.setHours(0, 0, 0, 0)
  return sat
}

export function formatDate(dateStr: string, fmt = 'dd MMM yyyy'): string {
  try {
    return format(parseISO(dateStr), fmt)
  } catch {
    return dateStr
  }
}

export function formatDateTime(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy, HH:mm')
  } catch {
    return dateStr
  }
}

export function toISODate(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getStatusColor(status: string) {
  return status === 'published' ? 'badge-green' : 'badge-amber'
}

/** UI label for report status: "published" → "Shared", "draft" → "Local" */
export function statusLabel(status: string): string {
  return status === 'published' ? 'Shared' : 'Local'
}

export function getActionColor(action: string) {
  if (action.includes('DELETE')) return 'text-red-600'
  if (action.includes('CREATE')) return 'text-green-600'
  if (action.includes('UPDATE')) return 'text-blue-600'
  if (action.includes('LOGIN')) return 'text-purple-600'
  return 'text-gray-600'
}

export function getSaturdaysInRange(start: Date, end: Date): Date[] {
  const saturdays: Date[] = []
  const cur = new Date(start)
  while (cur <= end) {
    if (cur.getDay() === 6) saturdays.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return saturdays
}

export function getPastSaturdays(count = 12): Date[] {
  const sats: Date[] = []
  let cur = getNearestPastSaturday()
  for (let i = 0; i < count; i++) {
    sats.push(new Date(cur))
    cur.setDate(cur.getDate() - 7)
  }
  return sats
}

/** Next upcoming Saturday (from today, inclusive if today is Saturday). */
export function getNextSaturday(from: Date = new Date()): Date {
  const day = from.getDay() // 0=Sun … 6=Sat
  const daysUntilSat = day === 6 ? 0 : 6 - day
  const sat = new Date(from)
  sat.setDate(from.getDate() + daysUntilSat)
  sat.setHours(0, 0, 0, 0)
  return sat
}

/**
 * Returns the next `count` upcoming Saturdays (including this coming Saturday).
 * First entry = the nearest future Saturday.
 */
export function getUpcomingSaturdays(count = 8): Date[] {
  const sats: Date[] = []
  let cur = getNextSaturday()
  for (let i = 0; i < count; i++) {
    sats.push(new Date(cur))
    cur.setDate(cur.getDate() + 7)
  }
  return sats
}
