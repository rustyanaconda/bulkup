/**
 * MealCard — displays one meal with tap-to-act interactions.
 *
 * Props:
 *   meal           { id, name, calories, meal_time, state }
 *   onStateChange  function(mealId, newState)
 *
 * This is the React version of what we built in the prototypes.
 * The swipe gesture logic will be added here next.
 */
import { useState } from 'react'

// Visual styles for each meal state
const STATE_CONFIG = {
  done: {
    dot:   'bg-green-400',
    badge: 'bg-green-950 text-green-400',
    label: 'Done',
    card:  'bg-[#0D2A1A] border-[#1A3A22]',
    text:  'text-[#5C8C6E]',
    kcal:  'text-green-400',
  },
  skipped: {
    dot:   'bg-red-500',
    badge: 'bg-red-950 text-red-400',
    label: 'Skipped',
    card:  'bg-[#111E15] border-[#1E2A1E]',
    text:  'text-[#3A5C48] line-through',
    kcal:  'text-red-400',
  },
  upcoming: {
    dot:   'bg-[#1E3028] border border-[#3A5C48]',
    badge: 'bg-[#1A2A3A] text-blue-400',
    label: 'Up next',
    card:  'bg-[#152A1E] border-[#1E3A2A] hover:border-[#2A4A32]',
    text:  'text-white',
    kcal:  'text-[#A3CEB5]',
  },
  missed: {
    dot:   'bg-[#1E3028] border border-[#3A5C48]',
    badge: 'bg-[#1E2A1A] text-orange-400',
    label: 'Missed',
    card:  'bg-[#152A1E] border-[#1E3A2A] hover:border-[#2A4A32]',
    text:  'text-white',
    kcal:  'text-[#A3CEB5]',
  },
}

export default function MealCard({ meal, onStateChange }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const cfg = STATE_CONFIG[meal.state] || STATE_CONFIG.upcoming

  function act(newState) {
    onStateChange(meal.id, newState)
    setMenuOpen(false)
  }

  return (
    <div className="mb-2">
      {/* Card row */}
      <div
        onClick={() => setMenuOpen(o => !o)}
        className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer
                    transition-colors ${cfg.card}`}
      >
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />

        <div className="flex-1 min-w-0">
          <div className={`text-sm font-semibold truncate ${cfg.text}`}>
            {meal.name}
          </div>
          <div className="text-xs text-[#5C8C6E] mt-0.5 capitalize">
            {meal.meal_time}
          </div>
        </div>

        <div className={`text-xs font-medium ${cfg.kcal}`}>
          {meal.calories} kcal
        </div>

        <div className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${cfg.badge}`}>
          {cfg.label}
        </div>
      </div>

      {/* Context menu */}
      {menuOpen && (
        <div className="mt-1 bg-[#1A2A1E] rounded-xl border border-[#2A3A2A] overflow-hidden">

          {meal.state !== 'done' && (
            <MenuItem
              icon="✓" iconColor="text-green-400"
              label="Mark as done" sub="Log it as eaten"
              onClick={() => act('done')}
            />
          )}

          {meal.state !== 'skipped' && meal.state !== 'done' && (
            <MenuItem
              icon="✕" iconColor="text-red-400"
              label="Skip this meal" sub={`${meal.calories} kcal will be redistributed`}
              onClick={() => act('skipped')}
            />
          )}

          {(meal.state === 'skipped' || meal.state === 'done') && (
            <MenuItem
              icon="↩" iconColor="text-[#888780]"
              label="Undo" sub={`Restore ${meal.name}`}
              onClick={() => act('upcoming')}
            />
          )}

          <MenuItem
            icon="✕" iconColor="text-[#5C8C6E]"
            label="Cancel" sub=""
            onClick={() => setMenuOpen(false)}
          />
        </div>
      )}
    </div>
  )
}

// Small helper component — keeps the menu items DRY
function MenuItem({ icon, iconColor, label, sub, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 text-left
                 hover:bg-[#1E3028] transition-colors border-b border-[#152A1E]
                 last:border-b-0"
    >
      <span className={`text-base w-5 text-center ${iconColor}`}>{icon}</span>
      <div>
        <div className="text-sm font-semibold text-white">{label}</div>
        {sub && <div className="text-xs text-[#5C8C6E]">{sub}</div>}
      </div>
    </button>
  )
}
