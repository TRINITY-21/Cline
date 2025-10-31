# GitHub Repository Setup Instructions

## Step 1: Create GitHub Repository

Since GitHub CLI is not available, you'll need to create the repository manually:

1. **Go to GitHub**: https://github.com/new
2. **Repository name**: `cline` (or any name you prefer)
3. **Visibility**: Select **Private** ✅
4. **Description**: "Three Two Live - Sports streaming platform"
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. **Click "Create repository"**

## Step 2: Connect Local Repository to GitHub

After creating the repository on GitHub, run these commands (replace `YOUR_USERNAME` with your GitHub username):

```bash
git remote add origin https://github.com/YOUR_USERNAME/cline.git
git branch -M main
git push -u origin main
```

## Step 3: Set Up GitHub Actions Secrets

1. **Go to your repository on GitHub**
2. **Navigate to**: Settings → Secrets and variables → Actions
3. **Click "New repository secret"** and add these two secrets:

   **Secret 1:**
   - Name: `API_BASE_URL`
   - Value: Your deployed app URL (e.g., `https://your-app.vercel.app`)

   **Secret 2:**
   - Name: `INTERNAL_UPDATE_TOKEN`
   - Value: Your `NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN` value from your `.env.local`

## Step 4: Verify Setup

1. Go to the **Actions** tab in your GitHub repository
2. You should see the "Update Match Statuses" workflow
3. Click on it and you'll see it runs every 5 minutes
4. You can also manually trigger it by clicking "Run workflow"

## Done! ✅

Your cron job will now automatically run every 5 minutes to update match statuses in Firestore, completely FREE!

---

## Quick Command Reference

If you need to push updates later:

```bash
git add .
git commit -m "Your commit message"
git push
```

