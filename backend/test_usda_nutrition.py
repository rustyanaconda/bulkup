"""
Diagnostic script: check USDA SR Legacy nutrition completeness for a few whole foods.
Run: python test_usda_nutrition.py
"""
import os
import sys
import httpx
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("USDA_API_KEY")
if not API_KEY:
    sys.exit("ERROR: USDA_API_KEY not set in environment")

SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search"
DETAIL_URL  = "https://api.nal.usda.gov/fdc/v1/food/{fdc_id}"

TEST_FOODS = [
    "egg whole cooked",
    "chicken breast cooked",
    "spinach raw",
    "banana raw",
]

# (nutrient_number, display_name)
NUTRIENTS = [
    ("208", "Calories"),
    ("203", "Protein"),
    ("205", "Carbs"),
    ("204", "Fat"),
    ("291", "Fiber"),
    ("269", "Sugar"),
    ("606", "Saturated fat"),
    ("307", "Sodium"),
    ("306", "Potassium"),
    ("301", "Calcium"),
    ("303", "Iron"),
    ("304", "Magnesium"),
    ("309", "Zinc"),
    ("305", "Phosphorus"),
    ("312", "Copper"),
    ("315", "Manganese"),
    ("317", "Selenium"),
    ("320", "Vitamin A RAE"),
    ("401", "Vitamin C"),
    ("328", "Vitamin D"),
    ("323", "Vitamin E"),
    ("430", "Vitamin K"),
    ("404", "Thiamin"),
    ("405", "Riboflavin"),
    ("406", "Niacin"),
    ("415", "Vitamin B6"),
    ("417", "Folate"),
    ("418", "Vitamin B12"),
    ("601", "Cholesterol"),
]


def search_first(query: str) -> dict | None:
    resp = httpx.post(
        SEARCH_URL,
        params={"api_key": API_KEY},
        json={"query": query, "dataType": ["SR Legacy"], "pageSize": 3},
        timeout=15,
    )
    resp.raise_for_status()
    foods = resp.json().get("foods", [])
    return foods[0] if foods else None


def fetch_detail(fdc_id: int) -> dict:
    resp = httpx.get(
        DETAIL_URL.format(fdc_id=fdc_id),
        params={"api_key": API_KEY},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()


def extract_nutrients(food_nutrients: list) -> dict:
    """Details endpoint: nutrient.number / amount"""
    result = {}
    for n in food_nutrients:
        num  = str((n.get("nutrient") or {}).get("number", ""))
        unit = (n.get("nutrient") or {}).get("unitName", "")
        val  = n.get("amount")
        if num and val is not None:
            result[num] = (val, unit)
    return result


def build_portion_label(p: dict) -> str:
    if p.get("portionDescription"):
        return p["portionDescription"]
    parts = []
    amount = p.get("amount")
    if amount and amount != 1.0:
        parts.append(str(int(amount) if amount == int(amount) else amount))
    modifier  = (p.get("modifier")  or "").strip()
    unit_name = (p.get("measureUnit", {}).get("name") or "").strip()
    if modifier and modifier.lower() not in ("", "undetermined"):
        parts.append(modifier)
    elif unit_name and unit_name.lower() not in ("", "undetermined", "g", "gram", "grams"):
        parts.append(unit_name)
    gram_weight = p.get("gramWeight", "?")
    return (" ".join(parts) or "serving") + f"  ({gram_weight}g)"


def run():
    for query in TEST_FOODS:
        print("=" * 65)
        print(f"QUERY: {query!r}")
        print("=" * 65)

        hit = search_first(query)
        if not hit:
            print("  No SR Legacy result found.\n")
            continue

        fdc_id = hit["fdcId"]
        print(f"  Search hit: {hit['description']}  [fdcId={fdc_id}]")

        detail   = fetch_detail(fdc_id)
        nut_map  = extract_nutrients(detail.get("foodNutrients", []))
        portions = detail.get("foodPortions") or []

        print(f"\n  Nutrients (per 100g):")
        present = 0
        for num, label in NUTRIENTS:
            if num in nut_map:
                val, unit = nut_map[num]
                print(f"    {label:<22} {val:>8.2f}  {unit}")
                present += 1
            else:
                print(f"    {label:<22}   MISSING")

        print(f"\n  Portions:")
        if portions:
            for p in portions:
                print(f"    • {build_portion_label(p)}")
        else:
            print("    (none)")

        total = len(NUTRIENTS)
        print(f"\n  Summary: {present}/{total} nutrients present, {total - present} missing\n")


if __name__ == "__main__":
    run()
