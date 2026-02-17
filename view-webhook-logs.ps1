# Webhook Logs Viewer - PowerShell Script
# Easy way to view webhook logs on Windows

function Show-Menu {
    Clear-Host
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "      WEBHOOK LOGS VIEWER" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. View last 20 webhook events" -ForegroundColor Yellow
    Write-Host "2. View all buyer registrations" -ForegroundColor Yellow
    Write-Host "3. View all seller registrations" -ForegroundColor Yellow
    Write-Host "4. View Cloudinary uploads" -ForegroundColor Yellow
    Write-Host "5. Count webhook events" -ForegroundColor Yellow
    Write-Host "6. Watch logs in real-time" -ForegroundColor Yellow
    Write-Host "7. Search logs" -ForegroundColor Yellow
    Write-Host "8. Open log file in Notepad" -ForegroundColor Yellow
    Write-Host "9. Exit" -ForegroundColor Red
    Write-Host ""
}

function Show-Last20 {
    Write-Host "`nLast 20 webhook events:" -ForegroundColor Green
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Get-Content server/logs/combined.log | Select-String "WEBHOOK" | Select-Object -Last 20 | ForEach-Object {
        Write-Host $_.Line -ForegroundColor White
    }
    Write-Host ""
    Read-Host "Press Enter to continue"
}

function Show-Buyers {
    Write-Host "`nAll buyer registrations:" -ForegroundColor Green
    Write-Host "----------------------------------------" -ForegroundColor Gray
    $buyers = Get-Content server/logs/combined.log | Select-String "buyer_registered"
    if ($buyers) {
        $buyers | ForEach-Object {
            Write-Host $_.Line -ForegroundColor White
        }
        Write-Host "`nTotal: $($buyers.Count) buyer registrations" -ForegroundColor Cyan
    } else {
        Write-Host "No buyer registrations found." -ForegroundColor Yellow
    }
    Write-Host ""
    Read-Host "Press Enter to continue"
}

function Show-Sellers {
    Write-Host "`nAll seller registrations:" -ForegroundColor Green
    Write-Host "----------------------------------------" -ForegroundColor Gray
    $sellers = Get-Content server/logs/combined.log | Select-String "seller_registered"
    if ($sellers) {
        $sellers | ForEach-Object {
            Write-Host $_.Line -ForegroundColor White
        }
        Write-Host "`nTotal: $($sellers.Count) seller registrations" -ForegroundColor Cyan
    } else {
        Write-Host "No seller registrations found." -ForegroundColor Yellow
    }
    Write-Host ""
    Read-Host "Press Enter to continue"
}

function Show-Cloudinary {
    Write-Host "`nCloudinary uploads:" -ForegroundColor Green
    Write-Host "----------------------------------------" -ForegroundColor Gray
    $uploads = Get-Content server/logs/combined.log | Select-String "cloudinary"
    if ($uploads) {
        $uploads | ForEach-Object {
            Write-Host $_.Line -ForegroundColor White
        }
        Write-Host "`nTotal: $($uploads.Count) uploads" -ForegroundColor Cyan
    } else {
        Write-Host "No Cloudinary uploads found." -ForegroundColor Yellow
    }
    Write-Host ""
    Read-Host "Press Enter to continue"
}

function Show-Count {
    Write-Host "`nWebhook event counts:" -ForegroundColor Green
    Write-Host "----------------------------------------" -ForegroundColor Gray
    
    $total = (Get-Content server/logs/combined.log | Select-String "WEBHOOK").Count
    $buyers = (Get-Content server/logs/combined.log | Select-String "buyer_registered").Count
    $sellers = (Get-Content server/logs/combined.log | Select-String "seller_registered").Count
    $cloudinary = (Get-Content server/logs/combined.log | Select-String "cloudinary").Count
    
    Write-Host "Total webhook events:    " -NoNewline -ForegroundColor White
    Write-Host $total -ForegroundColor Cyan
    Write-Host "Buyer registrations:     " -NoNewline -ForegroundColor White
    Write-Host $buyers -ForegroundColor Green
    Write-Host "Seller registrations:    " -NoNewline -ForegroundColor White
    Write-Host $sellers -ForegroundColor Green
    Write-Host "Cloudinary uploads:      " -NoNewline -ForegroundColor White
    Write-Host $cloudinary -ForegroundColor Yellow
    
    Write-Host ""
    Read-Host "Press Enter to continue"
}

function Watch-RealTime {
    Write-Host "`nWatching logs in real-time (Press Ctrl+C to stop)..." -ForegroundColor Green
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Get-Content server/logs/combined.log -Wait -Tail 10 | Where-Object { $_ -match "WEBHOOK" } | ForEach-Object {
        Write-Host $_ -ForegroundColor Cyan
    }
}

function Search-Logs {
    Write-Host ""
    $searchTerm = Read-Host "Enter search term"
    Write-Host "`nSearch results for '$searchTerm':" -ForegroundColor Green
    Write-Host "----------------------------------------" -ForegroundColor Gray
    $results = Get-Content server/logs/combined.log | Select-String $searchTerm
    if ($results) {
        $results | ForEach-Object {
            Write-Host $_.Line -ForegroundColor White
        }
        Write-Host "`nTotal: $($results.Count) matches" -ForegroundColor Cyan
    } else {
        Write-Host "No matches found." -ForegroundColor Yellow
    }
    Write-Host ""
    Read-Host "Press Enter to continue"
}

function Open-Notepad {
    Write-Host "`nOpening log file in Notepad..." -ForegroundColor Green
    notepad server\logs\combined.log
}

# Main loop
do {
    Show-Menu
    $choice = Read-Host "Enter your choice (1-9)"
    
    switch ($choice) {
        "1" { Show-Last20 }
        "2" { Show-Buyers }
        "3" { Show-Sellers }
        "4" { Show-Cloudinary }
        "5" { Show-Count }
        "6" { Watch-RealTime }
        "7" { Search-Logs }
        "8" { Open-Notepad }
        "9" { 
            Write-Host "`nGoodbye!" -ForegroundColor Cyan
            exit 
        }
        default { 
            Write-Host "`nInvalid choice. Please try again." -ForegroundColor Red
            Start-Sleep -Seconds 2
        }
    }
} while ($true)
