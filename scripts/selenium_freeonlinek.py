#!/usr/bin/env python3
"""
Selenium scraper for https://freeonlinek.top/football/

By default parses ONLY the top-level page (no iframe).
Pass --allow-iframe to also parse inside the embedded schedule iframe.

Usage:
  python3 scripts/selenium_freeonlinek.py --out data/unified_matches.json [--allow-iframe]
"""

import argparse
import json
import re
import time
from typing import List, Dict, Any, Optional
import tempfile
import os
import requests
from bs4 import BeautifulSoup

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities


SITE_URL = "https://livesports808.sbs/"

# Common ad hosts/patterns seen on the page; blocked at network level via CDP
AD_URL_PATTERNS = [
  '*wrangleclaspinteract.com*',
  '*kettledroopingcontinuation.com*',
  '*preferencenail.com*',
  '*skinnycrawlinglax.com*',
  '*torchfriendlypay.com*',
  '*adzilla*',
]


def normalize(s: str) -> str:
  return (s or '').strip()


def normalize_id_part(s: str) -> str:
  t = normalize(s).lower()
  t = re.sub(r"[^a-z0-9]+", "-", t)
  t = re.sub(r"^-+|-+$", "", t)
  return t[:40]


def clean_team_name(name: str) -> str:
  """Remove 'Football' prefix if it appears at the start of team names"""
  name = normalize(name)
  # Remove "Football " prefix if it exists (case-insensitive)
  if name.lower().startswith('football '):
    name = name[9:].strip()
  return name


def extract_matches_from_container(container_text: str, video_sources: Dict[str, str] = None) -> List[Dict[str, str]]:
  lines = [normalize(x) for x in container_text.splitlines() if normalize(x)]
  items: List[Dict[str, str]] = []
  # Heuristic: look for lines containing a team separator and a time line nearby
  for i, line in enumerate(lines):
    parts = None
    for sep in [" – ", " — ", " vs ", " v ", " - "]:
      if sep in line and len(line) <= 140:
        parts = [normalize(p) for p in line.split(sep, 1)]
        break
    if not parts:
      m = re.search(r"(.+?)\s+(?:–|—|vs|v|-)\s+(.+)", line, re.IGNORECASE)
      if m:
        parts = [normalize(m.group(1)), normalize(m.group(2))]
    if not parts or len(parts) != 2:
      continue
    
    # Clean team names
    home = clean_team_name(parts[0])
    away = clean_team_name(parts[1])
    
    # find a time near this line (within preceding 2 lines)
    time_label = ''
    for j in range(max(0, i-2), i+1):
      m = re.search(r"\b\d{1,2}:\d{2}\b", lines[j])
      if m:
        time_label = m.group(0)
        break
    
    # Try to find video source for this match
    video_src = ''
    if video_sources:
      # Try to match by team names
      match_key = f"{home.lower()}_{away.lower()}"
      video_src = video_sources.get(match_key, '')
    
    items.append({
      'timeLabel': time_label,
      'home': home,
      'away': away,
      'league': '',
      'sport': 'Football',
      'videoSrc': video_src,
    })
  # dedup
  ded = {}
  for it in items:
    key = (it['timeLabel'], it['home'], it['away'])
    ded[str(key)] = it
  return list(ded.values())


def parse_teams(text: str) -> Optional[List[str]]:
  text = normalize(text)
  parts = None
  for sep in [" – ", " — ", " vs ", " v ", " - "]:
    if sep in text and len(text) <= 140:
      parts = [normalize(p) for p in text.split(sep, 1)]
      break
  if not parts:
    m = re.search(r"(.+?)\s+(?:–|—|vs|v|-)\s+(.+)", text, re.IGNORECASE)
    if m:
      parts = [normalize(m.group(1)), normalize(m.group(2))]
  if not parts or len(parts) != 2:
    return None
  # Clean team names
  return [clean_team_name(parts[0]), clean_team_name(parts[1])]


def extract_video_sources(driver) -> Dict[str, str]:
  """Extract video sources from iframes and links"""
  video_sources = {}
  
  def resolve_nested_iframe_url(url: str, depth: int = 0, max_depth: int = 2) -> str:
    if not url or depth >= max_depth:
      return url
    try:
      r = requests.get(url, headers={
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      }, timeout=20, verify=False)
      r.raise_for_status()
    except Exception:
      return url
    doc = BeautifulSoup(r.text, 'html.parser')
    # If there's an explicit player block, use it first
    pb = doc.select_one('#playerblock iframe[src]')
    if pb:
      s0 = (pb.get('src') or '').strip()
      if s0 and not s0.startswith('http'):
        s0 = requests.compat.urljoin(url, s0)
      if s0:
        return resolve_nested_iframe_url(s0, depth + 1, max_depth)
    for ifr in doc.select('iframe[src]'):
      s = (ifr.get('src') or '').strip()
      if not s:
        continue
      if not s.startswith('http'):
        s = requests.compat.urljoin(url, s)
      low = s.lower()
      if any(p in low for p in ['livetv.sx/export', 'menu', 'ads', 'banner']):
        continue
      return resolve_nested_iframe_url(s, depth + 1, max_depth)
    return url
  
  try:
    # Find all iframes with potential video sources
    iframes = driver.find_elements(By.TAG_NAME, 'iframe')
    for iframe in iframes:
      src = iframe.get_attribute('src')
      if src and not any(ad in src.lower() for ad in ['wrangleclaspinteract', 'kettledrooping', 'preferencenail', 'skinnycrawling', 'torchfriendly', 'adzilla']):
        # Resolve nested webplayer → actual iframe if possible
        try:
          src = resolve_nested_iframe_url(src)
        except Exception:
          pass
        # Skip wrapper players that start with https://live...
        if (src or '').lower().startswith('https://live') or (src or '').lower().startswith('https://cdn.livetv'):
          continue
        # Try to extract team info from nearby text or attributes
        try:
          parent = iframe.find_element(By.XPATH, '..')
          parent_text = parent.text
          parsed = parse_teams(parent_text)
          if parsed:
            home, away = parsed
            match_key = f"{home.lower()}_{away.lower()}"
            video_sources[match_key] = src
        except:
          pass
    
    # Also look for links with video URLs
    links = driver.find_elements(By.CSS_SELECTOR, 'a[href*="video"], a[href*="stream"], a[href*="live"]')
    for link in links:
      href = link.get_attribute('href')
      text = link.text
      if href and text:
        try:
          href = resolve_nested_iframe_url(href)
        except Exception:
          pass
        # Skip wrapper players that start with https://live...
        if (href or '').lower().startswith('https://live') or (href or '').lower().startswith('https://cdn.livetv'):
          continue
        parsed = parse_teams(text)
        if parsed:
          home, away = parsed
          match_key = f"{home.lower()}_{away.lower()}"
          video_sources[match_key] = href
  except Exception as e:
    print(f"Error extracting video sources: {e}")
  
  return video_sources


def to_unified(items: List[Dict[str, str]]) -> List[Dict[str, Any]]:
  out: List[Dict[str, Any]] = []
  for e in items:
    match_id = '-'.join(filter(None, [
      normalize_id_part(e['home']), 'vs', normalize_id_part(e['away']), normalize_id_part(e.get('timeLabel', ''))
    ]))
    out.append({
      'id': match_id or str(int(time.time()*1000)),
      'sport': 'Football',
      'league': {'name': e['league']} if e.get('league') else None,
      'home': {'name': e['home']},
      'away': {'name': e['away']},
      'status': 'upcoming' if e.get('timeLabel') else 'live',
      'timeLabel': e.get('timeLabel'),
      'startTime': None,
      'videoSrc': e.get('videoSrc', ''),
    })
  return out


def scrape_with_retries(driver, args, max_retries=3):
  """Scrape the site with retry logic if no video sources are found"""
  
  for attempt in range(max_retries):
    print(f"Scraping attempt {attempt + 1} of {max_retries}...")
    
    # Navigate to the site
    driver.get(SITE_URL)
    time.sleep(2)  # Give more time for dynamic content to load
    
    # Remove common ad overlays/popups and banners in DOM
    try:
      driver.execute_script(r'''
        (function(){
          const kill = (sel)=>{ document.querySelectorAll(sel).forEach(el=>el.remove()); };
          // obvious overlays and banners
          kill('#b63d9x9, .banner_wrapper, .banner-sidebar, [id*="banner"], [class*="banner"], [class*="ad-"], .adsbygoogle');
          // generic iframes pointing to ad networks
          document.querySelectorAll('iframe').forEach(ifr=>{
            const s=(ifr.getAttribute('src')||'').toLowerCase();
            if (/(wrangleclaspinteract|kettledroopingcontinuation|preferencenail|skinnycrawlinglax|torchfriendlypay|adzilla)/.test(s)) {
              ifr.remove();
            }
          });
          // auto-click common consent/ok dialogs
          const btn = Array.from(document.querySelectorAll('button, .btn, [role="button"]')).find(b=>/ok|accept|close/i.test(b.textContent||''));
          if (btn) btn.click();
        })();
      ''')
    except Exception:
      pass
    
    # Extract video sources first
    video_sources = extract_video_sources(driver)
    print(f"Found {len(video_sources)} video sources")
    
    # Parse top-level DOM
    body_text = driver.find_element(By.TAG_NAME, 'body').text
    items = extract_matches_from_container(body_text, video_sources)
    
    # Optionally, parse inside iframe for structured table with league info
    if args.allow_iframe:
      iframes = driver.find_elements(By.TAG_NAME, 'iframe')
      for f in iframes:
        try:
          driver.switch_to.frame(f)
          time.sleep(0.5)
          
          # Extract video sources from within iframe
          iframe_video_sources = extract_video_sources(driver)
          video_sources.update(iframe_video_sources)
          
          # Prefer structured table parsing to capture league
          rows = driver.find_elements(By.CSS_SELECTOR, 'tr')
          for tr in rows:
            tds = tr.find_elements(By.CSS_SELECTOR, 'td')
            if len(tds) < 2:
              continue
            time_label = normalize(tds[0].text)
            # league and sport often live in the 2nd cell
            league_name = ''
            sport_name = ''
            try:
              league_el = tds[1].find_element(By.CSS_SELECTOR, 'span.cmp')
              league_name = normalize(league_el.text)
            except Exception:
              pass
            try:
              sport_el = tds[1].find_element(By.CSS_SELECTOR, 'span.spr')
              sport_name = normalize(sport_el.text)
            except Exception:
              pass
            # teams usually in the following cell with an anchor
            teams_text = ''
            anchor = None
            video_src = ''
            if len(tds) >= 3:
              try:
                anchor = tds[2].find_element(By.CSS_SELECTOR, 'a[href]')
                teams_text = normalize(anchor.text)
                # Get video URL from anchor if it exists
                href = anchor.get_attribute('href')
                if href and ('video' in href.lower() or 'stream' in href.lower() or 'live' in href.lower()):
                  # Resolve to the actual player iframe for row-specific link
                  try:
                    resolved = resolve_nested_iframe_url(href)
                    low = (resolved or '').lower()
                    if low and not (low.startswith('https://live') or low.startswith('https://cdn.livetv')):
                      video_src = resolved
                  except Exception:
                    pass
              except Exception:
                pass
            if not teams_text:
              # fallback: any anchor in row
              try:
                anchor = tr.find_element(By.CSS_SELECTOR, 'a[href]')
                teams_text = normalize(anchor.text)
                href = anchor.get_attribute('href')
                if href and ('video' in href.lower() or 'stream' in href.lower() or 'live' in href.lower()):
                  try:
                    resolved = resolve_nested_iframe_url(href)
                    low = (resolved or '').lower()
                    if low and not (low.startswith('https://live') or low.startswith('https://cdn.livetv')):
                      video_src = resolved
                  except Exception:
                    pass
              except Exception:
                pass
            parsed = parse_teams(teams_text)
            if not parsed:
              continue
            home, away = parsed
            
            # Try to find video source if not already found (avoid cross-row mapping when we already have row link)
            if not video_src:
              match_key = f"{home.lower()}_{away.lower()}"
              video_src = video_sources.get(match_key, '')
            
            items.append({
              'timeLabel': time_label,
              'home': home,
              'away': away,
              'league': league_name,
              'sport': sport_name or 'Football',
              'videoSrc': video_src,
            })
          # if structure parsing yielded none, fallback to text heuristic
          if not items:
            iframe_text = driver.find_element(By.TAG_NAME, 'body').text
            items.extend(extract_matches_from_container(iframe_text, video_sources))
          driver.switch_to.default_content()
        except Exception as e:
          print(f"Error processing iframe: {e}")
          driver.switch_to.default_content()
    
    # Check if we found any video sources
    has_video = any(item.get('videoSrc') for item in items)
    
    if has_video:
      print(f"Successfully found video sources on attempt {attempt + 1}")
      return items
    elif attempt < max_retries - 1:
      print(f"No video sources found on attempt {attempt + 1}, retrying...")
      time.sleep(2)  # Wait before retry
    else:
      print(f"No video sources found after {max_retries} attempts")
      return items
  
  return items


def main():
  ap = argparse.ArgumentParser()
  ap.add_argument('--out', default='data/unified_matches.json')
  ap.add_argument('--allow-iframe', action='store_true')
  ap.add_argument('--headed', action='store_true', help='Show browser window (disable headless)')
  args = ap.parse_args()

  opts = Options()
  if not args.headed:
    opts.add_argument('--headless=new')
  opts.add_argument('--no-sandbox')
  opts.add_argument('--disable-gpu')
  opts.add_argument('--disable-dev-shm-usage')
  opts.add_argument('--window-size=1200,2000')
  # Use an isolated Chrome profile to avoid conflicts in shared environments
  try:
    tmp_profile = tempfile.mkdtemp(prefix='cline-selenium-chrome-')
    opts.add_argument(f'--user-data-dir={tmp_profile}')
  except Exception:
    pass
  driver = webdriver.Chrome(options=opts)
  try:
    # Block known ad networks at the protocol level
    try:
      driver.execute_cdp_cmd('Network.enable', {})
      driver.execute_cdp_cmd('Network.setBlockedURLs', { 'urls': AD_URL_PATTERNS })
    except Exception:
      pass
    
    # Scrape with retry logic
    items = scrape_with_retries(driver, args, max_retries=3)
    
    # Convert to unified format
    data = to_unified(items)
    
    # Report on video sources found
    video_count = sum(1 for d in data if d.get('videoSrc'))
    print(f"Found video sources for {video_count} out of {len(data)} matches")
    
    with open(args.out, 'w', encoding='utf-8') as f:
      json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Wrote {len(data)} matches to {args.out}")

    # Post discovered videoSrc values to Next API for storage (idempotent upsert)
    API_BASE = os.getenv('API_BASE', 'http://localhost:3000')
    TOKEN = os.getenv('NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN', '')
    ttl_ms = 60 * 60 * 1000
    if TOKEN:
      posted = 0
      for m in data:
        try:
          vid = (m.get('videoSrc') or '').strip()
          if not vid:
            continue
          mid = m.get('id')
          if not mid:
            continue
          r = requests.post(
            f"{API_BASE}/api/videosrc/{mid}",
            headers={
              'x-internal-token': TOKEN,
              'content-type': 'application/json',
            },
            json={
              'videoSrc': vid,
              'source': 'freeonlinek',
              'status': 'ready',
              'ttlMs': ttl_ms,
            },
            timeout=20,
          )
          r.raise_for_status()
          posted += 1
        except Exception as e:
          print(f"POST failed for {m.get('id')}: {e}")
      print(f"Posted videoSrc for {posted} matches to API_BASE={API_BASE}")
    else:
      print("NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN not set; skipping videoSrc POST to API")
  finally:
    driver.quit()


if __name__ == '__main__':
  main()