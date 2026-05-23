"""
USDA FoodData Central search endpoint.
"""
import os
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from models.models import User
from routers.auth import get_current_user

router = APIRouter()

USDA_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search"
DATA_TYPES       = "Foundation,SR Legacy,Survey (FNDDS)"

NUTRIENT_FIELDS = {
    "208": "calories",
    "203": "protein_g",
    "205": "carbs_g",
    "204": "fat_g",
}


def _extract_nutrients(food_nutrients: list) -> dict:
    result = {v: None for v in NUTRIENT_FIELDS.values()}
    for n in food_nutrients:
        num = str(n.get("nutrientNumber", ""))
        if num in NUTRIENT_FIELDS:
            result[NUTRIENT_FIELDS[num]] = n.get("value")
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
        resp = httpx.get(
            USDA_SEARCH_URL,
            params={
                "query":    query,
                "api_key":  api_key,
                "pageSize": 15,
                "dataType": DATA_TYPES,
            },
            timeout=10,
        )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"USDA API unreachable: {exc}")

    if resp.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"USDA API error {resp.status_code}",
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
