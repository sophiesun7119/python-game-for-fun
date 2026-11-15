import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const root=new URL('../',import.meta.url);
const app=readFileSync(new URL('src/app.js',root),'utf8');
const start=app.indexOf('function traceCondition(');
const end=app.indexOf('function tracePanel(',start);
assert(start>=0&&end>start,'Could not find trace helpers');
const code=app.slice(start,end);
const api=runInNewContext(
 'function valueDisplay(v){return typeof v==="string"?JSON.stringify(v):String(v)}\n'+code+
 '\n({traceCondition,traceInlineDetails,tracePersistentOutputs})',{});
const bank=JSON.parse(readFileSync(new URL('data/questions.json',root),'utf8')).questions;
const traces=Object.assign({},...[1,2,3,4].map(w=>
 JSON.parse(readFileSync(new URL('data/traces-week'+w+'.json',root),'utf8')).traces
));
let checked=0,definitions=0,prints=0;
for(const question of bank){
 const lines=question.code.split('\n');
 const steps=traces[question.id].steps;
 for(let index=1;index<steps.length;index++){
  checked++;
  const step=steps[index],prev=steps[index-1];
  const source=(lines[step.line]||'').trim();
  const condition=api.traceCondition(step,lines);
  const tags=api.traceInlineDetails(step,prev,lines[step.line],condition);
  const newOutput=step.output.slice(prev.output.length);
  if(/^def\s+\w+\(/.test(source)&&/^Define\b/.test(step.explanation)){
   definitions++;
   assert(tags.some(tag=>tag.text==='Function defined'),
    question.id+' step '+index+' missing definition badge');
  }
  if(newOutput.length){
   prints+=newOutput.length;
   assert.match(source,/^print\s*\(/,
    question.id+' step '+index+' emitted output at non-print line');
   const pinned=api.tracePersistentOutputs(steps,index,lines);
   for(const output of newOutput){
    assert(pinned.some(tag=>tag.line===step.line&&tag.value===output),
      question.id+' step '+index+' missing persistent output');
   }
   const nextIndex=Math.min(index+1,steps.length-1);
   const atNext=api.tracePersistentOutputs(steps,nextIndex,lines);
   assert(pinned.every(tag=>atNext.some(n=>n.line===tag.line&&n.value===tag.value)),
     question.id+' step '+index+' output disappeared');
  }
 }
}
const sample={line:0,variables:{},output:[],explanation:'Define greet; body saved'};
const tags=api.traceInlineDetails(sample,{variables:{},output:[]},
 'def greet():',null);
assert(tags.some(tag=>tag.text==='Function defined'),
 'Source-based definition detection must handle alternate teacher wording');

const w4=traces['W4-E-01'].steps;
const greetCode=bank.find(q=>q.id==='W4-E-01').code.split('\n');
assert(api.tracePersistentOutputs(w4,5,greetCode)
 .some(x=>x.line===1&&x.value==='Hi'),'greet() must show output on line 2');
assert(api.tracePersistentOutputs(w4,w4.length-1,greetCode)
 .some(x=>x.line===1&&x.value==='Hi'),'greet() output must remain after return');
console.log('PASS: '+checked+' Trace steps, '+definitions+' function definitions and '+prints+' printed lines; events match source semantics.');
