#\!/bin/bash

echo "🔀 Merging feature/improve-ha-dashboard to main"
echo "================================================"

# Fetch latest changes
echo "📥 Fetching latest changes..."
git fetch origin

# Switch to main branch
echo "📌 Switching to main branch..."
git checkout main

# Pull latest main
echo "🔄 Updating main branch..."
git pull origin main

# Merge feature branch
echo "🔀 Merging feature branch..."
git merge feature/improve-ha-dashboard

# Push to remote
echo "📤 Pushing merged main to GitHub..."
git push origin main

echo ""
echo "✅ Merge complete\!"
echo ""
echo "Optional: Delete feature branch"
echo "  Local:  git branch -d feature/improve-ha-dashboard"
echo "  Remote: git push origin --delete feature/improve-ha-dashboard"
