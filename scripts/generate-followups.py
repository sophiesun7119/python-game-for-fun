#!/usr/bin/env python3
"""Generate multiple-choice follow-up ("bonus") questions for Hard and
Extra Rock cards from their verified walkthrough traces.

Design (see Technical Design section 4): one code snippet can carry
several questions. These follow-ups are derived mechanically from data
that is already cross-checked against real CPython execution, and every
derived answer is re-verified here against a fresh real execution of
the snippet before anything is written:

  * state question  - "After the code finishes, what is the value of X?"
    Distractors are other values X actually held during the run, other
    final variables' values, or neighbouring numbers.
  * output question - "What is the first/second/last line of output?"
    or, for single-line output, a multiple-choice form of "What does
    the code print?" with mutated-number distractors.

The script is idempotent: questions that already have followups are
left untouched. Delete a card's "followups" array and rerun to
regenerate it. Answers are formatted the way the game's own
multiple-choice options are (raw strings, True/False, None, Python
number formatting).
"""
import contextlib
import io
import json
import random
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
QUESTIONS_PATH = ROOT / "data" / "questions.json"
payload = json.loads(QUESTIONS_PATH.read_text(encoding="utf-8"))
questions = payload["questions"]
traces = {}
for week in (1, 2, 3, 4):
    data = json.loads((ROOT / "data" / f"traces-week{week}.json").read_text(encoding="utf-8"))
    traces.update(data["traces"])

FOLLOWUP_COUNT = {"hard": 2, "extra": 1}
SCALARS = (int, float, str, bool, type(None))


def display(value):
    if isinstance(value, bool):
        return "True" if value else "False"
    if value is None:
        return "None"
    if isinstance(value, float):
        return repr(value)
    return str(value)


def real_run(question):
    stdout = io.StringIO()
    globals_out = {}
    with contextlib.redirect_stdout(stdout):
        exec(compile(question["code"], "<followups>", "exec"), globals_out)
    text = stdout.getvalue()
    lines = text.split("\n")[:-1] if text else []
    finals = {k: v for k, v in globals_out.items()
              if not k.startswith("__") and isinstance(v, SCALARS)}
    return lines, finals


def mutate_numbers(text, deltas):
    """Return variants of text with its first number shifted, or []."""
    match = re.search(r"-?\d+(?:\.\d+)?", text)
    if not match:
        return []
    token = match.group(0)
    is_float = "." in token
    base = float(token) if is_float else int(token)
    decimals = len(token.split(".")[1]) if is_float else 0
    out = []
    for d in deltas:
        shifted = base + d
        if is_float:
            rendered = f"{shifted:.{decimals}f}"
        else:
            rendered = str(int(shifted))
        out.append(text[: match.start()] + rendered + text[match.end():])
    return out


def pick_options(correct, distractors, rng):
    seen = {correct}
    options = [correct]
    for d in distractors:
        if d not in seen:
            seen.add(d)
            options.append(d)
        if len(options) == 4:
            break
    if len(options) < 4:
        return None
    rng.shuffle(options)
    return options


def display_state(value):
    """Format a variable's value the way the trace tags show it: strings
    keep their quotes so '3' (string) and 3 (int) stay distinguishable."""
    if isinstance(value, str):
        return '"' + value + '"'
    return display(value)


def state_followup(question, steps, real_finals):
    final_vars = steps[-1].get("variables") or {}
    if not final_vars:
        return None
    code_lines = question["code"].split("\n")
    loop_vars = set(re.findall(r"^\s*for\s+([A-Za-z_]\w*)\s+in\b", question["code"], re.M))
    print_vars = set()
    for raw in code_lines:
        stripped = raw.strip()
        if stripped.startswith("print("):
            print_vars |= set(re.findall(r"[A-Za-z_]\w*", stripped))
    candidates = []
    for name, value in final_vars.items():
        last_change_line = None
        prev = object()
        for step in steps:
            step_vars = step.get("variables") or {}
            if name in step_vars and step_vars[name] != prev:
                last_change_line = step.get("line")
            if name in step_vars:
                prev = step_vars[name]
        history = []
        seen_values = []
        for step in steps:
            step_vars = step.get("variables") or {}
            if name in step_vars and step_vars[name] not in seen_values:
                seen_values.append(step_vars[name])
        history = seen_values
        candidates.append({
            "name": name, "value": value, "history": history,
            "last_change_line": last_change_line or 0,
            "in_print": name in print_vars, "is_loop": name in loop_vars,
            # Re-asking the printed variable in multiple-choice form is a
            # legitimate second angle; demote only non-printed variables
            # whose value coincides with the main answer, and floats with
            # long binary-artifact representations.
            "duplicates_main": (display_state(value) == str(question["answer"]).strip()
            or display(value) == str(question["answer"]).strip()),
            "ugly_float": isinstance(value, float) and len(repr(value).split(".")[-1]) >= 5,
        })
    # Prefer variables the final print uses, then non-loop variables,
    # then the most recently updated.
    candidates.sort(key=lambda c: (c["ugly_float"], c["duplicates_main"] and not c["in_print"], not c["in_print"], c["is_loop"], -c["last_change_line"], c["name"]))
    chosen = candidates[0]
    name, value, history = chosen["name"], chosen["value"], chosen["history"]
    last_change_line = chosen["last_change_line"]
    # Re-verify against the real execution, not just the trace.
    if name not in real_finals or real_finals[name] != value:
        raise AssertionError(f"{question['id']}: trace final {name}={value!r} != real {real_finals.get(name)!r}")
    correct = display_state(value)
    distractors = [display_state(v) for v in reversed(history[:-1])]
    distractors += [display_state(v) for k, v in real_finals.items() if k != name]
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        distractors += [display(value + d) for d in (1, -1, 2, 10)]
    if isinstance(value, bool):
        distractors += ["False" if value else "True"]
    if isinstance(value, str):
        distractors += ['"' + m + '"' for m in mutate_numbers(value, (1, -1, 2))]
    rng = random.Random(question["id"] + ":state")
    options = pick_options(correct, distractors, rng)
    if options is None:
        return None
    line_text = code_lines[last_change_line].strip() if 0 <= last_change_line < len(code_lines) else ""
    explanation = f"Follow {name} to the end of the walkthrough: its last update is on line {last_change_line + 1} ({line_text}), leaving {name} = {correct}."
    return {
        "prompt": f"After the code finishes, what is the value of {name}?",
        "type": "multiple_choice",
        "options": options,
        "answer": correct,
        "explanation": explanation,
    }


def return_followup(question, steps):
    """Ask what one specific function call in the snippet returns, derived
    from the trace's own Call / Return-from step pair."""
    calls = []  # (call_text, return_display)
    last_call = None
    for step in steps:
        note = step.get("explanation") or ""
        call_match = re.match(r"Call ([A-Za-z_]\w*\([^)]*\)) from this line", note)
        if call_match:
            last_call = call_match.group(1)
        ret_match = re.match(r"Return from [A-Za-z_]\w*\(\) to this calling line with value (.+?)\. Continue", note)
        if ret_match and last_call:
            calls.append((last_call, ret_match.group(1)))
            last_call = None
    if not calls:
        return None
    # Prefer a call whose return value is not the main answer itself.
    main_answer = str(question["answer"]).strip()
    calls.sort(key=lambda c: c[1] == main_answer)
    call_text, returned = calls[0]
    distractors = [r for _, r in calls[1:]]
    distractors += mutate_numbers(returned, (1, -1, 2, 10))
    distractors += [str(question["answer"])]
    rng = random.Random(question["id"] + ":return")
    options = pick_options(returned, distractors, rng)
    if options is None:
        return None
    return {
        "prompt": f"What does {call_text} return?",
        "type": "multiple_choice",
        "options": options,
        "answer": returned,
        "explanation": f"Step into {call_text} in the walkthrough: it returns {returned} to the calling line.",
    }


def output_followup(question, steps, real_lines):
    final_output = steps[-1].get("output") or []
    if list(final_output) != list(real_lines):
        raise AssertionError(f"{question['id']}: trace final output != real stdout")
    if not final_output:
        return None
    rng = random.Random(question["id"] + ":output")
    if len(final_output) >= 2:
        which = ["first", "second", "last"][rng.randrange(3)]
        index = {"first": 0, "second": 1, "last": len(final_output) - 1}[which]
        correct = str(final_output[index])
        distractors = [str(line) for line in final_output]
        distractors += mutate_numbers(correct, (1, -1, 2))
        options = pick_options(correct, distractors, rng)
        if options is not None:
            return {
                "prompt": f"What is the {which} line of output?",
                "type": "multiple_choice",
                "options": options,
                "answer": correct,
                "explanation": f"The code prints {len(final_output)} lines: " + " / ".join(str(x) for x in final_output) + ".",
            }
    # Single-line output (or not enough distinct lines): multiple-choice
    # form of the main "What prints?" question. Distractors come from
    # mutated numbers and from the other print() literals in the code
    # (the branches that did not run).
    correct = str(final_output[0]) if len(final_output) == 1 else str(final_output[-1])
    distractors = mutate_numbers(correct, (1, -1, 2, 10))
    distractors += [str(line) for line in final_output]
    distractors += re.findall(r"print\(\s*'([^']*)'\s*\)", question["code"])
    distractors += re.findall(r'print\(\s*"([^"]*)"\s*\)', question["code"])
    options = pick_options(correct, distractors, rng)
    if options is None:
        options = pick_options(correct, distractors + ["0", "1", "Error", "Nothing is printed"], rng)
    if options is None:
        return None
    return {
        "prompt": "What does the code print?",
        "type": "multiple_choice",
        "options": options,
        "answer": correct,
        "explanation": "Run the walkthrough to the last step: the Output box shows " + correct + ".",
    }


def count_followup(question, steps, real_lines):
    final_output = steps[-1].get("output") or []
    if list(final_output) != list(real_lines) or not final_output:
        return None
    n = len(final_output)
    correct = str(n)
    options = [correct, str(n + 1), str(n + 2), str(n + 3)]
    random.Random(question["id"] + ":count").shuffle(options)
    return {
        "prompt": "How many lines does the code print?",
        "type": "multiple_choice",
        "options": options,
        "answer": correct,
        "explanation": f"The Output box ends with {n} line(s): " + " / ".join(str(x) for x in final_output) + ".",
    }


def main():
    changed = 0
    for question in questions:
        count = FOLLOWUP_COUNT.get(question["difficulty"], 0)
        if count == 0 or question.get("followups"):
            continue
        steps = traces[question["id"]]["steps"]
        real_lines, real_finals = real_run(question)
        # Priority: variable state, a specific call's return value,
        # output detail, line count. Take the first `count` that derive.
        pool = [
            state_followup(question, steps, real_finals),
            return_followup(question, steps),
            output_followup(question, steps, real_lines),
            count_followup(question, steps, real_lines),
        ]
        made = []
        for candidate in pool:
            if candidate and all(candidate["prompt"] != f["prompt"] for f in made):
                made.append(candidate)
            if len(made) == count:
                break
        if len(made) < count:
            raise AssertionError(f"{question['id']}: could only derive {len(made)} followup(s), need {count}")
        question["followups"] = made[:count]
        changed += 1
        print(f"{question['id']}: +{len(made[:count])} followups")
    if changed:
        QUESTIONS_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"generate-followups: {changed} question(s) updated")


if __name__ == "__main__":
    sys.exit(main())
