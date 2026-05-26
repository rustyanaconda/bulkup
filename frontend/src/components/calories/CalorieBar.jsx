/**
 * CalorieBar — eaten progress toward the daily target.
 *
 * Props:
 *   eaten  — kcal from done meals
 *   target — daily kcal goal (benchmark-based)
 *   planned — accepted but unused (kept for Meals.jsx compat)
 */
export default function CalorieBar({ eaten = 0, target = 3240, planned = 0 }) {
  const pct       = Math.min(100, target > 0 ? (eaten / target) * 100 : 0)
  const remaining = target - eaten
  const hit       = remaining <= 0

  return (
    <div className="bg-white rounded-2xl p-4 border border-[#E3DBC9]">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-semibold text-[#6B7B8C] uppercase tracking-wide">
          Eaten
        </span>
        <span className="text-sm font-bold text-[#1A2E45]">
          {Math.round(eaten).toLocaleString()} / {Math.round(target).toLocaleString()} kcal
        </span>
      </div>

      <div className="h-2.5 bg-[#ECE5D5] rounded-full overflow-hidden mb-2">
        <div
          className="h-full bg-[#1A2E45] rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className={`text-xs font-semibold ${hit ? 'text-[#2A5A3E]' : 'text-[#6B7B8C]'}`}>
        {hit
          ? 'Target reached'
          : `${Math.round(remaining).toLocaleString()} kcal to go`}
      </p>
    </div>
  )
}
