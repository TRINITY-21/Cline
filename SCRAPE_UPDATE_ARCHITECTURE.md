# Scrape and Differential Update Architecture

## Overview

This system automatically scrapes websites hourly and performs **differential updates** to Firestore - only updating fields that have changed (like `videoSrc`, `status`, etc.).

---

## Architecture

### 1. **Scraping Process**
- Runs hourly via GitHub Actions
- Scrapes using Selenium/Playwright
- Generates JSON with match data

### 2. **Differential Update API** (`/api/admin/scrape/compare-and-update`)
- Accepts new scraped match data
- Compares with existing Firestore matches field-by-field
- **Only updates changed fields** (not entire documents)
- Uses Firestore `merge: true` to preserve unchanged data

### 3. **Update Logic**
The system compares:
- `videoSrc` - updates if URL changed
- `status` - updates if status changed (live/upcoming/ended)
- `timeLabel` - updates if time label changed
- `startTime` - updates if start time changed
- `league.name` - updates if league changed
- `home.name` / `away.name` - updates if team names changed

**Only fields that changed are updated in Firestore!**

---

## API Endpoint

### `POST /api/admin/scrape/compare-and-update`

**Headers:**
```
x-internal-token: YOUR_TOKEN
Content-Type: application/json
```

**Body:**
```json
{
  "matches": [
    {
      "id": "match-id-123",
      "sport": "Football",
      "league": { "name": "Premier League" },
      "home": { "name": "Team A" },
      "away": { "name": "Team B" },
      "videoSrc": "https://new-url.com/stream",
      "status": "live",
      "timeLabel": "20:00"
    }
  ]
}
```

**Response:**
```json
{
  "ok": true,
  "updated": 5,
  "skipped": 10,
  "total": 15,
  "message": "Updated 5 match(es), skipped 10 unchanged"
}
```

---

## GitHub Actions Workflow

The workflow (`scrape-and-update.yml`) runs:
- **Schedule**: Every hour (`0 * * * *`)
- **Manual**: Can be triggered manually from GitHub UI

**What it does:**
1. Sets up Python and Selenium
2. Runs the scraper (`scripts/selenium_rojadirecta.py`)
3. Sends scraped JSON to the compare-and-update endpoint
4. Only changed matches are updated in Firestore

---

## Benefits

### ✅ **Efficiency**
- Only writes changed data to Firestore
- Reduces Firestore write operations (cost savings)
- Faster updates (no unnecessary writes)

### ✅ **Data Integrity**
- Uses `merge: true` - doesn't overwrite entire documents
- Preserves existing fields like `approved`, `isTrending`, `createdAt`
- Only updates what actually changed

### ✅ **Automatic**
- Runs hourly automatically
- No manual intervention needed
- Monitors for changes (videoSrc URLs, status, etc.)

---

## Example Scenario

**Before:**
```json
{
  "id": "match-123",
  "videoSrc": "https://old-url.com/stream",
  "status": "upcoming",
  "approved": true,
  "isTrending": true
}
```

**Scraped (new data):**
```json
{
  "id": "match-123",
  "videoSrc": "https://new-url.com/stream",  // Changed!
  "status": "live"  // Changed!
}
```

**After Update:**
```json
{
  "id": "match-123",
  "videoSrc": "https://new-url.com/stream",  // ✅ Updated
  "status": "live",  // ✅ Updated
  "approved": true,  // ✅ Preserved (not overwritten)
  "isTrending": true,  // ✅ Preserved (not overwritten)
  "updatedAt": "2025-10-31T20:00:00Z"  // ✅ Added
}
```

Only `videoSrc`, `status`, and `updatedAt` were updated!

---

## Local Testing

You can test the endpoint locally:

```bash
# Run scraper locally
python3 scripts/selenium_rojadirecta.py --out data/scraped.json

# Send to compare-and-update endpoint
curl -X POST "http://localhost:3000/api/admin/scrape/compare-and-update" \
  -H "x-internal-token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d @- <<EOF
{
  "matches": $(cat data/scraped.json)
}
EOF
```

---

## Alternative: Manual Webhook (If GitHub Actions Scraping Fails)

If running Selenium in GitHub Actions is problematic, you can:

1. **Run scraper locally** (or on your machine)
2. **Call the endpoint directly**:
   ```bash
   curl -X POST "https://threetwo.vercel.app/api/admin/scrape/compare-and-update" \
     -H "x-internal-token: YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d "{\"matches\": $(cat data/unified_matches.json)}"
   ```

Or set up a local cron job:
```bash
# Run every hour
0 * * * * cd /path/to/cline && ./scripts/scrape-and-update.sh
```

---

## Troubleshooting

**Scraper fails in GitHub Actions?**
- Selenium/Chrome setup can be complex in CI
- Consider running scraper locally and calling the endpoint
- Or use a simpler HTTP-based scraper for CI

**No updates happening?**
- Check GitHub Actions logs
- Verify API endpoint is accessible
- Check token is correct
- Verify scraper is producing valid JSON

**Too many writes?**
- The system only updates changed fields
- If you see excessive writes, check scraper output
- Verify comparison logic is working correctly

---

## Summary

✅ **Hourly scraping** via GitHub Actions  
✅ **Differential updates** - only changed fields  
✅ **Data preservation** - doesn't overwrite existing fields  
✅ **Automatic** - no manual intervention needed  
✅ **Efficient** - minimal Firestore writes  

