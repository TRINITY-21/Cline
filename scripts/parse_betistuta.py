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
    # Remove common words that might differ or cause false matches
    common_words = ['fc', 'cf', 'club', 'de', 'da', 'do', 'das', 'los', 'las', 'the', 
                    'town', 'city', 'united', 'athletic', 'sporting', 'fc', 'cf']
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
      # STRICT matching for ID-based matching - exclude common words
      def quick_contains_match(s1: str, s2: str) -> bool:
        if not s1 or not s2:
          return False
        
        # Extract meaningful words (exclude common generic words)
        common_words = {'town', 'city', 'fc', 'cf', 'united', 'club', 'athletic', 'sporting',
                       'de', 'da', 'do', 'das', 'los', 'las', 'the', 'wanderers', 'rovers', 'rangers',
                       'green', 'red', 'blue', 'white', 'black', 'forest', 'park'}
        s1_words = {w for w in s1.lower().split() if len(w) >= 4 and w not in common_words}
        s2_words = {w for w in s2.lower().split() if len(w) >= 4 and w not in common_words}
        
        # Must have meaningful words on both sides
        if not s1_words or not s2_words:
          return False
        
        # ALL meaningful words must match (100% overlap required)
        # This prevents false matches like "Mansfield Town" → "Luton Town"
        if s1_words == s2_words:
          return True
        
        # If different number of words, all of the smaller set must be in the larger
        if len(s1_words) <= len(s2_words):
          if s1_words.issubset(s2_words):
            # Require 80% overlap
            all_words = s1_words | s2_words
            return len(s1_words) / max(len(all_words), 1) >= 0.8
        else:
          if s2_words.issubset(s1_words):
            all_words = s1_words | s2_words
            return len(s2_words) / max(len(all_words), 1) >= 0.8
        
        return False
      
      # Check if prediction teams match ID-extracted teams
      # Both teams must match
      home_matches_home = quick_contains_match(pred_h_norm, id_h_norm)
      home_matches_away = quick_contains_match(pred_h_norm, id_a_norm)
      away_matches_away = quick_contains_match(pred_a_norm, id_a_norm)
      away_matches_home = quick_contains_match(pred_a_norm, id_h_norm)
      
      # Exact order match
      if home_matches_home and away_matches_away:
        return True
      
      # Swapped order match
      if home_matches_away and away_matches_home:
        return True
      
      # Don't allow lenient matching for ID-based matching
      # Both teams must match exactly (home-home AND away-away OR home-away AND away-home)
      return False
  
  pred_h_norm = normalize_for_fuzzy(pred_home)
  pred_a_norm = normalize_for_fuzzy(pred_away)
  match_h_norm = normalize_for_fuzzy(match_home)
  match_a_norm = normalize_for_fuzzy(match_away)
  
  # Check exact match (both orders)
  if (pred_h_norm == match_h_norm and pred_a_norm == match_a_norm) or \
     (pred_h_norm == match_a_norm and pred_a_norm == match_h_norm):
    return True
  
  # Fuzzy: check if one team name contains the other (for abbreviations/variations)
  # But be more strict - require significant overlap
  def contains_match(s1: str, s2: str) -> bool:
    if not s1 or not s2:
      return False
    # Remove spaces and hyphens for better matching
    s1_clean = s1.replace(' ', '').replace('-', '').lower()
    s2_clean = s2.replace(' ', '').replace('-', '').lower()
    
    # If one is very short, require exact match
    if len(s1_clean) < 4 or len(s2_clean) < 4:
      return s1_clean == s2_clean
    
    # Check if one contains the other (but require at least 60% overlap)
    if s1_clean in s2_clean:
      # s1 is contained in s2, check if it's a significant portion
      overlap_ratio = len(s1_clean) / max(len(s2_clean), 1)
      return overlap_ratio >= 0.6
    if s2_clean in s1_clean:
      overlap_ratio = len(s2_clean) / max(len(s1_clean), 1)
      return overlap_ratio >= 0.6
    
    # Check word-level matching - require at least one significant word match (5+ chars)
    s1_words = [w for w in s1.split() if len(w) >= 5]
    s2_words = [w for w in s2.split() if len(w) >= 5]
    
    if s1_words and s2_words:
      # Check if there's a significant word match
      for w1 in s1_words:
        for w2 in s2_words:
          # Require exact word match or very high overlap (80%+)
          if w1 == w2:
            return True
          if len(w1) >= 6 and len(w2) >= 6:
            # Check if one word is mostly contained in the other
            if w1 in w2 and len(w1) / len(w2) >= 0.8:
              return True
            if w2 in w1 and len(w2) / len(w1) >= 0.8:
              return True
    
    return False
  
  # Check if home teams match (fuzzy) and away teams match (fuzzy)
  # BOTH teams must match with good confidence
  home_matches_home = contains_match(pred_h_norm, match_h_norm)
  home_matches_away = contains_match(pred_h_norm, match_a_norm)
  away_matches_away = contains_match(pred_a_norm, match_a_norm)
  away_matches_home = contains_match(pred_a_norm, match_h_norm)
  
  # Try exact order: home matches home AND away matches away
  if (home_matches_home and away_matches_away):
    return True
  
  # Try swapped: home matches away AND away matches home
  if (home_matches_away and away_matches_home):
    return True
  
  # Require STRICT matching - don't match just because of common words like "Town"
  # Both teams must have meaningful matches (excluding common words)
  
  def get_meaningful_words(name: str) -> set[str]:
    """Extract meaningful words (exclude common generic words)"""
    common_words = {'town', 'city', 'fc', 'cf', 'united', 'club', 'athletic', 'sporting', 
                    'de', 'da', 'do', 'das', 'los', 'las', 'the', 'fc', 'cf',
                    'wanderers', 'rovers', 'rangers', 'athletic', 'sporting',
                    'green', 'red', 'blue', 'white', 'black', 'forest', 'park',
                    'town', 'city', 'united', 'city', 'athletic'}
    words = name.lower().split()
    return {w for w in words if len(w) >= 4 and w not in common_words}
  
  def meaningful_match_strength(s1: str, s2: str) -> float:
    """Calculate match strength excluding common words"""
    if not s1 or not s2:
      return 0.0
    
    # Remove common words and get meaningful words
    s1_words = get_meaningful_words(s1)
    s2_words = get_meaningful_words(s2)
    
    if not s1_words or not s2_words:
      # If no meaningful words, require high overlap on full string
      s1_clean = s1.replace(' ', '').replace('-', '').lower()
      s2_clean = s2.replace(' ', '').replace('-', '').lower()
      if s1_clean in s2_clean:
        ratio = len(s1_clean) / max(len(s2_clean), 1)
        return ratio if ratio >= 0.7 else 0.0
      if s2_clean in s1_clean:
        ratio = len(s2_clean) / max(len(s1_clean), 1)
        return ratio if ratio >= 0.7 else 0.0
      return 0.0
    
    # Check meaningful word overlap - REQUIRE STRICT MATCHING
    common_words = s1_words & s2_words
    
    # If no meaningful words match at all, no match
    if not common_words:
      return 0.0
    
    # ALL meaningful words from BOTH sides must match (100% overlap required)
    # This prevents "Mansfield Town" matching "Luton Town" (mansfield != luton)
    if s1_words == s2_words and common_words == s1_words == s2_words:
      return 1.0
    
    # If one side has fewer words, all of those must match
    # Example: "Luton" must match "Luton", not just partially
    if len(s1_words) <= len(s2_words):
      # All of s1's words must be in s2
      if s1_words.issubset(s2_words):
        # But require at least 80% of combined words to match
        all_words = s1_words | s2_words
        overlap = len(common_words) / max(len(all_words), 1)
        return overlap if overlap >= 0.8 else 0.0
    else:
      # All of s2's words must be in s1
      if s2_words.issubset(s1_words):
        all_words = s1_words | s2_words
        overlap = len(common_words) / max(len(all_words), 1)
        return overlap if overlap >= 0.8 else 0.0
    
    return 0.0
  
  # Calculate meaningful match strengths (excluding common words)
  home_home_strength = meaningful_match_strength(pred_h_norm, match_h_norm)
  home_away_strength = meaningful_match_strength(pred_h_norm, match_a_norm)
  away_away_strength = meaningful_match_strength(pred_a_norm, match_a_norm)
  away_home_strength = meaningful_match_strength(pred_a_norm, match_h_norm)
  
  # Require STRICT matching: both teams must have strong matches (70%+)
  # Exact order: home matches home AND away matches away
  if home_home_strength >= 0.7 and away_away_strength >= 0.7:
    return True
  
  # Swapped order: home matches away AND away matches home
  if home_away_strength >= 0.7 and away_home_strength >= 0.7:
    return True
  
  # Don't allow lenient matching - prevents false matches from common words
  return False

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
  col_time = idx_of('Saat') or 1  # Time column

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
    time_label = normalize(tds[col_time].get_text(' ')) if col_time is not None and col_time < len(tds) else ''
    
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
    results.append({ 
      'home': home, 
      'away': away, 
      'leagueTr': league_tr, 
      'leagueEn': league_en, 
      'msbs': msbs_val, 
      'msbsWinner': winner or '',
      'timeLabel': time_label
    })
  
  print(f'   Processed {rows_processed} rows, skipped {rows_skipped}, extracted {len(results)} predictions')

  return results


def main():
  ap = argparse.ArgumentParser()
  ap.add_argument('--out', dest='out_path', default='data/predictions.json')
  ap.add_argument('--html', dest='html_path', help='Optional local HTML file to parse instead of fetching')
  args = ap.parse_args()
  
  # No longer need unified_matches.json - storing all predictions directly

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
  
  # Store all predictions directly without matching to unified_matches.json
  # Generate unique IDs based on team names and date
  predictions: List[Dict[str, Any]] = []
  
  for row in bet_rows:
    h_raw = row.get('home', '').strip()
    a_raw = row.get('away', '').strip()
    
    if not h_raw or not a_raw:
      continue
    
    # Generate a unique ID from team names
    h_normalized = norm_team_name(h_raw).replace(' ', '-').replace('|', '-')
    a_normalized = norm_team_name(a_raw).replace(' ', '-').replace('|', '-')
    time_label = row.get('timeLabel', '').replace(':', '-') or '00-00'
    
    # Get time label from row
    time_label_raw = row.get('timeLabel', '').strip()
    time_label_for_id = time_label_raw.replace(':', '-') if time_label_raw else '00-00'
    
    # Create ID: home-team-vs-away-team-time
    pred_id = f"{h_normalized}-vs-{a_normalized}-{time_label_for_id}"
    
    predictions.append({
      'id': pred_id,
      'sport': 'Football',
      'league': row.get('leagueEn') or row.get('leagueTr') or '',
      'home': h_raw,
      'away': a_raw,
      'timeLabel': time_label_raw,
      'msbs': row.get('msbs', ''),
      'msbsWinner': row.get('msbsWinner', ''),
      'status': None,  # Will be set automatically when results are available
      'result': None,  # Will be set when actual result is fetched
    })

  with open(args.out_path, 'w', encoding='utf-8') as f:
    json.dump(predictions, f, ensure_ascii=False, indent=2)
  
  print(f'\n📊 Scraping Summary:')
  print(f'   ✅ Scraped: {len(predictions)} prediction(s)')
  print(f'   💾 Wrote {len(predictions)} prediction(s) to {args.out_path}')


if __name__ == '__main__':
  main()


