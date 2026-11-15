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

## 7. Inline Trace design

**Current design (v0.6.4): one wider dark code panel, no Variables/Output side column.** Trace is optional and only appears after selecting **Watch How the Code Works** on a quiz or a completed review card. It keeps the original card layout. Below the code are Step and a bold red **Explanation:** plus Previous/Next Step/Restart. Close hides the trace. It does not affect grading, progress, or XP.

Each trace lives in `data/traces-week1.json` through `data/traces-week4.json`, keyed by exact question ID. Each has an ordered array of authored/precomputed step snapshots:

```json
{
  "line": 7,
  "variables": {"xp": 730, "level": 6},
  "output": [],
  "explanation": "Call xp_needed(6) from this line."
}
```

- `line` is **zero-based**, matching `question.code.split('\\n')`; `line: -1` means the initial ready state.
- `variables` is a **full variable snapshot** for the current frame, not just the changes.
- `output` is the **cumulative printed output** through the current step.
- `explanation` is written for children; an optional `error` describes failure.

**Rendering:** `tracePanel()` maps `code` into line-numbered rows. It highlights exactly `step.line` and draws an arrow beside that row. `traceInlineDetails(step, previous, source, condition)` produces temporary event annotations **only on the highlighted row**. Persistent variable badges from `tracePersistentBindings()` may remain on earlier code rows until reassigned or out of scope.

- **Variable badges** are reconstructed from all trace steps through the selected index by `tracePersistentBindings(steps, index, codeLines)`. Each live binding belongs to a function-call frame (or global frame) and is rendered at its *latest assignment* or `def` parameter-binding line, not necessarily the currently highlighted line. Reassignments move the badge to the new line. Inner-frame variables disappear on the `Return from ...` step, but remain visible on the actual `return` statement; outer/global variables remain visible during nested calls. The original snapshots still describe each step, and `traceInlineDetails()` supplies ephemeral call, print and condition tags at the active line only.
- **Condition tags** come from `traceCondition()` and `traceInlineValues()`: ✓ green when true, ✕ red when false, alongside current values and the action (Enter/Skip Branch, Continue/Exit Loop, Next Iteration/Loop Finished). For compound conditions, the final full-expression verdict is used.
- **Output tags** represent output added at the actual `print()` source line. Unlike call/condition hints, printed output persists on its original print line after stepping away and across function returns. Each newly printed line is retained; prior output is not erased.
- **Call/return tags** appear on the call site, function-entry `def` line, and return-to-caller line in sequence. The initial `def` declaration displays `Function defined` based on source semantics, not on exact punctuation in the explanation.
- **Variable badges persist** at their last binding/update line while their scope is alive. **Event annotations** (calls, returns, ✓/✕) are temporary; **printed output** stays on its print line and attach only to the current execution line. Older values and ended function locals are removed.

**Important example — `W4-X-01`:** `print(message(730, 6))` (line 12) → **enter `def message(xp, level):` (line 7)** and bind `xp = 730`, `level = 6` → start executing `needed = xp_needed(level)` (line 8), which calls `xp_needed(6)` → **enter `def xp_needed(level):` (line 1)** and bind `level = 6` → execute condition on line 2 (False) and line 4 (True) → return 900 on line 5 → return to **line 8** → set `needed = 900` on line 8 → evaluate the rest of `message()` → return to the `print()` on line 12 and display `Need 170`. The def-line entry step is a pedagogical visualization of parameter binding; in Python, the `def` statement itself executes during initial program setup, while a function call transfers execution into its body. **Do not merge function entry and execution of the first body statement in one step.**

The program's Python code is **not executed in the student's browser**. Walkthroughs are fixed JSON and must be reviewed against the exact current question source. `scripts/build-trace-runtime.js` is an offline generator for selected teacher-authored patterns; it is not a production Python interpreter and cannot be used for arbitrary student input.

### How the UI chooses what to show (consistent across 80 questions)

Historically, the first Easy/Medium walkthroughs were individually authored, while Hard/Extra Rock walkthroughs were mainly generated with `scripts/build-trace-runtime.js`. Their differences in narration led to inconsistent UI tags when the renderer relied on a specific English phrase. The UI now prioritizes source-code location and state changes:

| Event | Determining rule | Display and lifetime |
|---|---|---|
| Function definition | Current source line begins with `def` and the trace reports a definition step | **Function defined** on that source line |
| Function invocation | The trace call step is at the calling source line | Temporary **Call ...** tag |
| Function entry | Trace enters a frame at its `def` line | **Enter ...**, with parameter values; parameters persist while frame exists |
| Assignment or loop variable change | `variables` snapshot changes, with the current code statement | Persistent latest-value badge at the new assignment line |
| `if` / `elif` / `for` / `while` | Condition / iteration trace step + code line | Temporary ✓ or ✕ at highlighted check |
| `return` and return to caller | Return events in trace at body and caller lines | Temporary return-value tag, remove that frame's local-variable badges only on return to caller |
| `print()` | Newly appended output in consecutive `output` snapshots, source line must be `print(...)` | **Output: ...** pinned to this print line and stays visible in subsequent steps |

`traceInlineDetails()` draws temporary event tags, `tracePersistentBindings()` reconstructs scope-aware variable badges, and `tracePersistentOutputs()` accumulates printed lines at their actual `print()` source locations. Even if narration wording changes, definition display is based on the code line; print/output display is based on cumulative output changes. This is a deliberately static educational visualization, not a runtime interpreter.

The audit checks **all 80** question traces. Every printed-output event must occur on a `print()` line, every definition must have its label, and output remains available after the executing arrow moves. Test: `node tests/validate-trace-events.mjs`. Keep the generated Hard/Extra traces and authored older traces aligned to the same contract.

### Width and inline wrapping

The main content max width is **1,180px**, and the question card max width is **1,100px** on larger screens. Each code row uses wrapping flex layout: the source remains visible and any number of variable badges can wrap to another visual row **inside the same source line**. The layout does not put a separate Variables column back into the panel. For small screens, the code or badges may wrap more, while the Explain/Next controls remain beneath the code.

### Variable lifetime algorithm

`tracePersistentBindings()` replays the static trace up to the current step into a stack of frame maps. The global frame begins empty. On `Enter fn()` it pushes a new frame and binds parameters beside that function's `def` line. Each new or changed local variable is placed at its current source line, replacing the previous location for that variable in the same frame. A return statement does **not** end the frame until the subsequent `Return from fn()` event, at which point the frame is popped and its badges disappear. The caller's frame remains on the stack during nested calls, so existing caller parameters and globals are not lost. Rendering is deterministic for Next, Previous and Restart without changing stored user progress.

Known bounds: the scope reconstruction uses current teacher-authored step explanations and simple assignments/loop variables. If trace formats expand to advanced Python features (`global`/`nonlocal`, closures, exception unwinding, recursion, destructuring, or mutable objects), add explicit frame/local-variable metadata to the trace schema and extend tests before relying on these heuristics.

## 8. Styling, accessibility, and responsive behavior

`styles.css` owns all visual presentation; there are no external font files or runtime CSS libraries. Cards have light borders, prominent primary buttons, simple tags and adequate whitespace. The Trace panel has a dark `#182638` code background, yellow execution arrow/highlight, and code-side tags: warm yellow variable values, blue printed output, violet calls/returns, green ✓ and red ✕ decisions. The red bold Explanation label below the code anchors the educational commentary. The Explanation paragraph has a CSS minimum height of three text lines (`line-height: 1.6; min-height: 4.8em`) so Previous/Next/Restart controls remain stationary for short descriptions; longer content expands without being clipped.

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
