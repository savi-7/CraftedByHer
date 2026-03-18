@echo off
REM Start application and run tests automatically
echo ========================================
echo Starting Application and Running Tests
echo ========================================
echo.

cd /d "%~dp0\.."

REM Check if app is already running
echo Checking if application is running...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:5173' -TimeoutSec 2 -UseBasicParsing; Write-Host 'Frontend is running' } catch { Write-Host 'Frontend is NOT running' }" > temp_check.txt 2>&1
findstr /C:"running" temp_check.txt >nul
if %errorlevel%==0 (
    echo Application is already running!
    del temp_check.txt
    goto :run_tests
)

del temp_check.txt
echo.
echo Starting application...
echo.

REM Start backend server
echo [1/2] Starting backend server...
start "Backend Server" cmd /k "cd server && npm start"
timeout /t 5 /nobreak >nul

REM Start frontend client
echo [2/2] Starting frontend client...
start "Frontend Client" cmd /k "cd client && npm run dev"
timeout /t 8 /nobreak >nul

echo.
echo Waiting for application to be ready...
echo.

REM Wait for application to be ready
:wait_loop
timeout /t 2 /nobreak >nul
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:5173' -TimeoutSec 2 -UseBasicParsing; exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel% neq 0 (
    echo Still waiting for application to start...
    goto :wait_loop
)

echo Application is ready!
echo.

:run_tests
echo ========================================
echo Running Selenium Tests
echo ========================================
echo.

cd selenium-tests

REM Activate virtual environment
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
)

REM Run tests
echo Running tests (this will open Chrome browser)...
echo.
py -m pytest test_00_health_check.py test_13_home_page.py test_02_login.py test_05_product_browsing.py -v --html=reports/test_report.html --self-contained-html --tb=short

echo.
echo ========================================
echo Test execution complete
echo ========================================
echo.
echo Check reports/test_report.html for results
echo.
pause














