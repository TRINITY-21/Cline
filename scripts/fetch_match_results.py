#!/usr/bin/env python3
"""
Fetch actual match results from betistuta.net and update predictions.
Scrapes results from previous days to update prediction status.

Usage:
  python3 scripts/fetch_match_results.py --out data/match_results.json
"""

import argparse
import json
import re
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import requests
from bs4 import BeautifulSoup

HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
}


def get_betistuta_results_url(days_ago: int = 0) -> str:
  """
  Get betistuta URL for results (previous days).
  Format: https://www.betistuta.net/Futbol.aspx?D=M/D/YYYY
  Date is calculated using server's local time.
  """
  now = datetime.now()
  # Subtract days_ago using server's local time
  target_date = now - timedelta(days=days_ago)
  month = str(target_date.month)
  day = str(target_date.day)
  year = str(target_date.year)
  date_str = f'{month}/{day}/{year}'
  return f'https://www.betistuta.net/Futbol.aspx?D={date_str}'


def normalize(s: Optional[str]) -> str:
  return (s or '').strip()


def norm_team_name(name: str) -> str:
  n = normalize(name)
  n = n.lower()
  # Basic Turkish diacritics → ASCII
  n = (n
       .replace('ş', 's').replace('ç', 'c').replace('ğ', 'g')
       .replace('ü', 'u').replace('ö', 'o').replace('ı', 'i')
       .replace('İ', 'i'))
  n = re.sub(r"\(w\)$", '', n).strip()
  n = re.sub(r"[^a-z0-9]+", ' ', n)
  n = re.sub(r"\s+", ' ', n).strip()
  return n


def parse_results(doc: BeautifulSoup) -> List[Dict[str, Any]]:
  """Parse match results from betistuta HTML."""
  target_table = doc.select_one('table#ctl00_MainContentFull_MainContent_MainGrid')
  
  if not target_table:
    for tbl in doc.select('table'):
      headers = [normalize(th.get_text(' ')) for th in tbl.select('th')]
      if any('msbs' in h.lower() for h in headers):
        target_table = tbl
        break
  
  if not target_table:
    return []
  
  headers = [normalize(th.get_text(' ')) for th in target_table.select('th')]
  
  def idx_of(keyword: str) -> Optional[int]:
    for i, h in enumerate(headers):
      if keyword.lower() in h.lower():
        return i
    return None
  
  col_home = idx_of('EvSahibi') or 2
  col_away = idx_of('Deplasman') or 4
  col_ms = idx_of('MS') or 3  # MS = Match Score (actual result)
  col_league = idx_of('Lig') or 6
  col_time = idx_of('Saat') or 1  # Time column for matching
  
  results: List[Dict[str, Any]] = []
  rows_processed = 0
  rows_with_results = 0
  
  for tr in target_table.select('tr'):
    tds = tr.find_all('td')
    rows_processed += 1
    required_cells = max(col_ms or 0, col_home, col_away) + 1
    
    if len(tds) < required_cells:
      continue
    
    home = normalize(tds[col_home].get_text(' '))
    away = normalize(tds[col_away].get_text(' '))
    
    if not home or not away:
      continue
    
    # Get actual match score from MS column (this is the real result)
    actual_score = normalize(tds[col_ms].get_text(' ')) if col_ms is not None and col_ms < len(tds) else ''
    league = normalize(tds[col_league].get_text(' ')) if col_league is not None and col_league < len(tds) else ''
    time_label = normalize(tds[col_time].get_text(' ')) if col_time is not None and col_time < len(tds) else ''
    
    # Skip if MS column doesn't have a valid score (e.g., "v" means match hasn't started)
    # Only process if it matches pattern like "2 - 1" or "0 - 0"
    if not actual_score or not re.match(r"^\d+\s*-\s*\d+$", actual_score):
      continue
    
    # Parse score like "2 - 1"
    home_score = None
    away_score = None
    m = re.match(r"^(\d+)\s*-\s*(\d+)$", actual_score)
    if m:
      home_score = int(m.group(1))
      away_score = int(m.group(2))
    else:
      continue  # Skip if score format is invalid
    
    # Determine winner
    winner = None
    if home_score > away_score:
      winner = home
    elif away_score > home_score:
      winner = away
    else:
      winner = 'Draw'
    
    rows_with_results += 1
    results.append({
      'home': home,
      'away': away,
      'league': league,
      'timeLabel': time_label,
      'result': actual_score,
      'homeScore': home_score,
      'awayScore': away_score,
      'winner': winner,
    })
  
  print(f'   Processed {rows_processed} rows, found {rows_with_results} completed matches with results')
  return results


def main():
  ap = argparse.ArgumentParser()
  ap.add_argument('--out', dest='out_path', default='data/match_results.json')
  ap.add_argument('--days', type=int, default=1, help='Days ago to fetch results (default: 1 for yesterday)')
  ap.add_argument('--max-days', type=int, default=3, help='Maximum days to check (default: 3)')
  args = ap.parse_args()
  
  all_results: List[Dict[str, Any]] = []
  
  # Fetch results for today only (days_ago = 0)
  days_ago = args.days  # Should be 0 for today
  url = get_betistuta_results_url(days_ago)
  print(f'📅 Fetching results from today: {url}')
  
  try:
    resp = requests.get(url, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    
    doc = BeautifulSoup(resp.text, 'html.parser')
    results = parse_results(doc)
    
    print(f'   Found {len(results)} result(s)')
    all_results.extend(results)
  except Exception as e:
    print(f'   ⚠️  Failed to fetch results for today: {e}')
  
  print(f'\n📊 Total: Found {len(all_results)} match result(s) for today')
  
  with open(args.out_path, 'w', encoding='utf-8') as f:
    json.dump(all_results, f, ensure_ascii=False, indent=2)
  
  print(f'💾 Wrote {len(all_results)} result(s) to {args.out_path}')


if __name__ == '__main__':
  main()

