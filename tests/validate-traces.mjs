import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const questions = JSON.parse(readFileSync(new URL('../data/questions.json', import.meta.url), 'utf8')).questions;
const traces = Object.assign({}, ...[1,2,3,4,6,7,8,9].map(week => {
  const payload = JSON.parse(readFileSync(new URL(`../data/traces-week${week}.json`, import.meta.url), 'utf8'));
  return payload.traces;
}));
const exceptions = new Set(['W1-E-05','W2-M-05','W6-E-03','W6-M-03','W7-E-03','W7-M-05','W8-E-05','W8-M-05','W9-E-04','W9-M-04']);
const printCount = new Set(['W3-E-02']);
const lastLineOnly = new Set(['W4-M-03']);
const found = new Set();
let stepCount = 0;

assert.equal(questions.length, 160, 'Expected 160 questions');
assert.equal(Object.keys(traces).length, 160, 'Expected 160 trace entries');
for (const week of [1,2,3,4,6,7,8,9]) {
  for (const difficulty of ['easy','medium','hard','extra']) {
    const actual=questions.filter(q=>q.week===week && q.difficulty===difficulty);
    assert.equal(actual.length,5,`Expected five ${difficulty} questions for Week ${week}`);
  }
}
for (const question of questions) {
  const trace = traces[question.id];
  assert(trace, `Missing trace: ${question.id}`);
  assert(!found.has(question.id), `Duplicate question: ${question.id}`);
  found.add(question.id);

  const codeLines = question.code.split('\n');
  assert(trace.steps.length >= 2, `Trace has no execution: ${question.id}`);
  const initial = trace.steps[0];
  assert.equal(initial.line, -1);
  assert.deepEqual(initial.variables, {});
  assert.deepEqual(initial.output, []);

  for (const step of trace.steps) {
    stepCount += 1;
    assert(Number.isInteger(step.line) && step.line >= -1 && step.line < codeLines.length, `Bad line index: ${question.id}`);
    assert(step.variables && typeof step.variables === 'object' && !Array.isArray(step.variables));
    assert(Array.isArray(step.output));
    assert(typeof step.explanation === 'string' && step.explanation.length > 4);
  }
  const output = trace.steps.at(-1).output;
  if (exceptions.has(question.id)) continue; // input demo, runtime exception, or a code-completion task
  if (printCount.has(question.id)) {
    assert.equal(output.length, Number(question.answer), `Wrong line count: ${question.id}`);
  } else if (lastLineOnly.has(question.id)) {
    assert.equal(output.at(-1), question.answer, `Wrong final output line: ${question.id}`);
  } else {
    assert.equal(output.join('\n'), question.answer, `Trace output disagrees with answer: ${question.id}`);
  }
}
console.log(`Validated ${found.size} question traces and ${stepCount} teaching steps across Weeks 1–4 and 6–9.`);
