# Changelog

## Audit follow-up — 2026-11-15
- Completed the browser visual QA left pending by v0.6.3/v0.6.6: a full headless-Chromium pass over the served site (player flow, hints/retries, XP, resume, player isolation, review) plus a step-by-step rendering check of all 80 walkthroughs against the trace data — 42 checks, all passing, no console errors.
- Fixed README: the repository is public (was described as private), the Files list now matches the actual tree, and Run locally says to `cd` into the cloned folder and keep the terminal running.
- Technical Design §9 now lists the complete validation suite (it previously omitted the walkthrough layout/detail tests); §7.7 lists the same suite.
- Added Technical Design §7.8 defining **pedagogical marker steps** (branch markers on `else:`/`elif` lines, same-line call/return sub-steps, loop check/finished markers, return-to-caller completion steps) and their truthfulness invariants.
- Added three tests, all wired into GitHub Actions: `tests/validate-question-schema.mjs` (question fields, multiple-choice option validity, hint presence and no answer leakage), `tests/validate-trace-cpython.py` (every trace step cross-checked against a real CPython `sys.settrace` execution; marker steps per §7.8 are allow-listed by form), and `tests/e2e-browser.cjs` (Playwright end-to-end run of the §9 regression sequence and all 80 walkthroughs, as a separate CI job).
- New **Skip question** action: before submitting, a child can move straight to the next card; the card counts as not solved, earns no XP, and is labeled ⏭ Skipped in Review.
- New **Bonus questions**: Hard cards carry two and Extra Rock cards one extra multiple-choice question about the same code (variable state, a specific call's return value, output detail), offered after the card is solved or revealed. They are unscored one-attempt practice with the walkthrough as the hint, and can be skipped. Derived from the verified traces by `scripts/generate-followups.py` (every derived answer re-checked against a real CPython run); documented in Technical Design §4 and the User Guide.
- **Question-type rebalancing** (all multiple choice is single-answer): every Easy card is now multiple choice, and Medium is half multiple choice / half typed — the converted cards are the ones whose typed answers were long, multi-line, or case-sensitive words (`scripts/convert-to-multiple-choice.py`, distractors grounded in each card's own code and trace). Hard and Extra Rock main cards stay typed. Multi-line options now render with line breaks (`.choice-text` pre-wrap).
- **Bug-hunt follow-ups** on seven Extra Rock cards (W1-X-03, W2-X-02, W2-X-05, W3-X-03, W3-X-04, W4-X-03, W4-X-04): a variant of the card's code with one line broken — first "Which line is wrong?", then "How should that line be fixed?" Authored and execution-verified by `scripts/add-debug-followups.py`; the follow-up view renders the buggy code as a numbered block.

## v0.6.7 — 2026-11-15
- Re-audited all 80 question walkthroughs and inserted explicit intermediate steps for arithmetic, function-return expressions, and formatted output where appropriate.
- Separated `print(square(4) + 1)` into return 16, calculate 16 + 1 = 17, then Call print() with Output 17.
- Added per-operation breakdown for numeric `+`, `-`, `*`, `/`, `//`, `%`, and parentheses, with explicit formatting steps for f-strings.
- Print events now have consistent violet Call print() badges and specific explanations, even for simple `print('Hi')` examples.
- Corrected arithmetic enrichment to use pre-assignment variable values and made the offline transformation idempotent.
- Reviewed 80 questions, 1,103 trace states, 125 calculation steps, and 96 print events against shared rules and added an all-question detailed-step CI test.
- Trace source, Output/Explanation layout, saved progress and XP semantics are unchanged.

## UI label consistency — 2026-11-15
- Function definition events now use named violet badges such as `Define greet()`, matching existing `Call greet()` badges instead of generic `Function defined`.
- The function name is extracted from the actual Python `def` source line; the rule applies to every question using the common Trace renderer.
- Added a cross-question regression assertion for named function definition badges.

## v0.6.6 — 2026-11-15
- Applied a single walkthrough layout to all 80 questions: Step and Previous/Next/Restart **above code**, cumulative Output **below code**, Explanation **below Output**.
- Output area is always present and starts blank; it reads the cumulative `step.output` snapshot, including multiple print lines. Removed inline print-result tags and obsolete pinned-print rendering.
- Retained the full-width dark code panel, current-line arrow, scoped persistent variables, condition verdicts and function call/return tags.
- Consolidated scattered implementation notes into Technical Design §7 as the canonical Walkthrough Contract.
- Updated legacy inline/output-event tests and added a whole-bank renderer regression covering all 978 trace steps; GitHub Actions includes the new test.
- Classroom browser visual QA and fresh CI status still require confirmation.

## v0.6.5 — 2026-11-15
- Standardized `Function defined` badges using actual `def` source lines rather than brittle English-explanation punctuation.
- Pinned printed output to the `print()` line that produced it, retaining that output across later execution steps and function returns.
- Corrected Week 2 Medium question `W2-M-03` so the else selection is distinct from the subsequent `print('Wait')` step.
- Audited all 80 question walkthroughs for function definitions, invocation/return messages, conditional verdicts and actual output source lines.
- Added `tests/validate-trace-events.mjs` to the GitHub Actions validation workflow and updated documentation.
- Program execution steps remain static; no arbitrary Python is executed in the browser.

## v0.6.4 — 2026-11-15
- Widened the overall game and question card, and wrapped code-line badges to prevent offscreen variable values.
- Implemented persistent variables at their most recent assignment line, with the previous value/location removed on reassignment.
- Added function-scoped variable lifetime: parameters appear at `def`, locals persist through body/return and vanish when the function returns; outer variables survive nested calls, and globals persist.
- Kept transient function-call and condition-verdict indicators attached to the active arrow (output is now retained at its print line in v0.6.5).
- Added `tests/validate-trace-scopes.mjs` and GitHub Actions coverage for variable lifetime and placement.
- Updated the User Guide, README and Technical Design.

## Trace entry and explanation layout — 2026-11-15
- When invoking a function, the arrow now highlights its `def` line to introduce bound arguments before stepping into the first executable statement.
- Regenerated all 20 Week 4 walkthroughs to follow the updated entry sequence, including nested calls.
- Reserved three lines of Explanation height to prevent the navigation buttons from jumping as short explanations change; longer text may expand.
- Updated the nested-call regression test and Technical Design.

## CI correction — 2026-11-15

- Corrected `tests/validate-trace-control-flow.mjs` to recognize the two intentionally curated Python floating-point output steps, `W4-H-04` (`55.0`) and `W4-X-03` (`36.0`).
- Preserved strict matching of arrow lines, variable snapshots and all other trace explanations.
- Rechecked 40 Hard/Extra trace sequences against their generated counterparts with no mismatches.
- Added CI debugging guidance to the Technical Design documentation.

## v0.6.3 — 2026-11-15
- Redesigned Watch How the Code Works into one full-width dark code panel, removing the separate Variables, Output and condition sidebar.
- Made variable creations/updates, function call/return messages, check/cross verdicts and print output appear beside the highlighted code line.
- Only the current step displays inline annotations; stepping forward/backward removes older annotations rather than leaving stale values.
- Preserved Step, Explanation, Previous/Next/Restart, existing quizzes, scoring, usernames and saved learning progress.
- Extended inline trace regression coverage across all four weeks, especially Week 4 nested function calls and returns.
- Browser visual QA remains pending.

## v0.6.2 — 2026-11-15
- Added an inline green ✓ or red ✕ at the currently highlighted conditional/loop line.
- Displays the **current values** of variables used in that check, e.g. i = 1, i = 2, i = 4 as a while loop advances or exits.
- Shows Enter Branch / Skip Branch for if/elif, Continue Loop / Exit Loop for while and Next Iteration / Loop Finished for for.
- Retains the right-hand verdict panel and Explanation text, without animated effects or changes to scoring.
- Added inline-condition regression tests and CI workflow step to protect future changes.

## v0.6.1 — 2026-11-15
- Corrected function call tracing so the arrow moves from the actual caller source line into the function body, then returns to the caller before finishing an assignment or print.
- Regenerated all 40 Hard and Extra Rock walkthroughs to match the corrected call/return sequencing.
- Added a small condition verdict in the right-hand Trace panel: ✓ True / Enter Branch or ✕ False / Skip Branch; while and for loops show Continue/Exit or Next Iteration/Finished.
- Fixed compound condition interpretation so intermediate True values cannot override the final False result.
- Added regression tests for the Week 4 Extra Rock nested-call example, condition steps, and the full set of static trace data.

### Verification
- Validated the arrows and explanations for all generated Hard/Extra traces and tested condition indicators over all 80 Trace datasets.
- Automated browser simulation checked the Week 4 Extra Rock condition display. Real browser/classroom visual QA remains pending.

## v0.6.0 — 2026-11-15
- Reviewed the Weeks 1–4 lesson folders, QuickChecks, in-class practice and homework PDFs before recalibrating difficulty.
- Rewrote 20 Hard questions and added 20 cumulative **Extra Rock** questions, yielding 80 total (5 cards per difficulty per week).
- Increased cumulative reasoning: multi-stage receipt/trip calculations, shipping/KDA edge cases, nested loop/prime/Goldbach logic, multi-function XP/checkout flows.
- Added all 20 Extra Rock traces and regenerated Hard walkthroughs against the changed code (80 traces / 911 teaching steps).
- Added 25 XP per correct Extra Rock card; maximum possible XP rises from 900 to 1,400. Original three-level badges stay intact.
- Archived older Hard best scores under My Progress; unchanged Easy/Medium scores remain, and old Hard autosave/review records are not incorrectly opened for revised questions.
- Added curriculum-aligned difficulty framework, CPython example checker, and GitHub Actions validation workflow.

### Remaining verification
- Automated trace/output structure checks and simulated quiz/progress interactions passed.
- Real CPython CI status and browser visual QA need confirmation before broad classroom rollout.

## v0.5.0 — 2026-11-15
- Extended inline Watch How the Code Works traces to every Week 2, Week 3 and Week 4 question, bringing Challenge 1 coverage to 60/60.
- Walked through if/elif/else branch choices, for/while checks, break/continue, nested loops, calls, parameters and return values.
- Highlighted **Explanation:** in bold red below the code/variable panels; retained readable normal text for explanations.
- Added 45 new guided traces and `tests/validate-traces.mjs` for line index, expected outputs, and snapshot checks.
- Preserved local usernames, autosave, review controls, XP and personal-best scoring.

### Notes
- Trace mode is static, not a general-purpose Python interpreter. One Week 2 operator-fill example shows what happens *after correcting* intentionally incomplete code.
- Completed real-browser visual QA and classroom usability feedback are still outstanding.

## v0.4.0 — 2026-11-15
- Added optional inline Watch How the Code Works to all 15 Week 1 questions.
- Rendered the existing question code as highlighted executable lines with a moving arrow and numbered steps.
- Added variable snapshots, new/updated-value highlights, cumulative output, clear explanatory text, and TypeError example.
- Added Previous / Next Step / Restart / Close controls, without autoplay or distracting animation.
- Reused the trace panel on previously completed Review cards, preserving local best scores and quiz behavior.
- Added guided trace data in `data/traces-week1.json`; no live code execution and no new backend.
- Verified all 15 trace scripts and ran simulated UI checks for stepping, navigation, restart and resume.

### Limitations
- Trace mode is available for Week 1 only while the pilot is evaluated.
- Example input values are shown for input() questions; user code is not executed.
- Classroom and real browser visual review remains pending.

## v0.3.0 — 2026-11-15
- Auto-save unfinished five-question runs per local username, week and difficulty.
- Offer Continue Quest or Start Over when reopening an unfinished quest.
- Show unfinished quest shortcuts on the home page.
- Save latest completed cards and answers for Previous/Next browsing.
- Add Review cards links from results, difficulty selection and My Progress.
- Allow free Retry within completed-card review without changing historic XP or best score.
- Retain best scores separately; preserve previous local player profiles and question bank.

### Known limitations
- Progress stays in one browser; private/incognito browsing or clearing site data can lose it.
- Review stores the latest completed run per difficulty, not a full history of every attempt.
- Question bank is still an educator-review draft; student/browser QA remains recommended.

## v0.2.1 — 2026-11-15
- Award full points for any correct submission, including after hints and retries.
- Show Answer gives explanation and advances without XP for that question.
- Updated results labels, help text and scoring function to count eventually solved questions.
- Kept per-quest personal-best progress and local username profiles unchanged.

## v0.2.0 — 2026-11-15
- Added optional local username entry; blank defaults to shared guest name `username`.
- Kept scores isolated per normalized username in browser localStorage, with a Switch Player control.
- Migrates old v0.1 single-browser progress into the guest profile when first selected.
- Redesigned wrong-answer flow: Give me a hint → Retry or Show answer → explanation.
- Preserved first-submission-only scoring and best-score XP calculation.
- No database, password, or hosted account created.

### Known limitations
- Nicknames are not secure logins; same browser and same nickname can alter progress.
- Refresh during a question does not resume the unfinished five-question attempt.
- Browser/device changes and cleared local storage lose profile progress.

## v0.1.0 — 2026-11-15
- Imported Challenge 1 teacher-draft bank: Weeks 1–4, 60 questions.
- Added responsive static UI with week/difficulty selector, five-question quizzes, hints and result pages.
- Implemented first-try scoring, per-quest best scores in browser localStorage, stars and four topic badges.
- Added suggested learning progression; no levels are locked.
- Documented local testing, deployment limitations and source Google Docs.

### Known limitations
- No hosted preview URL has been provisioned.
- Teacher review and complete browser test pass pending.
- Short answers require exact response format (apart from surrounding whitespace).
- No server-side progress syncing.
