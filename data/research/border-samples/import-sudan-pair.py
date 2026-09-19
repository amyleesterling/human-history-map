#!/usr/bin/env python3
"""Stage a paired Sudan transition; no runtime mutation or date interpolation."""
import datetime as dt
import hashlib
import json
from pathlib import Path
import sys

source = Path(sys.argv[1])
raw = source.read_bytes()
digest = '384b1ea90b9419f30a858d7ec237c85a22c60d1b35b5f85f215a1204f9989d42'
assert hashlib.sha256(raw).hexdigest() == digest, 'Review changed upstream bytes first'
out = Path(__file__).resolve().parent
def date(q, side):
    return dt.date(q['gw'+side+'year'], q['gw'+side+'month'], q['gw'+side+'day'])
def decimal_date(d):
    a = dt.date(d.year, 1, 1)
    return d.year + (d-a).days / (dt.date(d.year+1, 1, 1)-a).days
features = []
for f in json.loads(raw)['features']:
    q = f['properties']
    if q['cntry_name'] not in ('Sudan', 'South Sudan'):
        continue
    start, end = date(q, 's'), date(q, 'e')
    if end < dt.date(2010, 1, 1) or start >= dt.date(2020, 1, 1):
        continue
    civ = {'Sudan':'sudan', 'South Sudan':'south-sudan'}[q['cntry_name']]
    features.append({'type':'Feature','properties':{
        'civ':civ, 'from':max(2010,decimal_date(start)),
        'to':min(2020,decimal_date(end+dt.timedelta(days=1))),
        'precision':1, 'sourceId':'cshapes-global', 'sourceSha256':digest,
        'sourceStartDate':start.isoformat(),'sourceEndDateInclusive':end.isoformat(),
        'sourceProperties':q,'reviewStatus':'pending_independent_review',
        'dateEncoding':'decimal Gregorian year, Jan 1 = integer; exact dates retained',
        'boundaryMeaning':'source-coded legal territory; disputed sectors not independently checked'
    },'geometry':f['geometry']})
assert len(features) == 3
features.sort(key=lambda f:(f['properties']['from'],f['properties']['civ']))
(out/'cshapes-sudan-pair.candidate.geojson').write_text(json.dumps({'type':'FeatureCollection','features':features},separators=(',',':'))+'\n')
print(json.dumps({'features':len(features),'output':'cshapes-sudan-pair.candidate.geojson','runtimeReady':False}))
