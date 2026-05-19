"""
Whoop OAuth endpoints.
The frontend hits these to connect/disconnect a Whoop device.

OAuth flow:
  1. GET  /whoop/connect          → returns Whoop login URL
  2. User logs in on Whoop; Whoop redirects to FRONTEND /whoop/callback?code=XXX
  3. Frontend reads ?code= and POSTs it here:
  4. POST /whoop/callback          → exchanges code for tokens, stores in memory
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.whoop_service import get_auth_url, exchange_code_for_tokens, get_daily_calories
from datetime import date
import state

router = APIRouter()


@router.get("/connect")
def connect_whoop():
    """Returns the Whoop OAuth URL — frontend redirects the user there."""
    return {"auth_url": get_auth_url()}


@router.get("/status")
def whoop_status():
    return {"connected": state.WHOOP["access_token"] is not None}


class CallbackRequest(BaseModel):
    code: str


@router.post("/callback")
async def whoop_callback(req: CallbackRequest):
    """
    Frontend POSTs the one-time code here after Whoop redirects.
    Exchanges it for tokens and stores them in memory.
    """
    try:
        tokens = await exchange_code_for_tokens(req.code)
        state.WHOOP["access_token"]  = tokens["access_token"]
        state.WHOOP["refresh_token"] = tokens["refresh_token"]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"status": "connected"}


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
