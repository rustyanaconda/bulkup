import { useState, useEffect } from 'react'
import { Link, useNavigate }   from 'react-router-dom'
import { useCalories }         from '../hooks/useCalories'
import { authFetch }           from '../utils/api'
import { useAuth }             from '../context/AuthContext'

export default function Profile() {
  const { benchmark, whoop } = useCalories()
  const { logout } = useAuth()
  const navigate   = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const [connected,    setConnected]    = useState(false)
  const [connecting,   setConnecting]   = useState(false)
  const [connectError, setConnectError] = useState(null)

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await authFetch('/whoop/status')
        const d   = await res.json()
        setConnected(d.connected)
      } catch {}
    }
    checkStatus()
  }, [])

  async function handleConnectWhoop() {
    setConnecting(true)
    setConnectError(null)
    try {
      const res = await authFetch('/whoop/connect')
      if (!res.ok) throw new Error(`Backend returned ${res.status}`)
      const data = await res.json()
      if (!data.auth_url) throw new Error('Backend did not return an auth_url')
      window.location.href = data.auth_url
    } catch (err) {
      if (err.message !== 'Unauthorized') {
        setConnectError(err.message)
        setConnecting(false)
      }
    }
  }

  return (
    <div className="p-4 pb-24">
      <h1 className="text-xl font-bold text-[#1A2E45] mb-4">Profile</h1>

      {/* User stats */}
      <div className="bg-white rounded-2xl p-4 border border-[#E3DBC9] mb-4">
        <p className="text-xs text-[#6B7B8C] uppercase tracking-wide font-semibold mb-3">
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
            <div key={label} className="bg-[#EFE8D8] rounded-xl p-2">
              <div className="text-sm font-bold text-[#1A2E45]">{value}</div>
              <div className="text-[10px] text-[#6B7B8C] mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* TDEE breakdown */}
      {benchmark && (
        <div className="bg-white rounded-2xl p-4 border border-[#E3DBC9] mb-4">
          <p className="text-xs text-[#6B7B8C] uppercase tracking-wide font-semibold mb-3">
            Today's Target
          </p>
          <div className="space-y-2">
            {[
              { label: 'BMR',      value: benchmark.bmr      },
              { label: 'Activity', value: benchmark.activity  },
              { label: 'Surplus',  value: benchmark.surplus   },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-[#6B7B8C]">{label}</span>
                <span className="text-[#2C2C2A] font-medium">{value.toLocaleString()} kcal</span>
              </div>
            ))}
            <div className="border-t border-[#E3DBC9] pt-2 flex justify-between text-sm">
              <span className="text-[#1A2E45] font-semibold">Total target</span>
              <span className="text-[#1A2E45] font-bold">{benchmark.target.toLocaleString()} kcal</span>
            </div>
          </div>
        </div>
      )}

      {/* Whoop section */}
      <div className="bg-white rounded-2xl p-4 border border-[#E3DBC9]">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-[#6B7B8C] uppercase tracking-wide font-semibold">Whoop</p>
          <div className={`flex items-center gap-1.5 text-xs font-semibold
                           ${connected ? 'text-[#2A5A3E]' : 'text-[#6B7B8C]'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-[#2A5A3E]' : 'bg-[#D4CDB9]'}`} />
            {connected ? 'Connected' : 'Not connected'}
          </div>
        </div>

        {connected ? (
          <p className="text-xs text-[#6B7B8C]">
            Calorie burn is being pulled from your Whoop automatically.
            {!whoop.connected && ' Wear your Whoop today for live data.'}
          </p>
        ) : (
          <>
            <p className="text-sm text-[#6B7B8C] mb-3">
              Connect your Whoop to power your calorie targets with real burn data.
            </p>
            <button
              onClick={handleConnectWhoop}
              disabled={connecting}
              className="w-full py-3 rounded-xl bg-[#1A2E45] hover:bg-[#152639]
                         disabled:opacity-50 text-white text-sm font-semibold transition-colors"
            >
              {connecting ? 'Redirecting to Whoop…' : 'Connect Whoop'}
            </button>
            {connectError && (
              <p className="mt-3 text-xs text-[#A32D2D] break-all">{connectError}</p>
            )}
          </>
        )}
      </div>

      <div className="mt-8 text-center">
        <Link to="/privacy" className="text-xs text-[#A89F88] hover:text-[#6B7B8C] transition-colors">
          Privacy Policy
        </Link>
      </div>

      <div className="mt-4 pb-2">
        <button
          onClick={handleLogout}
          className="w-full py-2.5 rounded-xl border border-[#A32D2D]/30 text-[#A32D2D]/60
                     hover:border-[#A32D2D] hover:text-[#A32D2D] text-sm transition-colors"
        >
          Log out
        </button>
      </div>
    </div>
  )
}
