# DasFootball Highlights Scraper

This script scrapes all match highlights from dasfootball.com and saves them to Firestore.

## Setup

1. Make sure you have Firebase credentials configured (either via environment variables or service account file)
2. Install dependencies:
   ```bash
   npm install
   ```

## Running the Scraper

```bash
npm run scrape:highlights
```

Or directly with ts-node:
```bash
npx ts-node --esm scripts/scrape-dasfootball-highlights.ts
```

## What it does

1. **Scrapes homepage**: Visits https://dasfootball.com/ and extracts all match links
2. **Loads more matches**: Automatically clicks "Load More" button until all matches are loaded
3. **Scrapes each match**: Visits each match page and extracts:
   - Match title, teams, date, time
   - League/category
   - Score and halftime score
   - Video source URL
   - Venue and referee
   - Stage information
4. **Saves to Firestore**: Stores all matches in the `highlights` collection
5. **Saves to JSON**: Also creates a backup JSON file in `data/scraped-highlights.json`

## Output

- **Firestore Collection**: `highlights`
- **JSON Backup**: `data/scraped-highlights.json`

Each match document uses its URL slug as the document ID for easy lookup.

## Notes

- The scraper runs with browser visible (`headless: false`) so you can see progress
- Adds delays between requests to avoid overwhelming the server
- Handles Firestore batch limits (500 documents per batch)
- Skips matches that don't have essential data (teams)

