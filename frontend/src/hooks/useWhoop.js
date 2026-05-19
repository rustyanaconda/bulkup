/**
 * useWhoop — manages Whoop connection state and live calorie data.
 */
import { useState } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export function useWhoop() {
  const [connected,  setConnected]  = useState(false)
  const [burnedKcal, setBurnedKcal] = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)

  async function connectWhoop() {
    /**
     * Kicks off the OAuth flow:
     * 1. Ask backend for the Whoop auth URL
     * 2. Redirect user to Whoop login
     * 3. Whoop redirects back to /whoop/callback with a code
     * 4. Backend exchanges code for tokens (handled in whoop router)
     */
    const res  = await fetch(`${API}/whoop/connect`)
    const data = await res.json()
    window.location.href = data.auth_url
  }

  async function fetchTodaysBurn() {
    setLoading(true)
    setError(null)
    try {
      // In production, access token comes from DB via the backend
      // For now this is a placeholder — update once auth is wired up
      const res  = await fetch(`${API}/whoop/calories/today`)
      const data = await res.json()
      setBurnedKcal(data.burned_kcal)
      setConnected(true)
    } catch (err) {
      setError('Could not fetch Whoop data')
      setBurnedKcal(null)
    } finally {
      setLoading(false)
    }
  }

  function disconnect() {
    setBurnedKcal(null)
    setConnected(false)
    // TODO: call backend to revoke token
  }

  return { connected, burnedKcal, loading, error, connectWhoop, fetchTodaysBurn, disconnect }
}
