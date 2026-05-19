"""
Whoop OAuth endpoints.
The frontend hits these to connect/disconnect a Whoop device.
"""
import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
from services.whoop_service import get_auth_url, exchange_code_for_tokens, get_daily_calories
from datetime import date
import state

router = APIRouter()


@router.get("/connect")
def connect_whoop():
    """Returns the Whoop OAuth URL — frontend redirects the user here."""
    return {"auth_url": get_auth_url()}


@router.get("/status")
def whoop_status():
    return {"connected": state.WHOOP["access_token"] is not None}


@router.get("/callback")
async def whoop_callback(code: str):
    """
    Whoop redirects here after the user logs in.
    Stores tokens in memory, then sends the browser back to the frontend.
    """
    try:
        tokens = await exchange_code_for_tokens(code)
        state.WHOOP["access_token"]  = tokens["access_token"]
        state.WHOOP["refresh_token"] = tokens["refresh_token"]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    return RedirectResponse(url=f"{frontend_url}/profile?whoop=connected")


@router.get("/calories/today")
async def get_todays_whoop_calories():
    """Pull today's calorie burn from the stored Whoop token."""
    if not state.WHOOP["access_token"]:
        raise HTTPException(status_code=401, detail="Whoop not connected")

    today = date.today().isoformat()
    kcal  = await get_daily_calories(state.WHOOP["access_token"], today)

    if kcal is None:
        raise HTTPException(
            status_code=404,
            detail="No Whoop data for today yet — wear your Whoop a bit longer."
        )

    return {"date": today, "burned_kcal": kcal, "source": "whoop"}
