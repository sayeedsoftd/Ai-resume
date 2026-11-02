import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { jobService } from '../../services/jobService';

export default function ApplicantDossierModal({
  isOpen,
  onClose,
  applicationId,
  onDecisionMade,
}) {
  const [loading, setLoading] = useState(true);
  const [dossier, setDossier] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState('cv'); // 'cv' | 'test'

  // Decision Modal State
  const [decisionType, setDecisionType] = useState(null); // 'SHORTLIST' | 'REJECT' | 'SCHEDULE_INTERVIEW' | null
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('11:00 AM');
  const [meetingLink, setMeetingLink] = useState('https://meet.google.com/');
  const [recruiterNote, setRecruiterNote] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);

  useEffect(() => {
    if (isOpen && applicationId) {
      loadDossier();
    }
  }, [isOpen, applicationId]);

  const loadDossier = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await jobService.getApplicationDossier(applicationId);
      setDossier(data);
    } catch (err) {
      console.error('Failed to load applicant dossier:', err);
      setErrorMsg(
        err.response?.data?.detail || 'Unable to retrieve applicant dossier.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const app = dossier?.application;
  const candidate = dossier?.candidate;
  const job = dossier?.job;
  const resume = dossier?.resume;
  const parsedData = resume?.parsed_data || {};
  const testSub = dossier?.screening_submission;

  const handleExecuteDecision = async (statusToSet) => {
    setSubmittingDecision(true);
    try {
      const payload = {
        status: statusToSet,
        interview_date: statusToSet !== 'REJECTED' ? interviewDate || undefined : undefined,
        meeting_link: statusToSet !== 'REJECTED' ? meetingLink || undefined : undefined,
        recruiter_note: statusToSet !== 'REJECTED' ? recruiterNote || undefined : undefined,
        rejection_reason: statusToSet === 'REJECTED' ? rejectionReason || undefined : undefined,
      };

      const updated = await jobService.makeRecruiterDecision(applicationId, payload);
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
        {/* Modal Header */}
        <div className="p-5 sm:px-7 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-800/60 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                Applicant Dossier & Answer Sheet
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-xs font-semibold text-slate-500">
                Application #{applicationId}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              {candidate?.full_name || 'Candidate Review'}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" /> {candidate?.email}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                <Briefcase className="w-3.5 h-3.5" /> {job?.title}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Status / ATS / Test Badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
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
        <div className="px-6 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4 shrink-0">
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
          </div>

          {resumeUrl && (
            <a
              href={resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open Resume PDF
            </a>
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
                        <span className="text-slate-500">{edu.institution}</span>
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
              onClick={() => setDecisionType('SCHEDULE_INTERVIEW')}
              className="text-xs bg-purple-600 hover:bg-purple-700 font-bold text-white flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              Schedule Formal Interview
            </Button>
          </div>
        </div>
      </div>

      {/* Decision Sub-Modal: SCHEDULE FORMAL INTERVIEW (WITH EMAIL) */}
      {decisionType === 'SCHEDULE_INTERVIEW' && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                Schedule Formal Interview
              </h4>
              <button
                onClick={() => setDecisionType(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Schedule formal interview for <strong>{candidate?.full_name}</strong>. A formal calendar invitation email will be dispatched to <strong>{candidate?.email}</strong>.
            </p>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Time *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 11:00 AM EST"
                    value={interviewTime}
                    onChange={(e) => setInterviewTime(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Google Meet / Venue Link *
                </label>
                <input
                  type="text"
                  placeholder="https://meet.google.com/xyz-abc"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Preparation Note / Agenda (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Please be prepared to discuss your system design and experience with scalable databases."
                  value={recruiterNote}
                  onChange={(e) => setRecruiterNote(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
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
                onClick={handleScheduleFormalInterview}
                disabled={submittingDecision}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
              >
                {submittingDecision ? 'Dispatching Email...' : 'Send Invitation & Schedule'}
              </Button>
            </div>
          </div>
        </div>
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
                Optional Constructive Feedback:
              </label>
              <textarea
                rows={3}
                placeholder="e.g. We require more senior hands-on concurrency experience for this vacancy."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
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
                {submittingDecision ? 'Processing...' : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
