#!/usr/bin/env python3
"""
Scrape subtle patterns (BTTS Yes and Over 2.5 Goals) directly from website
and output as JSON format.

Usage:
    python get_subtle_patterns_json.py --date 08-11-2025 --type predictions
    python get_subtle_patterns_json.py --date 08-11-2025 --type results
"""

import requests
from bs4 import BeautifulSoup
import sys
import json
import re
from datetime import datetime


def safe_float(value):
    """Safely convert value to float."""
    if value is None:
        return None
    s = str(value).strip()
    if s in {"", "-", "N/A", "None"}:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def get_value(soup, element_id):
    """Helper function to extract value from element by ID."""
    elem = soup.find('span', {'id': element_id})
    if elem:
        value = elem.text.strip()
        return value if value else ""
    return ""


def determine_bet_outcome(match_result, bet_type, home_team, away_team):
    """Determine if a bet won or lost based on match result."""
    if not match_result or match_result == 'Pending' or match_result == 'N/A':
        return None, None
    
    # Parse match result to get scores
    score_pattern = r'(\d+)\s*[-–]\s*(\d+)'
    match = re.search(score_pattern, match_result)
    
    if not match:
        return None, None
    
    try:
        home_score = int(match.group(1))
        away_score = int(match.group(2))
    except:
        return None, None
    
    # Determine actual match outcome
    if home_score > away_score:
        actual_outcome = 'Home Win'
    elif away_score > home_score:
        actual_outcome = 'Away Win'
    else:
        actual_outcome = 'Draw'
    
    # Check bet type and determine win/loss
    if bet_type == 'BTTS Yes':
        # BTTS Yes means both teams scored
        won = (home_score > 0 and away_score > 0)
    elif bet_type == 'Over 2.5 Goals':
        # Over 2.5 Goals means total goals > 2.5
        total_goals = home_score + away_score
        won = (total_goals > 2.5)
    else:
        return None, None
    
    return won, actual_outcome


def scrape_match_data(session, option_value, option_text, form_data):
    """Scrape betting data for a single match."""
    # Prepare form data for this option
    post_data = form_data.copy()
    post_data['ctl00$MainContentFull$MainContent$ListBox1'] = option_value
    post_data['__EVENTTARGET'] = 'ctl00$MainContentFull$MainContent$ListBox1'
    post_data['__EVENTARGUMENT'] = ''
    
    try:
        response = session.post(
            'https://www.betistuta.net/OAF.aspx',
            data=post_data,
            timeout=30
        )
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Extract match details
        parts = option_text.split(' || ')
        if len(parts) >= 3:
            match_id = parts[0].strip()
            match_time = parts[1].strip()
            match_name = parts[2].strip()
            league = parts[3].strip() if len(parts) > 3 else ''
            league = league.rstrip(' |').strip()
        else:
            match_id = option_text
            match_time = 'N/A'
            match_name = option_text
            league = ''
        
        # Extract betting data
        ms1 = safe_float(get_value(soup, 'ctl00_MainContentFull_MainContent_LMS1'))
        ms0 = safe_float(get_value(soup, 'ctl00_MainContentFull_MainContent_LMS0'))
        ms2 = safe_float(get_value(soup, 'ctl00_MainContentFull_MainContent_LMS2'))
        
        # BTTS Yes (KGY column - matches existing save_subtle_patterns.py behavior)
        # Note: Despite comment in scraper saying KGY is "No", the CSV shows KGY has BTTS Yes values
        btts_yes = safe_float(get_value(soup, 'ctl00_MainContentFull_MainContent_LKGY'))
        
        # Over 2.5 Goals (MS_2.5_UST column)
        over_25 = safe_float(get_value(soup, 'ctl00_MainContentFull_MainContent_LU'))
        
        # Match result
        match_result = get_value(soup, 'ctl00_MainContentFull_MainContent_MacAdi')
        
        # Define patterns to match
        btts_patterns = {
            2.58: {'desc': 'BTTS Yes @ 2.58', 'confidence': 'Very High (100% historical)'},
            2.55: {'desc': 'BTTS Yes @ 2.55', 'confidence': 'Very High (100% historical)'},
            2.80: {'desc': 'BTTS Yes @ 2.80', 'confidence': 'Very High (100% historical)'},
            2.46: {'desc': 'BTTS Yes @ 2.46', 'confidence': 'Very High (100% historical)'},
            2.25: {'desc': 'BTTS Yes @ 2.25', 'confidence': 'Very High (100% historical)'},
            2.30: {'desc': 'BTTS Yes @ 2.30', 'confidence': 'Very High (100% historical)'},
            2.41: {'desc': 'BTTS Yes @ 2.41', 'confidence': 'Very High (100% historical)'},
        }
        
        over_25_patterns = {
            1.13: {'desc': 'Over 2.5 Goals @ 1.13', 'confidence': 'Very High (100% historical)'},
            1.15: {'desc': 'Over 2.5 Goals @ 1.15', 'confidence': 'Very High (100% historical)'},
            1.17: {'desc': 'Over 2.5 Goals @ 1.17', 'confidence': 'Very High (100% historical)'},
            1.21: {'desc': 'Over 2.5 Goals @ 1.21', 'confidence': 'Very High (100% historical)'},
            2.66: {'desc': 'Over 2.5 Goals @ 2.66', 'confidence': 'Very High (100% historical)'},
            1.08: {'desc': 'Over 2.5 Goals @ 1.08', 'confidence': 'Very High (100% historical)'},
        }
        
        matches = []
        
        # Check BTTS Yes patterns
        # Only check if we have a valid value (not None and not empty string)
        if btts_yes is not None and btts_yes != 0:
            for pattern_value, pattern_info in btts_patterns.items():
                # Match pattern value within 0.01 tolerance (same as existing code)
                if abs(btts_yes - pattern_value) < 0.01:
                    home_team = match_name.split(' - ')[0].strip() if ' - ' in match_name else ''
                    away_team = match_name.split(' - ')[1].strip() if ' - ' in match_name else ''
                    
                    won, outcome = determine_bet_outcome(match_result, 'BTTS Yes', home_team, away_team)
                    
                    status = "pending"
                    if won is True:
                        status = "won"
                    elif won is False:
                        status = "lost"
                    
                    matches.append({
                        'match_id': match_id,
                        'match_time': match_time,
                        'match_name': match_name,
                        'home_team': home_team,
                        'away_team': away_team,
                        'league': league,
                        'pattern_type': 'BTTS Yes',
                        'pattern_description': pattern_info['desc'],
                        'bet_odds': btts_yes,
                        'confidence': pattern_info['confidence'],
                        'ms1': ms1,
                        'ms0': ms0,
                        'ms2': ms2,
                        'match_result': match_result,
                        'status': status,
                        'actual_outcome': outcome
                    })
                    break
        
        # Check Over 2.5 Goals patterns
        # Only check if we have a valid value (not None and not empty string)
        if over_25 is not None and over_25 != 0:
            for pattern_value, pattern_info in over_25_patterns.items():
                # Match pattern value within 0.01 tolerance (same as existing code)
                if abs(over_25 - pattern_value) < 0.01:
                    home_team = match_name.split(' - ')[0].strip() if ' - ' in match_name else ''
                    away_team = match_name.split(' - ')[1].strip() if ' - ' in match_name else ''
                    
                    won, outcome = determine_bet_outcome(match_result, 'Over 2.5 Goals', home_team, away_team)
                    
                    status = "pending"
                    if won is True:
                        status = "won"
                    elif won is False:
                        status = "lost"
                    
                    matches.append({
                        'match_id': match_id,
                        'match_time': match_time,
                        'match_name': match_name,
                        'home_team': home_team,
                        'away_team': away_team,
                        'league': league,
                        'pattern_type': 'Over 2.5 Goals',
                        'pattern_description': pattern_info['desc'],
                        'bet_odds': over_25,
                        'confidence': pattern_info['confidence'],
                        'ms1': ms1,
                        'ms0': ms0,
                        'ms2': ms2,
                        'match_result': match_result,
                        'status': status,
                        'actual_outcome': outcome
                    })
                    break
        
        return matches
        
    except Exception as e:
        print(f"Error scraping match {option_text}: {e}", file=sys.stderr)
        return []


def scrape_subtle_patterns(date_str, output_type='predictions'):
    """
    Scrape subtle patterns directly from website.
    
    Args:
        date_str: Date in format DD-MM-YYYY
        output_type: 'predictions' (pending matches) or 'results' (matches with results)
    """
    # Convert DD-MM-YYYY to MM/DD/YYYY
    parts = date_str.split('-')
    if len(parts) != 3:
        raise ValueError(f"Invalid date format: {date_str}. Use DD-MM-YYYY")
    
    day, month, year = parts
    date_param = f"{month}/{day}/{year}"
    url = f"https://www.betistuta.net/OAF.aspx?D={date_param}"
    
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    })
    
    all_matches = []
    
    try:
        # Step 1: Get initial page
        print("Fetching initial page...", file=sys.stderr)
        response = session.get(url, timeout=30)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Extract form fields
        form_data = {}
        hidden_inputs = soup.find_all('input', {'type': 'hidden'})
        for inp in hidden_inputs:
            name = inp.get('name', '')
            value = inp.get('value', '')
            if name:
                form_data[name] = value
        
        checkboxes = soup.find_all(['input'], {'type': ['checkbox', 'radio']})
        for cb in checkboxes:
            name = cb.get('name', '')
            if name and cb.get('checked'):
                form_data[name] = 'on' if cb.get('type') == 'checkbox' else cb.get('value', 'on')
        
        # Get all options
        listbox = soup.find('select', {'id': 'ctl00_MainContentFull_MainContent_ListBox1'})
        if not listbox:
            raise ValueError("Could not find match listbox on page")
        
        options = listbox.find_all('option')
        print(f"Found {len(options)} matches to process...", file=sys.stderr)
        
        # Process each option
        for idx, option in enumerate(options):
            option_value = option.get('value', '')
            option_text = option.text.strip()
            
            # Filter out early morning matches (00:00-05:00) that might be for next day
            try:
                parts = option_text.split(' || ')
                if len(parts) >= 2:
                    match_time = parts[1].strip()
                    hour = int(match_time.split(':')[0])
                    if hour >= 0 and hour < 6:
                        continue
            except:
                pass
            
            matches = scrape_match_data(session, option_value, option_text, form_data)
            
            # Filter based on output_type
            if output_type == 'predictions':
                # Only include pending matches
                all_matches.extend([m for m in matches if m['status'] == 'pending'])
            elif output_type == 'results':
                # Only include matches with results (won or lost)
                all_matches.extend([m for m in matches if m['status'] in ['won', 'lost']])
            else:
                # Include all
                all_matches.extend(matches)
            
            # Progress update
            if (idx + 1) % 50 == 0:
                print(f"Processed {idx + 1}/{len(options)} matches...", file=sys.stderr)
        
        # Sort by match time
        all_matches.sort(key=lambda x: x['match_time'] or '')
        
        return all_matches
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        raise


def main():
    """Main function."""
    if len(sys.argv) < 3:
        print("Usage: python get_subtle_patterns_json.py --date DD-MM-YYYY --type predictions|results", file=sys.stderr)
        sys.exit(1)
    
    date_str = None
    output_type = 'predictions'
    
    # Parse arguments
    if '--date' in sys.argv:
        try:
            idx = sys.argv.index('--date')
            date_str = sys.argv[idx + 1]
        except IndexError:
            print("Error: --date requires a date in DD-MM-YYYY format", file=sys.stderr)
            sys.exit(1)
    
    if '--type' in sys.argv:
        try:
            idx = sys.argv.index('--type')
            output_type = sys.argv[idx + 1]
            if output_type not in ['predictions', 'results']:
                print("Error: --type must be 'predictions' or 'results'", file=sys.stderr)
                sys.exit(1)
        except IndexError:
            print("Error: --type requires 'predictions' or 'results'", file=sys.stderr)
            sys.exit(1)
    
    if not date_str:
        print("Error: --date is required", file=sys.stderr)
        sys.exit(1)
    
    # Scrape patterns
    try:
        matches = scrape_subtle_patterns(date_str, output_type)
        
        # Output as JSON
        output = {
            'date': date_str,
            'type': output_type,
            'total_matches': len(matches),
            'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'matches': matches
        }
        
        print(json.dumps(output, indent=2, ensure_ascii=False))
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

