import React, { useState, useEffect } from 'react';
import {
  Compass,
  TrendingUp,
  Award,
  Zap,
  Target,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  BookOpen,
  Briefcase,
  Layers,
  ArrowRight,
  ShieldCheck,
  Check,
  Circle,
  Clock,
  ChevronRight,
  Code2,
} from 'lucide-react';
import careerMentorService from '../../services/careerMentorService';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

export default function CareerRoadmapMentor() {
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState(null);
  const [completedPhases, setCompletedPhases] = useState(() => {
    try {
      const saved = localStorage.getItem('ai_career_roadmap_completed_phases');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const fetchRoadmap = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRecalculating(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const data = await careerMentorService.getCareerRoadmap(forceRefresh);
      setRoadmap(data);
    } catch (err) {
      console.error('Failed to load career roadmap:', err);
      setError(
        err.response?.data?.detail ||
          'Failed to retrieve career trajectory roadmap. Please ensure your backend is running and try again.'
      );
    } finally {
      setLoading(false);
      setRecalculating(false);
    }
  };

  useEffect(() => {
    fetchRoadmap(false);
  }, []);

  const togglePhase = (phaseIndex) => {
    const updated = {
      ...completedPhases,
      [phaseIndex]: !completedPhases[phaseIndex],
    };
    setCompletedPhases(updated);
    try {
      localStorage.setItem('ai_career_roadmap_completed_phases', JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to persist phase progress:', err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Skeleton Banner */}
        <div className="h-44 bg-slate-200 dark:bg-slate-800/60 rounded-3xl" />
        {/* Skeleton Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="h-32 bg-slate-200 dark:bg-slate-800/60 rounded-2xl" />
          <div className="h-32 bg-slate-200 dark:bg-slate-800/60 rounded-2xl" />
          <div className="h-32 bg-slate-200 dark:bg-slate-800/60 rounded-2xl" />
        </div>
        {/* Skeleton Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="h-48 bg-slate-200 dark:bg-slate-800/60 rounded-2xl" />
          <div className="h-48 bg-slate-200 dark:bg-slate-800/60 rounded-2xl" />
          <div className="h-48 bg-slate-200 dark:bg-slate-800/60 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center space-y-4 max-w-xl mx-auto border-rose-500/30 bg-rose-500/5">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
          <Compass className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Unable to Generate Career Trajectory</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">{error}</p>
        </div>
        <Button onClick={() => fetchRoadmap(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry with Gemini AI
        </Button>
      </Card>
    );
  }

  const {
    current_level = 'Mid-Level Full-Stack Developer',
    market_readiness_score = 74,
    recommended_upskill_stack = [],
    combined_impact = {},
    roadmap_phases = [],
    mentor_advice = '',
    candidate_skills = [],
  } = roadmap || {};

  const totalPhases = roadmap_phases.length;
  const completedCount = Object.values(completedPhases).filter(Boolean).length;
  const progressPct = totalPhases > 0 ? Math.round((completedCount / totalPhases) * 100) : 0;

  return (
    <div className="space-y-8 pb-10">
      {/* 1. TOP HERO HEADER & RECALCULATE ACTION */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border border-indigo-500/30 p-6 sm:p-8 shadow-xl text-white">
        {/* Glow aesthetics */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>AI Career Trajectory & Learning Mentor</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span>{current_level}</span>
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Personalized market benchmark and high-ROI learning milestones calculated from your verified technical skills snapshot.
            </p>

            {/* Candidate Existing Skills Chips */}
            {candidate_skills.length > 0 && (
              <div className="pt-2 flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Baseline Skills:
                </span>
                {candidate_skills.slice(0, 7).map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-[11px] font-semibold text-slate-300"
                  >
                    {skill}
                  </span>
                ))}
                {candidate_skills.length > 7 && (
                  <span className="text-[11px] text-slate-400">+{candidate_skills.length - 7} more</span>
                )}
              </div>
            )}
          </div>

          {/* Action Button: Recalculate */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-3 shrink-0">
            <button
              onClick={() => fetchRoadmap(true)}
              disabled={recalculating}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md hover:shadow-indigo-500/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
              <span>{recalculating ? 'Analyzing with Gemini...' : 'Recalculate Roadmap with Latest Resume'}</span>
            </button>

            {roadmap?.generated_at && (
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                Updated {new Date(roadmap.generated_at).toLocaleDateString()}
                {roadmap.is_cached && ' • Cached'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. TOP HERO STAT BANNER (3 KPI METRICS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Metric 1: Market Readiness Score */}
        <div className="p-5 rounded-2xl border border-indigo-500/20 bg-gradient-to-b from-white to-indigo-50/20 dark:from-slate-900 dark:to-slate-850 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Current Market Readiness
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
                {market_readiness_score}%
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">/ 100</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Matches {market_readiness_score}% of active full-stack job listings
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Target className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 2: Projected Growth Potential */}
        <div className="p-5 rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-white to-emerald-50/20 dark:from-slate-900 dark:to-slate-850 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Projected Growth Potential
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {combined_impact?.profile_demand_boost || '+65% Profile Reach'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Higher job match with recommended skills
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3: Target Salary Horizon */}
        <div className="p-5 rounded-2xl border border-amber-500/20 bg-gradient-to-b from-white to-amber-50/20 dark:from-slate-900 dark:to-slate-850 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Target Salary Horizon
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
                {combined_impact?.estimated_salary_range || '৳85k - ৳130k'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Projected monthly compensation range
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. HIGH-ROI SKILLS TO LEARN NEXT GRID */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                High-ROI Skills to Learn Next
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Identified highest-leverage technologies that instantly bridge market demand gaps
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {recommended_upskill_stack.map((item, idx) => (
            <div
              key={idx}
              className="group p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all hover:shadow-md flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {item.skill}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 shrink-0">
                    High ROI
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    <TrendingUp className="w-3 h-3" />
                    +{item.demand_increase_pct}% Demand
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-500/20">
                    +{item.projected_salary_boost_pct}% Salary Bump
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {item.reason}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">
                  Priority: {item.priority || 'HIGH'}
                </span>
                <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Recommended Track <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. INTERACTIVE CAREER TIMELINE / ROADMAP PHASES */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Step-by-Step Micro-Learning Action Plan
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                8-week structured roadmap with weekly curriculum and portfolio-grade milestone projects
              </p>
            </div>
          </div>

          {/* Progress Tracker Pill */}
          <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-850 px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
            <span>Progress: {completedCount} / {totalPhases} Completed</span>
            <div className="w-20 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-emerald-600 dark:text-emerald-400">{progressPct}%</span>
          </div>
        </div>

        <div className="space-y-3.5">
          {roadmap_phases.map((phase, idx) => {
            const isDone = Boolean(completedPhases[idx]);

            return (
              <div
                key={idx}
                className={`p-5 rounded-2xl border transition-all ${
                  isDone
                    ? 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/20 dark:bg-emerald-950/15'
                    : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => togglePhase(idx)}
                      className={`mt-0.5 p-1 rounded-lg transition-colors cursor-pointer ${
                        isDone
                          ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40'
                          : 'text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                      }`}
                      title={isDone ? 'Mark as incomplete' : 'Mark phase as completed'}
                    >
                      {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                    </button>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-sm font-bold ${
                            isDone
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {phase.phase}
                        </span>
                        {isDone && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            Completed
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        <strong className="text-slate-700 dark:text-slate-300 font-semibold">Core Focus: </strong>
                        {phase.focus}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Milestone Project Card */}
                {phase.milestone_project && (
                  <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-start gap-2.5 text-xs bg-slate-50 dark:bg-slate-850/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                    <Code2 className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">
                        Hands-on Milestone Project:
                      </span>
                      <span className="text-slate-600 dark:text-slate-400">
                        {phase.milestone_project}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. MENTORSHIP INSIGHT CALLOUT & UNLOCKABLE ROLES */}
      <div className="rounded-3xl p-6 sm:p-8 border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-slate-900 to-purple-950/30 shadow-lg relative overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-600/30">
            <Sparkles className="w-6 h-6" />
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-400">
                  Gemini Pro Career Architect Insights
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                  v2026.1
                </span>
              </div>
              <blockquote className="text-sm sm:text-base font-medium text-slate-200 mt-2 italic leading-relaxed">
                "{mentor_advice}"
              </blockquote>
            </div>

            {/* Unlockable Roles Ladder */}
            {combined_impact?.unlockable_roles && combined_impact.unlockable_roles.length > 0 && (
              <div className="pt-2 border-t border-indigo-500/20 space-y-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  🚀 Target Roles Unlocked Upon Roadmap Completion:
                </span>
                <div className="flex flex-wrap gap-2">
                  {combined_impact.unlockable_roles.map((role, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-xs font-bold text-indigo-300"
                    >
                      <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
