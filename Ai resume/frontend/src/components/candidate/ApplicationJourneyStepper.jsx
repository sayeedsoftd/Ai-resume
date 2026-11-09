import React from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Award,
  Calendar,
  XCircle,
  Video,
  ExternalLink,
  Sparkles,
  FileText,
  AlertCircle,
  ChevronRight,
  ShieldCheck,
  Sprout,
} from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

/**
 * Multi-Step Horizontal Application Journey Stepper
 * Displays:
 * 1. [✔] Applied & CV Parsed (with date & ATS score)
 * 2. [✔] Pre-Screening Exam (MCQ + Written breakdown)
 * 3. [👀] Viewed by Recruiter (Active/Green with timestamp)
 * 4. [⭐] Shortlisted / Advanced to Stage-2
 * 5. [📅] Interview Scheduled / Offer
 * Plus supportive "Application Closed" notification if rejected.
 */
export default function ApplicationJourneyStepper({
  application,
  onTakeScreeningTest,
  onTakeStage2,
  onViewAssessment,
  onViewOffer,
  compact = false,
}) {
  if (!application) return null;

  const status = application.status || 'APPLIED';
  const isRejected = ['REJECTED', 'STAGE1_FAILED', 'JOB_CLOSED', 'CLOSED'].includes(status);
  const isAccepted = status === 'ACCEPTED';
  const isInterview = status === 'INTERVIEW' || Boolean(application.interview_date) || Boolean(application.meeting_link);
  const isStage2Invited = status === 'STAGE2_INVITED';
  const isStage2Submitted = status === 'STAGE2_SUBMITTED';
  const isShortlisted = ['SHORTLISTED', 'STAGE2_INVITED', 'STAGE2_SUBMITTED', 'INTERVIEW', 'OFFER_EXTENDED', 'ACCEPTED'].includes(status);
  const hasTest = Boolean(application.candidate_test_submission_id) || (application.test_score !== null && application.test_score !== undefined);
  const isViewed = Boolean(application.viewed_by_recruiter);

  // Format timestamps nicely
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
  };

  // Step 1: Applied & CV Parsed (Always completed)
  const step1 = {
    title: 'Applied & CV Parsed',
    date: formatDate(application.applied_at),
    detail: application.match_score ? `${Math.round(application.match_score)}% ATS Match` : 'CV Analyzed',
    isComplete: true,
    isCurrent: !hasTest && !isRejected,
  };

  // Step 2: Pre-Screening Exam
  const hasMcqWritten = application.mcq_score != null && application.written_score != null;
  const step2Detail = hasTest
    ? hasMcqWritten
      ? `MCQ: ${Math.round(application.mcq_score)}/50 • Written: ${Math.round(application.written_score)}/50`
      : `${Math.round(application.test_score)}% Verified Score`
    : application.assessment_status === 'EXEMPTED'
    ? 'Screening Exempted'
    : 'Exam Required';

  const step2 = {
    title: 'Pre-Screening Exam',
    date: hasTest ? 'Completed' : 'Pending',
    detail: step2Detail,
    isComplete: hasTest || application.assessment_status === 'EXEMPTED',
    isCurrent: !hasTest && !isRejected,
    action: !hasTest && !isRejected ? 'take_test' : null,
  };

  // Step 3: Viewed by Recruiter
  const step3 = {
    title: 'Viewed by Recruiter',
    date: isViewed ? formatDateTime(application.viewed_at) || 'Viewed' : 'Awaiting Review',
    detail: isViewed ? 'Dossier & CV Evaluated' : 'In Recruiter Queue',
    isComplete: isViewed,
    isCurrent: hasTest && !isViewed && !isRejected,
  };

  // Step 4: Shortlisted / Advanced to Stage-2
  const step4Detail = isStage2Invited
    ? 'Stage-2 Assessment Ready'
    : isStage2Submitted
    ? 'Stage-2 Submitted'
    : isShortlisted
    ? 'Shortlisted by Recruiter'
    : 'Under Evaluation';

  const step4 = {
    title: 'Shortlisted / Stage-2',
    date: isShortlisted ? 'Qualified' : 'Pending',
    detail: step4Detail,
    isComplete: isShortlisted,
    isCurrent: isViewed && !isShortlisted && !isRejected,
    action: isStage2Invited ? 'take_stage2' : null,
  };

  // Step 5: Interview Scheduled / Offer
  const step5Detail = isAccepted
    ? 'Offer Accepted & Hired'
    : isInterview
    ? application.interview_date
      ? `Interview: ${application.interview_date}`
      : 'Interview Scheduled'
    : 'Final Decision';

  const step5 = {
    title: isAccepted ? 'Offer Accepted' : 'Interview / Offer',
    date: isAccepted ? 'Hired' : isInterview ? 'Invited' : 'Upcoming',
    detail: step5Detail,
    isComplete: isAccepted || isInterview,
    isCurrent: isShortlisted && !isInterview && !isAccepted && !isRejected,
  };

  const steps = [
    { id: 1, icon: CheckCircle2, ...step1 },
    { id: 2, icon: Award, ...step2 },
    { id: 3, icon: Eye, ...step3 },
    { id: 4, icon: Sparkles, ...step4 },
    { id: 5, icon: Calendar, ...step5 },
  ];

  return (
    <div className="w-full space-y-3 font-sans">
      {/* Horizontal Progress Stepper Bar */}
      <div className="relative pt-2 pb-1">
        <div className="flex items-start justify-between relative">
          {steps.map((st, idx) => {
            const Icon = st.icon;
            const isLast = idx === steps.length - 1;

            // Compute step color scheme
            let circleBg = 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-300 dark:border-slate-700';
            let lineBg = 'bg-slate-200 dark:bg-slate-800';

            if (isRejected && idx >= 2) {
              circleBg = 'bg-slate-100 dark:bg-slate-800/60 text-slate-300 dark:text-slate-600 border-slate-200 dark:border-slate-800';
            } else if (st.isComplete) {
              if (idx === 2) {
                // Viewed by Recruiter: Vivid Emerald
                circleBg = 'bg-emerald-500 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-400/20';
              } else if (idx === 3) {
                // Shortlisted: Purple
                circleBg = 'bg-purple-600 text-white border-purple-700 shadow-sm ring-2 ring-purple-400/20';
              } else if (idx === 4 && isAccepted) {
                // Offer Accepted: Golden Emerald
                circleBg = 'bg-amber-500 text-white border-amber-600 shadow-sm ring-2 ring-amber-400/20';
              } else {
                circleBg = 'bg-indigo-600 text-white border-indigo-700 shadow-sm ring-2 ring-indigo-400/20';
              }
            } else if (st.isCurrent && !isRejected) {
              circleBg = 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border-indigo-500 border-2 animate-pulse ring-4 ring-indigo-400/10';
            }

            // Connection Line color
            if (!isLast) {
              const nextStep = steps[idx + 1];
              if (st.isComplete && nextStep.isComplete) {
                lineBg = idx === 2 ? 'bg-purple-500' : 'bg-indigo-600';
              } else if (st.isComplete && nextStep.isCurrent && !isRejected) {
                lineBg = 'bg-gradient-to-r from-indigo-600 to-indigo-300 dark:to-indigo-800';
              }
            }

            return (
              <React.Fragment key={st.id}>
                {/* Step Node */}
                <div className="flex flex-col items-center flex-1 text-center relative z-10 group">
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border transition-all duration-300 ${circleBg}`}
                    title={`${st.title}: ${st.detail}`}
                  >
                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>

                  {/* Step Label & Meta */}
                  <div className="mt-1.5 px-0.5 max-w-[95px] sm:max-w-[120px]">
                    <p
                      className={`text-[10px] sm:text-[11px] font-bold leading-tight truncate ${
                        st.isComplete
                          ? 'text-slate-900 dark:text-slate-100'
                          : st.isCurrent && !isRejected
                          ? 'text-indigo-600 dark:text-indigo-400 font-extrabold'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {st.title}
                    </p>

                    <p
                      className={`text-[9px] sm:text-[10px] leading-tight truncate mt-0.5 ${
                        idx === 2 && st.isComplete
                          ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {st.date}
                    </p>

                    {!compact && (
                      <span
                        className={`hidden sm:inline-block text-[9px] px-1 py-0.2 rounded mt-0.5 truncate max-w-full ${
                          idx === 2 && st.isComplete
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : st.isComplete
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            : 'text-slate-400'
                        }`}
                      >
                        {st.detail}
                      </span>
                    )}
                  </div>
                </div>

                {/* Connecting Line between steps */}
                {!isLast && (
                  <div className="flex-1 -mx-2 sm:-mx-3 mt-3.5 sm:mt-4 h-0.5 relative z-0">
                    <div className={`h-full w-full rounded-full transition-colors duration-300 ${lineBg}`} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Interactive Callout Badges & Next Step Banners */}
      <div className="space-y-2 pt-1">
        {/* CONSTRUCTIVE AI REVIEW & CAREER GROWTH NOTIFICATION */}
        {isRejected && (
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-50/80 via-indigo-50/60 to-purple-50/70 dark:from-emerald-950/40 dark:via-indigo-950/30 dark:to-slate-900 border border-emerald-200 dark:border-emerald-800/60 text-xs text-slate-800 dark:text-slate-200 flex items-start gap-3 animate-in fade-in duration-200 shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
              <Sprout className="w-4 h-4 text-emerald-100" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-emerald-950 dark:text-emerald-200 uppercase tracking-wider text-[11px]">
                  Application Review Concluded
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  📈 AI Growth Feedback Generated
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                {application.rejection_reason_notes || application.rejection_reason
                  ? `Recruiter feedback: "${application.rejection_reason_notes || application.rejection_reason}"`
                  : 'Thank you for your interest and effort. While this opening will not advance further, an empathetic career growth roadmap with actionable study recommendations is available below.'}
              </p>
            </div>
          </div>
        )}

        {/* VIEWED BY RECRUITER REAL-TIME STATUS PILL */}
        {!isRejected && (
          <div className="flex items-center justify-between text-[11px] px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2">
              {isViewed ? (
                <span className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <Eye className="w-3.5 h-3.5" />
                  <span>Viewed by Recruiter {application.viewed_at ? `(${formatDateTime(application.viewed_at)})` : ''}</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Awaiting Recruiter Review (Dossier Pending Opening)</span>
                </span>
              )}
            </div>

            {application.expected_salary && (
              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700/80 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                Expected: ৳{Number(application.expected_salary).toLocaleString()}
              </span>
            )}
          </div>
        )}

        {/* ACTION: TAKE SCREENING TEST */}
        {!hasTest && !isRejected && (
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="text-amber-900 dark:text-amber-200 font-semibold text-[11px]">
                Pre-screening exam is required to unlock recruiter shortlisting.
              </span>
            </div>
            <Link to={`/jobs/${application.job_id}`}>
              <Button
                size="sm"
                variant="primary"
                className="text-[10px] font-bold bg-amber-600 hover:bg-amber-700 text-white shrink-0 py-1 px-2.5"
              >
                Take Screening Test
              </Button>
            </Link>
          </div>
        )}

        {/* ACTION: STAGE 2 INVITATION */}
        {isStage2Invited && !isRejected && (
          <div className="p-3 rounded-xl bg-purple-100/90 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-800 text-xs space-y-1.5">
            <div className="font-bold text-purple-900 dark:text-purple-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Stage-2 Assessment Ready!
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                Advanced
              </span>
            </div>
            <p className="text-[11px] text-purple-800 dark:text-purple-300">
              You cleared Stage-1! The recruiter has invited you to complete their custom technical assessment.
            </p>
            {onTakeStage2 && (
              <Button
                size="sm"
                variant="primary"
                onClick={onTakeStage2}
                className="w-full text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white mt-1 py-1"
              >
                Open Stage-2 Custom Assessment
              </Button>
            )}
          </div>
        )}

        {/* INTERVIEW SCHEDULE DETAILS */}
        {isInterview && !isRejected && (application.interview_date || application.meeting_link) && (
          <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="font-bold text-purple-800 dark:text-purple-200 flex items-center gap-1.5 text-[11px]">
                <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                <span>
                  Interview: {application.interview_date} {application.interview_time ? `@ ${application.interview_time}` : ''}
                </span>
              </div>
              <Badge variant="purple" size="xs">
                Scheduled
              </Badge>
            </div>

            {application.meeting_link && (
              <a
                href={
                  application.meeting_link.startsWith('http')
                    ? application.meeting_link
                    : `https://${application.meeting_link}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5 font-semibold break-all pt-0.5"
              >
                <Video className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="truncate">Join Google Meet: {application.meeting_link}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            )}

            {application.recruiter_notes && (
              <p className="text-[10px] text-slate-600 dark:text-slate-300 italic pt-1 border-t border-purple-200/50 dark:border-purple-800/50">
                "{application.recruiter_notes}"
              </p>
            )}
          </div>
        )}

        {/* OFFICIAL OFFER LETTER BANNER & RESPOND BUTTON */}
        {(status === 'OFFER_EXTENDED' || status === 'ACCEPTED' || status === 'DECLINED') && (
          <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${
            status === 'ACCEPTED'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : status === 'DECLINED'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
              : 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/60 dark:to-teal-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 shadow-xs'
          }`}>
            <div className="flex items-center justify-between">
              <div className="font-bold flex items-center gap-1.5 text-xs">
                <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  {status === 'ACCEPTED'
                    ? 'Official Employment Offer Formally Accepted!'
                    : status === 'DECLINED'
                    ? 'Employment Offer Declined'
                    : '🎉 Official Job Offer Extended! Action Required'}
                </span>
              </div>
              <Badge variant={status === 'ACCEPTED' ? 'success' : status === 'DECLINED' ? 'danger' : 'purple'} size="xs">
                {status === 'ACCEPTED' ? 'Accepted' : status === 'DECLINED' ? 'Declined' : 'Pending Response'}
              </Badge>
            </div>

            <p className="text-[11px] opacity-90">
              {status === 'ACCEPTED'
                ? 'Your formal contract has been digitally accepted and recorded.'
                : status === 'DECLINED'
                ? 'You have recorded your response declining this offer.'
                : 'The hiring team has extended a formal employment contract with salary and terms. Click below to review and digitally sign.'}
            </p>

            {onViewOffer && (
              <Button
                size="sm"
                variant="primary"
                onClick={onViewOffer}
                className="w-full text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white mt-1 py-1.5 flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View & Respond to Offer Letter</span>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
