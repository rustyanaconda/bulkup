"""
USDA FoodData Central search and detail endpoints.
"""
import os
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from models.models import User
from routers.auth import get_current_user

router = APIRouter()

USDA_SEARCH_URL  = "https://api.nal.usda.gov/fdc/v1/foods/search"
USDA_DETAIL_URL  = "https://api.nal.usda.gov/fdc/v1/food/{fdc_id}"

NUTRIENT_FIELDS = {
    "208": "calories",
    "203": "protein_g",
    "205": "carbs_g",
    "204": "fat_g",
}


def _extract_nutrients(food_nutrients: list) -> dict:
    """Search endpoint: nutrientNumber / value"""
    result = {v: None for v in NUTRIENT_FIELDS.values()}
    for n in food_nutrients:
        num = str(n.get("nutrientNumber", ""))
        if num in NUTRIENT_FIELDS:
            result[NUTRIENT_FIELDS[num]] = n.get("value")
    return result


def _extract_nutrients_detail(food_nutrients: list) -> dict:
    """Detail endpoint: nutrient.number / amount"""
    result = {v: None for v in NUTRIENT_FIELDS.values()}
    for n in food_nutrients:
        num = str((n.get("nutrient") or {}).get("number", ""))
        if num in NUTRIENT_FIELDS:
            result[NUTRIENT_FIELDS[num]] = n.get("amount")
    return result


@router.get("/search")
def search_foods(
    query: str = Query(..., min_length=1),
    _user: User = Depends(get_current_user),
):
    api_key = os.getenv("USDA_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="USDA API key not configured")

    try:
        resp = httpx.post(
            USDA_SEARCH_URL,
            params={"api_key": api_key},
            json={
                "query":    query,
                "pageSize": 15,
                "dataType": ["SR Legacy", "Survey (FNDDS)"],
            },
            timeout=10,
        )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"USDA API unreachable: {exc}")

    if resp.status_code != 200:
        try:
            usda_detail = resp.json()
        except Exception:
            usda_detail = resp.text
        raise HTTPException(
            status_code=502,
            detail=f"USDA API error {resp.status_code}: {usda_detail}",
        )

    body = resp.json()
    foods = body.get("foods", [])

    return [
        {
            "fdc_id":      food.get("fdcId"),
            "description": food.get("description"),
            "data_type":   food.get("dataType"),
            **_extract_nutrients(food.get("foodNutrients", [])),
        }
        for food in foods
    ]


def _build_portion_label(portion: dict) -> str:
    """Compose a readable label from USDA portion fields."""
    if portion.get("portionDescription"):
        return portion["portionDescription"]
    parts = []
    amount = portion.get("amount")
    if amount and amount != 1.0:
        parts.append(str(int(amount) if amount == int(amount) else amount))
    modifier = (portion.get("modifier") or "").strip()
    unit_name = (portion.get("measureUnit", {}).get("name") or "").strip()
    # Prefer modifier; fall back to unit name; skip generic "gram" unit entries
    if modifier and modifier.lower() not in ("", "undetermined"):
        parts.append(modifier)
    elif unit_name and unit_name.lower() not in ("", "undetermined", "g", "gram", "grams"):
        parts.append(unit_name)
    return " ".join(parts) if parts else "serving"


@router.get("/{fdc_id}")
def get_food(
    fdc_id: int,
    _user: User = Depends(get_current_user),
):
    api_key = os.getenv("USDA_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="USDA API key not configured")

    try:
        resp = httpx.get(
            USDA_DETAIL_URL.format(fdc_id=fdc_id),
            params={"api_key": api_key},
            timeout=10,
        )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"USDA API unreachable: {exc}")

    if resp.status_code == 404:
        raise HTTPException(status_code=404, detail=f"Food {fdc_id} not found in USDA database")

    if resp.status_code != 200:
        try:
            usda_detail = resp.json()
        except Exception:
            usda_detail = resp.text
        raise HTTPException(
            status_code=502,
            detail=f"USDA API error {resp.status_code}: {usda_detail}",
        )

    food = resp.json()

    # Build portions list from foodPortions array
    raw_portions = food.get("foodPortions") or []
    portions = [
        {
            "label":       _build_portion_label(p),
            "gram_weight": p.get("gramWeight"),
        }
        for p in raw_portions
        if p.get("gramWeight")  # skip any entry with no gram weight
    ]
    # Always append the grams fallback so the user can enter a raw gram amount
    portions.append({"label": "grams", "gram_weight": 1})

    return {
        "fdc_id":      food.get("fdcId"),
        "description": food.get("description"),
        "data_type":   food.get("dataType"),
        **_extract_nutrients_detail(food.get("foodNutrients", [])),
        "portions":    portions,
    }
