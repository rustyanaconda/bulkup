import { useState, useEffect } from 'react'
import { Link }                from 'react-router-dom'
import { useCalories }         from '../hooks/useCalories'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function Profile() {
  const { breakdown, whoopConnected } = useCalories()

  const [connected,       setConnected]       = useState(false)
  const [credentialsSet,  setCredentialsSet]  = useState(false)
  const [connecting,      setConnecting]      = useState(false)
  const [connectError,    setConnectError]    = useState(null)

  const [clientId,        setClientId]        = useState('')
  const [clientSecret,    setClientSecret]    = useState('')
  const [savingCreds,     setSavingCreds]     = useState(false)
  const [credsError,      setCredsError]      = useState(null)

  useEffect(() => {
    fetch(`${API}/whoop/status`)
      .then(r => r.json())
      .then(d => {
        setConnected(d.connected)
        setCredentialsSet(d.credentials_set)
      })
      .catch(() => {})
  }, [])

  async function handleSaveCredentials() {
    setSavingCreds(true)
    setCredsError(null)
    try {
      const redirectUri = `${window.location.origin}/whoop/callback`
      const res = await fetch(`${API}/whoop/credentials`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          client_id:     clientId.trim(),
          client_secret: clientSecret.trim(),
          redirect_uri:  redirectUri,
        }),
      })
      if (!res.ok) throw new Error(`Server returned ${res.status}`)
      setCredentialsSet(true)
    } catch (err) {
      setCredsError(err.message)
    } finally {
      setSavingCreds(false)
    }
  }

  async function handleConnectWhoop() {
    setConnecting(true)
    setConnectError(null)
    try {
      const res = await fetch(`${API}/whoop/connect`)
      if (!res.ok) throw new Error(`Backend returned ${res.status}`)
      const data = await res.json()
      if (!data.auth_url) throw new Error('Backend did not return an auth_url')
      window.location.href = data.auth_url
    } catch (err) {
      setConnectError(`${err.message} — API: ${API}`)
      setConnecting(false)
    }
  }

  return (
    <div className="p-4 pb-24">
      <h1 className="text-xl font-bold text-white mb-4">Profile</h1>

      {/* User stats */}
      <div className="bg-[#152A1E] rounded-2xl p-4 border border-[#1E3A2A] mb-4">
        <p className="text-xs text-[#5C8C6E] uppercase tracking-wide font-semibold mb-3">
          Your Stats
        </p>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { label: 'Weight',   value: '174 lbs'  },
            { label: 'Height',   value: '6\'2"'    },
            { label: 'Age',      value: '27'        },
            { label: 'Surplus',  value: '+500 kcal' },
            { label: 'Activity', value: 'Moderate'  },
            { label: 'Goal',     value: '180 lbs'   },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[#0D2A1A] rounded-xl p-2">
              <div className="text-sm font-bold text-white">{value}</div>
              <div className="text-[10px] text-[#5C8C6E] mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* TDEE breakdown */}
      {breakdown && (
        <div className="bg-[#152A1E] rounded-2xl p-4 border border-[#1E3A2A] mb-4">
          <p className="text-xs text-[#5C8C6E] uppercase tracking-wide font-semibold mb-3">
            Today's Target ({breakdown.source === 'whoop' ? 'Whoop-powered' : 'estimated'})
          </p>
          <div className="space-y-2">
            {[
              { label: 'BMR',      value: breakdown.bmr      },
              { label: 'Activity', value: breakdown.activity  },
              { label: 'Surplus',  value: breakdown.surplus   },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-[#5C8C6E]">{label}</span>
                <span className="text-white font-medium">{value.toLocaleString()} kcal</span>
              </div>
            ))}
            <div className="border-t border-[#1E3A2A] pt-2 flex justify-between text-sm">
              <span className="text-[#A3CEB5] font-semibold">Total target</span>
              <span className="text-green-400 font-bold">{breakdown.target.toLocaleString()} kcal</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Whoop section ─────────────────────────────────────── */}
      <div className="bg-[#152A1E] rounded-2xl p-4 border border-[#1E3A2A]">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-[#5C8C6E] uppercase tracking-wide font-semibold">Whoop</p>
          <div className={`flex items-center gap-1.5 text-xs font-semibold
                           ${connected ? 'text-green-400' : 'text-[#5C8C6E]'}`}>
            <div className={`w-1.5 h-1.5 rounded-full
                             ${connected ? 'bg-green-400' : 'bg-[#3A5C48]'}`} />
            {connected ? 'Connected' : credentialsSet ? 'Not connected' : 'Setup required'}
          </div>
        </div>

        {/* State 1 — no credentials yet */}
        {!credentialsSet && !connected && (
          <>
            <p className="text-xs text-[#5C8C6E] mb-1">
              Get your credentials from{' '}
              <a
                href="https://developer-dashboard.whoop.com"
                target="_blank"
                rel="noreferrer"
                className="text-green-400 underline"
              >
                developer-dashboard.whoop.com
              </a>
              . When creating your Whoop app, set the Redirect URI to:
            </p>
            <p className="text-[10px] font-mono text-white bg-[#0D2A1A] rounded-lg px-3 py-2 mb-3 break-all">
              {window.location.origin}/whoop/callback
            </p>

            <div className="space-y-2 mb-3">
              <input
                type="text"
                placeholder="Client ID"
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                className="w-full bg-[#0D2A1A] border border-[#1E3A2A] rounded-xl px-3 py-2.5
                           text-sm text-white placeholder-[#3A5C48] focus:outline-none
                           focus:border-green-700"
              />
              <input
                type="password"
                placeholder="Client Secret"
                value={clientSecret}
                onChange={e => setClientSecret(e.target.value)}
                className="w-full bg-[#0D2A1A] border border-[#1E3A2A] rounded-xl px-3 py-2.5
                           text-sm text-white placeholder-[#3A5C48] focus:outline-none
                           focus:border-green-700"
              />
            </div>

            <button
              onClick={handleSaveCredentials}
              disabled={savingCreds || !clientId || !clientSecret}
              className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500
                         disabled:opacity-40 text-white text-sm font-semibold transition-colors"
            >
              {savingCreds ? 'Saving…' : 'Save credentials'}
            </button>
            {credsError && (
              <p className="mt-2 text-xs text-red-400">{credsError}</p>
            )}
          </>
        )}

        {/* State 2 — credentials saved, not yet OAuth'd */}
        {credentialsSet && !connected && (
          <>
            <button
              onClick={handleConnectWhoop}
              disabled={connecting}
              className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500
                         disabled:opacity-50 text-white text-sm font-semibold transition-colors"
            >
              {connecting ? 'Redirecting to Whoop…' : 'Connect Whoop'}
            </button>
            {connectError && (
              <p className="mt-3 text-xs text-red-400 break-all">{connectError}</p>
            )}
            <button
              onClick={() => { setCredentialsSet(false); setClientId(''); setClientSecret('') }}
              className="mt-2 w-full py-2 text-xs text-[#5C8C6E] hover:text-white transition-colors"
            >
              Re-enter credentials
            </button>
          </>
        )}

        {/* State 3 — connected */}
        {connected && (
          <p className="text-xs text-[#5C8C6E]">
            Calorie burn is being pulled from your Whoop automatically.
            {!whoopConnected && ' Wear your Whoop today for live data.'}
          </p>
        )}
      </div>

      <div className="mt-8 text-center">
        <Link to="/privacy" className="text-xs text-[#3A5C48] hover:text-[#5C8C6E] transition-colors">
          Privacy Policy
        </Link>
      </div>
    </div>
  )
}
