# Setup Instructions

## What was fixed
- Added a `.env` file to `backend/` (copied from `.env.example`) — the app needs this to load MongoDB/Gemini config, even if you don't have a real Gemini key yet.
- Added missing CSS rules in `frontend/src/index.css` for the Sign In / Register page (`.auth-hero`, `.auth-headline`, `.auth-tab-group`, `.auth-tab-btn`) — these classes were referenced in `App.jsx` but never defined, which is why the login card rendered small, unstyled, and off-center.

Note: the `backend/venv` and `frontend/node_modules` folders were removed before zipping (they're huge and machine-specific) — see steps below to recreate them.

## Run the backend
```
cd algorithmic-mirror/backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Check http://localhost:8000/docs loads.

## Run the frontend (separate terminal)
```
cd algorithmic-mirror/frontend
npm install
npm run dev
```
Open http://localhost:3000

## Requirements for full functionality
- **MongoDB**: install locally or use MongoDB Atlas, and set `MONGODB_URI` in `backend/.env`.
- **Gemini API key** (optional): the AI chat and risk analysis have fallback responses without it, but for real AI output, get a key from https://aistudio.google.com/apikey and set `GEMINI_API_KEY` in `backend/.env`.

Both servers must be running at the same time for the app (including sign-in/register and the AI chatbot) to work.
