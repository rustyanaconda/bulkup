"""
BulkUp — FastAPI backend entry point

Run with:  uvicorn main:app --reload
Docs at:   http://localhost:8000/docs
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import meals, whoop, users, calories

app = FastAPI(title="BulkUp API", version="0.1.0")

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router,    prefix="/users",    tags=["users"])
app.include_router(meals.router,    prefix="/meals",    tags=["meals"])
app.include_router(calories.router, prefix="/calories", tags=["calories"])
app.include_router(whoop.router,    prefix="/whoop",    tags=["whoop"])


@app.get("/")
def health_check():
    return {"status": "ok", "app": "BulkUp"}
