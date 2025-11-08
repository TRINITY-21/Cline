# Capacitor Setup Guide

## 🎯 What is Capacitor?

Capacitor wraps your Next.js PWA into native iOS and Android apps for App Store distribution.

## ✅ Prerequisites

- ✅ PWA already set up (you have this!)
- ✅ Node.js installed
- ✅ Xcode (for iOS) - macOS only
- ✅ Android Studio (for Android)

---

## 📦 Installation

### Step 1: Install Capacitor

```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios @capacitor/android
```

### Step 2: Initialize Capacitor

```bash
npx cap init "Three Two Live" "com.threetwo.live"
```

This will create:
- `capacitor.config.ts` - Capacitor configuration
- `ios/` - iOS project (if on macOS)
- `android/` - Android project

### Step 3: Add Platforms

```bash
# Add iOS (macOS only)
npx cap add ios

# Add Android
npx cap add android
```

### Step 4: Configure Capacitor

Update `capacitor.config.ts`:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.threetwo.live',
  appName: 'Three Two Live',
  webDir: 'out', // Next.js output directory
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
```

### Step 5: Update Next.js Config

Update `next.config.js`:

```javascript
const nextConfig = {
  // ... existing config
  output: 'export', // Static export for Capacitor
  images: {
    unoptimized: true, // Required for static export
  },
};
```

---

## 🏗️ Build Process

### 1. Build Next.js App

```bash
npm run build
```

This creates the `out/` directory with static files.

### 2. Sync with Capacitor

```bash
npx cap sync
```

This copies your web app to native projects.

### 3. Open in Native IDEs

**iOS (macOS only):**
```bash
npx cap open ios
```

**Android:**
```bash
npx cap open android
```

---

## 📱 Native Features

### Push Notifications

Capacitor has built-in push notification support:

```bash
npm install @capacitor/push-notifications
```

### Other Plugins

- `@capacitor/camera` - Camera access
- `@capacitor/geolocation` - Location services
- `@capacitor/share` - Native sharing
- `@capacitor/app` - App lifecycle

---

## 🚀 Deployment

### iOS App Store

1. Open Xcode project
2. Configure signing & capabilities
3. Archive and upload to App Store Connect
4. Submit for review

### Google Play Store

1. Open Android Studio project
2. Build release APK/AAB
3. Upload to Google Play Console
4. Submit for review

---

## 🔄 Development Workflow

1. **Make changes** to your Next.js app
2. **Build**: `npm run build`
3. **Sync**: `npx cap sync`
4. **Test**: Open in Xcode/Android Studio
5. **Repeat**

---

## 📋 Checklist

- [ ] Install Capacitor
- [ ] Initialize Capacitor
- [ ] Add iOS platform (macOS)
- [ ] Add Android platform
- [ ] Configure `capacitor.config.ts`
- [ ] Update `next.config.js` for static export
- [ ] Build and sync
- [ ] Test on device
- [ ] Configure app icons and splash screens
- [ ] Set up app signing
- [ ] Submit to app stores

---

## 💡 Tips

1. **Use PWA first** - Test everything as PWA before Capacitor
2. **Static export** - Next.js must export static files
3. **API routes** - May need to move to separate backend
4. **Icons** - Use same icons from PWA
5. **Testing** - Test on real devices, not just simulators

---

## 🎯 Next Steps

1. Install Capacitor packages
2. Initialize Capacitor
3. Build and test locally
4. Configure app store listings
5. Submit for review

Your PWA code works directly in Capacitor! 🎉

