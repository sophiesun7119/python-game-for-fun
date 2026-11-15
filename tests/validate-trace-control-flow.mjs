import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const root = new URL('../', import.meta.url);
const questions = JSON.parse(readFileSync(new URL('data/questions.json', root), 'utf8')).questions;
const allTraces = Object.assign({}, ...[1,2,3,4].map(week =>
  JSON.parse(readFileSync(new URL(`data/traces-week${week}.json`, root), 'utf8')).traces
));
const generatorCode = readFileSync(new URL('scripts/build-trace-runtime.js', root), 'utf8');
const buildTrace = runInNewContext(generatorCode + '\nthis.buildTrace = buildTrace; this.buildTrace', {});
const curatedFloatOutputs = new Map([
  ['W4-H-04', '55.0'],
  ['W4-X-03', '36.0']
]);
// The lightweight JS trace builder represents Python floats as JS Numbers.
// JS formats 55.0 as '55', but Python correctly prints '55.0'.
// The final saved trace steps explicitly preserve Python's display.
let verified = 0;

for (const question of questions.filter(q => ['hard', 'extra'].includes(q.difficulty))) {
  const expected = buildTrace(question).steps;
  const saved = allTraces[question.id].steps;
  assert.equal(saved.length, expected.length, question.id + ': step count differs from generator');
  for (let index = 0; index < expected.length; index++) {
    const step = saved[index], generated = expected[index];
    assert.equal(step.line, generated.line, `${question.id} step ${index}: wrong arrow line`);
    const curatedFinal = curatedFloatOutputs.has(question.id) && index === expected.length - 1;
    if (curatedFinal) {
      const expectedOutput = curatedFloatOutputs.get(question.id);
      assert.deepEqual(step.output, [expectedOutput], `${question.id}: incorrect Python float output`);
      assert(step.explanation.includes(expectedOutput), `${question.id}: float explanation must match printed value`);
    } else {
      assert.equal(step.explanation, generated.explanation, `${question.id} step ${index}: explanation does not match action`);
    }
    assert.deepEqual(JSON.parse(JSON.stringify(step.variables)), JSON.parse(JSON.stringify(generated.variables)),
      `${question.id} step ${index}: wrong variables`);
    if (!curatedFinal) {
      assert.deepEqual(step.output, JSON.parse(JSON.stringify(generated.output)), `${question.id} step ${index}: wrong output`);
    }
  }
  verified++;
}

// Every function entry step in Week 4 must point at its def declaration,
// never at the first body line. This protects against the UI confusion where
// parameter binding and execution of that line appeared to happen together.
for (const question of questions.filter(q => q.week === 4)) {
  const sourceLines = question.code.split('\n');
  for (const [index, step] of allTraces[question.id].steps.entries()) {
    if (!step.explanation.startsWith('Enter ')) continue;
    assert.match(sourceLines[step.line].trim(), /^def\s+\w+\s*\(/,
      `${question.id} step ${index}: function entry arrow must highlight def line`);
  }
}

// Concrete regression: W4 Extra Rock Q1 — call site, function body,
// nested call, nested return and assignment MUST be highlighted in this order.
const item = allTraces['W4-X-01'].steps;
const expectedSequence = [
  ['Define xp_needed()',0], ['Define message()',6], ['Call message(',11],
  ['Enter message()',6], ['Call xp_needed(',7], ['Enter xp_needed()',0],
  ['Check level <= 5',1], ['Check level <= 10',3], ['Return 900',4],
  ['Return from xp_needed()',7], ['Evaluate xp_needed(level)',7],
  ['Check xp >= needed',8], ["Return 'Need 170'",10],
  ['Return from message()',11], ["Print 'Need 170'",11]
];
assert.equal(item.length, expectedSequence.length+1, 'Regression example has unexpected step count');
for (let i=0;i<expectedSequence.length;i++) {
  const [message,line]=expectedSequence[i];
  assert.equal(item[i+1].line,line,`W4-X-01 step ${i+1}: expected arrow on source line ${line+1}`);
  assert(item[i+1].explanation.startsWith(message),
    `W4-X-01 step ${i+1}: wrong explanation for source line ${line+1}`);
}
assert.equal(item[10].variables.needed,undefined,'Returning should not assign needed before the assignment executes');
assert.equal(item[11].variables.needed,900,'Assignment should set needed only after nested call returns');

console.log(`PASS: ${verified} Hard/Extra traces exactly match generated execution steps; W4-X-01 nested-call arrow regression verified.`);
