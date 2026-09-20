import assert from 'node:assert/strict';
import { cardAssociationErrors } from './lib/card-associations.mjs';
import { HistoryData } from '../js/data.js';

const primary = {id:'primary',from:100,to:200};
const later = {id:'later',from:300,to:400,card:'cards/primary.json'};
const civs = new Map([[primary.id,primary],[later.id,later]]);
const card = {id:'primary',appliesTo:['primary','later'],overview:'Shared history',
  periods:[{from:100,to:400,title:'A supported phase',summary:'Evidence'}]};
assert.deepEqual(cardAssociationErrors({id:'primary'},primary,civs),[]);
assert.ok(cardAssociationErrors({id:'unrelated'},primary,civs).length);
for (const civ of civs.values()) assert.deepEqual(cardAssociationErrors(card,civ,civs),[]);
assert.ok(cardAssociationErrors({...card,appliesTo:['primary','missing']},primary,civs).length);
assert.ok(cardAssociationErrors({...card,appliesTo:['primary','primary']},primary,civs).length);
assert.ok(cardAssociationErrors({...card,appliesTo:['later','unrelated']},primary,civs).length);
assert.ok(cardAssociationErrors(card,primary,new Map([['primary',primary],['later',{...later,card:'cards/wrong.json'}]])).length);

// Real loader: both destinations receive one narrative while retaining distinct
// map identities and intervals. An undeclared ID still has no card.
const data = new HistoryData();
data.civs = civs;
data.manifest = {cards:'cards/{id}.json'};
data.dataDir = 'data/';
data._cardIndex = Promise.resolve(new Set(['primary','later']));
const previousFetch = globalThis.fetch;
const paths = [];
try {
  globalThis.fetch = async url => { paths.push(url); return {ok:true,json:async()=>card}; };
  assert.equal(await data.hasCard('later'),true);
  assert.equal(await data.hasCard('absent'),false);
  assert.deepEqual(await data.card('primary'),card);
  assert.deepEqual(await data.card('later'),card);
  assert.deepEqual(paths,['data/cards/primary.json','data/cards/primary.json']);
  assert.equal(data.civ('later').from,300);
  assert.equal(data.civ('primary').from,100);
} finally { globalThis.fetch = previousFetch; }
console.log('Shared-card association and loader checks passed.');
