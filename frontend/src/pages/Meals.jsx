import { useMeals }    from '../hooks/useMeals'
import { useCalories } from '../hooks/useCalories'
import MealCard        from '../components/meals/MealCard'
import CalorieBar      from '../components/calories/CalorieBar'

export default function Meals() {
  const { meals, loading, error, updateMealState, eaten, planned } = useMeals()
  const { target } = useCalories()

  if (loading) return (
    <div className="p-4 pb-24 text-[#6B7B8C] text-sm">Loading meals...</div>
  )

  if (error) return (
    <div className="p-4 pb-24 text-[#A32D2D] text-sm">
      Couldn't load meals: {error}
    </div>
  )

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

      <div>
        {meals.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 border border-[#E3DBC9] text-center">
            <p className="text-[#6B7B8C] text-sm">No meals planned for today.</p>
            <p className="text-[#A89F88] text-xs mt-1">
              Meals you add will appear here each day.
            </p>
          </div>
        ) : (
          meals.map(meal => (
            <MealCard
              key={meal.id}
              meal={meal}
              onStateChange={updateMealState}
            />
          ))
        )}
      </div>
    </div>
  )
}
