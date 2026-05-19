/**
 * useCalories — fetches the unified calorie picture for today.
 * Returns eaten (from meal state), burned (Whoop), and target (TDEE + surplus).
 */
import { useState, useEffect, useCallback } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export function useCalories() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch(`${API}/calories/today`)
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return {
    eaten:          data?.eaten           ?? 0,
    burned:         data?.burned          ?? null,
    target:         data?.target          ?? 3240,
    breakdown:      data?.breakdown       ?? null,
    whoopConnected: data?.whoop_connected ?? false,
    loading,
    error,
    refetch: load,
  }
}
