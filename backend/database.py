import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

_engine = None
_SessionLocal = None


def _get_url() -> str:
    url = os.getenv("DATABASE_URL", "")
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url


def get_engine():
    global _engine
    if _engine is None:
        _engine = create_engine(
            _get_url(),
            pool_size=5,        # persistent connections kept open
            max_overflow=10,    # extra connections allowed under burst load
            pool_timeout=30,    # seconds to wait for a connection before erroring
            pool_recycle=300,   # recycle connections every 5 min — Railway closes idle ones
            pool_pre_ping=True, # test connection before use; silently reconnects if dropped
        )
    return _engine


def get_session_factory():
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=get_engine())
    return _SessionLocal


def get_db():
    """FastAPI dependency — yields a DB session and closes it on completion."""
    db = get_session_factory()()
    try:
        yield db
    finally:
        db.close()
