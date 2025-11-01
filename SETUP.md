# Setup Guide

Complete setup instructions for the Three Two Live platform.

## Table of Contents
1. [Firebase Setup](#firebase-setup)
2. [GitHub Repository](#github-repository)
3. [Deployment](#deployment)
4. [Environment Variables](#environment-variables)
5. [Admin Access](#admin-access)
6. [Cron Jobs](#cron-jobs)

---

## Firebase Setup

See [FIREBASE_CREDENTIALS_SETUP.md](./FIREBASE_CREDENTIALS_SETUP.md) for detailed Firebase configuration.

### Quick Setup:
1. Get your Firebase service account JSON file
2. Run: `./scripts/prepare-firebase-env.sh` to format credentials
3. Add `FIREBASE_SERVICE_ACCOUNT_JSON` to your environment variables

---

## GitHub Repository

### Create Repository
1. Go to: https://github.com/new
2. Create a **private** repository
3. Push your code to GitHub

### Set Up Secrets
Go to: Repository → Settings → Secrets and variables → Actions

Add these secrets:
- `API_BASE_URL` = Your deployed app URL (e.g., `https://your-app.vercel.app`)
- `INTERNAL_UPDATE_TOKEN` = Your internal API token

---

## Deployment

### Vercel (Recommended)
1. Import your GitHub repository at https://vercel.com/new
2. Add all environment variables (see below)
3. Deploy

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed instructions.

---

## Environment Variables

### Required Variables

**Firebase:**
- `FIREBASE_SERVICE_ACCOUNT_JSON` - Full service account JSON

**Admin:**
- `ADMIN_PASSWORD` - Password for `/sakin` admin dashboard
- `NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN` - Token for internal API calls

**Collections (optional, defaults provided):**
- `DAILY_MATCHES_COLLECTION` = `daily_matches`
- `DAILY_PREDICTIONS_COLLECTION` = `daily_predictions`

---

## Admin Access

The admin dashboard is at `/sakin` (obscured route).

1. Set `ADMIN_PASSWORD` in environment variables
2. Visit `/sakin` and enter the password
3. Session is stored in localStorage

See [ADMIN_AUTH_SETUP.md](./ADMIN_AUTH_SETUP.md) for details.

---

## Cron Jobs

### Automatic Updates

**Match Status Updates** (every 5 minutes):
- Workflow: `.github/workflows/update-match-statuses.yml`
- Updates match statuses (live/ended) based on time

**Scrape Matches** (hourly):
- Workflow: `.github/workflows/scrape-and-update.yml`
- Scrapes match data and updates Firestore

All cron jobs require:
- `API_BASE_URL` secret
- `INTERNAL_UPDATE_TOKEN` secret

---

## Architecture

- **Matches**: Stored in `daily_matches/YYYY-MM-DD` (date-based documents)
- **Highlights**: Stored in `highlights/YYYY-MM-DD` (date-based documents)
- **Scraping**: Automatic via GitHub Actions
- **Updates**: Differential updates (only changed fields)

