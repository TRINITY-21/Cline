# Push Notifications Setup Guide

## ✅ What's Been Implemented

Your app now has push notification infrastructure ready! Here's what's included:

### 1. **Firebase Messaging Utilities** (`/lib/push-notifications.ts`)
- FCM token management
- Permission handling
- Subscription/unsubscription functions
- Foreground message handler

### 2. **Notification Permission Component** (`/components/NotificationPermission.tsx`)
- Beautiful permission prompt
- Respects user preferences
- Auto-shows after 5 seconds

### 3. **Match Reminder Button** (`/components/MatchReminderButton.tsx`)
- Add to match cards
- Subscribe/unsubscribe to match reminders
- Visual feedback

### 4. **API Routes**
- `/api/notifications/subscribe` - Subscribe to match reminders
- `/api/notifications/unsubscribe` - Unsubscribe from reminders

### 5. **Service Worker Updates**
- Enhanced push notification handler
- Notification click handling
- Rich notification support

---

## 🔧 Setup Steps

### Step 1: Install Firebase Client SDK

```bash
npm install firebase
```

### Step 2: Get Firebase VAPID Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** → **Cloud Messaging**
4. Under **Web Push certificates**, click **Generate key pair**
5. Copy the **Key pair** (this is your VAPID key)

### Step 3: Add Environment Variables

Add these to your `.env.local`:

```env
# Firebase Config (you may already have these)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# VAPID Key (NEW - required for push notifications)
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key_here
```

### Step 4: Enable Cloud Messaging API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Go to **APIs & Services** → **Library**
4. Search for "Firebase Cloud Messaging API"
5. Click **Enable**

### Step 5: Update Firebase Config

The push notifications library expects these env vars. Make sure they match your Firebase config.

---

## 📱 How to Use

### 1. Add Notification Permission Prompt

Already added to `app/layout.tsx` - it will show automatically!

### 2. Add Match Reminder Button

Add to your match cards:

```tsx
import MatchReminderButton from '@/components/MatchReminderButton';

<MatchReminderButton
  matchId={match.id}
  matchTime={match.startTime}
  homeTeam={match.home.name}
  awayTeam={match.away.name}
  league={match.league?.name}
/>
```

### 3. Send Notifications

Create a cron job or Cloud Function to send notifications:

```typescript
// Example: Send notification 15 minutes before match
import { initFirebaseAdmin } from '@/lib/firebase';

const admin = initFirebaseAdmin();
const messaging = admin.messaging();

// Get all subscriptions for a match
const subscriptions = await db.collection('match_reminders').doc(matchId).get();
const tokens = subscriptions.data()?.tokens || [];

// Send notification
await messaging.sendMulticast({
  tokens,
  notification: {
    title: `${homeTeam} vs ${awayTeam}`,
    body: `Match starts in 15 minutes!`,
  },
  data: {
    url: `/watch/${matchId}`,
    matchId,
  },
  webpush: {
    notification: {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
    },
  },
});
```

---

## 🧪 Testing

### 1. Test Permission Request
- Visit your site
- Wait 5 seconds
- See notification permission prompt
- Click "Enable Notifications"

### 2. Test Match Reminder
- Click "Set Reminder" on a match
- Check browser console for FCM token
- Verify subscription saved to Firestore

### 3. Test Notification
- Use Firebase Console → Cloud Messaging → Send test message
- Or use the admin SDK to send notifications

---

## 📋 Checklist

- [ ] Install `firebase` package
- [ ] Get VAPID key from Firebase Console
- [ ] Add environment variables
- [ ] Enable Cloud Messaging API
- [ ] Test permission request
- [ ] Test match reminder subscription
- [ ] Set up notification sending (cron/Cloud Function)

---

## 🚀 Next Steps

1. **Create Notification Scheduler**
   - Cloud Function or cron job
   - Send notifications 15 min before matches
   - Send when matches go live

2. **Add Notification Preferences**
   - Let users choose notification types
   - Frequency settings
   - Quiet hours

3. **Rich Notifications**
   - Match preview images
   - Action buttons (Watch Now, View Details)
   - Sound customization

---

## 🔍 Troubleshooting

### "Firebase Messaging is not supported"
- Check if you're on HTTPS (required for push)
- Check browser compatibility

### "No FCM token available"
- Check VAPID key is set correctly
- Check notification permission is granted
- Check Firebase config is correct

### Notifications not received
- Check service worker is registered
- Check tokens are saved in Firestore
- Check notification is sent correctly
- Check browser notification settings

---

## 📚 Resources

- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [Web Push Protocol](https://web.dev/push-notifications-overview/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

Your push notification system is ready! 🎉

