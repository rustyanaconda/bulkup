"""
Curation helper: search USDA for candidate matches for each planned food,
print clearly so you can pick the right fdc_id for each.

Usage:
    cd backend
    source venv/bin/activate
    python curate_foods.py
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
        "label":      "Eggs (whole)",
        "queries":    ["egg whole raw", "eggs grade a large egg whole"],
        "data_types": ["Foundation", "SR Legacy"],
    },
    {
        "label":      "Chicken breast",
        "queries":    ["chicken breast roasted", "chicken broiler breast meat only cooked"],
        "data_types": ["Foundation", "SR Legacy"],
    },
    {
        "label":      "Salmon",
        "queries":    ["salmon atlantic cooked", "salmon raw"],
        "data_types": ["Foundation", "SR Legacy"],
    },
    {
        "label":      "Ground beef (lean)",
        "queries":    ["ground beef 90 lean cooked", "ground beef cooked"],
        "data_types": ["Foundation", "SR Legacy"],
    },
    {
        "label":      "Greek yogurt",
        "queries":    ["greek yogurt whole milk plain", "yogurt greek plain whole milk"],
        "data_types": ["Foundation", "SR Legacy"],
    },
    {
        "label":      "Oats",
        "queries":    ["oats raw", "oats dry"],
        "data_types": ["Foundation", "SR Legacy"],
    },
    {
        "label":      "White rice (cooked)",
        "queries":    ["rice white cooked", "rice white long grain cooked"],
        "data_types": ["Foundation", "SR Legacy"],
    },
    {
        "label":      "Sweet potato",
        "queries":    ["sweet potato cooked baked", "sweet potato raw"],
        "data_types": ["Foundation", "SR Legacy"],
    },
    {
        "label":      "Peanut butter",
        "queries":    ["peanut butter smooth", "peanut butter"],
        "data_types": ["Foundation", "SR Legacy"],
    },
    {
        "label":      "Almonds",
        "queries":    ["almonds raw", "almonds"],
        "data_types": ["Foundation", "SR Legacy"],
    },
    {
        "label":      "Olive oil",
        "queries":    ["olive oil", "oil olive"],
        "data_types": ["Foundation", "SR Legacy"],
    },
    {
        "label":      "Avocado",
        "queries":    ["avocado raw", "avocados raw"],
        "data_types": ["Foundation", "SR Legacy"],
    },
    {
        "label":      "Spinach",
        "queries":    ["spinach raw"],
        "data_types": ["Foundation", "SR Legacy"],
    },
    {
        "label":      "Banana",
        "queries":    ["banana raw", "bananas raw"],
        "data_types": ["Foundation", "SR Legacy"],
    },
    {
        "label":      "Broccoli",
        "queries":    ["broccoli cooked", "broccoli raw"],
        "data_types": ["Foundation", "SR Legacy"],
    },
    {
        "label":      "Whole milk",
        "queries":    ["milk whole", "milk whole 3.25 milkfat"],
        "data_types": ["Foundation", "SR Legacy"],
    },
    {
        "label":      "Chocolate milk",
        "queries":    ["chocolate milk", "milk chocolate lowfat"],
        "data_types": ["SR Legacy", "Survey (FNDDS)"],
    },
]

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


def search(query: str, data_types: list) -> list:
    resp = httpx.post(
        SEARCH_URL,
        params={"api_key": API_KEY},
        json={"query": query, "dataType": data_types, "pageSize": 5},
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
                results = search(query, food["data_types"])
            except Exception as e:
                print(f"  ERROR: {e}")
                results = []
            time.sleep(0.5)

            for r in results:
                fdc_id = r.get("fdcId")
                if fdc_id not in {c["fdcId"] for c in candidates}:
                    candidates.append(r)

            if candidates:
                break  # stop at first query that returns results

        if not candidates:
            print("  No results found.")
            continue

        print()
        for i, r in enumerate(candidates[:5], 1):
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
