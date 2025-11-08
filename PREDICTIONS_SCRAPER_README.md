# Daily Predictions Scraper

Automated system to scrape Over 1.5 predictions from betistuta.net, select the best 12 matches using an intelligent algorithm, and update results daily.

## 📋 Overview

This system:
1. **Scrapes predictions** daily at 6 AM UTC
2. **Selects best 12 matches** using scoring algorithm
3. **Saves to Firestore** in the correct structure
4. **Updates results** at midnight UTC for previous day's matches

## 🏗️ Architecture

### Scripts

1. **`scrape-betistuta-predictions.py`**
   - Scrapes matches from betistuta.net
   - Applies scoring algorithm to rank matches
   - Selects top 12 matches
   - Outputs JSON for Firestore

2. **`save-predictions-to-firestore.py`**
   - Takes JSON from scraper
   - Saves to Firestore: `over_predictions/{weekId}/{dayOfWeek}/{dateId}`
   - Handles deduplication and updates

3. **`update-prediction-results.py`**
   - Scrapes final scores from betistuta.net
   - Matches results to predictions
   - Outputs JSON with results

4. **`update-results-in-firestore.py`**
   - Takes results JSON
   - Updates predictions in Firestore with scores
   - Marks predictions as WON/FAILED

### GitHub Actions Workflow

- **Daily at 6 AM UTC**: Scrape and save predictions
- **Daily at midnight UTC**: Update previous day's results
- **Manual trigger**: Available via workflow_dispatch

## 🚀 Setup

### 1. Install Dependencies

```bash
pip install -r scripts/requirements.txt
```

### 2. Configure Firebase

Set environment variable:

```bash
export FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
```

Or use a file:

```bash
export FIREBASE_SERVICE_ACCOUNT_FILE=/path/to/service-account.json
```

### 3. Configure GitHub Secrets

In GitHub repository settings → Secrets:
- Add `FIREBASE_SERVICE_ACCOUNT_JSON` with your Firebase service account JSON

### 4. Test Locally

```bash
# Scrape today's predictions
python3 scripts/scrape-betistuta-predictions.py

# Save to Firestore
python3 scripts/scrape-betistuta-predictions.py | python3 scripts/save-predictions-to-firestore.py

# Update results (for yesterday)
python3 scripts/update-prediction-results.py

# Update Firestore with results
python3 scripts/update-prediction-results.py | python3 scripts/update-results-in-firestore.py
```

## 🧠 Scoring Algorithm

The algorithm scores matches based on:

1. **Odds Quality** (0-30 points)
   - Lower odds = higher confidence
   - < 1.5 odds: +30 points
   - < 2.0 odds: +20 points
   - < 2.5 odds: +10 points

2. **League Quality** (0-15 points)
   - Top leagues (Premier, Champions, La Liga, etc.): +15 points

3. **Team Quality** (0-5 points)
   - Big teams (United, City, Real, Barcelona, etc.): +5 points

4. **Text Analysis** (variable)
   - Positive indicators (over, goals, scoring): +2 each
   - Negative indicators (defensive, low): -3 each

5. **Data Quality** (0-5 points)
   - Has odds data: +5 points
   - Unknown league: -5 points

**Top 12 matches** are selected based on highest scores.

## 📊 Firestore Structure

```
over_predictions/
  {weekId}/  # e.g., "09-15-11-2025"
    {dayOfWeek}/  # e.g., "Monday"
      {dateId}/  # e.g., "09-11-2025"
        {
          id: "09-11-2025",
          date: "09-11-2025",
          weekId: "09-15-11-2025",
          dayOfWeek: "Monday",
          predictions: [
            {
              id: "team-a-vs-team-b-15-30",
              home: "Team A",
              away: "Team B",
              timeLabel: "15:30",
              league: "Premier League",
              betType: "Over 1.5 Goals",
              confidence: "Score: 45.0",
              approved: true,
              source: "betistuta",
              overOdds: 1.85,
              score: 45.0,
              result: "2-1",  # Added after match
              homeScore: 2,
              awayScore: 1,
              totalGoals: 3,
              status: "WON",  # or "FAILED", "PENDING"
              createdAt: "2025-11-09T06:00:00",
              updatedAt: "2025-11-10T00:00:00"
            }
          ],
          createdAt: "2025-11-09T06:00:00",
          updatedAt: "2025-11-09T06:00:00"
        }
```

## 🔧 Manual Usage

### Scrape for Specific Date

```bash
python3 scripts/scrape-betistuta-predictions.py 2025-11-09
```

### Update Results for Specific Date

```bash
python3 scripts/update-prediction-results.py 2025-11-09
```

### Full Pipeline (Scrape + Save)

```bash
python3 scripts/scrape-betistuta-predictions.py 2025-11-09 > preds.json
python3 scripts/save-predictions-to-firestore.py preds.json
```

### Full Pipeline (Results + Update)

```bash
python3 scripts/update-prediction-results.py 2025-11-09 > results.json
python3 scripts/update-results-in-firestore.py results.json
```

## 🐛 Troubleshooting

### No Matches Found

- Check if website structure changed
- Verify URL format: `https://www.betistuta.net/Futbol.aspx?D=M/D/YYYY`
- Check network connectivity

### Firebase Errors

- Verify `FIREBASE_SERVICE_ACCOUNT_JSON` is set correctly
- Check Firebase project permissions
- Ensure Firestore is enabled

### Results Not Matching

- Team name variations may cause mismatches
- Check fuzzy matching logic
- Verify date format matches

## 📈 Monitoring

### GitHub Actions

- View runs in Actions tab
- Check logs for errors
- Download artifacts (JSON files)

### Firestore

- Check `over_predictions` collection
- Verify predictions are saved correctly
- Check results are updated

## 🎯 Next Steps

1. ✅ Set up GitHub Secrets
2. ✅ Test locally
3. ✅ Monitor first automated run
4. ✅ Adjust scoring algorithm if needed
5. ✅ Verify results update correctly

---

**Note**: The scraper uses intelligent pattern matching. If the website structure changes significantly, you may need to update the selectors in `scrape-betistuta-predictions.py`.

