/#!/bin/bash
# Script to scrape betistuta match results and update predictions in Firestore
# Runs every 3 hours via cron job

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Check if required dependencies are installed
if ! command -v python3 &> /dev/null; then
    echo "Error: python3 is not installed"
    exit 1
fi

# Check if required Python packages are available
python3 -c "import requests, bs4" 2>/dev/null || {
    echo "Error: Required Python packages (requests, beautifulsoup4) are not installed"
    echo "Install them with: pip3 install requests beautifulsoup4"
    exit 1
}

# Scrape actual match results
echo "Scraping betistuta for actual match results..."
python3 scripts/scrape_predictions_results.py > scraped_results.json 2>&1

# Check if scraping was successful
if [ ! -f scraped_results.json ] || [ ! -s scraped_results.json ]; then
    echo "Error: Scraping failed - no output file generated"
    exit 1
fi

# Check if we have results
RESULT_COUNT=$(python3 -c "import json; data = json.load(open('scraped_results.json')); print(data.get('count', 0))" 2>/dev/null || echo "0")

if [ "$RESULT_COUNT" -eq "0" ]; then
    echo "Warning: No results found. No predictions to update."
    exit 0
fi

echo "Found $RESULT_COUNT results. Updating predictions in Firestore..."

# Get API URL and token
API_BASE_URL="${API_BASE_URL:-${NEXT_PUBLIC_BASE_URL:-}}"
if [ -z "$API_BASE_URL" ] && [ -n "$VERCEL_URL" ]; then
    API_BASE_URL="https://${VERCEL_URL}"
elif [ -z "$API_BASE_URL" ]; then
    API_BASE_URL="http://localhost:3001"
fi

INTERNAL_TOKEN="${INTERNAL_UPDATE_TOKEN:-${NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN:-dev-secret-t0Ken}}"

# Update predictions with results via API
UPDATE_URL="${API_BASE_URL}/api/admin/predictions/update-results-scraped"
echo "Updating predictions via: $UPDATE_URL"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$UPDATE_URL" \
  -H "Content-Type: application/json" \
  -H "x-internal-token: $INTERNAL_TOKEN" \
  -d @scraped_results.json)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
    echo "✅ Successfully updated predictions with results"
    echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
    exit 0
else
    echo "❌ Update failed with HTTP $HTTP_CODE"
    echo "$BODY"
    exit 1
fi

