@echo off
echo ===================================================
echo Starting The Algorithmic Mirror (Backend & Frontend)
echo ===================================================

echo Starting FastAPI Backend Server on http://localhost:8000 ...
start "Algorithmic Mirror - Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --reload --port 8000"

echo Starting React Frontend Server on http://localhost:3000 ...
start "Algorithmic Mirror - Frontend" cmd /k "cd /d %~dp0frontend && npm.cmd run dev"

echo.
echo Both servers started! Open your browser at http://localhost:3000
