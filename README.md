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

## Walkthrough — unified design (v0.6.6)

**One rendering rule for all 80 questions:** Easy, Medium, Hard, and Extra Rock read the same static `data/traces-week*.json` format and use the same `tracePanel()` UI. Nothing in the layout is hardcoded per question or difficulty.

**Visual order, from top to bottom:**
1. **Step counter + Previous / Next Step / Restart controls** above the code, so varying Explanation length never moves the buttons.
2. **Full-width dark Python code panel.** The arrow highlights the current executed line. Call/return and ✓/✕ condition events appear beside that line. Variable tags remain at their latest assignment or function-parameter binding line while their scope is alive; outdated values and returned-function locals disappear.
3. **Output panel immediately below code.** The panel always appears; it is **empty before anything prints**. It displays the complete cumulative `step.output` value, including multiple lines. No output tags are displayed beside individual code lines.
4. **Explanation** below Output, with the bold red label and step-specific teaching text.

Function entry is shown at the `def` line with parameters; only the next step executes the first body statement. All quiz/review progress, scoring, hints and retries remain unchanged. Trace data is precomputed; student code is not executed in the browser.

The **single normative design specification** is [Technical Design §7 — Walkthrough Contract](docs/technical-design.md#7-walkthrough-contract--all-80-questions). This replaces the previous fragmented v0.6.1–v0.6.5 layout notes; historical revisions remain in [CHANGELOG](CHANGELOG.md). Automated CI validates all questions and renders every step using the same shared component: `node tests/validate-walkthrough-layout.mjs`.

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

## Walkthrough history

Earlier pilot designs (including the old two-column Variables/Output layout) are superseded by the [current Walkthrough Contract](docs/technical-design.md#7-walkthrough-contract--all-80-questions). See [CHANGELOG](CHANGELOG.md) for historical v0.4–v0.5 changes.

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
