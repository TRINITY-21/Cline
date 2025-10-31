# Deployment Guide for Three Two Live

## Why Deploy?

GitHub Actions runs on GitHub's servers and cannot access `localhost`. You need to deploy your app to a public URL for the cron job to work.

---

## 🚀 Quick Deploy Options

### Option 1: Vercel (Recommended - 2 minutes)

**Why Vercel?**
- ✅ FREE forever (Hobby plan)
- ✅ Automatic deployments from GitHub
- ✅ Built-in cron support (`vercel.json` already configured)
- ✅ Environment variables support
- ✅ Perfect for Next.js apps

**Steps:**

1. **Go to**: https://vercel.com/new
2. **Import your GitHub repository** (make sure it's pushed to GitHub first)
3. **Configure environment variables**:
   - Click "Environment Variables"
   - Add all variables from your `.env.local`:
     - `NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN`
     - `NEXT_PUBLIC_MATCHES_COLLECTION`
     - `NEXT_PUBLIC_DAILY_MATCHES_COLLECTION`
     - `NEXT_PUBLIC_MATCHES_STORAGE`
     - Any Firebase credentials (or use service account file)
   - ⚠️ **Important**: Add `CRON_SECRET` = any random string (for Vercel Cron)

4. **Deploy** - Vercel will auto-detect Next.js and deploy

5. **Your app URL**: `https://your-app-name.vercel.app`

6. **For GitHub Actions**:
   - Add secret `API_BASE_URL` = `https://your-app-name.vercel.app`
   - Add secret `INTERNAL_UPDATE_TOKEN` = same as env var

7. **Bonus**: Vercel Cron is already configured in `vercel.json` - it will run every 5 minutes automatically! (You can skip GitHub Actions if using Vercel Cron)

---

### Option 2: Netlify (Alternative)

**Steps:**

1. **Go to**: https://app.netlify.com
2. **Import from Git** → Select your repository
3. **Build settings**:
   - Build command: `npm run build`
   - Publish directory: `.next`
4. **Environment variables**: Add all from `.env.local`
5. **Deploy**

**Your app URL**: `https://your-app-name.netlify.app`

---

### Option 3: Testing with ngrok (Temporary)

For testing before full deployment:

```bash
# 1. Install ngrok: https://ngrok.com/download

# 2. Run your Next.js app locally
npm run dev

# 3. In another terminal, run ngrok
ngrok http 3000

# 4. Use the https URL provided (e.g., https://abc123.ngrok.io)
# ⚠️ Note: This URL changes every time you restart ngrok
```

---

## 🔐 Environment Variables to Set

Make sure to set these in your deployment platform:

**Required:**
- `NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN` - Your internal token for API auth
- Firebase credentials (service account or env vars)

**Optional but Recommended:**
- `NEXT_PUBLIC_MATCHES_COLLECTION` - Default: `matches`
- `NEXT_PUBLIC_DAILY_MATCHES_COLLECTION` - Default: `daily_matches`
- `NEXT_PUBLIC_MATCHES_STORAGE` - Set to `firestore`
- `CRON_SECRET` - Random secret for cron security (if using Vercel Cron)

---

## ✅ After Deployment

1. **Test your API endpoint**:
   ```bash
   curl -X POST "https://your-app-url.com/api/admin/matches/update-status-batch" \
     -H "x-internal-token: YOUR_TOKEN" \
     -H "Content-Type: application/json"
   ```

2. **Set up GitHub Actions secrets** (if not using Vercel Cron):
   - `API_BASE_URL` = Your deployed URL
   - `INTERNAL_UPDATE_TOKEN` = Your token

3. **Verify cron job works**:
   - GitHub Actions: Check Actions tab
   - Vercel Cron: Check Functions → Cron Jobs in Vercel dashboard

---

## 🎯 Recommended Setup

**Best Option**: Deploy to Vercel and use **Vercel Cron** (already configured in `vercel.json`)
- No GitHub Actions needed
- Simpler setup
- Free and reliable

**Alternative**: Deploy anywhere + GitHub Actions
- Works with any hosting
- More control over cron schedule

