"""
Curation helper: find clean USDA entries for breads and bagels.
Same format as curate_foods_retry.py.

Usage:
    cd backend
    source venv/bin/activate
    python curate_breads.py
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
        "label":      "Plain bagel",
        "data_types": ["SR Legacy", "Foundation"],
        "queries":    ["bagels plain enriched", "bagels plain"],
    },
    {
        "label":      "Egg bagel",
        "data_types": ["SR Legacy", "Foundation"],
        "queries":    ["bagels egg", "bagels, egg"],
    },
    {
        "label":      "Everything bagel",
        "data_types": ["SR Legacy", "Foundation"],
        "queries":    ["bagels everything", "bagels, with raisins"],
    },
    {
        "label":      "Whole wheat bagel",
        "data_types": ["SR Legacy", "Foundation"],
        "queries":    ["bagels wheat", "bagels, oat bran"],
    },
    {
        "label":      "White bread",
        "data_types": ["SR Legacy", "Foundation"],
        "queries":    ["bread white commercially prepared", "bread white"],
    },
    {
        "label":      "Whole wheat bread",
        "data_types": ["SR Legacy", "Foundation"],
        "queries":    ["bread whole wheat commercially prepared", "bread whole-wheat"],
    },
    {
        "label":      "Sourdough bread",
        "data_types": ["SR Legacy", "Foundation"],
        "queries":    ["bread french or vienna sourdough", "bread, sourdough"],
    },
    {
        "label":      "Multigrain bread",
        "data_types": ["SR Legacy", "Foundation"],
        "queries":    ["bread multi-grain", "bread, multigrain"],
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
        json={"query": query, "dataType": data_types, "pageSize": 6},
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
