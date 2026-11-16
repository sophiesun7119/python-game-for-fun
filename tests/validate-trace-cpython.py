#!/usr/bin/env python3
"""Cross-check every trace step against a real CPython execution.

The other trace suites compare the curated JSON against the offline
generator or against renderer expectations. This one compares against
CPython itself (sys.settrace), so a hand-edit that invents a variable
value or an output line fails here even if every other suite passes.

For each runnable question the real execution is recorded as an ordered
event stream. Every non-ready trace step must either

  * match a real execution event, in order, on the same line, whose
    post-state contains the step's variables with equal values, or
  * be a pedagogical marker step in one of the forms defined in
    Technical Design section 7.8 (branch marker on an else/elif line,
    same-line sub-step, loop check/finished marker, or a
    return-to-caller completion step),

and every step (markers and calculation steps included) must satisfy
two truthfulness invariants: its variable snapshot is a subset of a
state the real execution actually reached, and its cumulative output
is a prefix of the real stdout. The final step's output must equal
the real stdout exactly.
"""
import contextlib
import io
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
questions = json.loads((ROOT / "data" / "questions.json").read_text(encoding="utf-8"))["questions"]
traces = {}
for week in (1, 2, 3, 4):
    payload = json.loads((ROOT / "data" / f"traces-week{week}.json").read_text(encoding="utf-8"))
    traces.update(payload["traces"])

# W1-E-05 asks about the *type* of input()'s return value; it is a
# conceptual question and is excepted here just as in validate_python.py
# and validate-traces.mjs.
SKIP = {"W1-E-05"}
SPECIAL_INPUT = {"W1-M-05": "7\n"}
SCALARS = (int, float, str, bool, type(None))


def runnable_code(question):
    code = question["code"]
    if question["id"] == "W2-M-05":
        # Fill-in-the-blank card: substitute the intended operator, the
        # same treatment validate_python.py gives it.
        code = code.replace("__", "==")
    return code


def real_execution(question):
    """Return (events, stdout_lines). Events are (line0, kind, snapshot)
    in execution order; a snapshot is the frame's globals+locals scalars
    taken when the event fires (a pre-state)."""
    events = []

    def snap(frame):
        merged = {}
        for source in (frame.f_globals, frame.f_locals):
            for key, value in source.items():
                if not key.startswith("__") and isinstance(value, SCALARS):
                    merged[key] = value
        return merged

    def tracer(frame, event, arg):
        if frame.f_code.co_filename != "<trace-cpython>":
            return None
        if event == "line":
            events.append((frame.f_lineno - 1, "line", snap(frame)))
        elif event == "call":
            events.append((frame.f_code.co_firstlineno - 1, "call", snap(frame)))
        elif event == "return":
            events.append((frame.f_lineno - 1, "return", snap(frame)))
        return tracer

    stdout = io.StringIO()
    old_stdin = sys.stdin
    sys.stdin = io.StringIO(SPECIAL_INPUT.get(question["id"], ""))
    try:
        with contextlib.redirect_stdout(stdout):
            sys.settrace(tracer)
            try:
                exec(compile(runnable_code(question), "<trace-cpython>", "exec"), {})
            finally:
                sys.settrace(None)
    finally:
        sys.stdin = old_stdin
    text = stdout.getvalue()
    return events, (text.split("\n")[:-1] if text else [])


def function_ranges(lines):
    """[(name, def_line, last_body_line)] for each def in the snippet."""
    ranges = []
    for i, raw in enumerate(lines):
        stripped = raw.strip()
        if stripped.startswith("def ") and "(" in stripped:
            name = stripped[4:stripped.index("(")].strip()
            indent = len(raw) - len(raw.lstrip())
            last = i
            for j in range(i + 1, len(lines)):
                if lines[j].strip() == "":
                    continue
                if len(lines[j]) - len(lines[j].lstrip()) > indent:
                    last = j
                else:
                    break
            ranges.append((name, i, last))
    return ranges


def is_marker_step(question, step, prev_step, next_step, events, pos):
    """Technical Design 7.8 marker forms."""
    lines = question["code"].split("\n")
    line = step.get("line")
    if line is None or not (0 <= line < len(lines)):
        return False
    text = lines[line].strip()
    # 1. Branch marker on an else:/elif line.
    if text.startswith("else") or text.startswith("elif"):
        return True
    # 2. Same-line sub-step (call/enter/calculate/return/assign/print
    #    decomposition of one statement).
    if prev_step is not None and prev_step.get("line") == line:
        return True
    # 3. Loop marker on a for/while header line.
    if text.startswith("for ") or text.startswith("while "):
        return True
    # 4. Call-boundary step: this line calls a function defined in the
    #    snippet, and the step is either the Call step (the next step
    #    enters the callee at its def line) or the Return-from step (the
    #    previous step was inside the callee's body). Both are shown on
    #    the call-site line with the caller's variables, which no single
    #    CPython event on this line carries.
    for name, def_line, last_body_line in function_ranges(lines):
        if f"{name}(" not in text:
            continue
        if next_step is not None and next_step.get("line") == def_line:
            return True
        if prev_step is not None and def_line < (prev_step.get("line") or -1) <= last_body_line:
            return True
    # 5. Condition/loop header whose expression calls a function defined
    #    in the snippet: sub-steps may decompose that nested call.
    if (text.startswith("if ") or text.startswith("while ") or text.startswith("for ")) and "(" in text:
        defined = {name for name, _, _ in function_ranges(lines)}
        if any(f"{name}(" in text for name in defined):
            return True
    return False


failures = []
checked_events = 0
checked_markers = 0
checked_questions = 0

for question in questions:
    qid = question["id"]
    if qid in SKIP:
        continue
    checked_questions += 1
    steps = traces[qid]["steps"]
    try:
        events, stdout_lines = real_execution(question)
    except Exception as exc:  # noqa: BLE001 - report and fail the suite
        failures.append(f"{qid}: real execution failed: {exc}")
        continue

    # Post-state of event j = snapshot at event j+1 (or its own snapshot
    # for the final event).
    post = []
    for j, (line, kind, snapshot) in enumerate(events):
        post.append((line, kind, events[j + 1][2] if j + 1 < len(events) else snapshot))
    all_snapshots = [snapshot for _, _, snapshot in events]

    def subset_of_real_state(variables):
        return any(all(k in snap and snap[k] == v for k, v in variables.items())
                   for snap in all_snapshots)

    pos = 0
    last_matched_kind = None
    prev_step = None
    for i, step in enumerate(steps):
        variables = step.get("variables") or {}
        output = step.get("output") or []
        # Truthfulness invariants apply to every step.
        if output != stdout_lines[: len(output)]:
            failures.append(f"{qid} step {i}: output {output} is not a prefix of real stdout {stdout_lines}")
        if i > 0 and variables and not subset_of_real_state(variables):
            failures.append(f"{qid} step {i}: variables {variables} never occur in the real execution")
        if i == 0 or step.get("phase") == "calculate":
            prev_step = step
            continue
        # Monotone walk over real events.
        want_line = step.get("line")
        found = False
        j = pos
        while j < len(post):
            ev_line, ev_kind, ev_snap = post[j]
            if ev_line == want_line and all(k in ev_snap and ev_snap[k] == v for k, v in variables.items()):
                found = True
                pos = j
                last_matched_kind = ev_kind
                break
            j += 1
        if found:
            checked_events += 1
        elif is_marker_step(question, step, prev_step, steps[i + 1] if i + 1 < len(steps) else None, events, pos):
            checked_markers += 1
        else:
            failures.append(
                f"{qid} step {i}: no real event at line {want_line} with vars {variables}, "
                "and the step is not a section-7.8 pedagogical marker"
            )
        prev_step = step

    final_output = steps[-1].get("output") or []
    if final_output != stdout_lines:
        failures.append(f"{qid}: final trace output {final_output} != real stdout {stdout_lines}")

if failures:
    print(f"validate-trace-cpython: FAIL ({len(failures)} problem(s))")
    for failure in failures[:20]:
        print(" -", failure)
    sys.exit(1)
print(
    f"validate-trace-cpython: PASS ({checked_questions} questions, "
    f"{checked_events} steps matched to real CPython events, "
    f"{checked_markers} pedagogical marker steps verified)"
)
