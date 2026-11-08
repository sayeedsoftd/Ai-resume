import React, { useState, useEffect, useRef } from 'react';
import {
  Code2,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Terminal,
  Clock,
  Sparkles,
  FileCode,
  Copy,
  Check,
  AlertTriangle,
  Info,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { jobService } from '../../services/jobService';

export default function CodeSandboxEditor({
  problem,
  code,
  onChange,
  language = 'python',
  onLanguageChange,
  readOnly = false,
  onRunComplete,
}) {
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('tests'); // 'tests' | 'terminal'
  const [executionResult, setExecutionResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const textareaRef = useRef(null);

  const defaultStarter = {
    python: `def solution(nums, target):
    # Write your algorithmic solution here
    # Target: Return indices of the two numbers that sum up to target
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            return [seen[diff], i]
        seen[num] = i
    return []
`,
    javascript: `function solution(nums, target) {
    // Write your algorithmic solution here
    // Target: Return indices of the two numbers that sum up to target
    const seen = new Map();
    for (let i = 0; i < nums.length; i++) {
        const diff = target - nums[i];
        if (seen.has(diff)) {
            return [seen.get(diff), i];
        }
        seen.set(nums[i], i);
    }
    return [];
}
`,
  };

  const currentStarter =
    problem?.starter_code?.[language] ||
    (language === 'javascript' ? defaultStarter.javascript : defaultStarter.python);

  // Initialize boilerplate if code is empty
  useEffect(() => {
    if (!code && !readOnly) {
      onChange(currentStarter);
    }
  }, [language]);

  const handleReset = () => {
    if (readOnly) return;
    if (window.confirm('Reset editor to default function boilerplate? Your current changes will be overwritten.')) {
      onChange(currentStarter);
      setExecutionResult(null);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Keyboard handler for Tab and Enter indentation inside textarea
  const handleKeyDown = (e) => {
    if (readOnly) return;
    const textarea = textareaRef.current;
    if (!textarea) return;

    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;

      // Insert 4 spaces
      const updated = val.substring(0, start) + '    ' + val.substring(end);
      onChange(updated);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4;
      }, 0);
    } else if (e.key === 'Enter') {
      const start = textarea.selectionStart;
      const val = textarea.value;
      const currentLine = val.substring(0, start).split('\n').pop();
      const match = currentLine.match(/^\s+/);
      const indent = match ? match[0] : '';

      // If line ends with ':' (Python) or '{' (JS), add 4 extra spaces
      const extraIndent = currentLine.trim().endsWith(':') || currentLine.trim().endsWith('{') ? '    ' : '';

      if (indent || extraIndent) {
        e.preventDefault();
        const insertion = '\n' + indent + extraIndent;
        const updated = val.substring(0, start) + insertion + val.substring(start);
        onChange(updated);

        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + insertion.length;
        }, 0);
      }
    }
  };

  const handleRunCode = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setActiveTab('tests');

    const testCases = problem?.example_test_cases || [
      { input: 'nums = [2, 7, 11, 15], target = 9', expected: [0, 1], args: [[2, 7, 11, 15], 9] },
      { input: 'nums = [3, 2, 4], target = 6', expected: [1, 2], args: [[3, 2, 4], 6] },
    ];

    try {
      const res = await jobService.runCodeSandbox({
        code: code || currentStarter,
        language: language,
        test_cases: testCases,
      });
      setExecutionResult(res);
      if (onRunComplete) {
        onRunComplete(res);
      }
    } catch (err) {
      console.error('Code execution failed:', err);
      setExecutionResult({
        success: false,
        error: err.response?.data?.detail || err.message || 'Execution failed.',
        stdout: '',
        passed_count: 0,
        total_count: testCases.length,
        execution_time_ms: 0,
        test_results: [],
      });
    } finally {
      setIsRunning(false);
    }
  };

  const lineCount = (code || '').split('\n').length;
  const lineNumbers = Array.from({ length: Math.max(lineCount, 12) }, (_, i) => i + 1);

  return (
    <div
      className={`flex flex-col bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl transition-all ${
        expanded ? 'fixed inset-4 z-50 rounded-2xl' : 'w-full'
      }`}
    >
      {/* Editor & Control Header */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800 gap-3">
        {/* Left: Language & Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 font-bold text-xs">
            <Code2 className="w-4 h-4 text-indigo-400" />
            <span>AI Live Coding Sandbox</span>
          </div>

          {!readOnly && onLanguageChange && (
            <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => onLanguageChange('python')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  language === 'python'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Python 3.13
              </button>
              <button
                type="button"
                onClick={() => onLanguageChange('javascript')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  language === 'javascript'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                JavaScript (Node)
              </button>
            </div>
          )}

          {readOnly && (
            <Badge variant="indigo" size="sm" className="font-mono">
              {language.toUpperCase()}
            </Badge>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold transition-all"
            title="Copy Code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {!readOnly && (
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-300 border border-slate-800 text-xs font-semibold transition-all"
              title="Reset Boilerplate"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-xs transition-all"
            title={expanded ? 'Exit Fullscreen' : 'Expand Fullscreen'}
          >
            {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-[550px] divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
        {/* Left Column: Problem Statement & Specs (4 Cols) */}
        <div className="lg:col-span-5 p-5 bg-slate-900/60 overflow-y-auto max-h-[650px] space-y-5 text-slate-300 text-sm">
          {/* Problem Header */}
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Challenge Specification</span>
            </div>
            <h3 className="text-lg font-bold text-white">
              {problem?.title || 'Optimal Subarray Target Sum & Deduplication'}
            </h3>
          </div>

          {/* Problem Description */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 leading-relaxed text-slate-300 whitespace-pre-line text-xs font-sans">
            {problem?.description ||
              'Write an optimized function solution(nums, target) that returns the pair of indices.'}
          </div>

          {/* I/O Format */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Input & Output Format</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-[11px] text-slate-500 font-bold block mb-1">Input Format:</span>
                <span className="font-mono text-indigo-300">{problem?.input_format || 'nums: List[int], target: int'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-[11px] text-slate-500 font-bold block mb-1">Output Format:</span>
                <span className="font-mono text-emerald-300">{problem?.output_format || 'List[int] (indices)'}</span>
              </div>
            </div>
          </div>

          {/* Example Test Cases */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Example Test Cases</span>
            {(problem?.example_test_cases || [
              {
                input: 'nums = [2, 7, 11, 15], target = 9',
                output: '[0, 1]',
                explanation: 'nums[0] + nums[1] == 2 + 7 == 9, return [0, 1].',
              },
              {
                input: 'nums = [3, 2, 4], target = 6',
                output: '[1, 2]',
                explanation: 'nums[1] + nums[2] == 2 + 4 == 6, return [1, 2].',
              },
            ]).map((tc, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400">Example {idx + 1}:</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                    Public Case
                  </span>
                </div>
                <div className="text-xs font-mono space-y-1">
                  <div className="flex gap-2">
                    <span className="text-slate-500 min-w-[55px]">Input:</span>
                    <span className="text-indigo-200">{tc.input}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-slate-500 min-w-[55px]">Output:</span>
                    <span className="text-emerald-400 font-bold">{tc.output || JSON.stringify(tc.expected)}</span>
                  </div>
                </div>
                {tc.explanation && (
                  <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-900">
                    💡 {tc.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Execution Specs */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-indigo-950/20 border border-indigo-900/40 text-[11px] text-indigo-300">
            <Info className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Submissions are tested against both public cases and hidden corner cases with strict 3.0s execution timeout.</span>
          </div>
        </div>

        {/* Right Column: Code Editor & Console (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col bg-slate-950">
          {/* File Tab */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-slate-300 font-mono">
              <FileCode className="w-3.5 h-3.5 text-indigo-400" />
              <span>{language === 'javascript' ? 'solution.js' : 'solution.py'}</span>
            </div>
            <span className="text-slate-500 text-[11px] font-mono">
              {lineCount} lines | {language.toUpperCase()}
            </span>
          </div>

          {/* Editor Container with Line Numbers */}
          <div className="flex-1 relative flex min-h-[300px] max-h-[360px] bg-[#0d1117] overflow-auto">
            {/* Line numbers column */}
            <div className="select-none py-3 px-3 text-right text-slate-600 bg-slate-950/40 font-mono text-xs border-r border-slate-800/80 min-w-[45px]">
              {lineNumbers.map((num) => (
                <div key={num} className="leading-6">
                  {num}
                </div>
              ))}
            </div>

            {/* Code Input Area */}
            <textarea
              ref={textareaRef}
              value={code || ''}
              readOnly={readOnly}
              onChange={(e) => !readOnly && onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck="false"
              placeholder={`# Write your ${language} solution here...`}
              className={`w-full h-full p-3 font-mono text-xs leading-6 bg-transparent text-slate-100 placeholder-slate-600 focus:outline-hidden resize-none selection:bg-indigo-600/40 selection:text-white ${
                readOnly ? 'cursor-default' : ''
              }`}
            />
          </div>

          {/* Bottom Terminal & Test Results Panel */}
          <div className="border-t border-slate-800 bg-slate-950 flex flex-col">
            {/* Terminal Header & Controls */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('tests')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'tests'
                      ? 'bg-slate-800 text-white border border-slate-700'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Test Cases</span>
                  {executionResult && (
                    <span
                      className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        executionResult.success
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {executionResult.passed_count}/{executionResult.total_count}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('terminal')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'terminal'
                      ? 'bg-slate-800 text-white border border-slate-700'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5 text-slate-400" />
                  <span>Stdout Console</span>
                </button>
              </div>

              {!readOnly && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleRunCode}
                  disabled={isRunning}
                  className="flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
                >
                  {isRunning ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Running in Sandbox...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Run Code / Test Cases</span>
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Terminal Body */}
            <div className="p-4 min-h-[170px] max-h-[220px] overflow-y-auto text-xs font-mono">
              {isRunning ? (
                <div className="flex flex-col items-center justify-center py-6 text-slate-400 space-y-2">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs">Executing solution in isolated {language} sandbox...</span>
                </div>
              ) : activeTab === 'tests' ? (
                executionResult ? (
                  <div className="space-y-3">
                    {/* Overall Summary Bar */}
                    <div
                      className={`flex items-center justify-between p-2.5 rounded-xl border ${
                        executionResult.success
                          ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                          : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {executionResult.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-400" />
                        )}
                        <span className="font-bold">
                          {executionResult.success
                            ? `✔ Passed ${executionResult.passed_count}/${executionResult.total_count} Example Tests`
                            : `❌ Failed: ${executionResult.error || 'Test assertions did not match'}`}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {executionResult.execution_time_ms} ms
                      </span>
                    </div>

                    {/* Individual Test Cards */}
                    {executionResult.test_results && executionResult.test_results.length > 0 ? (
                      <div className="space-y-2">
                        {executionResult.test_results.map((tr) => (
                          <div
                            key={tr.case_index}
                            className={`p-2.5 rounded-xl border text-[11px] ${
                              tr.passed
                                ? 'bg-slate-900 border-slate-800'
                                : 'bg-rose-950/20 border-rose-900/40'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-slate-300">Case {tr.case_index}</span>
                              <span
                                className={`px-2 py-0.5 rounded-full font-bold ${
                                  tr.passed
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-rose-500/20 text-rose-400'
                                }`}
                              >
                                {tr.passed ? 'PASSED' : 'FAILED'}
                              </span>
                            </div>
                            <div className="space-y-0.5 text-slate-400">
                              <div>Input: <span className="text-slate-200">{tr.input}</span></div>
                              <div>Expected: <span className="text-emerald-400">{tr.expected}</span></div>
                              <div>Actual: <span className={tr.passed ? 'text-emerald-400' : 'text-rose-400'}>{tr.actual}</span></div>
                              {tr.error && (
                                <div className="text-rose-400 pt-1 border-t border-rose-900/30">
                                  Error: {tr.error}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-slate-500 text-center space-y-1">
                    <Terminal className="w-6 h-6 text-slate-600 mb-1" />
                    <p>Click <strong className="text-slate-300">"Run Code / Test Cases"</strong> to verify your solution.</p>
                    <p className="text-[11px] text-slate-600">Console stdout and assertion traces will appear here.</p>
                  </div>
                )
              ) : (
                /* Raw Stdout Terminal */
                <div className="space-y-2">
                  <div className="text-[11px] text-slate-500 uppercase tracking-wide">Standard Output:</div>
                  <pre className="p-3 rounded-xl bg-black border border-slate-900 text-slate-300 font-mono text-[11px] whitespace-pre-wrap leading-relaxed min-h-[90px]">
                    {executionResult?.stdout
                      ? executionResult.stdout
                      : '(No output printed to stdout. Use print(...) or console.log(...) in your solution to debug).'}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
