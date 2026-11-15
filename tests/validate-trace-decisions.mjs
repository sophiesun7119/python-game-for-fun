import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const root = new URL('../',import.meta.url);
const appSource=readFileSync(new URL('src/app.js',root),'utf8');
const start=appSource.indexOf('function traceCondition(');
const end=appSource.indexOf('function tracePanel(',start);
assert(start>=0&&end>start,'traceCondition() must precede tracePanel()');
const traceCondition=runInNewContext(appSource.slice(start,end)+'\ntraceCondition', {});
const questions=JSON.parse(readFileSync(new URL('data/questions.json',root),'utf8')).questions;
const traces=Object.assign({},...[1,2,3,4].map(w=>JSON.parse(
  readFileSync(new URL(`data/traces-week${w}.json`,root),'utf8')).traces
));
let verdicts=0;
const forKinds=new Set(['for','if','elif','while']);
for(const q of questions){
  const lines=q.code.split('\n');
  const trace=traces[q.id];
  assert(trace,`Missing trace for ${q.id}`);
  for(const [i,step] of trace.steps.entries()){
    const result=traceCondition(step,lines);
    if(!result)continue;
    verdicts++;
    const source=lines[step.line]?.trim()||'';
    const kind=source.split(/\s+/)[0];
    assert(forKinds.has(kind),`${q.id} step ${i}: badge on non-condition line ${step.line+1}`);
    assert(result.expression.length>0, `${q.id} step ${i}: empty condition`);
    assert.equal(typeof result.passed,'boolean');
    assert.equal(result.action,kind==='while'?(result.passed?'Continue Loop':'Exit Loop'):
      kind==='for'?(result.passed?'Next Iteration':'Loop Finished'):
      (result.passed?'Enter Branch':'Skip Branch'));
  }
}
const w4=traces['W4-X-01'].steps.filter(step=>step.phase!=='calculate');
const source4=questions.find(q=>q.id==='W4-X-01').code.split('\n');
assert.equal(traceCondition(w4[7],source4).passed,false,'level <= 5 should be a red ✕');
assert.equal(traceCondition(w4[8],source4).passed,true,'level <= 10 should be a green ✓');
assert.equal(traceCondition(w4[12],source4).passed,false,'xp >= needed should be a red ✕');
const w2=traces['W2-M-03'].steps.filter(step=>step.phase!=='calculate');
const source2=questions.find(q=>q.id==='W2-M-03').code.split('\n');
assert.equal(traceCondition(w2[3],source2).passed,false,
  'Compound condition containing intermediate True must show final False');
const w3=traces['W3-X-03'].steps;
const source3=questions.find(q=>q.id==='W3-X-03').code.split('\n');
assert(w3.some(step=>traceCondition(step,source3)?.action==='Exit Loop'),
  'while loop must show its false exit');
const easy=traces['W3-E-01'].steps;
const sourceEasy=questions.find(q=>q.id==='W3-E-01').code.split('\n');
assert(easy.some(step=>traceCondition(step,sourceEasy)?.action==='Next Iteration'));
assert(easy.some(step=>traceCondition(step,sourceEasy)?.action==='Loop Finished'));
console.log(`PASS: ${verdicts} condition/loop badges checked across ${questions.length} traces, including branch and loop regressions.`);
