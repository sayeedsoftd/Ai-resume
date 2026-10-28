import React, { useState, useEffect } from 'react';
import { X, Award, CheckCircle2, Clock, Sparkles, Building, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { jobService } from '../../services/jobService';

export default function SubmissionReviewModal({ isOpen, onClose, submissionId }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen && submissionId) {
      loadSubmission();
    }
  }, [isOpen, submissionId]);

  const loadSubmission = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await jobService.getSubmissionDetail(submissionId);
      setData(res);
    } catch (err) {
      console.error('Failed to load submission details:', err);
      setErrorMsg(err.response?.data?.detail || 'Unable to retrieve assessment scorecard.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const writtenFeedback = data?.written_evaluation_feedback?.evaluations || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-900">
        {/* Header */}
        <div className="p-5 sm:px-7 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600">
                Official Screening Scorecard
              </span>
              <Badge variant="verified" size="xs">
                Verified Result
              </Badge>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mt-0.5">
              {data?.job_title || 'Assessment Review'}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
          {loading ? (
            <div className="text-center py-16 text-slate-500">
              <div className="w-9 h-9 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading your verified scorecard...
            </div>
          ) : errorMsg ? (
            <div className="text-center py-12 text-slate-500 space-y-2">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
              <p className="text-xs">{errorMsg}</p>
            </div>
          ) : data ? (
            <>
              {/* Score Highlight Card */}
              <div className="bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/50 p-6 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-indigo-600/30 shrink-0">
                    {Math.round(data.total_test_score)}%
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500">
                      Composite Screening Grade
                    </span>
                    <h3 className="text-base font-bold text-gray-900">
                      {data.total_test_score >= 70 ? 'Screening Passed (Shortlisted)' : 'Screening Completed'}
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Submitted on {new Date(data.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col gap-2 shrink-0">
                  <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs shadow-2xs">
                    <span className="text-slate-500 text-[10px] block font-medium">MCQ Points:</span>
                    <span className="font-bold text-emerald-700">
                      {data.mcq_score} / 50.0 pts
                    </span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs shadow-2xs">
                    <span className="text-slate-500 text-[10px] block font-medium">Written Points:</span>
                    <span className="font-bold text-indigo-700">
                      {data.written_score} / 50.0 pts
                    </span>
                  </div>
                </div>
              </div>

              {/* Written Questions Rubric Feedback */}
              {writtenFeedback.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                    AI Rubric Feedback on Written Problems
                  </h4>
                  <div className="space-y-3">
                    {writtenFeedback.map((ev, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-gray-900">
                            Problem #{ev.question_id || idx + 1}
                          </span>
                          <span className="text-indigo-700 font-extrabold">
                            {ev.marks_awarded} / {ev.max_marks || 10} pts
                          </span>
                        </div>
                        <p className="text-slate-800 font-medium leading-relaxed">
                          {ev.feedback}
                        </p>
                        {ev.strengths && (
                          <p className="text-emerald-800 text-[11px] font-semibold">
                            <strong>Strengths:</strong> {ev.strengths}
                          </p>
                        )}
                        {ev.areas_for_improvement && (
                          <p className="text-amber-800 text-[11px] font-semibold">
                            <strong>Improvement:</strong> {ev.areas_for_improvement}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 sm:px-7 border-t border-slate-200 bg-slate-50 flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close Scorecard
          </Button>
        </div>
      </div>
    </div>
  );
}
