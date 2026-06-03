"""
Meal plan endpoints.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Literal
from sqlalchemy import func
from sqlalchemy.orm import Session
from datetime import date, datetime

from database import get_db
from models.models import MealLog, Meal, MealIngredient, MealState, Tag, User
from routers.auth import get_current_user

router = APIRouter()


class MealCreate(BaseModel):
    name:      str
    calories:  int
    meal_time: Literal["breakfast", "lunch", "dinner", "snack"]
    tag_ids:   list[int] = []
    protein_g: float | None = None
    carbs_g:   float | None = None
    fat_g:     float | None = None


class Per100g(BaseModel):
    calories:  float | None = None
    protein_g: float | None = None
    carbs_g:   float | None = None
    fat_g:     float | None = None


class IngredientIn(BaseModel):
    fdc_id:      int | None = None  # null for Edamam/barcode scanned items
    food_id:     int | None = None  # our internal foods.id for curated/scanned items
    description: str
    per_100g:    Per100g
    quantity:    float
    unit:        str
    gram_weight: float  # grams for ONE of this portion


class MealFromIngredients(BaseModel):
    name:        str
    meal_time:   Literal["breakfast", "lunch", "dinner", "snack"]
    tag_ids:     list[int] = []
    ingredients: list[IngredientIn]


class MealStateUpdate(BaseModel):
    meal_id: int
    state:   Literal["done", "skipped", "upcoming"]


def _find_meal_by_name(db: Session, user_id: int, name: str) -> Meal | None:
    """Case-insensitive name match within the user's meals."""
    return (
        db.query(Meal)
        .filter(Meal.user_id == user_id, func.lower(Meal.name) == name.strip().lower())
        .first()
    )


def _log_meal(db: Session, meal: Meal, user_id: int) -> MealLog:
    """Create a MealLog with a calorie+macro snapshot from the Meal at this moment."""
    meal.use_count = (meal.use_count or 0) + 1
    meal.last_used = datetime.utcnow()
    log = MealLog(
        user_id          = user_id,
        meal_id          = meal.id,
        date             = date.today(),
        state            = MealState.upcoming,
        calories_logged  = meal.calories,
        protein_g_logged = meal.protein_g,
        carbs_g_logged   = meal.carbs_g,
        fat_g_logged     = meal.fat_g,
    )
    db.add(log)
    return log


class LogSavedMealRequest(BaseModel):
    meal_id: int


@router.post("/log", status_code=201)
def log_saved_meal(
    body: LogSavedMealRequest,
    user: User    = Depends(get_current_user),
    db:   Session = Depends(get_db),
):
    """Re-log an existing saved Meal by id. Snapshots all calories + macros."""
    meal = db.query(Meal).filter(
        Meal.id == body.meal_id, Meal.user_id == user.id
    ).first()
    if meal is None:
        raise HTTPException(status_code=404, detail="Saved meal not found")

    log = _log_meal(db, meal, user.id)
    db.commit()
    db.refresh(log)
    db.refresh(meal)

    return {
        "id":        log.id,
        "name":      meal.name,
        "calories":  log.calories_logged,
        "meal_time": meal.meal_time,
        "state":     log.state.value,
        "tags":      [{"id": t.id, "name": t.name, "slug": t.slug,
                       "tag_type": t.tag_type} for t in meal.tags],
    }


@router.delete("/saved/{meal_id}", status_code=200)
def delete_saved_meal(
    meal_id: int,
    user:    User    = Depends(get_current_user),
    db:      Session = Depends(get_db),
):
    """Delete a saved Meal template and all its child rows."""
    meal = db.query(Meal).filter(
        Meal.id == meal_id, Meal.user_id == user.id
    ).first()
    if meal is None:
        raise HTTPException(status_code=404, detail="Saved meal not found")

    # Delete child rows before the parent to satisfy FK constraints.
    # meal_ingredients and meal_tags would cascade via ORM, but being
    # explicit avoids surprises if cascade settings change.
    db.query(MealLog).filter(MealLog.meal_id == meal_id).delete()
    db.delete(meal)  # cascades meal_ingredients + meal_tags via ORM
    db.commit()
    return {"deleted": True, "id": meal_id}


@router.get("/saved")
def get_saved_meals(
    user: User    = Depends(get_current_user),
    db:   Session = Depends(get_db),
):
    """Return the user's reusable Meal templates, most-recently-used first."""
    meals = (
        db.query(Meal)
        .filter(Meal.user_id == user.id)
        .order_by(Meal.last_used.desc().nullslast(), Meal.use_count.desc())
        .all()
    )
    return [
        {
            "id":              m.id,
            "name":            m.name,
            "calories":        m.calories,
            "protein_g":       m.protein_g,
            "carbs_g":         m.carbs_g,
            "fat_g":           m.fat_g,
            "meal_time":       m.meal_time,
            "use_count":       m.use_count,
            "last_used":       m.last_used.isoformat() if m.last_used else None,
            "has_ingredients": len(m.ingredients_list) > 0,
            "tags": [{"id": t.id, "name": t.name, "slug": t.slug,
                      "tag_type": t.tag_type} for t in m.tags],
        }
        for m in meals
    ]


@router.post("", status_code=201)
def create_meal(
    body: MealCreate,
    user: User    = Depends(get_current_user),
    db:   Session = Depends(get_db),
):
    meal = _find_meal_by_name(db, user.id, body.name)

    if meal is None:
        meal = Meal(
            user_id   = user.id,
            name      = body.name.strip(),
            calories  = body.calories,
            meal_time = body.meal_time,
            protein_g = body.protein_g,
            carbs_g   = body.carbs_g,
            fat_g     = body.fat_g,
        )
        db.add(meal)
        db.flush()  # assigns meal.id
        if body.tag_ids:
            meal.tags = db.query(Tag).filter(Tag.id.in_(body.tag_ids)).all()

    log = _log_meal(db, meal, user.id)
    db.commit()
    db.refresh(log)
    db.refresh(meal)

    return {
        "id":        log.id,
        "name":      meal.name,
        "calories":  log.calories_logged,
        "meal_time": meal.meal_time,
        "state":     log.state.value,
        "tags":      [{"id": t.id, "name": t.name, "slug": t.slug, "tag_type": t.tag_type} for t in meal.tags],
    }


@router.get("/today")
def get_todays_meals(
    user: User    = Depends(get_current_user),
    db:   Session = Depends(get_db),
):
    today = date.today()
    rows  = (
        db.query(MealLog, Meal)
        .join(Meal, MealLog.meal_id == Meal.id)
        .filter(MealLog.user_id == user.id, MealLog.date == today)
        .all()
    )
    meals = [
        {
            "id":        log.id,
            "name":      meal.name,
            "calories":  log.calories_logged if log.calories_logged is not None else meal.calories,
            "meal_time": meal.meal_time,
            "state":     log.state.value,
            "tags":      [{"id": t.id, "name": t.name, "slug": t.slug, "tag_type": t.tag_type} for t in meal.tags],
        }
        for log, meal in rows
    ]
    return {"meals": meals}


@router.get("/tags")
def get_all_tags(
    user: User    = Depends(get_current_user),
    db:   Session = Depends(get_db),
):
    tags = db.query(Tag).order_by(Tag.tag_type, Tag.name).all()
    return [
        {"id": t.id, "name": t.name, "slug": t.slug, "tag_type": t.tag_type}
        for t in tags
    ]


@router.post("/from-ingredients", status_code=201)
def create_meal_from_ingredients(
    body: MealFromIngredients,
    user: User    = Depends(get_current_user),
    db:   Session = Depends(get_db),
):
    # ── 1. Calculate per-ingredient nutrition ─────────────────────────────
    ing_rows = []
    total = {"calories": 0.0, "protein_g": 0.0, "carbs_g": 0.0, "fat_g": 0.0}

    for ing in body.ingredients:
        grams  = ing.quantity * ing.gram_weight
        factor = grams / 100.0
        p      = ing.per_100g

        cal  = round((p.calories  or 0) * factor)
        pro  = round((p.protein_g or 0) * factor, 1)
        carb = round((p.carbs_g   or 0) * factor, 1)
        fat  = round((p.fat_g     or 0) * factor, 1)

        total["calories"]  += cal
        total["protein_g"] += pro
        total["carbs_g"]   += carb
        total["fat_g"]     += fat

        ing_rows.append({
            "fdc_id":      ing.fdc_id,
            "description": ing.description,
            "quantity":    ing.quantity,
            "unit":        ing.unit,
            "grams":       grams,
            "calories":    cal  if p.calories  is not None else None,
            "protein_g":   pro  if p.protein_g is not None else None,
            "carbs_g":     carb if p.carbs_g   is not None else None,
            "fat_g":       fat  if p.fat_g     is not None else None,
        })

    # ── 2. Find or create the Meal template ──────────────────────────────
    meal = _find_meal_by_name(db, user.id, body.name)

    if meal is None:
        meal = Meal(
            user_id   = user.id,
            name      = body.name.strip(),
            meal_time = body.meal_time,
            calories  = round(total["calories"]),
            protein_g = round(total["protein_g"], 1),
            carbs_g   = round(total["carbs_g"],   1),
            fat_g     = round(total["fat_g"],     1),
        )
        db.add(meal)
        db.flush()  # assigns meal.id

        if body.tag_ids:
            meal.tags = db.query(Tag).filter(Tag.id.in_(body.tag_ids)).all()

        # ── 3. Create MealIngredient rows (new meal only — never overwrite) ──
        for row in ing_rows:
            db.add(MealIngredient(meal_id=meal.id, **row))

    # ── 4. Create today's MealLog with snapshot ───────────────────────────
    log = _log_meal(db, meal, user.id)
    db.commit()
    db.refresh(log)
    db.refresh(meal)

    return {
        "id":        log.id,
        "name":      meal.name,
        "calories":  meal.calories,
        "meal_time": meal.meal_time,
        "state":     log.state.value,
        "tags":      [{"id": t.id, "name": t.name, "slug": t.slug, "tag_type": t.tag_type} for t in meal.tags],
        "ingredients": [
            {
                "description": i.description,
                "quantity":    i.quantity,
                "unit":        i.unit,
                "grams":       i.grams,
                "calories":    i.calories,
            }
            for i in meal.ingredients_list
        ],
    }


@router.delete("/{log_id}", status_code=200)
def delete_meal(
    log_id: int,
    user:   User    = Depends(get_current_user),
    db:     Session = Depends(get_db),
):
    log = (
        db.query(MealLog)
        .filter(MealLog.id == log_id, MealLog.user_id == user.id)
        .first()
    )
    if log is None:
        raise HTTPException(status_code=404, detail="Meal not found")

    # Delete only the log — the Meal template is retained for reuse.
    # Orphaned Meals (no remaining logs) stay in the saved list until
    # explicitly deleted via a future "remove saved meal" endpoint.
    db.delete(log)
    db.commit()
    return {"deleted": True, "id": log_id}


@router.patch("/{log_id}/state")
def update_meal_state(
    log_id: int,
    update: MealStateUpdate,
    user:   User    = Depends(get_current_user),
    db:     Session = Depends(get_db),
):
    log = db.query(MealLog).filter(
        MealLog.id == log_id,
        MealLog.user_id == user.id,
    ).first()

    if log is None:
        raise HTTPException(status_code=404, detail="Meal log not found")

    log.state = MealState(update.state)
    db.commit()
    return {"meal_id": log_id, "state": update.state}
