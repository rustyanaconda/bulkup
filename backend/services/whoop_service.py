"""
Whoop API integration.
Handles OAuth 2.0 flow and data fetching.

Whoop API reference: https://developer.whoop.com/api
Apply for API access: https://developer-dashboard.whoop.com
"""
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

WHOOP_BASE      = "https://api.prod.whoop.com/developer"
WHOOP_AUTH_URL  = "https://api.prod.whoop.com/oauth/oauth2/auth"
WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token"

CLIENT_ID     = os.getenv("WHOOP_CLIENT_ID")
CLIENT_SECRET = os.getenv("WHOOP_CLIENT_SECRET")
REDIRECT_URI  = os.getenv("WHOOP_REDIRECT_URI")


def get_auth_url() -> str:
    """
    Step 1 of OAuth — build the URL to send the user to Whoop's login page.
    After login, Whoop redirects to REDIRECT_URI with a one-time `code`.
    """
    scopes = " ".join([
        "read:recovery",
        "read:cycles",
        "read:workout",
        "read:profile",
        "read:body_measurement",
    ])
    return (
        f"{WHOOP_AUTH_URL}"
        f"?client_id={CLIENT_ID}"
        f"&redirect_uri={REDIRECT_URI}"
        f"&response_type=code"
        f"&scope={scopes}"
    )


async def exchange_code_for_tokens(code: str) -> dict:
    """
    Step 2 of OAuth — swap the one-time code for access + refresh tokens.
    Store both tokens in the DB. Access token expires in ~1 hour.
    Refresh token lasts much longer and is used to get new access tokens.
    """
    async with httpx.AsyncClient() as client:
        response = await client.post(
            WHOOP_TOKEN_URL,
            data={
                "grant_type":    "authorization_code",
                "code":          code,
                "redirect_uri":  REDIRECT_URI,
                "client_id":     CLIENT_ID,
                "client_secret": CLIENT_SECRET,
            }
        )
        response.raise_for_status()
        return response.json()


async def refresh_access_token(refresh_token: str) -> dict:
    """
    When the access token expires, use the refresh token to get a new one.
    Call this automatically when a 401 comes back from Whoop.
    """
    async with httpx.AsyncClient() as client:
        response = await client.post(
            WHOOP_TOKEN_URL,
            data={
                "grant_type":    "refresh_token",
                "refresh_token": refresh_token,
                "client_id":     CLIENT_ID,
                "client_secret": CLIENT_SECRET,
            }
        )
        response.raise_for_status()
        return response.json()


async def get_daily_calories(access_token: str, date: str) -> int | None:
    """
    Pull today's total calorie burn from Whoop's cycle endpoint.

    Whoop stores energy as kilojoules — divide by 4.184 to get kcal.
    date format: "2026-05-06"

    Returns kcal as int, or None if Whoop hasn't scored the day yet
    (usually happens in the morning before enough data is collected).
    """
    headers = {"Authorization": f"Bearer {access_token}"}

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{WHOOP_BASE}/v2/cycle",
            headers=headers,
            params={
                "start": f"{date}T00:00:00.000Z",
                "end":   f"{date}T23:59:59.000Z",
            }
        )
        response.raise_for_status()
        data = response.json()

        records = data.get("records", [])
        if not records:
            return None

        cycle     = records[0]
        score     = cycle.get("score", {})
        kilojoules = score.get("kilojoule")

        if kilojoules is None:
            return None

        return round(kilojoules / 4.184)


async def get_body_measurements(access_token: str) -> dict:
    """
    Pull height, weight, max HR from Whoop.
    Useful to keep user profile in sync without manual entry.

    Returns imperial units (lbs, inches) to match the app's data model.
    """
    headers = {"Authorization": f"Bearer {access_token}"}

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{WHOOP_BASE}/v2/user/measurement/body",
            headers=headers,
        )
        response.raise_for_status()
        data = response.json()

        return {
            "weight_lbs": round(data["weight_kilogram"] / 0.453592, 1),
            "height_in":  round(data["height_meter"]    / 0.0254,   1),
            "max_hr":     data["max_heart_rate"],
        }
