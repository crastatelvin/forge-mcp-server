# ============================================
# Project: FORGE - Universal MCP Tool Server
# Author: Telvin Crasta
# GitHub: github.com/crastatelvin
# License: CC BY-NC 4.0
# Original design and architecture by Telvin Crasta
# ============================================

import ast
import contextlib
import io
import math
import operator
import traceback

SAFE_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Pow: operator.pow,
    ast.Mod: operator.mod,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}

SAFE_MATH_NAMES = {"pi": math.pi, "e": math.e, "tau": math.tau, "inf": math.inf, "nan": math.nan}


def calculate(expression: str) -> dict:
    try:
        if not expression or not isinstance(expression, str):
            return {"error": "expression is required"}
        if len(expression) > 500:
            return {"error": "expression too long (max 500 chars)"}

        def safe_eval(node):
            # Python 3.8+: numeric literals are ast.Constant
            if isinstance(node, ast.Constant):
                if isinstance(node.value, int | float):
                    return node.value
                raise ValueError(f"Constant type not allowed: {type(node.value).__name__}")
            if isinstance(node, ast.BinOp):
                op = SAFE_OPERATORS.get(type(node.op))
                if op is None:
                    raise ValueError(f"Operator not allowed: {type(node.op).__name__}")
                return op(safe_eval(node.left), safe_eval(node.right))
            if isinstance(node, ast.UnaryOp):
                op = SAFE_OPERATORS.get(type(node.op))
                if op is None:
                    raise ValueError(f"Operator not allowed: {type(node.op).__name__}")
                return op(safe_eval(node.operand))
            if isinstance(node, ast.Name):
                if node.id in SAFE_MATH_NAMES:
                    return SAFE_MATH_NAMES[node.id]
                raise ValueError(f"Name not allowed: {node.id}")
            if isinstance(node, ast.Call):
                # Allow math.<fn>(...) calls only
                if (
                    isinstance(node.func, ast.Attribute)
                    and isinstance(node.func.value, ast.Name)
                    and node.func.value.id == "math"
                ):
                    fn = getattr(math, node.func.attr, None)
                    if not callable(fn):
                        raise ValueError(f"math.{node.func.attr} is not callable")
                    args = [safe_eval(a) for a in node.args]
                    return fn(*args)
                raise ValueError("Only math.<fn>(...) calls allowed")
            raise ValueError(f"Expression node not allowed: {type(node).__name__}")

        tree = ast.parse(expression, mode="eval")
        result = safe_eval(tree.body)
        return {"expression": expression, "result": result}
    except Exception as e:
        return {"error": str(e), "expression": expression}


SAFE_BUILTINS = {
    "print": print,
    "len": len,
    "range": range,
    "enumerate": enumerate,
    "zip": zip,
    "map": map,
    "filter": filter,
    "sorted": sorted,
    "sum": sum,
    "min": min,
    "max": max,
    "abs": abs,
    "round": round,
    "int": int,
    "float": float,
    "str": str,
    "bool": bool,
    "list": list,
    "dict": dict,
    "set": set,
    "tuple": tuple,
    "isinstance": isinstance,
    "type": type,
    "any": any,
    "all": all,
    "reversed": reversed,
    "repr": repr,
}

BLOCKED_TOKENS = (
    "os",
    "sys",
    "subprocess",
    "shutil",
    "socket",
    "requests",
    "urllib",
    "httpx",
    "importlib",
    "__import__",
    "open",
    "eval",
    "exec",
    "compile",
    "input",
    "globals",
    "locals",
    "vars",
    "getattr",
    "setattr",
    "delattr",
    "__builtins__",
    "pathlib",
)


def run_code(code: str, timeout: int = 10) -> dict:
    if not code or not isinstance(code, str):
        return {"error": "code is required"}
    if len(code) > 20_000:
        return {"error": "code too long (max 20000 chars)"}

    stdout_capture = io.StringIO()
    stderr_capture = io.StringIO()

    lowered = code
    for token in BLOCKED_TOKENS:
        if token in lowered:
            return {
                "error": f"Disallowed token detected: '{token}'. This sandbox blocks I/O, network, and reflection.",
                "code": code[:200],
            }

    try:
        with contextlib.redirect_stdout(stdout_capture), contextlib.redirect_stderr(stderr_capture):
            exec(code, {"__builtins__": SAFE_BUILTINS}, {})
        return {
            "success": True,
            "stdout": stdout_capture.getvalue(),
            "stderr": stderr_capture.getvalue(),
            "code_length": len(code),
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()[-500:],
            "stdout": stdout_capture.getvalue(),
            "stderr": stderr_capture.getvalue(),
        }
