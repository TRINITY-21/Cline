#!/usr/bin/env python3
"""
Update prediction results by scraping final scores from betistuta.net
First fetches the 12 saved predictions from Firestore, then finds their results in the MS column
"""

import requests
from bs4 import BeautifulSoup
import json
import sys
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import re

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:
    print("❌ firebase-admin not installed. Run: pip install firebase-admin")
    sys.exit(1)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

def init_firebase():
    """Initialize Firebase Admin SDK"""
    if not firebase_admin._apps:
        cred_json = os.getenv('FIREBASE_SERVICE_ACCOUNT_JSON')
        cred_file = os.getenv('FIREBASE_SERVICE_ACCOUNT_FILE') or os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
        
        if cred_json:
            try:
                cred_dict = json.loads(cred_json)
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred)
            except Exception as e:
                print(f"❌ Error parsing FIREBASE_SERVICE_ACCOUNT_JSON: {e}")
                sys.exit(1)
        elif cred_file and os.path.exists(cred_file):
            try:
                cred = credentials.Certificate(cred_file)
                firebase_admin.initialize_app(cred)
            except Exception as e:
                print(f"❌ Error loading credentials file: {e}")
                sys.exit(1)
        else:
            try:
                firebase_admin.initialize_app()
            except Exception as e:
                print(f"❌ Error initializing Firebase: {e}")
                sys.exit(1)
    
    return firestore.client()

def get_date_id(date_str: str) -> str:
    """Convert date to DD-MM-YYYY format"""
    try:
        dt = datetime.strptime(date_str, '%Y-%m-%d')
        return dt.strftime('%d-%m-%Y')
    except:
        return date_str

def get_week_id(date_str: str) -> str:
    """Get week ID (Monday to Sunday)"""
    try:
        dt = datetime.strptime(date_str, '%Y-%m-%d')
        weekday = dt.weekday()
        monday = dt - timedelta(days=weekday)
        sunday = monday + timedelta(days=6)
        return f"{monday.strftime('%d')}-{sunday.strftime('%d')}-{monday.strftime('%m')}-{monday.strftime('%Y')}"
    except:
        return ""

def get_day_of_week(date_str: str) -> str:
    """Get day of week name"""
    try:
        dt = datetime.strptime(date_str, '%Y-%m-%d')
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        return days[dt.weekday()]
    except:
        return 'Monday'

def fetch_predictions_from_firestore(db, date_str: str) -> List[Dict]:
    """Fetch the 12 saved predictions from Firestore"""
    try:
        date_id = get_date_id(date_str)
        week_id = get_week_id(date_str)
        day_of_week = get_day_of_week(date_str)
        
        week_ref = db.collection('over_predictions').document(week_id)
        day_col = week_ref.collection(day_of_week)
        date_doc = day_col.document(date_id)
        
        doc = date_doc.get()
        if not doc.exists:
            print(f"⚠️  No predictions found for {date_id}")
            return []
        
        data = doc.to_dict()
        predictions = data.get('predictions', [])
        
        # Filter only approved predictions
        approved = [p for p in predictions if p.get('approved', True)]
        print(f"📋 Found {len(approved)} predictions to update")
        return approved
        
    except Exception as e:
        print(f"❌ Error fetching predictions from Firestore: {e}")
        import traceback
        traceback.print_exc()
        return []

def parse_date_for_url(date_str: Optional[str] = None) -> str:
    """Convert date to betistuta format: M/D/YYYY"""
    if date_str:
        try:
            if '/' in date_str:
                parts = date_str.split('/')
                if len(parts) == 3:
                    return date_str
            dt = datetime.strptime(date_str, '%Y-%m-%d')
            return f"{dt.month}/{dt.day}/{dt.year}"
        except:
            pass
    
    # Default to yesterday (for midnight runs)
    yesterday = datetime.now() - timedelta(days=1)
    return f"{yesterday.month}/{yesterday.day}/{yesterday.year}"

def normalize_team_name(name: str) -> str:
    """Normalize team name for matching"""
    # Remove country/league suffixes
    name = re.sub(r'\s+(Kolombiya|Meksika|ABD|Bosna|Botsvana|Kirgizistan|Ingiltere|Almanya|Ispanya|Italya|Fransa|Paraguay|Brezilya|Uruguay|Bolivya|Gana|Malavi|Kambo)\s*$', '', name, flags=re.I)
    # Remove extra whitespace
    name = re.sub(r'\s+', ' ', name).strip()
    return name.lower()

def scrape_results_for_predictions(date_str: str, predictions: List[Dict]) -> Dict[str, Dict]:
    """
    Scrape match results from betistuta.net for the specific predictions
    Looks for MS column (final score) in the table
    Returns dict mapping (home, away) -> {homeScore, awayScore, totalGoals}
    """
    date_url = parse_date_for_url(date_str)
    url = f"https://www.betistuta.net/Futbol.aspx?D={date_url}"
    
    print(f"🔍 Scraping results from: {url}")
    
    results = {}
    
    try:
        response = requests.get(url, headers=HEADERS, timeout=30)
        response.raise_for_status()
        response.encoding = 'utf-8'
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Find all table rows
        rows = soup.find_all('tr')
        
        # Create a lookup map for predictions by normalized team names
        prediction_map = {}
        for pred in predictions:
            home = normalize_team_name(pred.get('home', ''))
            away = normalize_team_name(pred.get('away', ''))
            key = (home, away)
            prediction_map[key] = pred
            # Also add reverse for matching
            key_reverse = (away, home)
            prediction_map[key_reverse] = pred
        
        print(f"🔍 Looking for {len(predictions)} specific matches in the table...")
        
        # Debug: Show sample predictions we're looking for
        print(f"Sample predictions to find:")
        for i, pred in enumerate(predictions[:3], 1):
            home_norm = normalize_team_name(pred.get('home', ''))
            away_norm = normalize_team_name(pred.get('away', ''))
            print(f"  {i}. {pred.get('home', 'N/A')} vs {pred.get('away', 'N/A')} (normalized: {home_norm} vs {away_norm})")
        
        # Parse table rows
        matches_found = 0
        for row in rows:
            cells = row.find_all(['td', 'th'])
            if len(cells) < 5:  # Need at least: Saat, EvSahibi, MS, Deplasman
                continue
            
            # Extract team names and MS (final score)
            # Column order: Kod, Saat, EvSahibi (Home), MS (Final Score), Deplasman (Away), IY, Lig, MSBS, ...
            # We'll try to find the columns by content
            
            row_text = ' '.join([cell.get_text(strip=True) for cell in cells])
            
            # Use positional parsing - this is more reliable
            # Column order: [0: Kod, 1: Saat (Time), 2: EvSahibi (Home), 3: "v" (always), 4: Deplasman (Away), 5: IY, 6: Lig, 7: MS (Final Score), 8: MSBS (Prediction), ...]
            home_team = None
            away_team = None
            ms_score = None  # Final score from MS column (index 7)
            
            if len(cells) >= 8:
                # Position 2 (index 2) should be home team
                # Position 3 (index 3) is always "v" (even for played matches)
                # Position 4 (index 4) should be away team
                # Position 7 (index 7) is MS (Final Score) - THIS IS WHAT WE WANT
                # Position 8 (index 8) is MSBS (Prediction Score) - DO NOT USE THIS
                potential_home = cells[2].get_text(strip=True) if len(cells) > 2 else ''
                potential_away = cells[4].get_text(strip=True) if len(cells) > 4 else ''
                potential_ms = cells[7].get_text(strip=True) if len(cells) > 7 else ''  # MS column - Final Score (index 7)
                
                # Validate and use if looks correct
                if potential_home and re.match(r'^[A-Za-z\s]+$', potential_home) and len(potential_home) > 2:
                    home_team = potential_home
                if potential_away and re.match(r'^[A-Za-z\s]+$', potential_away) and len(potential_away) > 2:
                    away_team = potential_away
                
                # MS column (index 7) - Final Score (can be "v" for not played, or "1-0" format)
                if potential_ms:
                    if potential_ms.lower() == 'v':
                        ms_score = None  # Match not played yet
                    elif re.match(r'^(\d{1,2})\s*[-:]\s*(\d{1,2})$', potential_ms):
                        score_match = re.match(r'^(\d{1,2})\s*[-:]\s*(\d{1,2})$', potential_ms)
                        if score_match:
                            home_score_val = int(score_match.group(1))
                            away_score_val = int(score_match.group(2))
                            # Validate scores are reasonable
                            if home_score_val <= 15 and away_score_val <= 15:
                                ms_score = (home_score_val, away_score_val)
            
            # If we have both teams and a score, check if it matches our predictions
            if home_team and away_team and ms_score:
                home_norm = normalize_team_name(home_team)
                away_norm = normalize_team_name(away_team)
                
                # Check if this match is in our predictions
                key = (home_norm, away_norm)
                key_reverse = (away_norm, home_norm)
                
                matched_pred = None
                is_reversed = False
                
                if key in prediction_map:
                    matched_pred = prediction_map[key]
                elif key_reverse in prediction_map:
                    matched_pred = prediction_map[key_reverse]
                    is_reversed = True
                
                if matched_pred:
                    # Extract score
                    home_score, away_score = ms_score
                    if is_reversed:
                        # Swap scores if teams are reversed
                        home_score, away_score = away_score, home_score
                    
                    total_goals = home_score + away_score
                    
                    # Use original team names from prediction
                    pred_home = matched_pred.get('home', '')
                    pred_away = matched_pred.get('away', '')
                    
                    result_key = (normalize_team_name(pred_home), normalize_team_name(pred_away))
                    results[result_key] = {
                        'home': pred_home,
                        'away': pred_away,
                        'homeScore': home_score,
                        'awayScore': away_score,
                        'totalGoals': total_goals,
                        'result': f"{home_score}-{away_score}",
                        'over15': total_goals > 1,
                        'status': 'WON' if total_goals > 1 else 'FAILED',
                    }
                    print(f"✅ Found result: {pred_home} vs {pred_away} - {home_score}-{away_score}")
                    matches_found += 1
                elif home_team and away_team:
                    # Debug: Show matches we found but didn't match
                    home_norm = normalize_team_name(home_team)
                    away_norm = normalize_team_name(away_team)
                    # Check if any prediction has similar team names
                    for pred in predictions[:3]:  # Check first 3 for debug
                        pred_home_norm = normalize_team_name(pred.get('home', ''))
                        pred_away_norm = normalize_team_name(pred.get('away', ''))
                        if (home_norm in pred_home_norm or pred_home_norm in home_norm) and \
                           (away_norm in pred_away_norm or pred_away_norm in away_norm):
                            print(f"🔍 Found potential match (not exact): {home_team} vs {away_team} (MS: {potential_ms}) vs prediction: {pred.get('home')} vs {pred.get('away')}")
                            break
        
        print(f"✅ Found {len(results)} results for predicted matches")
        return results
        
    except Exception as e:
        print(f"❌ Error scraping results: {e}")
        import traceback
        traceback.print_exc()
        return {}

def main():
    """Main execution"""
    # Get date from command line or use yesterday
    date_str = sys.argv[1] if len(sys.argv) > 1 else None
    
    if date_str:
        print(f"📅 Updating results for: {date_str}")
    else:
        yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
        date_str = yesterday
        print(f"📅 Updating results for yesterday: {date_str}")
    
    # Initialize Firebase
    db = init_firebase()
    
    # Fetch the 12 predictions from Firestore
    predictions = fetch_predictions_from_firestore(db, date_str)
    
    if not predictions:
        print("⚠️  No predictions found in Firestore")
        output = {
            'success': True,
            'date': date_str,
            'resultsFound': 0,
            'message': 'No predictions found in Firestore',
        }
        print(json.dumps(output, indent=2))
        return 0
    
    # Scrape results for these specific predictions
    results = scrape_results_for_predictions(date_str, predictions)
    
    if not results:
        print("⚠️  No results found for the predicted matches")
        output = {
            'success': True,
            'date': date_str,
            'resultsFound': 0,
            'message': 'No results found for predicted matches',
        }
        print(json.dumps(output, indent=2))
        return 0
    
    # Output results for use by update script
    output = {
        'success': True,
        'date': date_str,
        'results': list(results.values()),
        'resultsFound': len(results),
    }
    
    print(json.dumps(output, indent=2, ensure_ascii=False))
    
    return 0

if __name__ == '__main__':
    sys.exit(main())
