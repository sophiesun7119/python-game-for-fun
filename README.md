# Python Quest 🐍

## Documentation

- **[User Guide — for students, parents and teachers](docs/user-guide.md):** how to start, pick a week, solve and retry questions, use Watch How the Code Works, resume progress, review cards and understand local storage.
- **[Technical Design — for developers and maintainers](docs/technical-design.md):** architecture, UI view flow, question and trace formats, inline annotations, scoring, user storage, curriculum migration, testing and maintenance.
- [Difficulty Framework](docs/difficulty-framework.md): how the 80 questions and four difficulty tiers align with the course.
- [Changelog](CHANGELOG.md): feature and fix history.


A static, child-friendly Python practice game based on the Huaxia Chinese School Python Programming L1 curriculum. **This repository is private.** The V0.6 prototype contains Challenge 1 only (Weeks 1–4): 4 weeks × 4 difficulties × 5 questions = **80 questions**.

## Run locally

Do not double-click `index.html` (browser security prevents loading local JSON by `fetch`). Instead, run a simple local web server:

```bash
python3 -m http.server 8000
```

Then open **http://localhost:8000**. Alternatively deploy the static directory to any static hosting provider. No backend or Python runtime is needed for children visiting a hosted site; Python above is only a convenient local development server.

## Player names and local save (v0.2.0)

On first opening the page, students may enter a nickname; submitting an empty name uses the shared guest profile **username**. Matching is case-insensitive and ignores leading/trailing spaces, so `Mia` and ` mia ` share the same local profile. The header shows the current player and a **Switch Player** action. Each name has separate best scores in browser localStorage. A browser session remembers which nickname is active, while a new session can ask for it again. No password or cloud account is used.

> Important: This is **not** authentication. Anyone using the same browser can enter the same name and update that profile. Changing device/browser or clearing local site data means profiles are not available. Prefer nicknames, not real names. Existing single-user v0.1 scores are migrated to the `username` guest profile when it is first selected.

## Wrong-answer learning flow

- First submission correct: show confirmation, explanation, and **Next question**.
- First submission wrong: do **not** immediately show answer. Offer **Give me a hint**, **Retry**, and **Show answer**.
- Hint displays guidance and preserves the option to retry or reveal. Retry clears the input/selection for another submission. Show answer displays correct answer with explanation, then Next question.
- **Correct answers earn full XP even after hints or retries.** If the student chooses Show answer, the question earns no XP. Completing all five saves the user's best score.

## Inline condition indicators — v0.6.2

- On the currently highlighted `if`, `elif`, `while`, or `for` source line, a small **✓ green / ✕ red** marker appears with **actual variable values at that exact step**, plus Enter Branch, Skip Branch, Continue Loop, Exit Loop, Next Iteration, or Loop Finished.
- Example: `while i <= 3:` shows `✓ i = 1 · Continue Loop`, then `✓ i = 2 · Continue Loop`, and finally `✕ i = 4 · Exit Loop`.
- For compound expressions, all referenced variables are shown (when available), and ✓/✕ reflects the final combined truth value. The inline marker is hidden for nondecision steps and disappears when the next source line executes.
- The larger right-hand Condition Check is retained as reinforcement; the inline marker is compact and horizontally scrollable with longer code.
- Check behavior with `node tests/validate-inline-trace.mjs` in addition to the existing decision/control-flow tests.

## Function entry and stable explanation layout

- A call highlights its **caller line**, then the arrow moves to the target **`def` line**, where the parameter bindings appear (for example, `xp = 730`, `level = 6`). **Only the following step** enters the first executable line inside that function.
- This avoids conflating parameter binding and execution of the first body statement. Nested function calls follow the same sequence.
- The **Explanation:** area reserves space for **three lines**, so short descriptions do not move the navigation buttons up and down. Longer explanations can naturally expand rather than being clipped.

## Inline Trace — one full-width code panel (v0.6.3)

- The Trace view now uses **one full-width dark code area**, with no separate Variables or Output sidebar.
- The yellow arrow and highlight track the currently executed source line. Temporary annotations appear **to the right of that same line only**, then disappear when Next/Previous moves to another step.
- New or updated variables appear as small value tags (e.g. `xp = 730`, `needed = 900`); values are not persistently repeated on earlier lines. Function entry reintroduces that function's parameter values; returning to the caller shows the returned value without falsely claiming a variable changed.
- For `if/elif/for/while`, the active code line shows the relevant variable values and a green ✓ or red ✕ with branch/loop action.
- `print()` results appear as `Output: ...` on the print line when they are produced. Previously printed output is not carried over as a separate sidebar.
- **Step**, bold red **Explanation:** text, Previous/Next/Restart, and Close remain beneath/above the code as before; opening Trace never changes XP.
- There is still horizontal scrolling when lines are unusually long, especially on phones; no animation or Python runtime is required.

## Walkthrough correctness and condition feedback (v0.6.1)

- The arrow follows the **actual call site** before entering a function. For example, `print(message(730, 6))` first highlights the call on line 12, then **`def message(xp, level):` on line 7** to bind `xp = 730` and `level = 6`. Only the next step enters line 8, where `xp_needed(6)` is called; **`def xp_needed(level):` on line 1** first displays `level = 6`, then its body starts at line 2. The function later returns to line 8 before `needed = 900` is assigned.
- The current code line uses a small **Condition Check** verdict (there is no separate Variables panel) for conditional statements: green **✓ True / Enter Branch**, red **✕ False / Skip Branch**. `while` shows Continue Loop / Exit Loop; `for` shows Next Iteration / Loop Finished.
- Compound conditions use their **final Boolean result**, not a single intermediate comparison. The code arrow and condition badge always refer to the same source line and step.
- These optional guided explanations do not execute student-supplied Python and do not modify XP.
- Tests: `node tests/validate-trace-control-flow.mjs`, `node tests/validate-trace-decisions.mjs` and `node tests/validate-traces.mjs`.

## Difficulty rebalancing — Extra Rock (v0.6.0)

The original Hard questions have been redesigned after reviewing the course materials (lesson decks, QuickChecks, in-class practice and homework). Twenty new **Extra Rock** cards add a fourth, optional difficulty. All 80 cards have inline Watch How the Code Works traces.

The learning path is cumulative: Week 2 combines arithmetic and if/else; Week 3 mixes conditional logic, accumulator updates, nested loops and break/continue; Week 4 brings functions together with previous skills. See [Difficulty Framework](docs/difficulty-framework.md) for the four-level rubric, curriculum references and coverage table.

| Difficulty | XP per solved card | Max per quest |
| --- | ---: | ---: |
| Easy | 10 | 50 |
| Medium | 15 | 75 |
| Hard (recalibrated) | 20 | 100 |
| **Extra Rock** | **25** | **125** |

Base path max **900 XP**; four optional Extra Rock quests add **500 XP**; overall max **1,400 XP**. Extra Rock is not required for the original topic badges.

**Progress migration:** The old Hard questions are replaced, so on first opening curriculum v2 the earlier Hard best scores are archived (viewable under My Progress), not counted as achievements for unseen new Hard questions. Easy and Medium scores are preserved. Older Hard in-progress/review snapshots will not be attached to new code.

Run `python3 tests/validate_python.py` and `node tests/validate-traces.mjs` to check the fixed teacher-authored examples. The CI workflow also runs these checks on push if GitHub Actions is enabled.

## Watch How the Code Works — Weeks 1–4 (v0.5.0)

- All **80** Challenge 1 questions now have static guided traces in `data/traces-week1.json`, `data/traces-week2.json`, `data/traces-week3.json`, and `data/traces-week4.json`.
- The Trace panel remains hidden unless a child selects **Watch How the Code Works** on a quiz or completed review card.
- The current inline single-panel UI highlights the executing source line and shows state-change tags beside it. Children can use Previous / Next Step / Restart / Close.
- Every step emphasizes a **bold red Explanation:** label followed by a short plain-language explanation.
- Week 2 explicitly walks through condition checks, selected branches, and skipped branches. Week 3 shows repeated loop-header checks, break/continue and variable changes. Week 4 follows calls into functions and returns to the caller, with local parameter examples.
- Python is not executed by this UI; all steps are authored learning examples, including hypothetical corrected code for the Week 2 operator-fill question.
- For input() snippets, the trace uses a clearly described example input. Tracing can reveal how a problem runs, so it is optional learning support rather than a cheating-resistant quiz tool.
- Validate all trace entries with `node tests/validate-traces.mjs` (no npm install required).

## Earlier Week 1 pilot (v0.4.0)

- Every **Week 1** question (5 Easy + 5 Medium + 5 Hard) has a teacher-authored, deterministic trace in `data/traces-week1.json`. Weeks 2–4 retain their original question cards until traces are authored.
- On an eligible question or completed Review card, click **Watch How the Code Works** beneath the existing code block. Only then does it expand into the same card's two-column view (code with line number/arrow on the left, variables/output on the right).
- Starting trace step 0 has no variables and no output. **Next Step**, **Previous**, **Restart**, and **Close** control the explanation. New or updated variable values are highlighted.
- `input()` demonstrations show a stated *example input*; the error question demonstrates how a `TypeError` stops execution.
- No arbitrary Python code is executed: these steps are instructional examples. Opening/stepping a trace does **not** affect answer submission, XP, stars or local progress. Tracing can reveal the result, as intended for optional learning support.
- A trace step stores zero-based `line`, full `variables` snapshot, cumulative `output` array, kid-friendly `explanation`, and optional `error`. Step 0 uses `line: -1` and empty variables/output.

## Auto-save, Resume and Review (v0.3.0)

- Each player, week and difficulty stores an **in-progress** five-card quest in browser localStorage. The app saves the question index, drafted answer, answer feedback, hints and per-card solved/revealed status as the child works.
- Leaving a quiz and re-entering the same week/difficulty shows **Continue Quest** (restore exactly where the child was) or **Start Over** (discard only unfinished progress, never the best score).
- The home screen surfaces unfinished quests for the current username. A different username has separate saves.
- After completing a five-card quest, the latest completed card snapshot is retained. Open **Review cards** from difficulty selection or **My Progress**, or **Review all 5 cards** from results.
- In Review, navigate **Previous** / **Next** to see saved answers, correct answers and explanations. **Retry this card** temporarily hides the solution and lets the child practice again, with no score changes.
- Review practice does not change the finished result. To increase the best XP, start a **new five-card quest** and solve the questions; correct answers after hints/retries still earn full points, whereas Show Answer ends that question without XP.
- Only the **most recent completed attempt** of each difficulty is retained for review. The all-time best score is retained separately.
- All data remains only in the same browser/profile; no cloud sync, password or database is involved.

## What works

- Choose Weeks 1–4 and any difficulty, with suggested next step but no locked levels
- Five questions per quest; multiple choice where defined and short-answer elsewhere
- Hints, answer feedback, explanations, next question, and result summary
- Mastery-based scoring, including successful retries; Easy 10, Medium 15, Hard 20, Extra Rock 25 XP per solved question
- Best result per quest is saved per nickname in the **same browser** using localStorage
- 3/5 = one star, 4/5 = two, 5/5 = three; pass Easy/Medium/Hard for a topic badge; Extra Rock is optional
- No passwords, no email, no timers, no leaderboard

## Important limitations

- The 80 questions are curriculum-calibrated teaching drafts, not classroom-tested. Short-answer responses are compared as strings after trimming outer whitespace; exact line breaks matter. Review the wording and formatting before sharing with students.
- All question answers are in client-side JSON, so this is a learning aid, **not** a secure assessment.
- A public deployment is visible to anyone who knows the URL even if the GitHub repository is private. Do not put private student information in this app.
- Clearing browser storage or using another browser/device loses progress; **in-progress questions are now saved as the child works**, and latest completed cards can be revisited.
- Challenge 2 (Weeks 6–9) is not included in v0.6.

## Source documents

- [Product plan](https://docs.google.com/document/d/1IYkMOB8pIzhWOEliFy93fHoET743fQ-XUvbNTVC-5hs/edit)
- [Original 60-question draft (historical teacher document)](https://docs.google.com/document/d/1pqRtD9Ld6HCrGVvDk9NnOj3mxXhMBnl0HLFOE_LY3-A/edit)
- [Current 80-question source of truth](data/questions.json)
- [Class-aligned difficulty framework](docs/difficulty-framework.md)

## Files

```
index.html
styles.css
src/app.js
src/scoring.js
data/questions.json
data/traces-week1.json
data/traces-week2.json
data/traces-week3.json
data/traces-week4.json
docs/difficulty-framework.md
tests/validate-traces.mjs
tests/validate_python.py
scripts/build-trace-runtime.js
README.md
CHANGELOG.md
```
