"""
Calorie target endpoints.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from services.tdee_service import calculate_target
from services.whoop_service import get_daily_calories
from datetime import date
import state

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
    """
    Calculate a user's daily calorie target.
    Test it at http://localhost:8000/docs after starting the server.
    """
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
async def get_today():
    """
    The single endpoint the Home page needs:
      - eaten_kcal  — sum of meals marked done
      - burned_kcal — from Whoop (None if not connected or not yet scored)
      - target_kcal — BMR + activity (Whoop or multiplier) + 500 surplus
    """
    eaten = sum(m["calories"] for m in state.MEALS if m["state"] == "done")

    # Try Whoop; silently fall back if not connected or data not ready yet
    burned: int | None = None
    if state.WHOOP["access_token"]:
        try:
            burned = await get_daily_calories(
                state.WHOOP["access_token"], date.today().isoformat()
            )
        except Exception:
            pass

    u = state.USER
    breakdown = calculate_target(
        weight_lbs=u["weight_lbs"],
        height_in=u["height_in"],
        age=u["age"],
        sex=u["sex"],
        activity_multiplier=u["activity_multiplier"],
        surplus_kcal=u["surplus_kcal"],
        whoop_burned_kcal=burned,
    )

    return {
        "eaten":           eaten,
        "burned":          burned,
        "target":          breakdown["target"],
        "breakdown":       breakdown,
        "whoop_connected": burned is not None,
    }
