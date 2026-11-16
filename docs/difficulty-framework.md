# Python Quest difficulty framework — curriculum v2

Updated 2026-11-15. **Challenge 1** has **80 questions** (4 weeks × 4 difficulties × 5 cards) and **Challenge 2 — Data Explorer** adds **80 more** for Weeks 6–9, for **160 questions** in total.

## Goal

Challenges must become harder as students acquire more tools. Week 4's Extra Rock questions can require Week 1 arithmetic, Week 2 conditionals, Week 3 loops, and Week 4 functions together. Hard should not simply repeat in-class QuickCheck questions with different numbers.

| Level | Purpose | Typical reasoning |
|---|---|---|
| Easy | Isolate a new concept | One clear rule or operation, immediate feedback |
| Medium | Apply the week's new skill | 2–4 linked steps or a straightforward branch/loop |
| Hard | Integrate several skills, debug assumptions | Multiple assignments, conditions or loop iterations, boundary cases |
| **Extra Rock** | Cumulative extension | Rich examples from homework, deeper state tracing, nested control flow and helper functions |

Every week and difficulty stays selectable. Extra Rock is a **bonus**, not a prerequisite for the original topic badge. The normal topic badge still requires at least 3/5 in Easy, Medium and Hard.

## Per-week scope and question upgrades

### Week 1 — Output, variables, input, arithmetic, formatting

- **Hard:** multi-line receipt tax, trip fuel cost, dependent reassignment, string/numeric conversion and padded formatting.
- **Extra Rock:** arithmetic swap, tax plus shared bill, cumulative string-to-int work, multiple arithmetic dependencies, aligned receipt output.
- Extra Rock may deliberately stretch formatting and `len()`, but it does not rely on later-week conditionals or loops.
- Source: [Week 1 Practice PDF](https://drive.google.com/file/d/1LMl52kMhr_Of3F1h3AgXh_CZ-fsdSkoR/view), [Homework PDF](https://drive.google.com/file/d/1SXOb1c3qp08L60Ut2-dka5QyDWIF56Xg/view).

### Week 2 — Conditional logic **plus Week 1 calculations**

- **Hard:** boundary-aware shipping fee tiers, zero-death KDA, independent if statements, Boolean precedence, elif ordering.
- **Extra Rock:** discounts changing subsequent shipping, nested mutable state, adjusted KDA ranking, mixed logical expressions and edge values.
- Source: [Week 2 Practice PDF](https://drive.google.com/file/d/1B7xZcJgowjeKcqVon6E1lobXUAk4aSAf/view), [Homework PDF](https://drive.google.com/file/d/1pjD90Ncpcm1OFejEFKaPWbp0kwvKN73c/view).

### Week 3 — Loops **plus conditionals and accumulated state**

- **Hard:** parity-driven accumulators, filtered nested loops, while with continue, inner break, factor search.
- **Extra Rock:** finding the next prime, verifying a Goldbach pair, nested while, combined break and continue, running min/max/count.
- Source: [Week 3 QuickCheck PDF](https://drive.google.com/file/d/1rhGGPgSMm-3env-4lfWJ76OgfjqPDz4Q/view), [Practice PDF](https://drive.google.com/file/d/16Ff3-RPNVMd3pylLVY956ZcMVxon-RH4/view), [Homework PDF](https://drive.google.com/file/d/1HCd2hDN_ZHOzaljGvSmjmshy9exbGllR/view).

### Week 4 — Functions **plus arithmetic, conditions and loops**

- **Hard:** calling rate/fee helpers, loop inside function, print vs return, helper return composition, repeated calls.
- **Extra Rock:** tiered XP helper, repeated level-up in a while loop, several shipping helper calls, nested loops in a function, function parameter scope.
- Source: [Week 4 QuickCheck PDF](https://drive.google.com/file/d/1K8BH2B5dnk5AEs18oLC7KEQEChPyF-SY/view), [Practice PDF](https://drive.google.com/file/d/1OF8e6ePpZP8tWwU1YzszvQu8DEa28se0/view), [Homework PDF](https://drive.google.com/file/d/1OOR3zi7FQeMxpYjeSM1slfYUdaP0xELK/view).

### Week 6 — Lists **plus loops, conditionals and functions**

- **Easy/Medium:** indexing from 0, negative indexing, slicing, `len`/`max`/`min`/`sum`, `append()` and `sort()` (in place, returns `None`), `split()` producing strings, modifying by index, plus concept questions (indexing starts at 0; what `append()` does).
- **Hard:** the list is a tool inside bigger code — count/sum items passing a condition, two-list lookups, building a list with a loop; answers are derived numbers or single values.
- **Extra Rock:** cumulative patterns from homework — positions list with `-1` for empty lanes (update first, then check landings), parallel lists with `index(max(...))`, running totals with a while loop, helper functions over lists.
- Source: Week 6 QuickCheck and Homework (course Drive folder).

### Week 7 — Strings **plus Week 6 list thinking**

- **Easy/Medium:** string `+`/`*`/`in`, indexing and slicing including `[::-1]`, immutability, `strip`/`upper`/`lower` returning new strings, `split()`/`split(sep)`, `join`, `startswith`/`endswith`/`count`/`isdigit`, f-string alignment and `:.1f` formatting, plus concept questions (immutability; what `strip()` removes).
- **Hard:** parsing messy text (`split(",")` + `strip` + `int`), counting patterns with slices, formatted status-card output in the homework style.
- **Extra Rock:** first/last word logic, longest-word scan (first maximum wins), pattern counting with overlapping slices, helpers combining slicing and loops.
- Source: Week 7 QuickCheck and Homework (course Drive folder).

### Week 8 — Sets **plus membership and counting patterns**

- **Easy/Medium:** `set(list)` deduplication, `{}` is a dict (empty set is `set()`), `add`, `remove` vs `discard`, membership `in`/`not in`, union `|`, intersection `&`, difference `-`, symmetric difference `^`; results are asked via `sorted()`, `len()` or single values — never by relying on set print order — plus concept questions (creating an empty set; why printed set order can differ).
- **Hard:** building sets inside loops (occupied-lanes pattern), overlap counts, combining set algebra with earlier list/string skills.
- **Extra Rock:** set algebra over strings and lists, derived counts and membership verdicts, helpers returning set-based results.
- Source: Week 8 QuickCheck and Homework (course Drive folder).

### Week 9 — Dictionaries **plus counting and game-state patterns**

- **Easy/Medium:** literal and `dict()` creation, lookup by key, `KeyError` vs `.get()` / `.get(key, default)`, add/modify by assignment, `update()` overwriting and adding, `pop()` returning the value, `popitem()`, `len`, iterating keys, `.items()` unpacking, insertion order, plus concept questions (word→definition lookup fits a dictionary; `.get()` on a missing key).
- **Hard:** the homework's game-state dictionaries — building and updating state, counting with `counts.get(w, 0) + 1`, combining two dictionaries' values; answers are derived numbers or single looked-up values.
- **Extra Rock:** word-frequency counting, merging dictionaries, multi-step state updates with loops and helpers.
- Source: Week 9 QuickCheck and Homework paper (course Drive folder).

## Scores and compatibility

| Difficulty | Points per solved question | Max per 5 cards |
|---|---:|---:|
| Easy | 10 | 50 |
| Medium | 15 | 75 |
| Hard | 20 | 100 |
| Extra Rock | 25 | 125 |

- Full path across both challenges: **1,800 XP**; all eight Extra Rock levels: **1,000 additional XP**; total maximum: **2,800 XP**.
- Retry and Hint still allow full points once a student solves the question without revealing the answer. Show Answer gives no points for that card.
- Scores are still per local Username/browser. Personal best, autosave, review and static trace still work.
- The old **Hard** items were replaced. On first load of curriculum v2, the old Hard best scores are **archived**, shown in My Progress, and excluded from the new score tally. The unchanged Easy/Medium scores remain; they are never deleted. Older unfinished/completed Hard snapshots are not loaded against the new questions.
- `data/questions.json` contains revision `curriculum-v2`. All 160 question IDs have matching trace data across `data/traces-week1.json` … `data/traces-week4.json` and `data/traces-week6.json` … `data/traces-week9.json`. Challenge 2 traces are generated by `scripts/generate-traces.py` (real CPython `sys.settrace` execution) instead of the JS generator, which cannot evaluate collection methods, negative indexing or slicing.

## Validation

Run in the repository root:

```bash
python3 tests/validate_python.py
node tests/validate-traces.mjs
```

The first runs the fixed, teacher-authored code snippets through a local CPython subprocess; it does not run code entered by students. The second checks question/trace pairing, execution line bounds and expected output or count.
