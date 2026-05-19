"""
User profile endpoints.
"""
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class UserProfile(BaseModel):
    email:               str
    name:                str
    weight_lbs:          float
    height_in:           float
    age:                 int
    sex:                 str
    activity_multiplier: float = 1.55
    surplus_kcal:        int   = 500
    goal_lbs:            float = 180.0


@router.get("/me")
def get_profile():
    """Return current user's profile. TODO: pull from DB using JWT token."""
    return {
        "email":               "user@example.com",
        "name":                "Alex",
        "weight_lbs":          164,
        "height_in":           70,
        "age":                 26,
        "sex":                 "male",
        "activity_multiplier": 1.55,
        "surplus_kcal":        500,
        "goal_lbs":            180,
    }


@router.put("/me")
def update_profile(profile: UserProfile):
    """Update user stats. TODO: save to DB."""
    return {"status": "updated", "profile": profile}
