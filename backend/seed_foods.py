"""
Seed curated whole foods from USDA into the foods + food_portions tables.
Idempotent: matches by fdc_id, updates if present, inserts if not.
Portions are replaced on every run.

Usage:
    cd backend
    source venv/bin/activate
    python seed_foods.py
"""
import os
import sys
import time
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

import httpx
from database import get_db
from models.models import Food, FoodPortion

API_KEY = os.getenv("USDA_API_KEY")
if not API_KEY:
    sys.exit("ERROR: USDA_API_KEY not set in environment")

SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search"
ALL_TYPES  = ["Foundation", "SR Legacy", "Survey (FNDDS)"]

# nutrientNumber -> Food column name
NUTRIENT_MAP = {
    "208": "calories",
    "203": "protein_g",
    "205": "carbs_g",
    "204": "fat_g",
    "291": "fiber_g",
    "269": "sugar_g",
    "606": "saturated_fat_g",
    "307": "sodium_mg",
    "306": "potassium_mg",
    "301": "calcium_mg",
    "303": "iron_mg",
    "304": "magnesium_mg",
    "309": "zinc_mg",
    "305": "phosphorus_mg",
    "312": "copper_mg",
    "315": "manganese_mg",
    "317": "selenium_ug",
    "320": "vitamin_a_ug",
    "401": "vitamin_c_mg",
    "328": "vitamin_d_ug",
    "323": "vitamin_e_mg",
    "430": "vitamin_k_ug",
    "404": "thiamin_mg",
    "405": "riboflavin_mg",
    "406": "niacin_mg",
    "415": "vitamin_b6_mg",
    "417": "folate_ug",
    "418": "vitamin_b12_ug",
    "601": "cholesterol_mg",
}

# Curated list: (label, grams, is_default). The "grams" fallback is added automatically.
CURATED_FOODS = [
    {
        "name": "Eggs (whole)", "category": "protein", "fdc_id": 171287,
        "queries": ["egg whole raw", "egg raw fresh"],
        "portions": [("1 large egg", 50, 1), ("1 medium egg", 44, 0)],
    },
    {
        "name": "Chicken breast", "category": "protein", "fdc_id": 171477,
        "queries": ["chicken breast raw", "chicken broiler breast meat raw"],
        "portions": [("1 breast", 174, 1), ("3 oz", 85, 0)],
    },
    {
        "name": "Salmon, wild", "category": "protein", "fdc_id": 171998,
        "queries": ["salmon atlantic wild cooked", "salmon wild atlantic"],
        "portions": [("1 fillet", 150, 1), ("3 oz", 85, 0)],
    },
    {
        "name": "Salmon, farmed", "category": "protein", "fdc_id": 175168,
        "queries": ["salmon atlantic farmed cooked", "salmon farmed atlantic"],
        "portions": [("1 fillet", 150, 1), ("3 oz", 85, 0)],
    },
    {
        "name": "Ground beef (90% lean)", "category": "protein", "fdc_id": 171793,
        "queries": ["ground beef 90 lean cooked", "beef ground 90 percent lean"],
        "portions": [("4 oz", 113, 1), ("3 oz", 85, 0)],
    },
    {
        "name": "Greek yogurt", "category": "dairy", "fdc_id": 171304,
        "queries": ["yogurt greek plain whole milk", "greek yogurt plain"],
        "portions": [("1 cup", 245, 1), ("1 container", 170, 0)],
    },
    {
        "name": "Oats (dry)", "category": "grain", "fdc_id": 173904,
        "queries": ["cereals oats regular quick unenriched dry", "oats unenriched dry"],
        "portions": [("1/2 cup dry", 40, 1), ("1 cup dry", 80, 0)],
    },
    {
        "name": "White rice, cooked", "category": "grain", "fdc_id": 168880,
        "queries": ["rice white long grain cooked", "rice white cooked"],
        "portions": [("1 cup cooked", 158, 1), ("1/2 cup cooked", 79, 0)],
    },
    {
        "name": "White rice, dry", "category": "grain", "fdc_id": 168877,
        "queries": ["rice white long grain raw", "rice white dry unenriched"],
        "portions": [("1/4 cup dry", 45, 1), ("1/2 cup dry", 90, 0)],
    },
    {
        "name": "Sweet potato", "category": "vegetable", "fdc_id": 168483,
        "queries": ["sweet potato cooked baked", "sweet potatoes cooked baked"],
        "portions": [("1 medium", 130, 1), ("1 cup", 200, 0)],
    },
    {
        "name": "Peanut butter", "category": "fat", "fdc_id": 172470,
        "queries": ["peanut butter smooth", "peanut butter"],
        "portions": [("2 tbsp", 32, 1), ("1 tbsp", 16, 0)],
    },
    {
        "name": "Almonds", "category": "fat", "fdc_id": 170158,
        "queries": ["nuts almonds dry roasted without salt", "almonds nuts dry roasted"],
        "portions": [("1 oz (~23 nuts)", 28, 1), ("1/4 cup", 35, 0)],
    },
    {
        "name": "Olive oil", "category": "fat", "fdc_id": 171413,
        "queries": ["olive oil", "oil olive salad cooking"],
        "portions": [("1 tbsp", 14, 1), ("1 tsp", 4.5, 0)],
    },
    {
        "name": "Avocado", "category": "fat", "fdc_id": 171705,
        "queries": ["avocado raw", "avocados raw"],
        "portions": [("1/2 avocado", 68, 1), ("1 whole", 136, 0)],
    },
    {
        "name": "Spinach", "category": "vegetable", "fdc_id": 168462,
        "queries": ["spinach raw", "spinach"],
        "portions": [("1 cup raw", 30, 1), ("1 bunch", 340, 0)],
    },
    {
        "name": "Banana", "category": "fruit", "fdc_id": 173944,
        "queries": ["bananas raw", "banana raw"],
        "portions": [("1 medium", 118, 1), ("1 large", 136, 0)],
    },
    {
        "name": "Broccoli", "category": "vegetable", "fdc_id": 169967,
        "queries": ["broccoli cooked", "broccoli raw"],
        "portions": [("1 cup", 156, 1), ("1 spear", 31, 0)],
    },
    {
        "name": "Whole milk", "category": "dairy", "fdc_id": 171265,
        "queries": ["milk whole 3.25 milkfat", "milk fluid whole"],
        "portions": [("1 cup", 244, 1), ("1/2 cup", 122, 0)],
    },
    {
        "name": "Chocolate milk", "category": "dairy", "fdc_id": 2705467,
        "queries": ["chocolate milk", "milk chocolate lowfat"],
        "portions": [("1 cup", 250, 1)],
    },
    {
        "name": "Plain bagel", "category": "grain", "fdc_id": 174899,
        "queries": ["bagels plain enriched", "bagels plain"],
        "portions": [("1 bagel", 98, 1), ("1 large bagel", 131, 0), ("1 mini bagel", 26, 0)],
    },
    {
        "name": "Egg bagel", "category": "grain", "fdc_id": 174901,
        "queries": ["bagels egg", "bagels, egg"],
        "portions": [("1 bagel", 98, 1), ("1 large bagel", 131, 0), ("1 mini bagel", 26, 0)],
    },
    {
        "name": "Whole wheat bagel", "category": "grain", "fdc_id": 167533,
        "queries": ["bagels wheat", "bagels, oat bran"],
        "portions": [("1 bagel", 98, 1), ("1 large bagel", 131, 0), ("1 mini bagel", 26, 0)],
    },
    {
        "name": "White bread", "category": "grain", "fdc_id": 174924,
        "queries": ["bread white commercially prepared", "bread white"],
        "portions": [("1 slice", 28, 1), ("2 slices", 56, 0)],
    },
    {
        "name": "Whole wheat bread", "category": "grain", "fdc_id": 172688,
        "queries": ["bread whole wheat commercially prepared", "bread whole-wheat"],
        "portions": [("1 slice", 28, 1), ("2 slices", 56, 0)],
    },
    {
        "name": "Sourdough bread", "category": "grain", "fdc_id": 172675,
        "queries": ["bread french or vienna sourdough", "bread, sourdough"],
        "portions": [("1 slice", 28, 1), ("2 slices", 56, 0)],
    },
    {
        "name": "Multigrain bread", "category": "grain", "fdc_id": 168013,
        "queries": ["bread multi-grain", "bread, multigrain"],
        "portions": [("1 slice", 28, 1), ("2 slices", 56, 0)],
    },
]


def search_for_fdc_id(target_fdc_id: int, queries: list) -> dict | None:
    """Search USDA and return the food object whose fdcId matches target_fdc_id."""
    seen_ids = set()
    for query in queries:
        try:
            resp = httpx.post(
                SEARCH_URL,
                params={"api_key": API_KEY},
                json={"query": query, "dataType": ALL_TYPES, "pageSize": 50},
                timeout=15,
            )
            resp.raise_for_status()
        except Exception as e:
            print(f"    USDA request error for query {query!r}: {e}")
            time.sleep(0.5)
            continue

        time.sleep(0.5)
        foods = resp.json().get("foods", [])

        for food in foods:
            if food.get("fdcId") == target_fdc_id:
                return food
            seen_ids.add(food.get("fdcId"))

    return None


def extract_nutrition(food_nutrients: list) -> dict:
    """Search-format nutrients: nutrientNumber / value."""
    result = {}
    for n in food_nutrients:
        num = str(n.get("nutrientNumber", ""))
        val = n.get("value")
        if num in NUTRIENT_MAP and val is not None:
            result[NUTRIENT_MAP[num]] = val
    return result


def apply_nutrition(food_obj: Food, nutrition: dict) -> None:
    for col, val in nutrition.items():
        setattr(food_obj, col, val)


def seed() -> None:
    db = next(get_db())
    try:
        inserted = 0
        updated  = 0
        skipped  = 0

        for entry in CURATED_FOODS:
            name       = entry["name"]
            fdc_id     = entry["fdc_id"]
            category   = entry["category"]
            queries    = entry["queries"]
            portions   = entry["portions"]

            print(f"\n── {name}  (fdc_id={fdc_id})")

            # ── 1. Fetch nutrition from USDA ──────────────────────────────
            usda_food = search_for_fdc_id(fdc_id, queries)

            if usda_food is None:
                print(f"   WARNING: fdc_id {fdc_id} not found in any search result — skipping.")
                skipped += 1
                continue

            nutrition    = extract_nutrition(usda_food.get("foodNutrients", []))
            n_populated  = len(nutrition)
            cal          = nutrition.get("calories")
            print(f"   matched: {usda_food.get('description')}")
            print(f"   calories={cal}  nutrients populated: {n_populated}/{len(NUTRIENT_MAP)}")

            # ── 2. Upsert Food row ────────────────────────────────────────
            food_row = db.query(Food).filter(Food.fdc_id == fdc_id).first()

            if food_row:
                food_row.name     = name
                food_row.category = category
                food_row.source   = "usda"
                apply_nutrition(food_row, nutrition)
                action = "updated"
                updated += 1
            else:
                food_row = Food(
                    name=name, category=category, fdc_id=fdc_id, source="usda"
                )
                apply_nutrition(food_row, nutrition)
                db.add(food_row)
                action = "inserted"
                inserted += 1

            db.flush()  # ensure food_row.id is assigned

            # ── 3. Replace portions ───────────────────────────────────────
            db.query(FoodPortion).filter(FoodPortion.food_id == food_row.id).delete()

            all_portions = list(portions) + [("grams", 1, 0)]
            for label, grams, is_default in all_portions:
                db.add(FoodPortion(
                    food_id    = food_row.id,
                    label      = label,
                    grams      = grams,
                    is_default = is_default,
                ))

            db.commit()
            print(f"   {action}  |  {len(all_portions)} portions added")

        print(f"\n{'─' * 50}")
        print(f"Done — {inserted} inserted, {updated} updated, {skipped} skipped.")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
