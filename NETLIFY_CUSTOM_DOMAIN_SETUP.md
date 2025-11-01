# Setting Up Custom Domain (InfinityFree) with Netlify

## Overview
Since your Next.js app requires Node.js runtime, you'll point your InfinityFree domain to Netlify where your app is already deployed.

---

## Step 1: Get Netlify DNS Settings

1. **Go to Netlify Dashboard**: https://app.netlify.com
2. **Select your site**: `threetwo` (or your site name)
3. **Go to**: Site settings → Domain management
4. **Click**: "Add custom domain"
5. **Enter**: `threetwo.free.nf`
6. **Click**: "Verify"

Netlify will show you the DNS records you need. You'll typically see:
- **Type**: `CNAME` or `A`
- **Name**: `@` or `threetwo.free.nf`
- **Value**: A Netlify DNS target (e.g., `threetwo.netlify.app` or an IP address)

**Note**: Copy these values - you'll need them for InfinityFree!

---

## Step 2: Verify Domain Ownership (TXT Record)

**First, you need to verify you own the subdomain:**

1. **Log in to InfinityFree**: https://infinityfree.net
2. **Go to your hosting account**: `if0_40305598`
3. **Select domain**: `threetwo.free.nf`
4. **Click**: "DNS Records" (in the left sidebar)
5. **Add TXT Record for Verification**:
   - **Type**: `TXT`
   - **Host**: `subdomain-owner-verification` (or `threetwo` depending on InfinityFree's format)
   - **Points to** / **Value**: `436c4679b4a8fdb820ead1266e04674e`
   - **TTL**: `3600` (or default)
   - Click **Add Record**

6. **Wait 5-10 minutes** for DNS propagation
7. **Go back to Netlify** and click "Verify" or "Add subdomain"
8. Netlify should verify the TXT record and allow you to proceed

---

## Step 3: Configure DNS in InfinityFree (After Verification)

**After Netlify verifies ownership, you'll get the actual DNS records:**

1. **Stay in InfinityFree DNS Records page**
2. **Add DNS Records** (Netlify will show these after verification):

   **Option A: If Netlify provides a CNAME record:**
   - **Type**: `CNAME`
   - **Host**: `@` or `threetwo` (or leave blank for root domain)
   - **Points to**: The Netlify value (e.g., `threetwo.netlify.app`)
   - **TTL**: `3600` (or default)
   - Click **Add Record**

   **Option B: If Netlify provides A records (IP addresses):**
   - **Type**: `A`
   - **Host**: `@` or `threetwo` (or leave blank)
   - **Points to**: The IP address Netlify provides
   - **TTL**: `3600`
   - Click **Add Record**
   - Repeat for each A record Netlify shows (usually 2-4 IPs)

3. **Keep the TXT record** - you can leave it there, it won't interfere

4. **Save/Done**

---

## Step 4: Configure Domain in Netlify

After adding DNS records in InfinityFree:

1. **Back in Netlify Dashboard**
2. **Go to**: Domain management
3. **Click**: "Verify DNS configuration"
4. **Wait**: DNS propagation can take 24-48 hours (but often works within minutes)

---

## Step 5: Enable HTTPS (Automatic)

Once DNS is verified:
- Netlify automatically provisions an SSL certificate
- This usually takes 1-2 hours after DNS verification
- Your site will be accessible at: `https://threetwo.free.nf`

---

## Step 6: Update Environment Variables (if needed)

If you have any hardcoded URLs in your code, update them to use the new domain:

1. **Check GitHub Actions workflows**: Update `API_BASE_URL` if needed
2. **Update any redirect URLs** in Firebase/other services
3. **Redeploy** your Netlify site if needed

---

## Troubleshooting

### "Custom domain is owned by another account" Error

**This means the domain/subdomain is already linked to another Netlify site.**

**Solutions:**

**Option 1: Check if you have another Netlify account**
- Do you have multiple Netlify accounts (personal/work/email)?
- Check if you added this domain to another site by accident
- Log out and log back in with the correct account

**Option 2: Contact Netlify Support**
- Go to: https://app.netlify.com/support
- Ask them to release `threetwo.free.nf` from the other account
- They can transfer it to your current account

**Option 3: Use a different subdomain**
- Try: `www.threetwo.free.nf` or `app.threetwo.free.nf`
- These might not be claimed yet
- Follow the same steps above with the new subdomain

**Option 4: Keep using Netlify subdomain (Recommended for now)**
- Your site already works at: `threetwo.netlify.app`
- This is perfectly fine for production
- You can set up custom domain later if needed
- Your `ads.txt` will work at: `https://threetwo.netlify.app/ads.txt`

**Option 5: Request domain release (if you own it)**
- If this is your domain but was added by mistake to another account
- Contact Netlify support with proof of ownership
- They'll release it within 1-2 business days

---

### DNS not resolving?
- Wait 24-48 hours for DNS propagation
- Check DNS records with: `dig threetwo.free.nf` or `nslookup threetwo.free.nf`
- Verify records match Netlify's requirements exactly

### SSL certificate not working?
- Wait 1-2 hours after DNS verification
- Check Netlify dashboard for SSL status
- Make sure DNS is fully propagated before requesting SSL

### Still seeing old site?
- Clear browser cache
- Try incognito/private browsing
- DNS might not be fully propagated yet

---

## Alternative: Use Netlify Subdomain

If DNS setup is problematic, you can:
1. **Keep using**: `threetwo.netlify.app` (it already works!)
2. **Set up redirect**: From `threetwo.free.nf` → `threetwo.netlify.app` (in InfinityFree DNS)

But the custom domain setup above is preferred for better branding and SEO.

---

## Next Steps

After setup:
1. ✅ Update `ads.txt` will be accessible at `https://threetwo.free.nf/ads.txt`
2. ✅ Google AdSense will recognize the new domain
3. ✅ All your API endpoints will work at the new domain
4. ✅ Update any external references to use the new domain

