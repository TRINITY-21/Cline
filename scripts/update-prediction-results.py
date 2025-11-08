#!/usr/bin/env python3
"""
Update prediction results by scraping final scores from betistuta.net
Runs at midnight to update the previous day's predictions
"""

import requests
from bs4 import BeautifulSoup
import json
import sys
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import re

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

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

def scrape_results(date_str: Optional[str] = None) -> Dict[str, Dict]:
    """
    Scrape match results from betistuta.net
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
        
        # Look for score patterns: "2-1", "3-0", etc.
        # Also look for completed match indicators
        
        # Find all text containing scores
        score_pattern = re.compile(r'(\d+)\s*[-:]\s*(\d+)')
        
        # Try to find match containers with scores
        all_text = soup.get_text()
        
        # Look for "Team A vs Team B" followed by score
        match_score_pattern = re.compile(
            r'([A-Z][a-zA-Z\s]+?)\s+(?:vs|VS|v|V|-)\s+([A-Z][a-zA-Z\s]+?)[^\d]*(\d+)\s*[-:]\s*(\d+)',
            re.IGNORECASE
        )
        
        matches = match_score_pattern.findall(all_text)
        
        for match in matches:
            home_team = match[0].strip()
            away_team = match[1].strip()
            home_score = int(match[2])
            away_score = int(match[3])
            total_goals = home_score + away_score
            
            key = (home_team.lower(), away_team.lower())
            results[key] = {
                'home': home_team,
                'away': away_team,
                'homeScore': home_score,
                'awayScore': away_score,
                'totalGoals': total_goals,
                'result': f"{home_score}-{away_score}",
                'over15': total_goals > 1,
                'status': 'WON' if total_goals > 1 else 'FAILED',
            }
        
        # Also check table cells for score data
        cells = soup.find_all(['td', 'div'])
        for cell in cells:
            text = cell.get_text(strip=True)
            score_match = score_pattern.search(text)
            if score_match:
                # Try to find team names nearby
                parent_text = cell.get_text(separator=' ', strip=True)
                vs_match = re.search(
                    r'([A-Z][a-zA-Z\s]+?)\s+(?:vs|VS|v|V|-)\s+([A-Z][a-zA-Z\s]+?)',
                    parent_text,
                    re.IGNORECASE
                )
                if vs_match:
                    home_team = vs_match.group(1).strip()
                    away_team = vs_match.group(2).strip()
                    home_score = int(score_match.group(1))
                    away_score = int(score_match.group(2))
                    total_goals = home_score + away_score
                    
                    key = (home_team.lower(), away_team.lower())
                    if key not in results:
                        results[key] = {
                            'home': home_team,
                            'away': away_team,
                            'homeScore': home_score,
                            'awayScore': away_score,
                            'totalGoals': total_goals,
                            'result': f"{home_score}-{away_score}",
                            'over15': total_goals > 1,
                            'status': 'WON' if total_goals > 1 else 'FAILED',
                        }
        
        print(f"✅ Found {len(results)} match results")
        return results
        
    except Exception as e:
        print(f"❌ Error scraping results: {e}")
        import traceback
        traceback.print_exc()
        return {}

def update_prediction(prediction: Dict, results: Dict[str, Dict]) -> Dict:
    """Update a prediction with result data"""
    home = prediction.get('home', '').lower()
    away = prediction.get('away', '').lower()
    
    # Try exact match
    key = (home, away)
    if key in results:
        result = results[key]
        prediction['result'] = result['result']
        prediction['homeScore'] = result['homeScore']
        prediction['awayScore'] = result['awayScore']
        prediction['totalGoals'] = result['totalGoals']
        prediction['status'] = result['status']
        prediction['updatedAt'] = datetime.now().isoformat()
        return prediction
    
    # Try reverse (away vs home)
    key_reverse = (away, home)
    if key_reverse in results:
        result = results[key_reverse]
        prediction['result'] = f"{result['awayScore']}-{result['homeScore']}"
        prediction['homeScore'] = result['awayScore']
        prediction['awayScore'] = result['homeScore']
        prediction['totalGoals'] = result['totalGoals']
        prediction['status'] = result['status']
        prediction['updatedAt'] = datetime.now().isoformat()
        return prediction
    
    # Try fuzzy matching (partial team name match)
    for result_key, result_data in results.items():
        result_home = result_key[0]
        result_away = result_key[1]
        
        # Check if team names partially match
        if (home in result_home or result_home in home) and \
           (away in result_away or result_away in away):
            prediction['result'] = result_data['result']
            prediction['homeScore'] = result_data['homeScore']
            prediction['awayScore'] = result_data['awayScore']
            prediction['totalGoals'] = result_data['totalGoals']
            prediction['status'] = result_data['status']
            prediction['updatedAt'] = datetime.now().isoformat()
            return prediction
    
    # No result found - mark as pending or unknown
    prediction['status'] = 'PENDING'
    prediction['updatedAt'] = datetime.now().isoformat()
    return prediction

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
    
    # Scrape results
    results = scrape_results(date_str)
    
    if not results:
        print("⚠️  No results found - matches may not have been played yet")
        output = {
            'success': True,
            'date': date_str,
            'resultsFound': 0,
            'message': 'No results found',
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

