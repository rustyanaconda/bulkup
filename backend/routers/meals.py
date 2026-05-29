"""
Meal plan endpoints.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Literal
from sqlalchemy.orm import Session
from datetime import date

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


@router.post("", status_code=201)
def create_meal(
    body: MealCreate,
    user: User    = Depends(get_current_user),
    db:   Session = Depends(get_db),
):
    meal = Meal(
        user_id=user.id,
        name=body.name,
        calories=body.calories,
        meal_time=body.meal_time,
        protein_g=body.protein_g,
        carbs_g=body.carbs_g,
        fat_g=body.fat_g,
    )
    db.add(meal)
    db.flush()  # assigns meal.id without committing yet

    if body.tag_ids:
        tags = db.query(Tag).filter(Tag.id.in_(body.tag_ids)).all()
        meal.tags = tags  # silently drops any ids that don't exist

    log = MealLog(
        user_id=user.id,
        meal_id=meal.id,
        date=date.today(),
        state=MealState.upcoming,
    )
    db.add(log)
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

    # ── 2. Create Meal with summed nutrition ──────────────────────────────
    meal = Meal(
        user_id   = user.id,
        name      = body.name,
        meal_time = body.meal_time,
        calories  = round(total["calories"]),
        protein_g = round(total["protein_g"], 1),
        carbs_g   = round(total["carbs_g"],   1),
        fat_g     = round(total["fat_g"],     1),
    )
    db.add(meal)
    db.flush()  # assigns meal.id

    if body.tag_ids:
        tags = db.query(Tag).filter(Tag.id.in_(body.tag_ids)).all()
        meal.tags = tags

    # ── 3. Create MealIngredient rows ─────────────────────────────────────
    for row in ing_rows:
        db.add(MealIngredient(meal_id=meal.id, **row))

    # ── 4. Create today's MealLog ─────────────────────────────────────────
    log = MealLog(
        user_id = user.id,
        meal_id = meal.id,
        date    = date.today(),
        state   = MealState.upcoming,
    )
    db.add(log)
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
