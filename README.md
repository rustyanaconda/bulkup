# Mise

Healthy weight gain app — clean food, Whoop integration, smart calorie targeting.

## Stack
| Layer | Tech |
|---|---|
| Frontend | React + Vite + Tailwind CSS |
| Backend | FastAPI (Python) |
| Database | PostgreSQL |
| Auth | JWT + OAuth2 (Whoop) |
| Hosting | Vercel (frontend) · Railway (backend) |

## Folder Structure
```
bulkup/
├── frontend/          # React app
│   └── src/
│       ├── components/
│       │   ├── meals/         # MealCard, MealList, MealAdjuster
│       │   ├── calories/      # CalorieBar, MacroRing, TDEECard
│       │   ├── smoothies/     # SmoothieCard, SmoothieList
│       │   └── shop/          # InstacartPanel, FactorPanel
│       ├── hooks/             # useWhoop, useMeals, useCalories
│       ├── utils/             # tdee.js, conversions.js
│       └── pages/             # Home, Meals, Progress, Shop, Profile
└── backend/           # FastAPI app
    ├── routers/       # meals.py, whoop.py, users.py, calories.py
    ├── models/        # SQLAlchemy models
    └── services/      # whoop_service.py, tdee_service.py
```

## Quick Start
See `/docs/setup.md` for full instructions.
