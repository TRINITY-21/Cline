#!/usr/bin/env bash
set -euo pipefail

# Simple orchestrator to load .env.local, run scrapers, and ingest to Firestore

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE=".env.local"
if [[ ! -f "$ENV_FILE" ]]; then
  echo ".env.local not found in $ROOT_DIR" >&2
  exit 1
fi

# Load .env.local into current environment
# This requires lines like KEY=VALUE; JSON should be quoted.
set -a
source "$ENV_FILE"
set +a

# Required env sanity checks
: "${NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN:?NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN is required}"

# Defaults
API_BASE_DEFAULT="http://localhost:3000"
API_BASE="${API_BASE:-$API_BASE_DEFAULT}"

echo "Using API_BASE=$API_BASE"

# Ensure Playwright browser is installed (no-op if already installed)
if command -v npx >/dev/null 2>&1; then
  npx --yes playwright install chromium >/dev/null 2>&1 || true
fi

# 1) Run Selenium scraper to produce unified_matches.json and attempt videoSrc posts
echo "[1/2] Running Selenium scraper → data/unified_matches.json"
python3 "$ROOT_DIR/scripts/selenium_rojadirecta.py" --out "$ROOT_DIR/data/unified_matches.json" || true

# 2) Import matches JSON into Firestore moderation collection (requires server running)
echo "[2/2] Importing matches into moderation collection"
curl -sS -X POST \
  -H "x-internal-token: ${NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN}" \
  "$API_BASE/api/admin/moderate/matches" || true
echo ""

echo "Done. Review and approve at:"
echo "  $API_BASE/admin/moderate (matches)"


