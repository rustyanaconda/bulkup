const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Paths where a 401 means the session token itself is invalid/expired.
// Only these trigger a hard redirect to /login.
const AUTH_PATHS = ['/auth/', '/users/me']

/**
 * Fetch wrapper that adds the JWT auth header.
 * On 401: throws Error('Unauthorized') so callers can handle it.
 * Only hard-redirects to /login when the 401 comes from an auth-identity
 * endpoint — feature endpoints (Whoop, calories, etc.) just throw so the
 * page can render normally with that feature showing as unavailable.
 */
export async function authFetch(path, options = {}) {
  const token = localStorage.getItem('mise_token')

  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (res.status === 401) {
    const isAuthPath = AUTH_PATHS.some(p => path.startsWith(p))
    if (isAuthPath) {
      window.location.href = '/login'
    }
    throw new Error('Unauthorized')
  }

  return res
}
