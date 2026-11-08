import sys
import os
import json
import time
import subprocess
import tempfile
import ast
from typing import Dict, Any, List, Optional
from app.utils.logger import logger


class CodeSandboxService:
    """
    Secure In-Process / Subprocess Execution Sandbox for Live Coding Challenges.
    Safely runs candidate Python and JavaScript code against public and hidden test cases,
    capturing stdout, execution time, and assertions.
    """

    DEFAULT_TIMEOUT_SECONDS = 3.0

    @classmethod
    def run_code(
        cls,
        code: str,
        language: str = "python",
        test_cases: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Executes code against provided test cases and returns execution metrics.
        """
        if not code or not code.strip():
            return {
                "success": False,
                "passed_count": 0,
                "total_count": len(test_cases or []),
                "execution_time_ms": 0.0,
                "stdout": "",
                "error": "No code provided to execute.",
                "test_results": [],
            }

        lang = (language or "python").strip().lower()
        if lang in ["python", "py", "python3"]:
            return cls._run_python(code, test_cases or [])
        elif lang in ["javascript", "js", "node"]:
            return cls._run_javascript(code, test_cases or [])
        else:
            return {
                "success": False,
                "passed_count": 0,
                "total_count": len(test_cases or []),
                "execution_time_ms": 0.0,
                "stdout": "",
                "error": f"Language '{language}' is not supported. Supported: python, javascript.",
                "test_results": [],
            }

    @classmethod
    def _run_python(cls, code: str, test_cases: List[Dict[str, Any]]) -> Dict[str, Any]:
        # Fast syntax validation with ast
        try:
            ast.parse(code)
        except SyntaxError as se:
            return {
                "success": False,
                "passed_count": 0,
                "total_count": len(test_cases),
                "execution_time_ms": 0.0,
                "stdout": "",
                "error": f"SyntaxError: {se.msg} (line {se.lineno})",
                "test_results": [
                    {
                        "case_index": idx + 1,
                        "input": tc.get("input", ""),
                        "expected": str(tc.get("expected", tc.get("output", ""))),
                        "actual": None,
                        "passed": False,
                        "error": f"SyntaxError: {se.msg} (line {se.lineno})",
                        "duration_ms": 0.0,
                    }
                    for idx, tc in enumerate(test_cases)
                ],
            }

        # Runner harness template
        runner_script = """import sys
import io
import json
import time
import traceback
import inspect

raw_code = {CODE_REPR}
test_cases = {TEST_CASES_JSON}

stdout_capture = io.StringIO()
sys.stdout = stdout_capture

namespace = {}
try:
    exec(raw_code, namespace, namespace)
except Exception as e:
    err_msg = traceback.format_exc()
    out = {
        "success": False,
        "error": f"Runtime initialization error: {err_msg}",
        "stdout": stdout_capture.getvalue(),
        "passed_count": 0,
        "total_count": len(test_cases),
        "execution_time_ms": 0.0,
        "test_results": []
    }
    sys.__stdout__.write(json.dumps(out))
    sys.exit(0)

# Resolve target function: 'solution' or first callable
fn = namespace.get('solution')
if not fn:
    for k, v in namespace.items():
        if callable(v) and not k.startswith('_'):
            fn = v
            break

if not fn or not callable(fn):
    out = {
        "success": False,
        "error": "No callable function found. Please define 'def solution(...):' in your code.",
        "stdout": stdout_capture.getvalue(),
        "passed_count": 0,
        "total_count": len(test_cases),
        "execution_time_ms": 0.0,
        "test_results": []
    }
    sys.__stdout__.write(json.dumps(out))
    sys.exit(0)

param_count = len(inspect.signature(fn).parameters)

results = []
passed_count = 0
total_dur = 0.0

for idx, tc in enumerate(test_cases, start=1):
    input_str = tc.get("input", "")
    expected = tc.get("expected", tc.get("output", ""))
    raw_args = tc.get("args")

    t_start = time.perf_counter()
    res = None
    err = None
    passed = False

    try:
        if raw_args is not None and isinstance(raw_args, list):
            if param_count > 1 and len(raw_args) >= param_count:
                res = fn(*raw_args[:param_count])
            elif param_count == 1:
                res = fn(raw_args[0] if len(raw_args) == 1 else raw_args)
            else:
                res = fn(*raw_args)
        elif "raw_input" in tc:
            raw_in = tc["raw_input"]
            if isinstance(raw_in, dict) and param_count > 1:
                res = fn(**raw_in)
            else:
                res = fn(raw_in)
        else:
            # Fallback pass input_str
            res = fn(input_str)

        # Normalize comparison
        def normalize_val(v):
            if isinstance(v, (dict, list)):
                return json.dumps(v, sort_keys=True)
            if isinstance(v, bool):
                return str(v).lower()
            return str(v).strip()

        norm_res = normalize_val(res)
        norm_exp = normalize_val(expected)
        passed = (norm_res == norm_exp)
        if passed:
            passed_count += 1
    except Exception as e:
        err = f"{type(e).__name__}: {str(e)}"
        passed = False

    t_dur = (time.perf_counter() - t_start) * 1000.0
    total_dur += t_dur

    results.append({
        "case_index": idx,
        "input": input_str,
        "expected": str(expected),
        "actual": str(res) if err is None else f"Error: {err}",
        "passed": passed,
        "error": err,
        "duration_ms": round(t_dur, 2)
    })

all_passed = (passed_count == len(test_cases)) if test_cases else True
final_output = {
    "success": all_passed,
    "passed_count": passed_count,
    "total_count": len(test_cases),
    "execution_time_ms": round(total_dur, 2),
    "stdout": stdout_capture.getvalue(),
    "error": None if all_passed else (results[0]["error"] if results and results[0]["error"] else f"AssertionError: expected {results[0]['expected']}, got {results[0]['actual']}" if results and not results[0]["passed"] else None),
    "test_results": results
}
sys.__stdout__.write(json.dumps(final_output))
"""
        script_code = runner_script.replace("{CODE_REPR}", repr(code)).replace(
            "{TEST_CASES_JSON}", json.dumps(test_cases)
        )

        with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False, encoding="utf-8") as tf:
            tf.write(script_code)
            temp_path = tf.name

        try:
            proc = subprocess.run(
                [sys.executable, "-I", temp_path],
                capture_output=True,
                text=True,
                timeout=cls.DEFAULT_TIMEOUT_SECONDS,
            )
            raw_stdout = proc.stdout.strip()
            if raw_stdout:
                try:
                    return json.loads(raw_stdout)
                except Exception:
                    pass

            # Stderr fallback
            if proc.returncode != 0:
                err_text = proc.stderr.strip() or "Process terminated with error."
                return {
                    "success": False,
                    "passed_count": 0,
                    "total_count": len(test_cases),
                    "execution_time_ms": 0.0,
                    "stdout": proc.stdout,
                    "error": err_text,
                    "test_results": [],
                }
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "passed_count": 0,
                "total_count": len(test_cases),
                "execution_time_ms": cls.DEFAULT_TIMEOUT_SECONDS * 1000.0,
                "stdout": "",
                "error": f"Execution Timed Out (exceeded {cls.DEFAULT_TIMEOUT_SECONDS}s limit). Check for infinite loops.",
                "test_results": [],
            }
        except Exception as e:
            logger.error(f"Sandbox execution error: {e}")
            return {
                "success": False,
                "passed_count": 0,
                "total_count": len(test_cases),
                "execution_time_ms": 0.0,
                "stdout": "",
                "error": str(e),
                "test_results": [],
            }
        finally:
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except Exception:
                    pass

        return {
            "success": False,
            "passed_count": 0,
            "total_count": len(test_cases),
            "execution_time_ms": 0.0,
            "stdout": "",
            "error": "Unknown execution failure.",
            "test_results": [],
        }

    @classmethod
    def _run_javascript(cls, code: str, test_cases: List[Dict[str, Any]]) -> Dict[str, Any]:
        node_runner = """
const testCases = {TEST_CASES_JSON};
let stdoutBuf = [];
const originalLog = console.log;
console.log = function(...args) {
    stdoutBuf.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
};

let userFn;
try {
    const wrappedCode = `
__USER_CODE_PLACEHOLDER__
; if (typeof solution === 'function') return solution;
`;
    userFn = new Function(wrappedCode)();
} catch (e) {
    const out = {
        success: false,
        error: `SyntaxError / Parse Error: ${e.message}`,
        stdout: stdoutBuf.join('\\n'),
        passed_count: 0,
        total_count: testCases.length,
        execution_time_ms: 0,
        test_results: []
    };
    process.stdout.write(JSON.stringify(out));
    process.exit(0);
}

if (!userFn || typeof userFn !== 'function') {
    const out = {
        success: false,
        error: "No function 'solution' found. Please define 'function solution(...) { ... }'.",
        stdout: stdoutBuf.join('\\n'),
        passed_count: 0,
        total_count: testCases.length,
        execution_time_ms: 0,
        test_results: []
    };
    process.stdout.write(JSON.stringify(out));
    process.exit(0);
}

const results = [];
let passedCount = 0;
let totalDur = 0;

for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const inputStr = tc.input || "";
    const expected = tc.expected !== undefined ? tc.expected : tc.output;
    const rawArgs = tc.args;

    const tStart = performance.now();
    let res = null;
    let err = null;
    let passed = false;

    try {
        if (Array.isArray(rawArgs)) {
            res = userFn(...rawArgs);
        } else if (tc.raw_input !== undefined) {
            res = userFn(tc.raw_input);
        } else {
            res = userFn(inputStr);
        }

        const normRes = typeof res === 'object' ? JSON.stringify(res) : String(res).trim();
        const normExp = typeof expected === 'object' ? JSON.stringify(expected) : String(expected).trim();
        passed = (normRes === normExp);
        if (passed) passedCount++;
    } catch (e) {
        err = `${e.name}: ${e.message}`;
        passed = false;
    }

    const tDur = performance.now() - tStart;
    totalDur += tDur;

    results.append ? null : results.push({
        case_index: i + 1,
        input: inputStr,
        expected: String(expected),
        actual: err ? `Error: ${err}` : (typeof res === 'object' ? JSON.stringify(res) : String(res)),
        passed: passed,
        error: err,
        duration_ms: Math.round(tDur * 100) / 100
    });
}

const allPassed = (passedCount === testCases.length);
const finalOutput = {
    success: allPassed,
    passed_count: passedCount,
    total_count: testCases.length,
    execution_time_ms: Math.round(totalDur * 100) / 100,
    stdout: stdoutBuf.join('\\n'),
    error: allPassed ? null : (results[0] && results[0].error ? results[0].error : (results[0] ? `AssertionError: expected ${results[0].expected}, got ${results[0].actual}` : null)),
    test_results: results
};
process.stdout.write(JSON.stringify(finalOutput));
"""
        script_code = node_runner.replace("__USER_CODE_PLACEHOLDER__", code).replace(
            "{TEST_CASES_JSON}", json.dumps(test_cases)
        )

        with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as tf:
            tf.write(script_code)
            temp_path = tf.name

        try:
            proc = subprocess.run(
                ["node", temp_path],
                capture_output=True,
                text=True,
                timeout=cls.DEFAULT_TIMEOUT_SECONDS,
            )
            raw_stdout = proc.stdout.strip()
            if raw_stdout:
                try:
                    return json.loads(raw_stdout)
                except Exception:
                    pass

            if proc.returncode != 0:
                return {
                    "success": False,
                    "passed_count": 0,
                    "total_count": len(test_cases),
                    "execution_time_ms": 0.0,
                    "stdout": proc.stdout,
                    "error": proc.stderr.strip() or "Node process failed.",
                    "test_results": [],
                }
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "passed_count": 0,
                "total_count": len(test_cases),
                "execution_time_ms": cls.DEFAULT_TIMEOUT_SECONDS * 1000.0,
                "stdout": "",
                "error": f"Execution Timed Out (exceeded {cls.DEFAULT_TIMEOUT_SECONDS}s limit).",
                "test_results": [],
            }
        except Exception as e:
            return {
                "success": False,
                "passed_count": 0,
                "total_count": len(test_cases),
                "execution_time_ms": 0.0,
                "stdout": "",
                "error": str(e),
                "test_results": [],
            }
        finally:
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except Exception:
                    pass

        return {
            "success": False,
            "passed_count": 0,
            "total_count": len(test_cases),
            "execution_time_ms": 0.0,
            "stdout": "",
            "error": "JavaScript execution failed.",
            "test_results": [],
        }
