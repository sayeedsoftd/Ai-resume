import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Award,
  ChevronLeft,
  ChevronRight,
  Send,
  HelpCircle,
  FileText,
  Edit3,
  Check,
  RotateCcw,
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { jobService } from '../../services/jobService';

export default function ScreeningTestModal({
  isOpen,
  onClose,
  jobId,
  jobTitle,
  companyName,
  resumeId,
  onSuccess,
}) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [assessment, setAssessment] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Candidate answers state
  const [mcqAnswers, setMcqAnswers] = useState({});
  const [writtenAnswers, setWrittenAnswers] = useState({});

  // Navigation & UI state
  const [activeSection, setActiveSection] = useState('mcq'); // 'mcq' | 'written'
  const [mcqPage, setMcqPage] = useState(0); // 0 to 4 (5 questions per page)
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Timer: 45 minutes default
  const [secondsRemaining, setSecondsRemaining] = useState(45 * 60);

  // Timer countdown
  useEffect(() => {
    if (!isOpen || !assessment || testResult) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, assessment, testResult]);

  // Load test questions
  useEffect(() => {
    if (isOpen && jobId) {
      loadAssessment();
    }
  }, [isOpen, jobId]);

  const loadAssessment = async () => {
    setLoading(true);
    setErrorMsg('');
    setTestResult(null);
    setMcqAnswers({});
    setWrittenAnswers({});
    try {
      const data = await jobService.getJobAssessment(jobId);
      setAssessment(data);
      if (data.time_limit_minutes) {
        setSecondsRemaining(data.time_limit_minutes * 60);
      }
    } catch (err) {
      console.error('Failed to load assessment:', err);
      setErrorMsg(
        err.response?.data?.detail ||
          'Unable to load screening assessment. Please ensure the job circular is active.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const mcqs = assessment?.mcq_questions || [];
  const writtens = assessment?.written_questions || [];
  const totalQuestions = mcqs.length + writtens.length;

  const answeredMcqCount = Object.keys(mcqAnswers).length;
  const answeredWrittenCount = Object.values(writtenAnswers).filter(
    (v) => (v || '').trim().length > 10
  ).length;
  const totalAnswered = answeredMcqCount + answeredWrittenCount;

  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (qid, optionLetter) => {
    setMcqAnswers((prev) => ({
      ...prev,
      [String(qid)]: optionLetter,
    }));
  };

  const handleWrittenChange = (qid, text) => {
    setWrittenAnswers((prev) => ({
      ...prev,
      [String(qid)]: text,
    }));
  };

  const executeSubmission = async () => {
    setShowWarningModal(false);
    setSubmitting(true);
    try {
      const payload = {
        resume_id: resumeId || undefined,
        mcq_answers: mcqAnswers,
        written_answers: writtenAnswers,
      };
      const res = await jobService.submitJobAssessment(jobId, payload);
      setTestResult(res);
      if (onSuccess) {
        onSuccess(res);
      }
    } catch (err) {
      console.error('Submission error:', err);
      alert(
        err.response?.data?.detail ||
          'Failed to submit screening test. Please check your network and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitAttempt = () => {
    if (totalAnswered < totalQuestions) {
      setShowWarningModal(true);
    } else {
      executeSubmission();
    }
  };

  // Pagination for MCQs (5 questions per page)
  const pageSize = 5;
  const totalPages = Math.ceil(mcqs.length / pageSize) || 1;
  const currentMcqs = mcqs.slice(mcqPage * pageSize, (mcqPage + 1) * pageSize);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-900">
        {/* Header */}
        <div className="p-5 sm:px-7 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                {companyName || 'Hiring Organization'}
              </span>
              <span className="text-slate-300">•</span>
              <Badge variant="primary" size="xs">
                Pre-Screening Exam
              </Badge>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate mt-0.5">
              {jobTitle || 'Technical Candidate Screening'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Timer Badge */}
            {!testResult && (
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold border transition-colors ${
                  secondsRemaining < 300
                    ? 'bg-rose-50 text-rose-600 border-rose-300 animate-pulse'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}
                title="Time remaining"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTimer(secondsRemaining)}</span>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              title="Close Exam"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="p-16 text-center space-y-4 my-auto">
            <div className="w-12 h-12 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Preparing Gemini AI Screening Test...
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Synthesizing 25 role-tailored MCQs and 5 practical written problems based on circular requirements.
              </p>
            </div>
          </div>
        ) : errorMsg ? (
          <div className="p-12 text-center space-y-4 my-auto">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <h3 className="text-base font-bold text-gray-900">Unable to Start Exam</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">{errorMsg}</p>
            <Button variant="secondary" size="sm" onClick={loadAssessment}>
              <RotateCcw className="w-4 h-4 mr-1.5" /> Retry Loading
            </Button>
          </div>
        ) : testResult ? (
          /* =========================================================
             TEST RESULT & CELEBRATION VIEW
             ========================================================= */
          <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
            <div className="text-center space-y-3 bg-gradient-to-br from-indigo-50/70 via-white to-violet-50/60 p-8 rounded-3xl border border-indigo-100">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/30">
                <Award className="w-8 h-8" />
              </div>

              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-600">
                  Assessment Completed & Evaluated
                </span>
                <h3 className="text-2xl font-black text-gray-900 mt-1">
                  Your Pre-Screening Score: {Math.round(testResult.total_test_score)}%
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  {testResult.summary_feedback ||
                    'Your answers and AI rubric evaluations have been compiled and submitted to the recruiter.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Application Recorded
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
                  <Sparkles className="w-3.5 h-3.5" /> Shortlist Priority: High
                </span>
              </div>
            </div>

            {/* Scorecard Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  MCQ Section (50% Weight)
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-black text-gray-900">
                    {testResult.mcq_score} / 50.0 pts
                  </span>
                  <span className="text-xs font-bold text-emerald-600">
                    {testResult.mcq_correct_count} of {testResult.total_mcqs} Correct
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(testResult.mcq_correct_count / (testResult.total_mcqs || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Written Problems (50% Weight)
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-black text-gray-900">
                    {testResult.written_score} / 50.0 pts
                  </span>
                  <span className="text-xs font-bold text-indigo-600">
                    AI Rubric Graded
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(testResult.written_score / 50.0) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Written Question-by-Question Feedback */}
            {testResult.written_evaluations && testResult.written_evaluations.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-900">
                  Written Feedback Breakdown
                </h4>
                <div className="space-y-2.5">
                  {testResult.written_evaluations.map((ev, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-white border border-slate-200 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-gray-900">
                          Problem #{ev.question_id || idx + 1}
                        </span>
                        <span className="text-indigo-600 font-extrabold">
                          {ev.marks_awarded} / {ev.max_marks || 10} pts
                        </span>
                      </div>
                      <p className="text-slate-700 leading-relaxed font-medium">
                        {ev.feedback}
                      </p>
                      {ev.strengths && (
                        <p className="text-emerald-800 text-[11px] font-medium">
                          <strong>Strengths:</strong> {ev.strengths}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 flex justify-end">
              <Button
                variant="primary"
                onClick={onClose}
                className="w-full sm:w-auto text-xs font-bold px-6 py-2.5"
              >
                Close & Return to Dashboard
              </Button>
            </div>
          </div>
        ) : (
          /* =========================================================
             ACTIVE EXAM INTERACTION VIEW
             ========================================================= */
          <>
            {/* Navigation Stepper & Progress Bar */}
            <div className="px-6 py-3 border-b border-slate-200 bg-white space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                {/* Section Toggle Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveSection('mcq')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${
                      activeSection === 'mcq'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    Part 1: MCQs ({answeredMcqCount}/25)
                  </button>

                  <button
                    onClick={() => setActiveSection('written')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${
                      activeSection === 'written'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Part 2: Written Problems ({answeredWrittenCount}/5)
                  </button>
                </div>

                <div className="flex items-center gap-2 text-slate-600 font-semibold self-end sm:self-auto">
                  <span>
                    Overall Progress: <strong className="text-gray-900 font-extrabold">{totalAnswered}</strong> / {totalQuestions}
                  </span>
                  <div className="w-24 bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${(totalAnswered / (totalQuestions || 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Exam Body Area */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 bg-slate-50/70">
              {activeSection === 'mcq' ? (
                /* ----------------- SECTION 1: MCQS ----------------- */
                <div className="space-y-6">
                  {/* Page Indicator & Quick Question Jump Pills */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-700">
                      Questions {mcqPage * pageSize + 1} -{' '}
                      {Math.min((mcqPage + 1) * pageSize, mcqs.length)} of {mcqs.length}
                    </span>

                    <div className="flex flex-wrap items-center gap-1">
                      {mcqs.map((q, idx) => {
                        const isAnswered = !!mcqAnswers[String(q.id)];
                        const isCurrentPage =
                          idx >= mcqPage * pageSize && idx < (mcqPage + 1) * pageSize;
                        return (
                          <button
                            key={q.id}
                            onClick={() => setMcqPage(Math.floor(idx / pageSize))}
                            className={`w-6 h-6 rounded-md text-[10px] font-black transition-all ${
                              isCurrentPage
                                ? 'ring-2 ring-indigo-600 font-extrabold'
                                : ''
                            } ${
                              isAnswered
                                ? 'bg-indigo-600 text-white shadow-2xs'
                                : 'bg-slate-200 hover:bg-slate-300 text-slate-800 border border-slate-300'
                            }`}
                            title={`Jump to Q${idx + 1}`}
                          >
                            {idx + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 5 Questions on current page */}
                  <div className="space-y-6">
                    {currentMcqs.map((q, index) => {
                      const absoluteIdx = mcqPage * pageSize + index + 1;
                      const selectedOption = mcqAnswers[String(q.id)];

                      return (
                        <div
                          key={q.id}
                          className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4"
                        >
                          <div className="flex items-start gap-3">
                            <span className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                              {absoluteIdx}
                            </span>
                            <h4 className="text-sm sm:text-base font-semibold text-gray-900 leading-relaxed">
                              {q.question}
                            </h4>
                          </div>

                          {/* 4 Options */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 pl-0 sm:pl-10">
                            {(q.options || []).map((opt, optIdx) => {
                              // Extract option letter "A", "B", "C", "D"
                              const letterMatch = opt.match(/^([A-D])\)/i);
                              const letter = letterMatch ? letterMatch[1].toUpperCase() : String.fromCharCode(65 + optIdx);
                              const isSelected = selectedOption === letter;

                              return (
                                <button
                                  key={optIdx}
                                  type="button"
                                  onClick={() => handleSelectOption(q.id, letter)}
                                  className={`p-3.5 rounded-xl border text-left text-xs transition-all flex items-start gap-3 cursor-pointer ${
                                    isSelected
                                      ? 'border-2 border-indigo-600 bg-indigo-50/90 text-indigo-950 font-semibold shadow-xs ring-1 ring-indigo-500'
                                      : 'border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium'
                                  }`}
                                >
                                  <span
                                    className={`w-5 h-5 rounded-full border text-[10px] font-black flex items-center justify-center shrink-0 transition-colors ${
                                      isSelected
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'border-slate-400 bg-white text-slate-800'
                                    }`}
                                  >
                                    {letter}
                                  </span>
                                  <span className={`leading-snug pt-0.5 ${isSelected ? 'text-indigo-950 font-bold' : 'text-gray-900 text-slate-800 font-medium'}`}>
                                    {opt}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* MCQ Pagination Controls */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setMcqPage((p) => Math.max(0, p - 1))}
                      disabled={mcqPage === 0}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" /> Previous 5
                    </Button>

                    <span className="text-xs font-semibold text-slate-600">
                      Page {mcqPage + 1} of {totalPages}
                    </span>

                    {mcqPage + 1 < totalPages ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setMcqPage((p) => p + 1)}
                      >
                        Next 5 <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setActiveSection('written')}
                      >
                        Proceed to Written Section <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                /* ----------------- SECTION 2: WRITTEN PROBLEMS ----------------- */
                <div className="space-y-6">
                  <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-start gap-3 text-xs text-indigo-950">
                    <HelpCircle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold text-gray-900 text-sm mb-0.5">Short Written Guidelines:</strong>
                      <p className="text-slate-800 font-medium leading-relaxed">
                        Write 2 to 4 concise paragraphs explaining your technical methodology, architectural trade-offs, and concrete industry practices. Gemini AI will evaluate each response against standard grading rubrics.
                      </p>
                    </div>
                  </div>

                  {writtens.map((wq, idx) => {
                    const textValue = writtenAnswers[String(wq.id)] || '';
                    const wordCount = textValue.trim() ? textValue.trim().split(/\s+/).length : 0;

                    return (
                      <div
                        key={wq.id}
                        className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">
                              #{idx + 1}
                            </span>
                            <h4 className="text-sm sm:text-base font-semibold text-gray-900 leading-relaxed">
                              {wq.question}
                            </h4>
                          </div>
                          <Badge variant="outline" size="xs" className="font-bold text-slate-800 border-slate-300 bg-slate-100 shrink-0">
                            Max {wq.max_marks || 10} pts
                          </Badge>
                        </div>

                        <textarea
                          rows={4}
                          value={textValue}
                          onChange={(e) => handleWrittenChange(wq.id, e.target.value)}
                          placeholder="Type your structured solution and explanation here..."
                          className="w-full p-3.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl text-gray-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 leading-relaxed"
                        />

                        <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                          <span>
                            {wordCount} words{' '}
                            {wordCount < 25 ? '(Recommend at least 25-30 words)' : '✓ Good depth'}
                          </span>
                          <span className={wordCount >= 25 ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                            {wordCount >= 25 ? 'Ready' : 'Incomplete'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 sm:px-7 border-t border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-slate-700 font-medium">
                Total Answered: <strong className="text-gray-900 font-extrabold">{totalAnswered}</strong> of {totalQuestions} Questions
              </span>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
                  Cancel
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSubmitAttempt}
                  disabled={submitting}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 font-bold"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      AI Automated Grading in Progress...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Submit Application & Assessment
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Unanswered Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-slate-200 shadow-xl space-y-4">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-gray-900">
                Unanswered Questions Detected
              </h4>
              <p className="text-xs text-slate-600 mt-1">
                You have answered {totalAnswered} of {totalQuestions} questions. Are you sure you
                want to finalize your submission? Unanswered questions will receive 0 marks.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowWarningModal(false)}
              >
                Continue Test
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={executeSubmission}
                className="bg-amber-600 hover:bg-amber-700"
              >
                Submit Anyway
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
