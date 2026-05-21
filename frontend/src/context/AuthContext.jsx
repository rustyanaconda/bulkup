import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('mise_token'))

  function login(newToken) {
    localStorage.setItem('mise_token', newToken)
    setToken(newToken)
  }

  function logout() {
    localStorage.removeItem('mise_token')
    setToken(null)
  }

  return (
    <AuthContext.Provider value={{ token, isLoggedIn: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
