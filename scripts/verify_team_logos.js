#!/usr/bin/env node
// Verify team logos against official websites discovered via Wikipedia.
// Usage:
//   node scripts/verify_team_logos.js [--fix]

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const TEAMS_PATH = path.join(ROOT, 'data', 'teams.json');
const LOGOS_DIR = path.join(ROOT, 'public', 'logos');
const FIX = process.argv.includes('--fix');

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf-8')); }
function writeJson(p, d) { fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\n'); }

function normalizeName(input) {
  return String(input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (script)' } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return await res.json();
}

async function findWikipediaPageId(teamName, sport) {
  const q = encodeURIComponent(`${teamName} ${sport}`);
  try {
    const s = await fetchJson(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${q}&format=json&origin=*`);
    return s?.query?.search?.[0]?.pageid || null;
  } catch { return null; }
}

async function findOfficialWebsite(pageId) {
  if (!pageId) return null;
  try {
    const d = await fetchJson(`https://en.wikipedia.org/w/api.php?action=query&pageids=${pageId}&prop=extlinks&ellimit=500&format=json&origin=*`);
    const page = d?.query?.pages?.[pageId];
    const links = (page?.extlinks || []).map(x => Object.values(x)[0]).filter(Boolean);
    // Heuristics: prefer domains that are not social networks
    const blacklist = ['facebook.com','twitter.com','x.com','instagram.com','youtube.com','tiktok.com'];
    const candidate = links.find(u => !blacklist.some(b => String(u).includes(b)));
    return candidate || null;
  } catch { return null; }
}

async function findSiteIcon(url) {
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (script)' } });
    if (!res.ok) return null;
    const html = await res.text();
    // very light scraping
    const rels = ['apple-touch-icon','icon','shortcut icon'];
    for (const rel of rels) {
      const re = new RegExp(`<link[^>]+rel=["']?${rel}["']?[^>]+href=["']([^"']+)["']`, 'i');
      const m = html.match(re);
      if (m && m[1]) {
        const href = m[1];
        const abs = new URL(href, url).toString();
        return abs;
      }
    }
    // fallback to og:image
    const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    if (og && og[1]) return new URL(og[1], url).toString();
  } catch { }
  return null;
}

async function downloadLogo(logoUrl, localNameBase) {
  try {
    if (!logoUrl) return '';
    if (!fs.existsSync(LOGOS_DIR)) fs.mkdirSync(LOGOS_DIR, { recursive: true });
    const res = await fetch(logoUrl, { headers: { 'user-agent': 'Mozilla/5.0 (script)' } });
    if (!res.ok) return '';
    const ct = res.headers.get('content-type') || '';
    let ext = ct.includes('svg') ? 'svg' : ct.includes('png') ? 'png' : (ct.includes('jpeg') || ct.includes('jpg')) ? 'jpg' : '';
    if (!ext) {
      const m = logoUrl.toLowerCase().match(/\.(svg|png|jpg|jpeg)(?:\?.*)?$/);
      if (m) ext = m[1] === 'jpeg' ? 'jpg' : m[1];
    }
    if (!ext) ext = 'png';
    const fileName = `${localNameBase}.${ext}`;
    const filePath = path.join(LOGOS_DIR, fileName);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(filePath, buf);
    return `/logos/${fileName}`;
  } catch { return ''; }
}

(async function main() {
  const teams = readJson(TEAMS_PATH);
  let updated = 0;
  for (const t of teams) {
    const pageId = await findWikipediaPageId(t.name, t.sport);
    const official = await findOfficialWebsite(pageId);
    if (!official) continue;
    const icon = await findSiteIcon(official);
    if (!icon) continue;
    // if current logo is remote to another domain or missing, replace
    const hasLocal = String(t.logo || '').startsWith('/logos/');
    if (!hasLocal) {
      if (FIX) {
        const base = `${t.sport.toLowerCase()}-${normalizeName(t.name).replace(/\s+/g, '')}`;
        const local = await downloadLogo(icon, base);
        if (local) {
          t.logo = local;
          updated++;
        }
      }
    }
  }
  if (FIX && updated > 0) writeJson(TEAMS_PATH, teams);
  console.log(`Checked ${teams.length} teams. ${FIX ? 'Updated ' + updated + ' logos.' : 'Run with --fix to update.'}`);
})();


