#!/usr/bin/env python3
"""
Selenium scraper for https://rojadirectahd.com/

Scrapes matches from the main page and extracts embed URLs from the submenu.

Usage:
  python3 scripts/selenium_rojadirecta.py --out data/unified_matches.json
"""

import argparse
import json
import re
import time
from typing import List, Dict, Any, Optional, Tuple
import tempfile
import os
from urllib.parse import urljoin
import requests
from bs4 import BeautifulSoup

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By


SITE_URL = "https://rojadirectahd.com/"

HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  "Accept-Encoding": "gzip, deflate",
  "Referer": "https://rojadirectahd.com/",
}


def normalize(s: str) -> str:
  return (s or '').strip()


def normalize_id_part(s: str) -> str:
  t = normalize(s).lower()
  t = re.sub(r"[^a-z0-9]+", "-", t)
  t = re.sub(r"^-+|-+$", "", t)
  return t[:40]


def parse_match_text(match_text: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
  """
  Parse match text in format "League: Home vs Away" or "Home vs Away"
  Returns: (league, home, away)
  """
  match_text = normalize(match_text)
  if not match_text:
    return None, None, None
  
  # Try to match "League: Home vs Away" format
  match = re.match(r"^(.+?):\s*(.+?)\s+vs\.?\s+(.+)$", match_text, re.IGNORECASE)
  if match:
    league = normalize(match.group(1))
    home = normalize(match.group(2))
    away = normalize(match.group(3))
    return league, home, away
  
  # Try "Home vs Away" format (no league)
  match = re.match(r"^(.+?)\s+vs\.?\s+(.+)$", match_text, re.IGNORECASE)
  if match:
    home = normalize(match.group(1))
    away = normalize(match.group(2))
    return None, home, away
  
  return None, None, None


def extract_embed_urls(submenu_element) -> List[str]:
  """Extract all embed URLs from a submenu"""
  embed_urls = []
  try:
    links = submenu_element.find_elements(By.CSS_SELECTOR, 'a.submenu-item[href]')
    for link in links:
      href = link.get_attribute('href')
      if href and ('/embed/eventos' in href):
        # Make it a full URL if it's relative
        if href.startswith('/'):
          href = f"https://rojadirectahd.com{href}"
        embed_urls.append(href)
  except Exception as e:
    print(f"Error extracting embed URLs: {e}")
  
  return embed_urls


def extract_video_iframe_from_embed(driver, embed_url: str, original_url: str) -> str:
  """
  Extract the actual video iframe source from a rojadirectahd embed page using Selenium.
  This ensures we get dynamically loaded iframes.
  Returns to original_url after extraction.
  """
  if not embed_url:
    return ''
  
  try:
    # Navigate to the embed page
    driver.get(embed_url)
    time.sleep(3)  # Wait for page and dynamic content to load
    
    # Remove popups/overlays
    try:
      driver.execute_script(r'''
        (function(){
          const kill = (sel)=>{ document.querySelectorAll(sel).forEach(el=>el.remove()); };
          kill('[id*="banner"], [class*="banner"], [class*="ad-"], .adsbygoogle, [class*="popup"], [class*="overlay"]');
          const btn = Array.from(document.querySelectorAll('button, .btn')).find(b=>/ok|accept|close|cerrar/i.test(b.textContent||''));
          if (btn) btn.click();
        })();
      ''')
      time.sleep(1)
    except Exception:
      pass
    
    # First, try to find the main video iframe by ID (embedIframe) or structure (subiframe > preframe > iframe)
    try:
      # Try by ID first (as shown in the sample HTML)
      iframe = driver.find_element(By.CSS_SELECTOR, 'iframe#embedIframe')
      src = iframe.get_attribute('src') or ''
      if src and src != 'about:blank' and not src.startswith('data:'):
        # Make absolute if relative
        if not src.startswith('http'):
          src = urljoin(embed_url, src)
        # Skip ads
        low = src.lower()
        if not any(p in low for p in ['ads', 'banner', 'popup', 'advertisement', 'google', 'doubleclick', 'adservice']):
          print(f"  Extracted iframe src: {src}")
          # Navigate back before returning
          driver.get(original_url)
          time.sleep(2)  # Wait for page to load
          return src
    except Exception:
      pass
    
    # Try the structure: div.subiframe > div.preframe > iframe
    try:
      iframe = driver.find_element(By.CSS_SELECTOR, 'div.subiframe div.preframe iframe[src]')
      src = iframe.get_attribute('src') or ''
      if src and src != 'about:blank' and not src.startswith('data:'):
        # Make absolute if relative
        if not src.startswith('http'):
          src = urljoin(embed_url, src)
        # Skip ads
        low = src.lower()
        if not any(p in low for p in ['ads', 'banner', 'popup', 'advertisement', 'google', 'doubleclick', 'adservice']):
          print(f"  Extracted iframe src: {src}")
          # Navigate back before returning
          driver.get(original_url)
          time.sleep(2)  # Wait for page to load
          return src
    except Exception:
      pass
    
    # Fallback: Try to find iframes on the page
    iframes = driver.find_elements(By.CSS_SELECTOR, 'iframe[src]')
    
    # Filter and score iframes
    candidates = []
    for ifr in iframes:
      try:
        src = ifr.get_attribute('src') or ''
        if not src or src == 'about:blank' or src.startswith('data:'):
          continue
        
        # Make absolute if relative
        if not src.startswith('http'):
          src = urljoin(embed_url, src)
        
        # Skip obvious ads
        low = src.lower()
        if any(p in low for p in ['ads', 'banner', 'popup', 'advertisement', 'google', 'doubleclick', 'adservice']):
          continue
        
        # Skip rojadirectahd wrapper pages
        if 'rojadirectahd.com' in low:
          # This might be a wrapper, try to get nested iframe
          try:
            driver.switch_to.frame(ifr)
            time.sleep(1)
            nested_iframes = driver.find_elements(By.CSS_SELECTOR, 'iframe[src]')
            for nested in nested_iframes:
              nested_src = nested.get_attribute('src') or ''
              if nested_src and nested_src != 'about:blank' and 'rojadirectahd' not in nested_src.lower():
                if not nested_src.startswith('http'):
                  nested_src = urljoin(src, nested_src)
                candidates.append((10, nested_src))  # Higher priority
            driver.switch_to.default_content()
          except Exception:
            driver.switch_to.default_content()
          continue
        
        # Score based on URL patterns
        score = 5  # Base score
        if any(p in low for p in ['player', 'embed', 'stream', 'live', 'video']):
          score += 10
        if any(p in low for p in ['la14hd', 'dovkembed', 'voodc', 'flixx', 'antenasport']):
          score += 15
        if src.startswith('https://'):
          score += 2
        
        candidates.append((score, src))
      except Exception:
        continue
    
    # Also check for iframes in JavaScript
    try:
      script_iframes = driver.execute_script(r'''
        (function(){
          const scripts = Array.from(document.scripts);
          const urls = [];
          for (const script of scripts) {
            const content = script.textContent || '';
            // Look for iframe src patterns
            const patterns = [
              /iframe.*?src\s*[=:]\s*["']([^"']+)["']/gi,
              /src\s*[=:]\s*["']([^"']*(?:player|embed|stream|video)[^"']*)["']/gi,
              /url\s*[=:]\s*["']([^"']+)["']/gi
            ];
            for (const pattern of patterns) {
              let match;
              while ((match = pattern.exec(content)) !== null) {
                if (match[1] && match[1].startsWith('http')) {
                  urls.push(match[1]);
                }
              }
            }
          }
          return urls;
        })();
      ''')
      
      for js_url in (script_iframes or []):
        if 'rojadirectahd' not in js_url.lower() and 'ads' not in js_url.lower():
          candidates.append((8, js_url))
    except Exception:
      pass
    
    # Sort by score and return the best candidate
    if candidates:
      candidates.sort(key=lambda x: x[0], reverse=True)
      best_url = candidates[0][1]
      print(f"  Extracted iframe src: {best_url}")
      # Navigate back before returning
      driver.get(original_url)
      time.sleep(2)  # Wait for page to load
      return best_url
    
    # Fallback: if no good iframe found, return empty (don't use rojadirectahd wrapper)
    print(f"  Could not find valid video iframe in {embed_url}")
    # Navigate back before returning
    driver.get(original_url)
    time.sleep(2)  # Wait for page to load
    return ''
    
  except Exception as e:
    print(f"Error extracting video iframe from {embed_url}: {e}")
    import traceback
    traceback.print_exc()
    # Try to navigate back even on error
    try:
      driver.get(original_url)
      time.sleep(2)
    except Exception:
      pass
    return ''


def scrape_matches(driver) -> List[Dict[str, Any]]:
  """Scrape matches from rojadirectahd.com"""
  matches = []
  
  try:
    # Navigate to the site
    driver.get(SITE_URL)
    time.sleep(3)  # Wait for dynamic content to load
    
    # Remove common overlays/popups
    try:
      driver.execute_script(r'''
        (function(){
          const kill = (sel)=>{ document.querySelectorAll(sel).forEach(el=>el.remove()); };
          kill('[id*="banner"], [class*="banner"], [class*="ad-"], .adsbygoogle');
          // auto-click common consent/ok dialogs
          const btn = Array.from(document.querySelectorAll('button, .btn, [role="button"]')).find(b=>/ok|accept|close/i.test(b.textContent||''));
          if (btn) btn.click();
        })();
      ''')
    except Exception:
      pass
    
    # Expand all submenus using JavaScript to make them accessible
    try:
      driver.execute_script(r'''
        (function(){
          // Expand all submenus by setting display: block
          document.querySelectorAll('li.toggle-submenu ul').forEach(ul => {
            ul.style.display = 'block';
          });
        })();
      ''')
      time.sleep(0.5)  # Wait for submenus to expand
    except Exception:
      pass
    
    # Find all match items (li.toggle-submenu)
    match_items = driver.find_elements(By.CSS_SELECTOR, 'li.toggle-submenu')
    print(f"Found {len(match_items)} match items")
    
    # First pass: Extract all match data (without navigating away)
    match_data = []
    for item in match_items:
      try:
        # Extract time - prefer text content over datetime attribute
        time_str = ''
        try:
          time_element = item.find_element(By.CSS_SELECTOR, 'time')
          time_str = normalize(time_element.text)
          # If time text is empty, try datetime attribute and extract HH:MM
          if not time_str:
            datetime_attr = time_element.get_attribute('datetime')
            if datetime_attr:
              # Extract HH:MM from datetime (format might be "12:00:00")
              match = re.match(r'(\d{1,2}):(\d{2})', datetime_attr)
              if match:
                time_str = f"{match.group(1).zfill(2)}:{match.group(2)}"
        except Exception:
          pass
        
        if not time_str:
          print("Warning: Could not extract time for match")
        
        # Extract match text (League: Home vs Away)
        # The span containing the match info is within the div with flex display
        try:
          span_element = item.find_element(By.CSS_SELECTOR, 'span[style*="flex"]')
        except Exception:
          # Fallback to any span
          span_element = item.find_element(By.CSS_SELECTOR, 'span')
        match_text = normalize(span_element.text)
        
        # Parse league and teams
        league, home, away = parse_match_text(match_text)
        
        if not home or not away:
          print(f"Skipping match - could not parse: {match_text}")
          continue
        
        # Extract embed URLs from submenu
        embed_urls = []
        try:
          ul_element = item.find_element(By.CSS_SELECTOR, 'ul')
          embed_urls = extract_embed_urls(ul_element)
        except Exception as e:
          print(f"Could not extract embed URLs: {e}")
        
        # Determine sport from league name or match text
        sport = 'Football'  # default
        if league:
          league_lower = league.lower()
          if 'nhl' in league_lower or 'hockey' in league_lower:
            sport = 'Hockey'
          elif 'nfl' in league_lower or 'football' in league_lower and 'american' in league_lower:
            sport = 'American Football'
          elif 'box' in league_lower or 'boxing' in league_lower:
            sport = 'Boxing'
          elif 'nba' in league_lower or 'basketball' in league_lower:
            sport = 'Basketball'
        
        match_data.append({
          'timeLabel': time_str,
          'home': home,
          'away': away,
          'league': league or '',
          'sport': sport,
          'embed_urls': embed_urls,
        })
        
        print(f"Extracted: {time_str} - {league or 'N/A'}: {home} vs {away} ({len(embed_urls)} embed URLs)")
        
      except Exception as e:
        print(f"Error processing match item: {e}")
        import traceback
        traceback.print_exc()
        continue
    
    # Second pass: Extract video iframe sources from embed URLs
    for match_info in match_data:
      video_src = ''
      if match_info['embed_urls']:
        print(f"  Extracting video iframe from embed URL: {match_info['embed_urls'][0]}")
        video_src = extract_video_iframe_from_embed(driver, match_info['embed_urls'][0], SITE_URL)
        if video_src:
          print(f"  Found video iframe: {video_src}")
        else:
          print(f"  Could not extract video iframe, using embed URL as fallback")
          video_src = match_info['embed_urls'][0]  # Fallback to embed URL if extraction fails
      
      matches.append({
        'timeLabel': match_info['timeLabel'],
        'home': match_info['home'],
        'away': match_info['away'],
        'league': match_info['league'],
        'sport': match_info['sport'],
        'videoSrc': video_src,
      })
    
  except Exception as e:
    print(f"Error scraping matches: {e}")
    import traceback
    traceback.print_exc()
  
  return matches


def to_unified(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
  """Convert scraped items to unified format"""
  out: List[Dict[str, Any]] = []
  for e in items:
    match_id = '-'.join(filter(None, [
      normalize_id_part(e['home']), 'vs', normalize_id_part(e['away']), normalize_id_part(e.get('timeLabel', ''))
    ]))
    out.append({
      'id': match_id or str(int(time.time()*1000)),
      'sport': e.get('sport', 'Football'),
      'league': {'name': e['league']} if e.get('league') else None,
      'home': {'name': e['home']},
      'away': {'name': e['away']},
      'status': 'upcoming' if e.get('timeLabel') else 'live',
      'timeLabel': e.get('timeLabel'),
      'startTime': None,
      'videoSrc': e.get('videoSrc', ''),
    })
  return out


def main():
  ap = argparse.ArgumentParser()
  ap.add_argument('--out', default='data/unified_matches.json')
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
    # Scrape matches
    items = scrape_matches(driver)
    
    # Convert to unified format
    data = to_unified(items)
    
    # Report on video sources found
    video_count = sum(1 for d in data if d.get('videoSrc'))
    print(f"Found video sources for {video_count} out of {len(data)} matches")
    
    with open(args.out, 'w', encoding='utf-8') as f:
      json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Wrote {len(data)} matches to {args.out}")

    # videoSrc is now stored directly in matches via daily_matches collection
    # No need to post to separate videosrc API - it will be handled by compare-and-update endpoint
  finally:
    driver.quit()


if __name__ == '__main__':
  main()

