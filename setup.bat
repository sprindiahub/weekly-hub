@echo off
title SPR Hub - First Time Setup
color 0B

echo.
echo  ============================================
echo   SPR Weekly Hub - First Time Setup
echo  ============================================
echo.

set ROOT=%~dp0
set BACKEND=%ROOT%backend
set FRONTEND=%ROOT%frontend

:: ── Backend Setup ─────────────────────────────────────────────────────────────
echo  [BACKEND] Creating Python virtual environment...
cd /d "%BACKEND%"

python -m venv venv
if errorlevel 1 (
    echo  [ERROR] Python not found. Install Python 3.11+ and try again.
    pause & exit /b 1
)

echo  [BACKEND] Installing Python dependencies...
call venv\Scripts\pip install -r requirements.txt
if errorlevel 1 (
    echo  [ERROR] pip install failed.
    pause & exit /b 1
)

:: Copy .env if not exists
if not exist "%BACKEND%\.env" (
    copy "%BACKEND%\.env.example" "%BACKEND%\.env" >nul
    echo  [BACKEND] Created .env from template. Edit it to configure SMTP etc.
)

:: Create uploads folder
if not exist "%BACKEND%\uploads" mkdir "%BACKEND%\uploads"

:: ── Frontend Setup ────────────────────────────────────────────────────────────
echo.
echo  [FRONTEND] Installing Node dependencies...
cd /d "%FRONTEND%"

where npm >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Node.js / npm not found. Install Node.js 18+ and try again.
    pause & exit /b 1
)

npm install
if errorlevel 1 (
    echo  [ERROR] npm install failed.
    pause & exit /b 1
)

echo.
echo  ============================================
echo   Setup complete!
echo   Run start.bat to launch the application.
echo  ============================================
echo.
pause
