import { Navigate } from 'react-router-dom'
import { useAuth }  from '../context/AuthContext'

/** Requires login. Redirects to /login if the user has no token. */
export default function ProtectedRoute({ children }) {
  const { isLoggedIn } = useAuth()
  return isLoggedIn ? children : <Navigate to="/login" replace />
}

/** Rejects already-logged-in users. Redirects to / so they skip the auth pages. */
export function PublicOnlyRoute({ children }) {
  const { isLoggedIn } = useAuth()
  return isLoggedIn ? <Navigate to="/" replace /> : children
}
