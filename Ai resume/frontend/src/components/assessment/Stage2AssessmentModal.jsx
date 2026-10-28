import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Sparkles,
  Send,
  FileText,
  Award,
} from 'lucide-react';
import Button from '../ui/Button';
import { jobService } from '../../services/jobService';

export default function Stage2AssessmentModal({
  isOpen,
  onClose,
  jobId,
  applicationId,
  jobTitle = 'Role',
  companyName = 'Hiring Team',
  passingScore = 70,
  onSubmitted,
}) {
  const [loading, setLoading] = useState(true);
  const [assessmentData, setAssessmentData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [mcqAnswers, setMcqAnswers] = useState({});
  const [writtenAnswers, setWrittenAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);

  useEffect(() => {
    if (isOpen && jobId) {
      loadAssessment();
    }
  }, [isOpen, jobId]);

  const loadAssessment = async () => {
    setLoading(true);
    setErrorMsg('');
    setSubmissionResult(null);
    try {
      const data = await jobService.getStage2Assessment(jobId);
      setAssessmentData(data);
    } catch (err) {
      console.error('Failed to load Stage 2 assessment:', err);
      setErrorMsg(
        err.response?.data?.detail || 'Unable to load Stage-2 assessment questions.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const mcqs = (assessmentData?.mcqs || []).slice(0, 10);
  const written = (assessmentData?.written || []).slice(0, 5);

  const mcqMarksPerQuestion = 2;
  const writtenMarksPerQuestion = 10;
  const totalMCQMarks = mcqs.length * mcqMarksPerQuestion;
  const totalWrittenMarks = written.length * writtenMarksPerQuestion;
  const maxTotalMarks = totalMCQMarks + totalWrittenMarks;

  const attemptedMCQMarks = Object.keys(mcqAnswers).length * mcqMarksPerQuestion;
  const attemptedWrittenMarks = Object.keys(writtenAnswers).filter(
    (k) => (writtenAnswers[k] || '').trim().length > 0
  ).length * writtenMarksPerQuestion;
  const attemptedTotalMarks = attemptedMCQMarks + attemptedWrittenMarks;

  const handleSelectMCQ = (questionId, optionKey) => {
    setMcqAnswers((prev) => ({
      ...prev,
      [String(questionId)]: optionKey,
    }));
  };

  const handleWrittenChange = (questionId, text) => {
    setWrittenAnswers((prev) => ({
      ...prev,
      [String(questionId)]: text,
    }));
  };

  const handleSubmit = async () => {
    const unansweredMCQs = mcqs.filter((q, idx) => {
      const key = q.id !== undefined && q.id !== null ? String(q.id) : String(idx);
      return !mcqAnswers[key];
    });
    const unansweredWritten = written.filter((w, idx) => {
      const key = w.id !== undefined && w.id !== null ? String(w.id) : String(idx);
      return !writtenAnswers[key] || writtenAnswers[key].trim().length < 5;
    });

    if (unansweredMCQs.length > 0 || unansweredWritten.length > 0) {
      const proceed = window.confirm(
        `You have ${unansweredMCQs.length + unansweredWritten.length} unanswered or incomplete questions. Are you sure you want to submit?`
      );
      if (!proceed) return;
    }

    setSubmitting(true);
    try {
      const payload = {
        mcq_answers: mcqAnswers,
        written_answers: writtenAnswers,
      };
      let res;
      if (applicationId) {
        res = await jobService.submitStage2Assessment(applicationId, payload);
      } else {
        res = await jobService.submitJobStage2Assessment(jobId, payload);
      }
      const stage2Sub = res.stage2_submission || res;
      setSubmissionResult(stage2Sub);
      setIsCompleted(true);
      if (onSubmitted) {
        onSubmitted(res);
      }
    } catch (err) {
      console.error('Failed to submit Stage 2 assessment:', err);
      alert(err.response?.data?.detail || 'Failed to submit assessment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 sm:px-7 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/80 dark:bg-slate-800/60 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                Stage-2 Custom Recruiter Assessment
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1">
              {jobTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {companyName} • Author-Curated Technical Evaluation
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Marks Counter Banner */}
        {!loading && !errorMsg && !isCompleted && (
          <div className="px-5 sm:px-7 py-2.5 bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 dark:from-purple-950/40 dark:via-indigo-950/30 dark:to-purple-950/40 border-b border-purple-200 dark:border-purple-800/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Live Marks Counter:
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-600 text-white shadow-xs tracking-wide">
                Total Marks: {attemptedTotalMarks} / {maxTotalMarks}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                (MCQs: {attemptedMCQMarks}/{totalMCQMarks} Marks • Written: {attemptedWrittenMarks}/{totalWrittenMarks} Marks)
              </span>
            </div>
            <div className="text-[11px] font-bold text-purple-700 dark:text-purple-300">
              Passing Benchmark: <span className="underline">{passingScore}%</span>
            </div>
          </div>
        )}

        {/* Modal Content */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="text-center py-20 text-slate-500">
              <div className="w-10 h-10 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading Stage-2 Assessment Questions...
            </div>
          ) : errorMsg ? (
            <div className="text-center py-16 text-slate-500 space-y-3">
              <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                {errorMsg}
              </p>
              <Button size="sm" variant="secondary" onClick={loadAssessment}>
                Retry
              </Button>
            </div>
          ) : isCompleted ? (
            <div className="text-center py-10 space-y-5 max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Stage-2 Assessment Submitted!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Your candidate evaluation has been recorded and submitted to <strong>{companyName}</strong>.
                </p>
              </div>

              {/* Marks Scorecard */}
              <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-left space-y-3">
                <div className="flex items-center justify-between border-b border-purple-200 dark:border-purple-800 pb-2">
                  <span className="text-xs font-bold text-purple-900 dark:text-purple-200">
                    Candidate Marks Scorecard:
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-600 text-white">
                    Total Marks: {submissionResult?.mcq_marks_earned ?? 0} / {submissionResult?.max_total_marks ?? maxTotalMarks} Earned
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900/60">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">MCQ Marks</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 text-sm">
                      {submissionResult?.mcq_marks_earned ?? 0} / {submissionResult?.total_mcq_marks ?? totalMCQMarks}
                    </strong>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      ({submissionResult?.mcqs_correct ?? 0} correct • {submissionResult?.mcq_score_percentage ?? 0}%)
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900/60">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Written Marks</span>
                    <strong className="text-indigo-600 dark:text-indigo-400 text-sm">
                      {submissionResult?.total_written_marks ?? totalWrittenMarks} Marks
                    </strong>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 block mt-0.5">
                      Pending Recruiter Review
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 dark:text-slate-400">
                  Passing Benchmark: <strong>{submissionResult?.passing_score ?? passingScore}%</strong> • Status:{' '}
                  <strong className="text-purple-600 dark:text-purple-400">Stage-2 Submitted / Under Review</strong>
                </div>
              </div>

              <div className="pt-2">
                <Button variant="primary" onClick={onClose} className="w-full font-bold">
                  Return to Job Details
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Instructions Callout */}
              <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200 space-y-1">
                <h4 className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  Recruiter Custom Instructions
                </h4>
                <p className="leading-relaxed">
                  The hiring team has prepared these tailored technical questions for shortlisted candidates. Each MCQ is worth 2 Marks and each Written question is worth 10 Marks. Once submitted, your answers cannot be modified.
                </p>
              </div>

              {/* Part 1: Custom MCQs */}
              {mcqs.length > 0 && (
                <div className="space-y-4">
                  <div className="border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-purple-600" />
                      Part 1: Multiple Choice Questions ({mcqs.length})
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200">
                      Total: {totalMCQMarks} Marks
                    </span>
                  </div>

                  <div className="space-y-4">
                    {mcqs.map((q, idx) => {
                      const qKey = q.id !== undefined && q.id !== null ? String(q.id) : String(idx);
                      const currentSelected = mcqAnswers[qKey];
                      return (
                        <div
                          key={qKey}
                          className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 space-y-3 shadow-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="w-6 h-6 rounded-md bg-purple-600 text-white text-[11px] font-black flex items-center justify-center shrink-0">
                              #{idx + 1}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200">
                              Each MCQ: 2 Marks
                            </span>
                          </div>

                          <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-relaxed">
                            {q.question}
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 pl-1">
                            {(q.options || []).map((opt, optIdx) => {
                              const optKey = ['A', 'B', 'C', 'D'][optIdx] || String(optIdx);
                              const isSelected = currentSelected === optKey;
                              return (
                                <label
                                  key={optIdx}
                                  className={`p-3 rounded-xl border text-left text-xs font-medium transition-all flex items-center gap-2.5 cursor-pointer select-none ${
                                    isSelected
                                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/50 text-purple-950 dark:text-purple-100 ring-2 ring-purple-500/20 shadow-xs'
                                      : 'border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`stage2-mcq-${qKey}`}
                                    value={optKey}
                                    checked={isSelected}
                                    onChange={() => handleSelectMCQ(qKey, optKey)}
                                    className="w-4 h-4 text-purple-600 border-slate-300 dark:border-slate-600 focus:ring-purple-500 cursor-pointer shrink-0"
                                  />
                                  <span
                                    className={`w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center shrink-0 transition-colors ${
                                      isSelected
                                        ? 'bg-purple-600 text-white shadow-xs'
                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                    }`}
                                  >
                                    {optKey}
                                  </span>
                                  <span className="leading-snug flex-1 font-medium text-slate-900 dark:text-slate-100">
                                    {opt}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Part 2: Custom Written Questions */}
              {written.length > 0 && (
                <div className="space-y-4">
                  <div className="border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-indigo-600" />
                      Part 2: Scenario & Problem Solving Questions ({written.length})
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200">
                      Total: {totalWrittenMarks} Marks
                    </span>
                  </div>

                  <div className="space-y-4">
                    {written.map((wq, idx) => {
                      const wKey = wq.id !== undefined && wq.id !== null ? String(wq.id) : String(idx);
                      const currentVal = writtenAnswers[wKey] || '';
                      const wordCount = currentVal.trim() ? currentVal.trim().split(/\s+/).length : 0;
                      return (
                        <div
                          key={wKey}
                          className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 space-y-3 shadow-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="w-6 h-6 rounded-md bg-indigo-600 text-white text-[11px] font-black flex items-center justify-center shrink-0">
                              #{idx + 1}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200">
                              Written: 10 Marks
                            </span>
                          </div>

                          <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-relaxed">
                            {wq.question}
                          </h4>

                          {wq.instructions && (
                            <div className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
                              <strong className="text-purple-700 dark:text-purple-300">Instructions:</strong> {wq.instructions}
                            </div>
                          )}

                          <div className="space-y-1.5">
                            <textarea
                              rows={4}
                              value={currentVal}
                              onChange={(e) => handleWrittenChange(wKey, e.target.value)}
                              placeholder="Write your detailed solution / architecture approach here..."
                              className="w-full p-3.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-slate-400 font-normal leading-relaxed"
                            />
                            <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 px-1">
                              <span>Be specific and describe technical reasoning</span>
                              <span>{wordCount} words</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {!isCompleted && !loading && !errorMsg && (
          <div className="p-4 sm:px-7 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-slate-500">
              Answered:{' '}
              <strong className="text-slate-800 dark:text-slate-200">
                {Object.keys(mcqAnswers).length} / {mcqs.length} MCQs
              </strong>{' '}
              •{' '}
              <strong className="text-slate-800 dark:text-slate-200">
                {Object.keys(writtenAnswers).filter((k) => (writtenAnswers[k] || '').trim().length > 0).length} / {written.length} Written
              </strong>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={onClose} disabled={submitting}>
                Save & Exit Later
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                {submitting ? 'Submitting to Recruiter...' : 'Submit Stage-2 Answers'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
