"""
Whoop API integration.
Handles OAuth 2.0 flow and data fetching.

Whoop API reference: https://developer.whoop.com/api
Apply for API access: https://developer-dashboard.whoop.com
"""
import httpx
import secrets
from urllib.parse import urlencode
import state

WHOOP_BASE      = "https://api.prod.whoop.com/developer"
WHOOP_AUTH_URL  = "https://api.prod.whoop.com/oauth/oauth2/auth"
WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token"


def get_auth_url() -> str:
    """
    Step 1 of OAuth — build the URL to send the user to Whoop's login page.
    After login, Whoop redirects to redirect_uri with a one-time `code`.
    """
    creds  = state.WHOOP_CREDS
    params = {
        "client_id":     creds["client_id"],
        "redirect_uri":  creds["redirect_uri"],
        "response_type": "code",
        "scope":         "offline read:cycles",
        "state":         secrets.token_urlsafe(16),
    }
    return f"{WHOOP_AUTH_URL}?{urlencode(params)}"


async def exchange_code_for_tokens(code: str) -> dict:
    """
    Step 2 of OAuth — swap the one-time code for access + refresh tokens.
    Access token expires in ~1 hour; use the refresh token to renew it.
    """
    creds = state.WHOOP_CREDS
    async with httpx.AsyncClient() as client:
        response = await client.post(
            WHOOP_TOKEN_URL,
            data={
                "grant_type":    "authorization_code",
                "code":          code,
                "redirect_uri":  creds["redirect_uri"],
                "client_id":     creds["client_id"],
                "client_secret": creds["client_secret"],
            }
        )
        response.raise_for_status()
        return response.json()


async def refresh_access_token(refresh_token: str) -> dict:
    """
    When the access token expires, use the refresh token to get a new one.
    Call this automatically when a 401 comes back from Whoop.
    """
    creds = state.WHOOP_CREDS
    async with httpx.AsyncClient() as client:
        response = await client.post(
            WHOOP_TOKEN_URL,
            data={
                "grant_type":    "refresh_token",
                "refresh_token": refresh_token,
                "client_id":     creds["client_id"],
                "client_secret": creds["client_secret"],
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

        cycle      = records[0]
        score      = cycle.get("score", {})
        kilojoules = score.get("kilojoule")

        if kilojoules is None:
            return None

        return round(kilojoules / 4.184)


async def get_body_measurements(access_token: str) -> dict:
    """
    Pull height, weight, max HR from Whoop.
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
