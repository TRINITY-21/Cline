#!/bin/bash
# Helper script to prepare Firebase credentials for deployment
# This converts the service account JSON to a single-line format for environment variables

SERVICE_ACCOUNT_FILE="muvi-cc77e-firebase-adminsdk-fbsvc-b9bf571e13.json"

if [ ! -f "$SERVICE_ACCOUNT_FILE" ]; then
    echo "❌ Error: Service account file not found: $SERVICE_ACCOUNT_FILE"
    echo "💡 Make sure you're running this from the project root directory"
    exit 1
fi

echo "📋 Firebase Credentials for Deployment"
echo "========================================"
echo ""
echo "Copy these environment variables to Vercel/Netlify:"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Variable 1:"
echo "  Key: FIREBASE_SERVICE_ACCOUNT_JSON"
echo "  Value:"
echo ""

# Convert JSON to single line (remove newlines, keep as valid JSON)
jq -c '.' "$SERVICE_ACCOUNT_FILE" 2>/dev/null || {
    # Fallback if jq is not installed - use python
    python3 -c "import json, sys; print(json.dumps(json.load(open('$SERVICE_ACCOUNT_FILE')), separators=(',', ':')))" 2>/dev/null || {
        echo "⚠️  Could not parse JSON. Please copy the file manually."
        exit 1
    }
}

echo ""
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Variable 2:"
echo "  Key: FIREBASE_PROJECT_ID"
echo "  Value: muvi-cc77e"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Instructions:"
echo "1. Copy the FIREBASE_SERVICE_ACCOUNT_JSON value above"
echo "2. In Vercel/Netlify, add it as an environment variable"
echo "3. Add FIREBASE_PROJECT_ID = muvi-cc77e"
echo "4. Redeploy your app"
echo ""

