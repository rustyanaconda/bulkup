import { useCalories } from '../hooks/useCalories'
import CalorieBar      from '../components/calories/CalorieBar'
import { useMeals }    from '../hooks/useMeals'

export default function Home() {
  const { target, burned, whoopConnected, loading } = useCalories()
  const { eaten, planned }                          = useMeals()

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

      {/* Calorie bar */}
      <div className="mb-4">
        {loading
          ? <div className="bg-white rounded-2xl p-4 border border-[#E3DBC9] text-[#6B7B8C] text-sm">
              Loading calories...
            </div>
          : <CalorieBar eaten={eaten} planned={planned} target={target} />
        }
      </div>

      {/* Whoop burn — only shown when connected and data is available */}
      {whoopConnected && burned !== null && (
        <div className="bg-white rounded-2xl p-4 border border-[#E3DBC9] mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-[#6B7B8C] uppercase tracking-wide font-semibold">
              Whoop — Today's Burn
            </span>
            <span className="text-xs text-[#A89F88]">live</span>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <div className="text-2xl font-bold text-[#1A2E45]">{burned.toLocaleString()}</div>
              <div className="text-xs text-[#6B7B8C]">kcal burned</div>
            </div>
            <div className="text-right">
              <div className={`text-lg font-bold ${eaten - burned >= 0 ? 'text-[#2A5A3E]' : 'text-[#B07B2C]'}`}>
                {eaten >= burned
                  ? `+${(eaten - burned).toLocaleString()}`
                  : `${(eaten - burned).toLocaleString()}`}
              </div>
              <div className="text-xs text-[#6B7B8C]">net surplus</div>
            </div>
          </div>
        </div>
      )}

      {/* Prompt to connect Whoop if not yet linked */}
      {!whoopConnected && !loading && (
        <div className="bg-white rounded-2xl p-4 border border-[#E3DBC9] text-center">
          <p className="text-[#6B7B8C] text-sm mb-2">Connect Whoop for live burn data</p>
          <a href="/profile" className="text-[#1A2E45] text-sm font-semibold hover:underline">
            Go to Profile →
          </a>
        </div>
      )}
    </div>
  )
}
