import { createContext, useContext, useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token,          setToken]          = useState(() => localStorage.getItem('mise_token'))
  const [user,           setUser]           = useState(null)
  const [authChecking,   setAuthChecking]   = useState(!!localStorage.getItem('mise_token'))
  const [sessionExpired, setSessionExpired] = useState(false)

  function login(newToken) {
    localStorage.setItem('mise_token', newToken)
    setSessionExpired(false)
    setToken(newToken)
  }

  function logout() {
    localStorage.removeItem('mise_token')
    setToken(null)
    setUser(null)
  }

  // Validate the token on mount and whenever it changes.
  // Only /users/me is used here — feature-endpoint 401s never reach this.
  useEffect(() => {
    if (!token) {
      setAuthChecking(false)
      setUser(null)
      return
    }

    setAuthChecking(true)

    fetch(`${API}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (res.status === 401) {
          // Token is expired or invalid — clean up and signal the UI
          localStorage.removeItem('mise_token')
          setToken(null)
          setUser(null)
          setSessionExpired(true)
          return null
        }
        return res.ok ? res.json() : null
      })
      .then(data => {
        if (data) setUser(data)
      })
      .catch(() => {
        // Network error — leave the token alone; user can retry
      })
      .finally(() => setAuthChecking(false))
  }, [token])

  return (
    <AuthContext.Provider value={{
      token,
      user,
      isLoggedIn:    !!user,
      authChecking,
      sessionExpired,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
