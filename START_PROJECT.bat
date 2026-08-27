@echo off
title Manzil Launcher
echo ============================================
echo   Manzil - Starting Backend + Frontend
echo ============================================
echo.

start "Manzil API (backend)" cmd /k "cd /d %~dp0property-api && python -m uvicorn main:app --host 0.0.0.0 --port 8000"

echo [1/2] Backend starting on http://localhost:8000 (takes ~15s to load model)...
timeout /t 12 /nobreak >nul

start "Manzil Frontend" cmd /k "cd /d %~dp0manzil-frontend && npm run dev"
echo [2/2] Frontend starting on http://localhost:5173 ...

timeout /t 8 /nobreak >nul
start http://localhost:5173

echo.
echo Done! Two windows opened: API + Frontend. Browser will open automatically.
echo To stop: close both windows.
