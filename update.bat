@echo off
REM eBay-GoGo — Update to latest version (Windows)

echo =============================
echo   eBay-GoGo Updater
echo =============================
echo.

cd /d "%~dp0"

REM Check if git is installed
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo Git is not installed. Downloading update as ZIP instead...
    echo.

    REM Fallback: use PowerShell to download the latest ZIP
    echo Downloading latest version...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/art2gecko/ebay-gogo/archive/refs/heads/main.zip' -OutFile '%TEMP%\ebay-gogo-update.zip'"
    if %errorlevel% neq 0 (
        echo ERROR: Download failed. Check your internet connection.
        pause
        exit /b 1
    )

    echo Extracting update...
    powershell -Command "Expand-Archive -Path '%TEMP%\ebay-gogo-update.zip' -DestinationPath '%TEMP%\ebay-gogo-update' -Force"

    REM Copy new files over (preserves .env)
    echo Applying update (your .env settings will be kept)...
    xcopy "%TEMP%\ebay-gogo-update\ebay-gogo-main\*" "%~dp0" /E /Y /Q >nul 2>&1

    REM Clean up
    del "%TEMP%\ebay-gogo-update.zip" >nul 2>&1
    rmdir /S /Q "%TEMP%\ebay-gogo-update" >nul 2>&1

    goto :reinstall
)

REM Git is available — use it
echo Checking for updates...
git pull origin main
if %errorlevel% neq 0 (
    echo.
    echo WARNING: Git pull had issues. Trying a clean update...
    git fetch origin main
    git reset --hard origin/main
)

:reinstall
echo.
echo Reinstalling dependencies...
python -m pip install -r backend\requirements.txt --quiet
echo [OK] Backend updated

cd frontend
call npm install --silent 2>nul
echo [OK] Frontend dependencies updated

echo.
echo Rebuilding the app...
call npx webpack --mode production
echo [OK] App rebuilt

cd ..

echo.
echo =============================
echo   Update complete!
echo =============================
echo.
echo Double-click start.bat to run the updated app.
echo.
pause
