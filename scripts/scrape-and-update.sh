#!/bin/bash
# Local script to scrape and update Firestore with differential updates
# Can be run manually or via local cron

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE=".env.local"
if [[ ! -f "$ENV_FILE" ]]; then
  echo ".env.local not found in $ROOT_DIR" >&2
  exit 1
fi

# Load environment variables
set -a
source "$ENV_FILE"
set +a

: "${NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN:?NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN is required}"

API_BASE="${API_BASE:-https://threetwo.vercel.app}"
SCRAPED_OUTPUT="$ROOT_DIR/data/scraped_matches_$(date +%Y%m%d_%H%M%S).json"

echo "🔍 Starting scrape and update process..."
echo "API_BASE: $API_BASE"

# 1) Run scraper
echo "[1/3] Running scraper..."
python3 "$ROOT_DIR/scripts/selenium_rojadirecta.py" --out "$SCRAPED_OUTPUT" || {
  echo "⚠️  Scraper failed"
  exit 1
}

if [[ ! -f "$SCRAPED_OUTPUT" ]] || [[ ! -s "$SCRAPED_OUTPUT" ]]; then
  echo "⚠️  No scraped data found"
  exit 1
fi

# 2) Send to compare-and-update endpoint
echo "[2/3] Sending to compare-and-update endpoint..."
RESPONSE=$(curl -sS -X POST \
  -H "x-internal-token: ${NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"matches\": $(cat "$SCRAPED_OUTPUT")}" \
  "$API_BASE/api/admin/scrape/compare-and-update")

HTTP_CODE=$(curl -sS -w "%{http_code}" -o /tmp/response.json -X POST \
  -H "x-internal-token: ${NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"matches\": $(cat "$SCRAPED_OUTPUT")}" \
  "$API_BASE/api/admin/scrape/compare-and-update")

if [[ "$HTTP_CODE" -eq 200 ]]; then
  echo "[3/3] ✅ Update successful!"
  cat /tmp/response.json | python3 -m json.tool || cat /tmp/response.json
else
  echo "[3/3] ⚠️  Update failed with HTTP $HTTP_CODE"
  cat /tmp/response.json
  exit 1
fi

# Clean up old scraped files (keep last 5)
find "$ROOT_DIR/data" -name "scraped_matches_*.json" -type f | sort -r | tail -n +6 | xargs rm -f 2>/dev/null || true

echo "✅ Done!"

