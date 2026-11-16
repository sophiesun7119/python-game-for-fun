# Python Quest — Technical Design & Implementation Guide

> Maintainer/developer documentation for the current static browser-based Challenge 1 prototype (80 questions, 4 weeks). Keep this document updated with the implementation; historical changes live in [CHANGELOG](../CHANGELOG.md).

## 1. Goals and non-goals

**Goals:** kid-friendly Python practice; choice of week/difficulty; hints, retries and review; XP, stars and badges; local username-separated progress; deterministic step-by-step code traces showing execution order and inline state changes.

**Current non-goals:** backend, hosted accounts, email/password authentication, cross-device sync, server database, student-code execution, a live Python interpreter, timed exams, leaderboard and access-controlled grade reporting.

## 2. System overview

```text
Browser (static HTML/CSS/ES modules)
  index.html
    ├─ styles.css               visual design and responsive layouts
    └─ src/app.js               UI state, navigation, quiz and trace rendering
          ├─ src/scoring.js     pure scoring utilities + browser persistence
          ├─ data/questions.json
          └─ data/traces-week1..4.json

Browser Storage:
  sessionStorage → active nickname for this session
  localStorage   → player best scores + unfinished and completed quest snapshots

No server processing during gameplay. A local HTTP server is used only to serve files.
```

**Entry point:** `index.html` loads `src/app.js` as a JavaScript module. `init()` fetches the question JSON and four separate trace JSON files; the app expects 80 questions and fills `#app` via `render()`. The UI uses DOM event delegation on `#app` and a dedicated handler for the top-bar Switch Player control. No frontend framework or npm build step is required.

## 3. UI design and screens

The visual language is light, rounded challenge cards with a blue primary action and a dark `#182638` code surface. Layouts adapt to narrower screens. Key views are controlled by `state.view`:

| View | Main purpose |
|---|---|
| `welcome` | Optional nickname; blank becomes `username` |
| `home` | XP summary, recommended quest, unfinished-quest shortcuts |
| `levels` | Choose one of four weeks |
| `difficulty` | Choose Easy/Medium/Hard/Extra Rock; optional review link |
| `quiz` | Five question cards, answer choice/input, hint/retry/reveal |
| `resume` | Continue the stored attempt or discard that attempt |
| `results` | Quest score, new XP, personal best, review entry |
| `review` | Latest completed cards, previous/next, practice-only retry |
| `progress` | Quest scores, badges and archived old Hard scores |

`state` is a lightweight UI state machine, with current `week`, `difficulty`, `index`, `attempt`, `draft`, `checked`, `feedback`, `hint`, `traceOpen`, `traceIndex`, and review-specific fields. `navigate()` rerenders and resets transient trace playback; `start()`, `hydrateRun()`, `check()`, `next()` and `finishQuest()` advance the quiz lifecycle.

## 4. Question bank schema

Source: `data/questions.json`. Each of the **80** question objects has fields such as:

```json
{
  "id": "W1-E-01",
  "week": 1,
  "difficulty": "easy",
  "concept": "print output",
  "type": "multiple_choice",
  "prompt": "What prints?",
  "code": "print('Hello, Python!')",
  "options": ["Hello, Python!", "'Hello, Python!'", "Hello Python", "Error"],
  "answer": "Hello, Python!",
  "explanation": "A print statement displays the text inside quotes.",
  "hint": "Remember that print displays its argument."
}
```

Some questions use `short_answer` (no choices), and curriculum-aligned Hard/Extra questions may also include `curriculumReference`. The bank has five cards for each (week, difficulty) pair, and its current curriculum revision is `curriculum-v2`.

**Optional `followups`:** a question may carry a `followups` array of extra questions about the *same* code (`prompt`, `type`, `options` when multiple-choice, `answer`, `explanation`). After the main card is solved or revealed, the quiz offers them as **Bonus questions**: unscored practice, one attempt each with the answer and explanation shown afterwards, skippable individually or as a set (the normal Next button remains available). Hard cards currently carry two follow-ups and Extra Rock cards one; they were derived from the verified traces by `scripts/generate-followups.py`, which re-checks every derived answer against a real CPython run before writing. `tests/validate-question-schema.mjs` validates follow-ups to the same standard as main cards. Discoverability: the difficulty page tags Hard and Extra Rock with a ⭐ Bonus challenge label, and a card with follow-ups shows a ⭐ hint at the top from the start stating how many it hides (and whether one is a bug hunt), switching to unlocked/done states as they are played.

A follow-up may also carry its own `code` field: a **bug-hunt variant** of the card's code with exactly one line broken. Selected Extra Rock cards carry a bug-hunt pair — "Which line is wrong?" (the buggy code's wrong output is stated in the prompt) followed by "How should that line be fixed?" — authored and verified by `scripts/add-debug-followups.py`, which runs every variant and rejects any bug or "wrong fix" that would still print the correct output. The follow-up view renders a `code` variant as a numbered static code block without a walkthrough.

**Question-type policy:** all multiple choice is single-answer. Easy cards are all multiple choice; Medium is roughly half multiple choice (long, multi-line, or case-sensitive typed answers converted by `scripts/convert-to-multiple-choice.py`) and half typed; Hard and Extra Rock main cards stay typed, with multiple-choice follow-ups.

**Skipping:** before submitting, a card offers **Skip question**, which marks the card skipped (stored as `skipped: true` alongside `revealed: true`, so it earns no XP and counts as not solved) and moves straight to the next card. Review labels such cards ⏭ Skipped.

Answer evaluation: the browser compares submitted text with the authored `answer` using `normalize()`, which normalizes Windows newlines, interprets literal `\\n`, and trims the surrounding whitespace. **It is not semantic Python evaluation**, so equivalent-looking answers may not all match. Treat educator review and answer formatting as part of content QA.

## 5. Scoring and progression

`src/scoring.js` defines point values:

| Difficulty | Per solved card | Maximum per quest |
|---|---:|---:|
| Easy | 10 | 50 |
| Medium | 15 | 75 |
| Hard | 20 | 100 |
| Extra Rock | 25 | 125 |

The current total maximum is **1,400 XP** across all 16 quests (12 original level quests + 4 optional Extra Rock quests). Stars: 0–2 solved → 0, 3 → 1, 4 → 2, 5 → 3. A topic badge requires at least three solved cards in each of Easy, Medium and Hard; Extra Rock is not required.

`check()` marks a card `solved` if the student gets it correct *before revealing the answer*. Hints and wrong attempts do not prevent the student from earning full points on a later correct Retry. `Show Answer` sets `revealed` and bars XP for that card in the run. `countCorrect()` counts solved, non-revealed cards. `updateBest()` stores the maximum score for each `W<week>-<difficulty>` key; `totalXP()` derives XP from best scores rather than accumulating every attempt. The results screen shows newly gained XP from improvement over the old best.

`recommendedQuest()` suggests incomplete Easy/Medium/Hard quests first, then optional Extra Rock; it **does not lock levels**.

## 6. Username and local persistence

`src/scoring.js` uses browser storage keys:

| Key | Storage | Contents |
|---|---|---|
| `python-quest-v2-active` | sessionStorage | Normalized username in current session |
| `python-quest-v2-players` | localStorage | Per-username display name, best scores, archived older Hard scores and curriculum revision |
| `python-quest-v3-quests` | localStorage | Per-username, per-quest `active` (unfinished) and `completed` (latest finished) snapshots |
| `python-quest-v1-progress` | localStorage | Legacy single-player data; migrates into the default guest on first selection |

`normalizeUsername()` trims and lowercases, defaulting to `username` for blank input. `selectUsername()` creates/selects a local profile; `loadProgress()` / `saveProgress()` handle best scores. `saveActive()` and `writeQuest()` persist the quiz index, draft, feedback and per-card solve/reveal metadata as the student interacts. `hydrateRun()` recreates the question objects from saved question IDs.

At completion, `finishQuest()` writes the latest `completed` snapshot, clears only `active`, updates personal best and navigates to Results. In review, practice Retry uses separate review state and does **not** update XP.

**Curriculum change safeguard:** Hard questions were replaced for `curriculum-v2`. When older players load, prior Hard personal-best scores are archived under `archivedHardBest`; old Hard active/completed snapshots are not reused for new question content. Easy/Medium scores remain.

**Privacy/security:** Nickname is only a local profile selector, not identity authentication. No database, no teacher login and no access control are implemented. Sharing a browser profile allows others to choose the same nickname. Clearing site storage or changing origin/device may lose records; `git pull` does not touch browser storage.

## 7. Walkthrough Contract — all 80 questions

**Normative specification, version 0.6.7.** These rules apply to *every* Challenge 1 question, regardless of week or difficulty. A change to this contract must change the **shared renderer**, relevant tests and documentation; no single-card UI overrides are permitted. Earlier v0.4–v0.6.5 rendering notes in CHANGELOG are historical and do not define current behavior.

### 7.1 Source of truth and rendering architecture

`data/questions.json` contains 80 questions with IDs and newline-separated `code`. Each ID has an ordered walkthrough in `data/traces-week1.json` through `data/traces-week4.json`. The browser reads these static JSON files. `src/app.js` exposes `tracePanel(q)`, which renders the same structural template for every question using the current `state.traceIndex`. `styles.css` defines presentation; no separate HTML templates are maintained for Easy, Medium, Hard or Extra Rock.

Each trace step has the following fields:

```json
{
  "line": 7,
  "variables": {"xp": 730, "level": 6},
  "output": [],
  "explanation": "Call xp_needed(6) from this line."
}
```

- `line`: **zero-based** index into `question.code.split('\n')`; the initial step uses `-1`.
- `variables`: snapshot of currently accessible values for that step; this is **not** the complete lifetime history.
- `output`: complete, ordered, **cumulative** Python stdout lines *so far*, not only newly printed text.
- `explanation`: short child-friendly explanation of the current action.
- Optional `error`: error demonstration, where applicable.

Every question starts with a ready step whose variables and output are empty. Trace data is curated/precomputed and is **not generated from executing untrusted student Python**.

### 7.2 Mandatory visual order

Inside the opened `Watch How the Code Works` card, always render these areas in this order:

| Position | Section | Behavior |
|---|---|---|
| 1 | **Title + Close** | Toggle walkthrough visibility; no effect on XP or progress |
| 2 | **Step + Previous / Next Step / Restart** | **Always above the code**; buttons enabled/disabled at the appropriate first/last step; fixed location independent of Explanation length |
| 3 | **Python Code · Execution Trace** | Single full-width dark panel; arrow and row highlight point to current `step.line` |
| 4 | **Output** | Separate panel immediately **below code**, always present and **blank until a `print()` occurs**; render `step.output` joined by newlines |
| 5 | **Explanation** | Beneath Output; bold red **Explanation:** label, then `step.explanation` |
| 6 | **Footnote** | Optional unobtrusive learning note; never replace Output or Explanation |

The Output panel is not a side column, and no Output badges are attached to source-code lines. With multiple prints, the box shows all results in chronological order. Pressing Previous rewinds it to the earlier snapshot; pressing Restart clears it. Showing a traceback is educational only; it must not change scores.

### 7.3 Code-line event rules

At any step, **exactly one source row** is marked as currently executing (except the ready step, which has no active row). The current-line arrow is authoritative: do not move the arrow to another line based only on the explanation's wording. The initial definition badge derives the function name from the actual `def` source line, e.g. `Define greet()` alongside `Call greet()`; it is never a generic unnamed label.

| Event | Display in code | Duration |
|---|---|---|
| Define `def fn(...):` | **Define fn()** on its `def` line during initial definition, using the same violet event badge and function-specific naming convention as **Call fn()** | Current step only |
| Call `fn(...)` | **Call fn(...)** on the actual caller line | Current step only |
| Enter function | Arrow to the callee **`def` line**; introduce its bound parameters there | Parameter badges remain as long as that call frame lives |
| Execute function body | Arrow advances to the actual statement, *after* the separate entry step | Per source step |
| Assignment / loop variable | Display `name = value` next to the **most recent binding or update line** | Persists until that name is reassigned or the defining scope ends; remove its old value/location |
| `if` / `elif` | Show relevant current variable values plus green **✓ True / Enter Branch** or red **✕ False / Skip Branch** | Only for the condition-evaluation step |
| `while` | Show value(s) and **✓ Continue Loop** or **✕ Exit Loop** | Only for the actual check |
| `for` | **✓ Next Iteration** with the loop variable, or **✕ Loop Finished** | Only for that iteration/check step |
| `return` | Show **↩ value** on the actual `return` statement; then return to caller and show `Return from fn() → value` | Temporary; local variable badges disappear only on return to caller |
| `print()` | The executing print line is highlighted with a violet **Call print()** event badge; **no inline Output result** | Only this print event adds text to the dedicated Output panel |
| Evaluate arithmetic | Each supported binary operation appears on the actual source line with its computed operands/result and a blue calculation badge | An intermediate step that leaves variables and Output unchanged |

For compound Boolean expressions, display the **final full-expression truth value**, not an intermediate comparison value. Bindings can wrap onto a second visual row *inside the same code line*, preserving code legibility without horizontal searching.

### 7.4 Calculation versus assignment versus printing

A complex line has an **ordered sequence of teaching events**, rather than a single explanation that skips the intermediate result. This is a data rule applied to all weeks and difficulties:

1. For a nested call such as `print(square(4) + 1)`, show the function call on the original source line, enter the target `def` with parameters, execute its body, and return **16** to the caller.
2. On that same caller line, show a separate **calculate** step: **16 + 1 = 17**. It must preserve the previous `variables` and `output` snapshot.
3. Show a separate **print** step with the violet **Call print()** badge and explanation. Only this step appends **17** to the Output panel.
4. For an assignment such as `subtotal = subtotal * 0.9`, evaluate with the **pre-assignment value**. If the old subtotal is 46, the calculation is **46 × 0.9 = 41.4**, followed by the actual assignment to the new value; never calculate `41.4 * 0.9`.
5. Compound numeric expressions are decomposed in Python precedence order; for example `19 // 4` → `19 % 4` → `4 + 3`. Parenthesized subexpressions are evaluated before their enclosing operation. Numeric expressions inside f-string placeholders are evaluated before the final formatting explanation.
6. A direct `print('Hi')` still receives a purple **Call print()** badge and specific explanation; it does not need a redundant calculation step.

Trace records for intermediate calculations have `phase: "calculate"` and an explicit `explanation`. Final printing records have `event: "print"`. On the calculation step, `line` matches the actual statement, but **no assignment or printing has happened yet**. `tracePersistentBindings()` deliberately ignores these calculation-only snapshots when deciding where to anchor values. `traceInlineDetails()` displays a blue calculation tag or a violet print-call tag; the dedicated Output panel still reads only the cumulative `step.output` array.

**Single source of transformation:** `scripts/enrich-walkthroughs.js` enriches the fixed trusted teacher-authored trace files. It is idempotent, and the 80-question regression `tests/validate-walkthrough-detail.mjs` checks this property, correct arithmetic, unchanged state during calculation, correct source line for printing, and an explanation and visible badge for every print. The `W4-M-01` regression requires the exact order **return 16 → calculate 16 + 1 = 17 → print 17**. Complex Python syntax beyond basic numeric operations is **not** treated as a general executable trace engine; it needs explicitly authored and validated educational steps.

### 7.5 Function-scoped and global variable lifetimes

`tracePersistentBindings(steps, index, codeLines)` reconstructs live bindings by replaying snapshots through the selected index into a stack of call frames:

1. Global bindings persist to program end unless updated; each variable occupies only its newest assignment location.
2. A function-entry step pushes a new frame. Parameters appear on its `def` line before the first body statement runs.
3. Nested function calls retain the outer frame's parameters/locals while also displaying the active inner frame. Same-name variables in distinct frames are distinct bindings.
4. A `return` statement still belongs to the function, so its locals remain visible **on that return step**. They disappear when the subsequent `Return from fn()` step restores the caller.
5. Previous, Next and Restart reconstruct the same state deterministically and never modify saved scoring or quiz attempts.

The current implementation assumes the fixed introductory Python examples. More advanced Python semantics (closures, recursion, `nonlocal`, mutable object aliasing, exceptions) should be represented by explicit frame IDs / typed events in the trace data before expansion; do not infer ambiguous scope from English explanations.

### 7.6 Layout and interaction

The content column is up to **1,180 px** wide and a question panel up to **1,100 px**. The dark code panel fills the card. Each source row can wrap annotation badges within its own row, keeping long parameter/value groups visible without mandatory sideways scrolling. The top toolbar also wraps responsively for phones. The separate Output box has an intentional empty minimum height; it never disappears just because `step.output` is empty. Explanation text may grow to fit content, but cannot cause the **top** navigation controls to shift.

Closing or opening a walkthrough, navigating its steps, or reviewing a finished card does **not** change XP, best scores, attempts or saved progress.

### 7.7 Content and CI quality gates

Changes to question code/answers or walkthrough data require matching trace steps. The automated suite must test **all 80 questions**, and the renderer must work identically for all difficulties:

```bash
python3 tests/validate_python.py
python3 tests/validate-trace-cpython.py
node tests/validate-question-schema.mjs
node tests/validate-traces.mjs
node tests/validate-trace-control-flow.mjs
node tests/validate-trace-decisions.mjs
node tests/validate-inline-trace.mjs
node tests/validate-trace-scopes.mjs
node tests/validate-trace-events.mjs
node tests/validate-walkthrough-layout.mjs
node tests/validate-walkthrough-detail.mjs
```

`validate-question-schema.mjs` checks the question bank itself (required fields, multiple-choice options contain the answer exactly once, no duplicate options, hints present and never containing the answer verbatim). `validate-trace-cpython.py` cross-checks every trace step against a real CPython `sys.settrace` execution (see §7.8). A separate browser end-to-end suite, `tests/e2e-browser.cjs`, drives the served site through the §9 manual regression sequence and steps through all 80 walkthroughs in a real browser; it runs as its own CI job because it needs Playwright (see §9).

The layout test **renders all 1,103 trace snapshots**, checks top-controls → code → Output → Explanation order, confirms the Output section is empty at step 0, verifies *exact* cumulative output at every step, and rejects old inline Output badges. The event tests verify that new stdout occurs on actual `print()` lines, and the scoped-binding tests verify nested-call local-variable lifetimes. The generated Hard/Extra traces also undergo exact step-by-step arrow/variable/narration checks. Manual desktop/mobile visual QA remains necessary for wrapping and accessibility.

**Representative manual regressions:** `W4-E-01` (`greet()` prints `Hi`), `W4-M-01` (`square(4)` returns 16), `W4-H-01` (nested `total_cost` calls), `W4-X-01` (nested `message` and `xp_needed`), a Week 3 `for` and `while` loop, and `W2-M-03` (`else` then `print('Wait')`). Test first, middle and final steps including Previous/Restart.

### 7.8 Pedagogical marker steps

Most trace steps correspond one-to-one to a real CPython execution event on their line. A small number of steps are **pedagogical marker steps**: they exist to teach a transition that CPython does not surface as its own line event. Only these forms are allowed:

1. **Branch markers** on an `else:` / `elif` line, explaining that the condition was False/checked and which branch runs next (CPython never executes the `else:` line itself).
2. **Same-line sub-steps** that decompose one statement into call → enter → calculate → return → assign → print (see §7.4), staying on that statement's line.
3. **Loop markers** on a `for` / `while` header line: the per-iteration check and the loop-finished step (including after `break`).
4. **Call-boundary steps** on a line that calls a function defined in the snippet: the *Call* step shown with the caller's variables just before the callee's entry step, and the *Return from fn()* step on the same call-site line after the callee's last body step, showing the returned value being bound or used. No single CPython event on that line carries the caller's frame at those moments.

Marker steps obey the same truthfulness invariants as execution steps: their variable snapshot and cumulative Output must equal a state the real execution actually reaches — values are never invented, Output grows only on real `print()` steps, and the next non-marker step resumes the real execution order. `tests/validate-trace-cpython.py` enforces this by replaying every question under `sys.settrace`: each non-calculation step must either match a real execution event in order or match one of the four marker forms above with a genuine execution snapshot.


## 8. Styling, accessibility, and responsive behavior

`styles.css` owns all visual presentation; there are no external font files or runtime CSS libraries. Cards have light borders, prominent primary buttons, simple tags and adequate whitespace. The Trace panel has a dark `#182638` code background, a yellow execution arrow/highlight, and code-side tags for variables, calls/returns, and green ✓ / red ✕ decisions. Printed text is shown only in the separate Output box below the code. The red bold Explanation label appears below the Output panel. Navigation controls stay above the code, so they do not shift when Explanation text grows.

The code may scroll horizontally for longer source lines (especially on phones), rather than shrinking to unreadable text. The UI uses text labels in addition to color for decisions. Interaction should remain keyboard-accessible through buttons and input controls; add live browser QA when modifying layouts, focus behavior, or screen reader announcements.

## CI troubleshooting — curated Python float output

The fixed code examples can print floating-point values ending in `.0`, such as **`W4-H-04` → `55.0`** and **`W4-X-03` → `36.0`**. The offline trace builder uses JavaScript `Number`, which formats integral-valued floats as `55` or `36`. However, actual Python correctly prints `55.0` and `36.0`. Those two **final trace steps** are deliberately curated with the correct Python output and child-friendly explanation.

The earlier control-flow test compared the generated final `explanation` literally against the curated one, causing GitHub Actions to fail with `AssertionError: W4-H-04 step 14: explanation does not match action`. The corrected test explicitly validates the final Python-formatted string and its explanation for those two cases, while still checking the same arrow position and variables. Every other Hard/Extra step must match the generator exactly.

For a failing GitHub Actions job, open **Actions → Validate Python Quest questions → failing run → validate → failed step**. Copy the first `FAIL` or `AssertionError` rather than relying on the generic email/annotation `Process completed with exit code 1`. Run the specific command locally, correct the underlying data/code or narrowly justified expected result, and only then rerun the whole workflow. The Node.js version deprecation warning from older checkout/setup actions is a separate warning, not evidence of this assertion failure.

## 9. How to test and make changes

```bash
# Serve the site
python3 -m http.server 8000

# In another terminal, run data/logic checks:
python3 tests/validate_python.py
python3 tests/validate-trace-cpython.py
node tests/validate-question-schema.mjs
node tests/validate-traces.mjs
node tests/validate-trace-control-flow.mjs
node tests/validate-trace-decisions.mjs
node tests/validate-inline-trace.mjs
node tests/validate-trace-scopes.mjs
node tests/validate-trace-events.mjs
node tests/validate-walkthrough-layout.mjs
node tests/validate-walkthrough-detail.mjs

# Browser end-to-end (drives the served site in headless Chromium;
# Playwright is installed outside the repo tree):
mkdir -p /tmp/pw && cd /tmp/pw && npm init -y >/dev/null && npm install playwright-core
/tmp/pw/node_modules/.bin/playwright-core install chromium-headless-shell
NODE_PATH=/tmp/pw/node_modules node tests/e2e-browser.cjs
```

The GitHub Actions workflow `.github/workflows/validate-questions.yml` runs the data/logic validations after pushes/PRs (when enabled), plus the browser end-to-end suite as a separate job. These tests check static question/answer pairing, generated call/return sequencing, arrow-line compatibility, decision badges, inline annotation behavior, question-schema hygiene, agreement with real CPython execution, and the interactive flows below; they do **not** replace human visual QA for wrapping and accessibility.

**Recommended manual regression sequence:**

1. Start as one player, finish a question with a wrong answer → Hint → Retry → correct; verify full XP.
2. Reveal an answer instead; verify zero points for that card.
3. Quit mid-quest, reopen same (week, difficulty) as same user and Continue Quest.
4. Switch to a second name, verify isolated scores, switch back.
5. Complete a quest, enter Review, move Previous/Next and Retry without changing XP.
6. Open Week 4 Extra Rock `W4-X-01`, follow every code-line arrow and its inline tags through nested function call/return. Confirm no sidebar exists.
7. Open a Week 3 while/for problem, verify green ✓ for iteration and red ✕ on termination.
8. Check layouts on desktop, narrow laptop and tablet/mobile.

**Maintainability rules:**

- If a question's `code`, `answer`, or ID changes, update the paired trace and rerun checks. Trace explanations and arrows must match the executed line, not a nearby line with the same concept.
- Avoid reusing old progress snapshots against substantially revised questions; manage curriculum revisions/archiving deliberately.
- Keep user instructions in [User Guide](user-guide.md), implementation changes here, rationale in [Difficulty Framework](difficulty-framework.md), and release notes in [CHANGELOG](../CHANGELOG.md).
