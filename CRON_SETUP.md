# Free Cron Job Setup Guide

## Option 1: Vercel Cron (Easiest - If Using Vercel)

If you're deploying to Vercel, this is the simplest option:

### Setup Steps:

1. **Deploy your app to Vercel** (if not already)

2. **The `vercel.json` file is already configured** with:
   ```json
   {
     "crons": [
       {
         "path": "/api/cron/update-match-statuses",
         "schedule": "*/5 * * * *"
       }
     ]
   }
   ```

3. **Set environment variable** in Vercel Dashboard:
   - Go to: Project Settings → Environment Variables
   - Add: `CRON_SECRET` = any random secret string (optional but recommended)

4. **Redeploy** - Vercel will automatically set up the cron job

### Benefits:
- ✅ FREE on Vercel Hobby plan
- ✅ Automatic setup
- ✅ Runs every 5 minutes
- ✅ No external service needed

---

## Option 2: GitHub Actions (Recommended - 100% Free)

### Setup Steps:

1. **Push your code to GitHub** (if not already):
   ```bash
   git add .
   git commit -m "Add cron workflow"
   git push
   ```

2. **Set up GitHub Secrets**:
   - Go to your GitHub repository
   - Navigate to: Settings → Secrets and variables → Actions
   - Add these secrets:
     - `API_BASE_URL`: Your deployed app URL (e.g., `https://your-app.vercel.app`)
     - `INTERNAL_UPDATE_TOKEN`: Your `NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN` value

3. **The workflow will automatically run every 5 minutes**

4. **To test manually**:
   - Go to Actions tab in GitHub
   - Select "Update Match Statuses" workflow
   - Click "Run workflow"

### Benefits:
- ✅ Completely FREE
- ✅ Unlimited runs
- ✅ Very reliable (GitHub infrastructure)
- ✅ Manual trigger option
- ✅ Logs and history in GitHub UI

---

## Option 2: cron-job.org (Free Tier)

### Setup Steps:

1. **Sign up at**: https://cron-job.org (free account)

2. **Create a new cron job**:
   - URL: `https://your-app-url.com/api/admin/matches/update-status-batch`
   - Method: `POST`
   - Headers:
     ```
     x-internal-token: YOUR_INTERNAL_UPDATE_TOKEN
     Content-Type: application/json
     ```
   - Schedule: Every 5 minutes (`*/5 * * * *` or use the visual editor)

3. **Save and activate**

### Free Tier Limits:
- ✅ Up to 1 cron job
- ✅ Runs every 5 minutes minimum
- ✅ More than enough for this use case

---

## Option 3: EasyCron (Free Tier)

1. **Sign up at**: https://www.easycron.com
2. **Create cron job**:
   - URL: `https://your-app-url.com/api/admin/matches/update-status-batch`
   - HTTP Method: POST
   - Headers: 
     ```
     x-internal-token: YOUR_INTERNAL_UPDATE_TOKEN
     ```
   - Schedule: Every 5 minutes

### Free Tier Limits:
- ✅ 1 cron job
- ✅ Minimum 10 minutes interval (so use every 10 minutes)
- ✅ 1,440 executions/month (enough for ~48 executions/day)

---

## Quick Test

Test your endpoint manually:
```bash
curl -X POST "https://your-app-url.com/api/admin/matches/update-status-batch" \
  -H "x-internal-token: YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

---

## Recommended: GitHub Actions

GitHub Actions is the best option because:
- ✅ 100% free forever
- ✅ No limits on runs
- ✅ Runs every 5 minutes (no minimum interval restrictions)
- ✅ Built-in logging and monitoring
- ✅ Can trigger manually from GitHub UI
- ✅ Version controlled (workflow file is in your repo)

