#!/usr/bin/env node
// Update teams catalog from scraped matches and attempt to find logos.
// Usage:
//   node scripts/update_teams_catalog.js [--dry]
// Requires: Node 18+ (global fetch)

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const MATCHES_PATH = path.join(ROOT, 'data', 'unified_matches.json');
const TEAMS_PATH = path.join(ROOT, 'data', 'teams.json');
const CACHE_PATH = path.join(ROOT, 'data', 'logo_cache.json');
const LOGOS_DIR = path.join(ROOT, 'public', 'logos');

const DRY_RUN = process.argv.includes('--dry');

function normalizeName(input) {
  return String(input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/fc|cf|sc|bc|ac|\bclub\b|\bthe\b/gi, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 32);
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (script)' } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return await res.json();
}

async function findWikipediaLogo(teamName, sport) {
  // 1) Search Wikipedia for the team
  const query = encodeURIComponent(`${teamName} ${sport} logo`);
  try {
    const search = await fetchJson(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${query}&format=json&origin=*`);
    const first = search?.query?.search?.[0];
    const pageId = first?.pageid;
    if (!pageId) return null;
    // 2) Request page image (prefer original)
    const page = await fetchJson(`https://en.wikipedia.org/w/api.php?action=query&pageids=${pageId}&prop=pageimages|images&pithumbsize=300&format=json&origin=*`);
    const pg = page?.query?.pages?.[pageId];
    if (pg?.thumbnail?.source) return pg.thumbnail.source;
    // If no thumbnail, try to find an svg/png image named like a crest/logo
    const images = pg?.images || [];
    for (const im of images) {
      const title = String(im?.title || '').toLowerCase();
      if (!title) continue;
      if (/(logo|crest)\.(svg|png)$/i.test(title)) {
        // Resolve to actual file URL
        const fileTitle = encodeURIComponent(im.title);
        const file = await fetchJson(`https://en.wikipedia.org/w/api.php?action=query&titles=${fileTitle}&prop=imageinfo&iiprop=url&format=json&origin=*`);
        const pages = file?.query?.pages || {};
        const firstKey = Object.keys(pages)[0];
        const info = pages[firstKey]?.imageinfo?.[0]?.url;
        if (info) return info;
      }
    }
  } catch (_) {
    // ignore
  }
  return null;
}

async function lookupLogo(teamName, sport, cache) {
  const cacheKey = `${sport}:${teamName}`;
  if (cache[cacheKey]) return cache[cacheKey];
  const fromWiki = await findWikipediaLogo(teamName, sport);
  if (fromWiki) {
    cache[cacheKey] = fromWiki;
    return fromWiki;
  }
  cache[cacheKey] = '';
  return '';
}

async function downloadLogoIfPossible(url, idBase) {
  try {
    if (!url) return '';
    if (!fs.existsSync(LOGOS_DIR)) fs.mkdirSync(LOGOS_DIR, { recursive: true });
    const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (script)' } });
    if (!res.ok) return '';
    const contentType = res.headers.get('content-type') || '';
    let ext = '';
    if (contentType.includes('svg')) ext = 'svg';
    else if (contentType.includes('png')) ext = 'png';
    else if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = 'jpg';
    if (!ext) {
      const m = url.toLowerCase().match(/\.(svg|png|jpg|jpeg)(?:\?.*)?$/);
      if (m) ext = m[1] === 'jpeg' ? 'jpg' : m[1];
    }
    if (!ext) ext = 'png';
    const fileName = `${idBase}.${ext}`;
    const filePath = path.join(LOGOS_DIR, fileName);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(filePath, buf);
    return `/logos/${fileName}`; // public path
  } catch (_) {
    return '';
  }
}

(async function main() {
  const matches = readJson(MATCHES_PATH);
  const teams = readJson(TEAMS_PATH);
  const cache = fs.existsSync(CACHE_PATH) ? readJson(CACHE_PATH) : {};

  // Build lookup by sport + normalized name including aliases
  const byKey = new Map();
  for (const t of teams) {
    const base = normalizeName(t.name);
    byKey.set(`${t.sport}:${base}`, t);
    for (const a of t.aliases || []) {
      const na = normalizeName(a);
      byKey.set(`${t.sport}:${na}`, t);
    }
  }

  const ensureTeam = async (name, sport) => {
    const key = `${sport}:${normalizeName(name)}`;
    if (byKey.has(key)) return null; // already exists
    const id = slugify(name);
    const remoteLogo = await lookupLogo(name, sport, cache);
    const localPath = await downloadLogoIfPossible(remoteLogo, `${sport.toLowerCase()}-${id}`);
    const logo = localPath || remoteLogo || '';
    const newItem = { id, sport, name, aliases: [], logo };
    teams.push(newItem);
    byKey.set(key, newItem);
    return newItem;
  };

  const added = [];
  for (const m of matches) {
    const sport = m.sport || 'Football';
    const home = m?.home?.name || '';
    const away = m?.away?.name || '';
    if (home) {
      const t = await ensureTeam(home, sport);
      if (t) added.push(t);
    }
    if (away) {
      const t = await ensureTeam(away, sport);
      if (t) added.push(t);
    }
  }

  if (DRY_RUN) {
  } else {
    if (added.length > 0) writeJson(TEAMS_PATH, teams);
    writeJson(CACHE_PATH, cache);
  }
})();


