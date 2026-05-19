import { useCalories } from '../hooks/useCalories'
import CalorieBar      from '../components/calories/CalorieBar'
import { useMeals }    from '../hooks/useMeals'

export default function Home() {
  const { target, burned, whoopConnected, loading } = useCalories()
  const { eaten, planned }                          = useMeals()

  return (
    <div className="p-4 pb-24">
      <div className="mb-4">
        <p className="text-sm text-[#5C8C6E]">Good morning</p>
        <h1 className="text-2xl font-bold text-white">Clean Bulk Plan</h1>
      </div>

      {/* Weight progress */}
      <div className="bg-[#152A1E] rounded-2xl p-4 border border-[#1E3A2A] mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-[#5C8C6E] uppercase tracking-wide font-semibold">Weight Goal</span>
          <span className="text-xs text-[#A3CEB5]">174 / 180 lbs</span>
        </div>
        <div className="h-2 bg-[#1E3028] rounded-full overflow-hidden">
          <div className="h-full bg-green-400 rounded-full" style={{ width: '80%' }} />
        </div>
        <div className="flex justify-between mt-3 text-center">
          <div>
            <div className="text-xl font-bold text-white">150</div>
            <div className="text-xs text-[#5C8C6E]">Start</div>
          </div>
          <div className="text-[#5C8C6E] text-lg self-center">→</div>
          <div>
            <div className="text-xl font-bold text-green-400">174</div>
            <div className="text-xs text-[#5C8C6E]">Current</div>
          </div>
          <div className="text-[#5C8C6E] text-lg self-center">→</div>
          <div>
            <div className="text-xl font-bold text-white">180</div>
            <div className="text-xs text-[#5C8C6E]">Goal</div>
          </div>
        </div>
      </div>

      {/* Calorie bar */}
      <div className="mb-4">
        {loading
          ? <div className="bg-[#152A1E] rounded-2xl p-4 border border-[#1E3A2A] text-[#5C8C6E] text-sm">
              Loading calories...
            </div>
          : <CalorieBar eaten={eaten} planned={planned} target={target} />
        }
      </div>

      {/* Whoop burn — only shown when connected and data is available */}
      {whoopConnected && burned !== null && (
        <div className="bg-[#152A1E] rounded-2xl p-4 border border-[#1E3A2A] mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-[#5C8C6E] uppercase tracking-wide font-semibold">
              Whoop — Today's Burn
            </span>
            <span className="text-xs text-[#5C8C6E]">live</span>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <div className="text-2xl font-bold text-white">{burned.toLocaleString()}</div>
              <div className="text-xs text-[#5C8C6E]">kcal burned</div>
            </div>
            <div className="text-right">
              <div className={`text-lg font-bold ${eaten - burned >= 0 ? 'text-green-400' : 'text-orange-400'}`}>
                {eaten >= burned
                  ? `+${(eaten - burned).toLocaleString()}`
                  : `${(eaten - burned).toLocaleString()}`}
              </div>
              <div className="text-xs text-[#5C8C6E]">net surplus</div>
            </div>
          </div>
        </div>
      )}

      {/* Prompt to connect Whoop if not yet linked */}
      {!whoopConnected && !loading && (
        <div className="bg-[#152A1E] rounded-2xl p-4 border border-[#1E3A2A] text-center">
          <p className="text-[#5C8C6E] text-sm mb-2">Connect Whoop for live burn data</p>
          <a href="/profile" className="text-green-400 text-sm font-semibold">
            Go to Profile →
          </a>
        </div>
      )}
    </div>
  )
}
