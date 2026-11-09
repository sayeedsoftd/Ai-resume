import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Video,
  MapPin,
  Mail,
  Phone,
  ExternalLink,
  FileText,
  Sparkles,
  Award,
  Clock,
  User,
  Briefcase,
  GraduationCap,
  Send,
  HelpCircle,
  Check,
  RotateCcw,
  Edit3,
  ShieldAlert,
  AlertTriangle,
  ShieldCheck,
  Shield,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  DollarSign,
  Code2,
  Terminal,
  Radio,
  Volume2,
  Mic,
  ChevronDown,
  ChevronUp,
  FileAudio,
  Zap,
  TrendingUp,
  Star,
  Sprout,
  MessageSquare,
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { jobService } from '../../services/jobService';
import ScheduleInterviewModal from './ScheduleInterviewModal';
import SalaryBenchmarkWidget from './SalaryBenchmarkWidget';
import OfferLetterModal from './OfferLetterModal';
import TeamEvaluationsPanel from './TeamEvaluationsPanel';
import {
  maskCandidateDetails,
  sanitizeParsedResume,
} from '../../utils/blindHiring';

export default function ApplicantDossierModal({
  isOpen,
  onClose,
  applicationId,
  onDecisionMade,
  blindMode = true,
}) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dossier, setDossier] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState('cv'); // 'cv' | 'test' | 'code' | 'stage2' | 'viva' | 'integrity'
  const [isBlindMode, setIsBlindMode] = useState(blindMode);
  const [showRevealPrompt, setShowRevealPrompt] = useState(false);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(true);
  const [auditingProjects, setAuditingProjects] = useState(false);
  const [integrityAudit, setIntegrityAudit] = useState(null);
  const [expandedProjects, setExpandedProjects] = useState({});

  // Decision Modal State
  const [decisionType, setDecisionType] = useState(null); // 'SHORTLIST' | 'REJECT' | 'SCHEDULE_INTERVIEW' | null
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('11:00 AM');
  const [meetingLink, setMeetingLink] = useState('https://meet.google.com/');
  const [recruiterNote, setRecruiterNote] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [generateAiFeedback, setGenerateAiFeedback] = useState(true);
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);

  useEffect(() => {
    setIsBlindMode(blindMode);
  }, [blindMode, isOpen, applicationId]);

  useEffect(() => {
    if (isOpen && applicationId) {
      loadDossier(isBlindMode);
    }
  }, [isOpen, applicationId, isBlindMode]);

  const loadDossier = async (blind = isBlindMode) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await jobService.getApplicationDossier(applicationId, blind);
      setDossier(data);
      if (data?.project_integrity_audit) {
        setIntegrityAudit(data.project_integrity_audit);
      }
    } catch (err) {
      console.error('Failed to load applicant dossier:', err);
      setErrorMsg(
        err.response?.data?.detail || 'Unable to retrieve applicant dossier.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRunProjectAudit = async () => {
    setAuditingProjects(true);
    try {
      const result = await jobService.auditApplicationProjects(applicationId);
      setIntegrityAudit(result);
    } catch (err) {
      console.error('Failed to run project integrity audit:', err);
    } finally {
      setAuditingProjects(false);
    }
  };

  const toggleProjectAccordion = (idx) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const renderProjectIntegritySection = () => (
    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
            <ShieldAlert className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                🔍 AI Project Authenticity & Plagiarism Audit
              </h3>
              {integrityAudit ? (
                integrityAudit.overall_originality_score >= 80 ? (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-2xs">
                    <span>🟢</span> {integrityAudit.overall_originality_score}% Genuine & Custom Built
                  </span>
                ) : integrityAudit.overall_originality_score >= 50 ? (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1.5 shadow-2xs">
                    <span>🟡</span> {integrityAudit.overall_originality_score}% Generic Boilerplate / Mixed Patterns
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1.5 shadow-2xs">
                    <span>🔴</span> Suspected Tutorial Clone / Plagiarism Flagged ({integrityAudit.overall_originality_score}%)
                  </span>
                )
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700">
                  Audit Pending
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Gemini Pro forensic auditor checking YouTube/Udemy clone patterns, commit dumps, and unoriginal code structures.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRunProjectAudit}
          disabled={auditingProjects}
          className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 flex items-center gap-1.5 transition disabled:opacity-50 shrink-0 cursor-pointer shadow-xs"
        >
          <Sparkles className={`w-3.5 h-3.5 ${auditingProjects ? 'animate-spin text-amber-400' : 'text-indigo-400'}`} />
          <span>{auditingProjects ? 'Forensic AI Auditing...' : integrityAudit ? 'Re-audit Projects' : 'Run Forensic Audit'}</span>
        </button>
      </div>

      {integrityAudit ? (
        <div className="space-y-4 pt-1">
          {/* Forensic Summary */}
          {integrityAudit.ai_forensic_summary && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>AI Forensic Summary & Engineering Verdict:</span>
              </div>
              <p>{integrityAudit.ai_forensic_summary}</p>
            </div>
          )}

          {/* Audited Projects List with Originality Bar & Evidence Accordion */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Audited Candidate Projects ({integrityAudit.audited_projects?.length || 0})
            </h4>

            {(!integrityAudit.audited_projects || integrityAudit.audited_projects.length === 0) ? (
              <p className="text-xs text-slate-400 italic">No project repositories were detected to evaluate.</p>
            ) : (
              integrityAudit.audited_projects.map((proj, idx) => {
                const isExpanded = !!expandedProjects[idx];
                const isClone = proj.is_tutorial_clone || proj.originality_score < 50;
                const score = proj.originality_score ?? 50;

                const barColor =
                  score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-rose-500';
                const badgeBg =
                  score >= 80
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : score >= 50
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30';

                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-2.5 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          {proj.project_name}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badgeBg}`}>
                          {proj.verdict || (isClone ? 'Tutorial Clone' : 'Custom Built')}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Originality Progress Bar */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-medium">Originality:</span>
                          <div className="w-24 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full ${barColor} transition-all duration-500`}
                              style={{ width: `${score}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 min-w-[32px]">
                            {score}%
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleProjectAccordion(idx)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
                          title="Toggle evidence accordion"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Pattern Match Notice */}
                    {proj.matched_pattern && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                        <span className="text-indigo-400 font-semibold">Matched Pattern: </span>
                        {proj.matched_pattern}
                      </p>
                    )}

                    {/* Custom Architecture Notes */}
                    {proj.custom_architecture_notes && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-slate-400">Architecture Notes: </span>
                        {proj.custom_architecture_notes}
                      </p>
                    )}

                    {/* Expandable Red Flags & Clone Evidence Accordion */}
                    {isExpanded && (
                      <div className="mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
                        <div className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          <span>Forensic Red Flags & Clone Evidence:</span>
                        </div>

                        {(!proj.red_flags || proj.red_flags.length === 0) ? (
                          <p className="text-[11px] text-emerald-400 italic">
                            ✅ No tutorial cloning red flags detected. Project exhibits custom implementation.
                          </p>
                        ) : (
                          <ul className="space-y-1 pl-1">
                            {proj.red_flags.map((flag, fIdx) => (
                              <li
                                key={fIdx}
                                className="text-[11px] text-rose-300 dark:text-rose-400/90 flex items-start gap-1.5"
                              >
                                <span className="text-rose-500 shrink-0 font-bold">•</span>
                                <span>{flag}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-2">
          <p className="text-xs text-slate-400">
            No project plagiarism audit has been executed for this candidate yet.
          </p>
          <button
            type="button"
            onClick={handleRunProjectAudit}
            disabled={auditingProjects}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm inline-flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{auditingProjects ? 'Auditing Candidate Projects...' : 'Run Forensic Plagiarism & Tutorial Audit'}</span>
          </button>
        </div>
      )}
    </div>
  );

  if (!isOpen) return null;

  const app = dossier?.application;
  const candidate = dossier?.candidate;
  const job = dossier?.job;
  const resume = dossier?.resume;
  const rawParsedData = resume?.parsed_data || {};
  const parsedData = isBlindMode
    ? sanitizeParsedResume(rawParsedData, candidate?.full_name, true)
    : rawParsedData;
  const testSub = dossier?.screening_submission;
  const codingInspection = dossier?.coding_inspection;
  const candCode = codingInspection?.candidate_code || testSub?.candidate_code || app?.candidate_code;
  const codeLang = codingInspection?.code_language || testSub?.code_language || app?.code_language || 'python';
  const codeEval = codingInspection?.code_evaluation || testSub?.code_evaluation || app?.code_evaluation;
  const codingScore =
    codingInspection?.coding_score !== undefined && codingInspection?.coding_score !== null
      ? codingInspection.coding_score
      : testSub?.coding_score !== undefined && testSub?.coding_score !== null
      ? testSub.coding_score
      : app?.coding_score;
  const challenge = codingInspection?.challenge || testSub?.coding_challenge;

  const vivaInspection = dossier?.viva_inspection;
  const vivaAudioUrl = vivaInspection?.viva_audio_url || app?.viva_audio_url || testSub?.viva_audio_url;
  const vivaScore =
    vivaInspection?.viva_score !== undefined && vivaInspection?.viva_score !== null
      ? vivaInspection.viva_score
      : app?.viva_score !== undefined && app?.viva_score !== null
      ? app.viva_score
      : testSub?.viva_score;
  const vivaTranscript = vivaInspection?.viva_transcription || app?.viva_transcription || testSub?.viva_transcription;
  const vivaEval = vivaInspection?.viva_evaluation || app?.viva_evaluation || testSub?.viva_evaluation;
  const vivaPrompt = vivaInspection?.viva_prompt || 'Oral Technical Viva Question';
  const videoPitchUrl = app?.video_pitch_url;
  const adaptiveProf = dossier?.adaptive_profile || (testSub?.adaptive_skill_curve || app?.adaptive_skill_curve ? {
    ability_rating: testSub?.adaptive_ability_rating || app?.adaptive_ability_rating,
    theta_score: testSub?.adaptive_theta_score ?? app?.adaptive_theta_score ?? 50.0,
    skill_curve: testSub?.adaptive_skill_curve || app?.adaptive_skill_curve || [],
    tier_distribution: testSub?.adaptive_tier_distribution || app?.adaptive_tier_distribution || {},
  } : null);
  const candidateMask = maskCandidateDetails(
    { ...candidate, id: applicationId, user_id: candidate?.id },
    isBlindMode
  );

  const handleExecuteDecision = async (statusToSet) => {
    setSubmittingDecision(true);
    try {
      let updated;
      if (statusToSet === 'REJECTED') {
        updated = await jobService.rejectApplication(applicationId, {
          recruiter_notes: rejectionReason || undefined,
          generate_ai_feedback: generateAiFeedback,
        });
      } else {
        const payload = {
          status: statusToSet,
          interview_date: statusToSet !== 'REJECTED' ? interviewDate || undefined : undefined,
          meeting_link: statusToSet !== 'REJECTED' ? meetingLink || undefined : undefined,
          recruiter_note: statusToSet !== 'REJECTED' ? recruiterNote || undefined : undefined,
          rejection_reason: statusToSet === 'REJECTED' ? rejectionReason || undefined : undefined,
        };
        updated = await jobService.makeRecruiterDecision(applicationId, payload);
      }

      setDossier((prev) => ({
        ...prev,
        application: { ...prev.application, ...updated },
      }));
      setDecisionType(null);
      if (onDecisionMade) {
        onDecisionMade(updated);
      }
    } catch (err) {
      console.error('Failed to update decision:', err);
      alert(err.response?.data?.detail || 'Decision submission failed.');
    } finally {
      setSubmittingDecision(false);
    }
  };

  const handleScheduleFormalInterview = async () => {
    if (!interviewDate || !meetingLink) {
      alert('Please specify Interview Date and Meeting Link.');
      return;
    }
    setSubmittingDecision(true);
    try {
      const payload = {
        interview_date: interviewDate,
        interview_time: interviewTime || '11:00 AM',
        meeting_link: meetingLink,
        personal_note: recruiterNote || undefined,
      };
      const updated = await jobService.scheduleInterview(applicationId, payload);
      setDossier((prev) => ({
        ...prev,
        application: { ...prev.application, ...updated },
      }));
      setDecisionType(null);
      if (onDecisionMade) {
        onDecisionMade(updated);
      }
      alert('Formal Interview Scheduled! Candidate notified via email & in-app.');
    } catch (err) {
      console.error('Failed to schedule interview:', err);
      alert(err.response?.data?.detail || 'Failed to schedule formal interview.');
    } finally {
      setSubmittingDecision(false);
    }
  };

  const resumeUrl = resume?.file_path
    ? `http://127.0.0.1:8000/uploads/resumes/${resume.file_path.split('/').pop().split('\\').pop()}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Anti-Bias Mode Active Notification Pill */}
        {isBlindMode && (
          <div className="px-5 sm:px-7 py-2.5 bg-emerald-500/10 dark:bg-emerald-950/40 border-b border-emerald-500/20 text-xs flex items-center justify-between gap-3 text-emerald-900 dark:text-emerald-200 shrink-0">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-[11px] sm:text-xs">
                <strong>Anti-Bias Mode Active:</strong> Candidate personal demographics, university names, and contact identifiers are masked for objective merit evaluation.
              </span>
            </div>
            <button
              onClick={() => {
                setIsBlindMode(false);
                loadDossier(false);
              }}
              className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-1 shrink-0 bg-emerald-100 dark:bg-emerald-900/60 px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-700 transition-colors"
              title="Reveal candidate personal details"
            >
              <Eye className="w-3 h-3" /> Reveal Real Identity
            </button>
          </div>
        )}

        {/* Modal Header */}
        <div className="p-5 sm:px-7 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-800/60 shrink-0">
          <div className="flex items-start gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 border ${
              isBlindMode
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
            }`}>
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                  Applicant Dossier & Answer Sheet
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-xs font-semibold text-slate-500">
                  Application #{applicationId}
                </span>
                {isBlindMode && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    🛡️ Anti-Bias Protected
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                {candidateMask.displayName}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> {candidateMask.email}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" /> {job?.title}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Status / ATS / Test Badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {(app?.is_suspicious || (app?.tab_switch_count && app?.tab_switch_count > 2) || app?.submission_reason === 'AUTO_PROCTOR_VIOLATION' || testSub?.is_suspicious) && (
                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1 animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  ⚠️ Suspicion Flag: High Proctoring Risk
                </span>
              )}
              {app?.match_score && (
                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  ATS: {Math.round(app.match_score)}%
                </span>
              )}
              {app?.test_score !== null && app?.test_score !== undefined ? (
                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700">
                  Test: {Math.round(app.test_score)}%
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  Test: Pending
                </span>
              )}
              {/* Expected Salary & Budget Gatekeeper Badge */}
              {app?.expected_salary != null && (() => {
                const maxBudget = job?.max_salary ? Number(job.max_salary) : null;
                const isWithinBudget = maxBudget !== null ? app.expected_salary <= maxBudget : null;
                const diff = maxBudget !== null && app.expected_salary > maxBudget ? app.expected_salary - maxBudget : 0;

                if (isWithinBudget === true) {
                  return (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1.5 shadow-2xs">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Expected: ৳{Number(app.expected_salary).toLocaleString()}
                      <span className="px-1.5 py-0.2 rounded-full bg-emerald-200 dark:bg-emerald-800 text-[10px] font-black tracking-wide">
                        [ Within Budget ]
                      </span>
                    </span>
                  );
                } else if (isWithinBudget === false) {
                  return (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border border-amber-300 dark:border-amber-700 flex items-center gap-1.5 shadow-2xs">
                      <DollarSign className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      Expected: ৳{Number(app.expected_salary).toLocaleString()}
                      <span className="px-1.5 py-0.2 rounded-full bg-amber-200 dark:bg-amber-800 text-[10px] font-black tracking-wide">
                        [ Above Budget: +৳{diff.toLocaleString()} ]
                      </span>
                    </span>
                  );
                } else {
                  return (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                      Expected: ৳{Number(app.expected_salary).toLocaleString()}
                    </span>
                  );
                }
              })()}

              {videoPitchUrl && (
                <button
                  onClick={() => setActiveTab('pitch')}
                  className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1.5 hover:bg-rose-200 dark:hover:bg-rose-900 transition-colors cursor-pointer"
                  title="Click to view candidate 60s elevator video pitch"
                >
                  <Video className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  🎥 60s Video Pitch Available
                </button>
              )}

              {/* Project Integrity & Plagiarism Badge */}
              {integrityAudit && (
                <button
                  type="button"
                  onClick={() => setActiveTab('integrity')}
                  className="cursor-pointer"
                  title="Click to inspect AI project authenticity and plagiarism audit"
                >
                  {integrityAudit.overall_originality_score >= 80 ? (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-2xs hover:bg-emerald-500/20 transition">
                      <span>🟢</span> {integrityAudit.overall_originality_score}% Genuine & Custom Built
                    </span>
                  ) : integrityAudit.overall_originality_score >= 50 ? (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1.5 shadow-2xs hover:bg-amber-500/20 transition">
                      <span>🟡</span> {integrityAudit.overall_originality_score}% Generic Boilerplate / Mixed
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1.5 shadow-2xs hover:bg-rose-500/20 transition">
                      <span>🔴</span> Suspected Tutorial Clone / Plagiarism Flagged ({integrityAudit.overall_originality_score}%)
                    </span>
                  )}
                </button>
              )}

              <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                {app?.status || 'APPLIED'}
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigator */}
        <div className="px-6 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4 shrink-0 overflow-x-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('cv')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'cv'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              Tab 1: Candidate CV & ATS Overview
            </button>
            <button
              onClick={() => setActiveTab('test')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'test'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Award className="w-4 h-4" />
              Tab 2: Screening Test Evaluation & Answer Sheet (25 MCQs + 5 Written)
            </button>

            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'code'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Code2 className="w-4 h-4" />
              Technical Code Inspection
              {codingScore !== undefined && codingScore !== null && (
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 font-mono font-bold">
                  {Math.round(codingScore)}%
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('viva')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'viva'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Radio className="w-4 h-4" />
              Voice Viva Screening
              {vivaScore !== undefined && vivaScore !== null && (
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200 font-bold">
                  {Math.round(vivaScore)}%
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('pitch')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'pitch'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Video className="w-4 h-4" />
              60s Video Pitch
              {videoPitchUrl ? (
                <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-400 text-slate-900 font-black">
                  Available
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-200 dark:bg-slate-700 text-slate-500 font-bold">
                  None
                </span>
              )}
            </button>

            {(job?.has_manual_stage || dossier?.stage2_questions || dossier?.stage2_submission || app?.stage2_submission) && (
              <button
                onClick={() => setActiveTab('stage2')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'stage2'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Tab 3: Stage-2 Custom Assessment & Answers
                {app?.stage2_submission && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-400 text-slate-900 font-black">
                    Submitted
                  </span>
                )}
              </button>
            )}

            <button
              onClick={() => setActiveTab('evaluations')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'evaluations'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              Team Notes & Ratings
              {dossier?.team_evaluations_summary?.total_evaluators > 0 ? (
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 font-bold">
                  {dossier.team_evaluations_summary.average_rating}★ ({dossier.team_evaluations_summary.total_evaluators})
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-200 dark:bg-slate-700 text-slate-500 font-bold">
                  Review
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('integrity')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'integrity'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              🔍 Project Integrity & Plagiarism
              {integrityAudit ? (
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-black font-mono ${
                    integrityAudit.overall_originality_score >= 80
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : integrityAudit.overall_originality_score >= 50
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  }`}
                >
                  {integrityAudit.overall_originality_score}%
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-200 dark:bg-slate-700 text-slate-500 font-bold">
                  Audit
                </span>
              )}
            </button>
          </div>

          {resumeUrl && (
            isBlindMode ? (
              <button
                onClick={() => setShowRevealPrompt(true)}
                className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors shrink-0"
                title="Raw PDF contains personal photos and demographics. Click to reveal identity."
              >
                <Lock className="w-3.5 h-3.5" /> PDF Protected in Anti-Bias Mode
              </button>
            ) : (
              <a
                href={resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open Resume PDF
              </a>
            )
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="text-center py-20 text-slate-500">
              <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading verified applicant dossier...
            </div>
          ) : errorMsg ? (
            <div className="text-center py-16 text-slate-500 space-y-3">
              <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
              <p className="text-xs font-medium">{errorMsg}</p>
              <Button size="sm" variant="secondary" onClick={loadDossier}>
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Retry
              </Button>
            </div>
          ) : activeTab === 'cv' ? (
            /* =========================================================
               TAB 1: CANDIDATE CV & ATS OVERVIEW
               ========================================================= */
            <div className="space-y-6">
              {/* Scheduled Interview & WhatsApp Alert Delivered Status Banner */}
              {(app?.status === 'INTERVIEW' || app?.interview_date || app?.notification_sent) && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-indigo-50/60 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-slate-900 border border-emerald-200 dark:border-emerald-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-2xs">
                  <div className="flex items-center gap-3">
                    <span className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs shrink-0">
                      <Calendar className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-slate-900 dark:text-white font-bold">
                          Interview Scheduled: {app?.interview_date || 'Upcoming'} {app?.interview_time ? `at ${app.interview_time}` : ''}
                        </strong>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shadow-2xs">
                          <span>🟢</span> WhatsApp Alert Delivered
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                          📱 SMS Dispatched
                        </span>
                      </div>
                      {app?.meeting_link && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                          Meeting Link: <a href={app.meeting_link} target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 underline">{app.meeting_link}</a>
                        </p>
                      )}
                    </div>
                  </div>
                  {app?.meeting_link && (
                    <a
                      href={app.meeting_link}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1.5 shrink-0 shadow-sm"
                    >
                      <Video className="w-3.5 h-3.5" /> Join Room
                    </a>
                  )}
                </div>
              )}

              {/* Constructive AI Career Growth Roadmap Status Banner */}
              {app?.ai_growth_feedback && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50/80 via-teal-50/60 to-indigo-50/60 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-slate-900 border border-emerald-200 dark:border-emerald-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-2xs">
                  <div className="flex items-center gap-3">
                    <span className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs shrink-0">
                      <Sprout className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-slate-900 dark:text-white font-bold">
                          Empathetic AI Career Growth Roadmap Generated
                        </strong>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                          Gemini Pro Mentorship
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Constructive improvement roadmap, verified strengths, and study checklist delivered to candidate dashboard.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Salary Benchmark & Employer Budget Fit Card */}
              {app?.expected_salary != null && (
                <SalaryBenchmarkWidget
                  expectedSalary={app.expected_salary}
                  jobMinSalary={job?.min_salary}
                  jobMaxSalary={job?.max_salary}
                  salaryFitStatus={app?.salary_fit_status}
                  benchmarkAnalysis={dossier?.ai_salary_benchmark_analysis || app?.ai_salary_benchmark_analysis}
                  compact={false}
                />
              )}

              {/* Oral Technical Viva Screening Overview Banner */}
              {(vivaAudioUrl || vivaScore !== undefined) && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 dark:from-purple-950/40 dark:via-slate-900 dark:to-purple-950/40 border border-purple-200 dark:border-purple-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="p-2 rounded-xl bg-purple-600 text-white shadow-xs shrink-0">
                      <Radio className="w-4 h-4 animate-pulse" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-slate-900 dark:text-white font-bold">
                          Oral Technical Viva Screening Completed
                        </strong>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-700">
                          🎙️ Viva Score: {Math.round(vivaScore || 0)}%
                        </span>
                        {vivaEval?.confidence_and_tone && (
                          <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300">
                            • {vivaEval.confidence_and_tone}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 line-clamp-1">
                        {vivaEval?.ai_viva_summary || vivaTranscript || 'Oral audio evaluation processed by Gemini Pro.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
                    {vivaAudioUrl && (
                      <audio
                        src={vivaAudioUrl.startsWith('http') ? vivaAudioUrl : `http://127.0.0.1:8000${vivaAudioUrl}`}
                        controls
                        className="h-8 max-w-[190px]"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveTab('viva')}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] transition-colors"
                    >
                      View Viva & Transcript →
                    </button>
                  </div>
                </div>
              )}

              {/* 🔍 AI Project Authenticity & Plagiarism Detector Section */}
              {renderProjectIntegritySection()}

              {/* ATS 4-Factor Breakdown Card */}
              <div className="bg-gradient-to-br from-indigo-50/70 via-white to-violet-50/50 dark:from-slate-900 dark:via-slate-850 dark:to-indigo-950/30 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      4-Stage ATS Composite Analysis
                    </span>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">
                      ATS Score: {Math.round(app?.match_score || 0)}%
                    </h3>
                  </div>
                  <Badge variant="primary" size="sm">
                    {parsedData.domain || 'Domain Verified'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block font-bold">Skills Match (40%)</span>
                    <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                      {Math.round((app?.match_score || 70) * 0.4)} / 40
                    </span>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block font-bold">Experience Match (30%)</span>
                    <span className="text-base font-black text-indigo-600 dark:text-indigo-400">
                      {Math.round((app?.match_score || 70) * 0.3)} / 30
                    </span>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block font-bold">Education (20%)</span>
                    <span className="text-base font-black text-purple-600 dark:text-purple-400">
                      18 / 20
                    </span>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block font-bold">Format & Readability (10%)</span>
                    <span className="text-base font-black text-sky-600 dark:text-sky-400">
                      10 / 10
                    </span>
                  </div>
                </div>

                {/* Professional Summary */}
                {parsedData.summary && (
                  <div className="pt-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800">
                    <strong className="block text-slate-900 dark:text-white font-bold mb-1">
                      Professional Summary:
                    </strong>
                    {parsedData.summary}
                  </div>
                )}
              </div>

              {/* Skills Inventory Breakdown */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Skills Matching & Gap Analysis
                </h4>

                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                      Candidate Extracted Skills ({(parsedData.all_skills || parsedData.skills || []).length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(parsedData.all_skills || parsedData.skills || []).map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                        >
                          ✓ {typeof s === 'string' ? s : JSON.stringify(s)}
                        </span>
                      ))}
                    </div>
                  </div>

                  {job?.required_skills && job.required_skills.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Circular Required Skills
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {job.required_skills.map((s, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Work Experience History */}
              {Array.isArray(parsedData.experience) && parsedData.experience.length > 0 && (
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-indigo-500" />
                    Verified Work Experience
                  </h4>
                  <div className="space-y-4 divide-y divide-slate-100 dark:divide-slate-800">
                    {parsedData.experience.map((exp, idx) => (
                      <div key={idx} className={idx > 0 ? 'pt-3' : ''}>
                        <div className="flex items-center justify-between">
                          <h5 className="text-sm font-bold text-slate-900 dark:text-white">
                            {exp.title}
                          </h5>
                          <span className="text-[11px] text-slate-400">
                            {exp.start_date || 'N/A'} - {exp.end_date || 'Present'}
                          </span>
                        </div>
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          {exp.company}
                        </span>
                        {Array.isArray(exp.achievements) && exp.achievements.length > 0 && (
                          <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-300 mt-1.5 space-y-0.5">
                            {exp.achievements.map((ach, achIdx) => (
                              <li key={achIdx}>{ach}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {Array.isArray(parsedData.education) && parsedData.education.length > 0 && (
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-purple-500" />
                    Education History
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {parsedData.education.map((edu, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs"
                      >
                        <strong className="block font-bold text-slate-900 dark:text-white">
                          {edu.degree || edu.major || 'Degree'}
                        </strong>
                        <span className="text-slate-500">
                          {isBlindMode ? 'Accredited University' : edu.institution || 'Accredited University'}
                        </span>
                        <div className="text-[11px] text-slate-400 mt-1">
                          Graduation: {edu.graduation_year || 'N/A'}{' '}
                          {edu.gpa ? `• GPA: ${edu.gpa}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'test' ? (
            /* =========================================================
               TAB 2: SCREENING TEST EVALUATION & ANSWER SHEET
               ========================================================= */
            <div className="space-y-6">
              {!testSub ? (
                <div className="text-center py-16 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 space-y-2">
                  <Clock className="w-12 h-12 text-slate-400 mx-auto" />
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                    Screening Test Not Yet Completed
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    The candidate has registered their application but has not yet finalized their 30-question screening test.
                  </p>
                </div>
              ) : (
                <>
                  {/* Test Summary Score Card */}
                  <div className="bg-gradient-to-br from-indigo-50/70 via-white to-violet-50/60 dark:from-slate-900 dark:via-slate-850 dark:to-indigo-950/30 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-indigo-600/30 shrink-0">
                        {Math.round(testSub.total_test_score)}%
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          Automated Exam Score
                        </span>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                          Verified Candidate Assessment
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Completed on {new Date(testSub.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex sm:flex-col gap-2 shrink-0">
                      <div className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                        <span className="text-[10px] text-slate-400 block font-semibold">
                          Part 1: MCQs (50%)
                        </span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                          {testSub.mcq_score} / 50.0 pts
                        </span>
                      </div>
                      <div className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                        <span className="text-[10px] text-slate-400 block font-semibold">
                          Part 2: Written Problems (50%)
                        </span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                          {testSub.written_score} / 50.0 pts
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic AI Adaptive Testing & Skill Ceiling Card */}
                  {adaptiveProf && (
                    <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-indigo-900/40 via-slate-900 to-purple-950/40 border border-indigo-500/30 dark:border-indigo-500/30 text-white space-y-4 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-500/20 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
                            <Zap className="w-5 h-5 text-indigo-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-black uppercase tracking-wider text-white">
                                Dynamic Adaptive Testing & Demonstrated Ceiling
                              </h4>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                                Item Response Model
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-300">
                              Latent competency calibration via multi-tiered algorithmic question paths
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <span className="px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-sm border border-indigo-300/30">
                            🏆 {adaptiveProf.ability_rating || 'Senior / Expert Architecture'}
                          </span>
                          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-slate-800 text-indigo-300 border border-indigo-700/50">
                            Theta: {Number(adaptiveProf.theta_score || 50).toFixed(1)} / 100
                          </span>
                        </div>
                      </div>

                      {/* Tier Distribution Multipliers & Results */}
                      {adaptiveProf.tier_distribution && Object.keys(adaptiveProf.tier_distribution).length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          {Object.entries(adaptiveProf.tier_distribution).map(([tKey, tData]) => {
                            const tierPills = {
                              EASY: { label: '🟢 Foundational', weight: '1.0x', border: 'border-emerald-500/30', bg: 'bg-emerald-950/30' },
                              MEDIUM: { label: '🟡 Applied', weight: '1.5x', border: 'border-amber-500/30', bg: 'bg-amber-950/30' },
                              HARD: { label: '🟣 Deep Technical', weight: '2.2x', border: 'border-purple-500/30', bg: 'bg-purple-950/30' },
                              EXPERT: { label: '🔴 Expert Arch.', weight: '3.0x', border: 'border-rose-500/30', bg: 'bg-rose-950/30' },
                            };
                            const info = tierPills[tKey] || { label: tKey, weight: '1.0x', border: 'border-slate-700', bg: 'bg-slate-800' };
                            return (
                              <div key={tKey} className={`p-3 rounded-xl border ${info.border} ${info.bg} space-y-1`}>
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-slate-200">{info.label}</span>
                                  <span className="text-[10px] font-mono text-slate-400">{info.weight}</span>
                                </div>
                                <div className="flex items-baseline justify-between pt-0.5">
                                  <span className="text-base font-black text-white font-mono">
                                    {tData.correct || 0} / {tData.attempted || 0}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {tData.attempted ? Math.round(((tData.correct || 0) / tData.attempted) * 100) : 0}% Acc.
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Adaptive Step Curve Interactive Progression Chart */}
                      {adaptiveProf.skill_curve && adaptiveProf.skill_curve.length > 0 && (
                        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-200">
                              Candidate Latent Ability Trajectory (Step Progression):
                            </span>
                            <span className="text-[11px] text-slate-400">
                              15 Sequential Adaptive Challenge Iterations
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {adaptiveProf.skill_curve.map((step, sIdx) => {
                              const stepTierStyles = {
                                EASY: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                                MEDIUM: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                                HARD: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
                                EXPERT: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
                              };
                              return (
                                <div
                                  key={sIdx}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold border flex items-center gap-1.5 ${stepTierStyles[step.tier] || 'bg-slate-800 text-slate-300 border-slate-700'}`}
                                  title={`Step ${step.question_number || sIdx + 1}: ${step.tier} (Weight: ${step.weight || 1.5}x) - ${step.is_correct ? 'Correct' : 'Incorrect'} | Theta: ${step.theta_after}`}
                                >
                                  <span className="text-slate-400">#{step.question_number || sIdx + 1}</span>
                                  <span>{step.tier}</span>
                                  <span className={step.is_correct ? 'text-emerald-400 font-black' : 'text-rose-400 font-black'}>
                                    {step.is_correct ? '✔' : '✘'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Anti-Cheating & Proctoring Audit Report Card */}
                  <div
                    className={`p-5 rounded-2xl border ${
                      testSub.is_suspicious ||
                      app?.is_suspicious ||
                      (testSub.tab_switch_count && testSub.tab_switch_count > 2) ||
                      (app?.tab_switch_count && app?.tab_switch_count > 2) ||
                      testSub.submission_reason === 'AUTO_PROCTOR_VIOLATION' ||
                      app?.submission_reason === 'AUTO_PROCTOR_VIOLATION'
                        ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                    } space-y-3`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-700/60 pb-3">
                      <div className="flex items-center gap-2">
                        <ShieldAlert
                          className={`w-5 h-5 ${
                            testSub.is_suspicious ||
                            app?.is_suspicious ||
                            (testSub.tab_switch_count && testSub.tab_switch_count > 2) ||
                            (app?.tab_switch_count && app?.tab_switch_count > 2) ||
                            testSub.submission_reason === 'AUTO_PROCTOR_VIOLATION' ||
                            app?.submission_reason === 'AUTO_PROCTOR_VIOLATION'
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-indigo-600 dark:text-indigo-400'
                          }`}
                        />
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                            Proctoring & Anti-Cheating Audit Report
                          </h4>
                          <span className="text-[11px] text-slate-500">
                            Real-time candidate focus monitoring & violation logs
                          </span>
                        </div>
                      </div>

                      {testSub.is_suspicious ||
                      app?.is_suspicious ||
                      (testSub.tab_switch_count && testSub.tab_switch_count > 2) ||
                      (app?.tab_switch_count && app?.tab_switch_count > 2) ||
                      testSub.submission_reason === 'AUTO_PROCTOR_VIOLATION' ||
                      app?.submission_reason === 'AUTO_PROCTOR_VIOLATION' ? (
                        <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-200 text-rose-900 dark:bg-rose-900 dark:text-rose-100 border border-rose-300 flex items-center gap-1.5 self-start sm:self-auto">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          High Proctoring Risk Flagged
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 flex items-center gap-1.5 self-start sm:self-auto">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Normal Proctoring Status
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Tab Switches Detected
                        </span>
                        <span className="text-base font-black text-slate-900 dark:text-white mt-0.5 block">
                          {testSub.tab_switch_count ?? app?.tab_switch_count ?? 0} switches
                        </span>
                      </div>

                      <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Submission Mode
                        </span>
                        <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 block uppercase">
                          {testSub.submission_reason || app?.submission_reason || 'NORMAL'}
                        </span>
                      </div>

                      <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Integrity Status
                        </span>
                        <span
                          className={`text-sm font-black mt-0.5 block ${
                            testSub.is_suspicious ||
                            app?.is_suspicious ||
                            (testSub.tab_switch_count && testSub.tab_switch_count > 2) ||
                            (app?.tab_switch_count && app?.tab_switch_count > 2)
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {testSub.is_suspicious ||
                          app?.is_suspicious ||
                          (testSub.tab_switch_count && testSub.tab_switch_count > 2) ||
                          (app?.tab_switch_count && app?.tab_switch_count > 2)
                            ? 'FLAGGED AS SUSPICIOUS'
                            : 'CLEARED'}
                        </span>
                      </div>
                    </div>

                    {/* Violation Log Events List */}
                    {((testSub.proctoring_violations &&
                      Array.isArray(testSub.proctoring_violations) &&
                      testSub.proctoring_violations.length > 0) ||
                      (app?.proctoring_violations &&
                        Array.isArray(app.proctoring_violations) &&
                        app.proctoring_violations.length > 0)) && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">
                          Violation Incident Logs & Timestamps:
                        </span>
                        <div className="space-y-1 max-h-36 overflow-y-auto">
                          {(
                            testSub.proctoring_violations ||
                            app?.proctoring_violations ||
                            []
                          ).map((violation, vIdx) => (
                            <div
                              key={vIdx}
                              className="text-[11px] p-2 rounded-lg bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-slate-700 dark:text-slate-300"
                            >
                              <span className="font-medium">
                                {violation.event ||
                                  (typeof violation === 'string'
                                    ? violation
                                    : JSON.stringify(violation))}
                              </span>
                              {violation.timestamp && (
                                <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">
                                  {violation.timestamp}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 25 MCQs Answer Sheet Section */}
                  <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <HelpCircle className="w-4 h-4 text-indigo-600" />
                          25 Multiple Choice Questions Review & Answer Key
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Inspect the candidate's selected choice versus the correct answer and explanation.
                        </p>
                      </div>
                      <Badge variant="primary">
                        {(testSub.mcq_review || []).filter((q) => q.is_correct).length} /{' '}
                        {(testSub.mcq_review || []).length} Correct
                      </Badge>
                    </div>

                    <div className="space-y-4">
                      {(testSub.mcq_review || []).map((q, idx) => (
                        <div
                          key={q.id || idx}
                          className={`p-4 rounded-xl border text-xs space-y-2.5 transition-all ${
                            q.is_correct
                              ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10'
                              : 'border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2">
                              <span className="w-5 h-5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <h5 className="font-bold text-slate-900 dark:text-slate-100 leading-snug">
                                {q.question}
                              </h5>
                            </div>
                            {q.is_correct ? (
                              <span className="inline-flex items-center gap-1 font-bold text-[10px] text-emerald-600 dark:text-emerald-400 shrink-0 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" /> Correct
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-bold text-[10px] text-rose-600 dark:text-rose-400 shrink-0 bg-rose-100 dark:bg-rose-950 px-2 py-0.5 rounded-full">
                                <XCircle className="w-3 h-3" /> Incorrect
                              </span>
                            )}
                          </div>

                          {/* Options display */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-7">
                            {(q.options || []).map((opt, optIdx) => {
                              const letter = String.fromCharCode(65 + optIdx);
                              const isCandidateChoice = q.candidate_option === letter;
                              const isCorrectOption = q.correct_option === letter;

                              let optClass = 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800';
                              if (isCorrectOption) {
                                optClass = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-bold';
                              } else if (isCandidateChoice && !q.is_correct) {
                                optClass = 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 font-bold';
                              }

                              return (
                                <div
                                  key={optIdx}
                                  className={`p-2 rounded-lg border text-[11px] flex items-center justify-between ${optClass}`}
                                >
                                  <span>{opt}</span>
                                  {isCandidateChoice && (
                                    <span className="text-[9px] uppercase font-black px-1.5 py-0.2 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 ml-2">
                                      Candidate Pick
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {q.explanation && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-7 italic">
                              <strong>Explanation:</strong> {q.explanation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 5 Short Written Questions Section */}
                  <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Edit3 className="w-4 h-4 text-indigo-600" />
                        5 Short Written Questions & Gemini AI Rubric Evaluation
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Examine the candidate's submitted solution alongside the expected rubric and AI feedback.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {(testSub.written_review || []).map((wq, idx) => (
                        <div
                          key={wq.id || idx}
                          className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 space-y-3 text-xs"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <h5 className="font-bold text-slate-900 dark:text-white leading-relaxed flex items-start gap-2">
                              <span className="w-5 h-5 rounded-md bg-indigo-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                                #{idx + 1}
                              </span>
                              {wq.question}
                            </h5>
                            <span className="px-2.5 py-1 rounded-lg font-black text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 shrink-0">
                              {wq.marks_awarded} / {wq.max_marks || 10} pts
                            </span>
                          </div>

                          {/* Candidate Submitted Response */}
                          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                              Candidate Response:
                            </span>
                            <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                              {wq.candidate_answer || '[No response provided]'}
                            </p>
                          </div>

                          {/* Ideal Rubric */}
                          {wq.ideal_answer_rubric && (
                            <div className="p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-900 dark:text-amber-200">
                              <strong>Expected Grading Rubric:</strong> {wq.ideal_answer_rubric}
                            </div>
                          )}

                          {/* Gemini AI Feedback */}
                          <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                              Gemini AI Evaluation:
                            </span>
                            <p className="text-slate-700 dark:text-slate-300">
                              {wq.feedback || 'Automated rubric grading applied.'}
                            </p>
                            {wq.strengths && (
                              <p className="text-emerald-700 dark:text-emerald-300 text-[11px]">
                                <strong>Strengths:</strong> {wq.strengths}
                              </p>
                            )}
                            {wq.areas_for_improvement && (
                              <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                                <strong>Improvement:</strong> {wq.areas_for_improvement}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : activeTab === 'stage2' ? (
            /* =========================================================
               TAB 3: STAGE-2 CUSTOM ASSESSMENT & AUDIT ANSWER SHEET
               ========================================================= */
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-50/70 via-white to-indigo-50/50 dark:from-slate-900 dark:via-slate-850 dark:to-purple-950/30 border border-purple-200 dark:border-purple-900/50 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-600 dark:text-purple-400">
                      Recruiter-Curated Assessment Audit
                    </span>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">
                      Stage-2 Custom Technical Assessment
                    </h3>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      app?.stage2_submission
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                    }`}
                  >
                    {app?.stage2_submission ? 'Candidate Submitted Answers' : 'Awaiting Candidate Submission'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Read-only audit record of candidate responses for the job-specific Stage-2 test.
                  {app?.stage2_submission?.submitted_at &&
                    ` • Submitted: ${new Date(app.stage2_submission.submitted_at).toLocaleString()}`}
                </p>
              </div>

              {!app?.stage2_submission ? (
                <div className="text-center py-16 bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 space-y-2">
                  <Clock className="w-10 h-10 text-amber-500 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Candidate Has Not Submitted Stage-2 Yet
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    The candidate was invited to take this custom test on invitation. As soon as they complete it, their answers will appear here in read-only audit format.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {(() => {
                    const rawStage2Questions =
                      dossier?.stage2_questions || job?.manual_questions || [];
                    const stage2Mcqs = Array.isArray(rawStage2Questions)
                      ? rawStage2Questions.filter((q) => q.type === 'MCQ' || q.options)
                      : rawStage2Questions.mcqs || [];
                    const stage2Written = Array.isArray(rawStage2Questions)
                      ? rawStage2Questions.filter(
                          (q) =>
                            q.type === 'WRITTEN' ||
                            (!q.options &&
                              (q.instructions !== undefined || q.question))
                        )
                      : rawStage2Questions.written || [];

                    const sub = app.stage2_submission || {};
                    const mcqMarksEarned = sub.mcq_marks_earned ?? 0;
                    const totalMcqMarks = sub.total_mcq_marks ?? (stage2Mcqs.length * 2);
                    const totalWrittenMarks = sub.total_written_marks ?? (stage2Written.length * 10);
                    const maxMarks = sub.max_total_marks ?? (totalMcqMarks + totalWrittenMarks);

                    return (
                      <>
                        {/* Recruiter Marks Scorecard Banner */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">Auto-Evaluated MCQs</span>
                            <strong className="text-emerald-700 dark:text-emerald-300 text-sm">
                              {mcqMarksEarned} / {totalMcqMarks} Marks
                            </strong>
                            <span className="text-[10px] text-slate-500 block">
                              ({sub.mcqs_correct ?? 0} of {stage2Mcqs.length} correct • 2 marks each)
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">Written Questions Evaluation</span>
                            <strong className="text-indigo-700 dark:text-indigo-300 text-sm">
                              {totalWrittenMarks} Marks Possible
                            </strong>
                            <span className="text-[10px] text-slate-500 block">
                              ({stage2Written.length} written responses • 10 marks each)
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Assessment Marks</span>
                            <strong className="text-purple-700 dark:text-purple-300 text-sm">
                              {mcqMarksEarned} / {maxMarks} Marks Scored
                            </strong>
                            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold block">
                              Job Passing Benchmark: {job?.passing_score || 70}%
                            </span>
                          </div>
                        </div>

                        {/* Stage-2 Proctoring Report Card */}
                        {(sub.tab_switch_count !== undefined ||
                          sub.is_suspicious !== undefined ||
                          app?.tab_switch_count !== undefined) && (
                          <div
                            className={`p-4 rounded-2xl border ${
                              sub.is_suspicious ||
                              (sub.tab_switch_count && sub.tab_switch_count > 2) ||
                              sub.submission_reason === 'AUTO_PROCTOR_VIOLATION'
                                ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                            } space-y-2.5`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-slate-900 dark:text-white">
                                <ShieldAlert
                                  className={`w-4 h-4 ${
                                    sub.is_suspicious ||
                                    (sub.tab_switch_count && sub.tab_switch_count > 2)
                                      ? 'text-rose-600 dark:text-rose-400'
                                      : 'text-purple-600 dark:text-purple-400'
                                  }`}
                                />
                                Stage-2 Anti-Cheating & Focus Audit
                              </span>
                              {sub.is_suspicious ||
                              (sub.tab_switch_count && sub.tab_switch_count > 2) ||
                              sub.submission_reason === 'AUTO_PROCTOR_VIOLATION' ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-200 text-rose-900 dark:bg-rose-900 dark:text-rose-100 border border-rose-300 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  Suspicious Submission
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                                  Proctoring Clean
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-300 flex flex-wrap items-center gap-3 font-medium">
                              <span>
                                Focus Losses / Tab Switches:{' '}
                                <strong className="font-bold text-slate-900 dark:text-white">
                                  {sub.tab_switch_count ?? app?.tab_switch_count ?? 0}
                                </strong>
                              </span>
                              <span>•</span>
                              <span>
                                Submission Mode:{' '}
                                <strong className="font-bold uppercase text-slate-900 dark:text-white">
                                  {sub.submission_reason || app?.submission_reason || 'NORMAL'}
                                </strong>
                              </span>
                            </div>
                            {sub.proctoring_violations &&
                              Array.isArray(sub.proctoring_violations) &&
                              sub.proctoring_violations.length > 0 && (
                                <div className="space-y-1 pt-1">
                                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                                    Incident Log:
                                  </span>
                                  <div className="space-y-1 max-h-28 overflow-y-auto">
                                    {sub.proctoring_violations.map((violation, vIdx) => (
                                      <div
                                        key={vIdx}
                                        className="text-[11px] p-1.5 rounded-lg bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                                      >
                                        <span>
                                          {violation.event ||
                                            (typeof violation === 'string'
                                              ? violation
                                              : JSON.stringify(violation))}
                                        </span>
                                        {violation.timestamp && (
                                          <span className="text-[10px] text-slate-400 font-mono ml-2">
                                            {violation.timestamp}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                          </div>
                        )}

                        {/* Stage-2 Custom MCQs */}
                        {stage2Mcqs.length > 0 && (
                          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 space-y-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                              Custom Multiple Choice Questions ({stage2Mcqs.length})
                            </h4>
                            <div className="space-y-4">
                              {stage2Mcqs.map((q, idx) => {
                                const candChoice =
                                  app.stage2_submission?.mcq_answers?.[String(q.id)] || '';
                                const isCorrect =
                                  candChoice &&
                                  q.correct_option &&
                                  candChoice.toUpperCase() ===
                                    q.correct_option.toUpperCase();
                                return (
                                  <div
                                    key={idx}
                                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 space-y-2 text-xs"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <h5 className="font-bold text-slate-900 dark:text-white leading-relaxed flex items-start gap-2">
                                        <span className="w-5 h-5 rounded-md bg-purple-600 text-white font-black text-[11px] flex items-center justify-center shrink-0">
                                          #{idx + 1}
                                        </span>
                                        {q.question}
                                      </h5>
                                      {candChoice && (
                                        <span
                                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                            isCorrect
                                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                                          }`}
                                        >
                                          {isCorrect ? 'Correct' : 'Mismatch'}
                                        </span>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 pl-7">
                                      {(q.options || []).map((opt, oIdx) => {
                                        const optKey =
                                          ['A', 'B', 'C', 'D'][oIdx] || String(oIdx);
                                        const isSelected = candChoice === optKey;
                                        const isKey = q.correct_option === optKey;
                                        return (
                                          <div
                                            key={oIdx}
                                            className={`p-2.5 rounded-lg border text-[11px] flex items-center justify-between ${
                                              isKey
                                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-bold'
                                                : isSelected
                                                ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200'
                                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                            }`}
                                          >
                                            <span>
                                              <strong>{optKey}.</strong> {opt}
                                            </span>
                                            {isSelected && (
                                              <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 ml-2">
                                                Candidate Pick
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Stage-2 Custom Written Questions */}
                        {stage2Written.length > 0 && (
                          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 space-y-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                              Custom Scenario & Written Questions ({stage2Written.length})
                            </h4>
                            <div className="space-y-4">
                              {stage2Written.map((wq, idx) => {
                                const candAnswer =
                                  app.stage2_submission?.written_answers?.[String(wq.id)] ||
                                  '';
                                return (
                                  <div
                                    key={idx}
                                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 space-y-3 text-xs"
                                  >
                                    <h5 className="font-bold text-slate-900 dark:text-white leading-relaxed flex items-start gap-2">
                                      <span className="w-5 h-5 rounded-md bg-purple-600 text-white font-black text-[11px] flex items-center justify-center shrink-0">
                                        #{idx + 1}
                                      </span>
                                      {wq.question}
                                    </h5>
                                    {wq.instructions && (
                                      <p className="text-[11px] text-slate-500 pl-7 italic">
                                        <strong>Expected Guide:</strong> {wq.instructions}
                                      </p>
                                    )}
                                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 ml-7 space-y-1">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
                                        Candidate Submitted Response:
                                      </span>
                                      <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                                        {candAnswer || '[No response submitted]'}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          ) : activeTab === 'code' ? (
            /* =========================================================
               TAB 4: TECHNICAL CODE INSPECTION & GEMINI EVALUATION
               ========================================================= */
            <div className="space-y-6">
              {/* Header Hero KPI Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/60 dark:from-slate-900 dark:via-slate-850 dark:to-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                      Technical Assessment Audit
                    </span>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 mt-0.5">
                      <Code2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      Live Coding Submission & Algorithmic Trace
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3.5 py-1.5 rounded-xl font-mono text-xs font-black bg-blue-600 text-white shadow-xs">
                      Score: {codingScore !== undefined && codingScore !== null ? Math.round(codingScore) : 0}%
                    </span>
                    <span className="px-3 py-1.5 rounded-xl font-mono text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                      {codeLang.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Algorithmic Complexity & Health Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                      Time Complexity
                    </span>
                    <span className="text-sm font-black font-mono text-indigo-600 dark:text-indigo-400">
                      {codeEval?.time_complexity || 'O(N)'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                      Space Complexity
                    </span>
                    <span className="text-sm font-black font-mono text-purple-600 dark:text-purple-400">
                      {codeEval?.space_complexity || 'O(1)'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                      Code Cleanliness
                    </span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate block">
                      {codeEval?.code_cleanliness_rating || 'Clean and idiomatic'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                      Edge Cases Handled
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        codeEval?.edge_cases_handled ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'
                      }`}
                    >
                      {codeEval?.edge_cases_handled ? '✔ All Verified' : '⚠️ Minor Gaps'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Gemini Pro AI Summary & Evaluation Bullets */}
              {codeEval && (
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    <span>Gemini Pro Algorithmic Evaluation Summary</span>
                  </div>

                  {codeEval.ai_summary && (
                    <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                      {codeEval.ai_summary}
                    </p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 text-xs">
                    {codeEval.strengths?.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 space-y-1.5">
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" /> Demonstrated Strengths:
                        </span>
                        <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 space-y-1">
                          {codeEval.strengths.map((str, idx) => (
                            <li key={idx}>{str}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {codeEval.weaknesses?.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-1.5">
                        <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4" /> Opportunities for Improvement:
                        </span>
                        <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 space-y-1">
                          {codeEval.weaknesses.map((w, idx) => (
                            <li key={idx}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Problem Statement Card */}
              {challenge && (
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                    Problem Statement Assigned
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {challenge.title || 'Optimal Subarray Target Sum & Deduplication'}
                  </h4>
                  <div className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                    {challenge.description}
                  </div>
                </div>
              )}

              {/* Candidate Submitted Code (Read-Only Syntax-Highlighted Block) */}
              <div className="rounded-2xl border border-slate-700 dark:border-slate-800 bg-[#0d1117] overflow-hidden shadow-xl">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800 text-xs">
                  <div className="flex items-center gap-2 font-mono text-slate-300">
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    <span>candidate_solution.{codeLang === 'javascript' ? 'js' : 'py'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px] font-mono">
                      {codeLang.toUpperCase()}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (candCode) {
                          navigator.clipboard.writeText(candCode);
                          alert('Candidate code copied to clipboard!');
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] font-medium transition-colors"
                    >
                      Copy Code
                    </button>
                  </div>
                </div>

                <div className="p-4 font-mono text-xs leading-relaxed text-slate-100 overflow-x-auto max-h-[420px] select-text">
                  {candCode ? (
                    <div className="flex">
                      {/* Line numbers */}
                      <div className="select-none pr-4 text-right text-slate-600 font-mono border-r border-slate-800">
                        {candCode.split('\n').map((_, i) => (
                          <div key={i} className="leading-6">
                            {i + 1}
                          </div>
                        ))}
                      </div>
                      {/* Code lines */}
                      <pre className="pl-4 whitespace-pre font-mono leading-6">
                        {candCode}
                      </pre>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-500 font-sans text-xs">
                      No code submitted for this assessment.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : activeTab === 'viva' ? (
            /* =========================================================
               TAB 5: VOICE VIVA SIMULATION & SPEECH SCREENING
               ========================================================= */
            <div className="space-y-6">
              {/* Viva Score & Metrics Hero Card */}
              <div className="bg-gradient-to-br from-purple-50/70 via-white to-indigo-50/50 dark:from-slate-900 dark:via-slate-850 dark:to-purple-950/40 p-6 rounded-2xl border border-purple-200 dark:border-purple-800/60 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 rounded-2xl bg-purple-600 text-white shadow-md">
                      <Radio className="w-5 h-5 animate-pulse" />
                    </span>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
                        Oral Technical Assessment
                      </span>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        Oral Viva & Speech Screening
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-700">
                          🎙️ Viva Score: {vivaScore !== undefined && vivaScore !== null ? Math.round(vivaScore) : 0}%
                        </span>
                      </h3>
                    </div>
                  </div>

                  {vivaEval?.confidence_and_tone && (
                    <Badge variant="purple" size="sm">
                      {vivaEval.confidence_and_tone}
                    </Badge>
                  )}
                </div>

                {/* Score Breakdown Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-purple-100 dark:border-purple-900/50">
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Technical Accuracy (60%)</span>
                    <span className="text-lg font-black text-purple-600 dark:text-purple-400">
                      {vivaEval?.technical_accuracy_score || 75}%
                    </span>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Communication Fluency (40%)</span>
                    <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                      {vivaEval?.communication_fluency_score || 80}%
                    </span>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Screening Weight</span>
                    <span className="text-lg font-black text-slate-700 dark:text-slate-300">
                      20% of Test
                    </span>
                  </div>
                </div>
              </div>

              {/* Viva Question Assigned */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
                  Candidate Oral Viva Prompt:
                </span>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-relaxed">
                  "{vivaPrompt}"
                </p>
              </div>

              {/* Embedded Audio Player */}
              <div className="p-5 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Candidate Voice Recording (60s)
                    </span>
                  </div>
                  {vivaAudioUrl && (
                    <a
                      href={vivaAudioUrl.startsWith('http') ? vivaAudioUrl : `http://127.0.0.1:8000${vivaAudioUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Download Audio
                    </a>
                  )}
                </div>

                {vivaAudioUrl ? (
                  <audio
                    src={vivaAudioUrl.startsWith('http') ? vivaAudioUrl : `http://127.0.0.1:8000${vivaAudioUrl}`}
                    controls
                    className="w-full h-10 rounded-lg"
                  />
                ) : (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    No oral audio recorded for this candidate.
                  </div>
                )}
              </div>

              {/* Collapsible AI Generated Transcript */}
              {vivaTranscript && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 overflow-hidden shadow-xs">
                  <button
                    type="button"
                    onClick={() => setIsTranscriptOpen(!isTranscriptOpen)}
                    className="w-full px-5 py-3.5 flex items-center justify-between text-left border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FileAudio className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        AI Generated Transcript (Gemini Multimodal)
                      </span>
                    </div>
                    {isTranscriptOpen ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {isTranscriptOpen && (
                    <div className="p-5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans bg-slate-50/60 dark:bg-slate-900/40 italic">
                      "{vivaTranscript}"
                    </div>
                  )}
                </div>
              )}

              {/* Gemini Speech Assessor Rationale & Strengths / Improvement Grid */}
              {vivaEval && (
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Gemini Assessor Feedback & Speech Analysis
                    </span>
                  </div>

                  {vivaEval.ai_viva_summary && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      <strong>Assessor Summary:</strong> {vivaEval.ai_viva_summary}
                    </p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                    {vivaEval.speech_strengths?.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 space-y-1.5">
                        <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" /> Speech & Technical Strengths:
                        </span>
                        <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 space-y-1">
                          {vivaEval.speech_strengths.map((str, idx) => (
                            <li key={idx}>{str}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {vivaEval.speech_weaknesses?.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-1.5">
                        <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4" /> Opportunities for Improvement:
                        </span>
                        <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 space-y-1">
                          {vivaEval.speech_weaknesses.map((w, idx) => (
                            <li key={idx}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'pitch' ? (
            /* =========================================================
               TAB 6: 60-SECOND ASYNCHRONOUS VIDEO ELEVATOR PITCH
               ========================================================= */
            <div className="space-y-6">
              {/* Video Pitch Overview Card */}
              <div className="bg-gradient-to-br from-rose-50/70 via-white to-purple-50/50 dark:from-slate-900 dark:via-slate-850 dark:to-rose-950/40 p-6 rounded-2xl border border-rose-200 dark:border-rose-800/60 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 rounded-2xl bg-rose-600 text-white shadow-md">
                      <Video className="w-5 h-5" />
                    </span>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
                        Asynchronous Elevator Pitch
                      </span>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        Candidate 60-Second Video Pitch
                        {videoPitchUrl ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                            🎥 Video Pitch Available
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                            Not Submitted
                          </span>
                        )}
                      </h3>
                    </div>
                  </div>

                  {videoPitchUrl && (
                    <a
                      href={videoPitchUrl.startsWith('http') ? videoPitchUrl : `http://127.0.0.1:8000${videoPitchUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-800 shadow-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Open / Download Video
                    </a>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  The candidate recorded this 60-second video elevator pitch using their browser webcam to introduce themselves, communicate their technical domain interests, and showcase verbal fluency.
                </p>
              </div>

              {/* Embedded HTML5 Video Player */}
              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 shadow-md flex flex-col items-center justify-center">
                {videoPitchUrl ? (
                  <div className="w-full max-w-2xl space-y-3">
                    <video
                      controls
                      playsInline
                      className="w-full max-h-[420px] rounded-xl object-contain bg-black shadow-lg border border-slate-800"
                      src={videoPitchUrl.startsWith('http') ? videoPitchUrl : `http://127.0.0.1:8000${videoPitchUrl}`}
                    />
                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Verified Candidate Webcam Pitch
                      </span>
                      <span className="font-mono text-[11px]">Duration: ~60s Max</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-14 text-center space-y-3 max-w-sm">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 text-slate-500 flex items-center justify-center mx-auto border border-slate-800">
                      <Video className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-200">No Video Pitch Submitted</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        The applicant did not attach an elevator video pitch with their application.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'evaluations' ? (
            <div className="p-6">
              <TeamEvaluationsPanel
                applicationId={applicationId}
                initialSummary={dossier?.team_evaluations_summary}
                onSummaryChange={(updatedSummary) => {
                  setDossier((prev) => ({
                    ...prev,
                    team_evaluations_summary: updatedSummary,
                  }));
                }}
              />
            </div>
          ) : activeTab === 'integrity' ? (
            <div className="p-6">
              {renderProjectIntegritySection()}
            </div>
          ) : null}
        </div>

        {/* =========================================================
           DECISION ACTION PANEL (MODAL FOOTER)
           ========================================================= */}
        <div className="p-4 sm:px-7 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            Current Status:{' '}
            <strong className="text-slate-800 dark:text-slate-200 uppercase">
              {app?.status || 'APPLIED'}
            </strong>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDecisionType('REJECT')}
              className="text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900"
            >
              Reject Application
            </Button>

            {/* Shortlist Action */}
            {app?.status !== 'SHORTLISTED' &&
              app?.status !== 'STAGE2_INVITED' &&
              app?.status !== 'STAGE2_SUBMITTED' &&
              app?.status !== 'INTERVIEW' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleExecuteDecision('SHORTLISTED')}
                  disabled={submittingDecision}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 font-bold"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  {job?.has_manual_stage
                    ? 'Shortlist & Invite to Stage-2 Assessment'
                    : 'Shortlist Candidate'}
                </Button>
              )}

            {/* Schedule Formal Interview Action */}
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (isBlindMode) {
                  setShowRevealPrompt(true);
                } else {
                  setDecisionType('SCHEDULE_INTERVIEW');
                }
              }}
              className="text-xs bg-purple-600 hover:bg-purple-700 font-bold text-white flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              Schedule Formal Interview
            </Button>

            {/* 1-Click AI Offer Letter & Contract Generator */}
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowOfferModal(true)}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 font-bold text-white flex items-center gap-1.5 shadow-sm"
            >
              <FileText className="w-3.5 h-3.5" />
              {dossier?.active_offer_letter?.status === 'ACCEPTED'
                ? 'View Accepted Contract'
                : dossier?.active_offer_letter
                ? 'View / Edit Offer Letter'
                : '1-Click AI Offer Letter'}
            </Button>

            {/* In-App Direct Live Chat with Candidate */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const targetUserId = candidate?.user_id || candidate?.id || app?.user_id;
                if (targetUserId) {
                  onClose();
                  navigate(`/messages?user=${targetUserId}&applicationId=${applicationId}`);
                } else {
                  alert('Candidate user ID not found.');
                }
              }}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center gap-1.5 shadow-sm"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Direct Live Chat
            </Button>
          </div>
        </div>
      </div>

      {/* Stage Transition Guard: Reveal Identity Prompt */}
      {showRevealPrompt && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full border border-purple-200 dark:border-purple-900 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Advance to Interview Phase
                </h4>
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider">
                  Stage Transition Guard
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Candidate advanced to interview phase. Reveal candidate identity for direct scheduling?
            </p>

            <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800 text-[11px] text-purple-900 dark:text-purple-200 space-y-1">
              <p>• <strong>Reveal Identity:</strong> Unmasks verified candidate full name and direct email address so calendar invitations and video links are dispatched accurately.</p>
              <p>• <strong>Keep Anonymized:</strong> Keeps anonymous identifier active in the candidate dossier.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowRevealPrompt(false);
                  setDecisionType('SCHEDULE_INTERVIEW');
                }}
                className="w-full sm:w-auto text-xs"
              >
                Keep Anonymized
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setShowRevealPrompt(false);
                  setIsBlindMode(false);
                  loadDossier(false);
                  setDecisionType('SCHEDULE_INTERVIEW');
                }}
                className="w-full sm:w-auto text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold"
              >
                Reveal Identity & Schedule
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Decision Sub-Modal: SCHEDULE FORMAL INTERVIEW (WITH EMAIL) */}
      {decisionType === 'SCHEDULE_INTERVIEW' && (
        <ScheduleInterviewModal
          isOpen={true}
          onClose={() => setDecisionType(null)}
          candidate={{
            ...candidate,
            candidate_id: candidate?.id,
            candidate_name: candidate?.full_name,
            candidate_email: candidate?.email,
            job_id: job?.id,
            job_title: job?.title,
            company_name: job?.company_name,
            application_id: applicationId,
          }}
          onScheduled={(scheduled) => {
            setDossier((prev) => ({
              ...prev,
              application: {
                ...prev.application,
                status: 'INTERVIEW',
                interview_date: scheduled.interview_date,
                interview_time: scheduled.interview_time,
                meeting_link: scheduled.meeting_link,
              },
            }));
            if (onDecisionMade) {
              onDecisionMade({
                ...dossier.application,
                status: 'INTERVIEW',
                interview_date: scheduled.interview_date,
                interview_time: scheduled.interview_time,
                meeting_link: scheduled.meeting_link,
              });
            }
            setDecisionType(null);
          }}
        />
      )}

      {/* 1-Click AI Offer Letter & Employment Contract Generator Modal */}
      {showOfferModal && (
        <OfferLetterModal
          isOpen={true}
          onClose={() => setShowOfferModal(false)}
          application={{
            id: applicationId,
            application_id: applicationId,
            expected_salary: app?.expected_salary,
            candidate_name: candidate?.full_name,
            job_title: job?.title,
            company_name: job?.company_name,
          }}
          candidateName={candidate?.full_name}
          candidateEmail={candidate?.email}
          jobTitle={job?.title}
          companyName={job?.company_name}
          expectedSalary={app?.expected_salary}
          onOfferSent={(updatedOffer) => {
            setShowOfferModal(false);
            loadDossier(isBlindMode);
            if (onDecisionMade) {
              onDecisionMade({
                ...dossier.application,
                status: 'OFFER_EXTENDED',
              });
            }
          }}
        />
      )}

      {/* Decision Sub-Modal: REJECT */}
      {decisionType === 'REJECT' && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                Reject Candidate Application
              </h4>
              <button
                onClick={() => setDecisionType(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Are you sure you want to mark <strong>{candidate?.full_name}</strong> as Rejected? The candidate will be notified.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Private Recruiter Note (Optional):
              </label>
              <textarea
                rows={3}
                placeholder="e.g. We require more senior hands-on concurrency experience for this vacancy."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {/* Checkbox: Empathetic AI Growth Feedback */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-50/70 to-indigo-50/70 dark:from-emerald-950/40 dark:to-indigo-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-2.5">
              <input
                type="checkbox"
                id="check-generate-growth"
                checked={generateAiFeedback}
                onChange={(e) => setGenerateAiFeedback(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="check-generate-growth" className="text-xs cursor-pointer select-none">
                <span className="font-bold text-slate-900 dark:text-white block flex items-center gap-1.5">
                  <Sprout className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Generate empathetic AI Growth Feedback for candidate (Recommended)
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  Gemini Pro will evaluate candidate test metrics, missed areas, and skill gaps to provide a respectful, constructive career roadmap.
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDecisionType(null)}
                disabled={submittingDecision}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleExecuteDecision('REJECTED')}
                disabled={submittingDecision}
                className="bg-rose-600 hover:bg-rose-700"
              >
                {submittingDecision ? 'Processing & Generating...' : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
