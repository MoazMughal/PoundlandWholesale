#!/bin/bash

echo "========================================"
echo " Clearing Vite Cache"
echo "========================================"
echo ""

echo "Deleting Vite cache..."
if [ -d "node_modules/.vite" ]; then
    rm -rf node_modules/.vite
    echo "✅ Vite cache deleted!"
else
    echo "ℹ️  Vite cache not found (already clean)"
fi

echo ""
echo "========================================"
echo " Cache cleared successfully!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Close your browser completely"
echo "2. Reopen browser"
echo "3. Run: npm run dev"
echo "4. Navigate to admin page"
echo "5. Press Ctrl+Shift+R to hard refresh"
echo ""
