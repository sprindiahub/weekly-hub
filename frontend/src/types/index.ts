export type UserRole = 'admin' | 'department_head'
export type ReportStatus = 'draft' | 'published'

export interface Department {
  id: number
  name: string
  short_code: string
  description?: string
  is_active: boolean
  created_at: string
}

export interface User {
  id: number
  email: string
  username: string
  role: UserRole
  department_id?: number
  department?: Department
  is_active: boolean
  created_at: string
  last_login?: string
}

export interface ReportNote {
  id: number
  report_id: number
  content: string
  order_index: number
  created_at: string
  updated_at: string
}

export interface ReportImage {
  id: number
  report_id: number
  note_id?: number        // if set, image is linked to a specific note
  filename: string
  original_name: string
  caption?: string
  file_size: number
  order_index: number
  created_at: string
  url: string
}

export interface WeeklyReport {
  id: number
  department_id: number
  user_id: number
  weekend_date: string
  status: ReportStatus
  created_at: string
  updated_at: string
  department?: Department
  user?: User
  notes: ReportNote[]
  images: ReportImage[]
  shared_user_ids: number[]   // empty = open access; non-empty = restricted to these users
}

export interface AuditLog {
  id: number
  user_id?: number
  action: string
  entity_type: string
  entity_id?: number
  details?: string
  ip_address?: string
  created_at: string
  user?: User
}

export interface AdminStats {
  total_users: number
  total_departments: number
  total_reports: number
  total_notes: number
  total_images: number
}
