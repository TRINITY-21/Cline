#!/bin/bash
# Script to scrape subtle patterns and import to over_predictions collection in Firestore
# Usage: ./import-subtle-patterns.sh [date] [type]
#   date: DD-MM-YYYY format (default: today)
#   type: predictions or results (default: predictions)

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Get date (default: today in DD-MM-YYYY format)
if [ -z "$1" ]; then
    DATE=$(date +"%d-%m-%Y")
else
    DATE="$1"
fi

# Get type (default: predictions)
if [ -z "$2" ]; then
    TYPE="predictions"
else
    TYPE="$2"
fi

# Validate type
if [ "$TYPE" != "predictions" ] && [ "$TYPE" != "results" ]; then
    echo "Error: Type must be 'predictions' or 'results'"
    exit 1
fi

# Validate date format (DD-MM-YYYY)
if ! echo "$DATE" | grep -qE '^[0-9]{2}-[0-9]{2}-[0-9]{4}$'; then
    echo "Error: Date must be in DD-MM-YYYY format (e.g., 08-11-2025)"
    exit 1
fi

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

echo "Scraping subtle patterns for date: $DATE, type: $TYPE..."

# Get API URL and token
API_BASE_URL="${API_BASE_URL:-${NEXT_PUBLIC_BASE_URL:-}}"
if [ -z "$API_BASE_URL" ] && [ -n "$VERCEL_URL" ]; then
    API_BASE_URL="https://${VERCEL_URL}"
elif [ -z "$API_BASE_URL" ]; then
    API_BASE_URL="http://localhost:3000"
fi

INTERNAL_TOKEN="${INTERNAL_UPDATE_TOKEN:-${NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN:-dev-secret-t0Ken}}"

# Import to Firestore via API
IMPORT_URL="${API_BASE_URL}/api/admin/over-predictions/import-subtle-patterns"
echo "Importing to: $IMPORT_URL"

# Prepare request body
REQUEST_BODY="{\"date\": \"$DATE\", \"type\": \"$TYPE\"}"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$IMPORT_URL" \
  -H "Content-Type: application/json" \
  -H "x-internal-token: $INTERNAL_TOKEN" \
  -d "$REQUEST_BODY")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
    echo "✅ Successfully imported subtle patterns"
    echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
    exit 0
else
    echo "❌ Import failed with HTTP $HTTP_CODE"
    echo "$BODY"
    exit 1
fi

