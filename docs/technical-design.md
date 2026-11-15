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

**Normative specification, version 0.6.6.** These rules apply to *every* Challenge 1 question, regardless of week or difficulty. A change to this contract must change the **shared renderer**, relevant tests and documentation; no single-card UI overrides are permitted. Earlier v0.4–v0.6.5 rendering notes in CHANGELOG are historical and do not define current behavior.

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
| `print()` | The executing print line is highlighted; **no inline Output tag** | New text appears in the dedicated Output panel |

For compound Boolean expressions, display the **final full-expression truth value**, not an intermediate comparison value. Bindings can wrap onto a second visual row *inside the same code line*, preserving code legibility without horizontal searching.

### 7.4 Function-scoped and global variable lifetimes

`tracePersistentBindings(steps, index, codeLines)` reconstructs live bindings by replaying snapshots through the selected index into a stack of call frames:

1. Global bindings persist to program end unless updated; each variable occupies only its newest assignment location.
2. A function-entry step pushes a new frame. Parameters appear on its `def` line before the first body statement runs.
3. Nested function calls retain the outer frame's parameters/locals while also displaying the active inner frame. Same-name variables in distinct frames are distinct bindings.
4. A `return` statement still belongs to the function, so its locals remain visible **on that return step**. They disappear when the subsequent `Return from fn()` step restores the caller.
5. Previous, Next and Restart reconstruct the same state deterministically and never modify saved scoring or quiz attempts.

The current implementation assumes the fixed introductory Python examples. More advanced Python semantics (closures, recursion, `nonlocal`, mutable object aliasing, exceptions) should be represented by explicit frame IDs / typed events in the trace data before expansion; do not infer ambiguous scope from English explanations.

### 7.5 Layout and interaction

The content column is up to **1,180 px** wide and a question panel up to **1,100 px**. The dark code panel fills the card. Each source row can wrap annotation badges within its own row, keeping long parameter/value groups visible without mandatory sideways scrolling. The top toolbar also wraps responsively for phones. The separate Output box has an intentional empty minimum height; it never disappears just because `step.output` is empty. Explanation text may grow to fit content, but cannot cause the **top** navigation controls to shift.

Closing or opening a walkthrough, navigating its steps, or reviewing a finished card does **not** change XP, best scores, attempts or saved progress.

### 7.6 Content and CI quality gates

Changes to question code/answers or walkthrough data require matching trace steps. The automated suite must test **all 80 questions**, and the renderer must work identically for all difficulties:

```bash
python3 tests/validate_python.py
node tests/validate-traces.mjs
node tests/validate-trace-control-flow.mjs
node tests/validate-trace-decisions.mjs
node tests/validate-inline-trace.mjs
node tests/validate-trace-scopes.mjs
node tests/validate-trace-events.mjs
node tests/validate-walkthrough-layout.mjs
node tests/validate-walkthrough-layout.mjs
```

The last test **renders all 978 trace snapshots**, checks top-controls → code → Output → Explanation order, confirms the Output section is empty at step 0, verifies *exact* cumulative output at every step, and rejects old inline Output badges. The event tests verify that new stdout occurs on actual `print()` lines, and the scoped-binding tests verify nested-call local-variable lifetimes. The generated Hard/Extra traces also undergo exact step-by-step arrow/variable/narration checks. Manual desktop/mobile visual QA remains necessary for wrapping and accessibility.

**Representative manual regressions:** `W4-E-01` (`greet()` prints `Hi`), `W4-M-01` (`square(4)` returns 16), `W4-H-01` (nested `total_cost` calls), `W4-X-01` (nested `message` and `xp_needed`), a Week 3 `for` and `while` loop, and `W2-M-03` (`else` then `print('Wait')`). Test first, middle and final steps including Previous/Restart.


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
node tests/validate-traces.mjs
node tests/validate-trace-control-flow.mjs
node tests/validate-trace-decisions.mjs
node tests/validate-inline-trace.mjs
node tests/validate-trace-scopes.mjs
node tests/validate-trace-events.mjs
```

The GitHub Actions workflow `.github/workflows/validate-questions.yml` runs these validations after pushes/PRs (when enabled). These tests check static question/answer pairing, generated call/return sequencing, arrow-line compatibility, decision badges, and inline annotation behavior; they do **not** replace browser visual QA.

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
