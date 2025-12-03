import os
import urllib.request
import json
from pathlib import Path
from urllib.parse import urlencode

api_key = None
env_path = Path('.env.local')
if env_path.exists():
    for line in env_path.read_text().splitlines():
        if line.startswith('VITE_ELEVENLABS_API_KEY='):
            api_key = line.split('=',1)[1].strip()
            break
if not api_key:
    raise SystemExit('no key')

def fetch(params):
    url = 'https://api.elevenlabs.io/v1/convai/settings/dashboard?'+urlencode(params)
    req = urllib.request.Request(url, headers={'xi-api-key': api_key})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode('utf-8'))

for rng in ['LAST_7_DAYS','LAST_30_DAYS','ALL_TIME']:
    data = fetch({'range': rng})
    print(rng, list(data.keys()))
    charts = data.get('charts') or []
    for chart in charts:
        print(' -', chart.get('name'), chart.get('type'), list(chart.keys()))
    totals = data.get('totals')
    if totals:
        print(' totals', totals)
