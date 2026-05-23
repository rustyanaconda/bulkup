"""
BulkUp — FastAPI backend entry point

Run with:  uvicorn main:app --reload
Docs at:   http://localhost:8000/docs
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import meals, whoop, users, calories, auth, foods

app = FastAPI(title="Mise API", version="0.1.0")

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://bulkup-one.vercel.app",
        "https://mise.fit",
        "https://www.mise.fit",
        frontend_url,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,     prefix="/auth",     tags=["auth"])
app.include_router(users.router,    prefix="/users",    tags=["users"])
app.include_router(meals.router,    prefix="/meals",    tags=["meals"])
app.include_router(calories.router, prefix="/calories", tags=["calories"])
app.include_router(whoop.router,    prefix="/whoop",    tags=["whoop"])
app.include_router(foods.router,    prefix="/foods",    tags=["foods"])


@app.get("/")
def health_check():
    return {"status": "ok", "app": "Mise"}
