/**
 * WhoopCallback — transient page that handles the OAuth redirect.
 *
 * Flow:
 *   1. Whoop redirects here with ?code=XXX
 *   2. This page POSTs the code to the backend
 *   3. On success, navigates to Home; on error, shows a retry link
 */
import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function WhoopCallback() {
  const [searchParams] = useSearchParams()
  const navigate       = useNavigate()
  const [status, setStatus] = useState('connecting') // 'connecting' | 'success' | 'error'
  const [error,  setError]  = useState(null)

  // Guard against React StrictMode running the effect twice in dev
  const called = useRef(false)

  useEffect(() => {
    if (called.current) return
    called.current = true

    const code = searchParams.get('code')
    if (!code) {
      setStatus('error')
      setError('No authorization code in the redirect URL. Try connecting again.')
      return
    }

    async function exchange() {
      try {
        const res = await fetch(`${API}/whoop/callback`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ code }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.detail || 'Token exchange failed')
        }
        setStatus('success')
        setTimeout(() => navigate('/'), 1500)
      } catch (err) {
        setStatus('error')
        setError(err.message)
      }
    }

    exchange()
  }, [])

  return (
    <div className="min-h-screen bg-[#0D1A12] flex items-center justify-center p-6">
      <div className="text-center max-w-xs">
        {status === 'connecting' && (
          <>
            <div className="text-5xl mb-5 animate-pulse">⌛</div>
            <p className="text-white font-semibold text-lg">Connecting Whoop…</p>
            <p className="text-[#5C8C6E] text-sm mt-2">Exchanging authorization code</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-5xl mb-5">✓</div>
            <p className="text-green-400 font-semibold text-lg">Whoop connected!</p>
            <p className="text-[#5C8C6E] text-sm mt-2">Taking you home…</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-5xl mb-5">✕</div>
            <p className="text-red-400 font-semibold text-lg">Connection failed</p>
            <p className="text-[#5C8C6E] text-sm mt-3 mb-5">{error}</p>
            <button
              onClick={() => navigate('/profile')}
              className="px-6 py-2.5 bg-[#152A1E] border border-[#1E3A2A]
                         text-white rounded-xl text-sm font-semibold"
            >
              Back to Profile
            </button>
          </>
        )}
      </div>
    </div>
  )
}
