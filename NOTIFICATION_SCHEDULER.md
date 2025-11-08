# Match Notification Scheduler

## 📋 Overview

The notification scheduler is a Firebase Cloud Function that automatically sends push notifications to users 15 minutes before their subscribed matches start.

## 🏗️ Architecture

### Components

1. **`sendMatchNotifications`** - Scheduled function (runs every 15 minutes)
   - Checks for matches starting in 15 minutes
   - Sends notifications to subscribed users
   - Cleans up invalid tokens

2. **`sendLiveMatchNotification`** - HTTP callable function
   - Can be triggered when a match goes live
   - Useful for real-time match status updates

## 📁 Files

- `functions/src/send-match-notifications.ts` - Main notification logic
- `functions/src/index.ts` - Exports the functions

## 🚀 Deployment

### Deploy the Functions

```bash
cd functions
npm install
firebase deploy --only functions:sendMatchNotifications,functions:sendLiveMatchNotification
```

### Verify Deployment

1. Go to Firebase Console → Functions
2. Check that `sendMatchNotifications` is scheduled
3. Check that `sendLiveMatchNotification` is callable

## ⚙️ How It Works

### Scheduled Notifications (15 minutes before)

1. **Every 15 minutes**, the function runs automatically
2. **Checks match times** - Looks for matches starting in the next 15 minutes
3. **Finds subscribers** - Queries `match_reminders` collection
4. **Sends notifications** - Uses FCM to send to all subscribed tokens
5. **Cleans up** - Removes invalid tokens automatically

### Live Match Notifications

Call from your match scraping cron job:

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const sendLiveNotification = httpsCallable(functions, 'sendLiveMatchNotification');

// When match goes live
await sendLiveNotification({
  matchId: 'match-123',
  homeTeam: 'Team A',
  awayTeam: 'Team B',
  league: 'Premier League',
});
```

## 📊 Firestore Structure

### `match_reminders` Collection

```typescript
{
  matchId: string;          // Document ID
  matchTime: string;         // "HH:MM" format
  homeTeam: string;
  awayTeam: string;
  league?: string;
  tokens: string[];          // Array of FCM tokens
}
```

## 🔧 Configuration

### Schedule Frequency

Currently set to **every 15 minutes**. To change:

```typescript
.pubsub.schedule('every 15 minutes')  // Change this
```

Options:
- `every 5 minutes`
- `every 15 minutes`
- `every 30 minutes`
- `every 1 hours`

### Notification Timing

The function checks for matches starting in **15 minutes**. To change the window:

```typescript
const in15Minutes = new Date(now.getTime() + 15 * 60 * 1000);  // Change 15
```

## 🧪 Testing

### Test Locally

```bash
cd functions
npm run serve
```

### Test Scheduled Function

Use Firebase Console → Functions → `sendMatchNotifications` → "Test function"

### Test Live Notification

```bash
curl -X POST https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/sendLiveMatchNotification \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "matchId": "test-match",
      "homeTeam": "Team A",
      "awayTeam": "Team B",
      "league": "Test League"
    }
  }'
```

## 📱 Notification Format

### 15-Minute Reminder

```json
{
  "title": "Team A vs Team B",
  "body": "Match starts in 15 minutes! (Premier League)",
  "data": {
    "matchId": "match-123",
    "url": "/watch/match-123",
    "type": "match-reminder"
  }
}
```

### Live Match

```json
{
  "title": "Team A vs Team B",
  "body": "Match is now live! (Premier League)",
  "data": {
    "matchId": "match-123",
    "url": "/watch/match-123",
    "type": "match-live"
  }
}
```

## 🔒 Security

### Authentication (Optional)

To restrict `sendLiveMatchNotification`, uncomment:

```typescript
if (!context.auth) {
  throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
}
```

## 🐛 Troubleshooting

### Notifications Not Sending

1. **Check logs**: Firebase Console → Functions → Logs
2. **Verify tokens**: Check `match_reminders` collection has valid tokens
3. **Check schedule**: Verify function is scheduled correctly
4. **Time format**: Ensure match times are in "HH:MM" format

### Invalid Tokens

The function automatically removes invalid tokens. Check logs for:
- `messaging/invalid-registration-token`
- `messaging/registration-token-not-registered`

### Time Zone Issues

The function uses the server's timezone. Ensure:
- Match times are stored consistently
- Server timezone matches your target timezone

## 📈 Monitoring

### Firebase Console

- **Functions** → View execution logs
- **Usage** → Monitor invocations and errors
- **Logs** → Detailed execution logs

### Metrics to Watch

- Function invocations
- Execution time
- Error rate
- Notification delivery rate

## 🎯 Next Steps

1. ✅ Deploy the functions
2. ✅ Test with a scheduled match
3. ✅ Monitor logs for errors
4. ✅ Adjust timing if needed
5. ✅ Add authentication if required

---

**Note**: The function runs automatically once deployed. No manual triggers needed for scheduled notifications!

