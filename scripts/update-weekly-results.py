#!/usr/bin/env python3
"""
Run the daily prediction result updater for an entire week.

This script loops through every day in a target week, fetches the 12 saved
predictions from Firestore for that day, scrapes the final scores, and then
updates Firestore with the results. It reuses the logic that already powers
`update-prediction-results.py` and `update-results-in-firestore.py`.

Usage:
    # Default: use the current week (Monday-Sunday)
    python3 scripts/update-weekly-results.py

    # Provide any date inside the week you want to process
    python3 scripts/update-weekly-results.py --week 2025-11-17

Make sure GOOGLE_APPLICATION_CREDENTIALS (or FIREBASE_SERVICE_ACCOUNT_FILE /
FIREBASE_SERVICE_ACCOUNT_JSON) is set so Firebase Admin SDK can authenticate.
"""

from __future__ import annotations

import argparse
import importlib.util
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

SCRIPT_DIR = Path(__file__).resolve().parent


def _load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Unable to load module {name} from {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


UPDATE_DAILY = _load_module(
    SCRIPT_DIR / "update-prediction-results.py",
    "update_prediction_results_module",
)

UPDATE_FIRESTORE = _load_module(
    SCRIPT_DIR / "update-results-in-firestore.py",
    "update_results_firestore_module",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Update weekly prediction results using Firestore data."
    )
    parser.add_argument(
        "--week",
        help="Any date inside the target week (YYYY-MM-DD). Defaults to today.",
    )
    parser.add_argument(
        "--days",
        nargs="*",
        choices=["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
        help="Optional subset of days to process (e.g. --days mon tue wed).",
    )
    return parser.parse_args()


def get_week_dates(reference: datetime) -> List[datetime]:
    monday = reference - timedelta(days=reference.weekday())
    return [monday + timedelta(days=i) for i in range(7)]


def run_for_date(db, date_obj: datetime) -> Dict[str, Any]:
    date_str = date_obj.strftime("%Y-%m-%d")
    print(f"\n📅 Processing {date_str}")

    predictions = UPDATE_DAILY.fetch_predictions_from_firestore(db, date_str)
    if not predictions:
        return {"date": date_str, "status": "skipped", "reason": "no_predictions"}

    results = UPDATE_DAILY.scrape_results_for_predictions(date_str, predictions)
    if not results:
        return {"date": date_str, "status": "skipped", "reason": "no_results"}

    success = UPDATE_FIRESTORE.update_predictions_with_results(
        db, date_str, list(results.values())
    )
    return {
        "date": date_str,
        "status": "updated" if success else "failed",
        "resultsFound": len(results),
    }


def filter_days(week_dates: List[datetime], days_filter: Optional[List[str]]) -> List[datetime]:
    if not days_filter:
        return week_dates

    allowed = {d[:3].lower() for d in days_filter}
    mapped: Dict[str, datetime] = {
        "mon": week_dates[0],
        "tue": week_dates[1],
        "wed": week_dates[2],
        "thu": week_dates[3],
        "fri": week_dates[4],
        "sat": week_dates[5],
        "sun": week_dates[6],
    }

    return [mapped[day] for day in allowed if day in mapped]


def main() -> int:
    args = parse_args()

    if args.week:
        try:
            reference_date = datetime.strptime(args.week, "%Y-%m-%d")
        except ValueError:
            print("❌ --week must be in YYYY-MM-DD format")
            return 1
    else:
        reference_date = datetime.now()

    week_dates = get_week_dates(reference_date)
    week_dates = filter_days(week_dates, args.days)

    db = UPDATE_DAILY.init_firebase()

    summary: List[Dict[str, Any]] = []
    for date_obj in week_dates:
        try:
            summary.append(run_for_date(db, date_obj))
        except Exception as exc:  # pragma: no cover - defensive logging
            summary.append(
                {
                    "date": date_obj.strftime("%Y-%m-%d"),
                    "status": "failed",
                    "reason": str(exc),
                }
            )
            print(f"❌ Error processing {date_obj:%Y-%m-%d}: {exc}")

    updated = sum(1 for item in summary if item["status"] == "updated")
    skipped = [item for item in summary if item["status"] == "skipped"]
    failures = [item for item in summary if item["status"] == "failed"]

    print("\n======================= Weekly Summary =======================")
    print(f"Processed days: {len(summary)}")
    print(f"Updated days : {updated}")
    if skipped:
        print(f"Skipped      : {len(skipped)} -> {[item['date'] for item in skipped]}")
    if failures:
        print(f"Failures     : {len(failures)} -> {[item['date'] for item in failures]}")
    print("=============================================================\n")

    return 0 if not failures else 1


if __name__ == "__main__":
    sys.exit(main())

