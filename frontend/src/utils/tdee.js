/**
 * TDEE calculations — JavaScript mirror of backend/services/tdee_service.py
 *
 * Having this on the frontend means instant recalculation without a network
 * round trip (great for the settings form). The backend version is the
 * source of truth for anything stored in the database.
 */

export function calculateBMR(weightLbs, heightIn, age, sex) {
  const weightKg = weightLbs * 0.453592
  const heightCm = heightIn  * 2.54

  if (sex === 'male') {
    return Math.round(88.362 + (13.397 * weightKg) + (4.799 * heightCm) - (5.677 * age))
  }
  return Math.round(447.593 + (9.247 * weightKg) + (3.098 * heightCm) - (4.330 * age))
}

/**
 * Calculate full calorie target.
 * Pass whoopBurnedKcal to replace the activity multiplier with live data.
 *
 * @returns {{ bmr, activity, surplus, target, source }}
 */
export function calculateTarget({
  weightLbs,
  heightIn,
  age,
  sex,
  activityMultiplier = 1.55,
  surplusKcal        = 500,
  whoopBurnedKcal    = null,
}) {
  const bmr = calculateBMR(weightLbs, heightIn, age, sex)

  let activity, source
  if (whoopBurnedKcal !== null) {
    // Whoop total already includes BMR — isolate just the activity portion
    activity = Math.max(0, whoopBurnedKcal - bmr)
    source   = 'whoop'
  } else {
    activity = Math.round(bmr * activityMultiplier) - bmr
    source   = 'manual'
  }

  return {
    bmr,
    activity,
    surplus: surplusKcal,
    target:  bmr + activity + surplusKcal,
    source,
  }
}

/** Convert Whoop's kilojoule output to kcal */
export function kjToKcal(kj) {
  return Math.round(kj / 4.184)
}

/** Activity multiplier options for the settings UI */
export const ACTIVITY_OPTIONS = [
  { value: 1.2,   label: 'Sedentary — desk job, no exercise'  },
  { value: 1.375, label: 'Light — 1–3x per week'              },
  { value: 1.55,  label: 'Moderate — 3–5x per week'           },
  { value: 1.725, label: 'Active — 6–7x per week'             },
  { value: 1.9,   label: 'Very active — athlete / 2x daily'   },
]

/** Surplus presets for the settings UI */
export const SURPLUS_OPTIONS = [
  { value: 250, label: 'Lean bulk — +250 kcal/day (~0.25 lb/week)'     },
  { value: 500, label: 'Standard bulk — +500 kcal/day (~0.5 lb/week)'  },
  { value: 750, label: 'Aggressive bulk — +750 kcal/day (~0.75 lb/wk)' },
]
