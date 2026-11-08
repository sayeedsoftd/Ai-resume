import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  UserCheck,
  Briefcase,
  Award,
  Calendar,
  Mail,
  Phone,
  Eye,
  Filter,
  Trash2,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  EyeOff,
  User,
  ArrowRight,
  ExternalLink,
  Clock,
  CheckCircle2,
  Search,
  RotateCcw,
  DollarSign,
  Zap,
  Video,
  Star,
  FileText,
} from 'lucide-react';
import { jobService } from '../../services/jobService';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import { useNotifications } from '../../context/NotificationContext';
import ApplicantDossierModal from '../../components/recruiter/ApplicantDossierModal';
import SendMessageModal from '../../components/recruiter/SendMessageModal';
import ScheduleInterviewModal from '../../components/recruiter/ScheduleInterviewModal';
import SalaryBenchmarkWidget from '../../components/recruiter/SalaryBenchmarkWidget';
import OfferLetterModal from '../../components/recruiter/OfferLetterModal';
import {
  getAnonymousCandidateId,
  maskCandidateDetails,
  getSavedBlindHiringPreference,
  saveBlindHiringPreference,
} from '../../utils/blindHiring';

export default function ShortlistedCandidates() {
  const navigate = useNavigate();
  const { triggerToast } = useNotifications();

  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('ALL');
  const [selectedSalaryFit, setSelectedSalaryFit] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [inspectingAppId, setInspectingAppId] = useState(null);
  const [blindHiringActive, setBlindHiringActive] = useState(() =>
    getSavedBlindHiringPreference(true)
  );

  // Quick Action Modals
  const [removingCandidate, setRemovingCandidate] = useState(null);
  const [submittingRemove, setSubmittingRemove] = useState(false);
  const [emailModalCandidate, setEmailModalCandidate] = useState(null);
  const [offeringCandidate, setOfferingCandidate] = useState(null);

  // Schedule Interview Direct State
  const [schedulingCandidate, setSchedulingCandidate] = useState(null);
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('11:00 AM');
  const [meetingLink, setMeetingLink] = useState('https://meet.google.com/');
  const [recruiterNote, setRecruiterNote] = useState('');
  const [submittingSchedule, setSubmittingSchedule] = useState(false);

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    loadShortlisted();
  }, [selectedJobId, selectedSalaryFit, blindHiringActive]);

  const loadJobs = async () => {
    try {
      const data = await jobService.getMyPostedJobs();
      setJobs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Could not load recruiter jobs filter', err);
    }
  };

  const loadShortlisted = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedJobId !== 'ALL') {
        params.job_id = selectedJobId;
      }
      if (selectedSalaryFit !== 'ALL') {
        params.salary_fit = selectedSalaryFit;
      }
      if (blindHiringActive) {
        params.blind_mode = true;
      }
      const data = await jobService.getShortlistedCandidates(params);
      setCandidates(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load shortlisted candidates', err);
      triggerToast({
        id: Date.now(),
        title: 'Error loading shortlisted talent',
        message: err.response?.data?.detail || 'Unable to retrieve shortlisted candidates.',
        type: 'ERROR',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBlindHiring = () => {
    const next = !blindHiringActive;
    setBlindHiringActive(next);
    saveBlindHiringPreference(next);
    triggerToast({
      id: Date.now(),
      title: next ? '🛡️ Anti-Bias Mode Active' : 'Anti-Bias Mode Disabled',
      message: next
        ? 'Personal candidate demographics are masked for objective review.'
        : 'Candidate real names and personal information are visible.',
      type: 'JOB',
    });
  };

  const handleConfirmRemove = async () => {
    if (!removingCandidate) return;
    setSubmittingRemove(true);
    try {
      // Revert status to SCREENING so candidate is no longer shortlisted
      await jobService.updateApplicationStatus(removingCandidate.application_id, 'SCREENING');
      setCandidates((prev) =>
        prev.filter((c) => c.application_id !== removingCandidate.application_id)
      );
      triggerToast({
        id: Date.now(),
        title: 'Removed from Shortlist',
        message: `${removingCandidate.candidate_name} has been moved back to screening evaluation.`,
        type: 'JOB',
      });
      setRemovingCandidate(null);
    } catch (err) {
      console.error('Failed to remove from shortlist', err);
      alert(err.response?.data?.detail || 'Could not update applicant status.');
    } finally {
      setSubmittingRemove(false);
    }
  };

  const handleOpenEmailModal = (cand) => {
    if (!cand) return;
    setEmailModalCandidate(cand);
  };

  const handleSendMessage = (candidate) => {
    if (!candidate) return;
    setEmailModalCandidate(candidate);
  };

  const handleOpenScheduleModal = (cand) => {
    setSchedulingCandidate(cand);
  };

  const handleInterviewScheduled = (updatedCand) => {
    setCandidates((prev) =>
      prev.map((c) =>
        c.application_id === updatedCand.application_id
          ? {
              ...c,
              status: 'INTERVIEW',
              interview_date: updatedCand.interview_date,
              interview_time: updatedCand.interview_time,
              meeting_link: updatedCand.meeting_link,
            }
          : c
      )
    );
  };

  const handleDecisionMadeFromDossier = (updatedApp) => {
    if (!updatedApp) return;
    loadShortlisted();
  };

  // Filter candidates by search query
  const filteredCandidates = candidates.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.candidate_name?.toLowerCase().includes(q) ||
      c.job_title?.toLowerCase().includes(q) ||
      c.candidate_email?.toLowerCase().includes(q) ||
      c.company_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-900">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  ⭐ Shortlisted Talent Pool
                </h1>
                <Badge variant="verified" className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
                  {candidates.length} Shortlisted
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage high-performing applicants across all job circulars who passed benchmarks.
              </p>
            </div>
          </div>
        </div>

        {/* Right Action Tools: Blind Hiring Toggle & Quick Dashboard Link */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Anti-Bias Mode Toggle */}
          <div className="p-2 px-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-indigo-200/60 dark:border-indigo-900/40 flex items-center gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              {blindHiringActive ? (
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <EyeOff className="w-4 h-4 text-slate-400" />
              )}
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Anti-Bias Mode
              </span>
              <span className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                blindHiringActive
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
              }`}>
                {blindHiringActive ? 'ON' : 'OFF'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleToggleBlindHiring}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                blindHiringActive ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
              title="Toggle Blind Hiring Anti-Bias Mode"
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  blindHiringActive ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <Link to="/recruiter">
            <Button variant="secondary" size="sm" className="text-xs flex items-center gap-1.5 font-bold">
              <Briefcase className="w-3.5 h-3.5" />
              All Job Requisitions
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
              Job Requisition:
            </span>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="w-full sm:w-56 px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="ALL">All Requisitions ({jobs.length})</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} ({j.applicant_count || 0} applicants)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500 shrink-0 ml-1" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
              Salary Fit:
            </span>
            <select
              value={selectedSalaryFit}
              onChange={(e) => setSelectedSalaryFit(e.target.value)}
              className="w-full sm:w-56 px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              <option value="ALL">All Budgets</option>
              <option value="WITHIN_BUDGET">💰 Within Budget Only</option>
              <option value="JUSTIFIED">✨ High-Value Justified Talents</option>
              <option value="ABOVE_BUDGET">⚠️ Above Budget</option>
            </select>
          </div>
        </div>

        {/* Candidate Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search candidate name or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          />
        </div>
      </div>

      {/* Anti-Bias Notice Banner when Active */}
      {blindHiringActive && (
        <div className="p-3 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/20 text-xs flex items-center justify-between gap-3 text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-xs">
              <strong>Anti-Bias Filter Active:</strong> Candidate personal demographics, contact identifiers, and institution names are masked to prevent unconscious hiring bias.
            </span>
          </div>
          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 shrink-0">
            Merit First
          </span>
        </div>
      )}

      {/* Candidates List / Grid */}
      {loading ? (
        <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-500">Loading shortlisted candidates...</p>
        </div>
      ) : filteredCandidates.length === 0 ? (
        /* Empty State */
        <div className="text-center py-20 px-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-500 flex items-center justify-center mx-auto">
            <UserCheck className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No candidates shortlisted yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Review applicant tests and shortlist qualified talent from the Recruiter Dashboard to build your vetted candidate pool.
            </p>
          </div>
          <Link to="/recruiter" className="inline-block pt-2">
            <Button variant="primary" size="sm" className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Go to Recruiter Dashboard
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCandidates.map((cand) => {
            const atsScore = cand.ats_score ? Math.round(cand.ats_score) : 0;
            const testScore = cand.stage1_score !== null && cand.stage1_score !== undefined
              ? Math.round(cand.stage1_score)
              : null;

            return (
              <div
                key={cand.application_id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                {/* Top Section: Avatar & Details */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                        blindHiringActive
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                          : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                      }`}>
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                            {cand.candidate_name}
                          </h4>
                          {blindHiringActive && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              Anti-Bias
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                          <Mail className="w-3 h-3" />
                          <span className="truncate max-w-[180px]">{cand.candidate_email}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shrink-0">
                      {cand.status}
                    </span>
                  </div>

                  {/* Target Job Requisition Badge */}
                  <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <Briefcase className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {cand.job_title}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                      {cand.company_name}
                    </span>
                  </div>

                  {/* Performance Metrics: ATS Score, Exam Score & Oral Viva */}
                  <div className={`grid ${cand.viva_score != null ? 'grid-cols-3' : 'grid-cols-2'} gap-2 pt-1`}>
                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 text-center">
                      <span className="text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-400 block">
                        ATS Match
                      </span>
                      <span className="text-base font-black text-emerald-600 dark:text-emerald-300">
                        {atsScore}%
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/80 text-center">
                      <span className="text-[10px] font-bold uppercase text-indigo-800 dark:text-indigo-400 block">
                        Screening Exam
                      </span>
                      <span className="text-base font-black text-indigo-600 dark:text-indigo-300">
                        {testScore !== null ? `${testScore}%` : 'Pending'}
                      </span>
                    </div>

                    {cand.viva_score != null && (
                      <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/80 text-center">
                        <span className="text-[10px] font-bold uppercase text-purple-800 dark:text-purple-400 block">
                          AI Viva
                        </span>
                        <span className="text-base font-black text-purple-600 dark:text-purple-300">
                          {Math.round(cand.viva_score)}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Adaptive Demonstrated Ceiling Pill */}
                  {cand.adaptive_ability_rating && (
                    <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-between text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                        <Zap className="w-3 h-3 text-indigo-600" /> Ceiling:
                      </span>
                      <span className="font-extrabold text-[11px] text-indigo-950 dark:text-indigo-200">
                        {cand.adaptive_ability_rating} {cand.adaptive_theta_score ? `(θ ${cand.adaptive_theta_score.toFixed(0)})` : ''}
                      </span>
                    </div>
                  )}

                  {/* 60s Video Elevator Pitch Pill */}
                  {cand.video_pitch_url && (
                    <div className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center justify-between text-xs">
                      <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1">
                        <Video className="w-3 h-3 text-rose-500" /> Elevator Pitch:
                      </span>
                      <span className="font-extrabold text-[10px] text-rose-700 dark:text-rose-300">
                        🎥 60s Pitch Available
                      </span>
                    </div>
                  )}

                  {/* Hiring Committee Team Rating & Consensus Pill */}
                  {cand.average_rating != null && cand.total_evaluators > 0 && (
                    <div className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-center justify-between text-xs">
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> Team Consensus:
                      </span>
                      <span className="font-extrabold text-[10px] text-amber-900 dark:text-amber-200 flex items-center gap-1">
                        {cand.average_rating}★ ({cand.total_evaluators} {cand.total_evaluators === 1 ? 'Review' : 'Reviews'}) &bull;{' '}
                        {cand.hiring_consensus === 'STRONG_HIRE'
                          ? 'Strong Hire'
                          : cand.hiring_consensus === 'HIRE'
                          ? 'Hire'
                          : cand.hiring_consensus === 'NEUTRAL'
                          ? 'Neutral'
                          : cand.hiring_consensus === 'REJECT'
                          ? 'Reject'
                          : cand.hiring_consensus}
                      </span>
                    </div>
                  )}

                  {/* Expected Salary & AI Budget Fit Benchmark */}
                  {cand.expected_salary != null && (
                    <div className="pt-1">
                      <SalaryBenchmarkWidget
                        expectedSalary={cand.expected_salary}
                        jobMinSalary={null}
                        jobMaxSalary={cand.salary_budget_diff ? cand.expected_salary - cand.salary_budget_diff : null}
                        salaryFitStatus={cand.salary_fit_status || cand.salary_budget_status}
                        benchmarkAnalysis={cand.ai_salary_benchmark_analysis}
                        compact={true}
                      />
                    </div>
                  )}

                  {/* Proctoring / Suspicion Warning if Flagged */}
                  {cand.is_suspicious && (
                    <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-[11px] text-rose-800 dark:text-rose-300 flex items-center justify-between gap-1 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        Proctoring Alert Flagged
                      </span>
                      <span className="text-[10px] font-black bg-rose-200 dark:bg-rose-900 px-1.5 py-0.5 rounded">
                        Switches: {cand.tab_switch_count}
                      </span>
                    </div>
                  )}

                  {/* Interview Status info if scheduled */}
                  {cand.interview_date && (
                    <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-[11px] text-purple-900 dark:text-purple-300 flex items-center justify-between">
                      <span className="flex items-center gap-1 font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-purple-600" />
                        Interview: {cand.interview_date} {cand.interview_time || ''}
                      </span>
                      <span className="text-[10px] font-black uppercase text-purple-700 dark:text-purple-300">
                        Confirmed
                      </span>
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                    <span>Applied: {new Date(cand.applied_at).toLocaleDateString()}</span>
                    <span>Shortlisted: {new Date(cand.shortlisted_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setInspectingAppId(cand.application_id)}
                      className="text-xs font-bold flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Dossier / CV
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenScheduleModal(cand)}
                      className="text-xs font-bold flex items-center justify-center gap-1 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 border-purple-200 dark:border-purple-800 rounded-xl py-2"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      Interview
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setOfferingCandidate(cand)}
                      className="text-xs font-bold flex items-center justify-center gap-1 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border-emerald-200 dark:border-emerald-800 rounded-xl py-2"
                      title="1-Click AI Offer Letter"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Offer Letter
                    </Button>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleSendMessage(cand)}
                      className="flex-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl py-1.5 flex items-center justify-center gap-1"
                    >
                      <Mail className="w-3 h-3 text-slate-500" />
                      Send Message
                    </Button>

                    <button
                      onClick={() => setRemovingCandidate(cand)}
                      className="p-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors"
                      title="Remove candidate from shortlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Full Dossier & Assessment Sheet */}
      {inspectingAppId && (
        <ApplicantDossierModal
          isOpen={!!inspectingAppId}
          onClose={() => setInspectingAppId(null)}
          applicationId={inspectingAppId}
          onDecisionMade={handleDecisionMadeFromDossier}
          blindMode={blindHiringActive}
        />
      )}

      {/* MODAL: 1-Click AI Offer Letter & Contract Generator */}
      {offeringCandidate && (
        <OfferLetterModal
          isOpen={!!offeringCandidate}
          onClose={() => setOfferingCandidate(null)}
          application={{
            id: offeringCandidate.application_id,
            application_id: offeringCandidate.application_id,
            expected_salary: offeringCandidate.expected_salary,
            candidate_name: offeringCandidate.candidate_name,
            job_title: offeringCandidate.job_title,
            company_name: offeringCandidate.company_name,
          }}
          candidateName={offeringCandidate.candidate_name}
          candidateEmail={offeringCandidate.candidate_email}
          jobTitle={offeringCandidate.job_title}
          companyName={offeringCandidate.company_name}
          expectedSalary={offeringCandidate.expected_salary}
          onOfferSent={() => {
            setOfferingCandidate(null);
            loadJobs();
          }}
        />
      )}

      {/* MODAL: Confirm Remove from Shortlist */}
      {removingCandidate && (
        <Modal
          isOpen={Boolean(removingCandidate)}
          onClose={() => !submittingRemove && setRemovingCandidate(null)}
          title="Remove from Shortlist?"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to remove <strong>{removingCandidate.candidate_name}</strong> from the shortlisted pool for <strong>{removingCandidate.job_title}</strong>?
            </p>
            <p className="text-[11px] text-slate-400">
              The candidate will be moved back to standard screening status. You can re-shortlist them anytime from the Recruiter Dashboard.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setRemovingCandidate(null)}
                disabled={submittingRemove}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmRemove}
                disabled={submittingRemove}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {submittingRemove ? 'Removing...' : 'Confirm Removal'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: Smart Meeting Scheduler */}
      <ScheduleInterviewModal
        isOpen={Boolean(schedulingCandidate)}
        onClose={() => setSchedulingCandidate(null)}
        candidate={schedulingCandidate}
        onScheduled={handleInterviewScheduled}
        triggerToast={triggerToast}
      />

      {/* MODAL: Send Message / Email */}
      <SendMessageModal
        isOpen={Boolean(emailModalCandidate)}
        onClose={() => setEmailModalCandidate(null)}
        candidate={emailModalCandidate}
        blindMode={blindHiringActive}
        onSent={({ candidate }) => {
          triggerToast({
            id: Date.now(),
            title: 'Message Sent Successfully',
            message: "Message sent directly to candidate's email inbox!",
            type: 'JOB',
          });
        }}
      />
    </div>
  );
}
