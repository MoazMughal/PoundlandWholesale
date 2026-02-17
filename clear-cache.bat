@echo off
echo ========================================
echo  Clearing Vite Cache
echo ========================================
echo.

echo Stopping any running processes...
taskkill /F /IM node.exe 2>nul

echo.
echo Deleting Vite cache...
if exist "node_modules\.vite" (
    rmdir /s /q "node_modules\.vite"
    echo Vite cache deleted!
) else (
    echo Vite cache not found (already clean)
)

echo.
echo ========================================
echo  Cache cleared successfully!
echo ========================================
echo.
echo Next steps:
echo 1. Close your browser completely
echo 2. Reopen browser
echo 3. Run: npm run dev
echo 4. Navigate to admin page
echo 5. Press Ctrl+Shift+R to hard refresh
echo.
pause
