@echo off
echo ========================================================
echo   Starting HeritageAI - Digital Restoration Platform
echo ========================================================

echo.
echo [1/2] Launching FastAPI Backend on http://localhost:8000 ...
start "HeritageAI Backend" cmd /k "cd /d %~dp0backend && venv\Scripts\activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

echo.
echo [2/2] Launching Vite Frontend on http://localhost:5173 ...
start "HeritageAI Frontend" cmd /k "cd /d %~dp0frontend && npm.cmd run dev"

echo.
echo HeritageAI is running!
echo Backend API Docs: http://localhost:8000/docs
echo Frontend Web App: http://localhost:5173
echo.
echo Keep the terminal windows open while using the application.
pause
