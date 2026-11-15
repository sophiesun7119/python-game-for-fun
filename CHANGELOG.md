# Changelog

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
