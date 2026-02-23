@echo off
REM eBay-GoGo — Start the app (Windows)
cd /d "%~dp0\frontend"
echo Starting eBay-GoGo...
call npm run dev
pause
