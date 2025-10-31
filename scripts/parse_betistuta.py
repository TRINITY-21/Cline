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
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple

import requests
from bs4 import BeautifulSoup

HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
}


def get_betistuta_url():
  """
  Get betistuta URL with current date parameter using GMT+3 timezone.
  Format: https://www.betistuta.net/Futbol.aspx?D=M/D/YYYY
  """
  # Get current UTC time and add 3 hours to get GMT+3
  now_utc = datetime.now(timezone.utc)
  gmt_plus_3 = now_utc + timedelta(hours=3)
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
  # Handle more diacritics for international teams
  n = (n
       .replace('ß', 'ss').replace('ä', 'a').replace('ë', 'e')
       .replace('ï', 'i').replace('ñ', 'n').replace('á', 'a')
       .replace('é', 'e').replace('í', 'i').replace('ó', 'o')
       .replace('ú', 'u'))
  n = re.sub(r"\(w\)$", '', n).strip()
  n = re.sub(r"[^a-z0-9]+", ' ', n)
  n = re.sub(r"\s+", ' ', n).strip()
  return n


def extract_teams_from_id(match_id: str) -> tuple[str, str]:
  """
  Extract team names from match ID like "preu-en-m-nster-vs-holstein-kiel-20-30"
  Returns (home_team, away_team) or (None, None) if can't parse
  """
  if not match_id or '-' not in match_id:
    return (None, None)
  
  # Remove time suffix (last part that looks like time: HH-MM or HHMM)
  parts = match_id.split('-')
  # Look for "vs" which separates teams
  try:
    vs_idx = -1
    for i, part in enumerate(parts):
      if part == 'vs':
        vs_idx = i
        break
    
    if vs_idx == -1:
      # No "vs" found, try to find where time starts (last 2 parts that are numbers)
      # Find the split point by looking for number patterns at the end
      for i in range(len(parts) - 1, max(0, len(parts) - 4), -1):
        if parts[i].isdigit() and len(parts[i]) <= 2:
          vs_idx = i - 1
          break
    
    if vs_idx > 0:
      home_parts = parts[:vs_idx]
      away_parts = parts[vs_idx+1:]
      
      # Remove time parts from away (last 1-2 numeric parts)
      while away_parts and away_parts[-1].isdigit() and len(away_parts[-1]) <= 2:
        away_parts = away_parts[:-1]
      
      home_name = ' '.join(home_parts).replace('-', ' ')
      away_name = ' '.join(away_parts).replace('-', ' ')
      
      return (home_name, away_name)
  except:
    pass
  
  return (None, None)


def fuzzy_match_teams(pred_home: str, pred_away: str, match_home: str, match_away: str, match_id: str = None) -> bool:
  """
  Check if two team pairs match using fuzzy logic.
  Returns True if teams are similar enough to be considered the same match.
  """
  def normalize_for_fuzzy(name: str) -> str:
    if not name:
      return ''
    # More aggressive normalization for fuzzy matching
    n = norm_team_name(name)
    # Remove common words that might differ
    common_words = ['fc', 'cf', 'club', 'de', 'da', 'do', 'das', 'los', 'las', 'the']
    words = n.split()
    words = [w for w in words if w not in common_words and len(w) > 2]
    return ' '.join(words)
  
  # If match_id is provided, try to extract teams from ID first
  if match_id:
    id_home, id_away = extract_teams_from_id(match_id)
    if id_home and id_away:
      # Try matching prediction teams against ID-extracted teams
      pred_h_norm = normalize_for_fuzzy(pred_home)
      pred_a_norm = normalize_for_fuzzy(pred_away)
      id_h_norm = normalize_for_fuzzy(id_home)
      id_a_norm = normalize_for_fuzzy(id_away)
      
      # Check if teams match using contains logic (avoid recursion)
      def quick_contains_match(s1: str, s2: str) -> bool:
        if not s1 or not s2:
          return False
        s1_clean = s1.replace(' ', '').replace('-', '')
        s2_clean = s2.replace(' ', '').replace('-', '')
        if len(s1_clean) >= 4 and len(s2_clean) >= 4:
          return s1_clean in s2_clean or s2_clean in s1_clean
        return False
      
      # Check if prediction teams match ID-extracted teams
      home_matches = quick_contains_match(pred_h_norm, id_h_norm) or quick_contains_match(pred_h_norm, id_a_norm)
      away_matches = quick_contains_match(pred_a_norm, id_a_norm) or quick_contains_match(pred_a_norm, id_h_norm)
      
      if home_matches and away_matches:
        return True
      
      # Try swapped
      home_matches_swapped = quick_contains_match(pred_h_norm, id_a_norm) or quick_contains_match(pred_h_norm, id_h_norm)
      away_matches_swapped = quick_contains_match(pred_a_norm, id_h_norm) or quick_contains_match(pred_a_norm, id_a_norm)
      
      if home_matches_swapped and away_matches_swapped:
        return True
  
  pred_h_norm = normalize_for_fuzzy(pred_home)
  pred_a_norm = normalize_for_fuzzy(pred_away)
  match_h_norm = normalize_for_fuzzy(match_home)
  match_a_norm = normalize_for_fuzzy(match_away)
  
  # Check exact match (both orders)
  if (pred_h_norm == match_h_norm and pred_a_norm == match_a_norm) or \
     (pred_h_norm == match_a_norm and pred_a_norm == match_h_norm):
    return True
  
  # Fuzzy: check if one team name contains the other (for abbreviations/variations)
  def contains_match(s1: str, s2: str) -> bool:
    if not s1 or not s2:
      return False
    # Remove spaces for better matching
    s1_clean = s1.replace(' ', '').replace('-', '')
    s2_clean = s2.replace(' ', '').replace('-', '')
    # Check if one contains the other (minimum 4 chars to avoid false matches)
    if len(s1_clean) >= 4 and len(s2_clean) >= 4:
      if s1_clean in s2_clean or s2_clean in s1_clean:
        return True
    # Also check if significant words match (at least 3 chars)
    s1_words = [w for w in s1.split() if len(w) >= 3]
    s2_words = [w for w in s2.split() if len(w) >= 3]
    if s1_words and s2_words:
      # Check if any significant word from one appears in the other
      for w1 in s1_words:
        for w2 in s2_words:
          if len(w1) >= 4 and len(w2) >= 4:
            if w1 in w2 or w2 in w1:
              return True
    return False
  
  # Check if home teams match (fuzzy) and away teams match (fuzzy)
  home_match = contains_match(pred_h_norm, match_h_norm) or \
               contains_match(pred_h_norm, match_a_norm)
  away_match = contains_match(pred_a_norm, match_a_norm) or \
               contains_match(pred_a_norm, match_h_norm)
  
  # Also try swapped
  home_match_swapped = contains_match(pred_h_norm, match_a_norm) or \
                       contains_match(pred_h_norm, match_h_norm)
  away_match_swapped = contains_match(pred_a_norm, match_h_norm) or \
                       contains_match(pred_a_norm, match_a_norm)
  
  # Require both teams to match (either exact order or swapped)
  return (home_match and away_match) or (home_match_swapped and away_match_swapped)

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
    print(f'📅 Fetching predictions for date: {url}')
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
    home_name = m.get('home', {}).get('name', '')
    away_name = m.get('away', {}).get('name', '')
    h = norm_team_name(home_name)
    a = norm_team_name(away_name)
    
    # Create key with consistent separator
    key = f"{h}|{a}"
    unified_map[key] = m
    
    # Also store swapped version for easier matching
    key_swapped = f"{a}|{h}"
    if key_swapped != key:
      unified_map[key_swapped] = m

  print(f'\n📊 Found {len(unified)} match(es) in unified_matches.json')
  print(f'   Created {len(unified_map)} normalized lookup key(s) (including swapped)')
  
  # Show sample matches for debugging
  if len(unified_map) > 0:
    print(f'\n📋 Sample matches (first 3):')
    for i, match in enumerate(unified[:3]):
      home_name = match.get('home', {}).get('name', '?')
      away_name = match.get('away', {}).get('name', '?')
      h = norm_team_name(home_name)
      a = norm_team_name(away_name)
      print(f'   {i+1}. {home_name} vs {away_name}')
      print(f'      Normalized: "{h}" | "{a}" → Key: "{h}|{a}"')

  predictions: List[Dict[str, Any]] = []
  unmatched_count = 0
  matched_count = 0
  fuzzy_matched_count = 0
  
  for row in bet_rows:
    h_raw = row.get('home', '')
    a_raw = row.get('away', '')
    h = norm_team_name(h_raw)
    a = norm_team_name(a_raw)
    
    # Build key with consistent format (no extra spaces)
    key1 = f"{h}|{a}"
    key2 = f"{a}|{h}"
    
    match = unified_map.get(key1)
    if not match:
      # try swapped order
      match = unified_map.get(key2)
    
    # If exact match failed, try fuzzy matching
    if not match:
      for unified_match in unified:
        match_home = unified_match.get('home', {}).get('name', '')
        match_away = unified_match.get('away', {}).get('name', '')
        match_id = unified_match.get('id', '')
        
        if fuzzy_match_teams(h_raw, a_raw, match_home, match_away, match_id):
          match = unified_match
          fuzzy_matched_count += 1
          if fuzzy_matched_count <= 5:
            print(f'🔍 Fuzzy matched: {h_raw} vs {a_raw}')
            print(f'   → {match_home} vs {match_away} (ID: {match_id})')
          break
    
    if not match:
      unmatched_count += 1
      if unmatched_count <= 10:  # Show first 10 unmatched for debugging
        print(f'⚠️  No match: {h_raw} vs {a_raw}')
        print(f'      Normalized: "{h}" | "{a}"')
        print(f'      Looking for keys: "{key1}" or "{key2}"')
      continue
    
    matched_count += 1
    if matched_count <= 3 and fuzzy_matched_count == 0:
      print(f'✓ Exact matched: {h_raw} vs {a_raw}')
    
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
  
  print(f'\n📊 Matching Summary:')
  print(f'   ✅ Total matched: {len(predictions)} prediction(s)')
  if fuzzy_matched_count > 0:
    print(f'      - Exact matches: {len(predictions) - fuzzy_matched_count}')
    print(f'      - Fuzzy matches: {fuzzy_matched_count}')
  print(f'   ⚠️  Unmatched: {unmatched_count} prediction(s)')
  
  if unmatched_count > 0 and len(unified_map) > 0:
    print(f'\n💡 Tips to improve matching:')
    print(f'   1. Ensure unified_matches.json is up-to-date with recent matches')
    print(f'   2. Team names in predictions might differ from match names')
    print(f'   3. Check if matches were scraped for the same date as predictions')
    print(f'   4. Current unified_matches.json has {len(unified_map)} match(es)')
    
    # Show some unified match keys for comparison
    print(f'\n📋 Sample unified match keys (for comparison):')
    for i, (key, match) in enumerate(list(unified_map.items())[:5]):
      home_name = match.get('home', {}).get('name', '?')
      away_name = match.get('away', {}).get('name', '?')
      print(f'   {i+1}. Key: "{key}" → {home_name} vs {away_name}')
  
  print(f'\n💾 Wrote {len(predictions)} prediction(s) to {args.out_path}')


if __name__ == '__main__':
  main()


