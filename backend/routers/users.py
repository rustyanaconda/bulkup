"""
User profile endpoints.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.models import User
from routers.auth import get_current_user

router = APIRouter()


class UserProfileUpdate(BaseModel):
    name:                str   | None = None
    weight_lbs:          float | None = None
    height_in:           float | None = None
    age:                 int   | None = None
    sex:                 str   | None = None
    activity_multiplier: float | None = None
    surplus_kcal:        int   | None = None
    goal_lbs:            float | None = None


def _serialize(user: User) -> dict:
    return {
        "email":               user.email,
        "name":                user.name,
        "weight_lbs":          user.weight_lbs,
        "height_in":           user.height_in,
        "age":                 user.age,
        "sex":                 user.sex,
        "activity_multiplier": user.activity or 1.55,
        "surplus_kcal":        user.surplus  or 500,
        "goal_lbs":            user.goal_lbs,
    }


@router.get("/me")
def get_profile(user: User = Depends(get_current_user)):
    return _serialize(user)


@router.put("/me")
def update_profile(
    profile: UserProfileUpdate,
    user:    User    = Depends(get_current_user),
    db:      Session = Depends(get_db),
):
    # API field name → ORM column name
    _col = {"activity_multiplier": "activity", "surplus_kcal": "surplus"}

    for field, value in profile.model_dump(exclude_none=True).items():
        setattr(user, _col.get(field, field), value)

    db.commit()
    db.refresh(user)
    return _serialize(user)
