#\!/bin/bash

echo "🚀 Quick merge to main (no PR needed for your own repo)"
echo ""

# Ensure we're on main and up to date
git checkout main
git pull origin main

# Merge the feature branch
git merge feature/improve-ha-dashboard -m "Merge feature/improve-ha-dashboard: Major enhancements - resolve all GitHub issues & add deployment automation"

# Push to GitHub
git push origin main

echo ""
echo "✅ Successfully merged to main\!"
echo ""
echo "🎉 Your enhancements are now live on the main branch\!"
echo ""
echo "Next steps:"
echo "  1. Create a release: https://github.com/jrtownse/ch5-ha-bridge/releases/new"
echo "  2. Tag it as v5.0.0"
echo "  3. Share with the community\!"
