#!/usr/bin/env node
// Review acceptance belongs to specific bytes. A later edit must not inherit
// an independent review of an earlier version without another check.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const catalog=read('data/research/catalog.json');
const byId=new Map(catalog.records.map(r=>[r.id,r]));
const output={};
for(const name of fs.readdirSync(path.join(root,'data/research/reviews')).filter(n=>n.endsWith('.json'))){
 const file=`data/research/reviews/${name}`;
 const doc=read(file);
 for(const r of doc.records||doc.cards||doc.reviews||[]){
  const c=byId.get(r.id);
  if(!c)continue;
  const cardPath=r.reviewedFile||r.cardPath||r.card||r.path||c.cardPath;
  if(!fs.existsSync(path.join(root,cardPath)))continue;
  const hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,cardPath))).digest('hex');
  const expected=r.reviewedFileSha256||r.cardSha256;
  const valid=!!expected&&hash===expected;
  const verdict=key=>{
   const value=r.verdicts?.[key]||r[`${key}Verdict`]||r[key]?.verdict||'unreviewed';
   return key==='narrative' && value==='accept_narrow_introductory_claims' ? 'accepted' : value;
  };
  output[r.id]={
   narrative:valid?verdict('narrative'):'stale_review',
   identity:valid?verdict('identity'):'stale_review',
   chronology:valid?verdict('chronology'):'stale_review',
   geometry:valid?verdict('geometry'):'stale_review',
   reviewer:doc.reviewer,
   reviewFile:file,
   reviewedFile:cardPath,
   reviewedFileSha256:expected||null,
   currentFileSha256:hash,
   hashMatches:valid,
   scope:'Acceptance applies only to the reviewed dimension and documented scope, not full civilization coverage.'
  };
 }
}
fs.writeFileSync(path.join(root,'data/research/accepted-reviews.json'),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({reviewedCards:Object.keys(output).length,narrativesAccepted:Object.values(output).filter(r=>r.narrative==='accepted').length,staleReviews:Object.values(output).filter(r=>!r.hashMatches).length}));
