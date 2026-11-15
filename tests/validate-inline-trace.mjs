import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const root=new URL('../',import.meta.url);
const app=readFileSync(new URL('src/app.js',root),'utf8');
const start=app.indexOf('function traceCondition('),end=app.indexOf('function tracePanel(',start);
assert(start>=0&&end>start,'Trace helper functions not found');
const funcs=runInNewContext(app.slice(start,end)+
  '\nfunction valueDisplay(v){return typeof v==="string"?JSON.stringify(v):String(v)}'+
  '\nthis.result={traceCondition,traceInlineValues,traceInlineDetails};this.result',{});
const questions=JSON.parse(readFileSync(new URL('data/questions.json',root),'utf8')).questions;
const traces=Object.assign({},...[1,2,3,4].map(w=>
 JSON.parse(readFileSync(new URL('data/traces-week'+w+'.json',root),'utf8')).traces));
let counted=0;
for(const q of questions){
 const lines=q.code.split('\n'),trace=traces[q.id];
 assert(trace,q.id+' missing trace');
 for(let i=1;i<trace.steps.length;i++){
  const step=trace.steps[i],previous=trace.steps[i-1];
  const source=lines[step.line];
  assert(source!==undefined,q.id+' invalid source line');
  const condition=funcs.traceCondition(step,lines);
  const tags=funcs.traceInlineDetails(step,previous,source,condition);
  assert(Array.isArray(tags),q.id+' tags must be an array');
  for(const tag of tags){
   assert(['value','pass','fail','call','output','muted'].includes(tag.kind),q.id+' bad tag');
   assert(typeof tag.text==='string'&&tag.text.length>0,q.id+' empty tag');
  }
  if(condition)assert(tags.some(t=>t.kind===(condition.passed?'pass':'fail')),q.id+' missing check badge');
  if((step.output||[]).length>(previous.output||[]).length)
   assert(tags.some(t=>t.kind==='output'),q.id+' missing print output on active line');
  counted++;
 }
}
const sample=traces['W4-X-01'].steps,q=questions.find(x=>x.id==='W4-X-01');
const at=i=>funcs.traceInlineDetails(sample[i],sample[i-1],q.code.split('\n')[sample[i].line],
 funcs.traceCondition(sample[i],q.code.split('\n')));
assert(at(4).some(x=>x.text==='xp = 730'),'Function entry must show xp');
assert(at(4).some(x=>x.text==='level = 6'),'Function entry must show level');
assert(at(6).some(x=>x.text==='level = 6'),'Nested function entry must show parameter');
assert(at(7).some(x=>x.kind==='fail'),'level <= 5 should show red ✕');
assert(at(8).some(x=>x.kind==='pass'),'level <= 10 should show green ✓');
assert(at(10).some(x=>x.kind==='call'&&x.text.includes('900')),'Function return must show returned 900');
assert(!at(10).some(x=>x.kind==='value'&&x.text.includes('xp =')),'Returning must not invent variable changes');
assert(at(11).some(x=>x.text==='needed = 900'),'Assignment should show only after return');
assert(at(15).some(x=>x.kind==='output'&&x.text.includes('Need 170')),'Output should appear at print line');
const panel=app.slice(app.indexOf('function tracePanel('),app.indexOf('function currentQuestion('));
assert(!panel.includes('trace-state-panel')&&!panel.includes('trace-layout'),'Trace must use a single full-width code panel');
console.log('PASS: '+counted+' inline trace steps checked across '+questions.length+' questions, including Week 4 call/return display.');
