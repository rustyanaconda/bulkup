/**
 * CalorieBar — live progress bar showing eaten vs planned vs target.
 *
 * Props:
 *   eaten   — kcal from done meals
 *   planned — kcal from upcoming meals
 *   target  — daily kcal goal (from TDEE + surplus)
 */
export default function CalorieBar({ eaten = 0, planned = 0, target = 3240 }) {
  const eatenPct   = Math.min(100, (eaten   / target) * 100)
  const plannedPct = Math.min(100 - eatenPct, (planned / target) * 100)
  const remaining  = Math.max(0, target - eaten)
  const surplusHit = remaining === 0

  return (
    <div className="bg-[#152A1E] rounded-2xl p-4 border border-[#1E3A2A]">
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-semibold text-[#5C8C6E] uppercase tracking-wide">
          Today's progress
        </span>
        <span className="text-sm font-bold text-green-400">
          {eaten.toLocaleString()} / {target.toLocaleString()} kcal
        </span>
      </div>

      {/* Multi-segment bar */}
      <div className="h-2.5 bg-[#1A2A1A] rounded-full overflow-hidden flex mb-3">
        <div
          className="h-full bg-gradient-to-r from-green-500 to-teal-400 rounded-l-full
                     transition-all duration-500"
          style={{ width: `${eatenPct}%` }}
        />
        <div
          className="h-full bg-[#1E4A2A] transition-all duration-500"
          style={{ width: `${plannedPct}%` }}
        />
      </div>

      {/* Legend */}
      <div className="flex justify-between items-center text-xs text-[#5C8C6E]">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span>Eaten</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#1E4A2A] border border-green-900" />
          <span>Planned</span>
        </div>
        <span className={surplusHit ? 'text-green-400 font-semibold' : 'text-orange-400 font-semibold'}>
          {surplusHit
            ? '🎉 Surplus hit!'
            : `${remaining.toLocaleString()} kcal to go`}
        </span>
      </div>
    </div>
  )
}
