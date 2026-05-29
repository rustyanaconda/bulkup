"""
Public waitlist endpoint — no auth required.
"""
import re
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from models.models import WaitlistSignup

router = APIRouter()

_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class WaitlistRequest(BaseModel):
    email: str


@router.post("")
def join_waitlist(req: WaitlistRequest, db: Session = Depends(get_db)):
    email = req.email.strip().lower()

    if not email or not _EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="Invalid email address.")

    try:
        db.add(WaitlistSignup(email=email))
        db.commit()
    except IntegrityError:
        db.rollback()
        # Duplicate signup — treat as success so we don't leak whether an email exists

    return {"ok": True}
