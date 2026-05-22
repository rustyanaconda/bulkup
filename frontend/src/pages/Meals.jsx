import { useState, useEffect } from 'react'
import { useMeals }    from '../hooks/useMeals'
import { useCalories } from '../hooks/useCalories'
import CalorieBar      from '../components/calories/CalorieBar'
import { authFetch }   from '../utils/api'

// ─── constants ────────────────────────────────────────────────────────────────

const MEAL_TIMES  = ['breakfast', 'lunch', 'dinner', 'snack']
const EMPTY_FORM  = { name: '', calories: '', meal_time: 'breakfast' }
const TAG_GROUPS  = [
  { label: 'Tags',    type: 'primary'     },
  { label: 'Dietary', type: 'restriction' },
  { label: 'More',    type: 'secondary'   },
]
const MEAL_TIME_ORDER = ['breakfast', 'lunch', 'dinner', 'snack']
const TAG_CHIP = {
  primary:     'bg-[#1A2E45]/10 text-[#1A2E45]',
  restriction: 'bg-[#B07B2C]/10 text-[#B07B2C]',
}

// ─── tier 1: compact rows (earlier today) ─────────────────────────────────────

function CompactMealRow({ meal, onStateChange }) {
  const [open, setOpen] = useState(false)

  const dot = {
    done:    'bg-[#2A5A3E]',
    skipped: 'bg-[#A32D2D]',
    missed:  'bg-[#D4CDB9]',
  }[meal.state] ?? 'bg-[#D4CDB9]'

  const nameClass = meal.state === 'skipped'
    ? 'line-through text-[#A89F88]'
    : 'text-[#6B7B8C]'

  return (
    <div className="mb-1">
      <div
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer
                   hover:bg-[#EFE8D8] transition-colors"
      >
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
        <span className={`text-sm flex-1 truncate ${nameClass}`}>{meal.name}</span>
        <span className="text-xs text-[#A89F88]">{meal.calories} kcal</span>
      </div>

      {open && (
        <div className="flex gap-2 px-3 pb-1">
          <button
            onClick={() => { onStateChange(meal.id, 'upcoming'); setOpen(false) }}
            className="text-xs px-3 py-1 rounded-lg border border-[#E3DBC9]
                       text-[#6B7B8C] hover:bg-[#EFE8D8] transition-colors"
          >
            ↩ Undo
          </button>
          <button
            onClick={() => setOpen(false)}
            className="text-xs px-3 py-1 rounded-lg text-[#A89F88]
                       hover:text-[#6B7B8C] transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

// ─── tier 2: hero card (up next) ──────────────────────────────────────────────

function HeroMealCard({ meal, onStateChange }) {
  const visibleTags = (meal.tags ?? []).filter(
    t => t.tag_type === 'primary' || t.tag_type === 'restriction'
  )

  return (
    <div className="bg-white rounded-2xl border border-[#E3DBC9] overflow-hidden">
      {/* Gradient image placeholder */}
      <div className="h-36 bg-gradient-to-br from-[#1A2E45] to-[#D4CDB9]
                      relative flex items-end p-3">
        <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider
                         bg-white/15 px-2 py-0.5 rounded-full">
          Up next
        </span>
        <span className="ml-auto text-[10px] text-white/60 capitalize font-medium">
          {meal.meal_time}
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-lg font-bold text-[#1A2E45] leading-snug mb-0.5">
          {meal.name}
        </h3>
        <p className="text-sm text-[#6B7B8C] mb-3">{meal.calories} kcal</p>

        {visibleTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {visibleTags.map(tag => (
              <span
                key={tag.id}
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${TAG_CHIP[tag.tag_type]}`}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => onStateChange(meal.id, 'done')}
            className="flex-1 py-2.5 rounded-xl bg-[#1A2E45] hover:bg-[#152639]
                       text-white text-sm font-semibold transition-colors"
          >
            Mark as eaten
          </button>
          <button
            onClick={() => onStateChange(meal.id, 'skipped')}
            className="flex-1 py-2.5 rounded-xl border border-[#E3DBC9]
                       text-[#6B7B8C] text-sm font-semibold transition-colors
                       hover:border-[#D4CDB9] hover:bg-[#EFE8D8]"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── tier 3: medium cards (later) ─────────────────────────────────────────────

function LaterMealCard({ meal, onStateChange }) {
  const [open, setOpen] = useState(false)

  const visibleTags = (meal.tags ?? []).filter(
    t => t.tag_type === 'primary' || t.tag_type === 'restriction'
  )

  return (
    <div className="mb-2">
      <div
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-3 p-3 rounded-2xl border border-[#E3DBC9]
                   bg-white hover:border-[#D4CDB9] cursor-pointer transition-colors"
      >
        {/* Small gradient thumbnail */}
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1A2E45] to-[#D4CDB9]
                        flex-shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-[#1A2E45] truncate">{meal.name}</div>
          <div className="text-xs text-[#A89F88] capitalize mt-0.5">{meal.meal_time}</div>
          {visibleTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {visibleTags.map(tag => (
                <span
                  key={tag.id}
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${TAG_CHIP[tag.tag_type]}`}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="text-xs text-[#6B7B8C] font-medium flex-shrink-0">
          {meal.calories} kcal
        </div>
      </div>

      {open && (
        <div className="mt-1 bg-[#F5EFE0] rounded-xl border border-[#E3DBC9] overflow-hidden">
          <ActionRow
            icon="✓" iconColor="text-[#2A5A3E]"
            label="Mark as eaten" sub="Log it as done"
            onClick={() => { onStateChange(meal.id, 'done');    setOpen(false) }}
          />
          <ActionRow
            icon="✕" iconColor="text-[#A32D2D]"
            label="Skip" sub={`${meal.calories} kcal redistributed`}
            onClick={() => { onStateChange(meal.id, 'skipped'); setOpen(false) }}
          />
          <ActionRow
            icon="✕" iconColor="text-[#A89F88]"
            label="Cancel" sub=""
            onClick={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  )
}

function ActionRow({ icon, iconColor, label, sub, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 text-left
                 hover:bg-[#EFE8D8] transition-colors border-b border-[#E3DBC9]
                 last:border-b-0"
    >
      <span className={`text-base w-5 text-center ${iconColor}`}>{icon}</span>
      <div>
        <div className="text-sm font-semibold text-[#1A2E45]">{label}</div>
        {sub && <div className="text-xs text-[#6B7B8C]">{sub}</div>}
      </div>
    </button>
  )
}

function SectionLabel({ children }) {
  return (
    <p className="text-xs text-[#A89F88] uppercase tracking-wide font-semibold mb-2">
      {children}
    </p>
  )
}

// ─── add-meal modal (unchanged) ───────────────────────────────────────────────

function AddMealModal({ onClose, onAdd }) {
  const [form,        setForm]        = useState(EMPTY_FORM)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState(null)
  const [allTags,     setAllTags]     = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())

  useEffect(() => {
    authFetch('/meals/tags')
      .then(r => r.json())
      .then(tags => setAllTags(tags))
      .catch(() => {})
  }, [])

  function setField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleTag(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
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
        tag_ids:   [...selectedIds],
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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center pb-16"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-[#1A2E45]/30" />

      <div className="relative w-full max-w-md bg-white rounded-t-3xl
                      shadow-xl border-t border-[#E3DBC9]
                      flex flex-col max-h-[85vh]">

        {/* Fixed header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
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

        {/* Scrollable body */}
        <form
          id="add-meal-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 space-y-4 pb-2"
        >
          <div>
            <label className="block text-xs text-[#6B7B8C] uppercase tracking-wide font-semibold mb-1.5">
              Meal name
            </label>
            <input
              type="text"
              required
              autoFocus
              value={form.name}
              onChange={e => setField('name', e.target.value)}
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
                onChange={e => setField('calories', e.target.value)}
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
                onChange={e => setField('meal_time', e.target.value)}
                className={`${inputClass} capitalize`}
              >
                {MEAL_TIMES.map(t => (
                  <option key={t} value={t} className="capitalize">{t}</option>
                ))}
              </select>
            </div>
          </div>

          {allTags.length > 0 && (
            <div className="space-y-3 pt-1 pb-1">
              {TAG_GROUPS.map(({ label, type }) => {
                const group = allTags.filter(t => t.tag_type === type)
                if (group.length === 0) return null
                return (
                  <div key={type}>
                    <p className="text-xs text-[#A89F88] uppercase tracking-wide font-semibold mb-1.5">
                      {label}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {group.map(tag => {
                        const selected = selectedIds.has(tag.id)
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => toggleTag(tag.id)}
                            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors
                                        ${selected
                                          ? 'bg-[#1A2E45] text-white'
                                          : 'border border-[#E3DBC9] text-[#6B7B8C] hover:border-[#D4CDB9] bg-transparent'}`}
                          >
                            {tag.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {error && (
            <p className="text-sm text-[#A32D2D] bg-[#A32D2D]/10 rounded-xl px-3 py-2">
              {error}
            </p>
          )}
        </form>

        {/* Fixed footer */}
        <div className="px-6 pt-3 pb-6 flex-shrink-0 border-t border-[#E3DBC9]">
          <button
            type="submit"
            form="add-meal-form"
            disabled={saving || !form.name.trim() || !form.calories}
            className="w-full py-3 rounded-xl bg-[#1A2E45] hover:bg-[#152639]
                       disabled:opacity-40 text-white text-sm font-semibold transition-colors"
          >
            {saving ? 'Adding…' : 'Add meal'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

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

  // Partition into tiers
  const earlierMeals = meals.filter(m => m.state !== 'upcoming')
  const upcomingMeals = meals
    .filter(m => m.state === 'upcoming')
    .slice()
    .sort((a, b) => MEAL_TIME_ORDER.indexOf(a.meal_time) - MEAL_TIME_ORDER.indexOf(b.meal_time))
  const heroMeal   = upcomingMeals[0] ?? null
  const laterMeals = upcomingMeals.slice(1)

  const hasAnyMeals = meals.length > 0

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

      {!hasAnyMeals ? (
        <div className="bg-white rounded-2xl p-6 border border-[#E3DBC9] text-center mb-4">
          <p className="text-[#6B7B8C] text-sm">No meals planned for today.</p>
          <p className="text-[#A89F88] text-xs mt-1">
            Tap the button below to add your first meal.
          </p>
        </div>
      ) : (
        <>
          {/* Tier 1 — Earlier today */}
          {earlierMeals.length > 0 && (
            <div className="mb-5">
              <SectionLabel>Earlier today</SectionLabel>
              {earlierMeals.map(meal => (
                <CompactMealRow key={meal.id} meal={meal} onStateChange={updateMealState} />
              ))}
            </div>
          )}

          {/* Tier 2 — Up next (hero) */}
          {heroMeal && (
            <div className="mb-5">
              <SectionLabel>Up next</SectionLabel>
              <HeroMealCard meal={heroMeal} onStateChange={updateMealState} />
            </div>
          )}

          {/* Tier 3 — Later */}
          {laterMeals.length > 0 && (
            <div className="mb-5">
              <SectionLabel>Later</SectionLabel>
              {laterMeals.map(meal => (
                <LaterMealCard key={meal.id} meal={meal} onStateChange={updateMealState} />
              ))}
            </div>
          )}
        </>
      )}

      <button
        onClick={() => setShowModal(true)}
        className="w-full py-3 rounded-2xl bg-[#1A2E45] hover:bg-[#152639]
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
