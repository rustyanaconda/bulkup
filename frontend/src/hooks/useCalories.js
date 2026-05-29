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
    eaten:     data?.eaten     ?? null,
    target:    data?.target    ?? null,
    benchmark: data?.benchmark ?? null,
    whoop:     data?.whoop     ?? { connected: false, burned_so_far: null },
    loading,
    error,
    refetch: load,
  }
}
