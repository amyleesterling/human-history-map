#!/usr/bin/env python3
"""Extract exact source polygons for review. Never writes runtime datasets."""
import argparse
import hashlib
import json
import math
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('source', type=Path)
p.add_argument('output', type=Path)
p.add_argument('--name', required=True)
p.add_argument('--sha256', required=True)
a = p.parse_args()
repo = Path(__file__).resolve().parents[3]
allowed = repo / 'data/research/border-samples'
if not a.output.resolve().is_relative_to(allowed.resolve()):
    p.error('Output must be inside data/research/border-samples')
raw = a.source.read_bytes()
if hashlib.sha256(raw).hexdigest() != a.sha256:
    p.error('Source checksum changed; inspect new version before extracting')
data = json.loads(raw)
assert data['type'] == 'FeatureCollection'
features = [f for f in data['features'] if f['properties'].get('Name', f['properties'].get('cntry_name')) == a.name]
assert features, 'No exact source name match'
for f in features:
    g = f['geometry']
    assert g['type'] in ('Polygon', 'MultiPolygon')
    polygons = [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
    for poly in polygons:
        for ring in poly:
            assert len(ring) >= 4 and ring[0] == ring[-1], 'Unclosed ring'
            for xy in ring:
                assert all(isinstance(v, (int, float)) and math.isfinite(v) for v in xy)
                assert -180 <= xy[0] <= 180 and -90 <= xy[1] <= 90
    q = f['properties']
    if 'From' in q:
        assert isinstance(q['From'], int) and q['From'] <= q['To']
    else:
        import datetime
        start = datetime.date(q['gwsyear'], q['gwsmonth'], q['gwsday'])
        end = datetime.date(q['gweyear'], q['gwemonth'], q['gweday'])
        assert start <= end
features.sort(key=lambda f: (f['properties'].get('From', f['properties'].get('gwsyear')), f['properties'].get('gwsmonth', 1), f['properties'].get('gwsday', 1)))
a.output.write_text(json.dumps({'type': 'FeatureCollection', 'features': features}, separators=(',', ':')) + '\n')
print(json.dumps({'features': len(features), 'sourceSha256': a.sha256, 'outputSha256': hashlib.sha256(a.output.read_bytes()).hexdigest(), 'geometry': 'unchanged', 'runtimeReady': False}))
