// Browser end-to-end suite for Python Quest (Playwright, headless Chromium).
// Drives the served site through the Technical Design section 9 regression
// sequence (player flow, wrong answer -> hint -> retry -> correct, reveal,
// results/XP, review, resume, player isolation, skip, bonus questions) and
// then steps through ALL 160 walkthroughs, comparing every rendered step
// (active line, cumulative Output, Explanation, step counter) with the
// trace JSON. Exits non-zero if any check fails.
//
// Run locally (the server must already be running):
//   python3 -m http.server 8000 &
//   mkdir -p /tmp/pw && cd /tmp/pw && npm init -y >/dev/null && npm install playwright-core
//   /tmp/pw/node_modules/.bin/playwright-core install chromium-headless-shell
//   NODE_PATH=/tmp/pw/node_modules node tests/e2e-browser.cjs
// Base URL override: BASE_URL=http://localhost:8000 node tests/e2e-browser.cjs
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const BASE_URL = process.env.BASE_URL || 'http://localhost:8000/';
const questions = JSON.parse(fs.readFileSync(path.join(REPO, 'data/questions.json'), 'utf8')).questions;
const traces = {};
for (const w of [1, 2, 3, 4, 6, 7, 8, 9]) Object.assign(traces, JSON.parse(fs.readFileSync(path.join(REPO, `data/traces-week${w}.json`), 'utf8')).traces);
const qById = Object.fromEntries(questions.map(q => [q.id, q]));

const results = [];
const consoleErrors = [];
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail: String(detail).slice(0, 300) });
  if (!ok) console.log(`FAIL: ${name} :: ${detail}`);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- Playwright plumbing ----------
const { chromium } = require('playwright-core');
let page;
async function ev(expr) { return page.evaluate(expr); }
async function waitFor(expr, timeout = 15000, label = '') {
  try { await page.waitForFunction(expr, null, { timeout }); return true; }
  catch { throw new Error('timeout waiting for: ' + (label || expr)); }
}

const HELPERS = `
window.__qa = {
  text: s => { const e = document.querySelector(s); return e ? e.textContent : null; },
  bodyText: () => document.body.innerText,
  clickAction: a => { const b = [...document.querySelectorAll('[data-action]')].find(x => x.dataset.action === a && !x.disabled); if (!b) return false; b.click(); return true; },
  actionExists: a => [...document.querySelectorAll('[data-action]')].some(x => x.dataset.action === a),
  setInput: (sel, val) => { const e = document.querySelector(sel); if (!e) return false; e.value = val; e.dispatchEvent(new Event('input', { bubbles: true })); return true; },
  submitPlayer: name => { const i = document.querySelector('#player-name'); if (!i) return false; i.value = name; i.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('#player-form').requestSubmit(); return true; },
  clickOptionByText: t => { const b = [...document.querySelectorAll('[data-choice]')].find(x => x.textContent.includes(t)); if (!b) return false; b.click(); return true; },
  clickOptionExact: t => { const b = [...document.querySelectorAll('[data-choice]')].find(x => (x.querySelector('.choice-text')?.textContent ?? x.textContent) === t); if (!b) return false; b.click(); return true; },
  traceState: () => {
    const rows = [...document.querySelectorAll('.trace-line')].map(row => ({
      lineno: Number(row.querySelector('.trace-lineno')?.textContent),
      active: row.classList.contains('trace-line-active'),
      tags: [...row.querySelectorAll('.trace-inline-tag')].map(t => t.textContent)
    }));
    const rect = s => { const e = document.querySelector(s); return e ? e.getBoundingClientRect().top : null; };
    return {
      count: document.querySelector('.trace-stepcount')?.textContent || null,
      rows,
      output: document.querySelector('.trace-output-content')?.textContent ?? null,
      narration: document.querySelector('.trace-narration')?.textContent?.trim() ?? null,
      nextDisabled: document.querySelector('[data-action="trace-next"]')?.disabled ?? null,
      prevDisabled: document.querySelector('[data-action="trace-prev"]')?.disabled ?? null,
      order: { toolbar: rect('.trace-toolbar'), code: rect('.trace-code-panel'), output: rect('.trace-output-section'), narration: rect('.trace-narration') }
    };
  }
};`;

async function traceState() { return ev('window.__qa.traceState()'); }
async function click(a) { const ok = await ev(`window.__qa.clickAction(${JSON.stringify(a)})`); await sleep(60); return ok; }

function expectStep(qid, idx, st) {
  const steps = traces[qid].steps;
  const s = steps[idx];
  const activeRows = st.rows.filter(r => r.active);
  if (s.line === -1) {
    if (activeRows.length !== 0) return `step ${idx}: expected no active line, got ${activeRows.map(r => r.lineno)}`;
  } else {
    if (activeRows.length !== 1 || activeRows[0].lineno !== s.line + 1)
      return `step ${idx}: expected active line ${s.line + 1}, got ${activeRows.map(r => r.lineno)}`;
  }
  const wantOut = (s.output || []).join('\n');
  if (st.output !== wantOut) return `step ${idx}: output ${JSON.stringify(st.output)} != expected ${JSON.stringify(wantOut)}`;
  if (!st.narration || !st.narration.includes(s.explanation)) return `step ${idx}: narration does not contain explanation`;
  const wantCount = `Step ${idx} / ${steps.length - 1}`;
  if (st.count !== wantCount) return `step ${idx}: counter ${JSON.stringify(st.count)} != ${JSON.stringify(wantCount)}`;
  return null;
}

async function walkTrace(qid, { full = true } = {}) {
  // assumes quiz view with trace closed; opens trace and steps to the end
  if (!await click('trace-open')) return [`${qid}: trace-open button missing`];
  const problems = [];
  const steps = traces[qid].steps;
  let st = await traceState();
  let err = expectStep(qid, 0, st); if (err) problems.push(err);
  for (let i = 1; i < steps.length; i++) {
    if (st.nextDisabled) { problems.push(`${qid}: Next disabled early at step ${i - 1}`); break; }
    await click('trace-next');
    st = await traceState();
    err = expectStep(qid, i, st); if (err) problems.push(err);
    if (!full && i >= 2) break;
  }
  return problems;
}

async function navToLevels() {
  for (let i = 0; i < 8; i++) {
    const t = await ev('window.__qa.bodyText()');
    if (t.includes('Choose a Week')) return;
    if (t.includes('Choose your challenge')) { await click('levels:1'); continue; }
    if (await ev(`window.__qa.actionExists('levels')`)) { await click('levels'); continue; }
    if (!await click('back')) break;
  }
}
async function startQuest(week, diff) {
  await navToLevels();
  if (!await ev(`window.__qa.actionExists('week:${week}')`)) {
    // The week list is showing the other challenge: go home and switch.
    await click('back');
    await click('levels:' + (week >= 6 ? 2 : 1));
  }
  await click('week:' + week);
  await click('start:' + diff);
  const t = await ev('window.__qa.bodyText()');
  if (t.includes('Your quest is saved')) { await click('fresh'); }
}

async function main() {
  const browser = await chromium.launch();
  page = await browser.newPage();
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push('console.error: ' + m.text().slice(0, 200)); });
  page.on('pageerror', e => consoleErrors.push('pageerror: ' + String(e).slice(0, 200)));
  await page.goto(BASE_URL);
  await waitFor(`document.querySelector('#player-form') || document.querySelector('#app').children.length`, 20000, 'app load');
  await ev(HELPERS);

  // ---------- PART A ----------
  check('A0 welcome screen shows player form', await ev(`!!document.querySelector('#player-form')`));
  await ev(`window.__qa.submitPlayer('AuditKid')`); await sleep(200);
  check('A1 home shows Total XP 0', (await ev(`window.__qa.text('#total-xp')`)) === '0', await ev(`window.__qa.text('#total-xp')`));
  await click('levels:1'); await click('week:1'); await click('start:easy');
  check('A2 quiz Q1 is W1-E-01 code', (await ev('window.__qa.bodyText()')).includes("print('Hello, Python!')"));
  await click('trace-open');
  let st = await traceState();
  check('A3 layout order toolbar<code<output<narration', st.order.toolbar < st.order.code && st.order.code < st.order.output && st.order.output < st.order.narration, JSON.stringify(st.order));
  check('A4 step0 output empty', st.output === '', JSON.stringify(st.output));
  await click('trace-next'); st = await traceState();
  check('A5 step1 arrow on line 1', st.rows.filter(r => r.active).map(r => r.lineno).join() === '1');
  check('A6 step1 Call print() tag', st.rows.flatMap(r => r.tags).some(t => t.includes('Call print()')), JSON.stringify(st.rows));
  check('A7 step1 output', st.output === 'Hello, Python!', JSON.stringify(st.output));
  check('A8 step1 next disabled, prev enabled', st.nextDisabled === true && st.prevDisabled === false);
  await click('trace-prev'); st = await traceState();
  check('A9 prev rewinds output to empty', st.output === '');
  await click('trace-next'); await click('trace-restart'); st = await traceState();
  check('A10 restart returns to step 0', st.count.startsWith('Step 0') && st.output === '', st.count);
  await click('trace-close');
  await ev(`window.__qa.clickOptionByText('Hello Python')`); await sleep(60);
  await click('check');
  let body = await ev('window.__qa.bodyText()');
  check('A11 wrong answer feedback', body.includes('Not quite'), body.slice(0, 200));
  check('A12 wrong-answer buttons hint/retry/reveal', await ev(`window.__qa.actionExists('hint') && window.__qa.actionExists('retry') && window.__qa.actionExists('reveal')`));
  await click('hint');
  check('A13 hint text', (await ev(`window.__qa.text('.hint')`) || '').includes('print displays its argument'), await ev(`window.__qa.text('.hint')`));
  await click('retry');
  await ev(`window.__qa.clickOptionByText('Hello, Python!')`); await sleep(60);
  await click('check');
  body = await ev('window.__qa.bodyText()');
  check('A14 correct feedback + explanation', body.includes('Correct!') && body.includes('displays the text inside quotes'), body.slice(0, 200));
  await click('next');
  // Q2-Q5: reveal requires a wrong submission first (app design). Submit a
  // deliberately wrong answer, check, then reveal, then next.
  const w1easy = questions.filter(q => q.week === 1 && q.difficulty === 'easy');
  async function wrongThenReveal(q) {
    if (q.options) {
      const wrong = q.options.find(o => o !== q.answer);
      await ev(`window.__qa.clickOptionByText(${JSON.stringify(wrong)})`); await sleep(50);
    } else {
      await ev(`window.__qa.setInput('#answer', 'zzz-wrong')`);
    }
    await click('check');
    return click('reveal');
  }
  check('A15 show answer reveals answer+explanation', await wrongThenReveal(w1easy[1]) && (await ev('window.__qa.bodyText()')).includes('Answer & explanation'));
  await click('next'); // Q3
  await wrongThenReveal(w1easy[2]); await click('next'); // Q4
  await wrongThenReveal(w1easy[3]); await click('next'); // Q5
  await wrongThenReveal(w1easy[4]); await click('next'); // -> results
  body = await ev('window.__qa.bodyText()');
  check('A16 results 1/5 solved', /1\/5/.test(body), body.slice(0, 300));
  check('A17 results +10 XP', body.includes('+10'), body.slice(0, 300));
  check('A18 header XP now 10', (await ev(`window.__qa.text('#total-xp')`)) === '10', await ev(`window.__qa.text('#total-xp')`));
  await click('review:easy');
  body = await ev('window.__qa.bodyText()');
  check('A19 review card 1 shows saved+correct answer', body.includes('Your saved answer') && body.includes('Correct answer') && body.includes('Card 1 / 5'), body.slice(0, 200));
  await click('review-next');
  body = await ev('window.__qa.bodyText()');
  check('A20 review next moves to card 2', body.includes('Card 2 / 5'));
  await click('back'); // -> difficulty

  // ---------- PART B: W4-M-01 ----------
  await click('back'); // -> levels
  await click('week:4'); await click('start:medium');
  check('B0 W4-M-01 code shown', (await ev('window.__qa.bodyText()')).includes('print(square(4) + 1)'));
  await click('trace-open');
  const states = [await traceState()];
  for (let i = 1; i <= 8; i++) { await click('trace-next'); states.push(await traceState()); }
  const allTags = s => s.rows.flatMap(r => r.tags.map(t => `L${r.lineno}:${t}`));
  check('B1 step1 Define square() on line 1', allTags(states[1]).some(t => t.startsWith('L1:') && t.includes('Define square()')), JSON.stringify(allTags(states[1])));
  check('B2 step2 Call square(4) on line 3', allTags(states[2]).some(t => t.startsWith('L3:') && t.includes('Call square(4)')), JSON.stringify(allTags(states[2])));
  check('B3 step3 n = 4 tag', allTags(states[3]).some(t => t.includes('n = 4')), JSON.stringify(allTags(states[3])));
  check('B4 step4 calc tag 4 * 4 = 16, output empty', allTags(states[4]).some(t => t.includes('4 * 4 = 16')) && states[4].output === '', JSON.stringify(allTags(states[4])));
  check('B5 step5 return 16 tag, output empty', allTags(states[5]).some(t => t.includes('16')) && states[5].output === '', JSON.stringify(allTags(states[5])));
  check('B6 step6 n = 4 GONE after return', !allTags(states[6]).some(t => t.includes('n = 4')), JSON.stringify(allTags(states[6])));
  check('B7 step7 calc 16 + 1 = 17, output STILL empty', allTags(states[7]).some(t => t.includes('16 + 1 = 17')) && states[7].output === '', JSON.stringify(allTags(states[7])));
  check('B8 step8 Call print() and output 17', allTags(states[8]).some(t => t.includes('Call print()')) && states[8].output === '17', JSON.stringify({ tags: allTags(states[8]), out: states[8].output }));
  await click('trace-prev'); st = await traceState();
  check('B9 prev from step8 empties output', st.output === '');
  await click('trace-restart'); st = await traceState();
  check('B10 restart to step 0', st.count.startsWith('Step 0'));
  await click('trace-close');

  // ---------- PART C: W3-E-01 ----------
  await click('back'); await click('back'); // -> levels
  await click('week:3'); await click('start:easy');
  await click('trace-open');
  const cstates = [await traceState()];
  for (let i = 1; i <= 7; i++) { await click('trace-next'); cstates.push(await traceState()); }
  const line1Tags = s => (s.rows.find(r => r.lineno === 1)?.tags || []).join(' | ');
  check('C1 iter tags i=0,1,2 with check mark', [1, 3, 5].every((si, k) => line1Tags(cstates[si]).includes('✓') && line1Tags(cstates[si]).includes(`i = ${k}`)), [1, 3, 5].map(si => line1Tags(cstates[si])).join(' ;; '));
  check('C2 output accumulates 0 / 0,1 / 0,1,2', cstates[2].output === '0' && cstates[4].output === '0\n1' && cstates[6].output === '0\n1\n2', JSON.stringify([cstates[2].output, cstates[4].output, cstates[6].output]));
  check('C3 final step Loop Finished cross tag', line1Tags(cstates[7]).includes('✕') && line1Tags(cstates[7]).includes('Loop Finished'), line1Tags(cstates[7]));
  await click('trace-close');
  // W3-E-01 is multiple choice now; the multiline *typed* answer check
  // moved to W4-H-03, the remaining typed card with a two-line answer.
  await startQuest(4, 'hard');
  await click('skip'); await click('skip'); // -> Q3 (W4-H-03)
  const h3 = qById['W4-H-03'];
  await ev(`window.__qa.setInput('#answer', ${JSON.stringify(h3.answer)})`);
  await click('check');
  body = await ev('window.__qa.bodyText()');
  check('C4 multiline typed answer marked Correct', body.includes('Correct!'), body.slice(0, 200));

  // ---------- PART D: resume + isolation ----------
  await click('back'); await click('back'); // -> levels
  await click('week:1'); await click('start:medium');
  const hasTextarea = await ev(`!!document.querySelector('#answer')`);
  if (hasTextarea) await ev(`window.__qa.setInput('#answer', 'testdraft')`);
  else await ev(`[...document.querySelectorAll('[data-choice]')][1]?.click()`);
  await sleep(80);
  await click('back'); // -> difficulty
  await click('start:medium');
  body = await ev('window.__qa.bodyText()');
  check('D1 resume screen appears', body.includes('Your quest is saved'), body.slice(0, 200));
  await click('resume');
  let restored = false;
  if (hasTextarea) restored = (await ev(`document.querySelector('#answer')?.value`)) === 'testdraft';
  else restored = await ev(`[...document.querySelectorAll('[data-choice]')].some(b => b.getAttribute('aria-pressed') === 'true')`);
  check('D2 continue restores draft', restored);
  await ev(`document.getElementById('player-switch').click()`); await sleep(200);
  await ev(`window.__qa.submitPlayer('OtherKid')`); await sleep(200);
  check('D3 OtherKid isolated XP 0', (await ev(`window.__qa.text('#total-xp')`)) === '0', await ev(`window.__qa.text('#total-xp')`));
  await ev(`document.getElementById('player-switch').click()`); await sleep(200);
  await ev(`window.__qa.submitPlayer('AuditKid')`); await sleep(200);
  check('D4 AuditKid XP back to 10', (await ev(`window.__qa.text('#total-xp')`)) === '10', await ev(`window.__qa.text('#total-xp')`));

  // ---------- PART F: skip question + bonus follow-ups ----------
  // F1: skip every card of a quest -> 0/5 solved, review labels them skipped.
  await startQuest(2, 'medium');
  for (let k = 1; k <= 5; k++) {
    const hasSkip = await ev(`window.__qa.actionExists('skip')`);
    if (k === 1) check('F1 skip button offered before answering', hasSkip);
    await click('skip');
  }
  body = await ev('window.__qa.bodyText()');
  check('F2 skipping all five gives 0/5 solved', /0\/5/.test(body), body.slice(0, 300));
  await click('review:medium');
  body = await ev('window.__qa.bodyText()');
  check('F3 review labels the card as Skipped', body.includes('⏭ Skipped'), body.slice(0, 300));
  await click('back'); // -> difficulty
  body = await ev('window.__qa.bodyText()');
  check('F14 difficulty page flags Hard and Extra Rock bonus challenges', body.includes('⭐ Bonus challenge · 2 per card') && body.includes('bug hunts'), body.slice(0, 300));
  // F2: bonus follow-ups on a Hard card (W4-H-01 has two).
  await startQuest(4, 'hard');
  const h1 = qById['W4-H-01'];
  async function answerMain(q) {
    if (q.options) { await ev(`window.__qa.clickOptionExact(${JSON.stringify(q.answer)})`); await sleep(60); }
    else await ev(`window.__qa.setInput('#answer', ${JSON.stringify(q.answer)})`);
    await click('check');
  }
  body = await ev('window.__qa.bodyText()');
  check('F15 card start hints at 2 hidden bonus questions', body.includes('hides 2 bonus questions'), body.slice(0, 300));
  await answerMain(h1);
  check('F4 bonus offered after solving a Hard card', await ev(`window.__qa.actionExists('f-start')`));
  await click('f-start');
  body = await ev('window.__qa.bodyText()');
  check('F5 bonus 1 view shows its prompt', body.includes('Bonus 1 / 2') && body.includes(h1.followups[0].prompt), body.slice(0, 300));
  await ev(`window.__qa.clickOptionExact(${JSON.stringify(h1.followups[0].answer)})`); await sleep(60);
  await click('check');
  body = await ev('window.__qa.bodyText()');
  check('F6 bonus 1 correct feedback', body.includes('Correct!'), body.slice(0, 300));
  await click('f-next');
  body = await ev('window.__qa.bodyText()');
  check('F7 bonus 2 view', body.includes('Bonus 2 / 2') && body.includes(h1.followups[1].prompt), body.slice(0, 300));
  await ev(`window.__qa.clickOptionExact(${JSON.stringify(h1.followups[1].answer)})`); await sleep(60);
  await click('check');
  await click('f-next'); // done with bonuses -> back to the solved card
  body = await ev('window.__qa.bodyText()');
  check('F8 after bonuses, back on the solved card', body.includes('Question 1 / 5') && body.includes('Correct!'), body.slice(0, 300));
  check('F16 card shows all bonus questions done', body.includes('All 2 bonus questions done'), body.slice(0, 300));
  await click('next');
  // F3: skipping bonuses leaves the flow intact (W4-H-02 also has follow-ups).
  const h2 = qById['W4-H-02'];
  body = await ev('window.__qa.bodyText()');
  if (body.includes('Question 2 / 5')) {
    await answerMain(h2);
    await click('f-start');
    await click('f-skip');
    await click('f-skip');
    body = await ev('window.__qa.bodyText()');
    check('F9 bonuses can both be skipped back to the card', body.includes('Question 2 / 5') && !body.includes('Bonus'));
  }

  // F4: bug-hunt follow-ups on an Extra Rock card (W4-X-04: generated
  // follow-up first, then the debug pair).
  await startQuest(4, 'extra');
  await click('skip'); await click('skip'); await click('skip'); // -> Q4
  const x4 = qById['W4-X-04'];
  body = await ev('window.__qa.bodyText()');
  if (body.includes('Question 4 / 5')) {
    check('F17 bug-hunt card hints at 3 bonus questions incl. a bug hunt', body.includes('hides 3 bonus questions') && body.includes('bug hunt'), body.slice(0, 300));
    await answerMain(x4);
    await click('f-start');
    await click('f-skip'); // skip the generated follow-up
    body = await ev('window.__qa.bodyText()');
    check('F10 bug hunt shows the buggy code and wrong output', body.includes('🐛 Bug hunt') && body.includes('prints 2 instead of 4'), body.slice(0, 300));
    const debugPair = x4.followups.filter(f => f.code);
    await ev(`window.__qa.clickOptionExact(${JSON.stringify(debugPair[0].answer)})`); await sleep(60);
    await click('check');
    body = await ev('window.__qa.bodyText()');
    check('F11 wrong line identified', body.includes('Correct!'), body.slice(0, 300));
    await click('f-next');
    body = await ev('window.__qa.bodyText()');
    check('F12 fix question follows', body.includes('How should that line be fixed?'), body.slice(0, 300));
    await ev(`window.__qa.clickOptionExact(${JSON.stringify(debugPair[1].answer)})`); await sleep(60);
    await click('check');
    body = await ev('window.__qa.bodyText()');
    check('F13 fix accepted', body.includes('Correct!'), body.slice(0, 300));
  }

  // ---------- PART E: full sweep of all 160 walkthroughs ----------
  const diffs = ['easy', 'medium', 'hard', 'extra'];
  let swept = 0, sweepProblems = [];
  for (const w of [1, 2, 3, 4, 6, 7, 8, 9]) {
    for (const d of diffs) {
      await startQuest(w, d);
      const qs = questions.filter(q => q.week === w && q.difficulty === d);
      for (const q of qs) {
        const probs = await walkTrace(q.id);
        if (probs.length) sweepProblems.push(...probs.slice(0, 4));
        swept++;
        await click('trace-close');
        if (q.options) {
          const wrong = q.options.find(o => o !== q.answer);
          await ev(`window.__qa.clickOptionByText(${JSON.stringify(wrong)})`); await sleep(40);
        } else {
          await ev(`window.__qa.setInput('#answer', 'zzz-wrong')`);
        }
        await click('check');
        await click('reveal');
        await click('next');
      }
    }
  }
  check(`E1 full sweep ${swept} walkthroughs step-by-step vs JSON`, sweepProblems.length === 0, sweepProblems.slice(0, 8).join(' ;; '));
  check('E2 no console errors / exceptions during entire session', consoleErrors.length === 0, consoleErrors.slice(0, 4).join(' ;; '));

  const failed = results.filter(r => !r.ok);
  console.log(`\n===== E2E SUMMARY: ${results.length - failed.length}/${results.length} checks passed, ${failed.length} failed =====`);
  for (const f of failed) console.log('FAILED:', f.name, '::', f.detail);
  process.exit(failed.length ? 1 : 0);
}
main().catch(e => { console.error('DRIVER ERROR:', e.message); process.exit(1); });
