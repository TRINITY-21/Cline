from bs4 import BeautifulSoup
from pathlib import Path
from scripts.parse_freeonlink_html import parse_matches_from_iframe


def main():
  html = Path('data/iframe_dump.html').read_text(encoding='utf-8', errors='ignore')
  doc = BeautifulSoup(html, 'html.parser')
  items = parse_matches_from_iframe(doc)
  print('count', len(items))
  for it in items[:12]:
    print(it)


if __name__ == '__main__':
  main()



