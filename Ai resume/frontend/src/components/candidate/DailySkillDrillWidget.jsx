import React, { useState, useEffect } from 'react';
import { Flame, Zap, Award, CheckCircle2, ArrowRight, Sparkles, BookOpen } from 'lucide-react';
import dailyQuizService from '../../services/dailyQuizService';
import DailySkillDrillModal from './DailySkillDrillModal';

export default function DailySkillDrillWidget() {
  const [quizData, setQuizData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadDailyQuizStatus = async () => {
    try {
      setLoading(true);
      const data = await dailyQuizService.getTodayQuiz();
      setQuizData(data);
    } catch (err) {
      console.error('Failed to load daily quiz status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDailyQuizStatus();
  }, []);

  const handleQuizCompleted = (result) => {
    setQuizData((prev) => ({
      ...prev,
      is_completed: true,
      score_achieved: result.score_achieved,
      xp_earned: result.xp_earned,
      current_streak_days: result.current_streak_days,
      total_xp: result.total_xp,
      questions: result.results || [],
    }));
  };

  if (loading && !quizData) {
    return (
      <div className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800/60 animate-pulse border border-slate-200/60 dark:border-slate-800" />
    );
  }

  const isDone = quizData?.is_completed;
  const streak = quizData?.current_streak_days || 0;
  const totalXp = quizData?.total_xp || 0;

  return (
    <>
      <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-r from-amber-950/30 via-slate-900 to-indigo-950/30 border border-amber-500/30 shadow-md">
        {/* Glow */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/25">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-black text-white">Daily Skill Sprint</h4>
                <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  🔥 {streak} Day Streak
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  ⚡ {totalXp} Total XP
                </span>
              </div>

              <p className="text-xs text-slate-300">
                {isDone
                  ? `Completed today! You scored ${quizData.score_achieved}/5 (+${quizData.xp_earned} XP). Streak safely preserved.`
                  : 'Take 2 minutes to answer 5 tailored questions, keep your streak alive, and earn skill reputation XP.'}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            {isDone ? (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Review Today's Drill</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black shadow-md shadow-amber-500/20 transition cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Start 2-Minute Quiz</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <DailySkillDrillModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          quizData={quizData}
          onQuizCompleted={handleQuizCompleted}
        />
      )}
    </>
  );
}
