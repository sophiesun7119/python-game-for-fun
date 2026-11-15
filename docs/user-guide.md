# Python Quest — User Guide

> For students, parents, and teachers. Current scope: Challenge 1, Weeks 1–4, 80 cards (4 weeks × 4 difficulties × 5 questions). This guide reflects the current browser-based prototype.

## 1. Start the game

**Run locally** from the project folder:

```bash
python3 -m http.server 8000
```

Then open **http://localhost:8000** in your browser. Keep this terminal/server running while using the local site. Do not double-click `index.html` because the browser must fetch the JSON question and trace files through a web server.

**Choose a player name** when prompted. It is optional; leaving it blank uses the shared guest profile **`username`**. Capitalization and leading/trailing spaces do not distinguish players (e.g., `Mia` and ` mia ` share one profile). Use a nickname rather than a real name.

Use **Switch Player** in the top bar if another child uses the same browser. There is **no password or secure authentication**: anybody who enters the same name in that browser can open and change that player's progress.

## 2. Pick a challenge

Open **Challenge 1 — Python Explorer** and select a week and difficulty:

| Week | Topic | What you learn |
|---|---|---|
| Week 1 | Output & Variables | `print()`, `input()`, variables, operations, formatting |
| Week 2 | Logic & Decisions | `if`, `elif`, `else`, Boolean conditions |
| Week 3 | Loop Master | `for`, `range()`, `while`, nested loops |
| Week 4 | Function Builder | `def`, arguments, parameters, `return`, function composition |

Every week and difficulty is unlocked; the home page provides a recommended next quest. Each difficulty has **five questions**:

| Difficulty | XP per correctly solved card | Max XP per five-card quest |
|---|---:|---:|
| Easy | 10 | 50 |
| Medium | 15 | 75 |
| Hard | 20 | 100 |
| Extra Rock 🪨 | 25 | 125 |

A child's learning can combine topics from earlier weeks, especially at Hard and Extra Rock.

## 3. Answer a question

1. Read the question and Python code.
2. Choose an option or type a short answer.
3. Click **Check Answer**.
4. If correct, read the explanation and choose **Next Question**.
5. If incorrect, choose **Give Me a Hint**, **Retry**, or **Show Answer**.

**Scoring encourages learning:** even after a hint or several retries, getting the correct answer **without revealing it** earns full points for that question. **Show Answer** reveals the solution and explanation but gives zero points for that card in that run. Replaying a quest does not endlessly add XP: the game awards only the difference when a player's personal best improves.

Stars per five-card quest: **3/5 = ⭐**, **4/5 = ⭐⭐**, **5/5 = ⭐⭐⭐**. Finishing with fewer than 3 solved cards does not earn a star. Topic badges require passing Easy, Medium, and Hard (at least 3/5 each); Extra Rock is optional.

## 4. Watch How the Code Works — Inline Trace

On a question or a completed review card, click **👀 Watch How the Code Works**. It is hidden until clicked and does not change your XP.

The **one full-width dark code panel** shows the whole program. A yellow arrow points to the exact line involved in the current execution step. To the **right of that same highlighted line**, small temporary tags describe only the current action:

- `a = 1` or `needed = 900`: variable created or updated.
- **✓ Enter Branch** / **✕ Skip Branch**: `if` or `elif` condition.
- **✓ Continue Loop** / **✕ Exit Loop**: `while` check.
- **✓ Next Iteration** / **✕ Loop Finished**: `for` progression.
- **Call …**, **Enter …**, **Return from … → value**: function transitions.
- **Output: …**: something was printed on that step.

Tags **move with the current execution line**: old tags disappear, and a change appears beside the line that caused it. New function parameters appear when the function is entered; an assignment made after a function returns appears on its caller line. No separate Variables/Output sidebar remains.

Below the code, use **Previous**, **Next Step**, **Restart**, and read the bold red **Explanation:** for each step. **Close** returns to the usual question card. This is an educator-prepared walkthrough, *not* a general Python runtime; `input()` examples use a stated sample input and incomplete-code questions may show a corrected example.

## 5. Leave and continue later

Your in-progress work is autosaved **in the same browser** by player, week, and difficulty. The next time you open the same quest, choose:

- **Continue Quest** to return to your saved question and answer state.
- **Start Over** to reset that unfinished attempt without deleting your best score.

The home page also shows shortcuts to unfinished quests.

## 6. Review finished cards

When you finish all five questions, choose **Review all 5 cards**, or find **Review cards** at the difficulty level / **My Progress**. Use Previous/Next to browse all five saved cards, your previous answers, correct answers, and explanations. **Retry this card** is practice only: it does not change the saved best score. To earn a higher best, start a new full five-card quest.

Only the **latest completed five-card attempt** per difficulty is retained for review, while the **best score** remains separate.

## 7. Where are scores stored?

Progress is in the browser's **localStorage**, *not* in your project directory, Git repository, or a cloud database. The current player name for the browser tab/session is remembered with **sessionStorage**.

- A normal `git pull` updates code but **does not overwrite browser progress**.
- Using another browser, another device, or another origin (e.g., changing `localhost:8000` to `localhost:3000`) does not share progress.
- Clearing site data, using private/incognito browsing, or losing the browser profile may erase progress.
- If the question bank changes, older results may be archived to prevent giving credit for unseen revised questions.

**Do not enter personal or sensitive information.** This prototype has no parent/teacher account control, leaderboard, cloud sync, or secure student identity system.

## 8. Quick troubleshooting

| Problem | What to check |
|---|---|
| Questions fail to load | Run `python3 -m http.server 8000` inside the repo and open `http://localhost:8000` |
| Changes do not appear after `git pull` | Reload the same page, verify you are serving the intended project folder |
| A player's progress seems missing | Check nickname spelling, browser profile, and `localhost` port |
| Trace doesn't display | Confirm that `data/traces-week1.json` … `data/traces-week4.json` load correctly |
| Another child sees the wrong scores | Choose **Switch Player** and enter their own nickname |
| A completed card cannot be found | Check My Progress and whether a newer completed run replaced the latest review |

## For teachers

The game is a self-paced **learning and practice** tool, not a cheating-proof exam. Children may view traces, hints, and solutions as teaching aids. The authoritative current question bank is `data/questions.json` (the older 60-question Google Doc is a historical draft). For curriculum/difficulty rationale, see [Difficulty Framework](difficulty-framework.md). For implementation, see [Technical Design](technical-design.md).
