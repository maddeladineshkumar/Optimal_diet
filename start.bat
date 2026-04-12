@echo off
echo ===================================================
echo Starting OptimalDiet.ai Setup and Launch
echo ===================================================

echo.
echo Installing dependencies (this may take a moment on first run)...
call npm install

echo.
echo Starting the development server...
call npm run dev

pause
