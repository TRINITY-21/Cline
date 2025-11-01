# Complete System Workflow: Admin to Web

This document explains how **Predictions**, **Highlights**, and **Today's Matches** flow from admin approval to public display.

---

## 🎯 **1. PREDICTIONS WORKFLOW**

### **Data Collection**
- **Storage**: `over_predictions` collection in Firestore
- **Structure**: `over_predictions/{weekId}/{dayOfWeek}/{dateId}`
  - **weekId Format**: `DD-DD-MM-YYYY` (e.g., `01-07-10-2025` for week Oct 1-7, 2025)
  - **dayOfWeek**: `Sunday`, `Monday`, `Tuesday`, etc.
  - **dateId Format**: `DD-MM-YYYY` (e.g., `01-10-2025`)
- **Each date document contains**: `predictions` array with all predictions for that date

### **Admin Side (`/sakin`)**

#### **"Predictions" Tab**
- **View**: All predictions from `over_predictions` collection
- **Data Source**: `/api/admin/over-predictions`
- **Fields Displayed**: Teams, time, league, status (won/failed/pending), MSBS (Over/Under)
- **Actions Available**:
  - ✅ **Edit Prediction**: Update any field (teams, league, time, score, status)
  - 🔄 **Override Status**: Manually set `status: 'won' | 'failed' | null`
  - 📊 **View Results**: See if prediction was correct
  - ➕ **Create New**: Add new predictions manually

#### **Update Process**
```
1. Admin clicks "Edit" or updates status on a prediction
   ↓
2. PATCH /api/admin/over-predictions/[id]
   Body: { _path: "weekId/dayOfWeek/dateId", ...updatedFields }
   ↓
3. Updates prediction in over_predictions/{weekId}/{dayOfWeek}/{dateId}
   - Updates: Any field (home, away, league, timeLabel, status, actualScore, etc.)
   - Updates: updatedAt timestamp
   ↓
4. Prediction saved to Firestore
```

### **Web Side (Public)**

#### **API Endpoint**: `/api/predictions`
- **Route**: `app/api/predictions/route.ts`
- **What it does**:
  1. Reads from `over_predictions` collection
  2. Structure: `over_predictions/{weekId}/{dayOfWeek}/{dateId}`
  3. Fetches all predictions from all weeks/dates
  4. Returns ALL predictions (no approval filter - all predictions are public)

#### **Display**
- **Page**: `/predictions` (app/predictions/page.tsx)
- **Data Source**: Fetches from `/api/predictions`
- **Shows**: All predictions with their status and results

---

## 🎥 **2. HIGHLIGHTS WORKFLOW**

### **Data Collection**
- **Storage**: `highlights` collection in Firestore
- **Document ID Format**: `YYYY-MM-DD` (e.g., `2025-10-31`)
- **Structure**: Each document contains a `matches` array with highlight objects

### **Automatic Scraping**
- **Script**: `scripts/fetch-today-highlights.ts`
- **Cron Job**: Runs every 3 hours via GitHub Actions (`.github/workflows/fetch-highlights.yml`)
- **What it does**:
  1. Scrapes DasFootball.com for today's matches
  2. Filters for CDN video sources only
  3. Enriches with full details (lineups, stats, standings, logos, etc.)
  4. Merges into Firestore document for today's date
  5. **New highlights default to**: `approved: false`

### **Admin Side (`/sakin`)**

#### **"Highlights In Store" Tab**
- **View**: All highlights for selected date (regardless of approval)
- **Shows**: Date, Match, League, Video Source, Approved status
- **Actions Available**:
  - ✅ **Approve/Unapprove**: Toggle `approved: true/false`
  - ✏️ **Edit Video Source**: Update `videoSrc` if incorrect
  - 👁️ **Preview Video**: Play video directly in modal to verify before approval
  - 📅 **Date Filter**: Select specific date or "Show All Dates"
  - 🔍 **Search**: Filter by team name, league, or match ID

#### **"Highlights On Web" Tab**
- **View**: Only approved highlights (where `approved === true`)
- **Same actions available**

#### **Approval Process**
```
1. Admin clicks "Approve" on highlight(s)
   ↓
2. PATCH /api/admin/highlights/update-status
   Body: { highlightIds: [...], approved: true, date: "YYYY-MM-DD" }
   ↓
3. Updates highlights in highlights/{dateId}
   - Sets: approved: true for each highlight
   - Updates: updatedAt timestamp
   ↓
4. Highlights saved to Firestore
```

### **Web Side (Public)**

#### **API Endpoint**: `/api/highlights`
- **Route**: `app/api/highlights/route.ts`
- **What it does**:
  1. Fetches ALL documents from `highlights` collection
  2. Combines all matches from all dates
  3. **Filters**: Only matches where `approved === true`
  4. Sorts by date (newest first)
  5. Returns: `{ matches: [...] }`

#### **Display**
- **Homepage**: Highlights shown on main page
- **Detail Page**: `/highlight/[id]` shows full match details
- **Data Source**: Fetches from `/api/highlights`
- **Shows**: Only approved highlights with full enrichment (lineups, stats, standings, logos, etc.)

---

## ⚽ **3. TODAY'S MATCHES WORKFLOW**

### **Data Collection**
- **Storage**: `daily_matches` collection in Firestore
- **Document ID Format**: `YYYY-MM-DD` (e.g., `2025-10-31`)
- **Structure**: Each document contains a `matches` array

### **Admin Side (`/sakin`)**

#### **"In Store" Tab**
- **View**: All matches for today (regardless of approval)
- **Shows**: Time, Match, League, Status, In Store status
- **Features**:
  - 🟠 **Unapproved Badge**: Orange indicator for matches needing approval
  - 📊 **Pending Approval Stats**: Shows count of unapproved matches
  - 🚨 **Banner Alert**: Appears when unapproved matches exist with "Approve All" button
- **Actions Available**:
  - ✅ **Approve Selected**: Sets `approved: true` for selected matches
  - 🔥 **Mark Trending**: Sets `isTrending: true` (also requires `approved: true`)
  - 📅 **Date Filter**: Select specific date
  - 🔍 **Search**: Filter by team name, league, or match ID

#### **"On Web" Tab**
- **View**: Only approved matches (where `approved === true`)
- **Shows**: Matches currently visible on the website

#### **"Trending" Tab**
- **View**: Only trending matches (where `isTrending === true` AND `approved === true` AND `status !== 'ended'`)
- **Shows**: Upcoming/live matches marked as trending

#### **Approval Process**
```
1. Admin clicks "Approve" on match(es)
   ↓
2. PATCH /api/admin/matches/update-status
   Body: { matchIds: [...], approved: true }
   ↓
3. Updates matches in daily_matches/{todayId}
   - Sets: approved: true for each match
   - Updates: updatedAt timestamp
   ↓
4. Matches saved to Firestore
```

#### **Trending Process**
```
1. Admin clicks "Mark Trending" on match(es)
   ↓
2. PATCH /api/admin/matches/update-status
   Body: { matchIds: [...], isTrending: true }
   ↓
3. Updates matches in daily_matches/{todayId}
   - Sets: isTrending: true (must also be approved)
   - Updates: updatedAt timestamp
   ↓
4. Matches saved to Firestore
```

### **Web Side (Public)**

#### **API Endpoint**: `/api/matches`
- **Route**: `app/api/matches/route.ts`
- **What it does**:
  1. Reads from `daily_matches/{todayId}` document
  2. **Filters**: Only matches where `approved === true`
  3. Auto-marks matches as "ended" if kickoff was >2 hours ago
  4. Returns: Array of approved matches

#### **API Endpoint**: `/api/trending`
- **Route**: `app/api/trending/route.ts`
- **What it does**:
  1. Reads from `daily_matches/{todayId}` document
  2. **Filters**: 
     - `approved === true`
     - `isTrending === true` OR `trending === true`
     - `status !== 'ended'` (only upcoming/live matches)
  3. Returns: Array of trending matches

#### **Display**
- **Homepage**: Today's matches shown on main page
- **Trending Section**: Trending matches displayed prominently
- **Data Sources**: 
  - `/api/matches` for today's matches
  - `/api/trending` for trending matches

---

## 📋 **SUMMARY TABLE**

| Feature | Collection | Document Structure | Approval Filter | Public API |
|---------|-----------|-------------------|-----------------|------------|
| **Predictions** | `over_predictions` | `{weekId}/{dayOfWeek}/{dateId}` | No filter (all public) | `/api/predictions` |
| **Highlights** | `highlights` | `YYYY-MM-DD` | `approved === true` | `/api/highlights` |
| **Matches** | `daily_matches` | `YYYY-MM-DD` | `approved === true` | `/api/matches` |
| **Trending** | `daily_matches` | `YYYY-MM-DD` | `approved === true` AND `isTrending === true` | `/api/trending` |

---

## 🔐 **KEY CONCEPTS**

### **Approval System**
- **Highlights & Matches**: Default to unapproved (`approved: false`)
- **Predictions**: No approval system - all predictions are immediately public
- **Only approved content appears on the public website** (for highlights & matches)
- **Admin must explicitly approve** highlights and matches to make them visible

### **Data Merging**
- **Highlights**: Scraper merges new highlights with existing ones (doesn't overwrite)
- **Matches**: Import process merges with existing matches (preserves approval status)
- **All updates use Firestore `merge: true`** to preserve existing data

### **Date-Based Organization**
- **All collections use date-based document IDs**: `YYYY-MM-DD`
- **Easy to query specific dates**: Just use document ID
- **Cron jobs**: Run daily/periodically to populate today's data

### **Enrichment**
- **Highlights**: Fully enriched with lineups, stats, standings, logos, team form, head-to-head
- **Matches**: Basic match information (teams, time, league, status)
- **Predictions**: Basic prediction data (teams, prediction, status)

---

## 🚀 **AUTOMATION**

### **Scheduled Jobs**
1. **Highlights Scraper**: Runs every 3 hours via GitHub Actions
   - Fetches today's highlights
   - Enriches with full details
   - Saves to Firestore (merged)

2. **Match Status Updates**: Automatic via cron
   - Updates match statuses (upcoming → live → ended)
   - Keeps data current

### **Manual Actions**
- **Admin approval**: Required for all content types
- **Video source editing**: For highlights if URLs are wrong
- **Trending marking**: Manual selection of trending matches

---

## 🎯 **WORKFLOW SUMMARY**

### **For Admins:**
1. **Highlights**: Scraper runs → Goes to "Highlights In Store" (unapproved)
2. **Matches**: Imported → Goes to "In Store" (unapproved)
3. **Predictions**: Created/imported → Immediately public (no approval needed)
4. Admin reviews highlights/matches → Approves quality content
5. Approved content → Appears in "On Web" tab
6. Public website → Shows approved highlights/matches + all predictions

### **For Users:**
1. Visit website → See approved matches/highlights
2. Browse highlights → Full enriched details available
3. View trending → See featured matches

---

**End of Workflow Documentation**

