# Changelog

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
