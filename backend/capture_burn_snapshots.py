"""
Record a burn snapshot for every Whoop-connected user.

Fetches each user's current calorie burn from the Whoop API and writes a
timestamped BurnSnapshot row. Skips users whose burn hasn't been scored
yet (burned_kcal would be None — no point storing that).

Usage:
    cd backend
    source venv/bin/activate
    python capture_burn_snapshots.py

Railway CLI:
    railway run python capture_burn_snapshots.py
"""
import os
import sys
import asyncio
from datetime import date, datetime

sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from database import get_db
from models.models import User, BurnSnapshot
from services.whoop_service import fetch_daily_calories_with_refresh


async def main() -> None:
    db    = next(get_db())
    today = date.today()

    try:
        users = db.query(User).filter(User.whoop_access_token.isnot(None)).all()

        print(f"=== capture_burn_snapshots  date={today}  users={len(users)}", flush=True)

        inserted = 0
        skipped  = 0
        errors   = 0

        for user in users:
            print(f"── user_id={user.id} ({user.email})", flush=True)
            try:
                burned = await fetch_daily_calories_with_refresh(user, db, today.isoformat())
            except Exception as e:
                print(f"   ERROR: {type(e).__name__}: {e}", flush=True)
                errors += 1
                continue

            if burned is None:
                print(f"   skipped — burn not scored yet", flush=True)
                skipped += 1
                continue

            db.add(BurnSnapshot(
                user_id     = user.id,
                date        = today,
                recorded_at = datetime.utcnow(),
                burned_kcal = burned,
            ))
            db.commit()
            print(f"   inserted  burned_kcal={burned}", flush=True)
            inserted += 1

        print(f"\n{'─' * 50}", flush=True)
        print(
            f"Done — {inserted} inserted, {skipped} skipped (not scored), "
            f"{errors} errored.",
            flush=True,
        )

    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(main())
