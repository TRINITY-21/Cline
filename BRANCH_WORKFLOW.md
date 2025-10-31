# Branch Workflow Guide

## Branch Structure

- **`main`**: Production-ready code (deployed to Vercel)
- **`dev`**: Development branch for testing and features

## Workflow

### 1. Working on Features

```bash
# Make sure you're on dev branch
git checkout dev

# Create a feature branch (optional, for larger features)
git checkout -b feature/your-feature-name

# Make your changes, then commit
git add .
git commit -m "Add your feature"

# Push to dev
git push origin dev
```

### 2. Testing on Dev

- Push changes to `dev` branch
- Test thoroughly on dev environment (if set up)
- Or test locally before creating PR

### 3. Creating a Pull Request

1. Go to: https://github.com/TRINITY-21/Cline/pulls
2. Click **"New Pull Request"**
3. **Base**: `main`
4. **Compare**: `dev`
5. Add description and review changes
6. Click **"Create Pull Request"**

### 4. Merging to Main

- Review your PR
- Merge when ready
- Main branch will auto-deploy to Vercel (if connected)

## Quick Commands

```bash
# Switch to dev branch
git checkout dev

# Switch to main branch
git checkout main

# Pull latest changes
git pull origin dev    # for dev branch
git pull origin main   # for main branch

# Create new feature branch
git checkout dev
git checkout -b feature/your-feature-name
```

## Default Branch

By default, you should work on the `dev` branch and only merge to `main` when code is production-ready.

## Protection (Optional)

You can set up branch protection in GitHub:
1. Go to: Settings → Branches
2. Add rule for `main` branch
3. Require pull request reviews (optional)
4. This prevents direct pushes to main

