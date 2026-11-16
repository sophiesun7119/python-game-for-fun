import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Question-bank schema and hygiene checks. The other suites validate traces
// and rendering; this one validates the questions themselves: required
// fields, id/week/difficulty consistency, multiple-choice option validity,
// and hint hygiene (a hint must guide, never hand over the answer).

const payload = JSON.parse(readFileSync(new URL('../data/questions.json', import.meta.url), 'utf8'));
const questions = payload.questions;
const DIFFICULTIES = ['easy', 'medium', 'hard', 'extra'];
const ID_DIFF = { easy: 'E', medium: 'M', hard: 'H', extra: 'X' };
const REQUIRED_STRINGS = ['prompt', 'code', 'answer', 'explanation', 'hint', 'concept'];

assert.equal(questions.length, 160, 'Expected 160 questions');
const seen = new Set();
for (const week of [1, 2, 3, 4, 6, 7, 8, 9]) {
  for (const difficulty of DIFFICULTIES) {
    const actual = questions.filter(q => q.week === week && q.difficulty === difficulty);
    assert.equal(actual.length, 5, `Expected five ${difficulty} questions for Week ${week}`);
  }
}

for (const q of questions) {
  assert(q.id, 'Question is missing an id');
  assert(!seen.has(q.id), `Duplicate question id: ${q.id}`);
  seen.add(q.id);
  const m = /^W(\d)-([EMHX])-(\d{2})$/.exec(q.id);
  assert(m, `${q.id}: id does not match W<week>-<E|M|H|X>-<nn>`);
  assert.equal(Number(m[1]), q.week, `${q.id}: id week does not match week field`);
  assert.equal(ID_DIFF[q.difficulty], m[2], `${q.id}: id difficulty letter does not match difficulty field`);
  assert(DIFFICULTIES.includes(q.difficulty), `${q.id}: unknown difficulty ${q.difficulty}`);
  assert(['multiple_choice', 'short_answer'].includes(q.type), `${q.id}: unknown type ${q.type}`);
  for (const field of REQUIRED_STRINGS) {
    assert.equal(typeof q[field], 'string', `${q.id}: ${field} must be a string`);
    assert(q[field].trim().length > 0, `${q.id}: ${field} must not be empty`);
  }

  if (q.type === 'multiple_choice') {
    assert(Array.isArray(q.options), `${q.id}: multiple_choice question needs an options array`);
    assert(q.options.length >= 2, `${q.id}: needs at least two options`);
    assert(q.options.every(o => typeof o === 'string' && o.trim().length > 0), `${q.id}: options must be non-empty strings`);
    assert.equal(new Set(q.options).size, q.options.length, `${q.id}: duplicate options`);
    assert(q.options.includes(q.answer), `${q.id}: correct answer is not one of the options`);
  }

  // Hint hygiene: the hint must not contain the answer verbatim. Very short
  // or purely numeric answers are exempt — a hint may legitimately mention a
  // small number ("count the range values") without giving the answer away.
  const answer = q.answer.trim();
  const answerIsCheckable = answer.length >= 3 && !/^-?\d+(\.\d+)?$/.test(answer) && !answer.includes('\n');
  if (answerIsCheckable) {
    assert(
      !q.hint.toLowerCase().includes(answer.toLowerCase()),
      `${q.id}: hint leaks the answer verbatim`
    );
  }

  // Optional bonus follow-ups (same code, extra questions; see Technical
  // Design section 4). Validate them to the same standard as main cards.
  if (q.followups !== undefined) {
    assert(Array.isArray(q.followups), `${q.id}: followups must be an array`);
    q.followups.forEach((f, k) => {
      const tag = `${q.id} followup ${k + 1}`;
      for (const field of ['prompt', 'answer', 'explanation']) {
        assert.equal(typeof f[field], 'string', `${tag}: ${field} must be a string`);
        assert(f[field].trim().length > 0, `${tag}: ${field} must not be empty`);
      }
      assert(['multiple_choice', 'short_answer'].includes(f.type), `${tag}: unknown type ${f.type}`);
      if (f.code !== undefined) {
        assert.equal(typeof f.code, 'string', `${tag}: code must be a string`);
        assert(f.code.trim().length > 0, `${tag}: code must not be empty`);
      }
      if (f.type === 'multiple_choice') {
        assert(Array.isArray(f.options) && f.options.length >= 2, `${tag}: needs at least two options`);
        assert.equal(new Set(f.options).size, f.options.length, `${tag}: duplicate options`);
        assert(f.options.includes(f.answer), `${tag}: correct answer is not one of the options`);
      }
    });
  }
}

console.log(`validate-question-schema: PASS (${questions.length} questions, fields, options and hint hygiene verified)`);
