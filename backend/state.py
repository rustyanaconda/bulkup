"""
In-memory state for the MVP — single user, no database.
All routers import from here so state is shared across requests.
"""

MEALS = [
    {"id": 1, "name": "Egg & Oat Power Bowl",    "calories": 680,  "meal_time": "breakfast", "state": "done"},
    {"id": 2, "name": "Mass Builder Smoothie",   "calories": 420,  "meal_time": "snack",     "state": "upcoming"},
    {"id": 3, "name": "Salmon Rice Bowl",        "calories": 750,  "meal_time": "lunch",     "state": "upcoming"},
    {"id": 4, "name": "Greek Yogurt & Granola",  "calories": 310,  "meal_time": "snack",     "state": "upcoming"},
    {"id": 5, "name": "Grass-Fed Beef & Quinoa", "calories": 820,  "meal_time": "dinner",    "state": "upcoming"},
]

WHOOP = {"access_token": None, "refresh_token": None}

USER = {
    "weight_lbs":          174,
    "height_in":           74,
    "age":                 27,
    "sex":                 "male",
    "activity_multiplier": 1.55,
    "surplus_kcal":        500,
}
