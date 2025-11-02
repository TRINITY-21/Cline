# Betistuta Over 3.5 Scraping Guide

This guide explains how to scrape Over 3.5 predictions from betistuta, save them to Firestore, and update them with actual match results.

## Overview

The system scrapes betistuta for predictions where the predicted MSBS (match score) has a total of **4 or more goals** (Over 3.5).

**Important Notes:**
- Predictions are scraped for **Over 3.5** (MSBS sum >= 4 goals)
- Results status is determined by **Over 1.5 logic** (actual score >= 2 goals = won, < 2 goals = failed)
- Results scraping **only updates existing predictions**, it never creates new ones

## Files

### Prediction Scraping
- `scrape_betistuta_over35.py` - Python script to scrape Over 3.5 predictions from betistuta
- `scrape-and-import-predictions.sh` - Bash script to orchestrate prediction scraping and importing
- `/api/admin/predictions/import-scraped` - API endpoint to save scraped predictions

### Results Scraping
- `scrape_predictions_results.py` - Python script to scrape actual match results (MS column)
- `scrape-and-update-results.sh` - Bash script to orchestrate results scraping and updating
- `/api/admin/predictions/update-results-scraped` - API endpoint to update existing predictions with results

## Usage

### Step 1: Install Dependencies

```bash
pip3 install requests beautifulsoup4
```

### Step 2: Update Scraping Selectors

Edit `scrape_betistuta_over35.py` and update the CSS selectors based on betistuta's actual HTML structure:

```python
# Update URL
url = "https://betistuta.com"  # Your actual URL

# Update selectors (examples - adjust based on actual HTML)
match_items = soup.select('.match-item, .prediction-row, tr')
home_team = item.select_one('.home-team, .team-home')
away_team = item.select_one('.away-team, .team-away')
league = item.select_one('.league, .competition')
time_str = item.select_one('.time, .kickoff')
predicted_score = item.select_one('.score, .prediction, .msbs')
```

### Step 3: Run Scraping

```bash
python3 scripts/scrape_betistuta_over35.py > scraped_predictions.json
```

The script will output JSON with Over 3.5 predictions only (MSBS sum >= 4).

### Step 4: Import to Firestore

```bash
# Set your internal token
export INTERNAL_TOKEN="your-internal-token"

# Import the scraped predictions
curl -X POST http://localhost:3000/api/admin/predictions/import-scraped \
  -H "Content-Type: application/json" \
  -H "x-internal-token: $INTERNAL_TOKEN" \
  -d @scraped_predictions.json
```

Or use the JSON format:

```json
{
  "predictions": [
    {
      "home": "Team A",
      "away": "Team B",
      "league": "Premier League",
      "timeLabel": "15:00",
      "matchDate": "2025-11-02",
      "predictedScoreDisplay": "3-2",
      "msbs": "Over 1.5",
      "sport": "Football"
    }
  ]
}
```

## Data Structure

Predictions are saved to Firestore with this structure:

```
over_predictions/
  {weekId}/           # e.g., "01-07-10-2025"
    {dayOfWeek}/      # e.g., "Monday"
      {dateId}/       # e.g., "01-10-2025"
        predictions: [...]
```

## Filtering

The prediction scraper automatically:
- ✅ Only includes predictions where predicted score sum >= 4 goals (Over 3.5)
- ✅ Excludes women's games (marked with "(K)" in team names)
- ✅ Skips predictions with non-Over 3.5 MSBS
- ✅ Validates required fields (home, away, league, timeLabel, matchDate)

The results scraper:
- ✅ Only processes Over 3.5 predictions (MSBS sum >= 4)
- ✅ Calculates status using Over 1.5 logic (actual score >= 2 goals = won)
- ✅ Only updates existing predictions in Firestore (never creates new ones)

## Viewing Predictions

- **Web**: `/predictions` page shows all predictions
- **Admin**: `/sakin` → Predictions tab for managing predictions

## Notes

- The scraper expects predicted scores in format like "3-1", "2:2", "4 - 0"
- Match date can be in YYYY-MM-DD or DD-MM-YYYY format
- Existing predictions with the same ID are updated, not duplicated

## Automated Scraping

### GitHub Actions (Recommended)

#### 1. Predictions Scraping (Daily)

A GitHub Actions workflow automatically runs daily at 02:00 UTC to scrape and import new predictions:

1. **Workflow File**: `.github/workflows/scrape-predictions.yml`
2. **Schedule**: Runs daily at 02:00 UTC (`0 2 * * *`)
3. **Manual Trigger**: Can also be triggered manually from GitHub Actions UI

#### 2. Results Update (Every 3 Hours)

A separate GitHub Actions workflow automatically runs every 3 hours to scrape and update actual match results:

1. **Workflow File**: `.github/workflows/update-results.yml`
2. **Schedule**: Runs every 3 hours (`0 */3 * * *`)
3. **Manual Trigger**: Can also be triggered manually from GitHub Actions UI
4. **Function**: Scrapes actual match results (MS column) and updates existing predictions in Firestore

**Required Secrets:**
- `API_BASE_URL`: Your deployed API URL (e.g., `https://your-app.vercel.app`)
- `INTERNAL_UPDATE_TOKEN`: Your internal token for API authentication

### Local Cron Jobs

To run the scraping scripts locally on a schedule:

```bash
# Add to crontab
crontab -e

# Predictions scraping (daily at 2 AM)
0 2 * * * /path/to/Cline/scripts/scrape-and-import-predictions.sh >> /path/to/logs/scrape.log 2>&1

# Results update (every 3 hours)
0 */3 * * * /path/to/Cline/scripts/scrape-and-update-results.sh >> /path/to/logs/results.log 2>&1
```

### Vercel Cron (Optional)

If using Vercel, the `vercel.json` includes cron configurations:
- **Predictions**: Runs daily at 02:00 UTC, calls `/api/cron/scrape-predictions`
- **Results**: Runs every 3 hours, calls `/api/cron/update-results`
- **Note**: In serverless environments, Python scripts cannot run directly. The actual scraping must be done via GitHub Actions or external service. The Vercel cron endpoints serve as webhooks/integration points.

