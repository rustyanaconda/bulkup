/**
 * useMeals — fetches today's meals and handles skip/done state updates.
 *
 * Coming from Python: think of this like a class with state and methods,
 * except React re-runs the function whenever state changes and re-renders the UI.
 *
 * useState  = a variable that triggers a UI re-render when changed
 * useEffect = "run this code when the component loads" (like __init__)
 */
import { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export function useMeals() {
  const [meals,   setMeals]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  // Runs once when the component first mounts — fetches today's meals
  useEffect(() => {
    fetchMeals()
  }, [])

  async function fetchMeals() {
    try {
      const res  = await fetch(`${API}/meals/today`)
      const data = await res.json()
      setMeals(data.meals)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function updateMealState(mealId, newState) {
    /**
     * Optimistic update pattern:
     * 1. Update the UI immediately so it feels instant
     * 2. Send the change to the server in the background
     * 3. If the server fails, roll back to the real data
     *
     * This is what makes the swipe interactions feel snappy.
     */
    setMeals(prev =>
      prev.map(m => m.id === mealId ? { ...m, state: newState } : m)
    )

    try {
      await fetch(`${API}/meals/${mealId}/state`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ meal_id: mealId, state: newState }),
      })
    } catch {
      // Server failed — roll back by re-fetching real state
      fetchMeals()
    }
  }

  // Derived values — computed from meals array, like a SQL aggregate
  const eaten   = meals.filter(m => m.state === 'done')
                       .reduce((sum, m) => sum + m.calories, 0)

  const planned = meals.filter(m => m.state === 'upcoming' || m.state === 'missed')
                       .reduce((sum, m) => sum + m.calories, 0)

  const skipped = meals.filter(m => m.state === 'skipped')
                       .reduce((sum, m) => sum + m.calories, 0)

  return { meals, loading, error, updateMealState, eaten, planned, skipped }
}
