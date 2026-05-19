# Dev Environment Setup

## Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL (local or via Railway)

## 1. Clone & enter the repo
```bash
git clone https://github.com/YOUR_USERNAME/bulkup.git
cd bulkup
```

## 2. Backend setup
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # fill in your secrets
uvicorn main:app --reload       # runs on http://localhost:8000
```

## 3. Frontend setup
```bash
cd frontend
npm install
cp .env.example .env.local      # fill in your secrets
npm run dev                     # runs on http://localhost:5173
```

## 4. Environment variables

### backend/.env
```
DATABASE_URL=postgresql://user:password@localhost/bulkup
WHOOP_CLIENT_ID=your_whoop_client_id
WHOOP_CLIENT_SECRET=your_whoop_client_secret
WHOOP_REDIRECT_URI=http://localhost:5173/whoop/callback
JWT_SECRET=your_random_secret_key
```

### frontend/.env.local
```
VITE_API_URL=http://localhost:8000
VITE_WHOOP_CLIENT_ID=your_whoop_client_id
```

## 5. Database setup
```bash
cd backend
alembic upgrade head    # runs all migrations, creates tables
```

## 6. Verify everything works
- Backend: open http://localhost:8000/docs — you'll see the auto-generated FastAPI docs
- Frontend: open http://localhost:5173 — you'll see the app shell

## Useful commands
```bash
# FastAPI auto-generates interactive API docs — use these to test endpoints
open http://localhost:8000/docs

# Test the TDEE calculation directly (pure Python, no server needed)
cd backend
python services/tdee_service.py

# Install a new Python package
pip install some-package && pip freeze > requirements.txt

# Install a new JS package
cd frontend && npm install some-package
```
