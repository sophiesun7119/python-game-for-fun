#!/usr/bin/env python3
"""Add hand-authored "bug hunt" follow-up pairs to selected Extra Rock
cards (Technical Design section 4).

Each chosen card gains two multiple-choice follow-ups that share a
buggy variant of the card's own code (the follow-up's `code` field):

  1. "Which line is wrong?" - the buggy code prints a different output
     than the card's correct output; options are four of its lines.
  2. "How should that line be fixed?" - options are the original line
     plus two plausible but wrong fixes.

Every spec is verified against real CPython before anything is
written: the buggy variant must print something different from the
original, the fixed line must be exactly the card's original line,
and each wrong-fix variant must also print something different from
the original (a "fix" that happens to produce the right output for
this card's values would be a second correct answer). Variants run
with a timeout so a looping bug can never hang the script.

Idempotent: cards that already have a follow-up with a `code` field
are left untouched.
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
QUESTIONS_PATH = ROOT / "data" / "questions.json"
payload = json.loads(QUESTIONS_PATH.read_text(encoding="utf-8"))
questions = {q["id"]: q for q in payload["questions"]}

# line: 0-based index of the line to break. buggy: replacement line text
# (same indentation as the original). q1_distractor_lines: 0-based line
# indices offered as the other "which line" options. fix_distractors:
# plausible wrong replacement lines for the "how to fix" question.
SPECS = [
    {
        "id": "W1-X-03", "line": 2, "buggy": "s = str(n) + s",
        "q1_distractor_lines": [1, 3, 4],
        "fix_distractors": ["s = s + n", "s = str(n) + str(n)"],
        "why": "The original adds n to the END of s ('04' + '12' = '0412'). The buggy line puts n first ('12' + '04' = '1204'), so the printed string is backwards.",
        "fix_why": "String addition keeps order: s + str(n) appends the digits of n after the original text.",
    },
    {
        "id": "W2-X-02", "line": 4, "buggy": "if level >= 3 and coins > 5:",
        "q1_distractor_lines": [3, 8, 2],
        "fix_distractors": ["if level >= 3 and coins > 5:", "if level > 3 and coins > 5:"],
        "why": "With 'and', BOTH sides must be true. level is 2, so the whole condition fails and the code takes the else branch (level + 1) instead of level + 2.",
        "fix_why": "The original uses 'or': coins > 5 alone is true (coins is 6), so level grows by 2 and reaches 4.",
    },
    {
        "id": "W2-X-05", "line": 9, "buggy": "elif weight < 20:",
        "q1_distractor_lines": [5, 7, 13],
        "fix_distractors": ["elif weight <= 19:", "elif weight > 20:"],
        "why": "weight is exactly 20. With '< 20' the branch is skipped and the fee falls through to 19.99 instead of 9.99. Boundary values are where '<' and '<=' differ.",
        "fix_why": "'<= 20' includes the boundary value 20 itself, so the 9.99 fee applies.",
    },
    {
        "id": "W3-X-03", "line": 4, "buggy": "while j < i:",
        "q1_distractor_lines": [2, 5, 7],
        "fix_distractors": ["while j <= i + 1:", "while j <= 3:"],
        "why": "With 'j < i' the inner loop stops one round early every time, so the last i * i term of each row is never added.",
        "fix_why": "'j <= i' lets j reach i, which adds the final i * i term of each row.",
    },
    {
        "id": "W3-X-04", "line": 5, "buggy": "if i + j > 6:",
        "q1_distractor_lines": [3, 1, 7],
        "fix_distractors": ["if i + j >= 5:", "if i + j > 4:"],
        "why": "Raising the limit to 6 lets one extra pair per row slip past the break, so score grows too big (42 instead of 26).",
        "fix_why": "The break must trigger as soon as i + j passes 5, exactly as the original '> 5' does.",
    },
    {
        "id": "W4-X-03", "line": 1, "buggy": "if weight < 5:",
        "q1_distractor_lines": [5, 9, 6],
        "fix_distractors": ["if weight <= 4:", "if weight < 5:"],
        "why": "One parcel weighs exactly 5. With '< 5', base(5) returns 20 instead of 10, so the total (and the discount) come out too high.",
        "fix_why": "'weight <= 5' includes a parcel of exactly 5 in the cheaper rate, as the original does.",
    },
    {
        "id": "W4-X-04", "line": 3, "buggy": "for j in range(1, i):",
        "q1_distractor_lines": [2, 4, 6],
        "fix_distractors": ["for j in range(1, i + 2):", "for j in range(0, i + 1):"],
        "why": "range(1, i) stops before j reaches i, so the pairs where j == i are never counted.",
        "fix_why": "range(1, i + 1) includes j == i, which is the last pair of each row.",
    },
]


def run_output(code):
    result = subprocess.run(
        [sys.executable, "-c", code], capture_output=True, text=True, timeout=5
    )
    if result.returncode != 0:
        return None  # crashed: definitely not the correct output
    return result.stdout.rstrip("\n")


def replace_line(code, index, new_text):
    lines = code.split("\n")
    indent = lines[index][: len(lines[index]) - len(lines[index].lstrip())]
    lines[index] = indent + new_text
    return "\n".join(lines)


def main():
    changed = 0
    for spec in SPECS:
        question = questions[spec["id"]]
        if any(f.get("code") for f in question.get("followups", [])):
            continue
        original_code = question["code"]
        original_line = original_code.split("\n")[spec["line"]].strip()
        correct_output = run_output(original_code)
        assert correct_output == question["answer"], (
            f"{spec['id']}: real output {correct_output!r} != authored answer {question['answer']!r}"
        )
        buggy_code = replace_line(original_code, spec["line"], spec["buggy"])
        buggy_output = run_output(buggy_code)
        assert buggy_output is not None, f"{spec['id']}: buggy variant crashed"
        assert buggy_output != correct_output, f"{spec['id']}: bug does not change the output"
        for wrong_fix in spec["fix_distractors"]:
            variant_output = run_output(replace_line(original_code, spec["line"], wrong_fix))
            assert variant_output != correct_output, (
                f"{spec['id']}: 'wrong fix' {wrong_fix!r} also produces the correct output"
            )
        buggy_lines = buggy_code.split("\n")
        q1_options = [buggy_lines[spec["line"]].strip()]
        for idx in spec["q1_distractor_lines"]:
            text = buggy_lines[idx].strip()
            assert text not in q1_options, f"{spec['id']}: duplicate line option {text!r}"
            q1_options.append(text)
        import random

        rng = random.Random(spec["id"] + ":debug")
        q1_shuffled = q1_options.copy()
        rng.shuffle(q1_shuffled)
        fix_options = [original_line] + spec["fix_distractors"]
        rng.shuffle(fix_options)
        question.setdefault("followups", []).extend([
            {
                "prompt": (
                    f"🐛 Bug hunt! Someone changed ONE line of this code. "
                    f"Now it prints {buggy_output} instead of {correct_output}. Which line is wrong?"
                ),
                "type": "multiple_choice",
                "code": buggy_code,
                "options": q1_shuffled,
                "answer": buggy_lines[spec["line"]].strip(),
                "explanation": spec["why"],
            },
            {
                "prompt": "How should that line be fixed?",
                "type": "multiple_choice",
                "code": buggy_code,
                "options": fix_options,
                "answer": original_line,
                "explanation": spec["fix_why"],
            },
        ])
        changed += 1
        print(f"{spec['id']}: bug on line {spec['line'] + 1}: {spec['buggy']!r} -> prints {buggy_output!r} (correct: {correct_output!r})")
    if changed:
        QUESTIONS_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"add-debug-followups: {changed} card(s) updated")


if __name__ == "__main__":
    sys.exit(main())
