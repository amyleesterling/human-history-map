import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root = path.resolve(import.meta.dirname, '..');
const read = p => JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const manifest=read('data/manifest.json'), index=new Map();
for(const f of [manifest.civilizations].flat()) for(const c of read(`data/${f}`)) index.set(c.id,{...index.get(c.id),...c});
const catalog=read('data/research/catalog.json');
const ids=read('data/cards/index.json');
const themes={
 materialEvidence:/excavat|archaeolog|inscri|pottery|ceramic|burial|grave|tomb|manuscript|sculpt|remains|artifact|artefact|reservoir|wall|coin|bead|weav/i,
 dailyLife:/daily|food|farm|agricultur|house|home|water|family|families|cattle|fishing|meal|labor|labour/i,
 artsScienceTechnology:/art|scien|technolog|invent|engineer|writing|literatur|music|mathematic|astronom|medicine/i,
 chronologicalPhases:/centur|BCE|CE\b|period|dynast|phase|reign|later|earlier/i,
 endingContinuity:/fell|fall|conquest|annex|conquer|declin|abandon|continu|dissolv|fragment|overthrow|independen|surrender|partition/i,
 uncertainty:/uncertain|debate|interpret|suggest|probably|approximate|unknown|not known|may have|possibly|disagree/i
};
const records=ids.map(id=>{
 const polity=index.get(id), file=`data/${polity?.card||`cards/${id}.json`}`, bytes=fs.readFileSync(path.join(root,file)); const c=JSON.parse(bytes);
 const passages=[{pointer:'/overview',text:c.overview||''},...(c.sections||[]).flatMap((s,i)=>(s.items||[]).map((v,j)=>({pointer:`/sections/${i}/items/${j}/text`,title:s.title,text:v.text||'',year:v.year??null}))),...(c.fall?.text?[{pointer:'/fall/text',text:c.fall.text}]:[]),...(c.ending?.text?[{pointer:'/ending/text',text:c.ending.text}]:[])];
 const dimensions=Object.fromEntries(Object.entries(themes).map(([key,re])=>[key,{status:'unreviewed',candidatePassages:passages.filter(p=>re.test(`${p.title||''} ${p.text}`)).map(p=>p.pointer),question:{materialEvidence:'Does a concrete finding have an identifiable context, date, interpretation and evidence limit?',dailyLife:'Does the account explain ordinary practices with evidence rather than only rulers?',artsScienceTechnology:'Are achievements concrete and correctly attributed to this polity and period?',chronologicalPhases:'Are source-supported phases distinguished from map snapshot dates?',endingContinuity:'Does the narrative identify what ended or continued, with dates, mechanism and uncertainty?',uncertainty:'Are uncertainties attached to particular claims rather than a blanket disclaimer?'}[key]}]));
 const effectiveFall=c.ending||c.fall||polity?.fell;
 const targets=(effectiveFall?.to||[]).map(target=>{const targetId=typeof target==='string'?target:target.civ;const t=index.get(targetId),y=c.ending?effectiveFall?.year:(effectiveFall?.year??polity?.to);return {target,resolvesToId:!!t,year:y??null,dateWithinTargetRecord:!!t&&Number.isInteger(y)&&y>=t.from&&(t.to==null||y<t.to),historicalRelationship:'unreviewed',geometryAtDate:'unreviewed'};});
 return {id,file,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),owner:id==='han-dynasty'?'QWEN': 'Codex',status:'unreviewed_content_depth',sectionTitles:(c.sections||[]).map(s=>s.title),passages,dimensions,endingNavigation:{status:'unreviewed',hasExplicitEnding:!!c.ending?.text,endingStatus:c.ending?.status||null,hasCardFallText:!!c.fall?.text,hasInheritedFallText:!c.fall?.text&&!!polity?.fell?.text,targets},sources:{status:'unreviewed',listed:(c.sources||[]).map(s=>({title:s.title,url:s.url||null})),evidencePackets:catalog.records.filter(r=>r.id===id).map(r=>({path:r.evidenceFile,evidenceTextMatches:r.cardSha256===crypto.createHash('sha256').update(bytes).digest('hex')}))}};
});
const queues=catalog.records.filter(r=>!ids.includes(r.id)).map(r=>({id:r.id,cardPath:r.cardPath,evidenceFile:r.evidenceFile,placement:r.placement,status:'needs_identity_chronology_depth_and_independent_review_before_publication'}));
const out={version:1,method:'Mechanical inventory, not semantic certification. Candidate passages are search hints only. Every dimension remains unreviewed until a named reviewer reads the relevant evidence. A keyword match never means complete; no percentage of civilizations researched is inferred.',totals:{runtimeCards:records.length,existingDossierCandidatesWithoutRuntimeCard:queues.length,depthCertifiedCards:0},priorityOrder:['kerma: requested example; resolve city, pre-Kerma culture and kingdom separately','great-zimbabwe: add concrete findings and qualified political decline','maya: separate local collapses from continuing peoples','runtime cards without explicit ending/continuity: review appropriate scope','existing staged dossiers: resolve identity/date blockers and publish in reviewed regional batches'],records,dossierQueue:queues};
fs.writeFileSync(path.join(root,'data/research/content-depth-audit.json'),JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out.totals));
