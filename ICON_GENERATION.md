# PWA Icon Generation Guide

## 🎨 Quick Start

### Option 1: Using Node.js (Recommended)

1. **Install sharp** (if not already installed):
   ```bash
   npm install --save-dev sharp
   ```

2. **Generate icons**:
   ```bash
   npm run generate:icons
   ```

That's it! Icons will be created in `/public/icons/`

---

### Option 2: Using ImageMagick

1. **Install ImageMagick**:
   - macOS: `brew install imagemagick`
   - Linux: `sudo apt-get install imagemagick`
   - Windows: Download from [ImageMagick website](https://imagemagick.org/)

2. **Run the script**:
   ```bash
   ./scripts/generate-pwa-icons.sh
   ```

---

### Option 3: Online Tools (No Installation)

If you prefer not to install anything, use these online tools:

1. **PWA Asset Generator** (Recommended):
   - Visit: https://github.com/onderceylan/pwa-asset-generator
   - Upload your `three-two-logo.svg`
   - Download generated icons

2. **RealFaviconGenerator**:
   - Visit: https://realfavicongenerator.net/
   - Upload your logo
   - Generate and download icons

3. **Favicon.io**:
   - Visit: https://favicon.io/
   - Upload your logo
   - Download icons

---

## 📐 Required Icon Sizes

Your PWA needs these icon sizes:

- `icon-72x72.png` - Small Android
- `icon-96x96.png` - Small Android
- `icon-128x128.png` - Chrome
- `icon-144x144.png` - Android
- `icon-152x152.png` - iOS
- `icon-192x192.png` - Android (required)
- `icon-384x384.png` - Android splash
- `icon-512x512.png` - Android (required)

**Minimum required:** `icon-192x192.png` and `icon-512x512.png`

---

## ✅ Verification

After generating icons, verify they exist:

```bash
ls -lh public/icons/
```

You should see all 8 icon files.

---

## 🎯 Icon Design Tips

1. **Use transparent background** - Icons look better on different backgrounds
2. **Keep it simple** - Icons are small, details get lost
3. **High contrast** - Ensure visibility on light/dark backgrounds
4. **Square format** - Icons are displayed in squares
5. **Test on device** - Check how icons look on actual devices

---

## 🔧 Troubleshooting

### Sharp not found
```bash
npm install --save-dev sharp
```

### ImageMagick not found
- macOS: `brew install imagemagick`
- Linux: `sudo apt-get install imagemagick`

### SVG not found
- Ensure `public/three-two-logo.svg` exists
- Check file path is correct

### Icons look blurry
- Ensure source SVG is high quality
- Use vector format (SVG) for best results
- Check that icons are actually PNG format

---

## 📱 Testing Icons

1. **Build your app**:
   ```bash
   npm run build
   ```

2. **Test on mobile**:
   - Open your site on mobile
   - Install the PWA
   - Check home screen icon

3. **Check in DevTools**:
   - Open Chrome DevTools
   - Go to Application → Manifest
   - Verify icons are listed

---

## 🎨 Custom Icon Design

If you want to create custom icons:

1. **Design in 512x512** - Start with largest size
2. **Export as PNG** - Use transparent background
3. **Resize to all sizes** - Use the script or online tool
4. **Test on devices** - Ensure they look good at all sizes

---

## ✅ Checklist

- [ ] Icons generated in `/public/icons/`
- [ ] All 8 sizes created (or at least 192x192 and 512x512)
- [ ] Icons visible in manifest.json
- [ ] Tested on mobile device
- [ ] Icon appears correctly on home screen

Your PWA is ready! 🎉

