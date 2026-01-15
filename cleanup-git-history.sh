#!/bin/bash

# Git History Cleanup Script
# WARNING: This rewrites Git history. Make a backup first!

echo "🔒 Git History Cleanup Script"
echo "=============================="
echo ""
echo "⚠️  WARNING: This will rewrite Git history!"
echo "⚠️  Make sure you have:"
echo "   1. Rotated all credentials"
echo "   2. Updated Render Dashboard"
echo "   3. Coordinated with your team"
echo "   4. Made a backup of your repository"
echo ""
read -p "Have you completed all the above? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Aborted. Please complete the prerequisites first."
    exit 1
fi

echo ""
echo "📋 Creating backup..."
cd ..
BACKUP_DIR="Amazon Gymkhana-Website-BACKUP-$(date +%Y%m%d-%H%M%S)"
cp -r "Amazon Gymkhana-Website" "$BACKUP_DIR"
echo "✅ Backup created: $BACKUP_DIR"
cd "Amazon Gymkhana-Website"

echo ""
echo "📝 Creating secrets file..."
cat > secrets.txt << EOF
iW0UgtS1d5Fnf1gt
6NH5-ZlFcQnq4cMV6tua10b-1G0
my_secret_key_12345
cvxowgzqhgqbarsd
jzepgkmxmhiuuykx
Moazmughal786@gmail.com
moazmughal786@gmail.com
EOF

echo "✅ Secrets file created"

echo ""
echo "🔄 Method 1: Using git filter-repo (Recommended)"
echo "   Install: pip install git-filter-repo"
echo ""
echo "🔄 Method 2: Using BFG Repo-Cleaner (Alternative)"
echo "   Download: https://rtyley.github.io/bfg-repo-cleaner/"
echo ""
read -p "Which method? (1 for filter-repo, 2 for BFG): " method

if [ "$method" == "1" ]; then
    echo ""
    echo "🔄 Checking if git-filter-repo is installed..."
    if ! command -v git-filter-repo &> /dev/null; then
        echo "❌ git-filter-repo not found. Installing..."
        pip install git-filter-repo
    fi
    
    echo ""
    echo "🔄 Removing secrets from history..."
    git filter-repo --replace-text secrets.txt --force
    
elif [ "$method" == "2" ]; then
    echo ""
    echo "📥 Please download BFG from: https://rtyley.github.io/bfg-repo-cleaner/"
    echo "   Place bfg.jar in the parent directory"
    read -p "Press Enter when ready..."
    
    if [ ! -f "../bfg.jar" ]; then
        echo "❌ bfg.jar not found in parent directory"
        exit 1
    fi
    
    echo ""
    echo "🔄 Removing secrets from history..."
    java -jar ../bfg.jar --replace-text secrets.txt
    
else
    echo "❌ Invalid method selected"
    exit 1
fi

echo ""
echo "🧹 Cleaning up Git..."
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo ""
echo "✅ Git history cleaned!"
echo ""
echo "⚠️  NEXT STEPS:"
echo "   1. Review the changes: git log --oneline"
echo "   2. Force push to GitHub: git push --force --all origin"
echo "   3. Force push tags: git push --force --tags origin"
echo "   4. Notify team members to re-clone the repository"
echo ""
echo "🗑️  Cleanup:"
echo "   rm secrets.txt"
echo "   rm .env.rotation-checklist.txt"
echo ""
read -p "Do you want to force push now? (yes/no): " push_confirm

if [ "$push_confirm" == "yes" ]; then
    echo ""
    echo "🚀 Force pushing to GitHub..."
    git push --force --all origin
    git push --force --tags origin
    echo "✅ Force push complete!"
    
    echo ""
    echo "🗑️  Cleaning up temporary files..."
    rm secrets.txt
    echo "✅ Cleanup complete!"
    
    echo ""
    echo "🎉 All done! Your Git history is now clean."
    echo "   Remember to notify team members to re-clone."
else
    echo ""
    echo "⏸️  Force push skipped. You can do it manually later:"
    echo "   git push --force --all origin"
    echo "   git push --force --tags origin"
    echo ""
    echo "   Don't forget to remove: secrets.txt"
fi
