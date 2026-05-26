import { useCalories } from '../hooks/useCalories'
import CalorieBar      from '../components/calories/CalorieBar'
import { useMeals }    from '../hooks/useMeals'

const RING   = 92
const STROKE = 7
const R      = (RING - STROKE) / 2          // 42.5
const CX     = RING / 2                      // 46
const CY     = RING / 2                      // 46
const CIRC   = 2 * Math.PI * R              // ~267.04

function BurnRingCard({ expectedBurn, whoop }) {
  const burnedSoFar = whoop.burned_so_far
  const live        = whoop.connected && burnedSoFar != null

  const ratio      = live && expectedBurn > 0 ? Math.min(1, burnedSoFar / expectedBurn) : 0
  const offset     = CIRC * (1 - ratio)
  const centerText = live ? `${Math.round(ratio * 100)}%` : '—'

  let whoopLabel, whoopMuted
  if (!whoop.connected) {
    whoopLabel = 'Not connected'; whoopMuted = true
  } else if (burnedSoFar == null) {
    whoopLabel = 'No reading yet'; whoopMuted = true
  } else {
    whoopLabel = `${Math.round(burnedSoFar).toLocaleString()} kcal`; whoopMuted = false
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-[#E3DBC9] mb-4">
      <p className="text-xs text-[#A89F88] uppercase tracking-wide font-semibold mb-3">
        Today's burn
      </p>

      <div className="flex items-center gap-4">
        {/* Ring */}
        <div className="relative flex-shrink-0" style={{ width: RING, height: RING }}>
          <svg width={RING} height={RING}>
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="#ECE5D5" strokeWidth={STROKE} />
            <circle
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke="#1A2E45"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${CX} ${CY})`}
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-[#1A2E45]">{centerText}</span>
          </div>
        </div>

        {/* Metrics */}
        <div className="flex-1 space-y-3">
          <div>
            <p className="text-[10px] text-[#A89F88] uppercase tracking-wide font-semibold">
              Whoop · so far today
            </p>
            <p className={`text-sm font-bold mt-0.5 ${whoopMuted ? 'text-[#D4CDB9]' : 'text-[#1A2E45]'}`}>
              {whoopLabel}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-[#A89F88] uppercase tracking-wide font-semibold">
              Expected · typical day
            </p>
            <p className="text-sm font-bold text-[#1A2E45] mt-0.5">
              {expectedBurn != null ? `${Math.round(expectedBurn).toLocaleString()} kcal` : '—'}
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs text-[#A89F88] mt-3 leading-relaxed">
        Expected is your typical daily burn. Whoop shows what you've actually burned so far.
      </p>
    </div>
  )
}

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

      {/* Section 2 — Today's burn ring */}
      {!loading && <BurnRingCard expectedBurn={expectedBurn} whoop={whoop} />}

      {/* Section 3 — Insight line */}
      {insightLine && (
        <p className="text-xs text-[#6B7B8C] px-1 mb-4">{insightLine}</p>
      )}
    </div>
  )
}
