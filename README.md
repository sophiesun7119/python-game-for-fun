# Python Quest 🐍

## Documentation

- **[User Guide — for students, parents and teachers](docs/user-guide.md):** how to start, pick a week, solve and retry questions, use Watch How the Code Works, resume progress, review cards and understand local storage.
- **[Technical Design — for developers and maintainers](docs/technical-design.md):** architecture, UI view flow, question and trace formats, inline annotations, scoring, user storage, curriculum migration, testing and maintenance.
- [Difficulty Framework](docs/difficulty-framework.md): how the 160 questions and four difficulty tiers align with the course.
- [Changelog](CHANGELOG.md): feature and fix history.


A static, child-friendly Python practice game based on the Huaxia Chinese School Python Programming L1 curriculum. **This repository is public.** Challenge 1 (Weeks 1–4) covers basic syntax, logic, loops and functions; **Challenge 2 — Data Explorer** (Weeks 6–9) covers lists, strings, sets and dictionaries. Each challenge is 4 weeks × 4 difficulties × 5 questions = 80 questions, for **160 questions** in total.

## Run locally

Do not double-click `index.html` (browser security prevents loading local JSON by `fetch`). Instead, run a simple local web server **from inside the cloned project folder**:

```bash
cd python-game-for-fun
python3 -m http.server 8000
```

Then open **http://localhost:8000**. Keep that terminal running while you play; closing it stops the server. Alternatively deploy the static directory to any static hosting provider. No backend or Python runtime is needed for children visiting a hosted site; Python above is only a convenient local development server.

## Player names and local save (v0.2.0)

On first opening the page, students may enter a nickname; submitting an empty name uses the shared guest profile **username**. Matching is case-insensitive and ignores leading/trailing spaces, so `Mia` and ` mia ` share the same local profile. The header shows the current player and a **Switch Player** action. Each name has separate best scores in browser localStorage. A browser session remembers which nickname is active, while a new session can ask for it again. No password or cloud account is used.

> Important: This is **not** authentication. Anyone using the same browser can enter the same name and update that profile. Changing device/browser or clearing local site data means profiles are not available. Prefer nicknames, not real names. Existing single-user v0.1 scores are migrated to the `username` guest profile when it is first selected.

## Wrong-answer learning flow

- First submission correct: show confirmation, explanation, and **Next question**.
- First submission wrong: do **not** immediately show answer. Offer **Give me a hint**, **Retry**, and **Show answer**.
- Before submitting, **Skip question** moves straight to the next card; the card counts as not solved (no XP) and is labeled ⏭ Skipped in Review.
- Hint displays guidance and preserves the option to retry or reveal. Retry clears the input/selection for another submission. Show answer displays correct answer with explanation, then Next question.
- **Correct answers earn full XP even after hints or retries.** If the student chooses Show answer, the question earns no XP. Completing all five saves the user's best score.
- After a card is solved or revealed, Hard and Extra Rock cards offer optional **Bonus questions** about the same code (multiple choice; unscored practice, one attempt each, skippable). See [Technical Design §4](docs/technical-design.md#4-question-bank-schema).

## Detailed execution walkthroughs (v0.6.7)

**All 80 cards** use one validated walkthrough contract. The code arrow, variables, function events and cumulative Output still follow [Technical Design §7](docs/technical-design.md#7-walkthrough-contract--all-160-questions). The new educational rule is that **calculating an expression and executing its final statement are separate steps**:

- `print('Hi')`: highlight the print statement, show **Call print()**, explain it, then display **Hi** in Output. A simple literal print needs no invented arithmetic step.
- `print(square(4) + 1)`: `square(4)` returns **16** → evaluate **16 + 1 = 17** on the caller line → call `print()` → Output becomes **17**, and not before.
- `z = x // y + x % y` with `x=19,y=4`: show **19 // 4 = 4**, then **19 % 4 = 3**, then **4 + 3 = 7**, and only afterward assign `z=7`.
- Other numeric expressions respect Python arithmetic precedence and parentheses; formatted f-strings get a separate formatting explanation after any supported numeric calculations.
- Each calculation step has the **same code line**, explanatory text and a distinct blue calculation tag. It does **not** prematurely mutate variables or append Output. Variables change on the actual assignment step; Output changes only on the actual `print()` step.
- This rule is applied offline to the curated trace JSON by `scripts/enrich-walkthroughs.js`, not by executing students' code in the browser. Currently supported arithmetic operators are `+`, `-`, `*`, `/`, `//`, `%` and parentheses for numeric expressions. Other introductory expressions retain explicit factual explanations without guessing unsupported evaluation.

The audit covers **80 questions, 1,103 trace states, 125 explicit calculation steps and 96 explained print events**. `tests/validate-walkthrough-detail.mjs` checks all 80, including arithmetic consistency and the square() return→add→print regression. Automated tests do not substitute for teacher review of the wording or manual browser QA.

## Walkthrough — unified design (v0.6.6)

**One rendering rule for all 80 questions:** Easy, Medium, Hard, and Extra Rock read the same static `data/traces-week*.json` format and use the same `tracePanel()` UI. Nothing in the layout is hardcoded per question or difficulty.

**Visual order, from top to bottom:**
1. **Step counter + Previous / Next Step / Restart controls** above the code, so varying Explanation length never moves the buttons.
2. **Full-width dark Python code panel.** The arrow highlights the current executed line. Call/return and ✓/✕ condition events appear beside that line. Variable tags remain at their latest assignment or function-parameter binding line while their scope is alive; outdated values and returned-function locals disappear.
3. **Output panel immediately below code.** The panel always appears; it is **empty before anything prints**. It displays the complete cumulative `step.output` value, including multiple lines. No output tags are displayed beside individual code lines.
4. **Explanation** below Output, with the bold red label and step-specific teaching text.

Function entry is shown at the `def` line with parameters; only the next step executes the first body statement. All quiz/review progress, scoring, hints and retries remain unchanged. Trace data is precomputed; student code is not executed in the browser.

The **single normative design specification** is [Technical Design §7 — Walkthrough Contract](docs/technical-design.md#7-walkthrough-contract--all-160-questions). This replaces the previous fragmented v0.6.1–v0.6.5 layout notes; historical revisions remain in [CHANGELOG](CHANGELOG.md). Automated CI validates all questions and renders every step using the same shared component: `node tests/validate-walkthrough-layout.mjs`.

## Difficulty rebalancing — Extra Rock (v0.6.0)

The original Hard questions have been redesigned after reviewing the course materials (lesson decks, QuickChecks, in-class practice and homework). Twenty new **Extra Rock** cards add a fourth, optional difficulty. All 80 cards have inline Watch How the Code Works traces.

The learning path is cumulative: Week 2 combines arithmetic and if/else; Week 3 mixes conditional logic, accumulator updates, nested loops and break/continue; Week 4 brings functions together with previous skills. See [Difficulty Framework](docs/difficulty-framework.md) for the four-level rubric, curriculum references and coverage table.

| Difficulty | XP per solved card | Max per quest |
| --- | ---: | ---: |
| Easy | 10 | 50 |
| Medium | 15 | 75 |
| Hard (recalibrated) | 20 | 100 |
| **Extra Rock** | **25** | **125** |

Base path max **1,800 XP** across both challenges; eight optional Extra Rock quests add **1,000 XP**; overall max **2,800 XP**. Extra Rock is not required for the topic badges.

**Progress migration:** The old Hard questions are replaced, so on first opening curriculum v2 the earlier Hard best scores are archived (viewable under My Progress), not counted as achievements for unseen new Hard questions. Easy and Medium scores are preserved. Older Hard in-progress/review snapshots will not be attached to new code.

Run the full validation suite listed in [Technical Design §9](docs/technical-design.md#9-how-to-test-and-make-changes) to check the teacher-authored examples, question schema, traces and browser behavior. The CI workflow runs the same checks on push if GitHub Actions is enabled.

## Challenge 2 — Data Explorer (Weeks 6–9)

Challenge 2 adds 80 questions on the course's data-structure weeks: **Week 6 Lists** (indexing, negative indexing, slicing, `append`/`sort`, parallel lists), **Week 7 Strings** (slicing, immutability, `split`/`join`, string methods, f-string formatting), **Week 8 Sets** (deduplication, membership, `add`/`remove`/`discard`, union/intersection/difference) and **Week 9 Dictionaries** (lookup, `.get()` with defaults, `update()`, `pop()`, counting patterns). Easy/Medium test the week's own skills directly and include a few concept questions (which structure or method fits a job); Hard/Extra Rock use the data structure as a tool inside bigger code — loops, conditions and functions from earlier weeks — and ask for derived results such as a count, a sum, or one looked-up value.

Question-type policy follows the typing burden for young children: Easy is all multiple choice, Medium is half multiple choice / half typed, and Hard/Extra Rock cards are typed only when the answer is short and simple — a card whose answer is a collection literal or other punctuation-heavy output is multiple choice instead. Hard cards carry two bonus follow-ups and Extra Rock cards one, plus execution-verified 🐛 bug-hunt pairs on selected Extra Rock cards, exactly as in Challenge 1.

The Challenge 2 walkthroughs are generated by `scripts/generate-traces.py`, which records a real CPython execution (`sys.settrace`) and narrates it in the same step voice as the Weeks 1–4 generator; both generators feed the shared enrichment in `scripts/enrich-walkthroughs.js`, and every step is cross-checked against CPython by the test suite (see [Technical Design §7.1](docs/technical-design.md)).

## Walkthrough history

Earlier pilot designs (including the old two-column Variables/Output layout) are superseded by the [current Walkthrough Contract](docs/technical-design.md#7-walkthrough-contract--all-160-questions). See [CHANGELOG](CHANGELOG.md) for historical v0.4–v0.5 changes.

## Auto-save, Resume and Review (v0.3.0)

- Each player, week and difficulty stores an **in-progress** five-card quest in browser localStorage. The app saves the question index, drafted answer, answer feedback, hints and per-card solved/revealed status as the child works.
- Leaving a quiz and re-entering the same week/difficulty shows **Continue Quest** (restore exactly where the child was) or **Start Over** (discard only unfinished progress, never the best score).
- The home screen surfaces unfinished quests for the current username. A different username has separate saves.
- After completing a five-card quest, the latest completed card snapshot is retained. Open **Review cards** from difficulty selection or **My Progress**, or **Review all 5 cards** from results.
- In Review, navigate **Previous** / **Next** to see saved answers, correct answers and explanations. **Retry this card** temporarily hides the solution and lets the child practice again, with no score changes.
- Review practice does not change the finished result. To increase the best XP, start a **new five-card quest** and solve the questions; correct answers after hints/retries still earn full points, whereas Show Answer ends that question without XP.
- Only the **most recent completed attempt** of each difficulty is retained for review. The all-time best score is retained separately.
- Game data lives in the same browser/profile — local storage is the source of truth. On the published GitHub Pages site, the game also sends a one-way copy of each quest snapshot to the teacher's Supabase project (anonymous, insert-only; nothing can be read back), so the teacher can follow along in the `progress_latest` view. Students need no password or account.

## What works

- Choose Weeks 1–4 (Challenge 1) or Weeks 6–9 (Challenge 2) and any difficulty, with suggested next step but no locked levels
- Five questions per quest; multiple choice where defined and short-answer elsewhere
- Hints, answer feedback, explanations, next question, and result summary
- **Skip question** on any card before answering (counts as not solved), plus optional unscored **Bonus questions** on Hard and Extra Rock cards
- Mastery-based scoring, including successful retries; Easy 10, Medium 15, Hard 20, Extra Rock 25 XP per solved question
- Best result per quest is saved per nickname in the **same browser** using localStorage
- 3/5 = one star, 4/5 = two, 5/5 = three; pass Easy/Medium/Hard for a topic badge; Extra Rock is optional
- No passwords, no email, no timers, no leaderboard

## Important limitations

- The 160 questions are curriculum-calibrated teaching drafts, not classroom-tested. Short-answer responses are compared as strings after trimming outer whitespace; exact line breaks matter. Review the wording and formatting before sharing with students.
- All question answers are in client-side JSON, so this is a learning aid, **not** a secure assessment.
- This repository is public, and a public deployment is visible to anyone who knows the URL. Do not put private student information in this app.
- Clearing browser storage or using another browser/device loses progress; **in-progress questions are now saved as the child works**, and latest completed cards can be revisited.
- Challenge 2 questions test the data-structure topics as taught in the Week 6–9 QuickChecks and homework; set questions avoid relying on set print order (results are asked via `sorted()`, `len()`, membership or single values).

## Source documents

- [Product plan](https://docs.google.com/document/d/1IYkMOB8pIzhWOEliFy93fHoET743fQ-XUvbNTVC-5hs/edit)
- [Original 60-question draft (historical teacher document)](https://docs.google.com/document/d/1pqRtD9Ld6HCrGVvDk9NnOj3mxXhMBnl0HLFOE_LY3-A/edit)
- [Current 160-question source of truth](data/questions.json)
- [Class-aligned difficulty framework](docs/difficulty-framework.md)

## Files

```
index.html
styles.css
src/app.js
src/scoring.js
src/sync.js
data/questions.json
data/traces-week1.json
data/traces-week2.json
data/traces-week3.json
data/traces-week4.json
data/traces-week6.json
data/traces-week7.json
data/traces-week8.json
data/traces-week9.json
docs/user-guide.md
docs/technical-design.md
docs/difficulty-framework.md
scripts/build-trace-runtime.js
scripts/generate-traces.py
scripts/enrich-walkthroughs.js
scripts/generate-followups.py
scripts/convert-to-multiple-choice.py
scripts/add-debug-followups.py
tests/validate_python.py
tests/validate-trace-cpython.py
tests/validate-question-schema.mjs
tests/validate-traces.mjs
tests/validate-trace-control-flow.mjs
tests/validate-trace-decisions.mjs
tests/validate-inline-trace.mjs
tests/validate-trace-scopes.mjs
tests/validate-trace-events.mjs
tests/validate-walkthrough-layout.mjs
tests/validate-walkthrough-detail.mjs
tests/e2e-browser.cjs
.github/workflows/validate-questions.yml
README.md
CHANGELOG.md
```
