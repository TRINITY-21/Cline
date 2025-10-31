# Firebase Credentials Setup for Deployment

## Quick Setup Guide

Your code already supports Firebase authentication via environment variables. Here's how to set it up for deployment.

---

## 📁 Your Current Service Account File

You have: `muvi-cc77e-firebase-adminsdk-fbsvc-b9bf571e13.json`

**⚠️ Important**: This file is already in `.gitignore` and should NOT be committed to GitHub!

---

## ✅ Recommended Method: JSON as Environment Variable

This is the easiest and most secure method for cloud deployments.

### Step 1: Get Your JSON Content

Run this command to see your service account JSON:

```bash
cat muvi-cc77e-firebase-adminsdk-fbsvc-b9bf571e13.json
```

Or open the file and copy its contents.

### Step 2: Set in Vercel (or Netlify)

**For Vercel:**

1. Go to your project on Vercel: https://vercel.com/dashboard
2. Click your project → **Settings** → **Environment Variables**
3. Click **Add New**
4. Add these variables:

   **Variable 1:**
   - **Key**: `FIREBASE_SERVICE_ACCOUNT_JSON`
   - **Value**: Paste the entire JSON content (keep it as ONE line)
   - **Environment**: Select all (Production, Preview, Development)
   - Click **Save**

   **Variable 2:**
   - **Key**: `FIREBASE_PROJECT_ID`
   - **Value**: `muvi-cc77e`
   - **Environment**: Select all
   - Click **Save**

5. **Redeploy** your app (go to Deployments → click the three dots → Redeploy)

**For Netlify:**

1. Go to Site settings → Environment variables
2. Add the same variables as above
3. Redeploy

---

## 🔍 How It Works

Your `lib/firebase.ts` file checks for credentials in this order:

1. ✅ `FIREBASE_SERVICE_ACCOUNT_JSON` (environment variable) - **This is what we're using**
2. `FIREBASE_SERVICE_ACCOUNT_FILE` (file path) - For local file systems
3. Application Default Credentials (ADC) - For GCP environments

---

## ⚠️ Important Notes

1. **Never commit the service account file to Git** (it's already in `.gitignore` ✅)

2. **JSON Format**: When pasting into Vercel/Netlify:
   - Keep it as ONE continuous line
   - Don't add extra spaces or line breaks
   - The `\n` characters in the private_key should stay as `\\n`

3. **Security**: Environment variables in Vercel/Netlify are encrypted at rest and only accessible during runtime.

---

## 🧪 Testing After Setup

After deployment, test if Firebase works:

1. Visit: `https://your-app-url.com/api/admin/diag/firebase`
2. You should see Firebase connection status
3. Check your API endpoints that use Firestore

---

## 📝 Alternative: Download New Service Account

If you need to download a new service account file:

1. Go to: https://console.firebase.google.com/project/muvi-cc77e/settings/serviceaccounts/adminsdk
2. Click **Generate new private key**
3. Download the JSON file
4. Use its contents as described above

---

## ✅ Verification Checklist

- [ ] Service account JSON copied (entire content)
- [ ] `FIREBASE_SERVICE_ACCOUNT_JSON` environment variable set in Vercel/Netlify
- [ ] `FIREBASE_PROJECT_ID` environment variable set to `muvi-cc77e`
- [ ] App redeployed after adding variables
- [ ] Tested Firebase connection via `/api/admin/diag/firebase`

---

That's it! Your Firebase credentials are now configured for deployment. 🎉

