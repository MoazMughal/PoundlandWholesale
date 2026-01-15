# Git History Cleanup Script (PowerShell)
# WARNING: This rewrites Git history. Make a backup first!

Write-Host "🔒 Git History Cleanup Script" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  WARNING: This will rewrite Git history!" -ForegroundColor Yellow
Write-Host "⚠️  Make sure you have:" -ForegroundColor Yellow
Write-Host "   1. Rotated all credentials"
Write-Host "   2. Updated Render Dashboard"
Write-Host "   3. Coordinated with your team"
Write-Host "   4. Made a backup of your repository"
Write-Host ""

$confirm = Read-Host "Have you completed all the above? (yes/no)"

if ($confirm -ne "yes") {
    Write-Host "❌ Aborted. Please complete the prerequisites first." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📋 Creating backup..." -ForegroundColor Cyan
$parentDir = Split-Path -Parent (Get-Location)
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path $parentDir "Amazon Gymkhana-Website-BACKUP-$timestamp"
Copy-Item -Path (Get-Location) -Destination $backupDir -Recurse
Write-Host "✅ Backup created: $backupDir" -ForegroundColor Green

Write-Host ""
Write-Host "📝 Creating secrets file..." -ForegroundColor Cyan
@"
iW0UgtS1d5Fnf1gt
6NH5-ZlFcQnq4cMV6tua10b-1G0
my_secret_key_12345
cvxowgzqhgqbarsd
jzepgkmxmhiuuykx
Moazmughal786@gmail.com
moazmughal786@gmail.com
"@ | Out-File -FilePath "secrets.txt" -Encoding UTF8

Write-Host "✅ Secrets file created" -ForegroundColor Green

Write-Host ""
Write-Host "🔄 Method 1: Using git filter-repo (Recommended)" -ForegroundColor Cyan
Write-Host "   Install: pip install git-filter-repo"
Write-Host ""
Write-Host "🔄 Method 2: Using BFG Repo-Cleaner (Alternative)" -ForegroundColor Cyan
Write-Host "   Download: https://rtyley.github.io/bfg-repo-cleaner/"
Write-Host ""

$method = Read-Host "Which method? (1 for filter-repo, 2 for BFG)"

if ($method -eq "1") {
    Write-Host ""
    Write-Host "🔄 Checking if git-filter-repo is installed..." -ForegroundColor Cyan
    
    try {
        $null = Get-Command git-filter-repo -ErrorAction Stop
    } catch {
        Write-Host "❌ git-filter-repo not found. Installing..." -ForegroundColor Yellow
        pip install git-filter-repo
    }
    
    Write-Host ""
    Write-Host "🔄 Removing secrets from history..." -ForegroundColor Cyan
    git filter-repo --replace-text secrets.txt --force
    
} elseif ($method -eq "2") {
    Write-Host ""
    Write-Host "📥 Please download BFG from: https://rtyley.github.io/bfg-repo-cleaner/" -ForegroundColor Cyan
    Write-Host "   Place bfg.jar in the parent directory"
    Read-Host "Press Enter when ready"
    
    $bfgPath = Join-Path $parentDir "bfg.jar"
    if (-not (Test-Path $bfgPath)) {
        Write-Host "❌ bfg.jar not found in parent directory" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "🔄 Removing secrets from history..." -ForegroundColor Cyan
    java -jar $bfgPath --replace-text secrets.txt
    
} else {
    Write-Host "❌ Invalid method selected" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🧹 Cleaning up Git..." -ForegroundColor Cyan
git reflog expire --expire=now --all
git gc --prune=now --aggressive

Write-Host ""
Write-Host "✅ Git history cleaned!" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  NEXT STEPS:" -ForegroundColor Yellow
Write-Host "   1. Review the changes: git log --oneline"
Write-Host "   2. Force push to GitHub: git push --force --all origin"
Write-Host "   3. Force push tags: git push --force --tags origin"
Write-Host "   4. Notify team members to re-clone the repository"
Write-Host ""
Write-Host "🗑️  Cleanup:" -ForegroundColor Cyan
Write-Host "   Remove-Item secrets.txt"
Write-Host "   Remove-Item .env.rotation-checklist.txt"
Write-Host ""

$pushConfirm = Read-Host "Do you want to force push now? (yes/no)"

if ($pushConfirm -eq "yes") {
    Write-Host ""
    Write-Host "🚀 Force pushing to GitHub..." -ForegroundColor Cyan
    git push --force --all origin
    git push --force --tags origin
    Write-Host "✅ Force push complete!" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "🗑️  Cleaning up temporary files..." -ForegroundColor Cyan
    Remove-Item secrets.txt -ErrorAction SilentlyContinue
    Write-Host "✅ Cleanup complete!" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "🎉 All done! Your Git history is now clean." -ForegroundColor Green
    Write-Host "   Remember to notify team members to re-clone."
} else {
    Write-Host ""
    Write-Host "⏸️  Force push skipped. You can do it manually later:" -ForegroundColor Yellow
    Write-Host "   git push --force --all origin"
    Write-Host "   git push --force --tags origin"
    Write-Host ""
    Write-Host "   Don't forget to remove: secrets.txt"
}
