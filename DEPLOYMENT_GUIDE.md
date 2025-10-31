# Deployment Guide for Three Two Live

## Why Deploy?

GitHub Actions runs on GitHub's servers and cannot access `localhost`. You need to deploy your app to a public URL for the cron job to work.

---

## 🚀 Quick Deploy Options

### Option 1: Vercel (Recommended for Hosting - 2 minutes)

**Why Vercel?**
- ✅ FREE forever (Hobby plan)
- ✅ Automatic deployments from GitHub
- ✅ Environment variables support
- ✅ Perfect for Next.js apps
- ⚠️ **Note**: Vercel Hobby plan only supports daily cron jobs (not every 5 minutes)
- 💡 **Recommendation**: Use Vercel for hosting + GitHub Actions for cron (both FREE)

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
     - Firebase credentials (see `FIREBASE_CREDENTIALS_SETUP.md`)

4. **Deploy** - Vercel will auto-detect Next.js and deploy

5. **Your app URL**: `https://your-app-name.vercel.app`

6. **Set up GitHub Actions for cron** (required for 5-minute intervals):
   - Add secret `API_BASE_URL` = `https://your-app-name.vercel.app`
   - Add secret `INTERNAL_UPDATE_TOKEN` = same as env var
   - GitHub Actions will run every 5 minutes (FREE and unlimited)

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

### Required Variables:

**1. `NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN`**
- Your internal token for API authentication
- Copy from your `.env.local`

**2. Firebase Credentials (Choose ONE method):**

#### Method A: JSON as Environment Variable (Recommended) ✅

1. **Get your service account JSON**:
   - You have: `muvi-cc77e-firebase-adminsdk-fbsvc-b9bf571e13.json`
   - Open it and copy the entire JSON content

2. **In Vercel/Netlify, add environment variable**:
   - **Name**: `FIREBASE_SERVICE_ACCOUNT_JSON`
   - **Value**: Paste the entire JSON content as a single line
   - Example value:
     ```json
     {"type":"service_account","project_id":"muvi-cc77e","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n","client_email":"..."}
     ```
   - ⚠️ **Important**: Paste it as ONE line, don't add line breaks
   - ⚠️ **Important**: The `\n` in private_key should be kept as `\\n` (backslash-n)

3. **Also add**:
   - **Name**: `FIREBASE_PROJECT_ID`
   - **Value**: `muvi-cc77e`

#### Method B: Using Application Default Credentials (Advanced)

If deploying to Google Cloud, you can use ADC, but this is only for GCP deployments.

### Optional but Recommended:

- `NEXT_PUBLIC_MATCHES_COLLECTION` - Default: `matches`
- `NEXT_PUBLIC_DAILY_MATCHES_COLLECTION` - Default: `daily_matches`
- `NEXT_PUBLIC_MATCHES_STORAGE` - Set to `firestore`
- `CRON_SECRET` - Random secret for cron security (if using Vercel Cron)

---

## 📋 Step-by-Step: Setting Firebase Credentials in Vercel

1. **Open your service account file**:
   ```bash
   cat muvi-cc77e-firebase-adminsdk-fbsvc-b9bf571e13.json
   ```

2. **Copy the entire JSON** (it's one long JSON object)

3. **In Vercel Dashboard**:
   - Go to your project → Settings → Environment Variables
   - Click "Add New"
   - **Key**: `FIREBASE_SERVICE_ACCOUNT_JSON`
   - **Value**: Paste the entire JSON (all on one line)
   - Select environments: Production, Preview, Development (check all)
   - Click "Save"

4. **Add Project ID**:
   - Click "Add New" again
   - **Key**: `FIREBASE_PROJECT_ID`
   - **Value**: `muvi-cc77e`
   - Select all environments
   - Click "Save"

5. **Redeploy** your app for changes to take effect

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

**Best Option**: Deploy to Vercel + GitHub Actions for Cron
- ✅ Vercel for hosting (FREE Hobby plan)
- ✅ GitHub Actions for cron (FREE, runs every 5 minutes)
- ✅ Both are free and reliable
- ✅ No limitations on cron frequency

**Why not Vercel Cron?**
- Vercel Hobby plan only allows daily cron jobs (`0 0 * * *` = once per day)
- To run every 5 minutes, you'd need Vercel Pro ($20/month)
- GitHub Actions is FREE and can run every 5 minutes with no limits!

**Setup:**
1. Deploy to Vercel (for hosting)
2. Set up GitHub Actions secrets (for 5-minute cron)
3. Done! Both work together perfectly.

