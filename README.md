# The Algorithmic Mirror 🪞

> An AI-Driven Framework Exploring Mental Health, Digital Habits, and Academic Performance in Gen Z using **MongoDB**, **FastAPI**, **React**, and the **Gemini API**.

---

## 🏗️ Tech Stack

- **Frontend**: React (Vite, Lucide Icons, Glassmorphic Vanilla CSS Design System)
- **Backend Framework**: Python FastAPI (Uvicorn, Pydantic)
- **Database Engine**: MongoDB (Motor Async Driver, PyMongo)
- **AI Core**: Gemini API (`gemini-1.5-flash`) + Fallback Heuristic Risk Algorithm

---

## 📁 Project Structure

```
algorithmic-mirror/
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI Endpoints & MongoDB CRUD
│   │   ├── database.py           # MongoDB Connection Manager (Motor)
│   │   ├── models.py             # Pydantic Schemas (Users, DigitalHabits, MentalProfile)
│   │   └── services/
│   │       └── gemini_service.py # Gemini AI Analysis & Risk Evaluation
│   ├── .env.example              # Configuration variables template
│   └── requirements.txt          # Python dependencies
├── frontend/
│   ├── index.html
│   ├── package.json              # React dependencies
│   ├── vite.config.js            # Vite configuration & backend proxy
│   └── src/
│       ├── App.jsx               # Interactive Gen Z Wellness Dashboard
│       ├── index.css             # Glassmorphic UI Design System
│       └── main.jsx
└── README.md
```

---

## 🚀 Quick Start Instructions

### 1. MongoDB Setup
Ensure MongoDB is running locally on default port `27017` or provide a MongoDB Atlas URI:
```bash
# Example local MongoDB run via Docker (optional)
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 2. Backend Setup (FastAPI)
```bash
cd backend

# Create virtual environment (optional)
python -m venv venv
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env from example
cp .env.example .env

# Run FastAPI dev server
uvicorn app.main:app --reload --port 8000
```
- API Documentation: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/health`

### 3. Frontend Setup (React)
```bash
cd frontend

# Install packages
npm install

# Start Vite dev server
npm run dev
```
- Open browser at `http://localhost:3000`

---

## 🧠 MongoDB Data Schemas

Collection: `assessments`
```json
{
  "_id": ObjectId("..."),
  "user": { "name": "Jordan Lee", "age": 21, "gender": "Non-binary" },
  "habits": {
    "screen_time": 7.5,
    "sleep_hours": 5.5,
    "social_activity_hours": 1.5,
    "social_media_platform": "TikTok"
  },
  "mental_profile": { "stress_level": 7, "anxiety_level": 6, "depression_level": 4 },
  "recommendation": {
    "risk_category": "Medium",
    "risk_score": 65.0,
    "summary": "High screen time with sleep deficit detected.",
    "recommendation_advice": [
      "Increase sleep duration from 5.5h to at least 7.5h per night.",
      "Implement a 30-minute screen-free wind-down buffer before bed."
    ]
  },
  "created_at": "2026-09-03T16:20:00Z"
}
```
