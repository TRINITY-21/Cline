# Three Two Live

Sports streaming platform with match management, predictions, and automated scraping.

## Quick Start

1. **Setup**: See [SETUP.md](./SETUP.md) for complete setup instructions
2. **Admin**: Access admin dashboard at `/sakin`
3. **API**: All endpoints documented in codebase

## Key Features

- **Automated Scraping**: Hourly match updates
- **Date-based Storage**: Matches organized by date in Firestore
- **Admin Dashboard**: Manage matches and team logos
- **Status Tracking**: Automatic match status updates (live/ended)

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

⚠️ **Predictions functionality has been disabled.** Automated prediction scraping workflows have been removed. 

my loc