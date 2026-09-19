#!/usr/bin/env python3
"""Reproduce a source-pinned, research-only Sudan neighborhood comparison."""
import datetime as dt
import hashlib
import json
import sys
from pathlib import Path
from shapely.geometry import shape, mapping
from shapely.ops import unary_union
from pyproj import Geod

OUT = Path(__file__).resolve().parent
REPO = OUT.parents[2]
SOURCE_SHA = '384b1ea90b9419f30a858d7ec237c85a22c60d1b35b5f85f215a1204f9989d42'
raw = Path(sys.argv[1]).read_bytes()
assert hashlib.sha256(raw).hexdigest() == SOURCE_SHA, 'Changed source requires review'
features = json.loads(raw)['features']
geod = Geod(ellps='WGS84')
def date(p, side):
    return dt.date(p['gw'+side+'year'],p['gw'+side+'month'],p['gw'+side+'day'])
def active(f, day):
    p=f['properties'];return date(p,'s') <= day <= date(p,'e')
def area(g):
    # Orient rings before ellipsoidal area integration, not a historical area claim.
    from shapely.geometry.polygon import orient
    if g.is_empty: return 0
    if g.geom_type == 'Polygon': return abs(geod.geometry_area_perimeter(orient(g,sign=1))[0])/1e6
    return sum(area(x) for x in g.geoms) if hasattr(g,'geoms') else 0

# Meaningful endpoint regression: annual frames must not move the event itself.
for event_day, expected in [('2011-07-08',[625]),('2011-07-09',[625,626])]:
    present=sorted(f['properties']['gwcode'] for f in features
                   if f['properties']['gwcode'] in (625,626)
                   and active(f,dt.date.fromisoformat(event_day)))
    assert present == expected, (event_day,present)
day=dt.date(2011,12,31)
world=[f for f in features if active(f,day)]
pair=[f for f in world if f['properties']['gwcode'] in (625,626)]
assert len(pair)==2
outline=unary_union([shape(f['geometry']) for f in pair])
near=[f for f in world if f not in pair and shape(f['geometry']).distance(outline)<0.01]
# The proximity threshold selects research candidates, not political adjacency.
selected=pair+near
rows=[]
for f in near:
    g=shape(f['geometry']);inter=g.intersection(outline)
    rows.append({'name':f['properties']['cntry_name'],'gwcode':f['properties']['gwcode'],
                 'valid':g.is_valid,'intersectionKm2Diagnostic':area(inter),
                 'intersectionSquareDegrees':inter.area,'distanceDegrees':g.distance(outline)})
background=json.loads((REPO/'data/research/border-samples/world-2010-without-sudan.candidate.geojson').read_text())
mixed=[]
for f in background['features']:
    g=shape(f['geometry'])
    if not g.is_valid: continue
    inter=g.intersection(outline)
    if inter.area>1e-10:
        mixed.append({'civ':f['properties']['civ'],'intersectionKm2Diagnostic':area(inter),
                      'intersectionSquareDegrees':inter.area,'bounds':list(inter.bounds)})
# Annual frames are explicit observations, never inferred source event dates.
frames=[]
for year in [2010,2011,2012,2019]:
    frames.append({'year':year,'january1':[f['properties']['cntry_name'] for f in features if f['properties']['gwcode'] in (625,626) and active(f,dt.date(year,1,1))],
                   'december31':[f['properties']['cntry_name'] for f in features if f['properties']['gwcode'] in (625,626) and active(f,dt.date(year,12,31))]})
qa={'sourceSha256':SOURCE_SHA,'observationDate':day.isoformat(),'runtimeReady':False,
    'sameSourceNeighbors':rows,'mixedSourceOverlaps':mixed,'annualFrames':frames,
    'limitations':['Areas are ellipsoidal geometry diagnostics, not researched disputed-territory sizes.',
    'A distance under 0.01 degrees selects nearby features; it is not a researched adjacency claim.',
    'No geometry clipped, repaired, rounded or simplified. No runtime files written.',
    'Replacing neighbors moves mixed-source seams outward; a region patch still requires outer-edge review.']}
(OUT/'sudan-neighbor-qa.json').write_text(json.dumps(qa,indent=2)+'\n')
(OUT/'cshapes-neighborhood-2011-12-31.raw.geojson').write_text(json.dumps({'type':'FeatureCollection','features':selected},separators=(',',':'))+'\n')
print(json.dumps({'sameSourceNeighbors':rows,'mixedSourceOverlaps':mixed,'annualFrames':frames},indent=2))
