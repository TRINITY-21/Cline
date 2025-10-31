# Codebase Cleanup Summary

This document lists all files and features that were removed to simplify the codebase.

## Removed Files

### API Endpoints
- ✅ `/app/api/videosrc/[matchId]/route.ts` - VideoSrc collection removed (videoSrc now stored with matches)
- ✅ `/app/api/admin/matches/save/route.ts` - Manual save removed (automated via cron)
- ✅ `/app/api/admin/raw/matches/route.ts` - JSON loading removed (no longer used)
- ✅ `/app/api/admin/matches/route.ts` - Unused endpoint

### Scripts
- ✅ `/scripts/scrape_videosrc.ts` - VideoSrc scraping removed
- ✅ `/scripts/scheduler.ts` - Referenced removed videoSrc scraper
- ✅ `/scripts/_debug_parse_iframe.py` - Debug script, not needed
- ✅ `/scripts/parse_freeonlink_html.py` - Unused parser
- ✅ `/scripts/save_page_html.py` - Unused utility

### Data Files
- ✅ `/data/videosrc.json` - VideoSrc collection data removed

### Pages/Routes
- ✅ `/app/admin/page.tsx` - Old admin route (returns 404, replaced by `/sakin`)

### Directories
- ✅ `/app/api/videosrc/` - Entire directory removed
- ✅ `/app/admin/` - Directory removed (route now 404s)
- ✅ `/app/sakin/daily/`, `/moderate/`, `/predictions/`, `/teams/` - Empty subdirectories removed

### Documentation (Consolidated)
- ✅ `CRON_SETUP.md` - Merged into SETUP.md
- ✅ `NEXT_STEPS.md` - Merged into SETUP.md
- ✅ `SUCCESS_CHECKLIST.md` - Merged into SETUP.md
- ✅ `EMAIL_ALREADY_ADDED.md` - One-time setup, removed
- ✅ `FIX_GIT_EMAIL.md` - One-time setup, removed
- ✅ `create-github-repo.sh` - One-time script, removed

### Code Cleanup
- ✅ `lib/storage.ts` - Removed all VideoSrc storage adapters, kept only `readUnifiedMatches()`
- ✅ Removed `getStorageAdapter()`, `VideoSrcRecord`, `StorageAdapter` interfaces
- ✅ Removed unused functions: `findKickoffsInWindow()`, `isExpired()`, `defaultTtlMsForSource()`

## Current Structure

### API Endpoints (Active)
- `/api/matches` - Get today's matches
- `/api/predictions` - Get today's predictions  
- `/api/trending` - Get trending matches
- `/api/admin/auth` - Admin authentication
- `/api/admin/moderate/matches` - Manage matches
- `/api/admin/moderate/predictions` - Manage predictions
- `/api/admin/scrape/compare-and-update` - Differential updates
- `/api/admin/teams/upload` - Upload team logos
- `/api/admin/matches/update-status-batch` - Batch status updates
- `/api/admin/matches/update-status` - Single status update
- `/api/cron/update-match-statuses` - Cron endpoint
- `/api/admin/daily/matches/[date]` - Date-specific match operations
- `/api/admin/diag/firebase` - Firebase diagnostics

### Scripts (Active)
- `parse_betistuta.py` - Predictions scraper
- `selenium_betistuta.py` - Predictions scraper (Selenium version)
- `selenium_rojadirecta.py` - Match scraper
- `selenium_freeonlinek.py` - Match scraper (alternative)
- `run_scrape.sh` - Local scraping script
- `scrape-and-update.sh` - Local scrape and update script
- `prepare-firebase-env.sh` - Firebase credential formatter
- `update_teams_catalog.js` - Team catalog updater
- `verify_team_logos.js` - Logo verifier

### Documentation (Active)
- `README.md` - Main documentation
- `SETUP.md` - Complete setup guide (consolidated)
- `ADMIN_AUTH_SETUP.md` - Admin password setup
- `DEPLOYMENT_GUIDE.md` - Deployment instructions
- `FIREBASE_CREDENTIALS_SETUP.md` - Firebase setup
- `GITHUB_SETUP.md` - GitHub repository setup
- `SCRAPE_UPDATE_ARCHITECTURE.md` - Scraping architecture details

## Result

The codebase is now simpler and easier to understand:
- ✅ No redundant storage systems (videoSrc integrated into matches)
- ✅ No unused API endpoints
- ✅ Consolidated documentation
- ✅ Cleaner folder structure
- ✅ All functionality preserved

