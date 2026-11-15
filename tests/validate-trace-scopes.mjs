import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const root=new URL('../',import.meta.url);
const app=readFileSync(new URL('src/app.js',root),'utf8');
const start=app.indexOf('function traceCondition(');
const end=app.indexOf('function tracePanel(',start);
assert(start>=0&&end>start,'Inline Trace helpers not found');
const state=runInNewContext(app.slice(start,end)+
  '\nthis.tracePersistentBindings=tracePersistentBindings;this.tracePersistentBindings', {});
const bank=JSON.parse(readFileSync(new URL('data/questions.json',root),'utf8')).questions;
const all=Object.assign({},...[1,2,3,4].map(w=>
 JSON.parse(readFileSync(new URL('data/traces-week'+w+'.json',root),'utf8')).traces));
const at=(id,index)=> {
 const item=bank.find(q=>q.id===id);
 const steps=all[id].steps;
 const core=steps.filter(step=>step.phase!=='calculate');
 const physicalIndex=steps.indexOf(core[index]);
 return state(steps,physicalIndex,item.code.split('\n')).map(x=>JSON.parse(JSON.stringify(x)));
};
const pick=(records,name,line)=>records.filter(x=>x.name===name&&(line===undefined||x.line+1===line));
const w4='W4-H-01';
assert.equal(at(w4,4).length,0,'Before a function call, parameters do not yet exist');
let bindings=at(w4,5);
assert.equal(pick(bindings,'weight',9).length,1,'total_cost weight lives on def line 9');
assert.equal(pick(bindings,'rush',9).length,1,'total_cost rush lives on def line 9');
assert.equal(pick(at(w4,6),'weight',9).length,1,'Outer parameter persists through call');
assert.equal(pick(at(w4,7),'weight').length,2,'Nested function has a separate local weight');
assert.equal(pick(at(w4,9),'weight',1).length,1,'base_rate local survives through return statement');
bindings=at(w4,10);
assert.equal(pick(bindings,'weight',1).length,0,'base_rate local disappears on return to caller');
assert.equal(pick(bindings,'weight',9).length,1,'total_cost weight survives nested return');
assert.equal(pick(at(w4,12),'rush').length,2,'Nested rush_fee has independent parameter');
assert.equal(pick(at(w4,15),'rush',5).length,0,'rush_fee parameter disappears when it returns');
assert.equal(at(w4,17).length,0,'All total_cost locals disappear after returning to global code');

const global='W1-H-02';
assert.equal(pick(at(global,3),'price').length,1,'Global remains after assignment');
assert.equal(pick(at(global,6),'price').length,1,'Global remains while print runs');
const reassignment='W1-H-03';
const code=bank.find(q=>q.id===reassignment).code.split('\n');
const trace=all[reassignment].steps;
const locations=[];
for(let i=0;i<trace.length;i++){
 const vals=state(trace,i,code);
 const varA=vals.find(x=>x.name==='a');
 if(varA)locations.push({i,line:varA.line,value:varA.value});
}
assert(locations.length>1,'Reassignment example must have a');
assert(locations.some(x=>x.line===0),'First assignment remains at line 1');
assert(locations.some(x=>x.line===2),'Updated value migrates to the newer assignment line');

let checked=0;
for(const q of bank){
 const steps=all[q.id]?.steps;
 assert(steps,q.id+' missing Trace steps');
 const source=q.code.split('\n');
 for(let i=0;i<steps.length;i++){
  const bindings=state(steps,i,source);
  const unique=new Set();
  for(const b of bindings){
   assert(Number.isInteger(b.line)&&b.line>=0&&b.line<source.length,q.id+' invalid badge location');
   assert(Number.isInteger(b.frameId)&&b.frameId>=0,q.id+' invalid frame ID');
   const key=b.frameId+':'+b.name;
   assert(!unique.has(key),q.id+' duplicated variable in same scope');
   unique.add(key);
  }
  checked++;
 }
}
const css=readFileSync(new URL('styles.css',root),'utf8');
assert(css.includes('max-width:1180px'),'Main area should be wider');
assert(css.includes('max-width:1100px'),'Question card should be wider');
assert(css.includes('flex-wrap:wrap'),'Trace line annotations should wrap');
console.log('PASS: '+checked+' scoped trace steps across 80 questions, nested function lifetime, reassignment, global persistence and responsive widths.');
