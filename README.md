# Stream Hub (Legal Stream Aggregator)

Aggregates official provider links and embeds only when allowed. No content hosted.

## Scraper

Python script to scrape matches from `livesports808.cam` and produce `UnifiedMatch[]` JSON compatible with the app's `lib/types.ts`:

```bash
pip3 install requests beautifulsoup4
python3 scripts/scrape_livesports808.py --out data/unified_matches.json
```

Output path defaults to `data/unified_matches.json` if `--out` is omitted.

## Match videoSrc pipeline

This app resolves stream `videoSrc` at kickoff via a local JSON store and an API endpoint.

### Storage

- JSON adapter (default): `data/videosrc.json`
- Switch to Firestore later via `VIDEOSRC_STORAGE=firestore` (adapter stub present).

### API (Next.js)

- GET `/api/videosrc/[matchId]` → `{ status: 'pending'|'ready'|'error', videoSrc? }`
- POST `/api/videosrc/[matchId]` (internal) headers: `x-internal-token: $NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN`

Set env in `.env.local`:

```
NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN=dev-secret
```

### Scraper (Playwright)

Install deps:

```
npm i -D ts-node playwright
npx playwright install chromium
```

Run scraper for a match:

```
NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN=dev-secret \
API_BASE=http://localhost:3000 \
npx ts-node scripts/scrape_videosrc.ts --matchId ufa-vs-neftekhimik-15-00 --url https://example.com/page
```

The scraper finds the first `<iframe>`/`<video>` src and POSTs it to the API with a 60m TTL.

### Scheduler (optional local cron)

Runs every minute and triggers scrapes for matches in a kickoff window (requires `startTime` in `data/unified_matches.json`). Provide a URL template or customize mapping logic in `scripts/scheduler.ts`.

```
NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN=dev-secret \
API_BASE=http://localhost:3000 \
SCRAPE_URL_TEMPLATE=https://provider.example/match/{matchId} \
npx ts-node scripts/scheduler.ts
```

### Client behavior

- Match cards open a player even if `videoSrc` is empty.
- The overlay polls `/api/videosrc/[matchId]` with backoff until `ready`, then plays.

### Firebase upgrade path

// Firestore storage adapter

- Switch storage:

```
VIDEOSRC_STORAGE=firestore
FIREBASE_PROJECT_ID=your-project-id
# Option A: Service account JSON (preferred)
FIREBASE_SERVICE_ACCOUNT_JSON='{ "type": "service_account", "project_id": "...", "private_key": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n", "client_email": "..." }'
# Or Option B: ADC via GOOGLE_APPLICATION_CREDENTIALS pointing to a JSON file
```

- Install dep locally:

```
npm i firebase-admin
```

- The API and admin UI will now read/write `videosrc` records in Firestore (collection name can be set via `VIDEOSRC_COLLECTION`, defaults to `videosrc`).

- Move scheduler to Cloud Scheduler → Pub/Sub → Cloud Run/Functions when deploying to GCP.
