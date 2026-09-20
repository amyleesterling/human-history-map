// Exercise the actual explorer functions with a minimal DOM and controlled
// data transport. This is an interaction-state test, not a phone rendering test.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import * as timeline from '../js/timeline.js';
import { matchingPeriods } from '../js/card-periods.js';
const source = (await readFile(new URL('../js/app.js', import.meta.url), 'utf8'))
  .replace(/^import .*;\r?\n/gm, '').replace(/\r?\nmain\(\);\s*$/, '');
function harness() {
  const nodes = new Map();
  const node = () => ({ hidden: false, textContent: '', href: '', style: {}, dataset: {}, childNodes: [],
    classList: { add() {}, remove() {} }, setAttribute() {}, addEventListener() {},
    replaceChildren() { this.childNodes = []; }, append(...parts) { this.childNodes.push(...parts); } });
  const context = vm.createContext({ ...timeline, matchingPeriods, URLSearchParams, console,
    document: { getElementById(id) { if (!nodes.has(id)) nodes.set(id, node()); return nodes.get(id); }, createElement: node },
    setTimeout: () => 0, clearTimeout() {}, requestAnimationFrame: () => 1, cancelAnimationFrame() {} });
  vm.runInContext(source, context);
  vm.runInContext(`scale = new TimeScale(-3500, 2026); globe = {setPolities(list) {globalThis.drawn = list;}};`, context);
  return { context, nodes, run: code => vm.runInContext(code, context) };
}
// A cached failure must neither recursively queue work nor leave the open
// tooltip pointing to its previous year.
{
  const h = harness();
  h.run(`state.year = 480; state.selected = 'rome';
    data = {yearStatus: () => ({state:'error'}), loadingCount: () => 0,
      isYearReady: () => false, featuresOf: () => [], civ: () => ({id:'rome',name:'Rome',from:-27,to:476})};
    els.tipMore.href = 'civ.html?id=rome&year=475'; refreshPolities();`);
  assert.match(h.nodes.get('tipMore').href, /year=480$/, 'error year must update More info');
  assert.ok(h.nodes.get('hint').textContent.includes('480'));
}
// At high speed the intended next frame can cross a snapshot seam even
// when the next single year is still loaded.
{
  const h = harness();
  h.run(`state.year=99; state.time=99; state.speed=100; state.playing=true; lastTick=0;
    globalThis.loaded=[];
    data={isYearReady: y => y < 105, yearStatus: () => ({state:'loading'}),
      ensureYear: y => {globalThis.loaded.push(y); return Promise.resolve();}, loadingCount:()=>1};
    globalThis.changed=[]; setYear = y => {globalThis.changed.push(y);}; tick(100);`);
  assert.equal(h.context.changed.length, 0, 'do not advance into unloaded frame');
  assert.ok(h.context.loaded.includes(109), 'request the actual next frame');
}
// A summary response is allowed to arrive after scrubbing, but all temporal
// context and destination links must use the current year.
{
  const h = harness();
  h.run(`state.year=200; state.selected='rome'; state.tipCardId='rome';
    state.tipCard={periods:[{from:100,to:300,summary:'Middle period'}]};
    state.tipSummary={text:'Lifetime summary'};
    data={featuresOf:()=>[{}],yearStatus:()=>({state:"ready"})}; syncTipTime({id:'rome',name:'Rome',from:-27,to:476});`);
  assert.match(h.nodes.get('tipMore').href, /year=200$/);
  assert.match(h.nodes.get('tipSummary').textContent, /Middle period/);
  h.run(`state.year=400; syncTipTime({id:'rome',name:'Rome',from:-27,to:476});`);
  assert.match(h.nodes.get('tipMore').href, /year=400$/);
  assert.match(h.nodes.get('tipSummary').textContent, /Lifetime summary/);
}
// A slow first search cannot overwrite a later selection or a dated link.
{
  const h = harness();
  h.run(`globalThis.finishFirst = null; globalThis.selections=[];
    setYear = y => {state.year=y; navigationVersion++;};
    select = id => {globalThis.selections.push(id);}; showTip = () => {};
    globe.focusFeatures = () => {};
    data={civ:id=>({id,from:1,to:500}), featuresOf:()=>[{}],
      ensureYear:y=> y===100 ? new Promise(resolve=>{globalThis.finishFirst=resolve;}) : Promise.resolve()};
    globalThis.first=jumpToCiv('first',100); globalThis.second=jumpToCiv('second',200);`);
  await h.context.second;
  h.context.finishFirst();
  await h.context.first;
  assert.deepEqual([...h.context.selections], ['second']);
  assert.equal(h.run('state.year'), 200);
}
// Scrubbing through zero normalizes URLs and displayed state consistently.
{
  const h = harness();
  h.run(`refreshPolities = () => {}; setYear(0);`);
  assert.equal(h.run('state.year'), 1);
  assert.equal(h.nodes.get('yearOut').textContent, '1 CE');
}
console.log('Passed: failed-year tooltip, high-speed loading seam and temporal context/link refresh.');
