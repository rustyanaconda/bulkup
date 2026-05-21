"""
Meal plan endpoints.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Literal
from sqlalchemy.orm import Session
from datetime import date

from database import get_db
from models.models import MealLog, Meal, MealState, User
from routers.auth import get_current_user

router = APIRouter()


class MealStateUpdate(BaseModel):
    meal_id: int
    state:   Literal["done", "skipped", "upcoming"]


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
        }
        for log, meal in rows
    ]
    return {"meals": meals}


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
