"""
Calorie target endpoints.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import date

from database import get_db
from models.models import MealLog, Meal, MealState, User
from routers.auth import get_current_user
from services.tdee_service import calculate_target
from services.whoop_service import fetch_daily_calories_with_refresh

router = APIRouter()


class TDEERequest(BaseModel):
    weight_lbs:          float
    height_in:           float
    age:                 int
    sex:                 str
    activity_multiplier: float    = 1.55
    surplus_kcal:        int      = 500
    whoop_burned_kcal:   int|None = None


@router.post("/tdee")
def get_tdee(req: TDEERequest):
    return calculate_target(
        weight_lbs=req.weight_lbs,
        height_in=req.height_in,
        age=req.age,
        sex=req.sex,
        activity_multiplier=req.activity_multiplier,
        surplus_kcal=req.surplus_kcal,
        whoop_burned_kcal=req.whoop_burned_kcal,
    )


@router.get("/today")
async def get_today(
    user: User    = Depends(get_current_user),
    db:   Session = Depends(get_db),
):
    today = date.today()

    rows = (
        db.query(MealLog, Meal)
        .join(Meal, MealLog.meal_id == Meal.id)
        .filter(
            MealLog.user_id == user.id,
            MealLog.date    == today,
            MealLog.state   == MealState.done,
        )
        .all()
    )
    eaten = sum(
        (log.calories_logged if log.calories_logged is not None else meal.calories) or 0
        for log, meal in rows
    )

    # Benchmark: pure formula estimate — never uses Whoop so it's stable all day
    benchmark = calculate_target(
        weight_lbs=user.weight_lbs        or 170,
        height_in=user.height_in          or 70,
        age=user.age                      or 25,
        sex=user.sex                      or "male",
        activity_multiplier=user.activity or 1.55,
        surplus_kcal=user.surplus         or 500,
    )
    expected_burn = benchmark["bmr"] + benchmark["activity"]

    # Live Whoop burn — may be None (not scored yet) or partial (climbs through day)
    burned: int | None = None
    if user.whoop_access_token:
        burned = await fetch_daily_calories_with_refresh(user, db, today.isoformat())

    return {
        "eaten":  eaten,
        "target": benchmark["target"],
        "benchmark": {
            "bmr":           benchmark["bmr"],
            "activity":      benchmark["activity"],
            "surplus":       benchmark["surplus"],
            "expected_burn": expected_burn,
            "target":        benchmark["target"],
        },
        "whoop": {
            "connected":     bool(user.whoop_access_token),
            "burned_so_far": burned,
        },
    }
