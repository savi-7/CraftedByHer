@echo off
REM Simple test runner for Selenium tests
echo ========================================
echo Running Selenium Tests
echo ========================================
echo.

cd /d "%~dp0"

REM Activate virtual environment if it exists
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
    echo Virtual environment activated
) else (
    echo Virtual environment not found, using system Python
)

echo.
echo Checking if application is running...
curl -s -o NUL -w "%%{http_code}" http://localhost:5173/ > temp_status.txt 2>NUL
set /p APP_STATUS=<temp_status.txt
del temp_status.txt 2>NUL

if "%APP_STATUS%"=="200" (
    echo ✅ Application is running
    echo.
) else (
    echo ❌ Application is NOT running at http://localhost:5173
    echo.
    echo Please start the application first:
    echo   1. Run: start-system.bat
    echo   2. Or manually: 
    echo      - Terminal 1: cd server ^&^& npm start
    echo      - Terminal 2: cd client ^&^& npm run dev
    echo.
    echo Then wait a few seconds and run this script again.
    echo.
    pause
    exit /b 1
)

REM Run tests
echo Running tests...
echo.
py -m pytest -v --html=reports/test_report.html --self-contained-html --tb=short

echo.
echo ========================================
echo Test execution complete
echo ========================================
echo.
echo Check reports/test_report.html for results
echo Screenshots saved in: screenshots/
echo.
pause

