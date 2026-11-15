# Python Quest 🐍

A static, child-friendly Python practice game based on the Huaxia Chinese School Python Programming L1 curriculum. **This repository is private.** The V0.1 prototype contains Challenge 1 only (Weeks 1–4): 4 weeks × 3 difficulties × 5 questions = **60 questions**.

## Run locally

Do not double-click `index.html` (browser security prevents loading local JSON by `fetch`). Instead, run a simple local web server:

```bash
python3 -m http.server 8000
```

Then open **http://localhost:8000**. Alternatively deploy the static directory to any static hosting provider. No backend or Python runtime is needed for children visiting a hosted site; Python above is only a convenient local development server.

## What works

- Choose Weeks 1–4 and any difficulty, with suggested next step but no locked levels
- Five questions per quest; multiple choice where defined and short-answer elsewhere
- Hints, answer feedback, explanations, next question, and result summary
- First-try-only scoring; Easy 10, Medium 15, Hard 20 XP for each correct answer
- Best result per quest is saved in the **same browser** using localStorage
- 3/5 = one star, 4/5 = two, 5/5 = three; all three difficulties passed earns a topic badge
- No login, no student identity collection, no timers, no leaderboard

## Important limitations

- The 60 questions are teacher-review drafts, not classroom-tested. Short-answer responses are compared as strings after trimming outer whitespace; exact line breaks matter. Review the wording and formatting before sharing with students.
- All question answers are in client-side JSON, so this is a learning aid, **not** a secure assessment.
- A public deployment is visible to anyone who knows the URL even if the GitHub repository is private. Do not put private student information in this app.
- Clearing browser storage or using another browser/device loses progress.
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
