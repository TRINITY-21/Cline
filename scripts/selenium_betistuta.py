#!/usr/bin/env python3
"""
Use Selenium to scrape https://www.betistuta.net/Futbol.aspx for the MSBS column
and match to data/unified_matches.json. Writes data/predictions.json

Usage:
  python3 scripts/selenium_betistuta.py --in data/unified_matches.json --out data/predictions.json [--headed]
"""

import argparse
import json
import re
import tempfile

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By


URL = 'https://www.betistuta.net/Futbol.aspx'


def normalize(s: str) -> str:
  return (s or '').strip()


def norm_team_name(name: str) -> str:
  n = normalize(name).lower()
  n = re.sub(r"\(w\)$", '', n).strip()
  n = re.sub(r"[^a-z0-9]+", ' ', n)
  n = re.sub(r"\s+", ' ', n).strip()
  return n


def main():
  ap = argparse.ArgumentParser()
  ap.add_argument('--in', dest='in_path', default='data/unified_matches.json')
  ap.add_argument('--out', dest='out_path', default='data/predictions.json')
  ap.add_argument('--headed', action='store_true')
  args = ap.parse_args()

  with open(args.in_path, 'r', encoding='utf-8') as f:
    unified = json.load(f)

  unified_map = {}
  for m in unified:
    h = norm_team_name(m.get('home', {}).get('name', ''))
    a = norm_team_name(m.get('away', {}).get('name', ''))
    unified_map[f"{h}|{a}"] = m

  opts = Options()
  if not args.headed:
    opts.add_argument('--headless=new')
  opts.add_argument('--no-sandbox')
  opts.add_argument('--disable-gpu')
  opts.add_argument('--disable-dev-shm-usage')
  opts.add_argument('--window-size=1200,1600')
  try:
    tmp_profile = tempfile.mkdtemp(prefix='cline-selenium-chrome-')
    opts.add_argument(f'--user-data-dir={tmp_profile}')
  except Exception:
    pass

  driver = webdriver.Chrome(options=opts)
  predictions = []
  try:
    driver.get(URL)
    # pick the first table that contains MSBS string anywhere
    tables = driver.find_elements(By.TAG_NAME, 'table')
    target = None
    for t in tables:
      txt = t.text.lower()
      if 'msbs' in txt:
        target = t
        break
    if not target:
      with open(args.out_path, 'w', encoding='utf-8') as f:
        json.dump([], f, ensure_ascii=False, indent=2)
      return
    rows = target.find_elements(By.TAG_NAME, 'tr')
    # derive header indices
    headers = []
    for th in target.find_elements(By.TAG_NAME, 'th'):
      headers.append(th.text.strip())
    def idx_of(keyword: str):
      for i, h in enumerate(headers):
        if keyword.lower() in (h or '').lower():
          return i
      return None
    col_teams = idx_of('Karşılaşma') or idx_of('Maç') or 0
    col_msbs = idx_of('MSBS')
    for tr in rows:
      tds = tr.find_elements(By.TAG_NAME, 'td')
      if len(tds) == 0:
        continue
      if len(tds) <= max(col_teams, col_msbs or 0):
        continue
      teams_text = tds[col_teams].text.strip()
      if not teams_text:
        continue
      parts = None
      for sep in [' - ', ' – ', ' — ', ' vs ', ' v ']:
        if sep in teams_text:
          a, b = teams_text.split(sep, 1)
          parts = (a.strip(), b.strip())
          break
      if not parts:
        m = re.search(r"(.+?)\s+(?:–|—|-|vs|v)\s+(.+)", teams_text, re.IGNORECASE)
        if m:
          parts = (m.group(1).strip(), m.group(2).strip())
      if not parts:
        continue
      home, away = parts
      msbs_val = tds[col_msbs].text.strip() if col_msbs is not None else ''
      h = norm_team_name(home)
      a = norm_team_name(away)
      match = unified_map.get(f"{h}|{a}") or unified_map.get(f"{a}|{h}")
      if not match:
        continue
      predictions.append({
        'id': match.get('id'),
        'sport': match.get('sport'),
        'league': match.get('league', {}).get('name') if match.get('league') else None,
        'home': match.get('home', {}).get('name'),
        'away': match.get('away', {}).get('name'),
        'timeLabel': match.get('timeLabel'),
        'msbs': msbs_val,
      })
  finally:
    driver.quit()

  with open(args.out_path, 'w', encoding='utf-8') as f:
    json.dump(predictions, f, ensure_ascii=False, indent=2)
  print(f'Wrote {len(predictions)} predictions to {args.out_path}')


if __name__ == '__main__':
  main()



