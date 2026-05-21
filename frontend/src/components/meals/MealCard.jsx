import { useState } from 'react'

const STATE_CONFIG = {
  done: {
    dot:   'bg-[#2A5A3E]',
    badge: 'bg-[#2A5A3E]/10 text-[#2A5A3E]',
    label: 'Done',
    card:  'bg-[#EFE8D8] border-[#D4CDB9]',
    text:  'text-[#6B7B8C]',
    kcal:  'text-[#2A5A3E]',
  },
  skipped: {
    dot:   'bg-[#A32D2D]',
    badge: 'bg-[#A32D2D]/10 text-[#A32D2D]',
    label: 'Skipped',
    card:  'bg-[#EFE8D8] border-[#E3DBC9]',
    text:  'text-[#A89F88] line-through',
    kcal:  'text-[#A32D2D]',
  },
  upcoming: {
    dot:   'bg-[#E3DBC9] border border-[#A89F88]',
    badge: 'bg-[#1A2E45]/10 text-[#1A2E45]',
    label: 'Up next',
    card:  'bg-white border-[#E3DBC9] hover:border-[#D4CDB9]',
    text:  'text-[#1A2E45]',
    kcal:  'text-[#6B7B8C]',
  },
  missed: {
    dot:   'bg-[#E3DBC9] border border-[#A89F88]',
    badge: 'bg-[#B07B2C]/10 text-[#B07B2C]',
    label: 'Missed',
    card:  'bg-white border-[#E3DBC9] hover:border-[#D4CDB9]',
    text:  'text-[#1A2E45]',
    kcal:  'text-[#6B7B8C]',
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
          <div className="text-xs text-[#A89F88] mt-0.5 capitalize">
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
        <div className="mt-1 bg-[#F5EFE0] rounded-xl border border-[#E3DBC9] overflow-hidden">

          {meal.state !== 'done' && (
            <MenuItem
              icon="✓" iconColor="text-[#2A5A3E]"
              label="Mark as done" sub="Log it as eaten"
              onClick={() => act('done')}
            />
          )}

          {meal.state !== 'skipped' && meal.state !== 'done' && (
            <MenuItem
              icon="✕" iconColor="text-[#A32D2D]"
              label="Skip this meal" sub={`${meal.calories} kcal will be redistributed`}
              onClick={() => act('skipped')}
            />
          )}

          {(meal.state === 'skipped' || meal.state === 'done') && (
            <MenuItem
              icon="↩" iconColor="text-[#6B7B8C]"
              label="Undo" sub={`Restore ${meal.name}`}
              onClick={() => act('upcoming')}
            />
          )}

          <MenuItem
            icon="✕" iconColor="text-[#A89F88]"
            label="Cancel" sub=""
            onClick={() => setMenuOpen(false)}
          />
        </div>
      )}
    </div>
  )
}

function MenuItem({ icon, iconColor, label, sub, onClick }) {
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
