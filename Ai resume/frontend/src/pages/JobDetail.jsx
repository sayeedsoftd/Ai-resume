import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { jobService } from '../services/jobService';
import { resumeService } from '../services/resumeService';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import MatchScoreCard from '../components/dashboard/MatchScoreCard';
import ScreeningTestModal from '../components/assessment/ScreeningTestModal';
import Stage2AssessmentModal from '../components/assessment/Stage2AssessmentModal';
import SubmissionReviewModal from '../components/assessment/SubmissionReviewModal';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import {
  MapPin,
  DollarSign,
  Briefcase,
  Sparkles,
  Send,
  CheckCircle2,
  Award,
  AlertCircle,
  Clock,
  HelpCircle,
  FileCheck,
} from 'lucide-react';

const JobDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [job, setJob] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [matchResult, setMatchResult] = useState(null);
  const [matching, setMatching] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [applicationData, setApplicationData] = useState(null);
  const [msg, setMsg] = useState('');

  // Assessment Modals State
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isStage2ModalOpen, setIsStage2ModalOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const jobData = await jobService.getJob(id);
        setJob(jobData);

        if (isAuthenticated) {
          const [userResumes, userApps] = await Promise.allSettled([
            resumeService.getResumes(),
            jobService.getMyApplications(),
          ]);

          if (userResumes.status === 'fulfilled' && Array.isArray(userResumes.value)) {
            setResumes(userResumes.value);
            const primary = userResumes.value.find((r) => r.is_primary) || userResumes.value[0];
            if (primary) {
              setSelectedResumeId(primary.id);
              runMatch(id, primary.id);
            }
          }

          if (userApps.status === 'fulfilled' && Array.isArray(userApps.value)) {
            const existing = userApps.value.find((a) => a.job_id === Number(id));
            if (existing) {
              setApplied(true);
              setApplicationData(existing);
            }
          }
        }
      } catch (err) {
        console.error('Error loading job details:', err);
      }
    };
    loadData();
  }, [id, isAuthenticated]);

  const runMatch = async (jobId, resumeId) => {
    setMatching(true);
    try {
      const match = await jobService.matchJob(jobId, resumeId);
      setMatchResult(match);
    } catch (err) {
      console.error(err);
    } finally {
      setMatching(false);
    }
  };

  const handleApply = async () => {
    if (!selectedResumeId) {
      alert('Please select a resume to apply with.');
      return;
    }
    setApplying(true);
    setMsg('');
    try {
      const res = await jobService.applyToJob(job.id, selectedResumeId);
      setApplied(true);
      setApplicationData(res);
      setMsg('Application registered! Please complete the screening test below to finalize your ranking.');
    } catch (err) {
      setMsg(err.response?.data?.detail || 'Failed to submit application.');
    } finally {
      setApplying(false);
    }
  };

  const handleAssessmentComplete = (result) => {
    setApplied(true);
    setApplicationData((prev) => ({
      ...prev,
      test_score: result.total_test_score,
      candidate_test_submission_id: result.submission_id,
      assessment_status: result.assessment_status || 'COMPLETED',
    }));
  };

  const handleStage2Submitted = (res) => {
    setApplied(true);
    const updatedSub = res?.stage2_submission || res;
    setApplicationData((prev) => ({
      ...prev,
      status: 'STAGE2_SUBMITTED',
      stage2_submission: updatedSub,
    }));
  };

  const handleOpenStage2Assessment = async () => {
    if (!applicationData?.id) {
      if (!selectedResumeId) {
        alert('Please select an active resume first to apply and take the assessment.');
        return;
      }
      try {
        setApplying(true);
        const res = await jobService.applyToJob(job.id, selectedResumeId);
        setApplied(true);
        setApplicationData(res);
        setIsStage2ModalOpen(true);
      } catch (err) {
        setMsg(err.response?.data?.detail || 'Failed to initialize application.');
      } finally {
        setApplying(false);
      }
    } else {
      setIsStage2ModalOpen(true);
    }
  };

  if (!job) return <div className="p-8 text-center text-slate-500">Loading job details...</div>;

  const testScore = applicationData?.test_score;
  const submissionId = applicationData?.candidate_test_submission_id;

  // Manual questions breakdown
  const rawManualQuestions = job.manual_questions;
  let manualMCQCount = 0;
  let manualWrittenCount = 0;

  if (Array.isArray(rawManualQuestions)) {
    manualMCQCount = rawManualQuestions.filter((q) => q.type === 'MCQ' || q.options).length;
    manualWrittenCount = rawManualQuestions.filter(
      (q) => q.type === 'WRITTEN' || (!q.options && (q.instructions !== undefined || q.question))
    ).length;
  } else if (rawManualQuestions && typeof rawManualQuestions === 'object') {
    manualMCQCount = (rawManualQuestions.mcqs || []).length;
    manualWrittenCount = (rawManualQuestions.written || []).length;
  }

  const hasManualStage =
    Boolean(job.has_manual_stage) ||
    manualMCQCount > 0 ||
    manualWrittenCount > 0;

  const m1Marks = manualMCQCount * 2;
  const m2Marks = manualWrittenCount * 10;
  const passingBenchmark =
    job.passing_score !== undefined && job.passing_score !== null
      ? job.passing_score
      : 70;

  return (
    <ErrorBoundary title="Failed to load job details">
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                {job.company_name}
              </span>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{job.title}</h1>
            </div>
            <Badge variant="primary" size="md">
              {String(job.job_type || 'FULL_TIME').replace('_', ' ')}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4 text-slate-400" /> {job.location || 'Remote'}
            </span>
            <span className="flex items-center gap-1">
              <DollarSign className="w-4 h-4 text-slate-400" /> {job.salary_range || 'Competitive'}
            </span>
            <span className="flex items-center gap-1">
              <Briefcase className="w-4 h-4 text-slate-400" /> {job.experience_level}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Job Description & Skills */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Job Description</h3>
              <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                {job.description}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Mandatory Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {(job.required_skills || []).map((s, idx) => (
                    <Badge key={idx} variant="default" size="md">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Right: Application & Screening Test Panel */}
          <div className="space-y-6">
            {isAuthenticated ? (
              <>
                <Card className="space-y-4 bg-gradient-to-br from-indigo-50/30 to-violet-50/20 dark:from-slate-900 dark:to-indigo-950/20">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Application & Screening Workflow
                    </h4>
                  </div>

                  {!job.is_active ? (
                    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-200 space-y-1">
                      <p className="font-bold">Applications Closed</p>
                      <p>This job listing has been paused or archived by the recruiter and is no longer accepting new applications.</p>
                    </div>
                  ) : resumes.length > 0 ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                          Step 1: Select Active Resume:
                        </label>
                        <select
                          value={selectedResumeId}
                          onChange={(e) => {
                            setSelectedResumeId(e.target.value);
                            runMatch(job.id, e.target.value);
                          }}
                          className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {resumes.map((r) => (
                            <option key={r.id} value={r.id}>
                              v{r.version} - {r.file_path ? r.file_path.split('/').pop().split('\\').pop() : 'Resume'}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Step 1: AI Screening Pre-Assessment Box */}
                      <div className="p-4 rounded-xl bg-white dark:bg-slate-850 border border-indigo-200 dark:border-indigo-900/60 shadow-xs space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5">
                            <div className="p-1.5 rounded-lg bg-indigo-600 text-white shrink-0 mt-0.5">
                              <FileCheck className="w-4 h-4" />
                            </div>
                            <div>
                              <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                {hasManualStage ? 'Step 1: AI Screening Pre-Assessment' : 'Pre-Screening Skill Assessment Required'}
                              </h5>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                                Standardized algorithmic evaluation (25 MCQs + 5 Short Written Questions).
                              </p>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 shrink-0">
                            100 Marks
                          </span>
                        </div>

                        {testScore !== undefined && testScore !== null ? (
                          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Screening Exam Completed
                              </span>
                              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                                {Math.round(testScore)}% Grade
                              </span>
                            </div>
                            {submissionId && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsReviewModalOpen(true)}
                                className="w-full text-xs font-bold border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300"
                              >
                                View My Assessment Submission
                              </Button>
                            )}
                          </div>
                        ) : (
                          <Button
                            variant="primary"
                            onClick={() => setIsTestModalOpen(true)}
                            className="w-full text-xs font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-sm"
                          >
                            <Sparkles className="w-4 h-4" />
                            Start Candidate Screening Test (25 MCQs + 5 Written)
                          </Button>
                        )}
                      </div>

                      {/* Step 2: Recruiter Manual Assessment Box (Shown if manual questions exist) */}
                      {hasManualStage && (
                        <div className="p-4 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/80 shadow-xs space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5">
                              <div className="p-1.5 rounded-lg bg-purple-600 text-white shrink-0 mt-0.5">
                                <Award className="w-4 h-4" />
                              </div>
                              <div>
                                <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                  {testScore !== undefined && testScore !== null
                                    ? 'Step 2: Stage-2 Recruiter Manual Assessment'
                                    : 'Stage-2 Recruiter Manual Assessment'}
                                </h5>
                                <p className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 mt-0.5">
                                  Total: {manualMCQCount} MCQs ({m1Marks} Marks) + {manualWrittenCount} Written Questions ({m2Marks} Marks) | Passing Benchmark: {passingBenchmark}%
                                </p>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 shrink-0">
                              {m1Marks + m2Marks} Marks
                            </span>
                          </div>

                          {applicationData?.stage2_submission ? (
                            <div className="p-3 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 rounded-xl space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-purple-800 dark:text-purple-300 flex items-center gap-1.5">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Stage-2 Assessment Submitted
                                </span>
                                <span className="text-xs font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                                  {applicationData.stage2_submission.mcq_marks_earned ?? 0} / {applicationData.stage2_submission.total_mcq_marks ?? m1Marks} MCQ Marks
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Status: <strong>Under Review / Waiting for Final Decision</strong> • Written Questions ({applicationData.stage2_submission.total_written_marks ?? m2Marks} Marks) under evaluation.
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsStage2ModalOpen(true)}
                                className="w-full text-xs font-bold border-purple-300 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                              >
                                View My Stage-2 Answers & Marks Scorecard
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="primary"
                              onClick={handleOpenStage2Assessment}
                              className="w-full text-xs font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-sm"
                            >
                              <Sparkles className="w-4 h-4" />
                              Take Recruiter Assessment / Interview
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Fast-Track Apply Button */}
                      {!applied && (
                        <Button
                          onClick={handleApply}
                          disabled={applying}
                          variant="secondary"
                          className="w-full text-xs"
                          loading={applying}
                        >
                          <Send className="w-3.5 h-3.5 mr-1.5" />
                          Register Application with Selected CV
                        </Button>
                      )}

                      {msg && (
                        <p
                          className={`text-xs p-2.5 rounded-lg font-medium ${
                            applied
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                          }`}
                        >
                          {msg}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 dark:text-slate-400 space-y-2">
                      <p>You haven't uploaded a resume yet.</p>
                      <Button size="sm" variant="outline" onClick={() => navigate('/resumes')}>
                        Upload Resume First
                      </Button>
                    </div>
                  )}
                </Card>

                {matchResult && <MatchScoreCard matchData={matchResult} />}
              </>
            ) : (
              <Card className="text-center p-6 space-y-3">
                <Sparkles className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mx-auto" />
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">Unlock AI Job Matching & Screening</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sign in to compare your resume skills and take the screening test.
                </p>
                <Button variant="primary" size="sm" onClick={() => navigate('/login')} className="w-full">
                  Sign In to Apply
                </Button>
              </Card>
            )}
          </div>
        </div>

        {/* Screening Test Modal */}
        <ScreeningTestModal
          isOpen={isTestModalOpen}
          onClose={() => setIsTestModalOpen(false)}
          jobId={job.id}
          jobTitle={job.title}
          companyName={job.company_name}
          resumeId={selectedResumeId}
          onSuccess={handleAssessmentComplete}
        />

        {/* Submission Review Modal */}
        {submissionId && (
          <SubmissionReviewModal
            isOpen={isReviewModalOpen}
            onClose={() => setIsReviewModalOpen(false)}
            submissionId={submissionId}
          />
        )}

        {/* Stage-2 Recruiter Manual Assessment Modal */}
        {hasManualStage && (
          <Stage2AssessmentModal
            isOpen={isStage2ModalOpen}
            onClose={() => setIsStage2ModalOpen(false)}
            jobId={job.id}
            applicationId={applicationData?.id}
            jobTitle={job.title}
            companyName={job.company_name}
            passingScore={passingBenchmark}
            onSubmitted={handleStage2Submitted}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default JobDetail;
