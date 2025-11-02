#!/usr/bin/env python3
"""
Scrape betistuta for actual match results (MS column) and update predictions.
Outputs JSON data that can be used to update Firestore predictions.
"""

import requests
from bs4 import BeautifulSoup
import json
import sys
from datetime import datetime
import re

def extract_goals(score_str):
    """Extract home and away goals from score string like '3-1' or '2:2'"""
    if not score_str:
        return None, None
    
    # Match patterns like "3-1", "2:2", "4 - 0"
    match = re.search(r'(\d+)\s*[-:]\s*(\d+)', str(score_str))
    if match:
        return int(match.group(1)), int(match.group(2))
    return None, None

def calculate_over_15_status(actual_score):
    """Calculate if Over 1.5 won (total goals >= 2)
    Note: Predictions are scraped for Over 3.5 (MSBS sum >= 4), 
    but status is determined by Over 1.5 logic (actual score >= 2 goals = won)
    """
    if not actual_score:
        return None
    
    home_goals, away_goals = extract_goals(actual_score)
    if home_goals is None or away_goals is None:
        return None
    
    total_goals = home_goals + away_goals
    # Over 1.5 means more than 1.5 goals, so 2 or more = won
    return 'won' if total_goals >= 2 else 'failed'

def scrape_results():
    """
    Scrape betistuta website for actual match results.
    Returns list of result objects with home, away, actual score, and status.
    """
    results = []
    
    try:
        url = "https://www.betistuta.net/Futbol.aspx"
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        tables = soup.find_all('table')
        
        # Column indices
        COL_KOD = 99
        COL_SAAT = 100
        COL_HOME = 101  # EvSahibi
        COL_MS = 102    # Actual score
        COL_AWAY = 103  # Deplasman
        COL_LIG = 105   # League
        COL_MSBS = 106  # Predicted score
        
        for table in tables:
            rows = table.find_all('tr')
            
            # Find header row
            header_found = False
            for row in rows[:5]:
                cells = row.find_all(['th', 'td'])
                cell_texts = [cell.get_text(strip=True) for cell in cells]
                
                if 'MSBS' in cell_texts or 'MS' in cell_texts:
                    header_found = True
                    try:
                        COL_KOD = cell_texts.index('Kod') if 'Kod' in cell_texts else 99
                        COL_SAAT = cell_texts.index('Saat') if 'Saat' in cell_texts else 100
                        COL_HOME = cell_texts.index('EvSahibi') if 'EvSahibi' in cell_texts else 101
                        COL_MS = cell_texts.index('MS') if 'MS' in cell_texts else 102
                        COL_AWAY = cell_texts.index('Deplasman') if 'Deplasman' in cell_texts else 103
                        COL_LIG = cell_texts.index('Lig') if 'Lig' in cell_texts else 105
                        COL_MSBS = cell_texts.index('MSBS') if 'MSBS' in cell_texts else 106
                    except:
                        pass
                    break
            
            if not header_found:
                continue
            
            # Process data rows
            for row in rows[1:]:
                try:
                    cells = row.find_all(['td', 'th'])
                    
                    if len(cells) < max(COL_HOME, COL_AWAY, COL_MS, COL_MSBS) + 1:
                        continue
                    
                    home_team = cells[COL_HOME].get_text(strip=True) if COL_HOME < len(cells) else ""
                    away_team = cells[COL_AWAY].get_text(strip=True) if COL_AWAY < len(cells) else ""
                    ms = cells[COL_MS].get_text(strip=True) if COL_MS < len(cells) else ""
                    msbs = cells[COL_MSBS].get_text(strip=True) if COL_MSBS < len(cells) else ""
                    saat = cells[COL_SAAT].get_text(strip=True) if COL_SAAT < len(cells) else ""
                    
                    # Skip if missing essential data
                    if not home_team or not away_team:
                        continue
                    
                    # Skip women's games
                    if "(K)" in home_team or "(K)" in away_team:
                        continue
                    
                    # Skip if no actual score (match not played yet)
                    if not ms or ms.lower() in ['v', '']:
                        continue
                    
                    # Only process if MSBS exists and is Over 3.5 (sum >= 4)
                    # We scrape results for Over 3.5 predictions only
                    home_pred, away_pred = extract_goals(msbs)
                    if home_pred is None or away_pred is None:
                        continue
                    
                    if (home_pred + away_pred) < 4:
                        continue  # Not Over 3.5 prediction (skip)
                    
                    # Calculate status based on Over 1.5 logic (actual score >= 2 goals = won)
                    # Note: Predictions are Over 3.5 (scraped when MSBS sum >= 4),
                    # but status is determined by Over 1.5 logic (actual match score >= 2 goals = won)
                    status = calculate_over_15_status(ms)
                    
                    # Format actual score (normalize separators)
                    actual_score = ms.replace(' ', '').replace(':', '-')
                    
                    result = {
                        "home": home_team.strip(),
                        "away": away_team.strip(),
                        "timeLabel": saat.strip() if saat else "00:00",
                        "actualScore": actual_score,
                        "status": status,
                        "msbs": "Over 1.5"
                    }
                    
                    results.append(result)
                    
                except Exception as e:
                    continue
        
        return results
        
    except requests.RequestException as e:
        print(f"Error fetching betistuta: {e}", file=sys.stderr)
        return []
    except Exception as e:
        print(f"Error scraping betistuta: {e}", file=sys.stderr)
        return []

def main():
    """Main function to scrape and output JSON"""
    results = scrape_results()
    
    if not results:
        print("No results found", file=sys.stderr)
        sys.exit(1)
    
    output = {
        "results": results,
        "scrapedAt": datetime.now().isoformat(),
        "count": len(results)
    }
    
    print(json.dumps(output, indent=2, ensure_ascii=False))
    
    return 0

if __name__ == "__main__":
    sys.exit(main())

