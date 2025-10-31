# Next Steps After Vercel Deployment 🚀

Your app is deployed at: **https://threetwo.vercel.app**

---

## Step 1: Set Up Firebase Credentials in Vercel

Your app needs Firebase credentials to access Firestore.

### Quick Setup:

1. **Run this command locally to get your credentials:**
   ```bash
   ./scripts/prepare-firebase-env.sh
   ```

2. **In Vercel Dashboard:**
   - Go to: https://vercel.com/dashboard → Your Project → Settings → Environment Variables
   - Click **"Add New"**

3. **Add Variable 1:**
   - **Key**: `FIREBASE_SERVICE_ACCOUNT_JSON`
   - **Value**: Copy the entire JSON output from the script (one long line)
   - **Environment**: Select all (Production, Preview, Development)
   - Click **Save**

4. **Add Variable 2:**
   - **Key**: `FIREBASE_PROJECT_ID`
   - **Value**: `muvi-cc77e`
   - **Environment**: Select all
   - Click **Save**

5. **Add other required variables:**
   - **Key**: `NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN`
   - **Value**: Copy from your `.env.local`
   - **Environment**: Select all
   - Click **Save**

6. **Optional variables** (if you have them in `.env.local`):
   - `NEXT_PUBLIC_MATCHES_COLLECTION`
   - `NEXT_PUBLIC_DAILY_MATCHES_COLLECTION`
   - `NEXT_PUBLIC_MATCHES_STORAGE` (set to `firestore`)

7. **Redeploy**: Go to Deployments → Latest deployment → Click "..." → "Redeploy"

---

## Step 2: Test Your Deployment

After redeploying, test these endpoints:

1. **Test Firebase connection:**
   - Visit: https://threetwo.vercel.app/api/admin/diag/firebase
   - Should show Firebase connection status

2. **Test trending matches:**
   - Visit: https://threetwo.vercel.app/api/trending
   - Should return trending matches from Firestore

---

## Step 3: Set Up GitHub Actions (For 5-Minute Cron)

To enable automatic match status updates every 5 minutes:

1. **Make sure your code is on GitHub:**
   ```bash
   git add .
   git commit -m "Update deployment config"
   git push
   ```

2. **Go to GitHub Repository:**
   - Navigate to: Settings → Secrets and variables → Actions

3. **Add Secret 1:**
   - Click **"New repository secret"**
   - **Name**: `API_BASE_URL`
   - **Value**: `https://threetwo.vercel.app`
   - Click **"Add secret"**

4. **Add Secret 2:**
   - Click **"New repository secret"** again
   - **Name**: `INTERNAL_UPDATE_TOKEN`
   - **Value**: Same value as `NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN` in Vercel
   - Click **"Add secret"**

5. **Verify GitHub Actions:**
   - Go to the **Actions** tab in your GitHub repo
   - You should see "Update Match Statuses" workflow
   - It will run every 5 minutes automatically
   - You can also click "Run workflow" to test it manually

---

## Step 4: Verify Everything Works

✅ **Checklist:**

- [ ] Firebase credentials added to Vercel
- [ ] App redeployed after adding environment variables
- [ ] Firebase connection test passes (`/api/admin/diag/firebase`)
- [ ] GitHub Actions secrets configured
- [ ] GitHub Actions workflow runs successfully (check Actions tab)
- [ ] App is accessible at https://threetwo.vercel.app

---

## 🎉 Done!

Your app is now:
- ✅ Deployed on Vercel
- ✅ Connected to Firebase
- ✅ Running automatic status updates every 5 minutes via GitHub Actions
- ✅ All FREE!

---

## Troubleshooting

**If Firebase doesn't work:**
- Check environment variables are set correctly in Vercel
- Make sure you redeployed after adding variables
- Check Vercel build logs for errors

**If GitHub Actions fails:**
- Verify `API_BASE_URL` is `https://threetwo.vercel.app` (with https)
- Check `INTERNAL_UPDATE_TOKEN` matches Vercel env var
- Check Actions tab for error messages

