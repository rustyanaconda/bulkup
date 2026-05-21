import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { authFetch } from '../utils/api'

export default function WhoopCallback() {
  const [searchParams] = useSearchParams()
  const navigate       = useNavigate()
  const [status, setStatus] = useState('connecting')
  const [error,  setError]  = useState(null)

  const called = useRef(false)

  useEffect(() => {
    if (called.current) return
    called.current = true

    const whoopError = searchParams.get('error')
    if (whoopError) {
      const description = searchParams.get('error_description') || whoopError
      const hint        = searchParams.get('error_hint')
      setStatus('error')
      setError(hint ? `${description}\n\nHint: ${hint}` : description)
      return
    }

    const code = searchParams.get('code')
    if (!code) {
      setStatus('error')
      setError('No authorization code in the redirect URL. Try connecting again.')
      return
    }

    async function exchange() {
      try {
        const res = await authFetch('/whoop/callback', {
          method: 'POST',
          body:   JSON.stringify({ code }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.detail || 'Token exchange failed')
        }
        setStatus('success')
        setTimeout(() => navigate('/'), 1500)
      } catch (err) {
        if (err.message !== 'Unauthorized') {
          setStatus('error')
          setError(err.message)
        }
      }
    }

    exchange()
  }, [])

  return (
    <div className="min-h-screen bg-[#F5EFE0] flex items-center justify-center p-6">
      <div className="text-center max-w-xs">
        {status === 'connecting' && (
          <>
            <div className="text-5xl mb-5 animate-pulse">⌛</div>
            <p className="text-[#1A2E45] font-semibold text-lg">Connecting Whoop…</p>
            <p className="text-[#6B7B8C] text-sm mt-2">Exchanging authorization code</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-5xl mb-5">✓</div>
            <p className="text-[#2A5A3E] font-semibold text-lg">Whoop connected!</p>
            <p className="text-[#6B7B8C] text-sm mt-2">Taking you home…</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-5xl mb-5">✕</div>
            <p className="text-[#A32D2D] font-semibold text-lg">Connection failed</p>
            <p className="text-[#6B7B8C] text-sm mt-3 mb-5 text-left whitespace-pre-line">{error}</p>
            <button
              onClick={() => navigate('/profile')}
              className="px-6 py-2.5 bg-white border border-[#E3DBC9]
                         text-[#1A2E45] rounded-xl text-sm font-semibold
                         hover:border-[#D4CDB9] transition-colors"
            >
              Back to Profile
            </button>
          </>
        )}
      </div>
    </div>
  )
}
