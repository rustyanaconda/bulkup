"""
USDA FoodData Central search and detail endpoints.
"""
import os
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, func
from sqlalchemy.orm import Session
from database import get_db
from models.models import Food, FoodPortion, User
from routers.auth import get_current_user

router = APIRouter()

USDA_SEARCH_URL  = "https://api.nal.usda.gov/fdc/v1/foods/search"
USDA_DETAIL_URL  = "https://api.nal.usda.gov/fdc/v1/food/{fdc_id}"
EDAMAM_PARSER_URL = "https://api.edamam.com/api/food-database/v2/parser"

NUTRIENT_FIELDS = {
    "208": "calories",
    "203": "protein_g",
    "205": "carbs_g",
    "204": "fat_g",
}

# Edamam per-100g nutrient keys -> Food column names
EDAMAM_NUTRIENT_MAP = {
    "ENERC_KCAL": "calories",
    "PROCNT":     "protein_g",
    "CHOCDF":     "carbs_g",
    "FAT":        "fat_g",
    "FIBTG":      "fiber_g",
    "SUGAR":      "sugar_g",
    "FASAT":      "saturated_fat_g",
    "CHOLE":      "cholesterol_mg",
    "NA":         "sodium_mg",
    "K":          "potassium_mg",
    "CA":         "calcium_mg",
    "FE":         "iron_mg",
    "VITA_RAE":   "vitamin_a_ug",
    "VITC":       "vitamin_c_mg",
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


def _serialize_portions(portions) -> list:
    """Sort portions: default first, grams fallback last, preserve insertion order otherwise."""
    ordered = sorted(portions, key=lambda p: (-(p.is_default or 0), p.id))
    return [
        {"label": p.label, "grams": p.grams, "is_default": bool(p.is_default)}
        for p in ordered
    ]


@router.get("/curated/search")
def search_curated_foods(
    query: str       = Query(default=""),
    _user: User      = Depends(get_current_user),
    db:    Session   = Depends(get_db),
):
    q = query.strip()
    base = db.query(Food)

    if q:
        base = base.filter(Food.name.ilike(f"%{q}%")).order_by(
            # names that START with query rank above names that merely contain it
            case((Food.name.ilike(f"{q}%"), 0), else_=1),
            Food.name,
        )
    else:
        base = base.order_by(Food.name)

    foods = base.all()

    return [
        {
            "id":        f.id,
            "name":      f.name,
            "category":  f.category,
            "fdc_id":    f.fdc_id,
            "calories":  f.calories,
            "protein_g": f.protein_g,
            "carbs_g":   f.carbs_g,
            "fat_g":     f.fat_g,
            "portions":  _serialize_portions(f.portions),
        }
        for f in foods
    ]


def _food_detail_dict(food: Food) -> dict:
    """Shared response shape for curated and barcode endpoints."""
    return {
        "id":        food.id,
        "name":      food.name,
        "category":  food.category,
        "fdc_id":    food.fdc_id,
        "source":    food.source,
        "barcode":   food.barcode,
        # macros
        "calories":        food.calories,
        "protein_g":       food.protein_g,
        "carbs_g":         food.carbs_g,
        "fat_g":           food.fat_g,
        "fiber_g":         food.fiber_g,
        "sugar_g":         food.sugar_g,
        "saturated_fat_g": food.saturated_fat_g,
        # micronutrients
        "sodium_mg":       food.sodium_mg,
        "potassium_mg":    food.potassium_mg,
        "calcium_mg":      food.calcium_mg,
        "iron_mg":         food.iron_mg,
        "magnesium_mg":    food.magnesium_mg,
        "zinc_mg":         food.zinc_mg,
        "phosphorus_mg":   food.phosphorus_mg,
        "copper_mg":       food.copper_mg,
        "manganese_mg":    food.manganese_mg,
        "selenium_ug":     food.selenium_ug,
        "vitamin_a_ug":    food.vitamin_a_ug,
        "vitamin_c_mg":    food.vitamin_c_mg,
        "vitamin_d_ug":    food.vitamin_d_ug,
        "vitamin_e_mg":    food.vitamin_e_mg,
        "vitamin_k_ug":    food.vitamin_k_ug,
        "thiamin_mg":      food.thiamin_mg,
        "riboflavin_mg":   food.riboflavin_mg,
        "niacin_mg":       food.niacin_mg,
        "vitamin_b6_mg":   food.vitamin_b6_mg,
        "folate_ug":       food.folate_ug,
        "vitamin_b12_ug":  food.vitamin_b12_ug,
        "cholesterol_mg":  food.cholesterol_mg,
        "portions":        _serialize_portions(food.portions),
    }


@router.get("/curated/{food_id}")
def get_curated_food(
    food_id: int,
    _user:   User    = Depends(get_current_user),
    db:      Session = Depends(get_db),
):
    food = db.query(Food).filter(Food.id == food_id).first()
    if food is None:
        raise HTTPException(status_code=404, detail="Food not found")
    return _food_detail_dict(food)


@router.get("/barcode/{barcode}")
async def get_food_by_barcode(
    barcode: str,
    _user:   User    = Depends(get_current_user),
    db:      Session = Depends(get_db),
):
    # ── 1. DB fast path: return immediately if we've seen this barcode before ──
    existing = db.query(Food).filter(Food.barcode == barcode).first()
    if existing:
        return _food_detail_dict(existing)

    # ── 2. Edamam lookup ──────────────────────────────────────────────────────
    app_id  = os.getenv("EDAMAM_APP_ID")
    app_key = os.getenv("EDAMAM_APP_KEY")
    if not app_id or not app_key:
        raise HTTPException(status_code=503, detail="Product database not configured")

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                EDAMAM_PARSER_URL,
                params={"upc": barcode, "app_id": app_id, "app_key": app_key},
                timeout=10,
            )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Could not reach product database: {exc}")

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Product database error {resp.status_code}")

    hints = resp.json().get("hints", [])
    if not hints:
        raise HTTPException(status_code=404, detail="Product not found for this barcode.")

    hint       = hints[0]
    edamam_food = hint.get("food", {})
    nutrients  = edamam_food.get("nutrients", {})

    # ── 3. Normalize into a Food row ─────────────────────────────────────────
    food = Food(
        name     = edamam_food.get("label", "Unknown product"),
        category = "branded",
        source   = "edamam",
        barcode  = barcode,
        fdc_id   = None,
    )
    for edamam_key, col in EDAMAM_NUTRIENT_MAP.items():
        setattr(food, col, nutrients.get(edamam_key))

    db.add(food)
    db.flush()  # assigns food.id before adding portions

    # ── 4. Build portions ─────────────────────────────────────────────────────
    serving_grams = None
    for measure in hint.get("measures", []):
        if measure.get("label", "").lower() == "serving" and measure.get("weight"):
            serving_grams = measure["weight"]
            break
    # Fall back to servingSizes on the food object if measures had nothing useful
    if serving_grams is None:
        for sv in edamam_food.get("servingSizes", []):
            if sv.get("quantity"):
                serving_grams = sv["quantity"]
                break

    if serving_grams:
        db.add(FoodPortion(food_id=food.id, label="1 serving",
                           grams=serving_grams, is_default=1))
        db.add(FoodPortion(food_id=food.id, label="grams",
                           grams=1, is_default=0))
    else:
        db.add(FoodPortion(food_id=food.id, label="grams",
                           grams=1, is_default=1))

    # ── 5. Persist ────────────────────────────────────────────────────────────
    db.commit()
    db.refresh(food)

    # ── 6. Return in curated detail shape ────────────────────────────────────
    return _food_detail_dict(food)


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
