import { useState, useEffect } from 'react'
import { authFetch } from '../utils/api'

export function useMeals() {
  const [meals,   setMeals]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    fetchMeals()
  }, [])

  async function fetchMeals() {
    try {
      const res  = await authFetch('/meals/today')
      const data = await res.json()
      setMeals(data.meals ?? [])
    } catch (err) {
      if (err.message !== 'Unauthorized') setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function updateMealState(mealId, newState) {
    // Optimistic update — feels instant, rolls back on server failure
    setMeals(prev =>
      prev.map(m => m.id === mealId ? { ...m, state: newState } : m)
    )

    try {
      await authFetch(`/meals/${mealId}/state`, {
        method: 'PATCH',
        body:   JSON.stringify({ meal_id: mealId, state: newState }),
      })
    } catch {
      fetchMeals()
    }
  }

  async function addMeal({ name, calories, meal_time, tag_ids = [] }) {
    const res  = await authFetch('/meals', {
      method: 'POST',
      body:   JSON.stringify({ name, calories, meal_time, tag_ids }),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.detail || 'Failed to add meal')
    }
    const meal = await res.json()
    setMeals(prev => [...prev, meal])
    return meal
  }

  const eaten   = meals.reduce((sum, m) => m.state === 'done'                             ? sum + m.calories : sum, 0)
  const planned = meals.reduce((sum, m) => m.state === 'upcoming' || m.state === 'missed' ? sum + m.calories : sum, 0)
  const skipped = meals.reduce((sum, m) => m.state === 'skipped'                          ? sum + m.calories : sum, 0)

  return { meals, loading, error, updateMealState, addMeal, eaten, planned, skipped }
}
