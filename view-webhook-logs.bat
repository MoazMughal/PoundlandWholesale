@echo off
echo ========================================
echo    WEBHOOK LOGS VIEWER
echo ========================================
echo.

:menu
echo Choose an option:
echo 1. View last 20 webhook events
echo 2. View all buyer registrations
echo 3. View all seller registrations
echo 4. View Cloudinary uploads
echo 5. Count total webhook events
echo 6. Watch logs in real-time
echo 7. Open log file in Notepad
echo 8. Exit
echo.

set /p choice="Enter your choice (1-8): "

if "%choice%"=="1" goto last20
if "%choice%"=="2" goto buyers
if "%choice%"=="3" goto sellers
if "%choice%"=="4" goto cloudinary
if "%choice%"=="5" goto count
if "%choice%"=="6" goto realtime
if "%choice%"=="7" goto notepad
if "%choice%"=="8" goto end

echo Invalid choice. Please try again.
echo.
goto menu

:last20
echo.
echo Last 20 webhook events:
echo ----------------------------------------
powershell -Command "Get-Content server/logs/combined.log | Select-String 'WEBHOOK' | Select-Object -Last 20"
echo.
pause
goto menu

:buyers
echo.
echo All buyer registrations:
echo ----------------------------------------
powershell -Command "Get-Content server/logs/combined.log | Select-String 'buyer_registered'"
echo.
pause
goto menu

:sellers
echo.
echo All seller registrations:
echo ----------------------------------------
powershell -Command "Get-Content server/logs/combined.log | Select-String 'seller_registered'"
echo.
pause
goto menu

:cloudinary
echo.
echo Cloudinary uploads:
echo ----------------------------------------
powershell -Command "Get-Content server/logs/combined.log | Select-String 'cloudinary'"
echo.
pause
goto menu

:count
echo.
echo Webhook event counts:
echo ----------------------------------------
powershell -Command "$total = (Get-Content server/logs/combined.log | Select-String 'WEBHOOK').Count; $buyers = (Get-Content server/logs/combined.log | Select-String 'buyer_registered').Count; $sellers = (Get-Content server/logs/combined.log | Select-String 'seller_registered').Count; Write-Host 'Total webhook events:' $total; Write-Host 'Buyer registrations:' $buyers; Write-Host 'Seller registrations:' $sellers"
echo.
pause
goto menu

:realtime
echo.
echo Watching logs in real-time (Press Ctrl+C to stop)...
echo ----------------------------------------
powershell -Command "Get-Content server/logs/combined.log -Wait -Tail 10 | Select-String 'WEBHOOK'"
goto menu

:notepad
echo.
echo Opening log file in Notepad...
notepad server\logs\combined.log
goto menu

:end
echo.
echo Goodbye!
exit
