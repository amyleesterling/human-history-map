#!/usr/bin/env node
// Normalize research packets without mistaking structural checks for historical
// verification. Independent reviewers still read the cited sources themselves.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const errors=[];
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const walk=dir=>fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(`${dir}/${e.name}`):[`${dir}/${e.name}`]);
const pointer=(obj,p)=>p.split('/').slice(1).reduce((v,k)=>v?.[k.replace(/~1/g,'/').replace(/~0/g,'~')],obj);
const records=[];
for(const file of walk('data/research/regions').filter(f=>f.endsWith('/evidence.json'))){
  const doc=read(file);
  const sourceMap=new Map(Array.isArray(doc.sources)?doc.sources.map(s=>[s.id,s]):Object.entries(doc.sources||{}));
  const entities=doc.entities||doc.records||[doc];
  for(const entity of entities){
    let cardPath=entity.cardFile||entity.cardPath||entity.card||entity.proposedCard||entity.proposedCardPath||entity.path;
    if(!cardPath){errors.push(`${file}: no card path for ${entity.id}`);continue;}
    if(!fs.existsSync(path.join(root,cardPath))) cardPath=path.join(path.dirname(file),cardPath);
    if(!fs.existsSync(path.join(root,cardPath))){errors.push(`${file}: absent card ${cardPath}`);continue;}
    const bytes=fs.readFileSync(path.join(root,cardPath));
    const card=JSON.parse(bytes);
    if(card.id!==entity.id)errors.push(`${file}: card ID mismatch for ${entity.id}`);
    const claims=[];
    for(const claim of entity.claims||[]){
      const p=claim.pointer||claim.path||claim.cardPath;
      if(!p||pointer(card,p)===undefined)errors.push(`${file}: invalid claim pointer ${p} for ${entity.id}`);
      const ids=[...new Set([...(claim.sourceIds||claim.sources||(claim.sourceId?[claim.sourceId]:[])),...(claim.additionalSourceIds||[])])];
      if(!ids.length)errors.push(`${file}: claim without source ${entity.id}${p}`);
      const sources=ids.map(id=>{
        const s=sourceMap.get(id);
        if(!s){errors.push(`${file}: unknown source ${id}`);return null;}
        if(!s.url||!/^https?:\/\//.test(s.url))errors.push(`${file}: source lacks URL ${id}`);
        return {id,url:s.url,locator:claim.locator||s.locator||s.section||null};
      }).filter(Boolean);
      claims.push({pointer:p,sources});
    }
    const overviewIds=entity.overviewEvidence||entity.overviewSourceIds||[];
    if(card.overview&&!claims.some(c=>c.pointer==='/overview')&&overviewIds.length){
      claims.push({pointer:'/overview',sources:overviewIds.map(id=>{
        const s=sourceMap.get(id);
        if(!s){errors.push(`${file}: unknown overview source ${id}`);return {id};}
        return {id,url:s.url,locator:s.locator||s.section||null};
      })});
    }
    const required=[];
    if(card.overview)required.push('/overview');
    for(const [i,section] of (card.sections||[]).entries())for(const [j,item] of (section.items||[]).entries())if(item.text)required.push(`/sections/${i}/items/${j}/text`);
    if(card.fall?.text)required.push('/fall/text');
    const unmapped=required.filter(p=>!claims.some(c=>p===c.pointer||p.startsWith(c.pointer+'/')));
    if(unmapped.length)errors.push(`${file}: unmapped card text ${entity.id}: ${unmapped.join(', ')}`);
    const urls=[...new Set(claims.flatMap(c=>c.sources.map(s=>s.url)).filter(Boolean))];
    records.push({id:entity.id,cardPath,evidenceFile:file,researcher:doc.researcher||doc.owner||doc.region,cardSha256:crypto.createHash('sha256').update(bytes).digest('hex'),placement:cardPath.startsWith('data/cards/')?'runtime_candidate':'staged',status:'source_checked_pending_independent_review',sourceUrls:urls,claims,unmappedText:unmapped});
  }
}
records.sort((a,b)=>a.id.localeCompare(b.id));
const catalog={version:1,scope:'Research packets only. Structural verification does not certify truth, historical identity, chronology, frontiers or complete civilization coverage.',asiaOwner:'QWEN',totals:{packets:records.length,runtimeCandidates:records.filter(r=>r.placement==='runtime_candidate').length,staged:records.filter(r=>r.placement==='staged').length,claimMappings:records.reduce((n,r)=>n+r.claims.length,0),distinctSourceUrls:new Set(records.flatMap(r=>r.sourceUrls)).size},records};
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
else{
 fs.writeFileSync(path.join(root,'data/research/catalog.json'),JSON.stringify(catalog,null,2)+'\n');
 console.log(JSON.stringify(catalog.totals));
}
