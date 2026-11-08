import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Briefcase,
  Send,
  Bookmark,
  CheckCircle2,
  Building,
  MapPin,
  Clock,
  DollarSign,
  AlertCircle,
  LayoutGrid,
  List as ListIcon,
  Search,
  RefreshCw,
  ArrowRight,
  Upload,
  Laptop,
  Building2,
  Layers,
  Award,
  RotateCcw,
} from 'lucide-react';
import { jobService } from '../../services/jobService';
import { resumeService } from '../../services/resumeService';
import ApplicationEligibilityModal from '../../components/candidate/ApplicationEligibilityModal';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import ErrorBoundary from '../../components/ui/ErrorBoundary';
import { useNotifications } from '../../context/NotificationContext';

const JOB_CATEGORIES = [
  'All Categories',
  'Software Engineering',
  'AI / Machine Learning',
  'Data Science & Analytics',
  'UI/UX & Product Design',
  'Quality Assurance & Testing',
  'DevOps & Cloud Engineering',
  'Mobile App Development',
  'Cybersecurity & Networking',
  'Product & Project Management',
  'Database Administration',
  'IT & Tech Support',
];

const WORKPLACE_OPTIONS = [
  { id: 'ALL', label: 'All Models' },
  { id: 'REMOTE', label: 'Remote', icon: Laptop },
  { id: 'HYBRID', label: 'Hybrid', icon: Building2 },
  { id: 'ON_SITE', label: 'On-site', icon: MapPin },
];

const SALARY_PRESETS = [
  { label: 'Any Salary', value: 'ALL' },
  { label: '৳25k+', value: '25000' },
  { label: '৳40k+', value: '40000' },
  { label: '৳60k+', value: '60000' },
  { label: '৳100k+', value: '100000' },
];

export default function JobMatchFinder() {
  const [matchedJobs, setMatchedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedWorkplace, setSelectedWorkplace] = useState('ALL');
  const [selectedSalaryPreset, setSelectedSalaryPreset] = useState('ALL');
  const [savedJobs, setSavedJobs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('saved_jobs_ids') || '[]');
    } catch {
      return [];
    }
  });
  const [applyingJobId, setApplyingJobId] = useState(null);
  const [appliedJobIds, setAppliedJobIds] = useState([]);
  const [selectedJobForEligibility, setSelectedJobForEligibility] = useState(null);
  const [primaryResume, setPrimaryResume] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const { triggerToast } = useNotifications();

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [matchesRes, resumesRes] = await Promise.allSettled([
        jobService.getMatchedJobs(),
        resumeService.getResumes(),
      ]);

      if (resumesRes.status === 'fulfilled' && Array.isArray(resumesRes.value)) {
        const prim = resumesRes.value.find((r) => r.is_primary) || resumesRes.value[0];
        setPrimaryResume(prim);
      }

      if (matchesRes.status === 'fulfilled' && Array.isArray(matchesRes.value)) {
        setMatchedJobs(matchesRes.value);
      } else {
        setMatchedJobs([]);
      }
    } catch (err) {
      console.warn('Failed to get matched jobs, attempting standard job fallback:', err);
      // Fallback: If no resume uploaded or matching endpoint fails, fetch open jobs
      try {
        const standardJobs = await jobService.getJobs({ limit: 20 });
        if (Array.isArray(standardJobs) && standardJobs.length > 0) {
          const simulated = standardJobs.map((j) => ({
            job_id: j.id,
            id: j.id,
            title: j.title || 'Untitled Role',
            company_name: j.company_name || 'Organization',
            location: j.location || 'Remote',
            job_type: j.job_type ? String(j.job_type).replace('_', ' ') : 'Full-time',
            salary_range: j.salary_range || 'Competitive',
            match_score: 75.0,
            matched_skills: Array.isArray(j.required_skills) ? j.required_skills.slice(0, 3) : [],
            missing_skills: Array.isArray(j.required_skills) ? j.required_skills.slice(3) : [],
          }));
          setMatchedJobs(simulated);
        } else {
          setMatchedJobs([]);
          setErrorMsg('No open job requisitions currently available in the database.');
        }
      } catch (e2) {
        setMatchedJobs([]);
        setErrorMsg('Please upload a resume first to view AI-computed job matches.');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleSaveJob = (jobId) => {
    setSavedJobs((prev) => {
      const safePrev = Array.isArray(prev) ? prev : [];
      const next = safePrev.includes(jobId)
        ? safePrev.filter((id) => id !== jobId)
        : [...safePrev, jobId];
      try {
        localStorage.setItem('saved_jobs_ids', JSON.stringify(next));
      } catch (e) {
        console.error('Failed to save to localStorage', e);
      }
      return next;
    });
  };

  const handleOpenApplyCheck = (job) => {
    setSelectedJobForEligibility(job);
  };

  const handleEligibilityConfirm = async (salary) => {
    if (!selectedJobForEligibility) return;
    const j = selectedJobForEligibility;
    setSelectedJobForEligibility(null);
    handleOneClickApply(j.id, j.title, salary);
  };

  const handleOneClickApply = async (jobId, jobTitle, expectedSalary = null) => {
    setApplyingJobId(jobId);
    try {
      const payload = expectedSalary ? { expected_salary: expectedSalary } : {};
      const res = await jobService.oneClickApply(jobId, payload);
      setAppliedJobIds((prev) => [...(Array.isArray(prev) ? prev : []), jobId]);
      if (triggerToast) {
        triggerToast({
          id: Date.now(),
          title: 'Application Submitted!',
          message: `Your 1-click application for '${jobTitle}' was successfully received (Expected: ৳${expectedSalary ? Number(expectedSalary).toLocaleString() : 'Negotiable'}).`,
          type: 'JOB',
        });
      }
    } catch (err) {
      console.error('Apply error:', err);
      const detail =
        err?.response?.data?.detail || 'Application failed. Make sure you have a primary resume uploaded.';
      alert(detail);
    } finally {
      setApplyingJobId(null);
    }
  };

  const getScoreBadge = (score) => {
    const safeScore = Number.isFinite(score) ? Math.round(score) : 70;
    if (safeScore >= 80) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
          <Sparkles className="w-3 h-3 text-emerald-600" />
          {safeScore}% ATS Match
        </span>
      );
    }
    if (safeScore >= 60) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
          <Sparkles className="w-3 h-3 text-amber-600" />
          {safeScore}% ATS Match
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
        <AlertCircle className="w-3 h-3 text-rose-600" />
        {safeScore}% ATS Match
      </span>
    );
  };

  // Safe normalizer supporting flat and nested structures
  const normalizeJobItem = (item) => {
    if (!item) return null;
    const innerJob = item.job || {};
    const id = item.job_id || innerJob.id || item.id || 0;
    const title = item.title || innerJob.title || 'Untitled Role';
    const company_name = item.company_name || innerJob.company_name || 'Organization';
    const location = item.location || innerJob.location || 'Remote';
    const rawJobType = item.job_type || innerJob.job_type || 'Full Time';
    const job_type = typeof rawJobType === 'string' ? rawJobType.replace('_', ' ') : String(rawJobType);
    const salary_range = item.salary_range || innerJob.salary_range || null;
    const match_score = typeof item.match_score === 'number' ? item.match_score : 70.0;
    const matched_skills = Array.isArray(item.matched_skills)
      ? item.matched_skills
      : Array.isArray(innerJob.required_skills)
      ? innerJob.required_skills.slice(0, 3)
      : [];
    const missing_skills = Array.isArray(item.missing_skills)
      ? item.missing_skills
      : Array.isArray(innerJob.required_skills)
      ? innerJob.required_skills.slice(3)
      : [];

    const category = item.category || innerJob.category || 'Software Engineering';
    const workplace_type = (item.workplace_type || innerJob.workplace_type || 'ON_SITE').toUpperCase();
    const min_salary = item.min_salary !== undefined ? item.min_salary : innerJob.min_salary;
    const max_salary = item.max_salary !== undefined ? item.max_salary : innerJob.max_salary;
    const is_salary_negotiable = Boolean(item.is_salary_negotiable ?? innerJob.is_salary_negotiable);
    const experience_years_required = item.experience_years_required ?? innerJob.experience_years_required ?? 0;

    return {
      id,
      title,
      company_name,
      location,
      job_type,
      salary_range,
      category,
      workplace_type,
      min_salary,
      max_salary,
      is_salary_negotiable,
      experience_years_required,
      match_score,
      matched_skills,
      missing_skills,
    };
  };

  const normalizedJobs = (Array.isArray(matchedJobs) ? matchedJobs : [])
    .map(normalizeJobItem)
    .filter(Boolean);

  // Filter based on search query, category, workplace type, and salary
  const filteredJobs = normalizedJobs.filter((j) => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (q) {
      const matchQ =
        (j.title || '').toLowerCase().includes(q) ||
        (j.company_name || '').toLowerCase().includes(q) ||
        (j.location || '').toLowerCase().includes(q) ||
        (j.category || '').toLowerCase().includes(q);
      if (!matchQ) return false;
    }

    if (selectedCategory && selectedCategory !== 'All Categories') {
      if ((j.category || '').toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }
    }

    if (selectedWorkplace && selectedWorkplace !== 'ALL') {
      if (j.workplace_type !== selectedWorkplace) {
        return false;
      }
    }

    if (selectedSalaryPreset && selectedSalaryPreset !== 'ALL') {
      const targetMin = parseFloat(selectedSalaryPreset);
      const jMin = j.min_salary !== null && j.min_salary !== undefined ? Number(j.min_salary) : null;
      const jMax = j.max_salary !== null && j.max_salary !== undefined ? Number(j.max_salary) : null;
      if (!j.is_salary_negotiable) {
        if (jMax !== null && jMax < targetMin) return false;
        if (jMin !== null && jMin < targetMin && jMax === null) return false;
      }
    }

    return true;
  });

  return (
    <ErrorBoundary title="Failed to load Job Matches">
      <div className="space-y-6">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Find Perfect Job Matches
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Real-time multi-factor ATS ranking computed against your active primary resume.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search title, company, or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48 sm:w-64"
              />
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchMatches}
              disabled={loading}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Refresh AI Matches"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="List View"
              >
                <ListIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* BDjobs Filter Strip */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Category Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-indigo-500" /> Category:
              </span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {JOB_CATEGORIES.map((cat, idx) => (
                  <option key={idx} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Workplace Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Laptop className="w-3.5 h-3.5 text-indigo-500" /> Workplace:
              </span>
              {WORKPLACE_OPTIONS.map((wp) => {
                const Icon = wp.icon;
                const active = selectedWorkplace === wp.id;
                return (
                  <button
                    key={wp.id}
                    type="button"
                    onClick={() => setSelectedWorkplace(wp.id)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                      active
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {Icon && <Icon className="w-3 h-3" />}
                    {wp.label}
                  </button>
                );
              })}
            </div>

            {/* Salary Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Salary:
              </span>
              {SALARY_PRESETS.map((preset, idx) => {
                const active = selectedSalaryPreset === preset.value;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedSalaryPreset(preset.value)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                      active
                        ? 'bg-emerald-600 text-white shadow-xs font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Reset Filters button */}
            {(selectedCategory !== 'All Categories' || selectedWorkplace !== 'ALL' || selectedSalaryPreset !== 'ALL' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('All Categories');
                  setSelectedWorkplace('ALL');
                  setSelectedSalaryPreset('ALL');
                  setSearchQuery('');
                }}
                className="py-1 px-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl hover:bg-rose-100 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Informational banner if error or fallback */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <Link to="/resumes">
              <Button size="sm" variant="outline" className="border-amber-300 dark:border-amber-700 text-xs py-1">
                <Upload className="w-3.5 h-3.5 mr-1" /> Upload / Select Primary CV
              </Button>
            </Link>
          </div>
        )}

        {/* Main Jobs Listing */}
        {loading ? (
          <div className="text-center py-20 text-xs text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="w-9 h-9 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">Computing Live ATS Semantic Match Vectors...</p>
            <p className="text-[11px] text-slate-400 mt-1">Cross-analyzing skills, experience, and circular qualifications</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Briefcase className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              {searchQuery ? `No jobs matching "${searchQuery}"` : 'No Matched Jobs Found Yet'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-md mx-auto">
              {searchQuery
                ? 'Try using broader keywords or clearing your active search filter.'
                : 'Upload or update your primary resume with skills to generate tailored job match vectors.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              {searchQuery && (
                <Button variant="secondary" size="sm" onClick={() => setSearchQuery('')}>
                  Clear Search Filter
                </Button>
              )}
              <Link to="/jobs">
                <Button variant="outline" size="sm">
                  Browse All Open Jobs
                </Button>
              </Link>
              <Link to="/resumes">
                <Button variant="primary" size="sm">
                  Go to Resume Center
                </Button>
              </Link>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          /* GRID VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredJobs.map((j) => {
              const isSaved = (savedJobs || []).includes(j.id);
              const isApplied = (appliedJobIds || []).includes(j.id);
              const isApplying = applyingJobId === j.id;

              return (
                <div
                  key={j.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      {getScoreBadge(j.match_score)}
                      <button
                        onClick={() => toggleSaveJob(j.id)}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          isSaved
                            ? 'border-indigo-500 text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40'
                            : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-indigo-600'
                        }`}
                        title={isSaved ? 'Bookmarked' : 'Save Job'}
                      >
                        <Bookmark className="w-4 h-4 fill-current" />
                      </button>
                    </div>

                    <Link to={`/jobs/${j.id}`}>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug">
                        {j.title}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      <Link
                        to={`/company/${j.posted_by_user_id || encodeURIComponent(j.company_name)}`}
                        className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
                        title="View verified company profile and openings"
                      >
                        {j.company_name}
                      </Link>
                    </div>

                    {/* BDjobs Badges Row */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                          j.workplace_type === 'REMOTE'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                            : j.workplace_type === 'HYBRID'
                            ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-300 dark:border-sky-700'
                            : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {j.workplace_type === 'REMOTE' ? (
                          <Laptop className="w-2.5 h-2.5" />
                        ) : j.workplace_type === 'HYBRID' ? (
                          <Building2 className="w-2.5 h-2.5" />
                        ) : (
                          <MapPin className="w-2.5 h-2.5" />
                        )}
                        {j.workplace_type === 'REMOTE' ? 'Remote' : j.workplace_type === 'HYBRID' ? 'Hybrid' : 'On-site'}
                      </span>

                      {j.category && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                          {j.category}
                        </span>
                      )}

                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                        <DollarSign className="w-2.5 h-2.5 text-emerald-500" />
                        {j.is_salary_negotiable && !j.min_salary
                          ? 'Negotiable'
                          : j.min_salary && j.max_salary
                          ? `৳${Number(j.min_salary).toLocaleString()} - ৳${Number(j.max_salary).toLocaleString()}`
                          : j.salary_range || 'Negotiable'}
                      </span>

                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                        <Award className="w-2.5 h-2.5 text-amber-500" />
                        {j.experience_years_required > 0 ? `${j.experience_years_required}+ Yrs Exp` : 'Fresher / 0 Yrs'}
                      </span>
                    </div>

                    {/* Skills Section */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      {j.matched_skills && j.matched_skills.length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                            Matched Skills ({j.matched_skills.length})
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {j.matched_skills.slice(0, 5).map((s, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                              >
                                ✓ {s}
                              </span>
                            ))}
                            {j.matched_skills.length > 5 && (
                              <span className="text-[10px] text-slate-400 self-center">
                                +{j.matched_skills.length - 5} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {j.missing_skills && j.missing_skills.length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block mb-1">
                            Missing Skills ({j.missing_skills.length})
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {j.missing_skills.slice(0, 4).map((s, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"
                              >
                                ✕ {s}
                              </span>
                            ))}
                            {j.missing_skills.length > 4 && (
                              <span className="text-[10px] text-slate-400 self-center">
                                +{j.missing_skills.length - 4} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    {isApplied ? (
                      <div className="w-full py-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-4 h-4" />
                        Applied Successfully
                      </div>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenApplyCheck(j)}
                        disabled={isApplying}
                        className="w-full flex items-center justify-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 font-semibold"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {isApplying ? 'Submitting Application...' : '1-Click Apply with AI Resume'}
                      </Button>
                    )}

                    <Link to={`/jobs/${j.id}`} className="block">
                      <Button variant="ghost" size="sm" className="w-full text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center gap-1">
                        View Role Details <ArrowRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* COMPACT LIST VIEW */
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 shadow-sm overflow-hidden">
            {filteredJobs.map((j) => {
              const isSaved = (savedJobs || []).includes(j.id);
              const isApplied = (appliedJobIds || []).includes(j.id);
              const isApplying = applyingJobId === j.id;

              return (
                <div
                  key={j.id}
                  className="p-4 sm:p-5 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2.5">
                      <Link to={`/jobs/${j.id}`}>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                          {j.title}
                        </h3>
                      </Link>
                      {getScoreBadge(j.match_score)}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                      <span className="font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-1 mr-1">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        <Link
                          to={`/company/${j.posted_by_user_id || encodeURIComponent(j.company_name)}`}
                          className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
                          title="View verified company profile and openings"
                        >
                          {j.company_name}
                        </Link>
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {j.workplace_type === 'REMOTE' ? 'Remote' : j.workplace_type === 'HYBRID' ? 'Hybrid' : 'On-site'}
                      </span>
                      {j.category && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                          {j.category}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                        {j.is_salary_negotiable && !j.min_salary
                          ? 'Negotiable'
                          : j.min_salary && j.max_salary
                          ? `৳${Number(j.min_salary).toLocaleString()} - ৳${Number(j.max_salary).toLocaleString()}`
                          : j.salary_range || 'Negotiable'}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                        {j.experience_years_required > 0 ? `${j.experience_years_required}+ Yrs Exp` : 'Fresher / 0 Yrs'}
                      </span>
                    </div>

                    {/* Missing skills chip preview */}
                    {j.missing_skills && j.missing_skills.length > 0 && (
                      <div className="flex items-center gap-1.5 text-xs pt-1">
                        <span className="text-[10px] uppercase font-bold text-rose-500">
                          Missing:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {j.missing_skills.slice(0, 4).map((s, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                            >
                              {s}
                            </span>
                          ))}
                          {j.missing_skills.length > 4 && (
                            <span className="text-[10px] text-slate-400">
                              +{j.missing_skills.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => toggleSaveJob(j.id)}
                      className={`p-2 rounded-xl border transition-colors ${
                        isSaved
                          ? 'border-indigo-500 text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40'
                          : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-indigo-600'
                      }`}
                      title={isSaved ? 'Bookmarked' : 'Save Job'}
                    >
                      <Bookmark className="w-4 h-4 fill-current" />
                    </button>

                    <Link to={`/jobs/${j.id}`}>
                      <Button variant="outline" size="sm" className="text-xs">
                        Details
                      </Button>
                    </Link>

                    {isApplied ? (
                      <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Applied
                      </div>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenApplyCheck(j)}
                        disabled={isApplying}
                        className="flex items-center gap-1.5 text-xs font-semibold"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {isApplying ? 'Applying...' : '1-Click Apply'}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Application Eligibility Gatekeeper & Salary Modal */}
        <ApplicationEligibilityModal
          isOpen={Boolean(selectedJobForEligibility)}
          onClose={() => setSelectedJobForEligibility(null)}
          job={selectedJobForEligibility}
          resume={primaryResume}
          actionType="apply"
          onConfirm={handleEligibilityConfirm}
          isSubmitting={Boolean(applyingJobId)}
        />
      </div>
    </ErrorBoundary>
  );
}
