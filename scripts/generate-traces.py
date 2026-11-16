#!/usr/bin/env python3
"""Generate walkthrough traces for Challenge 2 (Weeks 6-9) questions.

The JS generator (scripts/build-trace-runtime.js) only supports the
Week 1-4 subset (no collection methods, negative indexing or slicing),
so Challenge 2 traces are produced here instead:

  1. The question's code runs once under sys.settrace and every line /
     call / return event is recorded with an encoded snapshot of the
     visible variables (globals + current frame locals) and the
     cumulative printed lines so far.
  2. The event stream is walked and turned into teaching steps in the
     same voice and shape the JS generator produces (Define / Call /
     Enter / Return / Return-from steps, for-loop iteration and
     finished steps, while/if checks, branch markers on else lines -
     Technical Design sections 7.3-7.4 and 7.8).
  3. The shared enrichment (scripts/enrich-walkthroughs.js) is applied
     through node, exactly as for Weeks 1-4, so calculation and print
     steps follow the same rules bank-wide.

Value encoding in snapshots: scalars stay as-is, lists/tuples become
JSON arrays, dicts become JSON objects, and a set becomes
{"__set__": [sorted items]} so the renderer can tell it apart from a
list. Running this script regenerates data/traces-week6.json through
data/traces-week9.json from data/questions.json; it never touches the
Weeks 1-4 trace files.
"""
import ast
import contextlib
import io
import json
import subprocess
import sys
import types
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WEEKS = (6, 7, 8, 9)
FILENAME = "<generate-traces>"

# ---------------------------------------------------------------- encoding

def encode(value):
    if isinstance(value, bool) or value is None or isinstance(value, (int, float, str)):
        return value
    if isinstance(value, (list, tuple)):
        return [encode(v) for v in value]
    if isinstance(value, dict):
        return {str(k): encode(v) for k, v in value.items()}
    if isinstance(value, (set, frozenset)):
        items = [encode(v) for v in value]
        items.sort(key=lambda v: json.dumps(v, sort_keys=True))
        return {"__set__": items}
    return None  # unrepresentable values are dropped by the caller


def is_set_enc(value):
    return isinstance(value, dict) and list(value.keys()) == ["__set__"]


def decode(value):
    if isinstance(value, list):
        return [decode(v) for v in value]
    if is_set_enc(value):
        return {decode(v) for v in value["__set__"]}
    if isinstance(value, dict):
        return {k: decode(v) for k, v in value.items()}
    return value


def py_repr(value):
    """Python-style repr of an encoded snapshot value."""
    if isinstance(value, str):
        return repr(value)
    if value is True:
        return "True"
    if value is False:
        return "False"
    if value is None:
        return "None"
    if isinstance(value, float):
        return repr(value)
    if isinstance(value, list):
        return "[" + ", ".join(py_repr(v) for v in value) + "]"
    if is_set_enc(value):
        if not value["__set__"]:
            return "set()"
        return "{" + ", ".join(py_repr(v) for v in value["__set__"]) + "}"
    if isinstance(value, dict):
        return "{" + ", ".join(py_repr(k) + ": " + py_repr(v) for k, v in value.items()) + "}"
    return str(value)


def display(value):
    """buildTrace-style display: strings without quotes, else repr."""
    if isinstance(value, str):
        return value
    return py_repr(value)


# ---------------------------------------------------------------- capture

class LineRecorder:
    def __init__(self):
        self.buffer = ""
        self.lines = []

    def write(self, text):
        self.buffer += text
        while "\n" in self.buffer:
            line, self.buffer = self.buffer.split("\n", 1)
            self.lines.append(line)
        return len(text)

    def flush(self):
        pass


SKIP_TYPES = (types.FunctionType, types.BuiltinFunctionType, types.ModuleType, type)


def snapshot(frame):
    merged = {}
    for source in (frame.f_globals, frame.f_locals):
        for key, value in source.items():
            if key.startswith("_") or isinstance(value, SKIP_TYPES):
                continue
            encoded = encode(value)
            if encoded is not None or value is None:
                merged[key] = encoded
    return merged


def capture(code):
    """Run code under sys.settrace; return (events, stdout_lines)."""
    events = []
    frames_by_id = {}
    frame_objects = []
    counter = [0]

    def fid_of(frame):
        key = id(frame)
        if key not in frames_by_id:
            counter[0] += 1
            frames_by_id[key] = counter[0]
            frame_objects.append(frame)  # keep alive so ids stay unique
        return frames_by_id[key]

    recorder = LineRecorder()
    namespace = {}

    def tracer(frame, event, arg):
        if frame.f_code.co_filename != FILENAME:
            return None
        fid = fid_of(frame)
        if event == "call":
            caller_snap = snapshot(frame.f_back) if frame.f_back and frame.f_back.f_code.co_filename == FILENAME else None
            events.append({
                "kind": "call", "fid": fid,
                "name": frame.f_code.co_name,
                "first_line": frame.f_code.co_firstlineno - 1,
                "snap": snapshot(frame), "out": list(recorder.lines),
                "caller_fid": fid_of(frame.f_back) if frame.f_back else None,
                "caller_snap": caller_snap,
            })
        elif event == "line":
            events.append({
                "kind": "line", "fid": fid, "line": frame.f_lineno - 1,
                "snap": snapshot(frame), "out": list(recorder.lines),
            })
        elif event == "return":
            caller_snap = snapshot(frame.f_back) if frame.f_back and frame.f_back.f_code.co_filename == FILENAME else None
            events.append({
                "kind": "return", "fid": fid, "line": frame.f_lineno - 1,
                "arg": encode(arg), "snap": snapshot(frame),
                "out": list(recorder.lines), "caller_snap": caller_snap,
            })
        return tracer

    old_stdout = sys.stdout
    sys.stdout = recorder
    try:
        sys.settrace(tracer)
        try:
            exec(compile(code, FILENAME, "exec"), namespace)
        finally:
            sys.settrace(None)
    finally:
        sys.stdout = old_stdout
    return events, recorder.lines, namespace


# ---------------------------------------------------------------- AST maps

class Scope:
    def __init__(self, code_text, body_owner):
        self.statements = {}   # start line -> ast.stmt
        self.functions = {}    # (name, def_line) -> ast.FunctionDef
        for node in ast.walk(body_owner):
            if isinstance(node, ast.stmt):
                self.statements.setdefault(node.lineno - 1, node)
            if isinstance(node, ast.FunctionDef):
                self.functions[(node.name, node.lineno - 1)] = node


def branch_info(code_lines, if_node):
    """[(header_line, test_node or None for else, body_first, body_last, is_else)]"""
    branches = []
    node = if_node
    while True:
        body = node.body
        branches.append((node.lineno - 1, node.test,
                         body[0].lineno - 1, body[-1].end_lineno - 1, False))
        orelse = node.orelse
        if len(orelse) == 1 and isinstance(orelse[0], ast.If):
            node = orelse[0]
            continue
        if orelse:
            indent = len(code_lines[node.lineno - 1]) - len(code_lines[node.lineno - 1].lstrip())
            else_line = None
            for ln in range(node.body[-1].end_lineno, orelse[0].lineno - 1):
                text = code_lines[ln]
                if text.strip() == "else:" and (len(text) - len(text.lstrip())) == indent:
                    else_line = ln
                    break
            branches.append((else_line, None,
                             orelse[0].lineno - 1, orelse[-1].end_lineno - 1, True))
        return branches


# ---------------------------------------------------------------- walking

class FrameWalk:
    def __init__(self, name, scope):
        self.name = name
        self.scope = scope
        self.pending = None    # (node, line, start_snap)
        self.deferred = None   # (kind, node, header_line, branch)
        self.last_snap = {}


class TraceBuilder:
    def __init__(self, question, functions_registry):
        self.question = question
        self.code = question["code"]
        self.lines = self.code.split("\n")
        tree = ast.parse(self.code)
        self.module_scope = Scope(self.code, tree)
        self.scopes = {("<module>", -1): self.module_scope}
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                self.scopes[(node.name, node.lineno - 1)] = Scope(self.code, node)
        self.registry = functions_registry
        self.for_nodes = [n for n in ast.walk(tree) if isinstance(n, ast.For)]
        self.steps = [{
            "line": -1, "variables": {}, "output": [],
            "explanation": "Ready! Press Next Step to run the example. No variables exist yet.",
        }]
        self.frames = {}

    def emit(self, line, snap, out, explanation):
        self.steps.append({
            "line": line,
            "variables": {k: v for k, v in snap.items()},
            "output": list(out),
            "explanation": explanation,
        })

    def segment(self, node):
        return ast.get_source_segment(self.code, node) or ""

    def eval_on(self, expr_node, start_snap):
        namespace = {k: decode(v) for k, v in start_snap.items()}
        namespace.update(self.registry)
        wrapped = ast.fix_missing_locations(ast.Expression(expr_node))
        return eval(compile(wrapped, "<eval>", "eval"), {}, namespace)

    # -- statement completion -------------------------------------------
    def flush(self, frame, end_snap, out):
        if frame.pending is None:
            return
        node, line, start_snap = frame.pending
        frame.pending = None
        if isinstance(node, (ast.For, ast.While, ast.If)):
            return  # compound statements resolve through their own steps
        expl = self.statement_explanation(frame, node, start_snap, end_snap)
        self.emit(line, end_snap, out, expl)
        if isinstance(node, ast.Break):
            # Section 7.8: leaving a for loop emits its finished step.
            loops = [f for f in self.for_nodes
                     if f.body[0].lineno - 1 <= line <= f.body[-1].end_lineno - 1]
            if loops:
                innermost = min(loops, key=lambda f: f.end_lineno - f.lineno)
                self.emit(innermost.lineno - 1, end_snap, out,
                          "The for loop has finished or exited. Continue after the loop.")

    def statement_explanation(self, frame, node, start_snap, end_snap):
        if isinstance(node, ast.FunctionDef):
            return f"Define {node.name}(). Its body does not run until the function is called."
        if isinstance(node, ast.Assign):
            target = node.targets[0]
            if isinstance(target, ast.Name):
                return f"Evaluate {self.segment(node.value)} and set {target.id} to {py_repr(end_snap.get(target.id))}."
            value = self.eval_on(node.value, start_snap)
            return f"Evaluate {self.segment(node.value)} and set {self.segment(target)} to {py_repr(encode(value))}."
        if isinstance(node, ast.AugAssign):
            target = node.target
            if isinstance(target, ast.Name):
                return f"Evaluate {self.segment(node.value)} and update {target.id} to {py_repr(end_snap.get(target.id))}."
            base = target
            while isinstance(base, (ast.Subscript, ast.Attribute)):
                base = base.value
            key = self.eval_on(target.slice, start_snap)
            new_value = decode(end_snap[base.id])[key]
            return f"Evaluate {self.segment(node.value)} and update {self.segment(target)} to {py_repr(encode(new_value))}."
        if isinstance(node, ast.Delete):
            target = node.targets[0]
            base = target
            while isinstance(base, (ast.Subscript, ast.Attribute)):
                base = base.value
            return f"Delete {self.segment(target)}: {base.id} is now {py_repr(end_snap.get(base.id))}."
        if isinstance(node, ast.Break):
            return "break exits this loop immediately."
        if isinstance(node, ast.Continue):
            return "continue skips the remaining statements in this round."
        if isinstance(node, ast.Expr):
            call = node.value
            if isinstance(call, ast.Call) and isinstance(call.func, ast.Name) and call.func.id == "print":
                parts = []
                for arg in call.args:
                    value = self.eval_on(arg, start_snap)
                    parts.append(py_repr(encode(value)))
                return "Print " + (", ".join(parts) if parts else "a blank line") + "."
            if isinstance(call, ast.Call) and isinstance(call.func, ast.Name) and call.func.id in self.registry:
                return "Finish this function call and continue."
            if isinstance(call, ast.Call) and isinstance(call.func, ast.Attribute):
                base = call.func.value
                while isinstance(base, (ast.Subscript, ast.Attribute)):
                    base = base.value
                if isinstance(base, ast.Name):
                    before = start_snap.get(base.id)
                    after = end_snap.get(base.id)
                    verb = "becomes" if before != after else "stays"
                    return f"Call {self.segment(call)}: {base.id} {verb} {py_repr(after)}."
            return f"Evaluate {self.segment(node.value)}."
        return f"Run {self.segment(node)}."

    # -- deferred construct checks ---------------------------------------
    def resolve_deferred(self, frame, next_line, snap, out):
        if frame.deferred is None:
            return
        kind, node, header_line, branch = frame.deferred
        frame.deferred = None
        if kind == "for":
            first, last = node.body[0].lineno - 1, node.body[-1].end_lineno - 1
            if next_line is not None and first <= next_line <= last:
                targets = node.target.elts if isinstance(node.target, ast.Tuple) else [node.target]
                parts = []
                for target in targets:
                    if isinstance(target, ast.Name) and target.id in snap:
                        parts.append(f"{target.id} = {display(snap[target.id])}")
                label = ", ".join(parts) if parts else "the next value"
                self.emit(header_line, snap, out,
                          f"for loop: {label}. Enter the loop body.")
            else:
                self.emit(header_line, snap, out,
                          "The for loop has finished or exited. Continue after the loop.")
        elif kind == "while":
            first, last = node.body[0].lineno - 1, node.body[-1].end_lineno - 1
            inside = next_line is not None and first <= next_line <= last
            cond = self.segment(node.test)
            self.emit(header_line, snap, out,
                      f"Check while {cond}: {'True' if inside else 'False'}. "
                      f"{'Run the body.' if inside else 'Exit the loop.'}")
        elif kind == "if":
            header, test, first, last, is_else = branch
            inside = next_line is not None and first <= next_line <= last
            if is_else:
                if inside:
                    self.emit(header, snap, out, "Take the else branch.")
                return
            cond = self.segment(test)
            self.emit(header, snap, out,
                      f"Check {cond}: {'True' if inside else 'False'}. "
                      f"{'Enter this branch.' if inside else 'Skip this branch.'}")
            if not inside:
                # Maybe the else branch runs next: emit its marker now.
                for other in branch_info(self.lines, node):
                    if other[4]:
                        _, _, efirst, elast, _ = other
                        if next_line is not None and efirst <= next_line <= elast:
                            self.emit(other[0], snap, out, "Take the else branch.")
                        break

    # -- event processing --------------------------------------------------
    def process(self, events):
        for ev in events:
            if ev["kind"] == "call":
                self.on_call(ev)
            elif ev["kind"] == "line":
                self.on_line(ev)
            elif ev["kind"] == "return":
                self.on_return(ev)
        return {"steps": self.steps}

    def on_call(self, ev):
        if ev["name"] == "<module>":
            self.frames[ev["fid"]] = FrameWalk("<module>", self.module_scope)
            self.frames[ev["fid"]].last_snap = ev["snap"]
            return
        caller = self.frames[ev["caller_fid"]]
        scope = self.scopes.get((ev["name"], ev["first_line"]), self.module_scope)
        frame = FrameWalk(ev["name"], scope)
        self.frames[ev["fid"]] = frame
        frame.last_snap = ev["snap"]
        def_node = scope.statements.get(ev["first_line"])
        params = [a.arg for a in def_node.args.args] if def_node else []
        arg_text = ", ".join(display(ev["snap"][p]) for p in params if p in ev["snap"])
        call_line = caller.pending[1] if caller.pending else ev["line"] if "line" in ev else -1
        snap = ev["caller_snap"] if ev["caller_snap"] is not None else caller.last_snap
        self.emit(call_line, snap, ev["out"],
                  f"Call {ev['name']}({arg_text}) from this line.")
        bind = ", ".join(f"{p} = {py_repr(ev['snap'][p])}" for p in params if p in ev["snap"])
        self.emit(ev["first_line"], ev["snap"], ev["out"],
                  f"Enter {ev['name']}(): bind {bind if bind else 'no parameters'}. "
                  "Parameters are ready; the function body runs next.")

    def on_line(self, ev):
        frame = self.frames[ev["fid"]]
        line, snap, out = ev["line"], ev["snap"], ev["out"]
        self.resolve_deferred(frame, line, snap, out)
        if frame.pending is not None and frame.pending[1] != line:
            self.flush(frame, snap, out)
        stmt = frame.scope.statements.get(line)
        if stmt is None:
            frame.last_snap = snap
            return
        if isinstance(stmt, ast.For):
            frame.pending = (stmt, line, snap)
            frame.deferred = ("for", stmt, line, None)
        elif isinstance(stmt, ast.While):
            frame.pending = (stmt, line, snap)
            frame.deferred = ("while", stmt, line, None)
        elif isinstance(stmt, ast.If):
            frame.pending = (stmt, line, snap)
            branch = next((b for b in branch_info(self.lines, stmt) if b[0] == line), None)
            frame.deferred = ("if", stmt, line, branch)
        else:
            frame.pending = (stmt, line, snap)
        frame.last_snap = snap

    def on_return(self, ev):
        frame = self.frames[ev["fid"]]
        snap, out = ev["snap"], ev["out"]
        self.resolve_deferred(frame, None, snap, out)
        if frame.pending is not None:
            node, line, _ = frame.pending
            if isinstance(node, ast.Return):
                frame.pending = None
                self.emit(line, snap, out,
                          f"Return {py_repr(ev['arg'])} to the calling line.")
            else:
                self.flush(frame, snap, out)
        if frame.name == "<module>":
            return
        # The caller is the most recently opened frame that is still open.
        caller = None
        for fid, walk in reversed(list(self.frames.items())):
            if walk is not frame:
                caller = walk
                break
        del self.frames[ev["fid"]]
        if caller is not None and caller.pending is not None:
            call_line = caller.pending[1]
            snap_out = ev["caller_snap"] if ev["caller_snap"] is not None else caller.last_snap
            self.emit(call_line, snap_out, out,
                      f"Return from {frame.name}() to this calling line with value "
                      f"{py_repr(ev['arg'])}. Continue evaluating this statement.")


def build_base_trace(question, registry):
    events, stdout_lines, _ = capture(question["code"])
    builder = TraceBuilder(question, registry)
    trace = builder.process(events)
    final = trace["steps"][-1]["output"]
    if final != stdout_lines:
        raise AssertionError(
            f"{question['id']}: generated output {final} != real stdout {stdout_lines}")
    return trace


def enrich_all(base):
    """Apply the shared JS enrichment to {qid: {question, trace}}."""
    payload = json.dumps(base)
    driver = (
        "const fs=require('fs');"
        "const src=fs.readFileSync(process.argv[1],'utf8');"
        "const enrichTrace=new Function(src+';return enrichTrace;')();"
        "const data=JSON.parse(fs.readFileSync(0,'utf8'));"
        "for(const item of Object.values(data)){item.trace=enrichTrace(item.question,item.trace);}"
        "process.stdout.write(JSON.stringify(data));"
    )
    result = subprocess.run(
        ["node", "-e", driver, str(ROOT / "scripts" / "enrich-walkthroughs.js")],
        input=payload, capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        raise RuntimeError("enrichment failed: " + result.stderr[:500])
    return json.loads(result.stdout)


def main():
    payload = json.loads((ROOT / "data" / "questions.json").read_text(encoding="utf-8"))
    questions = [q for q in payload["questions"] if q["week"] in WEEKS]
    # Registry of the snippet's own functions (used to evaluate expressions
    # against statement-time snapshots when narrating assignments/prints).
    base = {}
    for question in questions:
        namespace = {}
        with contextlib.redirect_stdout(io.StringIO()):
            exec(compile(question["code"], FILENAME, "exec"), namespace)
        registry = {k: v for k, v in namespace.items()
                    if isinstance(v, types.FunctionType)}
        base[question["id"]] = {
            "question": question,
            "trace": build_base_trace(question, registry),
        }
        print(f"{question['id']}: {len(base[question['id']]['trace']['steps'])} base steps")
    enriched = enrich_all(base)
    by_week = {}
    for question in questions:
        by_week.setdefault(question["week"], {})[question["id"]] = enriched[question["id"]]["trace"]
    descriptions = {
        6: "Guided traces for Week 6 (Lists) including curriculum-calibrated Hard and Extra Rock levels; all snapshots are precomputed. Explicit arithmetic evaluation and print-call narration for every applicable walkthrough.",
        7: "Guided traces for Week 7 (Strings) including curriculum-calibrated Hard and Extra Rock levels; all snapshots are precomputed. Explicit arithmetic evaluation and print-call narration for every applicable walkthrough.",
        8: "Guided traces for Week 8 (Sets) including curriculum-calibrated Hard and Extra Rock levels; all snapshots are precomputed. Explicit arithmetic evaluation and print-call narration for every applicable walkthrough.",
        9: "Guided traces for Week 9 (Dictionaries) including curriculum-calibrated Hard and Extra Rock levels; all snapshots are precomputed. Explicit arithmetic evaluation and print-call narration for every applicable walkthrough.",
    }
    for week, traces in sorted(by_week.items()):
        doc = {"version": "2.0.0", "description": descriptions[week], "traces": traces}
        path = ROOT / "data" / f"traces-week{week}.json"
        path.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"wrote {path.name}: {len(traces)} traces")


if __name__ == "__main__":
    sys.exit(main())
