#!/usr/bin/env python3
"""
Scrape Over 1.5 predictions from betistuta.net
Selects best 12 matches using algorithm based on:
- Historical patterns
- Team form
- League statistics
- Match importance
"""

import requests
from bs4 import BeautifulSoup
import json
import sys
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
import re
from urllib.parse import urljoin

# Use stderr for debug messages, stdout for JSON only
def debug_print(*args, **kwargs):
    """Print to stderr for debug messages"""
    print(*args, file=sys.stderr, **kwargs)

# Headers to mimic browser
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
}

def parse_date_for_url(date_str: Optional[str] = None) -> str:
    """Convert date to betistuta format: M/D/YYYY"""
    if date_str:
        try:
            # Try parsing various formats
            if '/' in date_str:
                parts = date_str.split('/')
                if len(parts) == 3:
                    return date_str  # Already in correct format
            # Try ISO format
            dt = datetime.strptime(date_str, '%Y-%m-%d')
            return f"{dt.month}/{dt.day}/{dt.year}"
        except:
            pass
    
    # Default to today
    today = datetime.now()
    return f"{today.month}/{today.day}/{today.year}"

def scrape_betistuta(date_str: Optional[str] = None) -> List[Dict]:
    """Scrape matches from betistuta.net for given date"""
    date_url = parse_date_for_url(date_str)
    url = f"https://www.betistuta.net/Futbol.aspx?D={date_url}"
    
    debug_print(f"🔍 Scraping: {url}")
    
    try:
        response = requests.get(url, headers=HEADERS, timeout=30)
        response.raise_for_status()
        response.encoding = 'utf-8'
        
        soup = BeautifulSoup(response.text, 'html.parser')
        matches = []
        
        # Find match tables/containers - adjust selectors based on actual HTML structure
        # Common patterns: table rows, div containers with match data
        match_containers = soup.find_all(['tr', 'div'], class_=re.compile(r'match|game|prediction', re.I))
        
        # If no specific classes, try finding tables
        if not match_containers:
            tables = soup.find_all('table')
            for table in tables:
                rows = table.find_all('tr')
                match_containers.extend(rows)
        
        # Alternative: Look for text patterns that indicate matches
        if not match_containers:
            # Try finding elements with team names pattern (Team A vs Team B)
            all_text = soup.get_text()
            # Look for common match indicators
            vs_pattern = re.compile(r'(\w+(?:\s+\w+)*)\s+vs\s+(\w+(?:\s+\w+)*)', re.I)
            matches_found = vs_pattern.findall(all_text)
            
            # Try to extract from table cells
            cells = soup.find_all(['td', 'th'])
            for cell in cells:
                text = cell.get_text(strip=True)
                if 'vs' in text.lower() or '-' in text:
                    match_containers.append(cell)
        
        debug_print(f"📊 Found {len(match_containers)} potential match containers")
        
        # Extract match data
        for container in match_containers:
            try:
                text = container.get_text(separator=' ', strip=True)
                
                # Skip if too short or doesn't look like a match
                if len(text) < 10:
                    continue
                
                # Extract time first (HH:MM format) - usually appears early
                time_match = re.search(r'(\d{1,2}):(\d{2})', text)
                time_label = time_match.group(0) if time_match else "00:00"
                
                # Improved team name extraction
                # Pattern: Look for "Team A v Team B" format, capturing full team names
                # Try multiple patterns to handle different formats
                vs_patterns = [
                    # Pattern 1: With time prefix: "ID TIME Team A v Team B Country"
                    r'(?:\d+\s+)?(\d{1,2}:\d{2})\s+([A-Z][a-zA-Z\s]+?)\s+(?:v|vs|VS|V)\s+([A-Z][a-zA-Z\s]+?)(?:\s+(?:Yeni Zelanda|New Zealand|Japonya|Japan|Endonezya|Indonesia|Tayland|Thailand|Turkiye|Turkey|Almanya|Germany|Ingiltere|England|Ispanya|Spain|Italya|Italy|Fransa|France))',
                    # Pattern 2: Without time: "Team A v Team B"
                    r'([A-Z][a-zA-Z][a-zA-Z\s]{1,40}?)\s+(?:v|vs|VS|V)\s+([A-Z][a-zA-Z][a-zA-Z\s]{1,40}?)(?:\s+(?:Yeni Zelanda|New Zealand|Japonya|Japan|Endonezya|Indonesia|Tayland|Thailand|Turkiye|Turkey|Almanya|Germany|Ingiltere|England|Ispanya|Spain|Italya|Italy|Fransa|France))',
                    # Pattern 3: More flexible - any capitalized words separated by v/vs
                    r'([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+(?:v|vs|VS|V)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)',
                ]
                
                home_team = None
                away_team = None
                
                for pattern in vs_patterns:
                    match = re.search(pattern, text)
                    if match:
                        # Extract teams based on pattern
                        groups = match.groups()
                        if len(groups) >= 3:  # Pattern with time
                            home_team = groups[1].strip()
                            away_team = groups[2].strip()
                        elif len(groups) >= 2:  # Pattern without time
                            home_team = groups[0].strip()
                            away_team = groups[1].strip()
                        
                        if home_team and away_team:
                            # Clean up team names
                            home_team = re.sub(r'\s+', ' ', home_team).strip()
                            away_team = re.sub(r'\s+', ' ', away_team).strip()
                            
                            # Remove country names if they got included
                            country_patterns = [
                                r'\s+(Yeni Zelanda|New Zealand|Japonya|Japan|Endonezya|Indonesia|Tayland|Thailand|Turkiye|Turkey|Almanya|Germany|Ingiltere|England|Ispanya|Spain|Italya|Italy|Fransa|France)$',
                            ]
                            for cp in country_patterns:
                                home_team = re.sub(cp, '', home_team, flags=re.I).strip()
                                away_team = re.sub(cp, '', away_team, flags=re.I).strip()
                            
                            # Validate team names (at least 3 chars, not just single letters)
                            if len(home_team) >= 3 and len(away_team) >= 3 and \
                               not re.match(r'^[A-Z]$', home_team) and not re.match(r'^[A-Z]$', away_team):
                                break
                
                if not home_team or not away_team or len(home_team) < 2 or len(away_team) < 2:
                    continue
                
                # Extract league/country name (usually appears after teams)
                league = "Unknown League"
                # Look for country names in Turkish/English
                country_league_map = {
                    'Yeni Zelanda': 'New Zealand League',
                    'New Zealand': 'New Zealand League',
                    'Japonya': 'Japan League',
                    'Japan': 'Japan League',
                    'Endonezya': 'Indonesia League',
                    'Indonesia': 'Indonesia League',
                    'Tayland': 'Thailand League',
                    'Thailand': 'Thailand League',
                    'Turkiye': 'Turkey League',
                    'Turkey': 'Turkey League',
                    'Almanya': 'Germany League',
                    'Germany': 'Germany League',
                    'Ingiltere': 'England League',
                    'England': 'England League',
                    'Ispanya': 'Spain League',
                    'Spain': 'Spain League',
                    'Italya': 'Italy League',
                    'Italy': 'Italy League',
                    'Fransa': 'France League',
                    'France': 'France League',
                }
                
                for country, league_name in country_league_map.items():
                    if country in text:
                        league = league_name
                        break
                
                # Also try to find explicit league names
                league_patterns = [
                    r'([A-Z][a-zA-Z\s]+?\s+(?:League|Lig|Liga|Premier|Championship|Division|Serie|Bundesliga))',
                    r'([A-Z][a-zA-Z\s]+?\s+(?:Cup|Copa|Kupa))',
                ]
                for pattern in league_patterns:
                    league_match = re.search(pattern, text)
                    if league_match:
                        league = league_match.group(1).strip()
                        break
                
                # Extract Over 1.5 odds - look for patterns like "1.5" or "1,5" near "Over" or similar
                # Also look for decimal odds patterns
                over_odds = None
                # Pattern 1: Look for "Over 1.5" with odds nearby
                over_match = re.search(r'[Oo]ver\s+1[.,]5[^\d]*(\d+[.,]\d+)', text)
                if over_match:
                    try:
                        odds_str = over_match.group(1).replace(',', '.')
                        over_odds = float(odds_str)
                    except:
                        pass
                
                # Pattern 2: Look for decimal odds (1.xx to 2.xx range) that might be over 1.5 odds
                if not over_odds:
                    odds_matches = re.findall(r'\b(1\.[0-9]{1,2}|2\.[0-4])\b', text)
                    if odds_matches:
                        try:
                            # Take the first reasonable odds value
                            potential_odds = [float(om) for om in odds_matches if 1.1 <= float(om) <= 2.5]
                            if potential_odds:
                                over_odds = potential_odds[0]
                        except:
                            pass
                
                # Calculate score based on various factors
                score = calculate_match_score(home_team, away_team, league, over_odds, text)
                
                match_data = {
                    'home': home_team,
                    'away': away_team,
                    'timeLabel': time_label,
                    'league': league,
                    'overOdds': over_odds,
                    'score': score,
                    'rawText': text[:200],  # Store first 200 chars for debugging
                }
                
                matches.append(match_data)
                
            except Exception as e:
                debug_print(f"⚠️  Error parsing container: {e}")
                continue
        
        # Remove duplicates based on home/away teams
        unique_matches = []
        seen = set()
        for match in matches:
            key = (match['home'].lower(), match['away'].lower())
            if key not in seen:
                seen.add(key)
                unique_matches.append(match)
        
        debug_print(f"✅ Extracted {len(unique_matches)} unique matches")
        return unique_matches
        
    except requests.RequestException as e:
        debug_print(f"❌ Error fetching page: {e}")
        return []
    except Exception as e:
        debug_print(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return []

def analyze_match_context(home: str, away: str, league: str, raw_text: str) -> Dict[str, float]:
    """
    Analyze match context for additional scoring factors
    Returns a dict with various context scores
    """
    context = {
        'derby_score': 0.0,
        'cup_match': 0.0,
        'rivalry': 0.0,
        'time_factor': 0.0,
        'league_scoring_rate': 0.0,
    }
    
    home_lower = home.lower()
    away_lower = away.lower()
    league_lower = league.lower()
    text_lower = raw_text.lower()
    
    # 1. DERBY DETECTION (0-8 points)
    # Same city/region teams often have more goals
    city_indicators = ['city', 'united', 'rovers', 'town', 'athletic', 'wanderers']
    home_words = set(home_lower.split())
    away_words = set(away_lower.split())
    common_words = home_words.intersection(away_words)
    
    if len(common_words) > 0:
        # Same city/region name
        context['derby_score'] += 5
    if any(word in home_lower and word in away_lower for word in city_indicators):
        context['derby_score'] += 3
    
    # 2. CUP MATCH DETECTION (0-7 points)
    cup_keywords = ['cup', 'copa', 'kupa', 'trophy', 'final', 'playoff', 'play-off']
    if any(keyword in text_lower or keyword in league_lower for keyword in cup_keywords):
        context['cup_match'] = 7  # Cup matches often more open
    
    # 3. RIVALRY DETECTION (0-6 points)
    # Look for traditional rivalries or competitive matchups
    if 'vs' in text_lower or 'derby' in text_lower:
        context['rivalry'] += 3
    # Teams with similar strength (both have "United", "City", etc.)
    if (any(word in home_lower for word in ['united', 'city', 'fc']) and 
        any(word in away_lower for word in ['united', 'city', 'fc'])):
        context['rivalry'] += 3
    
    # 4. TIME FACTOR (0-5 points)
    # Extract time from raw text
    time_match = re.search(r'(\d{1,2}):(\d{2})', raw_text)
    if time_match:
        hour = int(time_match.group(1))
        # Evening matches (18:00-22:00) often have more goals
        if 18 <= hour <= 22:
            context['time_factor'] = 5
        # Afternoon matches (14:00-17:00) also good
        elif 14 <= hour <= 17:
            context['time_factor'] = 3
        # Early morning/very late (less goals)
        elif hour < 8 or hour >= 23:
            context['time_factor'] = -2
    
    # 5. LEAGUE SCORING RATE ESTIMATION (0-10 points)
    # Based on league type, estimate average goals per match
    high_scoring_leagues = {
        'premier': 2.8, 'la liga': 2.6, 'serie a': 2.5, 'bundesliga': 3.0,
        'eredivisie': 3.2, 'championship': 2.7, 'japan': 2.6, 'korea': 2.5
    }
    medium_scoring = {
        'thailand': 2.4, 'indonesia': 2.3, 'new zealand': 2.2, 'malaysia': 2.3
    }
    
    for league_key, avg_goals in high_scoring_leagues.items():
        if league_key in league_lower:
            if avg_goals >= 2.8:
                context['league_scoring_rate'] = 10
            elif avg_goals >= 2.6:
                context['league_scoring_rate'] = 8
            else:
                context['league_scoring_rate'] = 6
            break
    
    if context['league_scoring_rate'] == 0:
        for league_key, avg_goals in medium_scoring.items():
            if league_key in league_lower:
                if avg_goals >= 2.4:
                    context['league_scoring_rate'] = 5
                else:
                    context['league_scoring_rate'] = 3
                break
    
    return context

def advanced_statistical_analysis(raw_text: str) -> Dict[str, float]:
    """
    Advanced statistical analysis of raw text data
    Returns dict with various statistical scores
    """
    stats = {
        'goal_probability': 0.0,
        'btts_likelihood': 0.0,
        'over_trend': 0.0,
        'form_indicator': 0.0,
    }
    
    # Extract all numbers
    numbers = re.findall(r'\b(\d+[.,]\d+)\b', raw_text)
    if not numbers:
        return stats
    
    try:
        num_values = [float(n.replace(',', '.')) for n in numbers[:15]]
        
        # 1. GOAL PROBABILITY ANALYSIS (0-12 points)
        # Look for percentage patterns that might indicate goal probabilities
        percentages = [n for n in num_values if 0 <= n <= 100]
        if len(percentages) >= 3:
            # If we have multiple percentages, they might be goal probabilities
            avg_pct = sum(percentages) / len(percentages)
            if avg_pct > 45:
                stats['goal_probability'] = 12
            elif avg_pct > 40:
                stats['goal_probability'] = 10
            elif avg_pct > 35:
                stats['goal_probability'] = 8
            elif avg_pct > 30:
                stats['goal_probability'] = 5
        
        # Look for decimal patterns (0.0-1.0 range) - might be probabilities
        probabilities = [n for n in num_values if 0 <= n <= 1.0]
        if len(probabilities) >= 2:
            avg_prob = sum(probabilities) / len(probabilities)
            if avg_prob > 0.5:
                stats['goal_probability'] = max(stats['goal_probability'], 10)
        
        # 2. BTTS (Both Teams To Score) LIKELIHOOD (0-8 points)
        # Look for patterns suggesting both teams score
        text_lower = raw_text.lower()
        if 'btts' in text_lower or 'both teams' in text_lower:
            stats['btts_likelihood'] = 8
        # If we see balanced percentages (both teams have similar goal probability)
        if len(percentages) >= 4:
            first_half = percentages[:len(percentages)//2]
            second_half = percentages[len(percentages)//2:]
            if first_half and second_half:
                avg_first = sum(first_half) / len(first_half)
                avg_second = sum(second_half) / len(second_half)
                # Balanced percentages suggest both teams can score
                if abs(avg_first - avg_second) < 10:
                    stats['btts_likelihood'] = 6
        
        # 3. OVER TREND ANALYSIS (0-10 points)
        # Look for score patterns indicating high-scoring trends
        score_patterns = re.findall(r'(\d+)\s*[-:]\s*(\d+)', raw_text)
        if score_patterns:
            total_goals = []
            for pattern in score_patterns:
                try:
                    total = int(pattern[0]) + int(pattern[1])
                    total_goals.append(total)
                except:
                    pass
            
            if total_goals:
                avg_goals = sum(total_goals) / len(total_goals)
                if avg_goals >= 3:
                    stats['over_trend'] = 10
                elif avg_goals >= 2.5:
                    stats['over_trend'] = 8
                elif avg_goals >= 2:
                    stats['over_trend'] = 5
        
        # 4. FORM INDICATOR (0-7 points)
        # Look for sequences of numbers that might indicate recent form
        # High numbers in sequence might indicate good attacking form
        if len(num_values) >= 5:
            # Check for upward trends
            recent = num_values[-5:]
            if all(recent[i] <= recent[i+1] for i in range(len(recent)-1)):
                stats['form_indicator'] = 7  # Upward trend
            elif recent[-1] > sum(recent[:-1]) / len(recent[:-1]) * 1.2:
                stats['form_indicator'] = 5  # Recent spike
    
    except Exception:
        pass
    
    return stats

def calculate_match_score(home: str, away: str, league: str, odds: Optional[float], raw_text: str) -> float:
    """
    Calculate confidence score for Over 1.5 goals prediction
    Higher score = better prediction
    
    Scoring system:
    - Odds quality: 0-30 points (lower odds = higher confidence)
    - League quality: 0-20 points (top leagues get more)
    - Statistical data: 0-25 points (from raw text analysis)
    - Team quality: 0-10 points (big teams get bonus)
    - Data completeness: 0-5 points (has odds data)
    """
    score = 0.0
    
    # 1. ODDS QUALITY (0-30 points) - Most important factor
    if odds:
        if odds < 1.3:
            score += 30  # Very confident
        elif odds < 1.5:
            score += 25
        elif odds < 1.7:
            score += 20
        elif odds < 2.0:
            score += 15
        elif odds < 2.5:
            score += 10
        else:
            score += 5  # Higher odds, less confident
    else:
        # Try to extract odds from raw text if not already extracted
        # Look for patterns like "1.5" or "1,5" with nearby numbers
        odds_patterns = [
            r'(\d+[.,]\d+)\s*-\s*(\d+[.,]\d+)',  # Score format
            r'\b(1\.[1-4]\d?|1\.[5-9]|2\.[0-4])\b',  # Potential odds
        ]
        for pattern in odds_patterns:
            matches = re.findall(pattern, raw_text)
            if matches:
                try:
                    # Try to find the most likely over 1.5 odds
                    for match in matches:
                        if isinstance(match, tuple):
                            val = float(match[0].replace(',', '.'))
                        else:
                            val = float(match.replace(',', '.'))
                        if 1.1 <= val <= 2.5:
                            odds = val
                            if odds < 1.5:
                                score += 25
                            elif odds < 2.0:
                                score += 15
                            elif odds < 2.5:
                                score += 10
                            break
                except:
                    pass
    
    # 2. LEAGUE QUALITY (0-20 points)
    league_lower = league.lower()
    
    # Top tier leagues (Europe's top 5 + Champions League)
    top_tier = ['premier', 'champions league', 'la liga', 'serie a', 'bundesliga', 'ligue 1']
    # Second tier (good European leagues)
    second_tier = ['europa', 'championship', 'primeira', 'eredivisie', 'super lig', 'russian premier']
    # Asian/Other competitive leagues
    asian_tier = ['japan', 'korea', 'china', 'australia', 'saudi', 'qatar', 'uae']
    # Lower tier but still recognized
    lower_tier = ['new zealand', 'thailand', 'indonesia', 'malaysia', 'singapore']
    
    league_score = 0
    for tier_name in top_tier:
        if tier_name in league_lower:
            league_score = 20
            break
    if league_score == 0:
        for tier_name in second_tier:
            if tier_name in league_lower:
                league_score = 15
                break
    if league_score == 0:
        for tier_name in asian_tier:
            if tier_name in league_lower:
                league_score = 12
                break
    if league_score == 0:
        for tier_name in lower_tier:
            if tier_name in league_lower:
                league_score = 8
                break
    
    score += league_score
    
    # Penalty for unknown league
    if league == "Unknown League":
        score -= 10
    
    # 3. STATISTICAL DATA FROM RAW TEXT (0-25 points)
    # Look for percentage patterns (e.g., "34.4 38.2 27.4" might be goal probabilities)
    # Look for patterns that suggest high-scoring matches
    stats_score = 0
    
    # Extract numbers that might be statistics
    numbers = re.findall(r'\b(\d+[.,]\d+)\b', raw_text)
    if numbers:
        try:
            # Convert to floats and analyze
            num_values = [float(n.replace(',', '.')) for n in numbers[:10]]  # First 10 numbers
            
            # If we see high percentages (30-50 range), might indicate goal probabilities
            high_percentages = [n for n in num_values if 25 <= n <= 60]
            if len(high_percentages) >= 2:
                # Average of percentages might indicate goal likelihood
                avg_pct = sum(high_percentages) / len(high_percentages)
                if avg_pct > 40:
                    stats_score += 15  # High goal probability
                elif avg_pct > 35:
                    stats_score += 10
                elif avg_pct > 30:
                    stats_score += 5
            
            # Look for score patterns (e.g., "1 - 1", "2 - 1")
            score_pattern = re.search(r'(\d+)\s*-\s*(\d+)', raw_text)
            if score_pattern:
                home_goals = int(score_pattern.group(1))
                away_goals = int(score_pattern.group(2))
                total = home_goals + away_goals
                if total >= 3:
                    stats_score += 10  # High scoring match
                elif total >= 2:
                    stats_score += 5
        except:
            pass
    
    score += stats_score
    
    # 4. TEAM QUALITY (0-10 points)
    home_lower = home.lower()
    away_lower = away.lower()
    
    # Big European teams
    big_teams = ['real madrid', 'barcelona', 'manchester united', 'manchester city', 
                 'liverpool', 'chelsea', 'arsenal', 'bayern', 'psg', 'juventus', 
                 'milan', 'inter', 'atletico', 'dortmund']
    # Good teams (less famous but still strong)
    good_teams = ['united', 'city', 'fc', 'sporting', 'benfica', 'porto', 'ajax', 'psv']
    
    team_score = 0
    for team in big_teams:
        if team in home_lower or team in away_lower:
            team_score = 10
            break
    if team_score == 0:
        for team in good_teams:
            if team in home_lower or team in away_lower:
                team_score = 5
                break
    
    score += team_score
    
    # 5. TEXT ANALYSIS (0-5 points)
    text_lower = raw_text.lower()
    positive_indicators = ['over', 'goals', 'scoring', 'attack', 'offensive', 'high', 'many', 'btts']
    negative_indicators = ['defensive', 'low', 'few', 'under', '0-0']
    
    text_score = 0
    for indicator in positive_indicators:
        if indicator in text_lower:
            text_score += 2
            break
    
    for indicator in negative_indicators:
        if indicator in text_lower:
            text_score -= 3
            break
    
    score += text_score
    
    # 6. DATA COMPLETENESS BONUS (0-5 points)
    if odds:
        score += 5
    
    # 7. MATCH CONTEXT ANALYSIS (0-36 points)
    context = analyze_match_context(home, away, league, raw_text)
    score += context['derby_score']
    score += context['cup_match']
    score += context['rivalry']
    score += context['time_factor']
    score += context['league_scoring_rate']
    
    # 8. ADVANCED STATISTICAL ANALYSIS (0-37 points)
    advanced_stats = advanced_statistical_analysis(raw_text)
    score += advanced_stats['goal_probability']
    score += advanced_stats['btts_likelihood']
    score += advanced_stats['over_trend']
    score += advanced_stats['form_indicator']
    
    # 9. TEAM NAME PATTERN ANALYSIS (0-8 points)
    # More sophisticated team name analysis
    home_lower = home.lower()
    away_lower = away.lower()
    
    # Teams with "United" often play attacking football
    if 'united' in home_lower or 'united' in away_lower:
        score += 3
    
    # Teams with "City" often have good attacking records
    if 'city' in home_lower or 'city' in away_lower:
        score += 2
    
    # Teams with "FC" or "Football Club" - professional teams
    if 'fc' in home_lower or 'fc' in away_lower:
        score += 2
    
    # Teams with "Athletic" or "Athletico" - often competitive
    if 'athletic' in home_lower or 'athletic' in away_lower:
        score += 1
    
    # 10. LEAGUE COMPETITIVENESS (0-6 points)
    # More competitive leagues tend to have more goals
    competitive_leagues = ['japan', 'korea', 'thailand', 'indonesia', 'australia']
    league_lower = league.lower()
    for comp_league in competitive_leagues:
        if comp_league in league_lower:
            score += 6
            break
    
    # 11. MATCH TIMING OPTIMIZATION (0-4 points)
    # Weekend matches often have more goals (but we can't detect this from data)
    # Instead, use time of day (already in context, but add bonus for prime time)
    time_match = re.search(r'(\d{1,2}):(\d{2})', raw_text)
    if time_match:
        hour = int(time_match.group(1))
        # Prime time slots (19:00-21:00) are best
        if 19 <= hour <= 21:
            score += 4
        elif 17 <= hour <= 22:
            score += 2
    
    # 12. ENSEMBLE BONUS (0-5 points)
    # Bonus for matches that score well across multiple factors
    factor_count = 0
    if odds: factor_count += 1
    if league_score > 0: factor_count += 1
    if stats_score > 0: factor_count += 1
    if team_score > 0: factor_count += 1
    if context['derby_score'] > 0 or context['cup_match'] > 0: factor_count += 1
    if advanced_stats['goal_probability'] > 0: factor_count += 1
    
    if factor_count >= 5:
        score += 5  # Excellent across all factors
    elif factor_count >= 4:
        score += 3
    elif factor_count >= 3:
        score += 1
    
    return round(score, 2)

def select_best_12(matches: List[Dict]) -> List[Dict]:
    """Select top 12 matches based on score"""
    if len(matches) <= 12:
        return matches
    
    # Verify all matches have scores
    scored_matches = [m for m in matches if 'score' in m]
    unscored_count = len(matches) - len(scored_matches)
    
    if unscored_count > 0:
        debug_print(f"⚠️  Warning: {unscored_count} matches without scores")
    
    # Sort ALL matches by score (descending)
    sorted_matches = sorted(matches, key=lambda x: x.get('score', 0), reverse=True)
    
    # Show score distribution
    if sorted_matches:
        scores = [m.get('score', 0) for m in sorted_matches]
        debug_print(f"📊 Scoring complete: {len(sorted_matches)} matches analyzed")
        debug_print(f"   Score range: {min(scores):.1f} - {max(scores):.1f}")
        debug_print(f"   Average score: {sum(scores)/len(scores):.1f}")
    
    # Take top 12
    best_12 = sorted_matches[:12]
    
    debug_print(f"🏆 Selected top 12 from {len(sorted_matches)} total matches")
    debug_print(f"   Top score: {best_12[0].get('score', 0):.1f}, Bottom: {best_12[-1].get('score', 0):.1f}")
    
    return best_12

def format_for_firestore(matches: List[Dict], date_str: Optional[str] = None) -> Dict:
    """Format matches for Firestore storage"""
    if date_str:
        try:
            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
        except:
            date_obj = datetime.now()
    else:
        date_obj = datetime.now()
    
    # Format date ID: DD-MM-YYYY
    date_id = date_obj.strftime('%d-%m-%Y')
    
    # Get day of week
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    day_of_week = days[date_obj.weekday()]
    
    # Get week ID (Monday to Sunday)
    monday = date_obj - timedelta(days=date_obj.weekday())
    sunday = monday + timedelta(days=6)
    week_id = f"{monday.strftime('%d')}-{sunday.strftime('%d')}-{monday.strftime('%m')}-{monday.strftime('%Y')}"
    
    predictions = []
    for i, match in enumerate(matches):
        pred_id = f"{match['home'].lower().replace(' ', '-')}-vs-{match['away'].lower().replace(' ', '-')}-{match['timeLabel'].replace(':', '-')}"
        
        prediction = {
            'id': pred_id,
            'home': match['home'],
            'away': match['away'],
            'timeLabel': match['timeLabel'],
            'league': match['league'],
            'betType': 'Over 1.5 Goals',
            'confidence': f"Score: {match.get('score', 0)}",
            'approved': True,
            'source': 'betistuta',
            'scrapedAt': datetime.now().isoformat(),
            'overOdds': match.get('overOdds'),
            'score': match.get('score', 0),
        }
        predictions.append(prediction)
    
    return {
        'dateId': date_id,
        'weekId': week_id,
        'dayOfWeek': day_of_week,
        'predictions': predictions,
        'createdAt': datetime.now().isoformat(),
        'updatedAt': datetime.now().isoformat(),
    }

def main():
    """Main execution"""
    # Get date from command line or use today
    date_str = sys.argv[1] if len(sys.argv) > 1 else None
    
    if date_str:
        debug_print(f"📅 Scraping predictions for: {date_str}")
    else:
        debug_print(f"📅 Scraping predictions for today")
    
    # Scrape matches
    all_matches = scrape_betistuta(date_str)
    
    if not all_matches:
        debug_print("❌ No matches found")
        sys.exit(1)
    
    # Select best 12
    best_12 = select_best_12(all_matches)
    
    # Format for Firestore
    firestore_data = format_for_firestore(best_12, date_str)
    
    # Output JSON
    output = {
        'success': True,
        'date': firestore_data['dateId'],
        'matches': best_12,
        'firestore': firestore_data,
        'totalScraped': len(all_matches),
        'selected': len(best_12),
    }
    
    # Output JSON to stdout (for piping to save script)
    # Debug messages go to stderr
    print(json.dumps(output, indent=2, ensure_ascii=False), file=sys.stdout)
    
    return 0

if __name__ == '__main__':
    sys.exit(main())

