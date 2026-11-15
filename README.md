# Python Quest 🐍

A static, child-friendly Python practice game based on the Huaxia Chinese School Python Programming L1 curriculum. **This repository is private.** The V0.2 prototype contains Challenge 1 only (Weeks 1–4): 4 weeks × 3 difficulties × 5 questions = **60 questions**.

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

## What works

- Choose Weeks 1–4 and any difficulty, with suggested next step but no locked levels
- Five questions per quest; multiple choice where defined and short-answer elsewhere
- Hints, answer feedback, explanations, next question, and result summary
- Mastery-based scoring, including successful retries; Easy 10, Medium 15, Hard 20 XP per solved question
- Best result per quest is saved per nickname in the **same browser** using localStorage
- 3/5 = one star, 4/5 = two, 5/5 = three; all three difficulties passed earns a topic badge
- No passwords, no email, no timers, no leaderboard

## Important limitations

- The 60 questions are teacher-review drafts, not classroom-tested. Short-answer responses are compared as strings after trimming outer whitespace; exact line breaks matter. Review the wording and formatting before sharing with students.
- All question answers are in client-side JSON, so this is a learning aid, **not** a secure assessment.
- A public deployment is visible to anyone who knows the URL even if the GitHub repository is private. Do not put private student information in this app.
- Clearing browser storage or using another browser/device loses progress; progress is saved after completing a five-question quest, not mid-question.
- Challenge 2 (Weeks 6–9) is not included in v0.1.

## Source documents

- [Product plan](https://docs.google.com/document/d/1IYkMOB8pIzhWOEliFy93fHoET743fQ-XUvbNTVC-5hs/edit)
- [Challenge 1 question bank](https://docs.google.com/document/d/1pqRtD9Ld6HCrGVvDk9NnOj3mxXhMBnl0HLFOE_LY3-A/edit)

## Files

```
index.html
styles.css
src/app.js
src/scoring.js
data/questions.json
README.md
CHANGELOG.md
```
