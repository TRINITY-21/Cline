# Firebase Cloud Functions

This directory contains Firebase Cloud Functions for automatically updating match statuses.

## Setup

1. Install dependencies:
```bash
cd functions
npm install
```

2. Build the functions:
```bash
npm run build
```

3. Deploy to Firebase:
```bash
firebase deploy --only functions
```

## Function: updateMatchStatuses

This scheduled function runs every 5 minutes to automatically update match statuses in Firestore:
- Checks all matches in today's `daily_matches` document
- Updates status from 'upcoming'/'live' to 'ended' if 120+ minutes have passed since kickoff
- Updates both `daily_matches` and the main `matches` collection

## Configuration

The function uses these environment variables (set in Firebase Console or via `firebase functions:config:set`):
- `DAILY_MATCHES_COLLECTION` (default: 'daily_matches')
- `MATCHES_COLLECTION` (default: 'matches')

## Schedule

The function runs every 5 minutes using Cloud Scheduler. You can adjust the schedule in `src/index.ts`:
```typescript
.pubsub.schedule('every 5 minutes') // Change to 'every 1 minutes', 'every 10 minutes', etc.
```

