"""
TDEE & calorie target calculations.
Pure Python — no framework, no imports needed beyond stdlib.
Run this file directly to test: python services/tdee_service.py
"""
from __future__ import annotations


def calculate_bmr(weight_lbs: float, height_in: float, age: int, sex: str) -> int:
    """
    Mifflin-St Jeor BMR equation — most accurate formula for general population.
    Converts imperial → metric internally.
    """
    weight_kg = weight_lbs * 0.453592
    height_cm = height_in  * 2.54

    if sex == "male":
        bmr = 88.362 + (13.397 * weight_kg) + (4.799 * height_cm) - (5.677 * age)
    else:
        bmr = 447.593 + (9.247 * weight_kg) + (3.098 * height_cm) - (4.330 * age)

    return round(bmr)


def calculate_tdee(bmr: int, activity_multiplier: float) -> int:
    """Total Daily Energy Expenditure = BMR × activity level."""
    return round(bmr * activity_multiplier)


def calculate_target(
    weight_lbs:          float,
    height_in:           float,
    age:                 int,
    sex:                 str,
    activity_multiplier: float    = 1.55,
    surplus_kcal:        int      = 500,
    whoop_burned_kcal:   int|None = None,
) -> dict:
    """
    Full calorie target. Returns a breakdown dict the frontend displays directly.

    If whoop_burned_kcal is provided, it overrides the activity multiplier
    with real measured data from the Whoop API.

    Activity multipliers:
        1.2   = Sedentary (desk job, no exercise)
        1.375 = Light (1-3x/week)
        1.55  = Moderate (3-5x/week)  ← default
        1.725 = Active (6-7x/week)
        1.9   = Very active (2x daily / athlete)
    """
    bmr = calculate_bmr(weight_lbs, height_in, age, sex)

    if whoop_burned_kcal is not None:
        # Whoop total burn already includes BMR — extract just the activity portion
        activity = max(0, whoop_burned_kcal - bmr)
        source   = "whoop"
    else:
        activity = calculate_tdee(bmr, activity_multiplier) - bmr
        source   = "manual"

    target = bmr + activity + surplus_kcal

    return {
        "bmr":      bmr,
        "activity": activity,
        "surplus":  surplus_kcal,
        "target":   target,
        "source":   source,
    }


def kj_to_kcal(kilojoules: float) -> int:
    """Convert Whoop's kilojoule output to kcal."""
    return round(kilojoules / 4.184)


# ── Quick test — run: python services/tdee_service.py ────────────────────────
if __name__ == "__main__":
    # Test 1: manual calculation
    result = calculate_target(
        weight_lbs=164, height_in=70, age=26,
        sex="male", activity_multiplier=1.55, surplus_kcal=500,
    )
    print("Manual TDEE breakdown:")
    for k, v in result.items():
        print(f"  {k:12} {v}")

    print()

    # Test 2: with Whoop data (e.g. a hard training day)
    result_whoop = calculate_target(
        weight_lbs=164, height_in=70, age=26, sex="male",
        surplus_kcal=500,
        whoop_burned_kcal=3100,  # example: high strain day
    )
    print("Whoop-powered TDEE breakdown:")
    for k, v in result_whoop.items():
        print(f"  {k:12} {v}")

    print()
    print(f"Whoop kJ example — 3309 kJ → {kj_to_kcal(3309)} kcal")
