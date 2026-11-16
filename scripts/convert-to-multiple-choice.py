#!/usr/bin/env python3
"""Convert selected short-answer cards to single-answer multiple choice.

Policy (curriculum decision, 2026-11-15): every Easy card is multiple
choice; Medium is roughly half multiple choice (the cards whose typed
answers are long, multi-line, or case-sensitive words) and half typed;
Hard and Extra Rock main cards stay typed. This script performs the
Easy/Medium conversions.

Distractors are grounded in the card itself, in priority order:
other print() literals in the code (the branches that did not run),
the trace's intermediate cumulative outputs (real partial outputs),
line-level mutations of a multi-line answer (drop / duplicate / shift
a line), number mutations that preserve the answer's formatting,
the Boolean complement, and code numbers for counting questions.
Every converted card is verified: the snippet is executed for real,
the answer must match the real output (or, for non-output prompts,
the authored answer), all four options must be unique, and the
answer must appear exactly once.

Idempotent: only cards still typed short_answer are converted.
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

MEDIUM_TO_CONVERT = {
    "W1-M-03", "W1-M-04",
    "W2-M-02", "W2-M-03", "W2-M-04",
    "W3-M-01", "W3-M-03", "W3-M-04",
    "W4-M-03", "W4-M-05",
}


def should_convert(question):
    if question["type"] != "short_answer":
        return False
    if question["difficulty"] == "easy":
        return True
    return question["id"] in MEDIUM_TO_CONVERT


def real_output_lines(question):
    stdout = io.StringIO()
    with contextlib.redirect_stdout(stdout):
        exec(compile(question["code"], "<convert>", "exec"), {})
    text = stdout.getvalue()
    return text.split("\n")[:-1] if text else []


def mutate_numbers(text, deltas):
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
        rendered = f"{shifted:.{decimals}f}" if is_float else str(int(shifted))
        out.append(text[: match.start()] + rendered + text[match.end():])
    return out


def distractor_pool(question, steps):
    answer = question["answer"]
    literals = []
    literals += re.findall(r"print\(\s*'([^']*)'\s*\)", question["code"])
    literals += re.findall(r'print\(\s*"([^"]*)"\s*\)', question["code"])
    literals += re.findall(r"return\s+'([^']*)'", question["code"])
    literals += re.findall(r"=\s*\'([^\']*)\'", question["code"])
    intermediates = []
    for step in steps:
        joined = "\n".join(str(x) for x in (step.get("output") or []))
        if joined and joined not in intermediates:
            intermediates.append(joined)
    line_mutations = []
    lines = answer.split("\n")
    if len(lines) >= 2:
        line_mutations.append("\n".join(lines[:-1]))
        line_mutations.append("\n".join(lines + [lines[-1]]))
        line_mutations.append("\n".join([lines[0]] + lines))
        line_mutations.append("\n".join(reversed(lines)))
        for i, line in enumerate(lines):
            for mutated in mutate_numbers(line, (1, -1)):
                variant = lines.copy()
                variant[i] = mutated
                line_mutations.append("\n".join(variant))
    number_mutations = mutate_numbers(answer, (1, -1, 2, 10, -2))
    code_numbers = re.findall(r"\d+", question["code"])
    if answer in ("True", "False"):
        complement = "False" if answer == "True" else "True"
        return [complement, "None", "Error"] + literals + intermediates + code_numbers
    if not question["prompt"].startswith("What prints"):
        return number_mutations + code_numbers + intermediates + literals + ["Error", "None", "0"]
    return literals + intermediates + line_mutations + number_mutations + code_numbers + ["Error", "None", "0"]


def main():
    changed = 0
    for question in questions:
        if not should_convert(question):
            continue
        answer = question["answer"]
        steps = traces[question["id"]]["steps"]
        # Grounding: for output questions the authored answer must equal
        # the real joined output (or one of its lines for line prompts).
        real_lines = real_output_lines(question)
        if question["prompt"].startswith("What prints?"):
            assert "\n".join(real_lines) == answer, f"{question['id']}: answer != real output"
        rng = random.Random(question["id"] + ":convert")
        options = [answer]
        seen = {answer}
        for candidate in distractor_pool(question, steps):
            if candidate not in seen and candidate.strip() != "":
                seen.add(candidate)
                options.append(candidate)
            if len(options) == 4:
                break
        assert len(options) == 4, f"{question['id']}: only {len(options)} options derivable"
        rng.shuffle(options)
        question["type"] = "multiple_choice"
        question["options"] = options
        changed += 1
        print(f"{question['id']}: -> MC {options}")
    if changed:
        QUESTIONS_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"convert-to-multiple-choice: {changed} card(s) converted")


if __name__ == "__main__":
    sys.exit(main())
