#!/usr/bin/env ts-node
/*
  Usage:
    ts-node scripts/scrape_videosrc.ts --matchId <id> --url <pageUrl> [--source <name>] [--api <base>]

  Env:
    INTERNAL_UPDATE_TOKEN=... (for POSTing to API)
*/

import { chromium } from 'playwright';

type Args = {
  matchId: string;
  url: string;
  source?: string;
  api?: string; // base URL e.g., http://localhost:3000
};

function parseArgs(argv: string[]): Args {
  const out: any = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--matchId') out.matchId = argv[++i];
    else if (a === '--url') out.url = argv[++i];
    else if (a === '--source') out.source = argv[++i];
    else if (a === '--api') out.api = argv[++i];
  }
  if (!out.matchId || !out.url) {
    throw new Error('Required: --matchId and --url');
  }
  return out as Args;
}

async function extractVideoSrc(page: any): Promise<string | null> {
  // 1) Give dynamic scripts time to run
  await page.waitForTimeout(5000);

  // Try to dismiss common consent overlays
  try {
    const consent = await page.$('button:has-text("Accept"), button:has-text("I agree"), #accept, .accept');
    if (consent) {
      await consent.click().catch(() => {});
      await page.waitForTimeout(1500);
    }
  } catch {}

  // 2) Any iframe with a non-blank src
  const iframes = await page.$$('iframe');
  for (const f of iframes) {
    const src = (await f.getAttribute('src')) || '';
    if (src && src !== 'about:blank') return src;
  }

  // 3) Search within all frames for embed elements
  for (const frame of page.frames()) {
    try {
      const el = await frame.waitForSelector('iframe[src], video[src], video source[src]', { timeout: 3000 });
      if (el) {
        const src = await el.getAttribute('src');
        if (src && src !== 'about:blank') return src;
      }
    } catch {}
  }

  // 4) Data attributes or inline script hints
  const candidateFromDom = await page.evaluate(() => {
    const el = document.querySelector('[data-src], [data-video], [data-url]') as HTMLElement | null;
    if (el) return el.getAttribute('data-src') || el.getAttribute('data-video') || el.getAttribute('data-url');
    const scripts = Array.from(document.scripts).map(s => s.textContent || '');
    const joined = scripts.join('\n');
    const m = joined.match(/https?:\/\/[^\s'"()]+?(embed|player|live|channel)[^\s'"()]*/i);
    return m ? m[0] : null;
  });
  if (candidateFromDom && candidateFromDom !== 'about:blank') return candidateFromDom;

  // 5) Re-check after another wait
  await page.waitForTimeout(4000);
  const lateIframes = await page.$$('iframe[src]');
  for (const f of lateIframes) {
    const src = (await f.getAttribute('src')) || '';
    if (src && src !== 'about:blank') return src;
  }

  return null;
}

async function main() {
  const { matchId, url, source, api } = parseArgs(process.argv.slice(2));
  const apiBase = api || process.env.API_BASE || 'http://localhost:3000';
  const token = process.env.NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN;
  if (!token) {
    throw new Error('Missing INTERNAL_UPDATE_TOKEN env');
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  const seen: string[] = [];
  page.on('response', async (resp: any) => {
    try {
      const u = resp.url();
      if (/(m3u8|\.mpd|embed|player|iframe)/i.test(u)) seen.push(u);
    } catch {}
  });

  let status: 'ready' | 'pending' | 'error' = 'pending';
  let videoSrc: string | undefined;
  let errorMessage: string | undefined;

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    videoSrc = await extractVideoSrc(page) || undefined;
    if (!videoSrc && seen.length) videoSrc = seen[0];
    status = videoSrc ? 'ready' : 'pending';
  } catch (err: any) {
    status = 'error';
    errorMessage = err?.message || String(err);
  }

  await browser.close();

  // POST result
  const ttlMs = 60 * 60 * 1000; // default 60 min
  const res = await fetch(`${apiBase}/api/videosrc/${encodeURIComponent(matchId)}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-internal-token': token,
    },
    body: JSON.stringify({ videoSrc, source, status, ttlMs, errorMessage }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`POST failed: ${res.status} ${t}`);
  }
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ ok: true, matchId, status, videoSrc: videoSrc ? (videoSrc.slice(0, 120) + (videoSrc.length > 120 ? '…' : '')) : null }));
}

// Run
main().catch(err => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});


