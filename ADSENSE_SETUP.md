# AdSense Setup Guide

## ✅ What's Been Done

1. **Created reusable AdSense component** (`components/AdSense.tsx`)
   - Handles ad initialization automatically
   - Configurable ad slots and formats
   - Client-side component ready for use

2. **Re-added AdSense script** to `app/layout.tsx`
   - Global script loading for all pages
   - Publisher ID: `ca-pub-7225325372988376`

3. **Added ad units to content-rich pages:**
   - **Homepage** (`app/page.tsx`) - After informational content section (only on Trending tab)
   - **Highlight Detail Pages** (`app/highlight/[id]/page.tsx`) - After match content sections

4. **Best practices implemented:**
   - Ads only shown on pages with substantial content
   - Not shown on loading or empty states
   - Properly separated from navigation/UI elements

## 🔧 Next Steps (REQUIRED)

### 1. Create Ad Units in AdSense Dashboard

1. Go to [Google AdSense Dashboard](https://www.google.com/adsense/)
2. Navigate to **Ads** → **Ad units**
3. Create new ad units for:
   - **Homepage Ad** - Recommended: Display ad (responsive)
   - **Detail Page Ad** - Recommended: Display ad (responsive)

### 2. Replace Placeholder Ad Slot IDs

Find and replace `YOUR_AD_SLOT_ID_HERE` with your actual ad slot IDs:

**File: `app/page.tsx`** (line ~214)
```tsx
<AdSense 
  adSlot="YOUR_AD_SLOT_ID_HERE"  // ← Replace with homepage ad slot ID
  className="flex justify-center"
/>
```

**File: `app/highlight/[id]/page.tsx`** (line ~1102)
```tsx
<AdSense 
  adSlot="YOUR_AD_SLOT_ID_HERE"  // ← Replace with detail page ad slot ID
  className="flex justify-center"
/>
```

### 3. Ad Slot ID Format

Your ad slot ID will look like: `1234567890` (numeric string)

Example:
```tsx
<AdSense 
  adSlot="1234567890"  // Your actual ad slot ID
  className="flex justify-center"
/>
```

### 4. Verify Setup

1. Deploy your changes
2. Visit pages with ads
3. Check browser console for AdSense errors
4. In AdSense dashboard, check that impressions are being recorded

## 📋 AdSense Requirements Checklist

- ✅ `ads.txt` file configured (already done - `public/ads.txt`)
- ✅ Publisher ID matches in script and ads.txt
- ✅ Ads only on pages with substantial content
- ✅ No ads on error/empty/loading pages
- ✅ Proper spacing between ads and content
- ⏳ Actual ad slot IDs need to be added

## 🎯 Ad Placement Guidelines

Current implementation follows Google's policies:
- ✅ Ads placed after substantial content (300+ words or rich media)
- ✅ Ads clearly separated from navigation
- ✅ Responsive ad units that adapt to screen size
- ✅ No excessive ads (1-2 per page max)

## 🚨 Important Notes

1. **Don't use the same ad slot ID twice** - Create separate ad units for homepage and detail pages
2. **Wait for AdSense approval** - Ads may not show immediately, especially for new accounts
3. **Test on production** - AdSense needs to see actual page loads to serve ads
4. **Comply with policies** - Make sure your content follows AdSense content policies

## 🔍 Troubleshooting

**Ads not showing?**
- Verify ad slot IDs are correct
- Check browser console for errors
- Ensure AdSense account is approved
- Wait 24-48 hours after deployment for ads to start serving

**"Needs attention" warning?**
- Should be resolved now that ads are properly placed on content-rich pages
- Verify pages have substantial content (300+ words)
- Ensure no ads on error/empty pages

