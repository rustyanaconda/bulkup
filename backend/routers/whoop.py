"""
Whoop OAuth endpoints.
The frontend hits these to connect/disconnect a Whoop device.

OAuth flow:
  1. GET  /whoop/connect          → returns Whoop login URL
  2. User logs in on Whoop; Whoop redirects to FRONTEND /whoop/callback?code=XXX
  3. Frontend reads ?code= and POSTs it here:
  4. POST /whoop/callback          → exchanges code for tokens, stores on user row
"""
import logging

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import date

logger = logging.getLogger(__name__)

from database import get_db
from models.models import User
from routers.auth import get_current_user
from services.whoop_service import get_auth_url, exchange_code_for_tokens, get_daily_calories
import state

router = APIRouter()


@router.get("/connect")
def connect_whoop(user: User = Depends(get_current_user)):
    """Returns the Whoop OAuth URL — frontend redirects the user there."""
    return {"auth_url": get_auth_url()}


@router.get("/status")
def whoop_status(user: User = Depends(get_current_user)):
    creds = state.WHOOP_CREDS
    return {
        "connected":       user.whoop_access_token is not None,
        "credentials_set": bool(creds["client_id"] and creds["client_secret"]),
    }


class CredentialsRequest(BaseModel):
    client_id:     str
    client_secret: str
    redirect_uri:  str


@router.post("/credentials")
def save_credentials(
    req:  CredentialsRequest,
    user: User = Depends(get_current_user),
):
    """Store Whoop developer app credentials entered via the Profile UI."""
    state.WHOOP_CREDS["client_id"]     = req.client_id.strip()
    state.WHOOP_CREDS["client_secret"] = req.client_secret.strip()
    state.WHOOP_CREDS["redirect_uri"]  = req.redirect_uri.strip()
    return {"status": "saved"}


class CallbackRequest(BaseModel):
    code: str


@router.post("/callback")
async def whoop_callback(
    req:  CallbackRequest,
    user: User    = Depends(get_current_user),
    db:   Session = Depends(get_db),
):
    """Frontend POSTs the one-time code here after Whoop redirects."""
    try:
        tokens = await exchange_code_for_tokens(req.code)
        user.whoop_access_token  = tokens["access_token"]
        user.whoop_refresh_token = tokens["refresh_token"]
        db.commit()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"status": "connected"}


@router.get("/calories/today")
async def get_todays_whoop_calories(user: User = Depends(get_current_user)):
    """Pull today's calorie burn from the user's stored Whoop token."""
    if not user.whoop_access_token:
        raise HTTPException(status_code=401, detail="Whoop not connected")

    today = date.today().isoformat()
    kcal  = await get_daily_calories(user.whoop_access_token, today)

    if kcal is None:
        raise HTTPException(
            status_code=404,
            detail="No Whoop data for today yet — wear your Whoop a bit longer."
        )

    return {"date": today, "burned_kcal": kcal, "source": "whoop"}


@router.post("/webhook")
async def whoop_webhook(request: Request):
    """
    Public endpoint — no auth. Whoop calls this server-to-server when new
    data is available. Stage A: log and acknowledge only.
    """
    headers = dict(request.headers)
    body    = await request.body()

    try:
        payload = await request.json()
    except Exception:
        payload = body.decode("utf-8", errors="replace")

    event_type = payload.get("type") if isinstance(payload, dict) else "unknown"

    print("=== WHOOP WEBHOOK RECEIVED ===", flush=True)
    print(f"EVENT TYPE: {event_type}", flush=True)
    print(f"HEADERS: {headers}", flush=True)
    print(f"PAYLOAD: {payload}", flush=True)
    print("==============================", flush=True)

    return {"received": True}
