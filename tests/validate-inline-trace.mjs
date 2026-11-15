import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const root=new URL('../',import.meta.url);
const app=readFileSync(new URL('src/app.js',root),'utf8');
const start=app.indexOf('function traceCondition('),end=app.indexOf('function tracePanel(',start);
assert(start>=0&&end>start,'Trace condition/inline helpers not found');
const helpers=runInNewContext(app.slice(start,end)+
  '\nfunction valueDisplay(v){return typeof v==="string"?JSON.stringify(v):String(v)}'+
  '\nthis.result={traceCondition,traceInlineValues};this.result',{});
const questions=JSON.parse(readFileSync(new URL('data/questions.json',root),'utf8')).questions;
const traces=Object.assign({},...[1,2,3,4].map(w=>
  JSON.parse(readFileSync(new URL(`data/traces-week${w}.json`,root),'utf8')).traces));

const examples=[
  ['W3-X-03',3,'i = 1',true],
  ['W3-X-03',10,'i = 2',true],
  ['W3-X-03',33,'i = 4',false],
  ['W4-X-01',7,'level = 6',false],
  ['W4-X-01',8,'level = 6',true],
  ['W4-X-01',12,'xp = 730 · needed = 900',false],
  ['W2-M-03',3,'age = 13 · has_ticket = "no"',false]
];
for(const [id,index,value,passed] of examples){
  const q=questions.find(x=>x.id===id);
  assert(q,`Missing ${id}`);
  const step=traces[id].steps[index],source=q.code.split('\n')[step.line];
  const decision=helpers.traceCondition(step,q.code.split('\n'));
  assert(decision,`Missing decision for ${id} step ${index}`);
  assert.equal(decision.passed,passed,`Wrong check verdict for ${id} step ${index}`);
  const rendered=helpers.traceInlineValues(step,source,decision);
  assert.equal(rendered,value,`Wrong inline variable value for ${id} step ${index}`);
}
for(const q of questions){
  const lines=q.code.split('\n');
  for(const step of traces[q.id].steps){
    const decision=helpers.traceCondition(step,lines);
    if(!decision)continue;
    const summary=helpers.traceInlineValues(step,lines[step.line],decision);
    assert.equal(typeof summary,'string');
    if(lines[step.line].trim().startsWith('for ')&&decision.passed){
      assert(summary.includes(' = ')||summary==='next iteration');
    }
  }
}
console.log('PASS: inline ✓/✕ labels and variable snapshots stay synchronized with active source steps.');
