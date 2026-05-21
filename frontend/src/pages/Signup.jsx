import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function Signup() {
  const navigate = useNavigate()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [error,    setError]    = useState(null)
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API}/auth/signup`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.detail || 'Signup failed. Please try again.')
        return
      }
      navigate('/login', { state: { signupSuccess: true } })
    } catch {
      setError('Could not reach the server. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0D1A12] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Mise</h1>
          <p className="text-[#5C8C6E] text-sm mt-1">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#152A1E] rounded-2xl p-6 border border-[#1E3A2A] space-y-4">

          <div>
            <label className="block text-xs text-[#5C8C6E] uppercase tracking-wide font-semibold mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-[#0D2A1A] border border-[#1E3A2A] rounded-xl px-3 py-2.5
                         text-sm text-white placeholder-[#3A5C48] focus:outline-none
                         focus:border-green-700"
            />
          </div>

          <div>
            <label className="block text-xs text-[#5C8C6E] uppercase tracking-wide font-semibold mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full bg-[#0D2A1A] border border-[#1E3A2A] rounded-xl px-3 py-2.5
                         text-sm text-white placeholder-[#3A5C48] focus:outline-none
                         focus:border-green-700"
            />
          </div>

          <div>
            <label className="block text-xs text-[#5C8C6E] uppercase tracking-wide font-semibold mb-1.5">
              Confirm Password
            </label>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Re-enter your password"
              className="w-full bg-[#0D2A1A] border border-[#1E3A2A] rounded-xl px-3 py-2.5
                         text-sm text-white placeholder-[#3A5C48] focus:outline-none
                         focus:border-green-700"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-900/20 rounded-xl px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500
                       disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-[#5C8C6E] mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-green-400 font-semibold hover:text-green-300 transition-colors">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
