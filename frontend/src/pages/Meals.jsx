import { useState } from 'react'
import { useMeals }    from '../hooks/useMeals'
import { useCalories } from '../hooks/useCalories'
import MealCard        from '../components/meals/MealCard'
import CalorieBar      from '../components/calories/CalorieBar'

const MEAL_TIMES = ['breakfast', 'lunch', 'dinner', 'snack']

const EMPTY_FORM = { name: '', calories: '', meal_time: 'breakfast' }

function AddMealModal({ onClose, onAdd }) {
  const [form,    setForm]    = useState(EMPTY_FORM)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState(null)

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await onAdd({
        name:      form.name.trim(),
        calories:  parseInt(form.calories, 10),
        meal_time: form.meal_time,
      })
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const inputClass = `w-full bg-[#F5EFE0] border border-[#E3DBC9] rounded-xl px-3 py-2.5
                      text-sm text-[#1A2E45] placeholder-[#A89F88] focus:outline-none
                      focus:border-[#1A2E45]`

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Semi-transparent overlay */}
      <div className="absolute inset-0 bg-[#1A2E45]/30" />

      {/* Sheet */}
      <div className="relative w-full max-w-md bg-white rounded-t-3xl p-6
                      shadow-xl border-t border-[#E3DBC9]">

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-[#1A2E45]">Add meal</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full
                       bg-[#EFE8D8] text-[#6B7B8C] hover:bg-[#E3DBC9] transition-colors
                       text-sm font-semibold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="block text-xs text-[#6B7B8C] uppercase tracking-wide font-semibold mb-1.5">
              Meal name
            </label>
            <input
              type="text"
              required
              autoFocus
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Salmon rice bowl"
              className={inputClass}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-[#6B7B8C] uppercase tracking-wide font-semibold mb-1.5">
                Calories
              </label>
              <input
                type="number"
                required
                min="1"
                max="9999"
                value={form.calories}
                onChange={e => set('calories', e.target.value)}
                placeholder="650"
                className={inputClass}
              />
            </div>

            <div className="flex-1">
              <label className="block text-xs text-[#6B7B8C] uppercase tracking-wide font-semibold mb-1.5">
                Meal time
              </label>
              <select
                value={form.meal_time}
                onChange={e => set('meal_time', e.target.value)}
                className={`${inputClass} capitalize`}
              >
                {MEAL_TIMES.map(t => (
                  <option key={t} value={t} className="capitalize">{t}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <p className="text-sm text-[#A32D2D] bg-[#A32D2D]/10 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving || !form.name.trim() || !form.calories}
            className="w-full py-3 rounded-xl bg-[#1A2E45] hover:bg-[#152639]
                       disabled:opacity-40 text-white text-sm font-semibold transition-colors"
          >
            {saving ? 'Adding…' : 'Add meal'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function Meals() {
  const { meals, loading, error, updateMealState, addMeal, eaten, planned } = useMeals()
  const { target } = useCalories()
  const [showModal, setShowModal] = useState(false)

  if (loading) return (
    <div className="p-4 pb-24 text-[#6B7B8C] text-sm">Loading meals...</div>
  )

  if (error) return (
    <div className="p-4 pb-24 text-[#A32D2D] text-sm">
      Couldn't load meals: {error}
    </div>
  )

  return (
    <div className="p-4 pb-24">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-[#1A2E45]">Today's Meals</h1>
        <p className="text-xs text-[#6B7B8C] mt-0.5">
          Tap a meal to mark done or skip
        </p>
      </div>

      <div className="mb-4">
        <CalorieBar eaten={eaten} planned={planned} target={target} />
      </div>

      <div>
        {meals.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 border border-[#E3DBC9] text-center">
            <p className="text-[#6B7B8C] text-sm">No meals planned for today.</p>
            <p className="text-[#A89F88] text-xs mt-1">
              Tap the button below to add your first meal.
            </p>
          </div>
        ) : (
          meals.map(meal => (
            <MealCard
              key={meal.id}
              meal={meal}
              onStateChange={updateMealState}
            />
          ))
        )}
      </div>

      {/* Add meal button */}
      <button
        onClick={() => setShowModal(true)}
        className="mt-4 w-full py-3 rounded-2xl bg-[#1A2E45] hover:bg-[#152639]
                   text-white text-sm font-semibold transition-colors
                   flex items-center justify-center gap-2"
      >
        <span className="text-lg leading-none">+</span>
        Add meal
      </button>

      {showModal && (
        <AddMealModal
          onClose={() => setShowModal(false)}
          onAdd={addMeal}
        />
      )}
    </div>
  )
}
