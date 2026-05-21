import { useState, useEffect, useCallback } from 'react'
import { authFetch } from '../utils/api'

export function useCalories() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await authFetch('/calories/today')
      const json = await res.json()
      setData(json)
    } catch (err) {
      if (err.message !== 'Unauthorized') setError(err.message)
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
