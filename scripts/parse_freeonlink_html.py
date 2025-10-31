#!/usr/bin/env python3
"""
Parse a saved HTML file (freeonlink_html_element.html), locate the embedded
schedule iframe, fetch it, extract match rows without clicking, and emit
UnifiedMatch JSON.

Usage:
  python3 scripts/parse_freeonlink_html.py \
    --in freeonlink_html_element.html --out data/unified_matches.json
"""

import argparse
import json
import re
import time
from typing import List, Dict, Any, Optional

import requests
from bs4 import BeautifulSoup


HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                 "AppleWebKit/537.36 (KHTML, like Gecko) "
                 "Chrome/126.0 Safari/537.36",
}


def normalize(text: Optional[str]) -> str:
  return (text or '').strip()


def normalize_sport(name: Optional[str]) -> str:
  """Map arbitrary scraped sport labels to app's canonical set.
  Canonical: Football, Hockey, Volleyball, Basketball, Tennis
  Defaults to Football when uncertain.
  """
  n = (name or '').strip().lower()
  if not n:
    return 'Football'
  if 'tennis' in n:
    return 'Tennis'
  if 'hockey' in n:
    return 'Hockey'
  if 'basket' in n:
    return 'Basketball'
  if 'volley' in n:
    return 'Volleyball'
  if 'soccer' in n or 'football' in n or 'futbol' in n:
    return 'Football'
  # fallback
  return 'Football'

def normalize_id_part(text: Optional[str]) -> str:
  t = normalize(text).lower()
  t = (t.encode('ascii', 'ignore').decode('ascii'))
  t = re.sub(r"[^a-z0-9]+", "-", t)
  t = re.sub(r"^-+|-+$", "", t)
  return t[:40]


def parse_main_iframe_src(doc: BeautifulSoup) -> Optional[str]:
  # Prefer iframe#main-iframe, else any iframe to livetv.sx/export
  iframe = doc.select_one('iframe#main-iframe[src]')
  if iframe and iframe.get('src'):
    return iframe['src']
  for ifr in doc.select('iframe[src]'):
    src = ifr.get('src') or ''
    if 'livetv.sx/export/webmasters.php' in src:
      return src
  return None


def fetch_iframe_html(url: str) -> BeautifulSoup:
  # Some sources use non-standard cert chains; allow without verification in this context
  resp = requests.get(url, headers=HEADERS, timeout=30, verify=False)
  resp.raise_for_status()
  return BeautifulSoup(resp.text, 'html.parser')


def parse_matches_from_iframe(doc: BeautifulSoup) -> List[Dict[str, str]]:
  items: List[Dict[str, str]] = []

  # Common patterns in livetv export: a table where first cell is time,
  # second cell often contains league/sport labels, and third cell has teams link
  for tr in doc.select('tr'):
    tds = tr.find_all('td')
    if len(tds) < 2:
      continue
    # Only parse rows where the first cell is the time cell
    first_td_classes = [c for c in (tds[0].get('class') or [])]
    if 'time' not in first_td_classes:
      continue
    # time is in the first column's text
    time_label = normalize(' '.join(tds[0].stripped_strings))

    # league/sport are frequently labeled with span.cmp (competition) and span.spr (sport)
    league_name = ''
    sport_name = ''
    try:
      league_el = (tds[2].select_one('span.cmp') if len(tds) > 2 else None)
      if league_el:
        league_name = normalize(league_el.get_text(' '))
    except Exception:
      pass
    try:
      sport_el = (tds[2].select_one('span.spr') if len(tds) > 2 else None)
      if sport_el:
        sport_name = normalize(sport_el.get_text(' '))
    except Exception:
      pass

    # team anchor is usually in the fourth cell overall (index 3), but in our
    # parsed list it is the third non-flag/league cell, index 3 or 2 depending on layout
    a = None
    if len(tds) >= 4:
      a = tds[3].select_one('a[href]')
    if not a and len(tds) >= 3:
      a = tds[2].select_one('a[href]')
    if not a:
      a = tds[1].select_one('a[href]') or tr.select_one('a[href]')

    # Extract teams text either from link or grey span when no link is present
    teams_text = ''
    if a:
      teams_text = normalize(' '.join(a.stripped_strings))
    if not teams_text:
      grey = None
      if len(tds) >= 4:
        grey = tds[3].select_one('span.grey')
      if not grey and len(tds) >= 3:
        grey = tds[2].select_one('span.grey')
      if grey:
        teams_text = normalize(grey.get_text(' '))
    if not teams_text:
      continue

    # Identify match line by separators
    parts = None
    for sep in [' – ', ' — ', ' - ', ' vs ', ' v ']:
      if sep in teams_text and len(teams_text) <= 200:
        parts = [normalize(p) for p in teams_text.split(sep, 1)]
        break
    if not parts:
      m = re.search(r"(.+?)\s+(?:–|—|-|vs|v)\s+(.+)", teams_text, re.IGNORECASE)
      if m:
        parts = [normalize(m.group(1)), normalize(m.group(2))]
    if not parts or len(parts) != 2:
      continue
    home, away = parts

    href = (a.get('href') if a else '') or ''
    if href and not href.startswith('http'):
      # The export often uses relative links
      href = requests.compat.urljoin('https://livetv.sx/', href)

    items.append({
      'href': href,
      'timeLabel': time_label,
      'home': home,
      'away': away,
      'league': league_name,
      'sport': normalize_sport(sport_name),
      'videoSrc': '',
    })

  # Dedup
  dedup: Dict[str, Dict[str, str]] = {}
  for it in items:
    key = (it['home'], it['away'], it['timeLabel'])
    dedup[str(key)] = it
  return list(dedup.values())


def to_unified(entries: List[Dict[str, str]]) -> List[Dict[str, Any]]:
  out: List[Dict[str, Any]] = []
  for e in entries:
    match_id = '-'.join(filter(None, [
      normalize_id_part(e['home']), 'vs', normalize_id_part(e['away']), normalize_id_part(e.get('timeLabel'))
    ]))
    has_video = bool(e.get('videoSrc'))
    # Use the exact label for startTime to keep parity with source
    start_iso = e.get('timeLabel') or None
    out.append({
      'id': match_id or str(int(time.time()*1000)),
      'sport': normalize_sport(e.get('sport')),
      'league': {'name': e.get('league')} if e.get('league') else None,
      'home': {'name': e['home']},
      'away': {'name': e['away']},
      'status': 'live' if has_video else 'upcoming',
      'timeLabel': e.get('timeLabel') or None,
      'startTime': start_iso,
      'videoSrc': e.get('videoSrc') or '',
      'today': True,
    })
  return out


def extract_video_iframe_src(match_page_url: str) -> str:
  """Fetch a match page and try to extract the embedded video iframe src."""
  if not match_page_url:
    return ''
  try:
    resp = requests.get(match_page_url, headers=HEADERS, timeout=30, verify=False)
    resp.raise_for_status()
    doc = BeautifulSoup(resp.text, 'html.parser')
    
    # Helper: follow 1-2 levels of nested web-player iframes to the actual player
    def resolve_nested_iframe(url: str, depth: int = 0, max_depth: int = 2) -> str:
      if depth >= max_depth or not url:
        return url
      try:
        r = requests.get(url, headers=HEADERS, timeout=20, verify=False)
        r.raise_for_status()
        d = BeautifulSoup(r.text, 'html.parser')
      except Exception:
        return url
      # If this page itself contains an iframe, prefer the first non-ad one
      nested = ''
      # Prefer a direct iframe inside an explicit player container when present
      player_ifr = d.select_one('#playerblock iframe[src]')
      if player_ifr:
        s0 = (player_ifr.get('src') or '').strip()
        if s0 and not s0.startswith('http'):
          s0 = requests.compat.urljoin(url, s0)
        if s0:
          return resolve_nested_iframe(s0, depth + 1, max_depth)

      for ifr in d.select('iframe[src]'):
        s = (ifr.get('src') or '').strip()
        if not s:
          continue
        if not s.startswith('http'):
          s = requests.compat.urljoin(url, s)
        # Skip obvious wrappers and menu/tool frames
        low = s.lower()
        if any(p in low for p in ['livetv.sx/export', 'menu', 'ads', 'banner']):
          continue
        nested = s
        break
      if not nested:
        return url
      # Recurse one level deeper
      return resolve_nested_iframe(nested, depth + 1, max_depth)
    # Heuristics: prefer external players that typically allow embedding
    # Note: YouTube often blocks third‑party embedding for live streams, so push it lower.
    preferred_patterns = [
      r"dovkembed|voodc|flixx|fl1xx|streamsgate|ap\w+\d*\.me|antenasport|emb\.",
      r"/live|/player|/embed|/watch",
      r"youtube\.com/embed",
    ]
    def score(url: str) -> int:
      s = 0
      lower = url.lower()
      if 'livetv.sx' in lower:
        s -= 5  # menu/tool iframes
      if 'youtube.com/embed' in lower:
        # Nudge YouTube down because many live videos disallow embedding
        s -= 2
      for i, pat in enumerate(preferred_patterns):
        if re.search(pat, lower):
          s += 10 - i  # earlier patterns higher score
      # favor https absolute
      if lower.startswith('https://'):
        s += 1
      return s

    candidates = []
    # First, prefer explicit player block iframe when present
    pb = doc.select_one('#playerblock iframe[src]')
    if pb:
      src = (pb.get('src') or '').strip()
      if src and not src.startswith('http'):
        src = requests.compat.urljoin(match_page_url, src)
      if src:
        candidates.append((100, src))  # very high score for explicit player
    for ifr in doc.select('iframe[src]'):
      src = (ifr.get('src') or '').strip()
      if not src:
        continue
      if not src.startswith('http'):
        src = requests.compat.urljoin(match_page_url, src)
      candidates.append((score(src), src))
    if not candidates:
      # sometimes links point directly to player pages
      for a in doc.select('a[href]'):
        href = (a.get('href') or '').strip()
        if not href:
          continue
        if not href.startswith('http'):
          href = requests.compat.urljoin(match_page_url, href)
        sc = score(href)
        if sc > 0:
          candidates.append((sc, href))

    if not candidates:
      return ''
    candidates.sort(key=lambda x: x[0], reverse=True)
    best = candidates[0][1]
    # Resolve nested iframe chain if the best is a wrapper/webplayer
    final_url = resolve_nested_iframe(best)
    # Drop wrapper players that start with https://live... or https://cdn.livetv...
    low = final_url.lower()
    if low.startswith('https://live') or low.startswith('https://cdn.livetv'):
      return ''
    return final_url
  except Exception:
    return ''


def main():
  ap = argparse.ArgumentParser()
  ap.add_argument('--in', dest='in_path', default='freeonlink_html_element.html')
  ap.add_argument('--out', dest='out_path', default='data/unified_matches.json')
  ap.add_argument('--all-sports', action='store_true', help='Follow iframe menu to fetch all sports')
  args = ap.parse_args()

  # Read saved HTML
  with open(args.in_path, 'r', encoding='utf-8', errors='ignore') as f:
    html = f.read()
  root = BeautifulSoup(html, 'html.parser')
  iframe_url = parse_main_iframe_src(root)
  if not iframe_url:
    print('No iframe src found.')
    with open(args.out_path, 'w', encoding='utf-8') as f:
      json.dump([], f)
    return

  def enrich_and_collect(doc: BeautifulSoup, acc: List[Dict[str, str]]):
    items = parse_matches_from_iframe(doc)
    for e in items:
      if e.get('href'):
        e['videoSrc'] = extract_video_iframe_src(e['href'])
    acc.extend(items)

  iframe_doc = fetch_iframe_html(iframe_url)
  # Debug: save fetched iframe to inspect structure locally
  try:
    with open('data/iframe_dump.html', 'w', encoding='utf-8') as f:
      f.write(str(iframe_doc))
  except Exception:
    pass

  all_entries: List[Dict[str, str]] = []

  if args.all_sports:
    # Follow menu links in the iframe to iterate over sports
    menu_links = iframe_doc.select('a.menu[href]')
    seen_urls = set()
    for a in menu_links:
      href = a.get('href') or ''
      if not href:
        continue
      abs_url = requests.compat.urljoin(iframe_url, href)
      if abs_url in seen_urls:
        continue
      seen_urls.add(abs_url)
      try:
        sport_doc = fetch_iframe_html(abs_url)
        enrich_and_collect(sport_doc, all_entries)
      except Exception:
        continue
  else:
    enrich_and_collect(iframe_doc, all_entries)

  # Deduplicate across sports
  dedup: Dict[str, Dict[str, str]] = {}
  for e in all_entries:
    key = (e.get('sport') or '', e.get('league') or '', e.get('timeLabel') or '', e.get('home') or '', e.get('away') or '')
    dedup[str(key)] = e
  entries = list(dedup.values())

  data = to_unified(entries)
  with open(args.out_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
  print(f'Wrote {len(data)} matches to {args.out_path}')


if __name__ == '__main__':
  main()


