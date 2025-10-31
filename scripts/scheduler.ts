#!/usr/bin/env ts-node
/*
  Lightweight scheduler that runs every minute and triggers scraping for matches
  with kickoff times in a sliding window.

  Env:
    INTERNAL_UPDATE_TOKEN=... (for scraper POST)
    API_BASE=http://localhost:3000
    SCRAPE_URL_TEMPLATE=... (optional) a template like "https://provider.example/match/{matchId}"
      If not set, provide `mapMatchToUrl` logic below.
*/

import { findKickoffsInWindow, readUnifiedMatches } from '@/lib/storage';
import { spawn } from 'child_process';

function formatIso(d: Date): string { return new Date(d).toISOString(); }

function mapMatchToUrl(matchId: string): string | null {
  const templ = process.env.SCRAPE_URL_TEMPLATE;
  if (templ) return templ.replace('{matchId}', matchId);
  // No template available; cannot determine URL automatically.
  return null;
}

async function tick() {
  const now = new Date();
  const start = new Date(now.getTime() - 5 * 60 * 1000); // T-5m
  const end = new Date(now.getTime() + 10 * 60 * 1000); // T+10m

  // Ensure matches are readable (even if startTime is mostly null)
  await readUnifiedMatches();
  const inWindow = await findKickoffsInWindow(formatIso(start), formatIso(end));
  if (!inWindow.length) return;

  for (const m of inWindow) {
    const url = mapMatchToUrl(m.id);
    if (!url) continue;
    // Spawn scraper
    const args = ['scripts/scrape_videosrc.ts', '--matchId', m.id, '--url', url];
    if (process.env.API_BASE) args.push('--api', process.env.API_BASE);
    if (process.env.SOURCE_NAME) args.push('--source', process.env.SOURCE_NAME);

    const child = spawn('ts-node', args, { stdio: 'inherit' });
    child.on('exit', (code) => {
      // eslint-disable-next-line no-console
      console.log(`[scheduler] scrape job for ${m.id} exited with code ${code}`);
    });
  }
}

// Run immediately and every minute
tick().catch(() => {});
setInterval(() => { tick().catch(() => {}); }, 60 * 1000);


