@echo off
title SPR Weekly Report Hub
color 0A

echo.
echo  ============================================
echo   SPR Weekly Report Management Hub
echo  ============================================
echo.

:: ── Paths ────────────────────────────────────────────────────────────────────
set ROOT=%~dp0
set BACKEND=%ROOT%backend
set FRONTEND=%ROOT%frontend

:: ── Start Backend ─────────────────────────────────────────────────────────────
echo  [1/2] Starting Backend (FastAPI on port 8001)...
if not exist "%BACKEND%\venv\Scripts\uvicorn.exe" (
    echo  [ERROR] venv not found. Run setup.bat first.
    pause & exit /b 1
)

start "SPR Backend" cmd /k "cd /d %BACKEND% && venv\Scripts\uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload"

:: Wait for backend to be ready
echo  Waiting for backend to start...
timeout /t 4 /nobreak >nul

:: ── Start Frontend ────────────────────────────────────────────────────────────
echo  [2/2] Starting Frontend (Vite on port 5173)...
if not exist "%FRONTEND%\node_modules" (
    echo  [ERROR] node_modules not found. Run setup.bat first.
    pause & exit /b 1
)

start "SPR Frontend" cmd /k "cd /d %FRONTEND% && npm run dev"

:: Wait then open browser
echo  Waiting for frontend to start...
timeout /t 5 /nobreak >nul

echo.
echo  ============================================
echo   App running at: http://localhost:5173
echo   API running at: http://localhost:8001
echo   API Docs at:    http://localhost:8001/docs
echo  ============================================
echo.
echo  Default credentials:
echo    Admin      : admin@spr.com       / Admin@SPR2024!
echo    Eng Head   : eng.head@spr.com    / Password123!
echo    Ops Head   : ops.head@spr.com    / Password123!
echo.
echo  Close this window or press any key to open the browser.
echo.
pause >nul

start http://localhost:5173
