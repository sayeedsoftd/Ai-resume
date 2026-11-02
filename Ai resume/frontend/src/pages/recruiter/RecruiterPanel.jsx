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
  Trash2,
  AlertTriangle,
  CreditCard,
  RefreshCw,
} from 'lucide-react';
import { jobService } from '../../services/jobService';
import { subscriptionService } from '../../services/subscriptionService';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import { useNotifications } from '../../context/NotificationContext';
import ApplicantDossierModal from '../../components/recruiter/ApplicantDossierModal';

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
  const [candidateFilter, setCandidateFilter] = useState('PASSED'); // 'PASSED' | 'FAILED' | 'ALL'
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
    description: '',
    skillsInput: '',
    passing_score: 70,
    has_manual_stage: false,
    manual_mcqs: [],
    manual_written: [],
  });
  const [submittingJob, setSubmittingJob] = useState(false);

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
      description: '',
      skillsInput: '',
      passing_score: 70,
      has_manual_stage: false,
      manual_mcqs: [],
      manual_written: [],
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
      description: job.description || '',
      skillsInput: (job.required_skills || []).join(', '),
      passing_score:
        job.passing_score !== undefined && job.passing_score !== null
          ? job.passing_score
          : 70,
      has_manual_stage: Boolean(job.has_manual_stage),
      manual_mcqs: mq.mcqs || [],
      manual_written: mq.written || [],
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

      const payload = {
        title: jobForm.title,
        company_name: jobForm.company_name,
        location: jobForm.location || 'Remote',
        job_type: jobForm.job_type,
        experience_level: jobForm.experience_level,
        salary_range: jobForm.salary_range,
        description: jobForm.description,
        required_skills: skillsArray,
        passing_score: parseFloat(jobForm.passing_score) || 70,
        has_manual_stage: Boolean(jobForm.has_manual_stage),
        manual_questions: manualQuestions,
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
      // Filter out ONLY that deleted job from UI state without touching other jobs
      setPostedJobs((prev) => prev.filter((j) => j.id !== jobToDelete.id));

      if (selectedJobForReview?.id === jobToDelete.id) {
        setSelectedJobForReview(null);
        setCandidates([]);
      }

      triggerToast({
        id: Date.now(),
        title: 'Job Deleted',
        message: `Job requisition '${jobToDelete.title}' has been deleted and applicants notified.`,
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

  const handleReviewCandidates = async (job) => {
    setSelectedJobForReview(job);
    setLoadingCandidates(true);
    try {
      const data = await jobService.getJobApplications(job.id);
      setCandidates(data);
    } catch (err) {
      console.error('Failed to load candidates', err);
    } finally {
      setLoadingCandidates(false);
    }
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

              {/* Segmented Filter Tabs: Passed vs Failed vs All */}
              {(() => {
                const benchmark = selectedJobForReview.passing_score ?? 70;
                const passedList = candidates.filter((c) =>
                  getIsCandidatePassed(c, benchmark)
                );
                const failedList = candidates.filter(
                  (c) => !getIsCandidatePassed(c, benchmark)
                );
                const displayedList =
                  candidateFilter === 'PASSED'
                    ? passedList
                    : candidateFilter === 'FAILED'
                    ? failedList
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
                                  <div className="flex items-start gap-2.5">
                                    <span
                                      className={`w-6 h-6 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5 ${
                                        rankIdx === 0
                                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                      }`}
                                    >
                                      #{rankIdx + 1}
                                    </span>
                                    <div>
                                      <span className="text-xs font-bold text-slate-900 dark:text-white block leading-snug">
                                        {cand.user?.full_name ||
                                          `Applicant #${cand.user_id}`}
                                      </span>
                                      <span className="text-[10px] text-slate-400 block">
                                        Applied{' '}
                                        {new Date(
                                          cand.applied_at
                                        ).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>

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
                                </div>

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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Job Type
              </label>
              <select
                value={jobForm.job_type}
                onChange={(e) => setJobForm({ ...jobForm, job_type: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
                <option value="CONTRACT">Contract</option>
                <option value="REMOTE">Remote</option>
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

            <Input
              label="Salary Range"
              placeholder="e.g. $80k - $120k / yr"
              value={jobForm.salary_range}
              onChange={(e) =>
                setJobForm({ ...jobForm, salary_range: e.target.value })
              }
            />
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Job Description & Responsibilities *
            </label>
            <textarea
              rows={4}
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
        />
      )}

      {/* Delete Single Job Confirmation Modal */}
      {jobToDelete && (
        <Modal
          isOpen={Boolean(jobToDelete)}
          onClose={() => !deletingJob && setJobToDelete(null)}
          title="Delete Job Requisition"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-900 dark:text-rose-200 space-y-1">
                <p className="font-semibold text-sm">
                  Are you sure you want to delete "{jobToDelete.title}"?
                </p>
                <p>
                  This action will permanently remove only this specific job listing. All{' '}
                  <span className="font-bold">{jobToDelete.applicant_count || 0} applicants</span> will
                  receive an automated notification that this job has been closed.
                </p>
                <p className="text-[11px] text-rose-700 dark:text-rose-400">
                  All other jobs and general candidate profiles remain untouched.
                </p>
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
                    Confirm Delete
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
