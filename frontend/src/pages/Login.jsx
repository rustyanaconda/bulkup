import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function Login() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { login } = useAuth()

  const signupSuccess = location.state?.signupSuccess

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState(null)
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch(`${API}/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.detail || 'Login failed. Please try again.')
        return
      }
      login(data.token)
      navigate('/')
    } catch {
      setError('Could not reach the server. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = `w-full bg-[#F5EFE0] border border-[#E3DBC9] rounded-xl px-3 py-2.5
                      text-sm text-[#1A2E45] placeholder-[#A89F88] focus:outline-none
                      focus:border-[#1A2E45]`

  return (
    <div className="min-h-screen bg-[#F5EFE0] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1A2E45]">Mise</h1>
          <p className="text-[#6B7B8C] text-sm mt-1">Log in to your account</p>
        </div>

        {signupSuccess && (
          <div className="mb-4 text-sm text-[#2A5A3E] bg-[#2A5A3E]/10 rounded-xl px-3 py-2
                          text-center border border-[#2A5A3E]/30">
            Account created — you can now log in.
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-[#E3DBC9] space-y-4">

          <div>
            <label className="block text-xs text-[#6B7B8C] uppercase tracking-wide font-semibold mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs text-[#6B7B8C] uppercase tracking-wide font-semibold mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Your password"
              className={inputClass}
            />
          </div>

          {error && (
            <p className="text-sm text-[#A32D2D] bg-[#A32D2D]/10 rounded-xl px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#1A2E45] hover:bg-[#152639]
                       disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="text-center text-sm text-[#6B7B8C] mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-[#1A2E45] font-semibold hover:underline transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
