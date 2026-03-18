@echo off
REM Open Selenium test reports in Chrome browser
echo ========================================
echo Opening Selenium Test Reports
echo ========================================
echo.

cd /d "%~dp0\reports"

echo Opening test reports in Chrome...
echo.

REM Open index page
start chrome.exe "%~dp0reports\index.html"

REM Also open the final report
timeout /t 2 /nobreak >nul
start chrome.exe "%~dp0reports\FINAL_TEST_REPORT.html"

echo.
echo Reports opened in Chrome browser!
echo.
echo Available reports:
echo   - index.html (Report Dashboard)
echo   - FINAL_TEST_REPORT.html (Complete Results)
echo   - comprehensive_test_report.html (Core Tests)
echo   - functional_test_report.html (Feature Tests)
echo.
pause














