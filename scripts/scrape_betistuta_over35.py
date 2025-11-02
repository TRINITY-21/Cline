#!/usr/bin/env python3
"""
Scrape betistuta for Over 3.5 predictions only (MSBS goals sum >= 4).
Outputs JSON data that can be saved to Firestore via API endpoint.
"""

import requests
from bs4 import BeautifulSoup
import json
import sys
from datetime import datetime, timedelta
import re

def parse_date(date_str):
    """Parse date string to YYYY-MM-DD format"""
    try:
        # Try DD-MM-YYYY format
        if '-' in date_str and len(date_str.split('-')) == 3:
            parts = date_str.split('-')
            if len(parts[2]) == 4:  # DD-MM-YYYY
                day, month, year = parts
                return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
        # Try other formats or return today
        dt = datetime.strptime(date_str, "%d-%m-%Y")
        return dt.strftime("%Y-%m-%d")
    except:
        return datetime.now().strftime("%Y-%m-%d")

def extract_goals(score_str):
    """Extract home and away goals from score string like '3-1' or '2:2'"""
    if not score_str:
        return None, None
    
    # Match patterns like "3-1", "2:2", "4 - 0"
    match = re.search(r'(\d+)\s*[-:]\s*(\d+)', str(score_str))
    if match:
        return int(match.group(1)), int(match.group(2))
    return None, None

def is_over_35(home_score, away_score):
    """Check if total goals is >= 4 (Over 3.5)"""
    if home_score is None or away_score is None:
        return False
    return (home_score + away_score) >= 4

def scrape_betistuta():
    """
    Scrape betistuta website for Over 3.5 predictions.
    Returns list of prediction objects.
    """
    predictions = []
    
    try:
        # Betistuta URL for Football predictions
        url = "https://www.betistuta.net/Futbol.aspx"
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Find the table with prediction data
        tables = soup.find_all('table')
        
        # Column indices based on the actual HTML structure
        COL_KOD = 99
        COL_SAAT = 100
        COL_HOME = 101  # EvSahibi
        COL_MS = 102    # Actual score
        COL_AWAY = 103  # Deplasman
        COL_LIG = 105   # League
        COL_MSBS = 106  # Predicted score
        
        for table in tables:
            rows = table.find_all('tr')
            
            # Find header row to confirm column positions
            header_found = False
            for row in rows[:5]:
                cells = row.find_all(['th', 'td'])
                cell_texts = [cell.get_text(strip=True) for cell in cells]
                
                # Check if this is the header row
                if 'MSBS' in cell_texts or 'Lig' in cell_texts:
                    header_found = True
                    # Find actual column indices dynamically
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
            for row in rows[1:]:  # Skip header
                try:
                    cells = row.find_all(['td', 'th'])
                    
                    # Skip if not enough columns
                    if len(cells) < max(COL_KOD, COL_SAAT, COL_HOME, COL_AWAY, COL_LIG, COL_MSBS) + 1:
                        continue
                    
                    # Extract data from columns
                    kod = cells[COL_KOD].get_text(strip=True) if COL_KOD < len(cells) else ""
                    saat = cells[COL_SAAT].get_text(strip=True) if COL_SAAT < len(cells) else ""
                    home_team = cells[COL_HOME].get_text(strip=True) if COL_HOME < len(cells) else ""
                    away_team = cells[COL_AWAY].get_text(strip=True) if COL_AWAY < len(cells) else ""
                    lig = cells[COL_LIG].get_text(strip=True) if COL_LIG < len(cells) else ""
                    msbs = cells[COL_MSBS].get_text(strip=True) if COL_MSBS < len(cells) else ""
                    
                    # Skip if missing essential data
                    if not home_team or not away_team or not msbs:
                        continue
                    
                    # Skip women's games (marked with "(K)")
                    if "(K)" in home_team or "(K)" in away_team:
                        continue
                    
                    # Parse MSBS to get predicted goals
                    home_pred, away_pred = extract_goals(msbs)
                    
                    # Only include if Over 3.5 (sum >= 4)
                    if home_pred is None or away_pred is None:
                        continue
                    total_goals = home_pred + away_pred
                    if total_goals < 4:  # Over 3.5 means >= 4 goals
                        continue
                    
                    # Get today's date as match date (you may need to parse from page)
                    match_date = datetime.now().strftime("%Y-%m-%d")
                    
                    # Format predicted score display (normalize separators)
                    if home_pred is not None and away_pred is not None:
                        predicted_score_display = f"{home_pred}-{away_pred}"
                    else:
                        predicted_score_display = msbs.replace(' ', '')
                    
                    prediction = {
                        "home": home_team.strip(),
                        "away": away_team.strip(),
                        "league": lig.strip() if lig else "Unknown",
                        "timeLabel": saat.strip() if saat else "00:00",
                        "matchDate": match_date,
                        "predictedScoreDisplay": predicted_score_display,
                        "msbs": "Over 3.5",
                        "sport": "Football"
                    }
                    
                    predictions.append(prediction)
                    
                except Exception as e:
                    # Silently skip errors for individual rows
                    continue
        
        return predictions
        
    except requests.RequestException as e:
        print(f"Error fetching betistuta: {e}", file=sys.stderr)
        return []
    except Exception as e:
        print(f"Error scraping betistuta: {e}", file=sys.stderr)
        return []

def main():
    """Main function to scrape and output JSON"""
    predictions = scrape_betistuta()
    
    if not predictions:
        print("No Over 3.5 predictions found", file=sys.stderr)
        sys.exit(1)
    
    # Output JSON
    output = {
        "predictions": predictions,
        "scrapedAt": datetime.now().isoformat(),
        "count": len(predictions)
    }
    
    print(json.dumps(output, indent=2, ensure_ascii=False))
    
    return 0

if __name__ == "__main__":
    sys.exit(main())

