import React, { useState, useEffect } from 'react';
import {
  X,
  Flame,
  Zap,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Award,
  Sparkles,
  HelpCircle,
  Lightbulb,
  Check,
  RotateCcw,
} from 'lucide-react';
import dailyQuizService from '../../services/dailyQuizService';
import Button from '../ui/Button';

export default function DailySkillDrillModal({
  isOpen,
  onClose,
  quizData,
  onQuizCompleted,
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [resultData, setResultData] = useState(null);

  useEffect(() => {
    if (quizData?.is_completed) {
      setResultData({
        session_id: quizData.session_id,
        score_achieved: quizData.score_achieved ?? 0,
        total_questions: quizData.questions?.length || 5,
        xp_earned: quizData.xp_earned || 0,
        current_streak_days: quizData.current_streak_days || 0,
        total_xp: quizData.total_xp || 0,
        streak_maintained: true,
        results: quizData.questions || [],
      });
    } else {
      setResultData(null);
      setSelectedAnswers({});
      setCurrentIdx(0);
    }
  }, [quizData]);

  if (!isOpen || !quizData) return null;

  const questions = quizData.questions || [];
  const currentQ = questions[currentIdx] || null;
  const isLastQuestion = currentIdx === questions.length - 1;
  const answeredCount = Object.keys(selectedAnswers).length;
  const allAnswered = answeredCount === questions.length;

  const handleSelectOption = (qIdx, optionIdx) => {
    if (resultData) return; // Read-only if reviewing completed quiz
    setSelectedAnswers((prev) => ({
      ...prev,
      [qIdx]: optionIdx,
    }));
  };

  const handleSubmit = async () => {
    if (!allAnswered) {
      setError('Please answer all 5 questions before submitting.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Convert answers map to ordered list
      const answersList = questions.map((_, i) => selectedAnswers[i]);
      const res = await dailyQuizService.submitTodayQuiz({
        session_id: quizData.session_id,
        answers: answersList,
      });

      setResultData(res);
      if (onQuizCompleted) {
        onQuizCompleted(res);
      }
    } catch (err) {
      console.error('Quiz submission error:', err);
      setError(err.response?.data?.detail || 'Failed to submit quiz. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Glow Effects */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative p-5 sm:px-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20 text-white">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">Daily Skill Sprint</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  🔥 {quizData.current_streak_days} Day Streak
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  ⚡ {quizData.total_xp} XP
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {resultData ? "Today's Performance Breakdown & AI Explanations" : "5 quick conceptual questions • +10 XP per correct"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Active Drill vs Results View */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          {/* VIEW A: RESULTS BREAKDOWN */}
          {resultData ? (
            <div className="space-y-6">
              {/* Celebration Hero Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-orange-950/20 to-indigo-950/40 border border-amber-500/30 text-center space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-wider">
                  <Award className="w-3.5 h-3.5" />
                  Sprint Completed
                </div>

                <div className="flex items-center justify-center gap-4 pt-1">
                  <div className="text-3xl font-black text-white">
                    {resultData.score_achieved} / {resultData.total_questions || 5}
                    <span className="text-sm font-semibold text-slate-400 ml-1">Correct</span>
                  </div>
                  <div className="text-2xl font-black text-amber-400 bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/30">
                    +{resultData.xp_earned} XP
                  </div>
                </div>

                <p className="text-xs text-emerald-400 font-semibold flex items-center justify-center gap-1.5">
                  <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
                  You kept your {resultData.current_streak_days}-day learning streak alive! Total XP: {resultData.total_xp}
                </p>
              </div>

              {/* Review List with Explanations */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Conceptual Breakdown & AI Explanations
                </h4>

                {(resultData.results || []).map((q, idx) => {
                  const isCorrect = q.is_correct;
                  const cAnsIdx = q.candidate_option_index;
                  const correctIdx = q.correct_option_index;

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border transition-all ${
                        isCorrect
                          ? 'border-emerald-500/30 bg-emerald-950/15'
                          : 'border-rose-500/30 bg-rose-950/15'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="flex items-start gap-2.5">
                          {isCorrect ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-indigo-300 border border-slate-700 inline-block mb-1">
                              {q.skill || 'General'}
                            </span>
                            <h5 className="text-sm font-bold text-white leading-snug">
                              Q{idx + 1}. {q.question}
                            </h5>
                          </div>
                        </div>

                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full shrink-0 ${
                            isCorrect
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {isCorrect ? '+10 XP' : '0 XP'}
                        </span>
                      </div>

                      {/* Options Recap */}
                      <div className="space-y-1.5 pl-7 my-3 text-xs">
                        {q.options?.map((opt, oIdx) => {
                          const isPicked = cAnsIdx === oIdx;
                          const isTheCorrectOne = correctIdx === oIdx;

                          let optStyle = 'border-slate-800 text-slate-400 bg-slate-900/60';
                          if (isTheCorrectOne) {
                            optStyle = 'border-emerald-500/50 text-emerald-300 bg-emerald-950/30 font-semibold';
                          } else if (isPicked && !isCorrect) {
                            optStyle = 'border-rose-500/50 text-rose-300 bg-rose-950/30 line-through';
                          }

                          return (
                            <div
                              key={oIdx}
                              className={`p-2.5 rounded-xl border flex items-center justify-between ${optStyle}`}
                            >
                              <span>{opt}</span>
                              {isTheCorrectOne && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                                  Correct Answer
                                </span>
                              )}
                              {isPicked && !isTheCorrectOne && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">
                                  Your Choice
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Concise Explanation */}
                      {q.concise_explanation && (
                        <div className="ml-7 p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-2 text-xs">
                          <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-slate-300 block">Why this matters:</span>
                            <span className="text-slate-400 leading-relaxed">{q.concise_explanation}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* VIEW B: ACTIVE QUIZ PROGRESSION */
            currentQ && (
              <div className="space-y-6">
                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">
                      Question {currentIdx + 1} of {questions.length}
                    </span>
                    <span className="text-amber-400 font-bold">
                      {answeredCount} / {questions.length} Answered
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Current Question Card */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 inline-block">
                      {currentQ.skill}
                    </span>
                    <h4 className="text-base sm:text-lg font-bold text-white leading-snug">
                      {currentQ.question}
                    </h4>
                  </div>

                  {/* 4 Selectable Options */}
                  <div className="space-y-2.5 pt-2">
                    {currentQ.options?.map((optionText, optIdx) => {
                      const isSelected = selectedAnswers[currentIdx] === optIdx;

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => handleSelectOption(currentIdx, optIdx)}
                          className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-600/20 text-white shadow-md shadow-indigo-600/10'
                              : 'border-slate-800 bg-slate-850/60 hover:bg-slate-800/80 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <span className="text-xs sm:text-sm font-medium leading-relaxed">
                            {optionText}
                          </span>
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'border-indigo-400 bg-indigo-600 text-white'
                                : 'border-slate-700 bg-slate-900'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:px-6 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          {resultData ? (
            <div className="w-full flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedAnswers({});
                  setResultData(null);
                  setCurrentIdx(0);
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Practice Mode
              </button>
              <Button
                onClick={onClose}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-5"
              >
                Close
              </Button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                disabled={currentIdx === 0}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Previous
              </button>

              <div className="flex items-center gap-1.5">
                {questions.map((_, dotIdx) => (
                  <button
                    key={dotIdx}
                    onClick={() => setCurrentIdx(dotIdx)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      dotIdx === currentIdx
                        ? 'w-5 bg-amber-400'
                        : selectedAnswers[dotIdx] !== undefined
                        ? 'bg-emerald-400'
                        : 'bg-slate-700'
                    }`}
                  />
                ))}
              </div>

              {isLastQuestion ? (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!allAnswered || submitting}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <Zap className="w-4 h-4 text-amber-300" />
                  {submitting ? 'Grading Answers...' : 'Submit Drill'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCurrentIdx((prev) => Math.min(questions.length - 1, prev + 1))}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition cursor-pointer"
                >
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
