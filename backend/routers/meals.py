"""
Meal plan endpoints.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Literal
import state

router = APIRouter()


class MealStateUpdate(BaseModel):
    meal_id: int
    state:   Literal["done", "skipped", "upcoming"]


@router.get("/today")
def get_todays_meals():
    return {"meals": state.MEALS}


@router.patch("/{meal_id}/state")
def update_meal_state(meal_id: int, update: MealStateUpdate):
    meal = next((m for m in state.MEALS if m["id"] == meal_id), None)
    if meal is None:
        raise HTTPException(status_code=404, detail="Meal not found")
    meal["state"] = update.state
    return {"meal_id": meal_id, "state": update.state}
