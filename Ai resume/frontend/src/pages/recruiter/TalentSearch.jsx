import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Sparkles,
  SlidersHorizontal,
  UserCheck,
  Building2,
  Calendar,
  Clock,
  Video,
  MessageSquare,
  FileText,
  DollarSign,
  Award,
  Star,
  MapPin,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  X,
  Phone,
  Mail,
  Github,
  Briefcase,
  GraduationCap,
  FolderGit2,
  AlertCircle,
  RefreshCw,
  Send,
  Zap,
} from 'lucide-react';
import { jobService } from '../../services/jobService';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import { useNotifications } from '../../context/NotificationContext';
import { useLanguage } from '../../context/LanguageContext';

export default function TalentSearch() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { triggerToast } = useNotifications();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [minScore, setMinScore] = useState('');
  const [maxSalary, setMaxSalary] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [verifiedGithubOnly, setVerifiedGithubOnly] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Data State
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [totalCandidates, setTotalCandidates] = useState(0);
  const [parsedFilters, setParsedFilters] = useState(null);
  const [recruiterJobs, setRecruiterJobs] = useState([]);

  // Modals State
  const [dossierCandidate, setDossierCandidate] = useState(null);
  const [inviteCandidate, setInviteCandidate] = useState(null);
  const [submittingInvite, setSubmittingInvite] = useState(false);

  // Invite Form State
  const [inviteForm, setInviteForm] = useState({
    job_id: '',
    interview_title: '',
    scheduled_at: '',
    meeting_link: '',
    duration_minutes: 45,
    personal_note: '',
  });

  // Popular filter skills presets
  const popularSkills = ['FastAPI', 'Python', 'React', 'Node.js', 'TypeScript', 'Docker', 'PostgreSQL', 'Machine Learning'];

  // Fetch recruiter's existing jobs for the interview dropdown
  useEffect(() => {
    jobService
      .getJobs({ my_jobs: true })
      .then((data) => {
        const jobsList = Array.isArray(data) ? data : data?.items || [];
        setRecruiterJobs(jobsList);
      })
      .catch(() => setRecruiterJobs([]));
  }, []);

  // Main search function
  const handleSearch = useCallback(
    async (overrideParams = {}) => {
      setLoading(true);
      try {
        const payload = {
          query: overrideParams.query !== undefined ? overrideParams.query : searchQuery,
          min_score: overrideParams.minScore !== undefined ? (overrideParams.minScore ? Number(overrideParams.minScore) : null) : (minScore ? Number(minScore) : null),
          max_salary: overrideParams.maxSalary !== undefined ? (overrideParams.maxSalary ? Number(overrideParams.maxSalary) : null) : (maxSalary ? Number(maxSalary) : null),
          experience_years: overrideParams.experienceYears !== undefined ? (overrideParams.experienceYears ? Number(overrideParams.experienceYears) : null) : (experienceYears ? Number(experienceYears) : null),
          verified_github_only: overrideParams.verifiedGithubOnly !== undefined ? overrideParams.verifiedGithubOnly : verifiedGithubOnly,
          skills: overrideParams.skills !== undefined ? overrideParams.skills : (selectedSkills.length > 0 ? selectedSkills : null),
          page: 1,
          limit: 30,
        };

        const res = await jobService.searchTalentPool(payload);
        if (res && res.success) {
          setCandidates(res.candidates || []);
          setTotalCandidates(res.total || 0);
          setParsedFilters(res.parsed_filters || null);
        } else {
          setCandidates([]);
          setTotalCandidates(0);
          setParsedFilters(null);
        }
      } catch (err) {
        console.error('Talent search error:', err);
        triggerToast({
          type: 'error',
          title: 'Search Failed',
          message: err?.response?.data?.detail || 'Unable to retrieve talent records.',
        });
      } finally {
        setLoading(false);
      }
    },
    [searchQuery, minScore, maxSalary, experienceYears, verifiedGithubOnly, selectedSkills, triggerToast]
  );

  // Trigger search on mount
  useEffect(() => {
    handleSearch();
  }, []);

  // Quick preset pills handler
  const togglePresetPill = (type, value) => {
    if (type === 'minScore') {
      const newVal = minScore === value ? '' : value;
      setMinScore(newVal);
      handleSearch({ minScore: newVal });
    } else if (type === 'maxSalary') {
      const newVal = maxSalary === value ? '' : value;
      setMaxSalary(newVal);
      handleSearch({ maxSalary: newVal });
    } else if (type === 'verifiedGithub') {
      const newVal = !verifiedGithubOnly;
      setVerifiedGithubOnly(newVal);
      handleSearch({ verifiedGithubOnly: newVal });
    } else if (type === 'experience') {
      const newVal = experienceYears === value ? '' : value;
      setExperienceYears(newVal);
      handleSearch({ experienceYears: newVal });
    } else if (type === 'skill') {
      let newSkills;
      if (selectedSkills.includes(value)) {
        newSkills = selectedSkills.filter((s) => s !== value);
      } else {
        newSkills = [...selectedSkills, value];
      }
      setSelectedSkills(newSkills);
      handleSearch({ skills: newSkills });
    }
  };

  // Quick NL query examples
  const applyExampleQuery = (exampleText) => {
    setSearchQuery(exampleText);
    handleSearch({ query: exampleText });
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery('');
    setMinScore('');
    setMaxSalary('');
    setExperienceYears('');
    setVerifiedGithubOnly(false);
    setSelectedSkills([]);
    setParsedFilters(null);
    handleSearch({
      query: '',
      minScore: null,
      maxSalary: null,
      experienceYears: null,
      verifiedGithubOnly: false,
      skills: null,
    });
  };

  // Open Invite Modal
  const openInviteModal = (candidate) => {
    // Generate default meeting link
    const randomCode = Math.random().toString(36).substring(2, 6) + '-' + Math.random().toString(36).substring(2, 6);
    const defaultMeet = `https://meet.google.com/${randomCode}`;

    // Default scheduled time: tomorrow at 11:00 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(11, 0, 0, 0);
    const isoSchedule = tomorrow.toISOString().slice(0, 16);

    const defaultJob = recruiterJobs.length > 0 ? recruiterJobs[0].id : '';
    const defaultTitle = recruiterJobs.length > 0 ? recruiterJobs[0].title : (candidate.headline || 'Software Engineer');

    setInviteForm({
      job_id: defaultJob,
      interview_title: defaultTitle,
      scheduled_at: isoSchedule,
      meeting_link: defaultMeet,
      duration_minutes: 45,
      personal_note: `Hello ${candidate.full_name}, we reviewed your background and were impressed by your profile. We would like to invite you for a direct conversation regarding opportunities at our company.`,
    });
    setInviteCandidate(candidate);
  };

  // Submit Instant Interview Invite
  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteCandidate) return;

    if (!inviteForm.interview_title || !inviteForm.scheduled_at || !inviteForm.meeting_link) {
      triggerToast({
        type: 'error',
        title: 'Missing Fields',
        message: 'Please fill in interview title, schedule date/time, and meeting link.',
      });
      return;
    }

    setSubmittingInvite(true);
    try {
      const payload = {
        job_id: inviteForm.job_id ? Number(inviteForm.job_id) : null,
        interview_title: inviteForm.interview_title.trim(),
        scheduled_at: new Date(inviteForm.scheduled_at).toISOString(),
        meeting_link: inviteForm.meeting_link.trim(),
        duration_minutes: Number(inviteForm.duration_minutes) || 45,
        personal_note: inviteForm.personal_note.trim(),
      };

      const res = await jobService.sendInstantCandidateInvite(inviteCandidate.id, payload);
      triggerToast({
        type: 'success',
        title: 'Interview Dispatched!',
        message: `Interview invitation sent to ${inviteCandidate.full_name}. In-app inquiry created & WhatsApp/SMS alerts fired!`,
      });
      setInviteCandidate(null);
    } catch (err) {
      console.error('Invite dispatch error:', err);
      triggerToast({
        type: 'error',
        title: 'Dispatch Failed',
        message: err?.response?.data?.detail || 'Could not send interview invitation.',
      });
    } finally {
      setSubmittingInvite(false);
    }
  };

  // Helper to generate a new meeting link
  const regenerateMeetLink = () => {
    const code = Math.random().toString(36).substring(2, 6) + '-' + Math.random().toString(36).substring(2, 6);
    setInviteForm((prev) => ({ ...prev, meeting_link: `https://meet.google.com/${code}` }));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Hero & Title Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-xl border border-indigo-900/40">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-3 border border-indigo-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            Reverse Headhunting Engine
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
            Talent Search & Candidate Sourcing
          </h1>
          <p className="mt-2 text-base text-slate-300 leading-relaxed">
            Directly discover, inspect, and headhunt pre-assessed candidates with verified skills, test benchmarks, and salary compatibility — without waiting for inbound applications.
          </p>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Omni-Search Box & Facet Bar */}
      <Card className="p-5 shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="space-y-4"
        >
          {/* Main Input Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Search natural language e.g. "FastAPI developer score > 80% salary <= 50,000 BDT with 2+ years exp"'
                className="w-full pl-11 pr-24 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-12 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                  <Sparkles className="w-3 h-3" /> AI
                </span>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium shadow-sm transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Search Talent
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-4 py-3 border rounded-xl flex items-center gap-2 transition text-sm ${
                showAdvancedFilters
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30'
                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </Button>
          </div>

          {/* Quick Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-slate-400 dark:text-slate-500 font-medium mr-1">Quick Filters:</span>

            <button
              type="button"
              onClick={() => togglePresetPill('minScore', '80')}
              className={`px-3 py-1.5 rounded-lg border font-medium transition flex items-center gap-1.5 ${
                minScore === '80'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              Score 80%+
            </button>

            <button
              type="button"
              onClick={() => togglePresetPill('maxSalary', '50000')}
              className={`px-3 py-1.5 rounded-lg border font-medium transition flex items-center gap-1.5 ${
                maxSalary === '50000'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              Salary &le; ৳50,000
            </button>

            <button
              type="button"
              onClick={() => togglePresetPill('verifiedGithub')}
              className={`px-3 py-1.5 rounded-lg border font-medium transition flex items-center gap-1.5 ${
                verifiedGithubOnly
                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-purple-400'
              }`}
            >
              <Github className="w-3.5 h-3.5" />
              Verified GitHub Only
            </button>

            <button
              type="button"
              onClick={() => togglePresetPill('experience', '2')}
              className={`px-3 py-1.5 rounded-lg border font-medium transition flex items-center gap-1.5 ${
                experienceYears === '2'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              2+ Years Exp
            </button>

            {(searchQuery || minScore || maxSalary || experienceYears || verifiedGithubOnly || selectedSkills.length > 0) && (
              <button
                type="button"
                onClick={resetFilters}
                className="ml-auto px-2.5 py-1 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 font-medium transition flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                Clear All
              </button>
            )}
          </div>

          {/* Expandable Advanced Filters Drawer */}
          {showAdvancedFilters && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Min Assessment Score (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={minScore}
                  onChange={(e) => setMinScore(e.target.value)}
                  placeholder="e.g. 75"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Max Expected Salary (BDT)
                </label>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  value={maxSalary}
                  onChange={(e) => setMaxSalary(e.target.value)}
                  placeholder="e.g. 60000"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Min Experience (Years)
                </label>
                <input
                  type="number"
                  min="0"
                  max="25"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  placeholder="e.g. 3"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                  <input
                    type="checkbox"
                    checked={verifiedGithubOnly}
                    onChange={(e) => setVerifiedGithubOnly(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
                  />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Require Verified GitHub / Stars
                  </span>
                </label>
              </div>

              {/* Skills Presets Row */}
              <div className="sm:col-span-2 md:col-span-4 pt-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Filter by Specific Tech Stacks:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {popularSkills.map((sk) => {
                    const isSelected = selectedSkills.includes(sk);
                    return (
                      <button
                        key={sk}
                        type="button"
                        onClick={() => togglePresetPill('skill', sk)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium border transition ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                        }`}
                      >
                        {sk}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Semantic Natural Language Parser Insights Badge */}
        {parsedFilters && (
          <div className="mt-4 p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 rounded-xl text-xs text-indigo-900 dark:text-indigo-200 flex flex-wrap items-center gap-2">
            <span className="font-semibold flex items-center gap-1 text-indigo-700 dark:text-indigo-300">
              <Sparkles className="w-3.5 h-3.5" /> AI Query Understanding:
            </span>
            {parsedFilters.extracted_skills?.length > 0 && (
              <span className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                Skills: <strong>{parsedFilters.extracted_skills.join(', ')}</strong>
              </span>
            )}
            {parsedFilters.extracted_min_score !== null && parsedFilters.extracted_min_score !== undefined && (
              <span className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                Min Score: <strong>{parsedFilters.extracted_min_score}%</strong>
              </span>
            )}
            {parsedFilters.extracted_max_salary !== null && parsedFilters.extracted_max_salary !== undefined && (
              <span className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                Max Salary: <strong>৳{Number(parsedFilters.extracted_max_salary).toLocaleString()}</strong>
              </span>
            )}
            {parsedFilters.extracted_experience_years !== null && parsedFilters.extracted_experience_years !== undefined && (
              <span className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                Experience: <strong>{parsedFilters.extracted_experience_years}+ yrs</strong>
              </span>
            )}
          </div>
        )}
      </Card>

      {/* Suggested Prompt Inspiration */}
      {!searchQuery && candidates.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 px-1">
          <span className="font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-500" /> Try prompts:
          </span>
          <button
            type="button"
            onClick={() => applyExampleQuery('FastAPI and React engineer with assessment score > 75%')}
            className="hover:underline text-indigo-600 dark:text-indigo-400"
          >
            "FastAPI and React engineer with assessment score &gt; 75%"
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => applyExampleQuery('Python developer expected salary <= 50,000 BDT')}
            className="hover:underline text-indigo-600 dark:text-indigo-400"
          >
            "Python developer expected salary &le; 50,000 BDT"
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => applyExampleQuery('Full stack developer with verified GitHub')}
            className="hover:underline text-indigo-600 dark:text-indigo-400"
          >
            "Full stack developer with verified GitHub"
          </button>
        </div>
      )}

      {/* Results Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Available Candidate Dossiers
            <Badge variant="secondary" className="px-2 py-0.5 text-xs font-semibold">
              {totalCandidates} Found
            </Badge>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sorted by relevance, benchmark assessment rating, and skill match
          </p>
        </div>
      </div>

      {/* Candidate Discovery Cards Grid */}
      {loading ? (
        <div className="py-20 text-center space-y-4">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Evaluating candidate profiles, GitHub repositories, and skill benchmarks...
          </p>
        </div>
      ) : candidates.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 border-slate-200 dark:border-slate-800">
          <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            No Candidates Matched Your Criteria
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Try loosening the salary ceiling, lowering the minimum assessment score, or broadening the skill keywords.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={resetFilters}
            className="mt-4 text-xs"
          >
            Reset All Filters
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {candidates.map((cand) => {
            const hasScore = cand.avg_assessment_score > 0;
            const scoreColor =
              cand.avg_assessment_score >= 80
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                : cand.avg_assessment_score >= 60
                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800'
                : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';

            return (
              <Card
                key={cand.id}
                className="flex flex-col justify-between p-5 border border-slate-200 dark:border-slate-800 hover:shadow-md transition bg-white dark:bg-slate-900 rounded-xl"
              >
                <div className="space-y-4">
                  {/* Top Profile Header */}
                  <div className="flex items-start gap-3.5">
                    {cand.profile_picture ? (
                      <img
                        src={cand.profile_picture}
                        alt={cand.full_name}
                        className="w-13 h-13 rounded-full object-cover border-2 border-slate-100 dark:border-slate-800 shadow-sm flex-shrink-0"
                      />
                    ) : (
                      <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold flex items-center justify-center text-lg flex-shrink-0 shadow-sm">
                        {cand.full_name?.charAt(0)?.toUpperCase() || 'C'}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-slate-900 dark:text-white text-base truncate">
                          {cand.full_name}
                        </h3>
                        {cand.is_github_verified && (
                          <span title="Verified Developer & GitHub" className="text-emerald-500 flex-shrink-0">
                            <ShieldCheck className="w-4 h-4 fill-emerald-100 dark:fill-emerald-950" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium truncate mt-0.5">
                        {cand.headline || 'Software Engineer'}
                      </p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1 truncate">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        {cand.location || 'Dhaka, Bangladesh'}
                      </p>
                    </div>
                  </div>

                  {/* Benchmark Metrics Bar */}
                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                    {/* Assessment Score */}
                    <div className={`p-2 rounded-lg border flex flex-col justify-center ${scoreColor}`}>
                      <div className="flex items-center gap-1 text-[11px] opacity-80 font-medium">
                        <Award className="w-3 h-3" />
                        Skill Assessment
                      </div>
                      <div className="text-sm font-extrabold mt-0.5">
                        {hasScore ? `${cand.avg_assessment_score}%` : 'Not Assessed'}
                      </div>
                    </div>

                    {/* Expected Salary */}
                    <div className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 flex flex-col justify-center">
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                        <DollarSign className="w-3 h-3 text-emerald-500" />
                        Expected Salary
                      </div>
                      <div className="text-sm font-extrabold mt-0.5">
                        {cand.expected_salary
                          ? `৳${Number(cand.expected_salary).toLocaleString()}`
                          : 'Negotiable'}
                      </div>
                    </div>
                  </div>

                  {/* GitHub Profile & Stars indicator */}
                  {cand.github_username && (
                    <div className="flex items-center justify-between text-xs px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium truncate">
                        <Github className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">@{cand.github_username}</span>
                      </div>
                      {cand.github_stars > 0 && (
                        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          {cand.github_stars} stars
                        </span>
                      )}
                    </div>
                  )}

                  {/* AI Match Highlights */}
                  {cand.match_reasons?.length > 0 && (
                    <div className="space-y-1">
                      {cand.match_reasons.slice(0, 2).map((reason, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 font-medium"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          <span className="truncate">{reason}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Skills Cloud */}
                  {cand.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {cand.skills.slice(0, 5).map((sk, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[11px] font-medium"
                        >
                          {sk}
                        </span>
                      ))}
                      {cand.skills.length > 5 && (
                        <span className="px-1.5 py-0.5 text-slate-400 text-[10px] font-medium">
                          +{cand.skills.length - 5} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="pt-5 mt-5 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => openInviteModal(cand)}
                      className="flex-1 py-2 text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <Video className="w-3.5 h-3.5" />
                      Instant Invite
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate(`/messages?user=${cand.id}`)}
                      className="py-2 px-3 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5"
                      title="Direct Chat"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      Chat
                    </Button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDossierCandidate(cand)}
                    className="w-full text-center text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium py-1 transition flex items-center justify-center gap-1"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    View Full Dossier &amp; CV
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. INSTANT INTERVIEW INVITE MODAL                          */}
      {/* ========================================================= */}
      {inviteCandidate && (
        <Modal
          isOpen={Boolean(inviteCandidate)}
          onClose={() => !submittingInvite && setInviteCandidate(null)}
          title="Direct 1-Click Interview Invitation"
          size="lg"
        >
          <form onSubmit={handleSendInvite} className="space-y-4">
            {/* Candidate Header Snapshot */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
              {inviteCandidate.profile_picture ? (
                <img
                  src={inviteCandidate.profile_picture}
                  alt={inviteCandidate.full_name}
                  className="w-12 h-12 rounded-full object-cover border"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-lg">
                  {inviteCandidate.full_name?.charAt(0) || 'C'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                  {inviteCandidate.full_name}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {inviteCandidate.headline || 'Software Engineer'} • {inviteCandidate.email}
                </p>
                {inviteCandidate.phone && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3" />
                    Verified Mobile: {inviteCandidate.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Requisition Linking */}
            {recruiterJobs.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Associate with Job Requisition (Optional)
                </label>
                <select
                  value={inviteForm.job_id}
                  onChange={(e) => {
                    const jid = e.target.value;
                    const found = recruiterJobs.find((j) => String(j.id) === String(jid));
                    setInviteForm((prev) => ({
                      ...prev,
                      job_id: jid,
                      interview_title: found ? found.title : prev.interview_title,
                    }));
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">-- Direct Talent Headhunting (No specific posting) --</option>
                  {recruiterJobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title} ({j.company_name || 'My Company'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Interview Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Interview Title / Position *
              </label>
              <input
                type="text"
                required
                value={inviteForm.interview_title}
                onChange={(e) => setInviteForm((prev) => ({ ...prev, interview_title: e.target.value }))}
                placeholder="e.g. Senior Full-Stack Engineer Interview"
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Date, Time & Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Interview Date &amp; Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={inviteForm.scheduled_at}
                  onChange={(e) => setInviteForm((prev) => ({ ...prev, scheduled_at: e.target.value }))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Duration (Minutes)
                </label>
                <select
                  value={inviteForm.duration_minutes}
                  onChange={(e) => setInviteForm((prev) => ({ ...prev, duration_minutes: Number(e.target.value) }))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value={30}>30 Minutes</option>
                  <option value={45}>45 Minutes (Standard)</option>
                  <option value={60}>60 Minutes (In-Depth)</option>
                  <option value={90}>90 Minutes (Technical Deep Dive)</option>
                </select>
              </div>
            </div>

            {/* Video Meeting Link */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Video Meeting Link (Google Meet / Zoom) *
                </label>
                <button
                  type="button"
                  onClick={regenerateMeetLink}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  Generate New Meet Code
                </button>
              </div>
              <input
                type="url"
                required
                value={inviteForm.meeting_link}
                onChange={(e) => setInviteForm((prev) => ({ ...prev, meeting_link: e.target.value }))}
                placeholder="https://meet.google.com/xxx-xxxx-xxx"
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-xs"
              />
            </div>

            {/* Personal Note */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Personal Pitch / Note to Candidate
              </label>
              <textarea
                rows={3}
                value={inviteForm.personal_note}
                onChange={(e) => setInviteForm((prev) => ({ ...prev, personal_note: e.target.value }))}
                placeholder="We were impressed by your background and would love to discuss..."
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Automated Dispatch Notification Alert Callout */}
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
              <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Automated WhatsApp &amp; SMS Dispatch Alert</p>
                <p className="mt-0.5 text-[11px] opacity-90">
                  This invitation creates a formal calendar invite on the candidate&apos;s Recruiter Inquiries hub and fires an instant branded notification alert via WhatsApp and SMS directly to their phone.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={submittingInvite}
                onClick={() => setInviteCandidate(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={submittingInvite}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 flex items-center gap-2"
              >
                {submittingInvite ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Dispatching...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Dispatch Formal Invite
                  </>
                )}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================= */}
      {/* 2. CANDIDATE FULL DOSSIER MODAL                            */}
      {/* ========================================================= */}
      {dossierCandidate && (
        <Modal
          isOpen={Boolean(dossierCandidate)}
          onClose={() => setDossierCandidate(null)}
          title="Candidate Dossier & Verified CV Snapshot"
          size="xl"
        >
          <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
            {/* Top Profile Summary */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3.5">
                {dossierCandidate.profile_picture ? (
                  <img
                    src={dossierCandidate.profile_picture}
                    alt={dossierCandidate.full_name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500 shadow-sm"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold flex items-center justify-center text-2xl shadow-sm">
                    {dossierCandidate.full_name?.charAt(0) || 'C'}
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {dossierCandidate.full_name}
                    {dossierCandidate.is_github_verified && (
                      <ShieldCheck className="w-5 h-5 text-emerald-500 fill-emerald-100 dark:fill-emerald-950" />
                    )}
                  </h3>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                    {dossierCandidate.headline || 'Software Engineer'}
                  </p>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {dossierCandidate.location || 'Dhaka, Bangladesh'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    const target = dossierCandidate;
                    setDossierCandidate(null);
                    openInviteModal(target);
                  }}
                  className="flex-1 sm:flex-initial py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                >
                  <Video className="w-3.5 h-3.5" />
                  Instant Invite
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/messages?user=${dossierCandidate.id}`)}
                  className="py-2 text-xs flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Chat
                </Button>
              </div>
            </div>

            {/* Contact & Benchmark Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 block text-[11px]">Email Address</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                  {dossierCandidate.email}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 block text-[11px]">Phone / WhatsApp</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">
                  {dossierCandidate.phone || 'Available upon invite'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 block text-[11px]">Assessment Score</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm block mt-0.5">
                  {dossierCandidate.avg_assessment_score > 0
                    ? `${dossierCandidate.avg_assessment_score}%`
                    : 'N/A'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 block text-[11px]">Expected Salary</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm block mt-0.5">
                  {dossierCandidate.expected_salary
                    ? `৳${Number(dossierCandidate.expected_salary).toLocaleString()}`
                    : 'Negotiable'}
                </span>
              </div>
            </div>

            {/* Bio / Summary */}
            {dossierCandidate.bio && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Executive Summary / Bio
                </h4>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                  {dossierCandidate.bio}
                </p>
              </div>
            )}

            {/* Skills */}
            {dossierCandidate.skills?.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Verified Skills &amp; Competencies
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {dossierCandidate.skills.map((sk, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-md text-xs font-medium border border-indigo-100 dark:border-indigo-900"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Experience History */}
            {dossierCandidate.experience?.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" /> Work Experience
                </h4>
                <div className="space-y-2.5">
                  {dossierCandidate.experience.map((exp, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs"
                    >
                      <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                        <span>{exp.title || exp.role || 'Position'}</span>
                        <span className="text-[11px] font-normal text-slate-400">
                          {exp.startDate || exp.duration || ''} {exp.endDate ? `- ${exp.endDate}` : ''}
                        </span>
                      </div>
                      <div className="text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">
                        {exp.company || exp.organization || 'Company'}
                      </div>
                      {exp.description && (
                        <p className="mt-1 text-slate-600 dark:text-slate-400 leading-relaxed">
                          {exp.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Featured Projects */}
            {dossierCandidate.featured_projects?.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <FolderGit2 className="w-3.5 h-3.5" /> Featured Projects
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {dossierCandidate.featured_projects.map((proj, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                          <span>{proj.name || proj.title || 'Project'}</span>
                          {proj.url && (
                            <a
                              href={proj.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-600 hover:text-indigo-700"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                        {proj.description && (
                          <p className="mt-1 text-slate-600 dark:text-slate-400 text-[11px] line-clamp-2">
                            {proj.description}
                          </p>
                        )}
                      </div>
                      {proj.tech_stack && Array.isArray(proj.tech_stack) && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {proj.tech_stack.map((t, tidx) => (
                            <span
                              key={tidx}
                              className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-[10px]"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education History */}
            {dossierCandidate.education?.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5" /> Education
                </h4>
                <div className="space-y-2">
                  {dossierCandidate.education.map((edu, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs"
                    >
                      <div className="font-bold text-slate-900 dark:text-white">
                        {edu.degree || 'Degree'} {edu.field ? `in ${edu.field}` : ''}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                        {edu.institution || edu.school || 'University'} {edu.gradYear ? `(${edu.gradYear})` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
