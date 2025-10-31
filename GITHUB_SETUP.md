# GitHub Repository Setup Instructions

## Quick Setup (Automatic - If GitHub CLI is installed)

Run the setup script:
```bash
./create-github-repo.sh
```

This will automatically:
1. Create a private repository named `cline`
2. Push your code
3. Give you the link to set up secrets

---

## Manual Setup

### Step 1: Create GitHub Repository

1. **Go to GitHub**: https://github.com/new
2. **Repository name**: `cline` (or any name you prefer)
3. **Visibility**: Select **Private** ✅
4. **Description**: "Three Two Live - Sports streaming platform"
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. **Click "Create repository"**

### Step 2: Connect Local Repository to GitHub

After creating the repository on GitHub, run these commands (replace `YOUR_USERNAME` with your GitHub username):

```bash
git remote add origin https://github.com/YOUR_USERNAME/cline.git
git branch -M main
git push -u origin main
```

## Step 3: Deploy Your App (Required Before Setting Up Cron)

⚠️ **Important**: GitHub Actions runs on GitHub's servers and cannot access `localhost`. You need to deploy your app first.

### Quick Deployment Options:

**Option A: Vercel (Recommended - Free)**
1. Go to: https://vercel.com
2. Sign up/login and import your GitHub repository
3. Deploy (Vercel will auto-detect Next.js)
4. Your app URL will be: `https://your-app-name.vercel.app`

**Option B: Netlify (Free)**
1. Go to: https://netlify.com
2. Connect your GitHub repository
3. Build command: `npm run build`
4. Publish directory: `.next`
5. Your app URL will be: `https://your-app-name.netlify.app`

**Option C: For Testing (ngrok - Temporary Tunnel)**
```bash
# Install ngrok: https://ngrok.com/download
ngrok http 3000
# Use the https URL ngrok provides (e.g., https://abc123.ngrok.io)
# Note: This URL changes each time you restart ngrok
```

## Step 4: Set Up GitHub Actions Secrets

1. **Go to your repository on GitHub**
2. **Navigate to**: Settings → Secrets and variables → Actions
3. **Click "New repository secret"** and add these two secrets:

   **Secret 1:**
   - Name: `API_BASE_URL`
   - Value: Your deployed app URL (e.g., `https://your-app.vercel.app`)
     - ⚠️ **Do NOT use `localhost`** - it won't work
     - Must be a public URL (Vercel, Netlify, or ngrok for testing)

   **Secret 2:**
   - Name: `INTERNAL_UPDATE_TOKEN`
   - Value: Your `NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN` value from your `.env.local`
     - Make sure this same value is also set in your deployment environment variables!

## Step 5: Verify Setup

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

