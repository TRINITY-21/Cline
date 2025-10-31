#!/bin/bash
# Script to create GitHub repository and push code

echo "🚀 Setting up GitHub repository..."
echo ""

# Check if gh CLI is installed
if command -v gh &> /dev/null; then
    echo "✓ GitHub CLI found"
    gh auth status 2>&1 | grep -q "logged in" || {
        echo "⚠️  Not logged in. Please run: gh auth login"
        exit 1
    }
    
    echo "Creating private repository..."
    gh repo create cline --private --source=. --remote=origin --description="Three Two Live - Sports streaming platform"
    
    echo ""
    echo "Pushing code to GitHub..."
    git push -u origin main
    
    echo ""
    echo "✅ Repository created and code pushed!"
    echo ""
    echo "Next steps:"
    echo "1. Go to: https://github.com/$(gh api user | jq -r .login)/cline/settings/secrets/actions"
    echo "2. Add these secrets:"
    echo "   - API_BASE_URL: Your deployed app URL"
    echo "   - INTERNAL_UPDATE_TOKEN: Your internal update token"
else
    echo "GitHub CLI not found. Please follow manual steps:"
    echo ""
    echo "1. Create repository at: https://github.com/new"
    echo "   - Name: cline"
    echo "   - Visibility: Private"
    echo "   - Don't initialize with README"
    echo ""
    echo "2. Then run:"
    echo "   git remote add origin https://github.com/YOUR_USERNAME/cline.git"
    echo "   git push -u origin main"
fi

