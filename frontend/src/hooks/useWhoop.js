import { useState } from 'react'
import { authFetch } from '../utils/api'

export function useWhoop() {
  const [connected,  setConnected]  = useState(false)
  const [burnedKcal, setBurnedKcal] = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)

  async function connectWhoop() {
    const res  = await authFetch('/whoop/connect')
    const data = await res.json()
    window.location.href = data.auth_url
  }

  async function fetchTodaysBurn() {
    setLoading(true)
    setError(null)
    try {
      const res  = await authFetch('/whoop/calories/today')
      const data = await res.json()
      setBurnedKcal(data.burned_kcal)
      setConnected(true)
    } catch (err) {
      if (err.message !== 'Unauthorized') setError('Could not fetch Whoop data')
      setBurnedKcal(null)
    } finally {
      setLoading(false)
    }
  }

  function disconnect() {
    setBurnedKcal(null)
    setConnected(false)
  }

  return { connected, burnedKcal, loading, error, connectWhoop, fetchTodaysBurn, disconnect }
}
