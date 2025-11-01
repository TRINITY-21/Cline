#!/bin/bash
# Test script to fetch today's matches and output JSON (no Firestore save)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

TODAY=$(date +%Y-%m-%d)
OUTPUT_FILE="$ROOT_DIR/data/test-matches-${TODAY}.json"

echo "🚀 TEST: Fetching today's matches (JSON OUTPUT ONLY)"
echo "📅 Target date: $TODAY"
echo "📁 Output file: $OUTPUT_FILE"
echo ""

# Check if Python and dependencies are installed
if ! command -v python3 &> /dev/null; then
  echo "❌ Python 3 is not installed"
  exit 1
fi

# Run the scraper and output to JSON
echo "[1/2] Running scraper..."
python3 "$ROOT_DIR/scripts/selenium_rojadirecta.py" --out "$OUTPUT_FILE" || {
  echo "⚠️  Scraper failed"
  exit 1
}

if [[ ! -f "$OUTPUT_FILE" ]] || [[ ! -s "$OUTPUT_FILE" ]]; then
  echo "⚠️  No scraped data found"
  exit 1
fi

# Count matches
MATCH_COUNT=$(python3 -c "import json; data = json.load(open('$OUTPUT_FILE')); print(len(data) if isinstance(data, list) else len(data.get('matches', [])))" 2>/dev/null || echo "0")

echo "[2/2] ✅ Scraping completed!"
echo ""
echo "📊 Results:"
echo "   📦 $MATCH_COUNT matches found"
echo "   📄 Output: $OUTPUT_FILE"
echo ""
echo "📄 JSON Preview (first 500 chars):"
head -c 500 "$OUTPUT_FILE"
echo "..."
echo ""
echo "✅ Done! Matches saved to JSON file (NOT saved to Firestore)"

