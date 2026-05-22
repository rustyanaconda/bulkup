"""
Meal plan endpoints.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Literal
from sqlalchemy.orm import Session
from datetime import date

from database import get_db
from models.models import MealLog, Meal, MealState, Tag, User
from routers.auth import get_current_user

router = APIRouter()


class MealCreate(BaseModel):
    name:      str
    calories:  int
    meal_time: Literal["breakfast", "lunch", "dinner", "snack"]
    tag_ids:   list[int] = []


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
