#!/bin/bash

# CH5 HA Bridge - Pull Request Creation Script
# This script will push your branch and create a PR

set -e

echo "🚀 Creating Pull Request for CH5 HA Bridge Enhancements"
echo "========================================================"
echo ""

# Check if we're on the right branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "feature/improve-ha-dashboard" ]; then
    echo "❌ Error: Not on feature/improve-ha-dashboard branch"
    echo "Current branch: $CURRENT_BRANCH"
    exit 1
fi

echo "✅ On correct branch: feature/improve-ha-dashboard"
echo ""

# Show what we're about to push
echo "📊 Commits to be pushed:"
git log --oneline origin/main..HEAD
echo ""

# Push the branch
echo "📤 Pushing branch to GitHub..."
if git push -u origin feature/improve-ha-dashboard; then
    echo "✅ Branch pushed successfully!"
else
    echo "❌ Failed to push. Please configure your GitHub credentials:"
    echo "   git config --global user.name 'Your Name'"
    echo "   git config --global user.email 'your.email@example.com'"
    echo ""
    echo "For HTTPS, you may need a personal access token:"
    echo "   https://github.com/settings/tokens"
    exit 1
fi

echo ""
echo "🌐 Opening GitHub to create PR..."

# Try to open the PR creation page
PR_URL="https://github.com/jrtownse/ch5-ha-bridge/compare/main...feature/improve-ha-dashboard?expand=1"

# Detect OS and open browser
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open "$PR_URL"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    if command -v xdg-open > /dev/null; then
        xdg-open "$PR_URL"
    elif command -v gnome-open > /dev/null; then
        gnome-open "$PR_URL"
    else
        echo "Please open this URL in your browser:"
        echo "$PR_URL"
    fi
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]]; then
    # Windows
    start "$PR_URL"
else
    echo "Please open this URL in your browser:"
    echo "$PR_URL"
fi

echo ""
echo "📝 Pull Request Template"
echo "========================"
echo ""
echo "Copy the content from PR_DESCRIPTION.md for your PR description."
echo ""
echo "PR Title suggestion:"
echo "feat: Major enhancements - resolve all GitHub issues & add deployment automation"
echo ""
echo "✅ Next Steps:"
echo "1. The PR creation page should have opened in your browser"
echo "2. Copy the content from PR_DESCRIPTION.md"
echo "3. Paste it as the PR description"
echo "4. Click 'Create pull request'"
echo "5. Merge when ready!"
echo ""
echo "🎉 Congratulations! Your enhancements are ready to merge!"