import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const root=new URL('../',import.meta.url);
const questions=JSON.parse(readFileSync(new URL('data/questions.json',root),'utf8')).questions;
const saved=Object.assign({},...[1,2,3,4,6,7,8,9].map(week=>
 JSON.parse(readFileSync(new URL('data/traces-week'+week+'.json',root),'utf8')).traces));
const buildCode=readFileSync(new URL('scripts/build-trace-runtime.js',root),'utf8');
const enrichCode=readFileSync(new URL('scripts/enrich-walkthroughs.js',root),'utf8');
const tools=runInNewContext(buildCode+'\n'+enrichCode+
 '\n({buildTrace,enrichTrace})',{});
const curatedFloat=new Map([['W4-H-04','55.0'],['W4-X-03','36.0']]);
let verified=0;

// The JS generator covers only the Weeks 1-4 subset (no collection
// methods, negative indexing or slicing), so this equality check is
// scoped to those weeks. Challenge 2 traces come from
// scripts/generate-traces.py and are cross-checked against CPython by
// validate-trace-cpython.py and validate-walkthrough-detail.mjs.
for(const question of questions.filter(q=>['hard','extra'].includes(q.difficulty)&&q.week<=4)){
 const trace=tools.buildTrace(question);
 if(curatedFloat.has(question.id)){
  // Python correctly preserves .0 where JavaScript Number does not.
  const value=curatedFloat.get(question.id);
  trace.steps.at(-1).output=[value];
  trace.steps.at(-1).explanation=
   'The final value is '+value+'. Python displays the .0 because the calculation returns a floating-point number.';
 }
 const expected=tools.enrichTrace(question,trace).steps;
 const actual=saved[question.id].steps;
 assert.equal(actual.length,expected.length,question.id+': step count');
 for(let i=0;i<actual.length;i++){
  const a=actual[i],b=expected[i];
  assert.equal(a.line,b.line,question.id+' step '+i+': wrong arrow line');
  assert.equal(a.explanation,b.explanation,question.id+' step '+i+': wrong explanation');
  assert.deepEqual(JSON.parse(JSON.stringify(a.variables)),JSON.parse(JSON.stringify(b.variables)),
   question.id+' step '+i+': wrong variable snapshot');
  assert.deepEqual(JSON.parse(JSON.stringify(a.output)),JSON.parse(JSON.stringify(b.output)),
   question.id+' step '+i+': wrong cumulative output');
  assert.equal(a.phase||'',b.phase||'',question.id+' step '+i+': wrong phase');
  assert.equal(a.event||'',b.event||'',question.id+' step '+i+': wrong event');
 }
 verified++;
}

for(const q of questions.filter(q=>q.week===4)){
 const lines=q.code.split('\n');
 for(const [index,step] of saved[q.id].steps.entries()){
  if(!step.explanation.startsWith('Enter '))continue;
  assert.match(lines[step.line].trim(),/^def\s+\w+\s*\(/,
   q.id+' step '+index+': function entry must point to its def line');
 }
}

const sequence=saved['W4-X-01'].steps.filter(x=>x.phase!=='calculate');
const expectedSequence=[
 ['Define xp_needed()',0],['Define message()',6],['Call message(',11],
 ['Enter message()',6],['Call xp_needed(',7],['Enter xp_needed()',0],
 ['Check level <= 5',1],['Check level <= 10',3],['Return 900',4],
 ['Return from xp_needed()',7],['Evaluate xp_needed(level)',7],
 ['Check xp >= needed',8],["Return 'Need 170'",10],
 ['Return from message()',11],['Call print()',11]
];
assert.equal(sequence.length,expectedSequence.length+1,'W4-X-01 core control-flow count');
for(let i=0;i<expectedSequence.length;i++){
 const [prefix,line]=expectedSequence[i];
 assert.equal(sequence[i+1].line,line,'W4-X-01 core step '+i+' arrow');
 assert(sequence[i+1].explanation.startsWith(prefix),
  'W4-X-01 core step '+i+' explanation');
}
const nestedReturn=sequence.find(x=>x.explanation.startsWith('Return from xp_needed()'));
const assigned=sequence.find(x=>x.explanation.startsWith('Evaluate xp_needed(level)'));
assert.equal(nestedReturn.variables.needed,undefined,'Nested return does not assign needed yet');
assert.equal(assigned.variables.needed,900,'Assignment occurs after nested return');

// More detailed arithmetic regression: return 16 -> evaluate 16+1 -> print 17.
const math=saved['W4-M-01'].steps;
const returned=math.findIndex(x=>x.explanation.startsWith('Return from square()'));
const compute=math.findIndex(x=>x.phase==='calculate'&&x.explanation.includes('16 + 1 = 17'));
const printed=math.findIndex(x=>x.event==='print'&&x.output.join()==='17');
assert(returned>0&&compute>returned&&printed>compute,'square(): calculation must precede print');
assert.equal(math[compute].line,2,'arithmetic arrow stays on print expression');
assert.deepEqual(math[compute].output,[],'calculation has not printed yet');
assert.deepEqual(math[printed].output,['17'],'print makes output visible');

console.log('PASS: '+verified+' generated Hard/Extra walkthroughs match all arrow, variable, explanation and print steps; nested expression regression passed.');
