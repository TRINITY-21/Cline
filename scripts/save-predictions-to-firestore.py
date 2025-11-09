#!/usr/bin/env python3
"""
Save predictions to Firestore using Firebase Admin SDK
Takes JSON from scrape-betistuta-predictions.py and saves to Firestore
"""

import json
import sys
import os
from datetime import datetime
from typing import Dict, Any

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:
    print("❌ firebase-admin not installed. Run: pip install firebase-admin")
    sys.exit(1)

def init_firebase():
    """Initialize Firebase Admin SDK"""
    if not firebase_admin._apps:
        # Try to get credentials from environment
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
            # Try default credentials
            try:
                firebase_admin.initialize_app()
            except Exception as e:
                print(f"❌ Error initializing Firebase: {e}")
                print("Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_FILE")
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

def save_predictions(db, firestore_data: Dict[str, Any]) -> bool:
    """Save predictions to Firestore"""
    try:
        week_id = firestore_data['weekId']
        day_of_week = firestore_data['dayOfWeek']
        date_id = firestore_data['dateId']
        predictions = firestore_data['predictions']
        
        # Path: over_predictions/{weekId}/{dayOfWeek}/{dateId}
        week_ref = db.collection('over_predictions').document(week_id)
        day_col = week_ref.collection(day_of_week)
        date_doc = day_col.document(date_id)
        
        # Get existing data
        existing_doc = date_doc.get()
        existing_data = existing_doc.to_dict() if existing_doc.exists else {}
        existing_predictions = existing_data.get('predictions', [])
        
        # Create map of existing predictions by ID
        existing_map = {pred.get('id'): i for i, pred in enumerate(existing_predictions)}
        
        # Merge new predictions
        updated_count = 0
        new_count = 0
        
        for new_pred in predictions:
            pred_id = new_pred.get('id')
            if pred_id in existing_map:
                # Update existing
                existing_predictions[existing_map[pred_id]] = {
                    **existing_predictions[existing_map[pred_id]],
                    **new_pred,
                    'updatedAt': datetime.now().isoformat(),
                }
                updated_count += 1
            else:
                # Add new
                new_pred['createdAt'] = datetime.now().isoformat()
                existing_predictions.append(new_pred)
                new_count += 1
        
        # Save to Firestore
        now = datetime.now().isoformat()
        date_doc.set({
            'id': date_id,
            'date': date_id,
            'weekId': week_id,
            'dayOfWeek': day_of_week,
            'predictions': existing_predictions,
            'updatedAt': now,
            'createdAt': existing_data.get('createdAt', now),
        }, merge=True)
        
        # Create week document if it doesn't exist
        week_ref.set({'id': week_id, 'createdAt': now}, merge=True)
        
        print(f"✅ Saved {new_count} new, {updated_count} updated predictions")
        return True
        
    except Exception as e:
        print(f"❌ Error saving to Firestore: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main execution"""
    # Read JSON from stdin or file
    if len(sys.argv) > 1:
        with open(sys.argv[1], 'r') as f:
            content = f.read()
    else:
        content = sys.stdin.read()
    
    # Extract JSON from mixed output (debug messages + JSON)
    # Find the first '{' which should be the start of JSON
    json_start = content.find('{')
    if json_start == -1:
        print("❌ No JSON found in input")
        sys.exit(1)
    
    json_content = content[json_start:]
    try:
        data = json.loads(json_content)
    except json.JSONDecodeError as e:
        print(f"❌ Error parsing JSON: {e}")
        print(f"First 500 chars of content: {content[:500]}")
        sys.exit(1)
    
    if not data.get('success'):
        print("❌ Scraping failed")
        sys.exit(1)
    
    firestore_data = data.get('firestore')
    if not firestore_data:
        print("❌ No Firestore data in input")
        sys.exit(1)
    
    # Initialize Firebase
    db = init_firebase()
    
    # Save predictions
    success = save_predictions(db, firestore_data)
    
    if success:
        print(f"✅ Successfully saved predictions for {firestore_data['dateId']}")
        sys.exit(0)
    else:
        print("❌ Failed to save predictions")
        sys.exit(1)

if __name__ == '__main__':
    from datetime import timedelta
    main()

