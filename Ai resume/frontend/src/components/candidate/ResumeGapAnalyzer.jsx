import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  TrendingUp,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Briefcase,
  FileText,
  Target,
  ArrowRight,
  RotateCcw,
  ExternalLink,
  Layers,
  HelpCircle,
  Award,
  Zap,
} from 'lucide-react';
import { resumeService } from '../../services/resumeService';
import { jobService } from '../../services/jobService';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

export default function ResumeGapAnalyzer({ initialJobId = null, initialResumeId = null }) {
  const navigate = useNavigate();

  // Data fetching states
  const [resumes, setResumes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Selection states
  const [selectedResumeId, setSelectedResumeId] = useState(initialResumeId || '');
  const [selectedJobId, setSelectedJobId] = useState(initialJobId || '');
  const [customJdText, setCustomJdText] = useState('');
  const [customResumeText, setCustomResumeText] = useState('');

  // Analysis states
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState('rewrites'); // 'keywords' | 'rewrites' | 'projects'
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [activeTooltipSkill, setActiveTooltipSkill] = useState(null);

  // Client-side cache to avoid redundant Gemini calls: key -> result
  const cacheRef = useRef({});

  useEffect(() => {
    loadPrerequisites();
  }, []);

  const loadPrerequisites = async () => {
    setLoadingInitial(true);
    try {
      const [resumesData, jobsData] = await Promise.all([
        resumeService.getResumes().catch(() => []),
        jobService.getJobs({ limit: 50 }).catch(() => []),
      ]);

      const safeResumes = Array.isArray(resumesData) ? resumesData : [];
      const safeJobs = Array.isArray(jobsData) ? jobsData : [];

      setResumes(safeResumes);
      setJobs(safeJobs);

      // Auto-select primary resume if none selected
      if (!selectedResumeId && safeResumes.length > 0) {
        const primary = safeResumes.find((r) => r.is_primary) || safeResumes[0];
        setSelectedResumeId(primary.id);
      }

      // Auto-select first job if none selected
      if (!selectedJobId && safeJobs.length > 0) {
        setSelectedJobId(safeJobs[0].id);
      }
    } catch (err) {
      console.error('Failed to load gap analyzer prerequisites:', err);
    } finally {
      setLoadingInitial(false);
    }
  };

  const handleRunAnalysis = async () => {
    setErrorMsg('');
    const resumeIdNum = selectedResumeId && selectedResumeId !== 'custom' ? Number(selectedResumeId) : null;
    const jobIdNum = selectedJobId && selectedJobId !== 'custom' ? Number(selectedJobId) : null;

    if (!resumeIdNum && !customResumeText.trim()) {
      setErrorMsg('Please select an uploaded resume or paste your CV text.');
      return;
    }

    if (!jobIdNum && !customJdText.trim()) {
      setErrorMsg('Please select a target job circular or paste a job description.');
      return;
    }

    // Cache key for current query parameters
    const cacheKey = `${resumeIdNum || customResumeText.slice(0, 50)}_${jobIdNum || customJdText.slice(0, 50)}`;
    if (cacheRef.current[cacheKey]) {
      setAnalysisResult(cacheRef.current[cacheKey]);
      return;
    }

    setAnalyzing(true);
    try {
      const payload = {
        resume_id: resumeIdNum || undefined,
        resume_text: !resumeIdNum ? customResumeText.trim() : undefined,
        job_id: jobIdNum || undefined,
        job_description_text: !jobIdNum ? customJdText.trim() : undefined,
      };

      const result = await resumeService.analyzeGap(payload);
      cacheRef.current[cacheKey] = result;
      setAnalysisResult(result);
    } catch (err) {
      console.error('Gap analysis error:', err);
      setErrorMsg(
        err.response?.data?.detail || 'Failed to complete resume gap analysis. Please try again.'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCopyText = (text, idx) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  const handleOpenResumeBuilder = () => {
    // Navigate to Live Resume Builder with missing hard skills pre-loaded in state
    navigate('/resume-builder', {
      state: {
        suggestedSkills: analysisResult?.missing_hard_skills || [],
        targetJobTitle: analysisResult?.target_job_title,
      },
    });
  };

  // Score calculations
  const matchScore = analysisResult?.match_score || 0;
  const boostNumber = parseInt(analysisResult?.projected_score_boost?.replace('+', '') || '18', 10);
  const potentialScore = Math.min(98, matchScore + boostNumber);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white border border-indigo-800/50 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-400/20 to-indigo-400/20 border border-amber-400/30 text-amber-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Google Gemini AI Powered • Real-Time ATS Optimization
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              AI Resume Gap Analyzer
            </h2>
            <p className="text-xs sm:text-sm text-indigo-200/90 leading-relaxed font-normal">
              Compare your candidate profile against active circulars or custom job descriptions. Uncover missing keyword voids, quantify your experience gap, and preview high-impact before-and-after bullet rewrites.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleOpenResumeBuilder}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              Live Resume Builder
            </Button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Target & Resume Selection Card */}
      <div className="p-5 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Step 1: Select Your Target Job & Resume
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Real-time keyword extraction & scoring
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Target Job Selector */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Target Job Circular / Requisition *
            </label>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-600 focus:outline-none"
            >
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} — {j.company_name} ({j.experience_level || 'Mid'})
                </option>
              ))}
              <option value="custom">✍️ Paste Custom Job Description...</option>
            </select>

            {selectedJobId === 'custom' && (
              <textarea
                rows={4}
                value={customJdText}
                onChange={(e) => setCustomJdText(e.target.value)}
                placeholder="Paste the target job description, requirements, and required skills here..."
                className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-600 focus:outline-none leading-relaxed"
              />
            )}
          </div>

          {/* Candidate Resume Selector */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Candidate Resume to Audit *
            </label>
            <select
              value={selectedResumeId}
              onChange={(e) => setSelectedResumeId(e.target.value)}
              className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-600 focus:outline-none"
            >
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.is_primary ? '★ Primary: ' : ''}Resume #{r.id} (v{r.version})
                </option>
              ))}
              <option value="custom">✍️ Paste Custom Resume Content...</option>
            </select>

            {selectedResumeId === 'custom' && (
              <textarea
                rows={4}
                value={customResumeText}
                onChange={(e) => setCustomResumeText(e.target.value)}
                placeholder="Paste your resume experience bullets, skills summary, and work history here..."
                className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-600 focus:outline-none leading-relaxed"
              />
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-slate-500">
            Powered by Google Gemini 2.5 Flash semantic comparison pipeline.
          </span>
          <Button
            variant="primary"
            size="md"
            onClick={handleRunAnalysis}
            disabled={analyzing || loadingInitial}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 py-2.5 flex items-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            {analyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Analyzing Gaps with Gemini AI...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                Analyze Resume Gaps & Generate Optimizations
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Analysis Results View */}
      {analyzing ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="w-14 h-14 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="space-y-1">
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              Evaluating Resume Against Job Description...
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Scanning candidate technical competencies, seniority depth, and formulating metric-driven bullet rewrites.
            </p>
          </div>
        </div>
      ) : analysisResult ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Score & Gap Overview Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              {/* Circular Score Gauge */}
              <div className="flex items-center gap-6">
                <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="10"
                      fill="transparent"
                      className="text-slate-100 dark:text-slate-800"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 40}
                      strokeDashoffset={2 * Math.PI * 40 * (1 - matchScore / 100)}
                      strokeLinecap="round"
                      className={
                        matchScore >= 75
                          ? 'text-emerald-500 transition-all duration-700'
                          : matchScore >= 50
                          ? 'text-amber-500 transition-all duration-700'
                          : 'text-rose-500 transition-all duration-700'
                      }
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                      {matchScore}%
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400 mt-1">
                      Current ATS
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5 shadow-xs">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      Potential Score: {potentialScore}% ({analysisResult.projected_score_boost} Boost)
                    </span>
                    <Badge variant="primary" size="xs">
                      {analysisResult.target_job_title}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Target: {analysisResult.target_job_title} • {analysisResult.target_company}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Audited with: <strong>{analysisResult.resume_name}</strong>
                  </p>
                </div>
              </div>

              {/* Experience Gap Banner */}
              <div className="w-full lg:max-w-md p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                  <Briefcase className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>Experience & Seniority Gap Analysis</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  {analysisResult.experience_gap}
                </p>
              </div>
            </div>
          </div>

          {/* Missing Keywords & Skills Interactive Chips */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="space-y-0.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Missing ATS Keywords & Hard Skills
                </h4>
                <p className="text-[11px] text-slate-500">
                  Click any chip to see quick optimization instructions.
                </p>
              </div>
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                {analysisResult.missing_hard_skills.length} Hard Skill Voids Detected
              </span>
            </div>

            {/* Hard Skills Chips */}
            <div className="flex flex-wrap items-center gap-2">
              {analysisResult.missing_hard_skills.map((skill, sIdx) => {
                const isSelected = activeTooltipSkill === skill;
                return (
                  <button
                    key={sIdx}
                    onClick={() => setActiveTooltipSkill(isSelected ? null : skill)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                      isSelected
                        ? 'bg-rose-600 text-white border-rose-600 ring-2 ring-rose-500/20'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 hover:bg-rose-100'
                    }`}
                  >
                    <span>+ {skill}</span>
                  </button>
                );
              })}
            </div>

            {/* Clicked Skill Quick Tip Callout */}
            {activeTooltipSkill && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2 animate-in fade-in duration-150">
                <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">
                    Optimization Tip for "{activeTooltipSkill}":
                  </strong>
                  <span>
                    Add <strong>{activeTooltipSkill}</strong> into your Technical Skills section and weave it into at least 1 recent project bullet point with measurable business metrics.
                  </span>
                </div>
              </div>
            )}

            {/* Soft Skills & Matched Skills Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                  Expected Soft Skills / Methodologies:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {analysisResult.missing_soft_skills.map((soft, sIdx) => (
                    <span
                      key={sIdx}
                      className="px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-semibold"
                    >
                      {soft}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                  Successfully Matched Keywords:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(analysisResult.matched_skills || []).map((matched, mIdx) => (
                    <span
                      key={mIdx}
                      className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold flex items-center gap-1"
                    >
                      <Check className="w-3 h-3 text-emerald-600" />
                      {matched}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Tailored Optimization Suggestions (Tabs Container) */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            {/* Tab Navigation */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <button
                onClick={() => setActiveTab('rewrites')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'rewrites'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Bullet Point Rewrites (Before vs After)
              </button>

              <button
                onClick={() => setActiveTab('projects')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'projects'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Layers className="w-4 h-4" />
                Project & Architecture Tweaks ({analysisResult.project_recommendations.length})
              </button>

              <button
                onClick={() => setActiveTab('keywords')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'keywords'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Zap className="w-4 h-4" />
                Keyword Void Matrix
              </button>
            </div>

            {/* TAB 1: Bullet Point Rewrites (Before vs After) */}
            {activeTab === 'rewrites' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-500">
                  Replace weak or generic phrases with high-impact action verbs and quantified metrics to pass ATS filters and impress engineering managers.
                </p>

                <div className="space-y-4">
                  {analysisResult.bullet_point_rewrites.map((rewrite, rIdx) => {
                    const isCopied = copiedIndex === rIdx;
                    return (
                      <div
                        key={rIdx}
                        className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs"
                      >
                        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
                          {/* Original Bullet */}
                          <div className="p-4 sm:p-5 bg-slate-50/70 dark:bg-slate-850/60 space-y-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-slate-400" />
                              Original Phrase in Resume
                            </span>
                            <p className="text-xs text-slate-700 dark:text-slate-300 italic leading-relaxed">
                              "{rewrite.original}"
                            </p>
                          </div>

                          {/* AI-Optimized Bullet */}
                          <div className="p-4 sm:p-5 bg-gradient-to-br from-indigo-50/70 via-white to-violet-50/50 dark:from-slate-900 dark:via-slate-850 dark:to-indigo-950/30 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                                AI-Optimized with Metrics & Verbs
                              </span>
                              <button
                                onClick={() => handleCopyText(rewrite.optimized, rIdx)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                                  isCopied
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                                }`}
                              >
                                {isCopied ? (
                                  <>
                                    <Check className="w-3 h-3" />
                                    Copied!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    Copy Rewrite
                                  </>
                                )}
                              </button>
                            </div>
                            <p className="text-xs font-semibold text-slate-900 dark:text-white leading-relaxed">
                              "{rewrite.optimized}"
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: Project & Architecture Recommendations */}
            {activeTab === 'projects' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Targeted architectural enhancements to integrate into your featured projects section:
                </p>

                <div className="space-y-3">
                  {analysisResult.project_recommendations.map((rec, pIdx) => (
                    <div
                      key={pIdx}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex items-start gap-3 text-xs"
                    >
                      <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                        #{pIdx + 1}
                      </span>
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-900 dark:text-white leading-relaxed">
                          {rec}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: Keyword Void Matrix */}
            {activeTab === 'keywords' && (
              <div className="space-y-4 text-xs">
                <p className="text-slate-500">
                  Full list of hard skills, libraries, and frameworks detected in the job circular that are missing or underrepresented in your resume:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {analysisResult.missing_hard_skills.map((skill, kIdx) => (
                    <div
                      key={kIdx}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="font-bold text-slate-900 dark:text-white">{skill}</span>
                      </div>
                      <Badge variant="outline" size="xs" className="text-rose-600 border-rose-300">
                        Missing
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Footer */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                Ready to apply these improvements to your resume?
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRunAnalysis}
                  disabled={analyzing}
                  className="w-full sm:w-auto text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  Re-Analyze
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleOpenResumeBuilder}
                  className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  Apply in Live Resume Builder
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
