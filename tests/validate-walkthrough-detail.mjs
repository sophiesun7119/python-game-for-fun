import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const root=new URL('../',import.meta.url);
const bank=JSON.parse(readFileSync(new URL('data/questions.json',root),'utf8')).questions;
const traces=Object.assign({},...[1,2,3,4,6,7,8,9].map(week=>
 JSON.parse(readFileSync(new URL('data/traces-week'+week+'.json',root),'utf8')).traces));
const enrichment=readFileSync(new URL('scripts/enrich-walkthroughs.js',root),'utf8');
const enrichTrace=runInNewContext(enrichment+'\nenrichTrace',{});
const app=readFileSync(new URL('src/app.js',root),'utf8');
const helperCode=app.slice(app.indexOf('function traceCondition('),app.indexOf('function tracePanel('));
const view=runInNewContext(
 'function valueDisplay(v){return typeof v==="string"?JSON.stringify(v):String(v)}\n'+
 helperCode+'\n({traceInlineDetails,traceCondition})',{});
const opRE=/^Calculate (-?(?:\d+(?:\.\d+)?)) (\+|-|\*|\/|\/\/|%) (-?(?:\d+(?:\.\d+)?)) = (-?(?:\d+(?:\.\d+)?))\.$/;
let count=0,calculations=0,prints=0,individualMath=0;
for(const question of bank){
 const trace=traces[question.id],lines=question.code.split('\n');
 assert(trace,'Missing walkthrough '+question.id);
 // A second enrichment pass must produce an identical trace: the same rule
 // applies to every difficulty and data corrections must not duplicate steps.
 const again=enrichTrace(question,trace);
 assert.deepEqual(JSON.parse(JSON.stringify(again.steps)),JSON.parse(JSON.stringify(trace.steps)),
  question.id+': walkthrough content was not generated from shared rules');
 for(let i=1;i<trace.steps.length;i++){
  const step=trace.steps[i],previous=trace.steps[i-1];
  const source=(lines[step.line]||'').trim();
  const tags=view.traceInlineDetails(step,previous,lines[step.line],
   view.traceCondition(step,lines));
  count++;
  assert(step.explanation.length>8,question.id+' step '+i+': explanation missing');
  if(step.phase==='calculate'){
   calculations++;
   assert.equal(step.line,trace.steps[i+1]?.line,
    question.id+' step '+i+': calculation must use line of the following action');
   assert.deepEqual(step.variables,previous.variables,
    question.id+' step '+i+': calculations cannot assign yet');
   assert.deepEqual(step.output,previous.output,
    question.id+' step '+i+': calculations cannot print yet');
   assert(tags.some(tag=>tag.kind==='calc'),
    question.id+' step '+i+': calculation needs visible badge');
   const match=step.explanation.match(opRE);
   if(match){
    individualMath++;
    const a=Number(match[1]),b=Number(match[3]),want=Number(match[4]);
    const op=match[2];
    const got=op==='+'?a+b:op==='-'?a-b:op==='*'?a*b:
     op==='/'?a/b:op==='//'?Math.floor(a/b):a-Math.floor(a/b)*b;
    assert(Math.abs(got-want)<1e-8,
      question.id+' step '+i+': incorrect arithmetic '+step.explanation);
   }
  }
  const printed=step.output.length>previous.output.length;
  if(printed){
   prints++;
   assert.equal(step.event,'print',
     question.id+' step '+i+': output appeared without a print event');
   assert.match(source,/^print\s*\(/,
     question.id+' step '+i+': printed output on wrong source line');
   assert(tags.some(tag=>tag.kind==='call'&&tag.text.startsWith('Call print(')),
     question.id+' step '+i+': missing Call print() tag');
   assert.match(step.explanation,/^Call print\(\) to display /,
     question.id+' step '+i+': print not explained');
  }else{
   assert.notEqual(step.event,'print',question.id+' step '+i+': print without output');
  }
 }
}

const square=traces['W4-M-01'].steps;
const back=square.findIndex(step=>step.explanation.startsWith('Return from square()'));
const arithmetic=square.findIndex(step=>step.explanation==='Calculate 16 + 1 = 17.');
const printed=square.findIndex(step=>step.event==='print'&&step.output.join()==='17');
assert(back>=0&&arithmetic>back&&printed>arithmetic,
 'W4-M-01 must show return 16 → add 1 → print 17 in separate steps');
assert.deepEqual(square[arithmetic].output,[],'Calculation must precede printed output');
const hello=traces['W4-E-01'].steps.find(step=>step.event==='print');
assert(hello?.explanation.includes('Hi'),'Even a simple greet print must be explained');
const receipt=traces['W1-H-05'].steps.map(step=>step.explanation);
for(const text of [
 'Calculate 19 // 4 = 4.','Calculate 19 % 4 = 3.',
 'Calculate 4 + 3 = 7.','Calculate 7 * 2 = 14.',
 'Calculate 14 - 4 = 10.'
])assert(receipt.includes(text),'Missing arithmetic substep: '+text);

console.log('PASS: '+bank.length+' questions, '+count+' non-ready steps, '+
 calculations+' explicit calculation steps ('+individualMath+' checked operations), '+
 prints+' explained print calls and square() return→add→print regression.');
