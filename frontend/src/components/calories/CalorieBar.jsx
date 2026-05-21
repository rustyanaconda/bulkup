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
    <div className="bg-white rounded-2xl p-4 border border-[#E3DBC9]">
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-semibold text-[#6B7B8C] uppercase tracking-wide">
          Today's progress
        </span>
        <span className="text-sm font-bold text-[#1A2E45]">
          {eaten.toLocaleString()} / {target.toLocaleString()} kcal
        </span>
      </div>

      {/* Multi-segment bar */}
      <div className="h-2.5 bg-[#EFE8D8] rounded-full overflow-hidden flex mb-3">
        <div
          className="h-full bg-[#1A2E45] rounded-l-full transition-all duration-500"
          style={{ width: `${eatenPct}%` }}
        />
        <div
          className="h-full bg-[#1A2E45]/20 transition-all duration-500"
          style={{ width: `${plannedPct}%` }}
        />
      </div>

      {/* Legend */}
      <div className="flex justify-between items-center text-xs text-[#6B7B8C]">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#1A2E45]" />
          <span>Eaten</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#1A2E45]/20 border border-[#1A2E45]/30" />
          <span>Planned</span>
        </div>
        <span className={surplusHit ? 'text-[#2A5A3E] font-semibold' : 'text-[#B07B2C] font-semibold'}>
          {surplusHit
            ? '🎉 Surplus hit!'
            : `${remaining.toLocaleString()} kcal to go`}
        </span>
      </div>
    </div>
  )
}
