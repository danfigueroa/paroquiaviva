import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSessionStore } from '@/state/session-store'

export function RequireAuth() {
  const accessToken = useSessionStore((s) => s.accessToken)
  const location = useLocation()

  if (!accessToken) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/auth?next=${next}`} replace />
  }

  return <Outlet />
}

export function PublicEntry() {
  const accessToken = useSessionStore((s) => s.accessToken)

  if (accessToken) {
    return <Navigate to="/feed" replace />
  }

  return <Navigate to="/auth" replace />
}
