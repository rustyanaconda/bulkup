# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend
```bash
cd backend
source venv/bin/activate          # Windows: venv\Scripts\activate
uvicorn main:app --reload         # http://localhost:8000
```

### Frontend
```bash
cd frontend
npm run dev                       # http://localhost:5173
npm run build
```

### Database
```bash
cd backend && alembic upgrade head   # run migrations
```

### Testing TDEE logic (no server needed)
```bash
cd backend && python services/tdee_service.py
```

Interactive API docs (test endpoints manually): http://localhost:8000/docs

## Architecture

**Full-stack health/nutrition app** — React frontend + FastAPI backend + PostgreSQL. Mobile-first layout (max-w-md).

### Backend (`backend/`)

- `main.py` — FastAPI app, CORS config (allows localhost:5173), router registration
- `routers/` — one file per domain: `meals`, `calories`, `whoop`, `users`. Routers currently use placeholder data; DB wiring is a TODO.
- `models/models.py` — SQLAlchemy ORM. Four tables: `users`, `meals` (templates), `meal_logs` (instance of a meal on a specific date with state tracking), `daily_calories`
- `services/tdee_service.py` — pure Python TDEE/BMR calculations (Mifflin-St Jeor). Run directly to test.
- `services/whoop_service.py` — Whoop OAuth2 flow + API calls. Whoop returns energy in kilojoules; divide by 4.184 for kcal.

### Frontend (`frontend/src/`)

- `App.jsx` — React Router setup; five routes: `/`, `/meals`, `/progress`, `/shop`, `/profile`
- `pages/` — one component per route
- `components/` — organized by domain: `meals/`, `calories/`, `smoothies/`, `shop/`
- `hooks/useWhoop.js` — Whoop OAuth connection state + calorie fetch
- `hooks/useMeals.js` — meal plan data
- `utils/tdee.js` — **JS mirror of `tdee_service.py`** for instant UI recalculation without a network round-trip. Backend is the source of truth for anything persisted.

### Key design decisions

- **TDEE logic is duplicated** on purpose: frontend version (`utils/tdee.js`) for live form feedback, backend version (`services/tdee_service.py`) for persistence. Keep them in sync.
- **`Meal` vs `MealLog`**: `Meal` is a reusable template (recipe card). `MealLog` is one instance of that meal on a specific date, with a `state` (upcoming/done/skipped/missed) and optional calorie override.
- **Vite proxy**: `vite.config.js` proxies `/api/*` → `http://localhost:8000` during dev (strips the `/api` prefix). Frontend hooks use `VITE_API_URL` directly (not the `/api` prefix), so both patterns can coexist.
- **Whoop OAuth** tokens (`access_token`, `refresh_token`) are stored per-user in the `users` table. Access tokens expire in ~1 hour; use the refresh token to get new ones on 401.
- All units stored in imperial (lbs, inches); Whoop API returns metric — conversion happens in `whoop_service.py`.

## Environment variables

`backend/.env` (copy from `.env.example`):
- `DATABASE_URL` — PostgreSQL connection string
- `WHOOP_CLIENT_ID`, `WHOOP_CLIENT_SECRET`, `WHOOP_REDIRECT_URI`
- `JWT_SECRET`

`frontend/.env.local`:
- `VITE_API_URL=http://localhost:8000`
- `VITE_WHOOP_CLIENT_ID`
I want you to create a simple version of the