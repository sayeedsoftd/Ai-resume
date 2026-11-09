import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  PlusCircle,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Filter,
  DollarSign,
  MapPin,
  ChevronRight,
  ChevronDown,
  Building,
  Eye,
  Award,
  Calendar,
  Video,
  Trash2,
  AlertTriangle,
  CreditCard,
  RefreshCw,
  ShieldCheck,
  Shield,
  EyeOff,
  User,
  Wand2,
} from 'lucide-react';
import { jobService } from '../../services/jobService';
import { subscriptionService } from '../../services/subscriptionService';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import { useNotifications } from '../../context/NotificationContext';
import ApplicantDossierModal from '../../components/recruiter/ApplicantDossierModal';
import ScheduleInterviewModal from '../../components/recruiter/ScheduleInterviewModal';
import AISmartJobDescriptionAssistant from '../../components/jobs/AISmartJobDescriptionAssistant';
import {
  maskCandidateDetails,
  getSavedBlindHiringPreference,
  saveBlindHiringPreference,
} from '../../utils/blindHiring';

export default function RecruiterPanel() {
  const navigate = useNavigate();
  const [postedJobs, setPostedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [selectedJobForReview, setSelectedJobForReview] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [inspectingAppId, setInspectingAppId] = useState(null);
  const [schedulingCandidateForPanel, setSchedulingCandidateForPanel] = useState(null);
  const [candidateFilter, setCandidateFilter] = useState('PASSED'); // 'PASSED' | 'FAILED' | 'ALL'
  const [blindHiringActive, setBlindHiringActive] = useState(() =>
    getSavedBlindHiringPreference(true)
  );
  const [editingJobId, setEditingJobId] = useState(null);
  const [jobToDelete, setJobToDelete] = useState(null);
  const [deletingJob, setDeletingJob] = useState(false);
  const { triggerToast } = useNotifications();

  // Job Form State (with benchmark & custom stage-2 assessment builder)
  const [jobForm, setJobForm] = useState({
    title: '',
    company_name: '',
    location: '',
    job_type: 'FULL_TIME',
    experience_level: 'MID',
    salary_range: '',
    category: 'Software Engineering',
    workplace_type: 'ON_SITE',
    min_salary: '',
    max_salary: '',
    is_salary_negotiable: false,
    experience_years_required: 0,
    description: '',
    skillsInput: '',
    passing_score: 70,
    has_manual_stage: false,
    manual_mcqs: [],
    manual_written: [],
    sla_review_days: 5,
  });
  const formData = jobForm;
  const setFormData = setJobForm;
  const [submittingJob, setSubmittingJob] = useState(false);
  const [isDraftingJD, setIsDraftingJD] = useState(false);

  useEffect(() => {
    fetchMyJobs();
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const data = await subscriptionService.getMySubscription();
      setSubscriptionInfo(data);
    } catch (err) {
      console.warn('Could not load recruiter subscription details', err);
    }
  };

  const fetchMyJobs = async () => {
    setLoading(true);
    try {
      const data = await jobService.getMyPostedJobs();
      setPostedJobs(data);
    } catch (err) {
      console.error('Failed to load posted jobs', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    if (subscriptionInfo?.subscription_status === 'EXPIRED') {
      alert('Your recruiter subscription has expired. Please renew your plan to post new job openings.');
      navigate('/pricing');
      return;
    }
    setEditingJobId(null);
    setJobForm({
      title: '',
      company_name: '',
      location: '',
      job_type: 'FULL_TIME',
      experience_level: 'MID',
      salary_range: '',
      category: 'Software Engineering',
      workplace_type: 'ON_SITE',
      min_salary: '',
      max_salary: '',
      is_salary_negotiable: false,
      experience_years_required: 0,
      description: '',
      skillsInput: '',
      passing_score: 70,
      has_manual_stage: false,
      manual_mcqs: [],
      manual_written: [],
      sla_review_days: 5,
    });
    setPostModalOpen(true);
  };

  const handleOpenEditModal = (job) => {
    setEditingJobId(job.id);
    const mq = job.manual_questions || {};
    setJobForm({
      title: job.title || '',
      company_name: job.company_name || '',
      location: job.location || '',
      job_type: job.job_type || 'FULL_TIME',
      experience_level: job.experience_level || 'MID',
      salary_range: job.salary_range || '',
      category: job.category || 'Software Engineering',
      workplace_type: job.workplace_type || 'ON_SITE',
      min_salary: job.min_salary !== undefined && job.min_salary !== null ? String(job.min_salary) : '',
      max_salary: job.max_salary !== undefined && job.max_salary !== null ? String(job.max_salary) : '',
      is_salary_negotiable: Boolean(job.is_salary_negotiable),
      experience_years_required: job.experience_years_required || 0,
      description: job.description || '',
      skillsInput: (job.required_skills || []).join(', '),
      passing_score:
        job.passing_score !== undefined && job.passing_score !== null
          ? job.passing_score
          : 70,
      has_manual_stage: Boolean(job.has_manual_stage),
      manual_mcqs: mq.mcqs || [],
      manual_written: mq.written || [],
      sla_review_days: job.sla_review_days !== undefined && job.sla_review_days !== null ? job.sla_review_days : 5,
    });
    setPostModalOpen(true);
  };

  // Stage 2 Question Builder Helpers
  const handleAddMCQ = () => {
    if (jobForm.manual_mcqs.length >= 10) return;
    setJobForm((prev) => ({
      ...prev,
      manual_mcqs: [
        ...prev.manual_mcqs,
        {
          id: Date.now(),
          question: '',
          options: ['', '', '', ''],
          correct_option: 'A',
        },
      ],
    }));
  };

  const handleUpdateMCQ = (idx, field, value) => {
    setJobForm((prev) => {
      const updated = [...prev.manual_mcqs];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, manual_mcqs: updated };
    });
  };

  const handleUpdateMCQOption = (qIdx, optIdx, value) => {
    setJobForm((prev) => {
      const updated = [...prev.manual_mcqs];
      const opts = [...updated[qIdx].options];
      opts[optIdx] = value;
      updated[qIdx] = { ...updated[qIdx], options: opts };
      return { ...prev, manual_mcqs: updated };
    });
  };

  const handleRemoveMCQ = (idx) => {
    setJobForm((prev) => ({
      ...prev,
      manual_mcqs: prev.manual_mcqs.filter((_, i) => i !== idx),
    }));
  };

  const handleAddWritten = () => {
    if (jobForm.manual_written.length >= 5) return;
    setJobForm((prev) => ({
      ...prev,
      manual_written: [
        ...prev.manual_written,
        {
          id: Date.now(),
          question: '',
          instructions: '',
        },
      ],
    }));
  };

  const handleUpdateWritten = (idx, field, value) => {
    setJobForm((prev) => {
      const updated = [...prev.manual_written];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, manual_written: updated };
    });
  };

  const handleRemoveWritten = (idx) => {
    setJobForm((prev) => ({
      ...prev,
      manual_written: prev.manual_written.filter((_, i) => i !== idx),
    }));
  };

  const handleAutoDraftJD = async () => {
    const targetTitle = (jobForm.title || '').trim();
    const targetSkills = (jobForm.skillsInput || '').trim();
    const effectiveTitle = targetTitle || targetSkills;

    if (!effectiveTitle) {
      alert('Please enter a Job Title or Required Skills (e.g. "Ai/LLm") before generating with AI.');
      return;
    }

    if (!jobForm.title && targetSkills) {
      setJobForm((prev) => ({ ...prev, title: targetSkills }));
    }

    setIsDraftingJD(true);
    try {
      const payload = {
        job_title: effectiveTitle,
        keywords: targetSkills || undefined,
        experience_level: jobForm.experience_level || 'MID',
        industry: jobForm.category || 'Software Engineering',
        workplace_type: jobForm.workplace_type || 'ON_SITE',
        tone: 'Professional',
      };

      const result = await jobService.generateAIJobDescription(payload);

      const existingSkills = targetSkills
        ? targetSkills.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      const newSkills = (result.required_skills || []).filter(
        (ns) => !existingSkills.some((es) => es.toLowerCase() === ns.toLowerCase())
      );
      const mergedSkills = [...existingSkills, ...newSkills].join(', ');

      const formattedDesc =
        result.full_formatted_description || result.role_overview || '';

      setJobForm((prev) => ({
        ...prev,
        title: prev.title || result.job_title || effectiveTitle,
        description: formattedDesc,
        skillsInput: mergedSkills || prev.skillsInput,
        min_salary:
          !prev.min_salary && result.recommended_min_salary
            ? String(Math.round(result.recommended_min_salary))
            : prev.min_salary,
        max_salary:
          !prev.max_salary && result.recommended_max_salary
            ? String(Math.round(result.recommended_max_salary))
            : prev.max_salary,
        experience_years_required:
          !prev.experience_years_required && result.experience_years
            ? result.experience_years
            : prev.experience_years_required,
      }));

      triggerToast({
        id: Date.now(),
        title: 'AI Draft Generated! ✨',
        message: `Job description & skills for '${effectiveTitle}' were generated with Gemini Pro.`,
        type: 'SUCCESS',
      });
    } catch (err) {
      console.error('AI Draft failed:', err);
      alert(
        err.response?.data?.detail ||
          'Failed to auto-draft job description with Gemini AI. Please check inputs and retry.'
      );
    } finally {
      setIsDraftingJD(false);
    }
  };

  const handleSaveJob = async (e) => {
    e.preventDefault();
    if (!jobForm.title || !jobForm.company_name || !jobForm.description) {
      alert('Please fill out all required fields.');
      return;
    }

    setSubmittingJob(true);
    try {
      const skillsArray = jobForm.skillsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const manualQuestions = jobForm.has_manual_stage
        ? {
            mcqs: jobForm.manual_mcqs,
            written: jobForm.manual_written,
          }
        : null;

      // Format salary range
      let calculatedSalary = jobForm.salary_range;
      if (jobForm.is_salary_negotiable && !jobForm.min_salary) {
        calculatedSalary = 'Negotiable';
      } else if (jobForm.min_salary && jobForm.max_salary) {
        calculatedSalary = `৳${Number(jobForm.min_salary).toLocaleString()} - ৳${Number(jobForm.max_salary).toLocaleString()}`;
      } else if (jobForm.min_salary) {
        calculatedSalary = `৳${Number(jobForm.min_salary).toLocaleString()}+`;
      }

      const payload = {
        title: jobForm.title,
        company_name: jobForm.company_name,
        location: jobForm.location || (jobForm.workplace_type === 'REMOTE' ? 'Remote' : 'Dhaka, Bangladesh'),
        job_type: jobForm.job_type,
        experience_level: jobForm.experience_level,
        salary_range: calculatedSalary || 'Negotiable',
        category: jobForm.category || 'Software Engineering',
        workplace_type: jobForm.workplace_type || 'ON_SITE',
        min_salary: jobForm.min_salary ? parseFloat(jobForm.min_salary) : null,
        max_salary: jobForm.max_salary ? parseFloat(jobForm.max_salary) : null,
        is_salary_negotiable: Boolean(jobForm.is_salary_negotiable),
        experience_years_required: parseInt(jobForm.experience_years_required, 10) || 0,
        description: jobForm.description,
        required_skills: skillsArray,
        passing_score: parseFloat(jobForm.passing_score) || 70,
        has_manual_stage: Boolean(jobForm.has_manual_stage),
        manual_questions: manualQuestions,
        sla_review_days: parseInt(jobForm.sla_review_days, 10) || 5,
        sla_guarantee_enabled: true,
        is_active: true,
      };

      if (editingJobId) {
        await jobService.updateJob(editingJobId, payload);
        triggerToast({
          id: Date.now(),
          title: 'Job Updated!',
          message: `Job requisition '${payload.title}' was successfully updated.`,
          type: 'JOB',
        });
      } else {
        await jobService.createJob(payload);
        triggerToast({
          id: Date.now(),
          title: 'Job Published!',
          message: `Your job requisition '${payload.title}' is now active with ${payload.passing_score}% benchmark.`,
          type: 'JOB',
        });
      }

      setPostModalOpen(false);
      fetchMyJobs();
    } catch (err) {
      console.error('Save job error', err);
      alert('Failed to save job requisition. Ensure you have recruiter permissions.');
    } finally {
      setSubmittingJob(false);
    }
  };

  const handleToggleJob = async (jobId) => {
    try {
      const res = await jobService.toggleJobStatus(jobId);
      setPostedJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, is_active: res.is_active } : j))
      );
    } catch (err) {
      console.error('Toggle error', err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!jobToDelete) return;
    setDeletingJob(true);
    try {
      await jobService.deleteJob(jobToDelete.id);
      // Immediately filter out the deleted job from local state list
      setPostedJobs((prev) => prev.filter((j) => j.id !== jobToDelete.id));

      if (selectedJobForReview?.id === jobToDelete.id) {
        setSelectedJobForReview(null);
        setCandidates([]);
      }

      triggerToast({
        id: Date.now(),
        title: 'Job permanently deleted',
        message: `Job requisition '${jobToDelete.title}' has been permanently wiped from the entire system.`,
        type: 'JOB',
      });
      setJobToDelete(null);
    } catch (err) {
      console.error('Delete job error', err);
      alert(err.response?.data?.detail || 'Failed to delete job. You must be the owner of this job.');
    } finally {
      setDeletingJob(false);
    }
  };

  const handleReviewCandidates = async (job, isBlind = blindHiringActive) => {
    setSelectedJobForReview(job);
    setLoadingCandidates(true);
    try {
      const data = await jobService.getJobApplications(job.id, isBlind);
      setCandidates(data);
    } catch (err) {
      console.error('Failed to load candidates', err);
    } finally {
      setLoadingCandidates(false);
    }
  };

  const handleToggleBlindHiring = () => {
    const nextState = !blindHiringActive;
    setBlindHiringActive(nextState);
    saveBlindHiringPreference(nextState);
    if (selectedJobForReview) {
      handleReviewCandidates(selectedJobForReview, nextState);
    }
    triggerToast({
      id: Date.now(),
      title: nextState ? '🛡️ Blind Hiring Active' : 'Anti-Bias Mode Disabled',
      message: nextState
        ? 'Candidate personal demographics and identities are now masked.'
        : 'Candidate real names and personal demographics are now visible.',
      type: 'JOB',
    });
  };

  const handleUpdateCandidateStatus = async (appId, newStatus) => {
    try {
      await jobService.updateApplicationStatus(appId, newStatus);
      setCandidates((prev) =>
        prev.map((c) => (c.id === appId ? { ...c, status: newStatus } : c))
      );
    } catch (err) {
      console.error('Status update failed', err);
    }
  };

  const getIsCandidatePassed = (cand, benchmark = 70) => {
    if (cand.is_stage1_passed === true) return true;
    if (cand.is_stage1_passed === false) return false;
    if (cand.test_score !== null && cand.test_score !== undefined) {
      return cand.test_score >= benchmark;
    }
    return [
      'STAGE1_PASSED',
      'STAGE2_INVITED',
      'STAGE2_SUBMITTED',
      'SHORTLISTED',
      'INTERVIEW',
      'ACCEPTED',
    ].includes(cand.status);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SHORTLISTED':
        return <Badge variant="success">Shortlisted</Badge>;
      case 'STAGE1_PASSED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
            Passed (Screening)
          </span>
        );
      case 'STAGE1_FAILED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
            Failed (Screening)
          </span>
        );
      case 'STAGE2_INVITED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-700">
            Stage-2 Invited
          </span>
        );
      case 'STAGE2_SUBMITTED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700">
            Stage-2 Submitted / Under Review
          </span>
        );
      case 'INTERVIEW':
        return <Badge variant="purple">Interview Scheduled</Badge>;
      case 'ACCEPTED':
        return <Badge variant="success">Offer Accepted</Badge>;
      case 'REJECTED':
        return <Badge variant="danger">Rejected</Badge>;
      case 'SCREENING':
        return <Badge variant="warning">Screening</Badge>;
      default:
        return <Badge variant="info">Applied</Badge>;
    }
  };

  const handleQuickShortlist = async (cand) => {
    try {
      const updated = await jobService.makeRecruiterDecision(cand.id, {
        status: 'SHORTLISTED',
      });
      handleDecisionMade(updated);
    } catch (err) {
      console.error('Quick shortlist error', err);
      alert(err.response?.data?.detail || 'Failed to shortlist candidate.');
    }
  };

  const handleDecisionMade = (updatedApp) => {
    if (!updatedApp) return;
    setCandidates((prev) =>
      prev.map((c) => (c.id === updatedApp.id ? { ...c, ...updatedApp } : c))
    );
    triggerToast({
      id: Date.now(),
      title: 'Decision Recorded',
      message: `Applicant status set to '${updatedApp.status}'. Candidate has received an instant notification.`,
      type: 'JOB',
    });
  };

  return (
    <div className="space-y-6">
      {/* Recruiter Subscription & Verification Lifecycle Banners */}
      {subscriptionInfo?.subscription_status === 'PENDING' && (
        <div className="p-4 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-sky-950 dark:text-sky-200">
                Your Recruiter Verification is Pending Review by Super Admin
              </h4>
              <p className="text-xs text-sky-800 dark:text-sky-300 mt-0.5">
                Your manual payment details and KYC Trade License have been submitted. You will be notified once approved.
              </p>
            </div>
          </div>
          <Link to="/pricing">
            <Button size="sm" variant="secondary" className="border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300 hover:bg-sky-100">
              Check Status
            </Button>
          </Link>
        </div>
      )}

      {subscriptionInfo?.subscription_status === 'REJECTED' && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-rose-950 dark:text-rose-200">
                Payment & Recruiter Verification Rejected
              </h4>
              <p className="text-xs text-rose-800 dark:text-rose-300 mt-0.5">
                Admin Note: <span className="font-semibold underline">{subscriptionInfo?.rejection_reason || 'Verification document or Transaction ID could not be confirmed.'}</span>
              </p>
            </div>
          </div>
          <Link to="/pricing">
            <Button size="sm" className="bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-md whitespace-nowrap">
              Re-submit Payment Details
            </Button>
          </Link>
        </div>
      )}

      {subscriptionInfo?.subscription_status === 'ACTIVE' &&
        subscriptionInfo?.days_left !== null &&
        subscriptionInfo?.days_left !== undefined &&
        subscriptionInfo?.days_left <= 7 && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                  Subscription Expiring Soon ({subscriptionInfo.days_left} {subscriptionInfo.days_left === 1 ? 'day' : 'days'} left)
                </h4>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                  Your recruiter subscription expires in {subscriptionInfo.days_left} day{subscriptionInfo.days_left === 1 ? '' : 's'}. Renew to prevent job freeze and preserve active applicant screening.
                </p>
              </div>
            </div>
            <Link to="/pricing">
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-md whitespace-nowrap">
                Renew Subscription
              </Button>
            </Link>
          </div>
        )}

      {subscriptionInfo?.subscription_status === 'EXPIRED' && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-red-950 dark:text-red-200">
                Recruiter Subscription Expired
              </h4>
              <p className="text-xs text-red-800 dark:text-red-300 mt-0.5">
                Your subscription has expired. Active job postings are currently frozen from candidate search. Renew now to reactivate all listings.
              </p>
            </div>
          </div>
          <Link to="/pricing">
            <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white font-semibold shadow-md whitespace-nowrap">
              Renew Subscription Now
            </Button>
          </Link>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Recruiter Job & Candidate Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Post open requisitions, view applicants with extracted ATS scores, and advance candidate stages.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handleOpenCreateModal}
          className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 font-semibold"
        >
          <PlusCircle className="w-4 h-4" />
          Post New Job Opening
        </Button>
      </div>

      {/* Main Grid: Posted Jobs List & Candidate Review Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Posted Jobs List (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            My Posted Jobs ({postedJobs.length})
          </h3>

          {loading ? (
            <div className="text-center py-12 text-xs text-slate-500">
              Loading posted requisitions...
            </div>
          ) : postedJobs.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Briefcase className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No active jobs posted
              </h4>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Click 'Post New Job Opening' to create your first listing.
              </p>
              <Button size="sm" onClick={handleOpenCreateModal}>
                Post Job Opening
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {postedJobs.map((job) => (
                <div
                  key={job.id}
                  className={`p-4 rounded-2xl border transition-all bg-white dark:bg-slate-900 ${
                    selectedJobForReview?.id === job.id
                      ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {job.title}
                        </h4>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            job.is_active
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {job.is_active ? 'Active' : 'Paused'}
                        </span>
                        {job.is_frozen && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300 dark:border-red-800 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400" /> Frozen due to expired subscription
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 text-xs text-slate-500 dark:text-slate-400">
                        <span>{job.company_name}</span>
                        <span>• {job.location}</span>
                        <span>• {job.job_type}</span>
                        {job.salary_range && <span>• {job.salary_range}</span>}
                      </div>

                      {/* Required skills */}
                      {job.required_skills && job.required_skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1.5">
                          {job.required_skills.slice(0, 5).map((sk, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                            >
                              {sk}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Pipeline Configuration Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                          Passing Benchmark: {job.passing_score ?? 70}%
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            job.has_manual_stage
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {job.has_manual_stage
                            ? 'Stage-2 Custom Test: Active'
                            : 'Stage-2: Disabled'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {job.views_count || 0} Views
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEditModal(job)}
                        className="text-xs font-semibold"
                        title="Edit Requisition & Custom Test"
                      >
                        Edit
                      </Button>

                      <button
                        onClick={() => handleToggleJob(job.id)}
                        className="text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                        title={job.is_active ? 'Pause Listing' : 'Activate Listing'}
                      >
                        {job.is_active ? (
                          <ToggleRight className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-slate-400" />
                        )}
                      </button>

                      <button
                        onClick={() => setJobToDelete(job)}
                        className="text-xs p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors"
                        title="Delete this Job"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <Button
                        size="sm"
                        variant={selectedJobForReview?.id === job.id ? 'primary' : 'outline'}
                        onClick={() => handleReviewCandidates(job)}
                        className="flex items-center gap-1.5 text-xs font-semibold"
                      >
                        <Users className="w-3.5 h-3.5" />
                        Applicants ({job.applicant_count || 0})
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Candidate Review Panel (1 col) */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Applicant Review
          </h3>

          {!selectedJobForReview ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
              <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              Select a job listing on the left to review applicants segregated by benchmark status.
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-4 shadow-sm">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    Reviewing Requisition
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {selectedJobForReview.title}
                  </h4>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                  Target: {selectedJobForReview.passing_score ?? 70}%
                </span>
              </div>

              {/* High-Visibility Blind Hiring (Anti-Bias Mode) Toggle Switch */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-slate-50 via-slate-50 to-indigo-50/30 dark:from-slate-800/80 dark:via-slate-800/80 dark:to-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-start gap-2.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    blindHiringActive
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}>
                    {blindHiringActive ? <ShieldCheck className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                        🛡️ Blind Hiring (Anti-Bias Mode)
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                        blindHiringActive
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}>
                        {blindHiringActive ? 'ACTIVE' : 'OFF'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                      Mask candidate personal demographics to ensure objective, merit-based screening.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleBlindHiring}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    blindHiringActive ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  role="switch"
                  aria-checked={blindHiringActive}
                  title="Toggle Blind Hiring Anti-Bias Mode"
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      blindHiringActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Informative Anti-Bias Banner when Active */}
              {blindHiringActive && (
                <div className="p-2.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <p className="text-[11px] font-medium leading-snug">
                    <strong className="font-bold">Anti-Bias Filter Active:</strong> Candidate personal identifiers are masked to promote meritocratic shortlisting.
                  </p>
                </div>
              )}

              {/* Segmented Filter Tabs: Passed vs Failed vs Flagged vs All */}
              {(() => {
                const benchmark = selectedJobForReview.passing_score ?? 70;
                const isCandidateFlagged = (c) =>
                  Boolean(
                    c.is_suspicious ||
                      (c.tab_switch_count && c.tab_switch_count > 2) ||
                      c.submission_reason === 'AUTO_PROCTOR_VIOLATION'
                  );
                const passedList = candidates.filter((c) =>
                  getIsCandidatePassed(c, benchmark)
                );
                const failedList = candidates.filter(
                  (c) => !getIsCandidatePassed(c, benchmark)
                );
                const flaggedList = candidates.filter((c) => isCandidateFlagged(c));
                const displayedList =
                  candidateFilter === 'PASSED'
                    ? passedList
                    : candidateFilter === 'FAILED'
                    ? failedList
                    : candidateFilter === 'FLAGGED'
                    ? flaggedList
                    : candidates;

                return (
                  <div className="space-y-3">
                    <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                      <button
                        onClick={() => setCandidateFilter('PASSED')}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                          candidateFilter === 'PASSED'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        Passed ({passedList.length})
                      </button>
                      <button
                        onClick={() => setCandidateFilter('FAILED')}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                          candidateFilter === 'FAILED'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        Failed ({failedList.length})
                      </button>
                      <button
                        onClick={() => setCandidateFilter('FLAGGED')}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                          candidateFilter === 'FLAGGED'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-amber-700 dark:text-amber-400 hover:text-amber-800'
                        }`}
                      >
                        Flagged ({flaggedList.length})
                      </button>
                      <button
                        onClick={() => setCandidateFilter('ALL')}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                          candidateFilter === 'ALL'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        All ({candidates.length})
                      </button>
                    </div>

                    {loadingCandidates ? (
                      <div className="text-center py-8 text-xs text-slate-500">
                        Loading candidate applications...
                      </div>
                    ) : displayedList.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400">
                        No candidates found in {candidateFilter.toLowerCase()} tab.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                        {displayedList
                          .sort(
                            (a, b) => (b.test_score || 0) - (a.test_score || 0)
                          )
                          .map((cand, rankIdx) => {
                            const score = cand.match_score || 0;
                            const isPassed = getIsCandidatePassed(cand, benchmark);
                            return (
                              <div
                                key={cand.id}
                                className={`p-3.5 rounded-2xl border space-y-3 transition-all ${
                                  isPassed
                                    ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/20 dark:bg-emerald-950/20'
                                    : 'border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  {(() => {
                                    const masked = maskCandidateDetails(cand, blindHiringActive);
                                    return (
                                      <div className="flex items-start gap-2.5">
                                        <div className="relative shrink-0 mt-0.5">
                                          <span
                                            className={`w-7 h-7 rounded-full text-[10px] font-black flex items-center justify-center ${
                                              blindHiringActive
                                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                                                : rankIdx === 0
                                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                                                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                            }`}
                                          >
                                            {blindHiringActive ? (
                                              <User className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                            ) : (
                                              `#${rankIdx + 1}`
                                            )}
                                          </span>
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-xs font-bold text-slate-900 dark:text-white block leading-snug">
                                              {masked.displayName}
                                            </span>
                                            {blindHiringActive && (
                                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                                Anti-Bias Protected
                                              </span>
                                            )}
                                          </div>
                                          <span className="text-[10px] text-slate-400 block">
                                            {blindHiringActive
                                              ? 'Demographics Masked • '
                                              : `${cand.user?.email || 'Candidate'} • `}
                                            Applied {new Date(cand.applied_at).toLocaleDateString()}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  <div className="shrink-0">
                                    {getStatusBadge(cand.status)}
                                  </div>
                                </div>

                                {/* Quick Summary Badges */}
                                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                    ATS: {Math.round(score)}%
                                  </span>

                                  {cand.test_score !== null &&
                                  cand.test_score !== undefined ? (
                                    <span
                                      className={`px-2 py-0.5 rounded-lg text-[10px] font-black border flex items-center gap-1 ${
                                        cand.test_score >= benchmark
                                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300'
                                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300'
                                      }`}
                                    >
                                      <Award className="w-2.5 h-2.5" />
                                      Test: {Math.round(cand.test_score)}%
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                      Test: Pending
                                    </span>
                                  )}

                                  {cand.stage2_submission && (
                                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300">
                                      Stage-2 Received
                                    </span>
                                  )}

                                  {cand.expected_salary != null && (() => {
                                    const maxBudget = selectedJobForReview?.max_salary ? Number(selectedJobForReview.max_salary) : null;
                                    const isWithin = maxBudget !== null ? cand.expected_salary <= maxBudget : null;
                                    const diff = maxBudget !== null && cand.expected_salary > maxBudget ? cand.expected_salary - maxBudget : 0;
                                    return (
                                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border flex items-center gap-1 ${
                                        isWithin === true
                                          ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300'
                                          : isWithin === false
                                          ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300'
                                          : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300'
                                      }`}>
                                        <DollarSign className="w-2.5 h-2.5" />
                                        Exp: ৳{Number(cand.expected_salary).toLocaleString()}
                                        {isWithin === true && <span className="text-[9px] font-black">[ Within Budget ]</span>}
                                        {isWithin === false && <span className="text-[9px] font-black">[ Above: +৳{diff.toLocaleString()} ]</span>}
                                      </span>
                                    );
                                  })()}
                                </div>

                                {/* Suspicion / Proctoring Alert Card */}
                                {isCandidateFlagged(cand) && (
                                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
                                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                        ⚠️ Suspicion Flag: High Proctoring Risk
                                      </span>
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200 uppercase">
                                        {cand.submission_reason || 'SUSPICIOUS'}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-rose-600 dark:text-rose-400 flex flex-wrap items-center gap-2 font-medium">
                                      <span>
                                        Tab Switches:{' '}
                                        <strong className="font-bold text-rose-900 dark:text-rose-200">
                                          {cand.tab_switch_count ?? 0}
                                        </strong>
                                      </span>
                                      {cand.proctoring_violations &&
                                        Array.isArray(cand.proctoring_violations) &&
                                        cand.proctoring_violations.length > 0 && (
                                          <>
                                            <span>•</span>
                                            <span>
                                              Logged Violations: {cand.proctoring_violations.length}
                                            </span>
                                          </>
                                        )}
                                    </div>
                                  </div>
                                )}

                                {/* Shortlist / Advance Action Button for Passed Candidates */}
                                {isPassed &&
                                  cand.status !== 'SHORTLISTED' &&
                                  cand.status !== 'STAGE2_INVITED' &&
                                  cand.status !== 'STAGE2_SUBMITTED' &&
                                  cand.status !== 'INTERVIEW' && (
                                    <Button
                                      size="sm"
                                      variant="primary"
                                      onClick={() => handleQuickShortlist(cand)}
                                      className="w-full text-xs font-bold py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center gap-1.5"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      {selectedJobForReview.has_manual_stage
                                        ? 'Shortlist & Invite to Stage-2 Assessment'
                                        : 'Shortlist Candidate'}
                                    </Button>
                                  )}

                                {cand.status === 'SHORTLISTED' && (
                                  <Button
                                    size="sm"
                                    variant="primary"
                                    onClick={() =>
                                      setSchedulingCandidateForPanel({
                                        ...cand,
                                        candidate_id: cand.user_id,
                                        candidate_name: cand.candidate_name,
                                        candidate_email: cand.candidate_email,
                                        job_id: selectedJobForReview.id,
                                        job_title: selectedJobForReview.title,
                                        company_name: selectedJobForReview.company_name,
                                        application_id: cand.id,
                                      })
                                    }
                                    className="w-full text-xs font-bold py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center gap-1.5 shadow-sm shadow-blue-600/20"
                                  >
                                    <Video className="w-3.5 h-3.5" />
                                    Schedule Google Meet Interview
                                  </Button>
                                )}

                                {/* Primary Action: Inspect Full Application & Assessment */}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setInspectingAppId(cand.id)}
                                  className="w-full text-xs font-bold py-1.5 flex items-center justify-center gap-1.5 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Inspect Full Application & Assessment
                                </Button>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Post/Edit Job Modal with Stage-2 Dynamic Builder */}
      <Modal
        isOpen={postModalOpen}
        onClose={() => setPostModalOpen(false)}
        title={
          editingJobId
            ? 'Edit Requisition & Custom Assessment'
            : 'Post New Job Opening'
        }
      >
        <form onSubmit={handleSaveJob} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          {/* ✨ 1-Click AI Job Description Generator & Optimizer */}
          <AISmartJobDescriptionAssistant
            jobTitle={jobForm.title}
            skills={jobForm.skillsInput}
            experienceLevel={jobForm.experience_level}
            category={jobForm.category}
            workplaceType={jobForm.workplace_type}
            onApplyGenerated={(gen) => {
              setJobForm((prev) => ({
                ...prev,
                title: gen.title || prev.title,
                description: gen.description || prev.description,
                skillsInput: gen.required_skills
                  ? Array.isArray(gen.required_skills)
                    ? gen.required_skills.join(', ')
                    : gen.required_skills
                  : prev.skillsInput,
                experience_years_required:
                  gen.experience_years_required !== undefined
                    ? gen.experience_years_required
                    : prev.experience_years_required,
                min_salary: gen.min_salary ? String(gen.min_salary) : prev.min_salary,
                max_salary: gen.max_salary ? String(gen.max_salary) : prev.max_salary,
                salary_range: gen.salary_range || prev.salary_range,
                experience_level: gen.experience_level || prev.experience_level,
                workplace_type: gen.workplace_type || prev.workplace_type,
              }));
              triggerToast({
                id: Date.now(),
                title: 'AI Draft Applied! ✨',
                message: 'Job description, required skills, and salary recommendations updated.',
                type: 'SUCCESS',
              });
            }}
          />

          <Input
            label="Job Title *"
            placeholder="e.g. Senior Backend Engineer"
            value={jobForm.title}
            onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Company Name *"
              placeholder="e.g. Acme Tech Global"
              value={jobForm.company_name}
              onChange={(e) =>
                setJobForm({ ...jobForm, company_name: e.target.value })
              }
              required
            />
            <Input
              label="Location"
              placeholder="e.g. Dhaka, Bangladesh (or Remote)"
              value={jobForm.location}
              onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
            />
          </div>

          {/* BDjobs Industry Categorization & Workplace Model */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Job Category / Industry *
              </label>
              <select
                value={jobForm.category}
                onChange={(e) => setJobForm({ ...jobForm, category: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
              >
                <option value="Software Engineering">Software Engineering</option>
                <option value="AI / Machine Learning">AI / Machine Learning</option>
                <option value="Data Science & Analytics">Data Science & Analytics</option>
                <option value="UI/UX & Product Design">UI/UX & Product Design</option>
                <option value="Quality Assurance & Testing">Quality Assurance & Testing</option>
                <option value="DevOps & Cloud Engineering">DevOps & Cloud Engineering</option>
                <option value="Mobile App Development">Mobile App Development</option>
                <option value="Cybersecurity & Networking">Cybersecurity & Networking</option>
                <option value="Product & Project Management">Product & Project Management</option>
                <option value="Database Administration">Database Administration</option>
                <option value="IT & Tech Support">IT & Tech Support</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Workplace Model *
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-200 dark:bg-slate-800 rounded-xl">
                {[
                  { id: 'ON_SITE', label: 'On-site' },
                  { id: 'REMOTE', label: 'Remote' },
                  { id: 'HYBRID', label: 'Hybrid' },
                ].map((wp) => (
                  <button
                    type="button"
                    key={wp.id}
                    onClick={() => setJobForm({ ...jobForm, workplace_type: wp.id })}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                      jobForm.workplace_type === wp.id
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-300/60 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    {wp.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Salary Specification (BDT) & Minimum Experience */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Salary Specification (৳ BDT)
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={jobForm.is_salary_negotiable}
                  onChange={(e) =>
                    setJobForm({ ...jobForm, is_salary_negotiable: e.target.checked })
                  }
                  className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-semibold text-slate-700 dark:text-slate-300">Negotiable Salary</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Min Monthly Salary (৳)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 30000"
                  value={jobForm.min_salary}
                  onChange={(e) => setJobForm({ ...jobForm, min_salary: e.target.value })}
                  disabled={jobForm.is_salary_negotiable && !jobForm.min_salary}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Max Monthly Salary (৳)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 50000"
                  value={jobForm.max_salary}
                  onChange={(e) => setJobForm({ ...jobForm, max_salary: e.target.value })}
                  disabled={jobForm.is_salary_negotiable && !jobForm.min_salary}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Min Experience (Years)
                </label>
                <input
                  type="number"
                  min="0"
                  max="25"
                  placeholder="0 for freshers"
                  value={jobForm.experience_years_required}
                  onChange={(e) =>
                    setJobForm({ ...jobForm, experience_years_required: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Job Schedule
              </label>
              <select
                value={jobForm.job_type}
                onChange={(e) => setJobForm({ ...jobForm, job_type: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERNSHIP">Internship</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Experience Level
              </label>
              <select
                value={jobForm.experience_level}
                onChange={(e) =>
                  setJobForm({ ...jobForm, experience_level: e.target.value })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="ENTRY">Entry Level</option>
                <option value="MID">Mid Level</option>
                <option value="SENIOR">Senior Level</option>
                <option value="LEAD">Lead / Architect</option>
              </select>
            </div>
          </div>

          <Input
            label="Required Skills (Comma separated) *"
            placeholder="e.g. Python, FastAPI, Docker, PostgreSQL, React"
            value={jobForm.skillsInput}
            onChange={(e) => setJobForm({ ...jobForm, skillsInput: e.target.value })}
          />

          {/* Passing Score Benchmark Configuration */}
          <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 space-y-2">
            <label className="block text-xs font-bold text-slate-900 dark:text-white">
              Passing Score Benchmark (% threshold) *
            </label>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Candidates scoring equal or above this benchmark on the Stage-1 Screening Exam will automatically transition to "Passed (Screening)" and be placed into your Passed Candidates tab.
            </p>
            <input
              type="number"
              min="1"
              max="100"
              value={jobForm.passing_score}
              onChange={(e) =>
                setJobForm({ ...jobForm, passing_score: e.target.value })
              }
              className="w-32 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>

          {/* Toggle Stage-2 Custom Assessment */}
          <div className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Enable Stage-2 Custom Manual Assessment for Shortlisted Candidates
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  When enabled, shortlisting a passed candidate will invite them to complete your custom questions.
                </span>
              </div>
              <input
                type="checkbox"
                checked={jobForm.has_manual_stage}
                onChange={(e) =>
                  setJobForm({ ...jobForm, has_manual_stage: e.target.checked })
                }
                className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
              />
            </div>

            {/* Dynamic Stage-2 Builder */}
            {jobForm.has_manual_stage && (
              <div className="space-y-4 pt-3 border-t border-purple-200/60 dark:border-purple-800/60">
                {/* Summary Indicator */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-100/60 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800">
                  <span className="text-xs font-bold text-purple-900 dark:text-purple-200">
                    Total Stage-2 Questions: {jobForm.manual_mcqs.length + jobForm.manual_written.length} / 15
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold">
                    <span className="px-2 py-0.5 rounded-full bg-purple-200/80 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                      MCQs ({jobForm.manual_mcqs.length}/10)
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-200/80 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300">
                      Written ({jobForm.manual_written.length}/5)
                    </span>
                  </div>
                </div>

                {/* Part A: Custom MCQs */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-purple-900 dark:text-purple-200 uppercase tracking-wider">
                        Part A: Custom MCQs
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        jobForm.manual_mcqs.length >= 10
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-purple-100 text-purple-800 border border-purple-200'
                      }`}>
                        MCQs ({jobForm.manual_mcqs.length}/10)
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleAddMCQ}
                      disabled={jobForm.manual_mcqs.length >= 10}
                      className={`text-[11px] py-0.5 px-2 font-bold ${
                        jobForm.manual_mcqs.length >= 10
                          ? 'opacity-50 cursor-not-allowed text-slate-400 border-slate-300'
                          : 'text-purple-600 border-purple-300 hover:bg-purple-50'
                      }`}
                    >
                      + Add MCQ Question
                    </Button>
                  </div>

                  {jobForm.manual_mcqs.map((q, qIdx) => (
                    <div
                      key={q.id || qIdx}
                      className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900/60 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-purple-700 dark:text-purple-300">
                          MCQ #{qIdx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveMCQ(qIdx)}
                          className="text-rose-500 hover:text-rose-700 text-[11px] font-bold"
                        >
                          Remove
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Enter question text..."
                        value={q.question}
                        onChange={(e) =>
                          handleUpdateMCQ(qIdx, 'question', e.target.value)
                        }
                        className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        {['A', 'B', 'C', 'D'].map((optKey, optIdx) => (
                          <input
                            key={optKey}
                            type="text"
                            placeholder={`Option ${optKey}`}
                            value={q.options[optIdx] || ''}
                            onChange={(e) =>
                              handleUpdateMCQOption(qIdx, optIdx, e.target.value)
                            }
                            className="p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          Correct Option:
                        </span>
                        <select
                          value={q.correct_option || 'A'}
                          onChange={(e) =>
                            handleUpdateMCQ(qIdx, 'correct_option', e.target.value)
                          }
                          className="px-2 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        >
                          <option value="A">Option A</option>
                          <option value="B">Option B</option>
                          <option value="C">Option C</option>
                          <option value="D">Option D</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Part B: Custom Written Questions */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-purple-900 dark:text-purple-200 uppercase tracking-wider">
                        Part B: Custom Written Questions
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        jobForm.manual_written.length >= 5
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                      }`}>
                        Written ({jobForm.manual_written.length}/5)
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleAddWritten}
                      disabled={jobForm.manual_written.length >= 5}
                      className={`text-[11px] py-0.5 px-2 font-bold ${
                        jobForm.manual_written.length >= 5
                          ? 'opacity-50 cursor-not-allowed text-slate-400 border-slate-300'
                          : 'text-purple-600 border-purple-300 hover:bg-purple-50'
                      }`}
                    >
                      + Add Written Question
                    </Button>
                  </div>

                  {jobForm.manual_written.map((w, wIdx) => (
                    <div
                      key={w.id || wIdx}
                      className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900/60 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-purple-700 dark:text-purple-300">
                          Written Question #{wIdx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveWritten(wIdx)}
                          className="text-rose-500 hover:text-rose-700 text-[11px] font-bold"
                        >
                          Remove
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. Design a cache invalidation strategy for high concurrency..."
                        value={w.question}
                        onChange={(e) =>
                          handleUpdateWritten(wIdx, 'question', e.target.value)
                        }
                        className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                      <textarea
                        rows={2}
                        placeholder="Expected answer criteria or candidate instruction notes..."
                        value={w.instructions}
                        onChange={(e) =>
                          handleUpdateWritten(wIdx, 'instructions', e.target.value)
                        }
                        className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Candidate Review SLA Commitment (Anti-Ghosting) */}
          <div className="p-3.5 rounded-xl border border-cyan-500/30 bg-cyan-950/20 my-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
                <span>🛡️ Review SLA Commitment (Anti-Ghosting Guarantee)</span>
              </label>
              <span className="text-[10px] text-cyan-400 font-mono">Guaranteed review deadline</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "⚡ 3 Days (Fast-Track)", val: 3 },
                { label: "⏱️ 5 Days (Standard)", val: 5 },
                { label: "📅 7 Days (Extended)", val: 7 },
              ].map((option) => (
                <button
                  key={option.val}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, sla_review_days: option.val }))}
                  className={`py-2 px-2 text-xs rounded-lg border font-medium transition flex items-center justify-center ${
                    (formData?.sla_review_days || 5) === option.val
                      ? "bg-cyan-500 text-slate-950 border-cyan-400 font-bold shadow-md shadow-cyan-500/20"
                      : "bg-slate-900/80 border-slate-700 text-slate-300 hover:border-cyan-500/50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Candidates will see an active countdown timer on their dashboard ensuring decisions are delivered within this timeframe.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Job Description & Responsibilities *
              </label>
              <button
                type="button"
                onClick={handleAutoDraftJD}
                disabled={isDraftingJD}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline cursor-pointer disabled:opacity-50"
                title="Auto-draft description from Job Title and Skills"
              >
                {isDraftingJD ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Drafting with Gemini...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>🪄 Generate from Title & Skills</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              rows={5}
              value={jobForm.description}
              onChange={(e) =>
                setJobForm({ ...jobForm, description: e.target.value })
              }
              placeholder="Detailed description of responsibilities, requirements, and benefits..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPostModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submittingJob}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              {submittingJob
                ? 'Saving...'
                : editingJobId
                ? 'Update Requisition'
                : 'Publish Job Opening'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Recruiter Full Applicant Dossier & Assessment Answer Sheet Modal */}
      {inspectingAppId && (
        <ApplicantDossierModal
          isOpen={!!inspectingAppId}
          onClose={() => setInspectingAppId(null)}
          applicationId={inspectingAppId}
          onDecisionMade={handleDecisionMade}
          blindMode={blindHiringActive}
        />
      )}

      {/* One-Click Smart Meeting Scheduler Modal */}
      {schedulingCandidateForPanel && (
        <ScheduleInterviewModal
          isOpen={Boolean(schedulingCandidateForPanel)}
          onClose={() => setSchedulingCandidateForPanel(null)}
          candidate={schedulingCandidateForPanel}
          onScheduled={(updated) => {
            handleDecisionMade(updated);
            setSchedulingCandidateForPanel(null);
          }}
          triggerToast={triggerToast}
        />
      )}

      {/* Delete Single Job Confirmation Modal */}
      {jobToDelete && (
        <Modal
          isOpen={Boolean(jobToDelete)}
          onClose={() => !deletingJob && setJobToDelete(null)}
          title="Permanently Delete Job?"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-950 dark:text-rose-200 space-y-2">
                <p className="font-bold text-sm text-rose-900 dark:text-rose-100">
                  Are you sure you want to delete "{jobToDelete.title}"?
                </p>
                <p className="leading-relaxed">
                  This action will permanently wipe this job requisition, along with all associated candidate applications and assessment submissions across Candidate, Recruiter, and Admin panels. This action cannot be reversed.
                </p>
                {jobToDelete.applicant_count > 0 && (
                  <p className="font-semibold text-rose-700 dark:text-rose-300">
                    Associated {jobToDelete.applicant_count} applicant record{jobToDelete.applicant_count === 1 ? '' : 's'} and screening submissions will be wiped permanently.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setJobToDelete(null)}
                disabled={deletingJob}
                size="sm"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmDelete}
                disabled={deletingJob}
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-1.5"
              >
                {deletingJob ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Permanently Delete
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
