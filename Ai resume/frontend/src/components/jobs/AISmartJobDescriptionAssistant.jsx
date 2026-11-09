import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Zap,
  Wand2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sliders,
  DollarSign,
  Briefcase,
  Layers,
  ChevronDown,
  ChevronUp,
  FileText,
} from 'lucide-react';
import { jobService } from '../../services/jobService';

export default function AISmartJobDescriptionAssistant({
  jobTitle = '',
  skills = '',
  experienceLevel = 'MID',
  category = 'Software Engineering',
  workplaceType = 'ON_SITE',
  onApplyGenerated,
  // Backwards-compatibility props
  initialJobTitle = '',
  initialExperienceLevel = 'MID',
  initialCategory = 'Software Engineering',
  initialWorkplaceType = 'ON_SITE',
}) {
  // Use passed props, falling back to initials
  const currentTitle = jobTitle || initialJobTitle || '';
  const currentLevel = experienceLevel || initialExperienceLevel || 'MID';
  const currentCategory = category || initialCategory || 'Software Engineering';
  const currentWorkplace = workplaceType || initialWorkplaceType || 'ON_SITE';

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successResult, setSuccessResult] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Local overrides if user wants to tweak before generating
  const [customTitle, setCustomTitle] = useState(currentTitle);
  const [customSkills, setCustomSkills] = useState(skills);
  const [customLevel, setCustomLevel] = useState(currentLevel);
  const [customCategory, setCustomCategory] = useState(currentCategory);
  const [customWorkplace, setCustomWorkplace] = useState(currentWorkplace);

  // Keep synced with parent props if changed
  useEffect(() => {
    if (jobTitle !== undefined && jobTitle !== null) {
      setCustomTitle(jobTitle);
    }
  }, [jobTitle]);

  useEffect(() => {
    if (skills !== undefined && skills !== null) {
      setCustomSkills(skills);
    }
  }, [skills]);

  useEffect(() => {
    if (experienceLevel) setCustomLevel(experienceLevel);
  }, [experienceLevel]);

  useEffect(() => {
    if (category) setCustomCategory(category);
  }, [category]);

  useEffect(() => {
    if (workplaceType) setCustomWorkplace(workplaceType);
  }, [workplaceType]);

  const effectiveTitle = (customTitle || skills || '').trim();

  const handleGenerate = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const titleToUse = (customTitle || skills || '').trim();
    const skillsToUse = (customSkills || skills || '').trim();

    if (!titleToUse && !skillsToUse) {
      setErrorMsg('Please enter a Job Title or Required Skills (e.g. "Ai/LLm") to auto-draft.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const payload = {
        job_title: titleToUse || skillsToUse || 'Software Engineer',
        experience_level: customLevel,
        industry: customCategory || 'Software Engineering',
        keywords: skillsToUse || undefined,
        workplace_type: customWorkplace,
        tone: 'Professional',
      };

      const result = await jobService.generateAIJobDescription(payload);
      setSuccessResult(result);

      if (onApplyGenerated) {
        // Merge skills without duplicates
        const existingList = skillsToUse
          ? skillsToUse.split(',').map((s) => s.trim()).filter(Boolean)
          : [];
        const returnedList = result.required_skills || [];
        const mergedList = [
          ...existingList,
          ...returnedList.filter(
            (r) => !existingList.some((e) => e.toLowerCase() === r.toLowerCase())
          ),
        ];

        onApplyGenerated({
          title: titleToUse || result.job_title,
          description: result.full_formatted_description || result.role_overview,
          required_skills: mergedList,
          bonus_skills: result.bonus_skills || [],
          experience_years_required: result.experience_years || 2,
          min_salary: result.recommended_min_salary || 40000,
          max_salary: result.recommended_max_salary || 70000,
          salary_range: `৳${intFormat(result.recommended_min_salary)} - ৳${intFormat(result.recommended_max_salary)}`,
          suggested_benefits: result.suggested_benefits || [],
          experience_level: customLevel,
          workplace_type: customWorkplace,
        });
      }
    } catch (err) {
      console.error('Failed to generate AI job description:', err);
      setErrorMsg(
        err.response?.data?.detail ||
          'Gemini AI drafting failed. Please check inputs and retry.'
      );
    } finally {
      setLoading(false);
    }
  };

  const intFormat = (num) => {
    if (!num) return '0';
    return Math.round(Number(num)).toLocaleString();
  };

  return (
    <div className="mb-4 rounded-2xl border border-indigo-200 dark:border-indigo-800/70 bg-gradient-to-r from-indigo-50/90 via-purple-50/60 to-white dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-850 p-4 shadow-sm transition-all">
      {/* Compact Banner Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                AI Smart Job Description Generator
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 dark:bg-indigo-900/80 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-700">
                Gemini Pro
              </span>
              {effectiveTitle && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 truncate max-w-[180px]">
                  Target: {effectiveTitle}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
              Instantly draft a structured job description, responsibilities, technical skills, and salary benchmarks.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 text-white shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            id="btn-auto-draft-ai"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Drafting with Gemini...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span>Auto-Draft Description with Gemini AI</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 transition-colors"
            title={showAdvanced ? 'Hide tuning options' : 'Show AI tuning options'}
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="mt-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Optional Advanced Tuning Panel */}
      {showAdvanced && (
        <div className="mt-3.5 pt-3 border-t border-indigo-100 dark:border-indigo-900/50 grid grid-cols-1 sm:grid-cols-3 gap-2.5 animate-in fade-in text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Target Job Title
            </label>
            <input
              type="text"
              placeholder="e.g. Ai/LLm Engineer"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Keywords / Tech Stack
            </label>
            <input
              type="text"
              placeholder="e.g. Ai/LLm, Python, PyTorch"
              value={customSkills}
              onChange={(e) => setCustomSkills(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Experience Level
            </label>
            <select
              value={customLevel}
              onChange={(e) => setCustomLevel(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="ENTRY">Entry (0-2 yrs)</option>
              <option value="MID">Mid (2-4 yrs)</option>
              <option value="SENIOR">Senior (5+ yrs)</option>
              <option value="LEAD">Lead / Architect (7+ yrs)</option>
            </select>
          </div>
        </div>
      )}

      {/* Success Summary Pill */}
      {successResult && (
        <div className="mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-bold text-emerald-900 dark:text-emerald-200">
              Draft Populated: {successResult.responsibilities?.length || 5} duties, {successResult.required_skills?.length || 4} skills, benchmark ৳{intFormat(successResult.recommended_min_salary)}-৳{intFormat(successResult.recommended_max_salary)}
            </span>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            Regenerate
          </button>
        </div>
      )}
    </div>
  );
}
