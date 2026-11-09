import React, { useState, useEffect } from 'react';
import {
  Sprout,
  TrendingUp,
  CheckCircle2,
  Target,
  BookOpen,
  Quote,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Award,
  Compass,
  ArrowRight,
} from 'lucide-react';
import { jobService } from '../../services/jobService';

export default function AIGrowthFeedbackCard({
  applicationId,
  initialFeedback = null,
  jobTitle = '',
  companyName = '',
  defaultExpanded = false,
}) {
  const [feedback, setFeedback] = useState(initialFeedback);
  const [loading, setLoading] = useState(!initialFeedback && Boolean(applicationId));
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (initialFeedback) {
      setFeedback(initialFeedback);
      setLoading(false);
    } else if (applicationId && isExpanded && !feedback) {
      loadFeedback();
    }
  }, [applicationId, initialFeedback, isExpanded]);

  const loadFeedback = async () => {
    if (!applicationId) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await jobService.getApplicationGrowthFeedback(applicationId);
      if (data && data.ai_growth_feedback) {
        setFeedback(data.ai_growth_feedback);
      }
    } catch (err) {
      console.error('Failed to load growth feedback:', err);
      setErrorMsg('Unable to retrieve career growth feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (!isExpanded && !feedback && !loading) {
      loadFeedback();
    }
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="rounded-2xl border border-indigo-200/80 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-emerald-50/50 dark:from-slate-900 dark:via-indigo-950/30 dark:to-slate-850 p-4 shadow-xs transition-all">
      {/* Header Bar */}
      <div
        onClick={handleToggle}
        className="flex items-center justify-between gap-3 cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Sprout className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                🌱 Candidate Growth Roadmap & Evaluation Feedback
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                Gemini Pro Mentorship
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Constructive, actionable evaluation of strengths and focused skills for your next interview.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hidden sm:inline">
            {isExpanded ? 'Hide Roadmap' : 'View Feedback'}
          </span>
          <button
            type="button"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800 transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-4 pt-3.5 border-t border-indigo-100/80 dark:border-indigo-900/40 space-y-4 animate-in fade-in duration-200">
          {loading ? (
            <div className="py-8 text-center text-xs text-indigo-600 dark:text-indigo-400 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Analyzing performance & generating constructive roadmap with Gemini AI...</span>
            </div>
          ) : errorMsg ? (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between">
              <span>{errorMsg}</span>
              <button
                type="button"
                onClick={loadFeedback}
                className="font-bold underline text-xs ml-2 cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : feedback ? (
            <>
              {/* Empathetic Opening Message */}
              <div className="p-3.5 rounded-xl bg-white/90 dark:bg-slate-900/80 border border-indigo-100 dark:border-indigo-900/60 shadow-xs">
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  {feedback.supportive_message}
                </p>
              </div>

              {/* Two-Column Layout: Strengths & Growth Areas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Column 1: Verified Strengths */}
                <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-2.5">
                  <div className="flex items-center gap-1.5 pb-1 border-b border-emerald-200/60 dark:border-emerald-800/40">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <h5 className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                      Verified Strengths
                    </h5>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                    {(feedback.key_strengths_observed || []).map((strength, sIdx) => (
                      <li key={sIdx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <span className="leading-snug">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Column 2: Areas for Technical Improvement */}
                <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2.5">
                  <div className="flex items-center gap-1.5 pb-1 border-b border-amber-200/60 dark:border-amber-800/40">
                    <Target className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <h5 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                      Areas for Technical Improvement
                    </h5>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                    {(feedback.critical_growth_areas || []).map((area, aIdx) => (
                      <li key={aIdx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                        <span className="leading-snug">{area}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Actionable Checklist: Recommended Topics to Master */}
              {feedback.recommended_study_topics && feedback.recommended_study_topics.length > 0 && (
                <div className="p-3.5 rounded-xl bg-white/90 dark:bg-slate-900/80 border border-indigo-100 dark:border-indigo-900/60 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      Recommended Topics to Master
                    </h5>
                    <span className="text-[10px] text-slate-400 font-semibold">Actionable Roadmap</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                    {feedback.recommended_study_topics.map((item, tIdx) => (
                      <div
                        key={tIdx}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-1.5"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {tIdx + 1}
                          </span>
                          <strong className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                            {item.topic}
                          </strong>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                          {item.why}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Final Uplifting Mentorship Note */}
              {feedback.encouragement_quote && (
                <div className="p-3 rounded-xl bg-gradient-to-r from-purple-100/70 via-indigo-100/50 to-pink-100/60 dark:from-indigo-950/60 dark:via-purple-950/40 dark:to-slate-900 border border-purple-200 dark:border-purple-800/60 flex items-start gap-2.5 text-xs text-purple-950 dark:text-purple-200">
                  <Quote className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                  <p className="italic font-medium leading-relaxed">
                    "{feedback.encouragement_quote}"
                  </p>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
