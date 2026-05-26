import { useCalories } from '../hooks/useCalories'
import CalorieBar      from '../components/calories/CalorieBar'
import { useMeals }    from '../hooks/useMeals'

export default function Home() {
  const { eaten, target, benchmark, whoop, loading } = useCalories()
  const { planned } = useMeals()

  const expectedBurn  = benchmark?.expected_burn ?? null
  const burnedSoFar   = whoop.burned_so_far
  const whoopLive     = whoop.connected && burnedSoFar != null

  // Insight: compare live burn to expected full-day burn
  let insightLine = null
  if (whoopLive && expectedBurn != null) {
    const diff = burnedSoFar - expectedBurn
    insightLine = diff >= 0
      ? `+${diff.toLocaleString()} vs. a typical day — more active than usual.`
      : `${burnedSoFar.toLocaleString()} of ~${expectedBurn.toLocaleString()} expected so far today.`
  }

  return (
    <div className="p-4 pb-24">
      <div className="mb-4">
        <p className="text-sm text-[#6B7B8C]">Good morning</p>
        <h1 className="text-2xl font-bold text-[#1A2E45]">Clean Bulk Plan</h1>
      </div>

      {/* Weight progress */}
      <div className="bg-white rounded-2xl p-4 border border-[#E3DBC9] mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-[#6B7B8C] uppercase tracking-wide font-semibold">Weight Goal</span>
          <span className="text-xs text-[#6B7B8C]">174 / 180 lbs</span>
        </div>
        <div className="h-2 bg-[#EFE8D8] rounded-full overflow-hidden">
          <div className="h-full bg-[#1A2E45] rounded-full" style={{ width: '80%' }} />
        </div>
        <div className="flex justify-between mt-3 text-center">
          <div>
            <div className="text-xl font-bold text-[#1A2E45]">150</div>
            <div className="text-xs text-[#A89F88]">Start</div>
          </div>
          <div className="text-[#A89F88] text-lg self-center">→</div>
          <div>
            <div className="text-xl font-bold text-[#2A5A3E]">174</div>
            <div className="text-xs text-[#A89F88]">Current</div>
          </div>
          <div className="text-[#A89F88] text-lg self-center">→</div>
          <div>
            <div className="text-xl font-bold text-[#1A2E45]">180</div>
            <div className="text-xs text-[#A89F88]">Goal</div>
          </div>
        </div>
      </div>

      {/* Section 1 — Eaten progress bar */}
      <div className="mb-4">
        {loading
          ? <div className="bg-white rounded-2xl p-4 border border-[#E3DBC9] text-[#6B7B8C] text-sm">
              Loading calories...
            </div>
          : <CalorieBar eaten={eaten} target={target} planned={planned} />
        }
      </div>

      {/* Section 2 — Today's burn: expected vs. so far */}
      {!loading && (
        <div className="mb-4">
          <p className="text-xs text-[#A89F88] uppercase tracking-wide font-semibold mb-2">
            Today's burn
          </p>
          <div className="flex gap-3">
            {/* Card A — benchmark expected burn */}
            <div className="flex-1 bg-white rounded-2xl p-4 border border-[#E3DBC9]">
              <p className="text-xs text-[#A89F88] font-semibold mb-1">Expected</p>
              <p className="text-xl font-bold text-[#1A2E45]">
                {expectedBurn != null ? Math.round(expectedBurn).toLocaleString() : '—'}
              </p>
              <p className="text-xs text-[#6B7B8C] mt-0.5">typical day</p>
            </div>

            {/* Card B — Whoop live burn */}
            {whoop.connected ? (
              burnedSoFar != null ? (
                <div className="flex-1 bg-[#1A2E45] rounded-2xl p-4">
                  <p className="text-xs text-white/60 font-semibold mb-1">Whoop</p>
                  <p className="text-xl font-bold text-white">
                    {Math.round(burnedSoFar).toLocaleString()}
                  </p>
                  <p className="text-xs text-white/60 mt-0.5">so far today</p>
                </div>
              ) : (
                <div className="flex-1 bg-white rounded-2xl p-4 border border-[#E3DBC9]">
                  <p className="text-xs text-[#A89F88] font-semibold mb-1">Whoop</p>
                  <p className="text-xl font-bold text-[#D4CDB9]">—</p>
                  <p className="text-xs text-[#A89F88] mt-0.5">no reading yet</p>
                </div>
              )
            ) : (
              <div className="flex-1 bg-white rounded-2xl p-4 border border-[#E3DBC9]">
                <p className="text-xs text-[#A89F88] font-semibold mb-1">Whoop</p>
                <p className="text-sm text-[#D4CDB9] mt-1">Not connected</p>
                <a href="/profile" className="text-xs text-[#A89F88] hover:text-[#6B7B8C] mt-1 block">
                  Connect →
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section 3 — Insight line */}
      {insightLine && (
        <p className="text-xs text-[#6B7B8C] px-1 mb-4">{insightLine}</p>
      )}
    </div>
  )
}
