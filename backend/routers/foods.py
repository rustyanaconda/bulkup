"""
USDA FoodData Central search and detail endpoints.
"""
import os
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, func
from sqlalchemy.orm import Session
from datetime import datetime

from database import get_db
from models.models import Food, FoodPortion, BarcodeQueue, User
from routers.auth import get_current_user

router = APIRouter()

USDA_SEARCH_URL   = "https://api.nal.usda.gov/fdc/v1/foods/search"
USDA_DETAIL_URL   = "https://api.nal.usda.gov/fdc/v1/food/{fdc_id}"
EDAMAM_PARSER_URL = "https://api.edamam.com/api/food-database/v2/parser"
OFF_PRODUCT_URL   = "https://world.openfoodfacts.org/api/v2/product/{barcode}.json"

# Open Food Facts nutriments per 100g → (Food column, multiplier)
# All _100g values are in grams; minerals/vitamins are converted to mg via ×1000.
OFF_NUTRIENT_MAP = {
    "energy-kcal_100g":   ("calories",        1),
    "proteins_100g":      ("protein_g",       1),
    "carbohydrates_100g": ("carbs_g",         1),
    "fat_100g":           ("fat_g",           1),
    "fiber_100g":         ("fiber_g",         1),
    "sugars_100g":        ("sugar_g",         1),
    "saturated-fat_100g": ("saturated_fat_g", 1),
    "sodium_100g":        ("sodium_mg",       1000),   # g → mg
    "potassium_100g":     ("potassium_mg",    1000),   # g → mg
    "calcium_100g":       ("calcium_mg",      1000),   # g → mg
    "iron_100g":          ("iron_mg",         1000),   # g → mg
    "cholesterol_100g":   ("cholesterol_mg",  1000),   # g → mg
    "vitamin-c_100g":     ("vitamin_c_mg",    1000),   # g → mg
}

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


@router.get("/barcode-queue")
def get_barcode_queue(
    _user: User    = Depends(get_current_user),
    db:    Session = Depends(get_db),
):
    """Unresolved barcodes queued for manual research, most-scanned first."""
    rows = (
        db.query(BarcodeQueue)
        .filter(BarcodeQueue.resolved == False)  # noqa: E712
        .order_by(BarcodeQueue.times_scanned.desc())
        .all()
    )
    return [
        {
            "id":               r.id,
            "barcode":          r.barcode,
            "times_scanned":    r.times_scanned,
            "first_scanned_at": r.first_scanned_at.isoformat(),
            "last_scanned_at":  r.last_scanned_at.isoformat(),
        }
        for r in rows
    ]


def _upsert_barcode_queue(db: Session, barcode: str) -> None:
    """Add barcode to research queue, or increment its scan count if already there."""
    now = datetime.utcnow()
    existing = db.query(BarcodeQueue).filter(BarcodeQueue.barcode == barcode).first()
    if existing:
        existing.times_scanned   += 1
        existing.last_scanned_at  = now
    else:
        db.add(BarcodeQueue(
            barcode          = barcode,
            first_scanned_at = now,
            last_scanned_at  = now,
        ))
    db.commit()


@router.get("/barcode/{barcode}")
async def get_food_by_barcode(
    barcode: str,
    _user:   User    = Depends(get_current_user),
    db:      Session = Depends(get_db),
):
    # ── 1. DB fast path ───────────────────────────────────────────────────────
    existing = db.query(Food).filter(Food.barcode == barcode).first()
    if existing:
        return _food_detail_dict(existing)

    # ── 2. Open Food Facts lookup ─────────────────────────────────────────────
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                OFF_PRODUCT_URL.format(barcode=barcode),
                headers={"User-Agent": "Mise-App/1.0 (mise.fit)"},
                timeout=10,
            )
    except httpx.RequestError:
        _upsert_barcode_queue(db, barcode)
        return {"queued": True, "barcode": barcode}

    if resp.status_code != 200:
        _upsert_barcode_queue(db, barcode)
        return {"queued": True, "barcode": barcode}

    body    = resp.json()
    product = body.get("product") or {}
    status  = body.get("status")  # 0 = not found, 1 = found

    # Treat as a miss if OFF says not found or calories are absent (data unusable)
    nutriments = product.get("nutriments") or {}
    if status != 1 or nutriments.get("energy-kcal_100g") is None:
        _upsert_barcode_queue(db, barcode)
        return {"queued": True, "barcode": barcode}

    # ── 3. Normalize into a Food row ─────────────────────────────────────────
    name = (
        product.get("product_name_en")
        or product.get("product_name")
        or product.get("abbreviated_product_name")
        or "Unknown product"
    ).strip() or "Unknown product"

    food = Food(
        name     = name,
        category = "branded",
        source   = "openfoodfacts",
        barcode  = barcode,
        fdc_id   = None,
    )
    for off_key, (col, mult) in OFF_NUTRIENT_MAP.items():
        val = nutriments.get(off_key)
        setattr(food, col, round(val * mult, 2) if val is not None else None)

    db.add(food)
    db.flush()

    # ── 4. Portions: prefer serving_quantity (numeric grams), fall back to none ─
    serving_grams = product.get("serving_quantity")  # already a float in grams
    if serving_grams:
        db.add(FoodPortion(food_id=food.id, label="1 serving",
                           grams=float(serving_grams), is_default=1))
        db.add(FoodPortion(food_id=food.id, label="grams",
                           grams=1, is_default=0))
    else:
        db.add(FoodPortion(food_id=food.id, label="grams",
                           grams=1, is_default=1))

    # ── 5. Persist and return ─────────────────────────────────────────────────
    db.commit()
    db.refresh(food)
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
