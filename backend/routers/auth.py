"""
Authentication — signup, login, and the get_current_user dependency.

Other routers protect their endpoints like this:
    from routers.auth import get_current_user
    ...
    def my_route(user: User = Depends(get_current_user)):
"""
import os
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.models import User

router = APIRouter()

# ── crypto setup ──────────────────────────────────────────────────────────────

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

_SECRET    = os.getenv("JWT_SECRET", "changeme-must-set-JWT_SECRET-in-env")
_ALGORITHM = "HS256"
_EXPIRE_DAYS = 7

# Reads "Authorization: Bearer <token>" from the request header.
# tokenUrl tells the /docs UI where to send login requests.
_oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ── internal helpers ──────────────────────────────────────────────────────────

def _hash(password: str) -> str:
    return _pwd.hash(password)


def _verify(plain: str, hashed: str) -> bool:
    return _pwd.verify(plain, hashed)


def _make_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(days=_EXPIRE_DAYS)
    return jwt.encode({"sub": str(user_id), "exp": expire}, _SECRET, algorithm=_ALGORITHM)


# ── request schemas ───────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    email:    str
    password: str


class LoginRequest(BaseModel):
    email:    str
    password: str


# ── endpoints ─────────────────────────────────────────────────────────────────

@router.post("/signup", status_code=201)
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    if not os.getenv("ALLOW_SIGNUPS", "false").lower() == "true":
        raise HTTPException(status_code=403, detail="New signups are currently closed.")

    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="An account with that email already exists")

    user = User(email=req.email, password_hash=_hash(req.password))
    db.add(user)
    db.commit()
    return {"message": "Account created. You can now log in."}


@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not _verify(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return {"token": _make_token(user.id), "token_type": "bearer"}


# ── reusable dependency ───────────────────────────────────────────────────────

def get_current_user(
    token: str          = Depends(_oauth2),
    db:    Session      = Depends(get_db),
) -> User:
    """
    Inject into any route to require a valid JWT.

        def my_route(user: User = Depends(get_current_user)):
            ...
    """
    err = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, _SECRET, algorithms=[_ALGORITHM])
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise err

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise err
    return user
