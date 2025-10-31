#!/usr/bin/env python3
"""
Save the raw HTML of a page to disk so we can parse it offline later.

Usage:
  python3 scripts/save_page_html.py \
    --url https://freeonlinek.top/football/ \
    --out data/freeonlinek_football.html
"""

import argparse
import requests


DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                 "AppleWebKit/537.36 (KHTML, like Gecko) "
                 "Chrome/126.0 Safari/537.36",
}


def main():
  ap = argparse.ArgumentParser()
  ap.add_argument('--url', required=True)
  ap.add_argument('--out', required=True)
  args = ap.parse_args()

  resp = requests.get(args.url, headers=DEFAULT_HEADERS, timeout=30)
  resp.raise_for_status()
  with open(args.out, 'w', encoding='utf-8') as f:
    f.write(resp.text)
  print(f"Saved HTML from {args.url} -> {args.out} ({len(resp.text)} bytes)")


if __name__ == '__main__':
  main()



