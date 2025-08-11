@echo off
title Company Delivery Map Creation
echo.
echo ========================================
echo   Company Delivery Map Creation
echo ========================================
echo.
echo Starting the application...
echo.
echo The map will open in your default browser.
echo You can close this window after the browser opens.
echo.
echo Press Ctrl+C to stop the local server if needed.
echo.

REM Try to open with different browsers if default fails
start "" "index.html" || start "" "chrome.exe" "index.html" || start "" "firefox.exe" "index.html" || start "" "msedge.exe" "index.html"

if errorlevel 1 (
    echo.
    echo Could not open browser automatically.
    echo Please manually open 'index.html' in your browser.
    echo.
    pause
) else (
    echo.
    echo Application started successfully!
    echo.
    echo You can now:
    echo - Add countries using checkboxes
    echo - View curved delivery routes from your origin
    echo - Manage your delivery network
    echo.
    echo Keep this window open while using the application.
    echo.
)

pause