"""Verify teacher-authored fixed examples using CPython (never student code).

Run from repository root: python3 tests/validate_python.py
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
questions = json.loads((ROOT / "data" / "questions.json").read_text())["questions"]
failed = []
checked = 0

for q in questions:
    code = q["code"]
    expected = q["answer"]
    sample_input = ""
    if q["id"] == "W1-E-05":
        # This question asks for the *type* of input(), not printed output.
        continue
    if q["id"] == "W1-M-05":
        sample_input = "7\n"
    if q["id"] == "W2-M-05":
        # The incomplete line intentionally asks for a missing comparison operator.
        code = code.replace("__", "==")
        expected = "Match"

    try:
        result = subprocess.run(
            [sys.executable, "-c", code],
            input=sample_input,
            capture_output=True,
            text=True,
            timeout=3,
            check=False,
        )
        if result.returncode != 0:
            failed.append((q["id"], "Python error: " + result.stderr[:250]))
            continue
        actual = result.stdout.strip()
        if q["id"] == "W3-E-02":
            correct = len(actual.splitlines()) == int(expected)
        elif q["id"] == "W4-M-03":
            correct = actual.splitlines()[-1] == expected
        else:
            correct = actual == expected
        if not correct:
            failed.append((q["id"], f"expected {expected!r}, got {actual!r}"))
        checked += 1
    except subprocess.TimeoutExpired:
        failed.append((q["id"], "Execution timed out"))

for qid, message in failed:
    print(f"FAIL {qid}: {message}")
if failed:
    raise SystemExit(f"Failed {len(failed)} of {checked} completed checks")
print(f"PASS: {checked} fixed teaching examples match CPython output.")
