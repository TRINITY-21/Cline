#!/usr/bin/env python3
"""
Update prediction results in Firestore
Takes results from update-prediction-results.py and updates Firestore
"""

import json
import sys
import os
from datetime import datetime, timedelta
from typing import Dict, Any, List

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:
    print("❌ firebase-admin not installed. Run: pip install firebase-admin")
    sys.exit(1)

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

def update_predictions_with_results(db, date_str: str, results: List[Dict[str, Any]]) -> bool:
    """Update predictions in Firestore with results"""
    try:
        date_id = get_date_id(date_str)
        week_id = get_week_id(date_str)
        day_of_week = get_day_of_week(date_str)
        
        # Get predictions document
        week_ref = db.collection('over_predictions').document(week_id)
        day_col = week_ref.collection(day_of_week)
        date_doc = day_col.document(date_id)
        
        existing_doc = date_doc.get()
        if not existing_doc.exists:
            print(f"⚠️  No predictions found for {date_id}")
            return False
        
        existing_data = existing_doc.to_dict()
        predictions = existing_data.get('predictions', [])
        
        # Create results lookup
        results_map = {}
        for result in results:
            key = (result['home'].lower(), result['away'].lower())
            results_map[key] = result
        
        # Update predictions
        updated_count = 0
        for pred in predictions:
            home = pred.get('home', '').lower()
            away = pred.get('away', '').lower()
            
            # Try exact match
            key = (home, away)
            if key in results_map:
                result = results_map[key]
                pred['result'] = result['result']
                pred['homeScore'] = result['homeScore']
                pred['awayScore'] = result['awayScore']
                pred['totalGoals'] = result['totalGoals']
                pred['status'] = result['status']
                pred['updatedAt'] = datetime.now().isoformat()
                updated_count += 1
                continue
            
            # Try reverse
            key_reverse = (away, home)
            if key_reverse in results_map:
                result = results_map[key_reverse]
                pred['result'] = f"{result['awayScore']}-{result['homeScore']}"
                pred['homeScore'] = result['awayScore']
                pred['awayScore'] = result['homeScore']
                pred['totalGoals'] = result['totalGoals']
                pred['status'] = result['status']
                pred['updatedAt'] = datetime.now().isoformat()
                updated_count += 1
                continue
        
        # Save updated predictions
        now = datetime.now().isoformat()
        date_doc.update({
            'predictions': predictions,
            'updatedAt': now,
        })
        
        print(f"✅ Updated {updated_count} predictions with results")
        return True
        
    except Exception as e:
        print(f"❌ Error updating Firestore: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main execution"""
    # Read JSON from stdin or file
    if len(sys.argv) > 1:
        with open(sys.argv[1], 'r') as f:
            data = json.load(f)
    else:
        data = json.load(sys.stdin)
    
    if not data.get('success'):
        print("⚠️  No results found")
        sys.exit(0)
    
    date_str = data.get('date')
    results = data.get('results', [])
    
    if not results:
        print("⚠️  No results to update")
        sys.exit(0)
    
    # Initialize Firebase
    db = init_firebase()
    
    # Update predictions
    success = update_predictions_with_results(db, date_str, results)
    
    if success:
        print(f"✅ Successfully updated results for {date_str}")
        sys.exit(0)
    else:
        print("❌ Failed to update results")
        sys.exit(1)

if __name__ == '__main__':
    main()

