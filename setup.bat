@echo off
REM eBay-GoGo — One-command setup (Windows)

echo =============================
echo   eBay-GoGo Setup
echo =============================
echo.

REM Check for Python
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed.
    echo   Download it from: https://www.python.org/downloads/
    echo   Then run this script again.
    pause
    exit /b 1
)
echo [OK] Found Python
python --version

REM Check for Node.js
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed.
    echo   Download it from: https://nodejs.org/
    echo   Then run this script again.
    pause
    exit /b 1
)
echo [OK] Found Node.js

REM Get script directory
cd /d "%~dp0"

REM Set up .env if needed
if not exist .env (
    copy .env.example .env >nul
    echo [OK] Created .env config file
) else (
    echo [OK] .env config already exists
)

REM Install backend
echo.
echo Installing backend dependencies...
python -m pip install -r backend\requirements.txt --quiet
echo [OK] Backend ready

REM Install frontend
echo.
echo Installing frontend dependencies...
cd frontend
call npm install --silent 2>nul
echo [OK] Frontend dependencies installed

echo.
echo Building the app...
call npx webpack --mode production
echo [OK] App built

cd ..

echo.
echo =============================
echo   Setup complete!
echo =============================
echo.
echo To start eBay-GoGo, double-click:  start.bat
echo.
echo NOTE: Before your first search, edit the .env file
echo with your eBay API keys from https://developer.ebay.com/my/keys
echo.
pause
