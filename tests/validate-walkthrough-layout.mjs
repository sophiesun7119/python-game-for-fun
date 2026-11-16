import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const root=new URL('../',import.meta.url);
const app=readFileSync(new URL('src/app.js',root),'utf8');
const bank=JSON.parse(readFileSync(new URL('data/questions.json',root),'utf8')).questions;
const traces=Object.assign({},...[1,2,3,4,6,7,8,9].map(w=>
  JSON.parse(readFileSync(new URL('data/traces-week'+w+'.json',root),'utf8')).traces));
const start=app.indexOf('function traceCondition(');
const end=app.indexOf('function currentQuestion(){',start);
assert(start>=0&&end>start,'Walkthrough rendering helpers not found');
const helpers=app.slice(start,end);
const harness=runInNewContext(
 'const allTraces={};const state={traceOpen:true,traceIndex:0};'+
 'function escapeHTML(s){return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll(String.fromCharCode(34),"&quot;").replaceAll(String.fromCharCode(39),"&#39;")}'+
 'function valueDisplay(v){return typeof v==="string"?JSON.stringify(v):String(v)}\n'+
 helpers+'\n({allTraces,state,tracePanel})',{});
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

assert.equal(bank.length,160,'Expected all eight weeks and four difficulties');
let count=0,withOutput=0;
for(const q of bank){
 const trace=traces[q.id];
 assert(trace,q.id+' missing static trace');
 harness.allTraces[q.id]=trace;
 for(let index=0;index<trace.steps.length;index++){
  harness.state.traceIndex=index;
  const html=harness.tracePanel(q);
  const toolbar=html.indexOf('class="trace-toolbar"');
  const code=html.indexOf('class="trace-code-panel');
  const output=html.indexOf('class="trace-output-section"');
  const explanation=html.indexOf('class="trace-narration"');
  assert(toolbar>=0&&toolbar<code&&code<output&&output<explanation,
    q.id+' step '+index+' layout order must be toolbar → code → Output → Explanation');
  assert(html.indexOf('data-action="trace-prev"')<code,q.id+' Previous is below code');
  assert(html.indexOf('data-action="trace-next"')<code,q.id+' Next is below code');
  assert(html.indexOf('data-action="trace-restart"')<code,q.id+' Restart is below code');
  assert(!html.includes('trace-inline-output'),q.id+' unexpected output badge on code');
  const match=html.match(/<pre class="trace-output-content"[^>]*>([\s\S]*?)<\/pre>/);
  assert(match,q.id+' step '+index+' missing Output area');
  const expected=trace.steps[index].output.map(escape).join('\n');
  assert.equal(match[1],expected,q.id+' step '+index+' Output must match cumulative Python output');
  if(index===0)assert.equal(match[1],'',q.id+' initial Output should be blank');
  if(expected)withOutput++;
  const highlighted=(html.match(/class="trace-line trace-line-active"/g)||[]).length;
  assert.equal(highlighted,index===0?0:1,q.id+' step '+index+' unexpected number of arrow lines');
  assert(html.includes('Explanation:'),q.id+' step '+index+' missing teaching explanation');
  count++;
 }
}
const css=readFileSync(new URL('styles.css',root),'utf8');
assert(css.includes('.trace-toolbar'),'Missing toolbar styling');
assert(css.includes('.trace-output-content'),'Missing Output box styling');
assert(css.includes('min-height:44px'),'Blank Output should still have visible area');
console.log('PASS: '+count+' rendered steps across 160 cards; top controls, code, cumulative Output, and Explanation in one order ('+withOutput+' steps with output).');
