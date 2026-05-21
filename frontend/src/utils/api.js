const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

/**
 * Fetch wrapper that adds the JWT auth header and redirects to /login on 401.
 * Use this for every backend call that requires authentication.
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
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  return res
}
