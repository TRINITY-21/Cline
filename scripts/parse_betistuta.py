#!/usr/bin/env python3
"""
Fetch predictions from https://www.betistuta.net/Futbol.aspx, match against
data/unified_matches.json, and write data/predictions.json with MSBS per match.

Usage:
  python3 scripts/parse_betistuta.py --in data/unified_matches.json --out data/predictions.json
"""

import argparse
import json
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

import requests
from bs4 import BeautifulSoup

HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
}


def get_betistuta_url():
  """
  Get betistuta URL with current date parameter in GMT+3.
  Format: https://www.betistuta.net/Futbol.aspx?D=M/D/YYYY
  """
  # Get current UTC time (timezone-aware)
  now = datetime.now(timezone.utc)
  # Add 3 hours to get GMT+3
  gmt_plus_3 = now + timedelta(hours=3)
  # Format as M/D/YYYY (e.g., 11/1/2025) - remove leading zeros
  month = str(gmt_plus_3.month)
  day = str(gmt_plus_3.day)
  year = str(gmt_plus_3.year)
  date_str = f'{month}/{day}/{year}'
  return f'https://www.betistuta.net/Futbol.aspx?D={date_str}'


def normalize(s: Optional[str]) -> str:
  return (s or '').strip()


def norm_team_name(name: str) -> str:
  n = normalize(name)
  n = n.lower()
  # Basic Turkish diacritics → ASCII for robust matching
  n = (n
       .replace('ş', 's').replace('ç', 'c').replace('ğ', 'g')
       .replace('ü', 'u').replace('ö', 'o').replace('ı', 'i')
       .replace('İ', 'i'))
  n = re.sub(r"\(w\)$", '', n).strip()
  n = re.sub(r"[^a-z0-9]+", ' ', n)
  n = re.sub(r"\s+", ' ', n).strip()
  return n

TR_TO_EN_LEAGUE: Dict[str, str] = {
  'kolombiya': 'Colombia',
  'el salvador': 'El Salvador',
  'bolivya': 'Bolivia',
  'brezilya': 'Brazil',
  'nikaragua': 'Nicaragua',
  'uruguay': 'Uruguay',
  'cezayir': 'Algeria',
  'cfu kulüpl': 'CFU Clubs',
  'fas': 'Morocco',
  'abd': 'USA',
  'mogolistan': 'Mongolia',
  'tayland': 'Thailand',
  'avrupa u17 samp': 'UEFA U17 Championship',
  'concacaf orta a': 'CONCACAF Central A',
  'copa libertador': 'Copa Libertadores',
  'bahreyn': 'Bahrain',
  'belcika': 'Belgium',
  'birlesik arap e': 'United Arab Emirates',
  'caf sampiyonlar': 'CAF Champions',
  'ekvador': 'Ecuador',
  'hindistan': 'India',
  'hollanda': 'Netherlands',
  'irak': 'Iraq',
  'israil': 'Israel',
  'iskocya': 'Scotland',
  'isvicre': 'Switzerland',
  'ispanya': 'Spain',
  'italya': 'Italy',
  'katar': 'Qatar',
  'birlesik arap emirlikleri': 'United Arab Emirates',
  'yunanistan': 'Greece',
  'polonya': 'Poland',
  'slovenya': 'Slovenia',
  'estonya': 'Estonia',
  'finlandiya': 'Finland',
  'makedonya': 'North Macedonia',
  'nijer': 'Niger',
}

def translate_league(tr: str) -> str:
  key = norm_team_name(tr)
  return TR_TO_EN_LEAGUE.get(key, tr)


def parse_betistuta(doc: BeautifulSoup) -> List[Dict[str, str]]:

  # Prefer the main grid by id when available
  target_table = None
  target_table = doc.select_one('table#ctl00_MainContentFull_MainContent_MainGrid')
  
  # Debug: Check if main table found
  if target_table:
    print('✓ Found table by ID: #ctl00_MainContentFull_MainContent_MainGrid')
  else:
    print('⚠️  Main table not found by ID, trying fallback methods...')
  
  # Fallbacks: 1) header based
  if not target_table:
    all_tables = doc.select('table')
    print(f'   Searching through {len(all_tables)} table(s) for MSBS header...')
    for tbl in all_tables:
      headers = [normalize(th.get_text(' ')) for th in tbl.select('th')]
      if headers:
        print(f'   Found table with headers: {headers[:5]}...')
      if any('msbs' in h.lower() for h in headers):
        target_table = tbl
        print('✓ Found table by MSBS header')
        break
  # 2) content based
  if not target_table:
    print('   Searching for MSBS in table cells...')
    msbs_node = doc.find(lambda tag: tag.name in ['th', 'td'] and 'msbs' in normalize(tag.get_text(' ')).lower())
    if msbs_node:
      # climb up to the owning table
      parent = msbs_node
      while parent and parent.name != 'table':
        parent = parent.parent
      if parent and parent.name == 'table':
        target_table = parent
        print('✓ Found table by MSBS content')
  
  if not target_table:
    print('✗ No table found with MSBS column')
    print('   This could mean:')
    print('   1. The page structure changed')
    print('   2. No predictions available for this date')
    print('   3. The URL format or date parameter is incorrect')
    
    # Try to find any table at all for debugging
    all_tables = doc.select('table')
    if all_tables:
      print(f'   Found {len(all_tables)} table(s) on the page, but none contain MSBS')
      # Show first table's structure
      first_table = all_tables[0]
      headers = [normalize(th.get_text(' ')) for th in first_table.select('th')]
      if headers:
        print(f'   First table headers: {headers}')
    
    return []

  # Determine column indices
  headers = [normalize(th.get_text(' ')) for th in target_table.select('th')]
  def idx_of(keyword: str) -> Optional[int]:
    for i, h in enumerate(headers):
      if keyword.lower() in h.lower():
        return i
    return None

  # Known structure: Kod, Saat, EvSahibi, MS, Deplasman, IY, Lig, MSBS, ...
  col_home = idx_of('EvSahibi') or 2
  col_away = idx_of('Deplasman') or 4
  col_msbs = idx_of('MSBS') or 7
  col_league = idx_of('Lig') or 6

  results: List[Dict[str, str]] = []
  rows_processed = 0
  rows_skipped = 0
  
  for tr in target_table.select('tr'):
    tds = tr.find_all('td')
    rows_processed += 1
    
    # Need at least max(col_msbs, col_home, col_away) + 1 cells (since we use 0-based indexing)
    required_cells = max(col_msbs or 0, col_home, col_away) + 1
    if len(tds) < required_cells:
      rows_skipped += 1
      continue
    
    home = normalize(tds[col_home].get_text(' '))
    away = normalize(tds[col_away].get_text(' '))
    
    # Skip rows where both home and away are empty (header rows, etc.)
    if not home and not away:
      rows_skipped += 1
      continue
    
    league_tr = normalize(tds[col_league].get_text(' ')) if col_league is not None and col_league < len(tds) else ''
    league_en = translate_league(league_tr) if league_tr else ''
    msbs_val = normalize(tds[col_msbs].get_text(' ')) if col_msbs is not None and col_msbs < len(tds) else ''
    
    # Compute winner name from MSBS like "2 - 1"
    winner: Optional[str] = None
    m = re.match(r"^(\d+)\s*-\s*(\d+)$", msbs_val)
    if m:
      a = int(m.group(1)); b = int(m.group(2))
      if a > b:
        winner = home
      elif b > a:
        winner = away
      else:
        winner = 'Draw'
    results.append({ 'home': home, 'away': away, 'leagueTr': league_tr, 'leagueEn': league_en, 'msbs': msbs_val, 'msbsWinner': winner or '' })
  
  print(f'   Processed {rows_processed} rows, skipped {rows_skipped}, extracted {len(results)} predictions')

  return results


def main():
  ap = argparse.ArgumentParser()
  ap.add_argument('--in', dest='in_path', default='data/unified_matches.json')
  ap.add_argument('--out', dest='out_path', default='data/predictions.json')
  ap.add_argument('--html', dest='html_path', help='Optional local HTML file to parse instead of fetching')
  args = ap.parse_args()

  with open(args.in_path, 'r', encoding='utf-8') as f:
    unified = json.load(f)

  if args.html_path:
    with open(args.html_path, 'r', encoding='utf-8', errors='ignore') as f:
      html = f.read()
    doc = BeautifulSoup(html, 'html.parser')
  else:
    url = get_betistuta_url()
    print(f'📅 Fetching predictions for date (GMT+3): {url}')
    resp = requests.get(url, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    
    # Debug: Check response content
    if len(resp.text) < 1000:
      print(f'⚠️  Warning: Response is very short ({len(resp.text)} chars), might be an error page')
      print(f'   First 500 chars: {resp.text[:500]}')
    
    doc = BeautifulSoup(resp.text, 'html.parser')
    
    # Debug: Check page title
    title = doc.find('title')
    if title:
      print(f'📄 Page title: {title.get_text().strip()}')
    
    # Check if page contains any tables
    all_tables = doc.select('table')
    print(f'📊 Page contains {len(all_tables)} table(s)')

  bet_rows = parse_betistuta(doc)
  print(f'📊 Found {len(bet_rows)} prediction row(s) from betistuta.net')
  
  if len(bet_rows) == 0:
    print('⚠️  No predictions found in the scraped HTML')
    print('   This could mean:')
    print('   1. No predictions available for this date')
    print('   2. The HTML structure changed (table selectors need updating)')
    print('   3. The page returned different content')
    with open(args.out_path, 'w', encoding='utf-8') as f:
      json.dump([], f, ensure_ascii=False, indent=2)
    return
  
  # Show first few prediction rows for debugging
  if len(bet_rows) > 0:
    print(f'\n📋 Sample prediction rows (first 3):')
    for i, row in enumerate(bet_rows[:3]):
      print(f'   {i+1}. {row.get("home", "?")} vs {row.get("away", "?")} | MSBS: {row.get("msbs", "?")}')
  
  # Build normalized lookup for unified matches by team pair
  unified_map: Dict[str, Dict[str, Any]] = {}
  for m in unified:
    h = norm_team_name(m.get('home', {}).get('name', ''))
    a = norm_team_name(m.get('away', {}).get('name', ''))
    key = f"{h}|{a}"
    unified_map[key] = m

  print(f'\n📊 Found {len(unified_map)} match(es) in unified_matches.json')
  
  # Show sample matches for debugging
  if len(unified_map) > 0:
    print(f'📋 Sample matches (first 3):')
    for i, (key, match) in enumerate(list(unified_map.items())[:3]):
      home_name = match.get('home', {}).get('name', '?')
      away_name = match.get('away', {}).get('name', '?')
      print(f'   {i+1}. {home_name} vs {away_name} (normalized: {key})')

  predictions: List[Dict[str, Any]] = []
  unmatched_count = 0
  for row in bet_rows:
    h = norm_team_name(row['home'])
    a = norm_team_name(row['away'])
    key = f"{h}|{a}"
    match = unified_map.get(key)
    if not match:
      # try swapped order
      match = unified_map.get(f"{a}|{h}")
    if not match:
      unmatched_count += 1
      if unmatched_count <= 5:  # Show first 5 unmatched for debugging
        print(f'⚠️  No match found for: {row.get("home")} vs {row.get("away")} (normalized: {h} | {a})')
      continue
    predictions.append({
      'id': match.get('id'),
      'sport': match.get('sport'),
      'league': row.get('leagueEn') or row.get('leagueTr') or (match.get('league', {}).get('name') if match.get('league') else None),
      'home': match.get('home', {}).get('name'),
      'away': match.get('away', {}).get('name'),
      'timeLabel': match.get('timeLabel'),
      'msbs': row.get('msbs', ''),
      'msbsWinner': row.get('msbsWinner', ''),
    })

  with open(args.out_path, 'w', encoding='utf-8') as f:
    json.dump(predictions, f, ensure_ascii=False, indent=2)
  
  print(f'✅ Matched {len(predictions)} prediction(s) to unified matches')
  if unmatched_count > 0:
    print(f'⚠️  {unmatched_count} prediction(s) could not be matched to any unified match')
    print(f'   (Shown first 5 unmatched above; check team name normalization)')
  
  print(f'💾 Wrote {len(predictions)} prediction(s) to {args.out_path}')


if __name__ == '__main__':
  main()


