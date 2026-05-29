import { Navigate } from 'react-router-dom'
import { useAuth }  from '../context/AuthContext'

/** Requires a valid session. Shows a loader while the token is being validated. */
export default function ProtectedRoute({ children }) {
  const { isLoggedIn, authChecking, sessionExpired } = useAuth()

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#F5EFE0] flex items-center justify-center">
        <p className="text-sm text-[#A89F88]">Loading…</p>
      </div>
    )
  }

  if (!isLoggedIn) {
    return (
      <Navigate
        to="/login"
        replace
        state={sessionExpired ? { sessionExpired: true } : undefined}
      />
    )
  }

  return children
}

/** Rejects already-logged-in users. Waits for auth check before redirecting. */
export function PublicOnlyRoute({ children }) {
  const { isLoggedIn, authChecking } = useAuth()

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#F5EFE0] flex items-center justify-center">
        <p className="text-sm text-[#A89F88]">Loading…</p>
      </div>
    )
  }

  return isLoggedIn ? <Navigate to="/" replace /> : children
}
