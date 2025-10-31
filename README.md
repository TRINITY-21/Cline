# Three Two Live

Sports streaming platform with match management, predictions, and automated scraping.

## Quick Start

1. **Setup**: See [SETUP.md](./SETUP.md) for complete setup instructions
2. **Admin**: Access admin dashboard at `/sakin`
3. **API**: All endpoints documented in codebase

## Key Features

- **Automated Scraping**: Hourly match updates, daily predictions
- **Date-based Storage**: Matches and predictions organized by date in Firestore
- **Admin Dashboard**: Manage matches, predictions, and team logos
- **Status Tracking**: Automatic match status updates (live/ended)
- **Predictions**: Track prediction success/failure with visual indicators

## Scraper

Python script to scrape matches from `livesports808.cam` and produce `UnifiedMatch[]` JSON compatible with the app's `lib/types.ts`:

```bash
pip3 install requests beautifulsoup4
python3 scripts/scrape_livesports808.py --out data/unified_matches.json
```

Output path defaults to `data/unified_matches.json` if `--out` is omitted.

## Match videoSrc

The `videoSrc` field is stored directly in matches within the `daily_matches` collection. No separate storage system is needed.

- `videoSrc` is updated automatically via the scrape-and-update cron job (hourly)
- `videoSrc` can be edited directly in the admin dashboard (`/sakin`)
- `videoSrc` is part of the match object in `daily_matches` collection
- The player component uses `videoSrc` directly from the match data

## Predictions

Predictions are scraped daily from betistuta.net and stored in the `daily_predictions` collection, organized by date (same structure as `daily_matches`).

### Automated Scraping

- **Daily Cron Job**: Runs once per day at 1:00 AM UTC via GitHub Actions
- **Storage**: Predictions are automatically grouped by date in `daily_predictions/YYYY-MM-DD`
- **Workflow**: `.github/workflows/scrape-predictions.yml`

### Manual Scraping

To scrape predictions manually:

```bash
python3 scripts/parse_betistuta.py --in data/unified_matches.json --out data/predictions.json
```

Then import via API (if server is running):

```bash
curl -X POST http://localhost:3000/api/admin/moderate/predictions \
  -H "x-internal-token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary "@data/predictions.json"
```

### Admin Management

- View and manage predictions in `/sakin` → "Predictions" tab
- Mark predictions as "Won" or "Failed" to track success
- Status is displayed on the frontend with green (won) or red (failed) styling

### Prediction Structure

Each prediction includes:
- `id`: Match ID (links to matches)
- `msbs`: Predicted score (e.g., "3 - 1")
- `msbsWinner`: Predicted winner team name
- `status`: Can be `'won'`, `'failed'`, or `null` (pending) - set via admin dashboard
- Stored by date in `daily_predictions/YYYY-MM-DD` documents 

