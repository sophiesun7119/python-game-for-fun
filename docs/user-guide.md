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
6. Stuck and want to move on? Click **Skip Question** before answering. The card counts as not solved (no points), and Review will label it ⏭ Skipped — you can study its answer and explanation there later.

**Bonus questions ⭐:** Hard and Extra Rock cards have extra questions about the same code. You can spot them early: the difficulty page tags those levels with ⭐ Bonus challenge, and the top of the card itself tells you how many bonus questions it hides before you start. After you finish a card, choose **Bonus question** to try them, or just go to the next question. Bonuses are practice only — they never change your score. Each bonus allows one try, then shows the answer and why; the walkthrough on the same screen is your hint. You can also skip a bonus. Some Extra Rock cards have a **🐛 Bug hunt** pair instead: the same code with one line broken — first find the wrong line, then choose how to fix it.

**Scoring encourages learning:** even after a hint or several retries, getting the correct answer **without revealing it** earns full points for that question. **Show Answer** reveals the solution and explanation but gives zero points for that card in that run. Replaying a quest does not endlessly add XP: the game awards only the difference when a player's personal best improves.

Stars per five-card quest: **3/5 = ⭐**, **4/5 = ⭐⭐**, **5/5 = ⭐⭐⭐**. Finishing with fewer than 3 solved cards does not earn a star. Topic badges require passing Easy, Medium, and Hard (at least 3/5 each); Extra Rock is optional.

## 4. Watch How the Code Works

Click **👀 Watch How the Code Works** on any question or completed review card. All four difficulty levels have the **same layout**:

1. **At the top:** use **Previous**, **Next Step**, or **Restart**. The current Step number is beside these controls.
2. **Next:** the full dark Python code panel. A yellow arrow shows which line the program is using. Colored tags beside the code show current variables, ✓ / ✕ condition checks, and function calls or returns. Variables remain visible at their newest assignment line while they exist. Inside a function, its local variables disappear only after returning to its caller.
3. **Under the code:** a separate **Output** box. Before Python prints anything, this box is **empty**. When a `print()` runs, the printed text appears there. Several prints appear on separate lines. Going backward shows only what had been printed up to that Step.
4. **Under Output:** the bold red **Explanation:** tells you why Python performed this action. Long explanations no longer move the controls at the top.

For example, a function definition first displays a named purple label such as **Define greet()**, and a function call then highlights where it was called, then the `def` line where parameters are introduced, then the lines in its body. On `if` and `while`, **green ✓** means enter/continue; **red ✕** means skip/exit.

**Longer expressions are broken into smaller actions.** For example, `print(square(4) + 1)` first enters `square()`, returns **16**, then shows **16 + 1 = 17** on the print line, and only in the following step calls `print()` so the Output box displays **17**. A direct `print('Hi')` gets a purple **Call print()** label without any unnecessary calculation. For longer arithmetic, separate steps explain each supported operation before the variable is assigned or the result is printed.

The walkthrough is a prepared teaching example, not a live Python executor. Watching, going backward, or restarting does not change XP, answers or saved progress. Click **Close** to return to the normal card.

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
