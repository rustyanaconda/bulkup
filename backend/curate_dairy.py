"""
Curation helper: find clean USDA entries for cheeses and dairy.
Same format as curate_breads.py.

Usage:
    cd backend
    source venv/bin/activate
    python curate_dairy.py
"""
import os
import sys
import time
import httpx
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("USDA_API_KEY")
if not API_KEY:
    sys.exit("ERROR: USDA_API_KEY not set in environment")

SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search"

FOODS = [
    {
        "label":   "Mexican blend cheese",
        "queries": ["cheese mexican blend", "cheese, mexican, blend", "cheese monterey"],
    },
    {
        "label":   "Cheddar cheese",
        "queries": ["cheese cheddar", "cheese, cheddar"],
    },
    {
        "label":   "Mozzarella cheese",
        "queries": ["cheese mozzarella whole milk", "cheese, mozzarella, whole milk"],
    },
    {
        "label":   "Parmesan cheese",
        "queries": ["cheese parmesan grated", "cheese, parmesan, grated"],
    },
    {
        "label":   "Pepper jack cheese",
        "queries": ["cheese monterey jack", "cheese pepper jack", "cheese, monterey"],
    },
    {
        "label":   "American cheese",
        "queries": ["cheese american", "cheese, pasteurized process, american"],
    },
    {
        "label":   "Swiss cheese",
        "queries": ["cheese swiss", "cheese, swiss"],
    },
    {
        "label":   "Provolone cheese",
        "queries": ["cheese provolone", "cheese, provolone"],
    },
    {
        "label":   "String cheese",
        "queries": ["cheese mozzarella low moisture part skim", "cheese, mozzarella, part skim", "string cheese"],
    },
    {
        "label":   "Cottage cheese",
        "queries": ["cheese cottage", "cheese, cottage, creamed"],
    },
    {
        "label":   "Cream cheese",
        "queries": ["cheese cream", "cheese, cream"],
    },
    {
        "label":   "Butter",
        "queries": ["butter salted", "butter, salted", "butter without salt"],
    },
]

DATA_TYPES   = ["SR Legacy", "Foundation"]
NUTRIENT_NUMS = {
    "208": "kcal",
    "203": "protein_g",
    "205": "carbs_g",
    "204": "fat_g",
}


def extract_macros(food_nutrients: list) -> dict:
    result = {v: None for v in NUTRIENT_NUMS.values()}
    for n in food_nutrients:
        num = str(n.get("nutrientNumber", ""))
        if num in NUTRIENT_NUMS:
            result[NUTRIENT_NUMS[num]] = n.get("value")
    return result


def fmt(val, decimals=1) -> str:
    return f"{val:.{decimals}f}" if val is not None else "?"


def search(query: str) -> list:
    resp = httpx.post(
        SEARCH_URL,
        params={"api_key": API_KEY},
        json={"query": query, "dataType": DATA_TYPES, "pageSize": 6},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json().get("foods", [])


def run():
    for food in FOODS:
        print(f"\n{'=' * 60}")
        print(f"  {food['label']}")
        print(f"{'=' * 60}")

        candidates = []
        for query in food["queries"]:
            print(f"  query: {query!r}")
            try:
                results = search(query)
            except Exception as e:
                print(f"  ERROR: {e}")
                results = []
            time.sleep(0.5)

            for r in results:
                fdc_id = r.get("fdcId")
                if fdc_id not in {c["fdcId"] for c in candidates}:
                    candidates.append(r)

            if candidates:
                break

        if not candidates:
            print("  No results found.")
            continue

        print()
        for i, r in enumerate(candidates[:6], 1):
            macros = extract_macros(r.get("foodNutrients", []))
            print(f"  [{i}] fdcId={r.get('fdcId')}  dataType={r.get('dataType')}")
            print(f"      description: {r.get('description')}")
            print(
                f"      per100g: {fmt(macros['kcal'], 0)} kcal"
                f" | P {fmt(macros['protein_g'])}g"
                f" | C {fmt(macros['carbs_g'])}g"
                f" | F {fmt(macros['fat_g'])}g"
            )
            print()

    print("Done.")


if __name__ == "__main__":
    run()
