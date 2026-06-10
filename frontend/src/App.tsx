import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import Layout from '@/components/layout/Layout'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import ReportDetailPage from '@/pages/ReportDetailPage'
import NewReportPage from '@/pages/NewReportPage'
import HistoryPage from '@/pages/HistoryPage'
import SharedWithMePage from '@/pages/SharedWithMePage'
import AdminUsersPage from '@/pages/admin/AdminUsersPage'
import AdminDepartmentsPage from '@/pages/admin/AdminDepartmentsPage'
import AdminAuditPage from '@/pages/admin/AdminAuditPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div className="flex items-center justify-center h-screen">
    <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
  </div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (user?.role !== 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  const { fetchMe } = useAuth()

  useEffect(() => {
    fetchMe()
  }, [])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<DashboardPage />} />
        <Route path="reports/new" element={<NewReportPage />} />
        <Route path="reports/:id" element={<ReportDetailPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="shared" element={<SharedWithMePage />} />
        <Route path="admin/users" element={<RequireAdmin><AdminUsersPage /></RequireAdmin>} />
        <Route path="admin/departments" element={<RequireAdmin><AdminDepartmentsPage /></RequireAdmin>} />
        <Route path="admin/audit" element={<RequireAdmin><AdminAuditPage /></RequireAdmin>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
