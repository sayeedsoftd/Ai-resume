import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Flame,
  Zap,
  CheckCircle2,
  XCircle,
  Award,
  Sparkles,
  Lightbulb,
  Check,
  ChevronLeft,
  RotateCcw,
  ShieldCheck,
  Target,
} from 'lucide-react';
import dailyQuizService from '../../services/dailyQuizService';
import Button from '../../components/ui/Button';

export default function DailySkillDrill() {
  const navigate = useNavigate();
  const [quizData, setQuizData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [resultData, setResultData] = useState(null);

  const loadTodayQuiz = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dailyQuizService.getTodayQuiz();
      setQuizData(data);

      if (data?.is_completed) {
        setIsSubmitted(true);
        setResultData({
          session_id: data.session_id,
          score_achieved: data.score_achieved ?? 0,
          total_questions: data.questions?.length || 5,
          xp_earned: data.xp_earned || 0,
          current_streak_days: data.current_streak_days || 0,
          total_xp: data.total_xp || 0,
          streak_maintained: true,
          results: data.questions || [],
        });
      } else {
        setIsSubmitted(false);
        setResultData(null);
      }
    } catch (err) {
      console.error('Failed to load daily quiz:', err);
      setError(
        err.response?.data?.detail ||
          'Failed to load today’s micro-drill. Please ensure backend is running and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTodayQuiz();
  }, []);

  const questions = quizData?.questions || [];
  const selectedCount = Object.keys(selectedAnswers).length;
  const allAnswered = questions.length > 0 && selectedCount >= questions.length;

  const handleSelectOption = (qIdx, optionIdx) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [qIdx]: optionIdx,
    }));
  };

  const handleRetakePractice = () => {
    setSelectedAnswers({});
    setIsSubmitted(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!allAnswered) {
      setError(`Please answer all ${questions.length} questions before submitting.`);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const answersList = questions.map((_, i) => selectedAnswers[i]);

      // If backend already marked completed today, evaluate locally for practice mode
      if (quizData?.is_completed && resultData?.results) {
        let score = 0;
        const practiceResults = resultData.results.map((q, i) => {
          const isCorrect = answersList[i] === q.correct_option_index;
          if (isCorrect) score += 1;
          return {
            ...q,
            candidate_option_index: answersList[i],
            is_correct: isCorrect,
          };
        });

        setResultData((prev) => ({
          ...prev,
          score_achieved: score,
          xp_earned: score * 10,
          results: practiceResults,
        }));
        setIsSubmitted(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // Normal live submission
      const res = await dailyQuizService.submitTodayQuiz({
        session_id: quizData.session_id,
        answers: answersList,
      });

      setResultData(res);
      setIsSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Quiz submission error:', err);
      setError(err.response?.data?.detail || 'Failed to submit quiz. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 py-8 animate-pulse">
        <div className="h-28 bg-slate-200 dark:bg-slate-800/60 rounded-3xl" />
        <div className="space-y-4">
          <div className="h-64 bg-slate-200 dark:bg-slate-800/60 rounded-3xl" />
          <div className="h-64 bg-slate-200 dark:bg-slate-800/60 rounded-3xl" />
        </div>
      </div>
    );
  }

  const streakDays = resultData?.current_streak_days ?? quizData?.current_streak_days ?? 0;
  const totalXp = resultData?.total_xp ?? quizData?.total_xp ?? 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Candidate Dashboard
        </Link>
      </div>

      {/* Main Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-indigo-950/40 border border-amber-500/30 p-6 sm:p-8 shadow-xl text-white">
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/25 shrink-0">
              <Flame className="w-8 h-8 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white">
                  {isSubmitted ? "Daily Skill Sprint Results" : "🎯 Daily Skill Sprint (5 Quick Questions)"}
                </h1>
                <span className="inline-flex items-center gap-1 text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  🔥 {streakDays} Day Streak
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-black px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  ⚡ {totalXp} Total XP
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {isSubmitted
                  ? "Performance evaluation and Gemini AI conceptual breakdown for today's drill."
                  : `Answer all 5 questions below, then click Submit to verify your score and keep your daily streak alive.`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
          {error}
        </div>
      )}

      {/* ========================================================
          PHASE 2: RESULTS & BREAKDOWN MODE (isSubmitted === true)
          ======================================================== */}
      {isSubmitted && resultData ? (
        <div className="space-y-6">
          {/* Top Score & Streak Celebration Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-indigo-950/40 border border-amber-500/30 text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <Award className="w-4 h-4 text-amber-400" />
              TODAY'S SPRINT COMPLETED
            </div>

            <div className="flex items-center justify-center gap-4 pt-1">
              <div className="text-4xl font-black text-white">
                {resultData.score_achieved} / {resultData.total_questions || 5}
                <span className="text-sm font-semibold text-slate-400 ml-1.5">Score</span>
              </div>
              <div className="text-3xl font-black text-amber-400 bg-amber-500/10 px-4 py-1.5 rounded-2xl border border-amber-500/30">
                +{resultData.xp_earned} XP
              </div>
            </div>

            <p className="text-xs sm:text-sm text-emerald-400 font-semibold flex items-center justify-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
              You kept your {resultData.current_streak_days}-day learning streak alive! Total XP: {resultData.total_xp}
            </p>
          </div>

          {/* Conceptual Breakdown List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Conceptual Breakdown & Gemini AI Explanations
              </h3>
              <button
                type="button"
                onClick={handleRetakePractice}
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 hover:underline transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Practice Mode
              </button>
            </div>

            {(resultData.results || []).map((q, idx) => {
              const isCorrect = q.is_correct;
              const cAnsIdx = q.candidate_option_index;
              const correctIdx = q.correct_option_index;

              return (
                <div
                  key={idx}
                  className={`p-5 rounded-3xl border transition-all ${
                    isCorrect
                      ? 'border-emerald-500/30 bg-emerald-950/15'
                      : 'border-rose-500/30 bg-rose-950/15'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3">
                      {isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-indigo-300 border border-slate-700 inline-block mb-1.5">
                          {q.skill || 'General'}
                        </span>
                        <h4 className="text-sm font-bold text-white leading-snug">
                          Q{idx + 1}. {q.question}
                        </h4>
                      </div>
                    </div>

                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full shrink-0 ${
                        isCorrect
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {isCorrect ? '✅ +10 XP' : '❌ 0 XP'}
                    </span>
                  </div>

                  {/* Options List */}
                  <div className="space-y-2 pl-8 my-3 text-xs">
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
                          className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${optStyle}`}
                        >
                          <span>{opt}</span>
                          <div className="shrink-0 flex items-center gap-1.5">
                            {isTheCorrectOne && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                Correct Answer
                              </span>
                            )}
                            {isPicked && !isTheCorrectOne && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                Your Choice
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Gemini AI Explanation */}
                  {q.concise_explanation && (
                    <div className="ml-8 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-2.5 text-xs">
                      <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-300 block mb-0.5">Why this matters:</span>
                        <span className="text-slate-400 leading-relaxed">{q.concise_explanation}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <button
              type="button"
              onClick={handleRetakePractice}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retake in Practice Mode
            </button>
            <Link to="/dashboard">
              <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 px-6">
                Return to Candidate Dashboard
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        /* ========================================================
            PHASE 1: INTERACTIVE ATTEMPT MODE (!isSubmitted)
            ======================================================== */
        <div className="space-y-6">
          {/* Progress Overview Bar */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                <Target className="w-4 h-4 text-indigo-400" />
                Select 1 option per question
              </span>
              <span className={`font-bold ${allAnswered ? 'text-emerald-400' : 'text-amber-400'}`}>
                {selectedCount} of {questions.length} Answered
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${(selectedCount / Math.max(1, questions.length)) * 100}%` }}
              />
            </div>
          </div>

          {/* All 5 Questions Listed for Interactive Attempt */}
          <div className="space-y-6">
            {questions.map((q, idx) => {
              const currentChoice = selectedAnswers[idx];

              return (
                <div
                  key={idx}
                  className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-lg hover:border-slate-700 transition-colors"
                >
                  {/* Question Header */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">
                      {q.skill || 'Software Engineering'}
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      Question {idx + 1} of {questions.length}
                    </span>
                  </div>

                  {/* Question Text */}
                  <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
                    {q.question}
                  </h3>

                  {/* 4 Interactive Clickable Option Cards */}
                  <div className="space-y-2.5 pt-1">
                    {q.options?.map((optionText, optIdx) => {
                      const isSelected = currentChoice === optIdx;

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => handleSelectOption(idx, optIdx)}
                          className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500/40'
                              : 'border-slate-800 bg-slate-900/60 hover:bg-slate-850 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <span className="text-xs sm:text-sm font-medium leading-relaxed">
                            {optionText}
                          </span>
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                              isSelected
                                ? 'border-indigo-400 bg-indigo-600 text-white'
                                : 'border-slate-700 bg-slate-950'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sticky Bottom Submit Bar */}
          <div className="sticky bottom-4 z-40 bg-slate-900/95 backdrop-blur-md border border-slate-800 p-4 sm:p-5 rounded-3xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm ${
                  allAnswered
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {selectedCount}/{questions.length}
              </div>
              <div>
                <p className="text-xs font-bold text-white">
                  {allAnswered
                    ? 'All 5 Questions Answered!'
                    : `Answered ${selectedCount} of ${questions.length} questions`}
                </p>
                <p className="text-[11px] text-slate-400">
                  {allAnswered
                    ? 'Ready to grade your drill & update streak'
                    : 'Please select an answer for each question before submitting'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!allAnswered || submitting}
              className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/20 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>{submitting ? 'Grading Drill with Gemini...' : 'Submit Daily Quiz & View Score'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
