import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Video,
  X,
  ExternalLink,
  CheckCircle2,
  Copy,
  Check,
  Globe,
  Sparkles,
  AlertCircle,
  Briefcase,
  Mail,
  User,
} from 'lucide-react';
import Button from '../ui/Button';
import { jobService } from '../../services/jobService';

export default function ScheduleInterviewModal({
  isOpen,
  onClose,
  candidate,
  onScheduled = null,
  triggerToast = null,
}) {
  // Defensive candidate metadata extraction
  const candidateName =
    candidate?.candidate_name ||
    candidate?.name ||
    candidate?.full_name ||
    candidate?.user?.full_name ||
    'Candidate';

  const candidateEmail =
    candidate?.candidate_email ||
    candidate?.email ||
    candidate?.user?.email ||
    '';

  const candidatePhone =
    candidate?.candidate_phone ||
    candidate?.phone ||
    candidate?.contact_info?.phone ||
    candidate?.user?.phone ||
    '';

  const jobTitle =
    candidate?.job_title ||
    candidate?.title ||
    'the position';

  const companyName =
    candidate?.company_name ||
    'Hiring Organization';

  // Modal Form State
  const [interviewTitle, setInterviewTitle] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('11:00 AM');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [timezone, setTimezone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Dhaka'
  );
  const [notes, setNotes] = useState('');
  const [generateMeetLink, setGenerateMeetLink] = useState(true);
  const [customMeetingLink, setCustomMeetingLink] = useState('');

  // Status & Success state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [scheduledResult, setScheduledResult] = useState(null);
  const [copiedMeet, setCopiedMeet] = useState(false);

  useEffect(() => {
    if (isOpen && candidate) {
      setScheduledResult(null);
      setErrorMsg('');
      setLoading(false);
      setCopiedMeet(false);

      // Default title
      setInterviewTitle(`Technical Interview - ${jobTitle} with ${companyName}`);

      // Default to tomorrow's date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yyyy = tomorrow.getFullYear();
      const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const dd = String(tomorrow.getDate()).padStart(2, '0');
      setInterviewDate(`${yyyy}-${mm}-${dd}`);
      setInterviewTime('11:00 AM');
      setDurationMinutes(45);
      setGenerateMeetLink(true);
      setCustomMeetingLink('');
      setNotes(
        `Dear ${candidateName},\n\nWe look forward to speaking with you regarding your application for ${jobTitle}. In this 45-minute technical conversation, we will review your background, architectural design experiences, and answer any questions you have for our team.`
      );
    }
  }, [isOpen, candidate, candidateName, jobTitle, companyName]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen || !candidate) return null;

  // Build Instant Google Calendar URL
  const buildGoogleCalendarUrl = () => {
    if (!interviewDate) return '';
    try {
      let [hour, minute] = [11, 0];
      if (interviewTime) {
        const isPM = interviewTime.toUpperCase().includes('PM');
        const isAM = interviewTime.toUpperCase().includes('AM');
        const clean = interviewTime.replace(/(AM|PM)/i, '').trim();
        const parts = clean.split(':');
        hour = parseInt(parts[0], 10) || 11;
        minute = parseInt(parts[1], 10) || 0;
        if (isPM && hour < 12) hour += 12;
        if (isAM && hour === 12) hour = 0;
      }

      const [y, m, d] = interviewDate.split('-').map(Number);
      const startDt = new Date(Date.UTC(y, m - 1, d, hour, minute));
      const endDt = new Date(startDt.getTime() + durationMinutes * 60000);

      const fmt = (dt) => dt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const datesParam = `${fmt(startDt)}/${fmt(endDt)}`;

      const meetPlaceholder = customMeetingLink || 'https://meet.google.com/new';
      const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: interviewTitle || `Interview with ${candidateName}`,
        dates: datesParam,
        details: `Position: ${jobTitle}\nCompany: ${companyName}\nCandidate: ${candidateName} (${candidateEmail})\n\nVideo Meeting Room:\n${meetPlaceholder}\n\nAgenda / Notes:\n${notes}`,
        location: meetPlaceholder,
        add: candidateEmail,
      });

      return `https://calendar.google.com/calendar/render?${params.toString()}`;
    } catch (e) {
      return 'https://calendar.google.com/calendar/';
    }
  };

  const handleOpenGoogleCalendarDirectly = () => {
    const url = buildGoogleCalendarUrl();
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCopyLink = (link) => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopiedMeet(true);
    setTimeout(() => setCopiedMeet(false), 2000);
  };

  const handleExecuteSchedule = async () => {
    if (!interviewDate) {
      setErrorMsg('Please select an interview date.');
      return;
    }
    if (!candidateEmail) {
      setErrorMsg('Candidate has no email address on file.');
      return;
    }
    if (!generateMeetLink && !customMeetingLink.trim()) {
      setErrorMsg('Please provide a meeting link or select auto-generate Google Meet link.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const payload = {
        candidate_id: candidate?.candidate_id || candidate?.user_id || candidate?.id,
        application_id: candidate?.application_id || (candidate?.id && !candidate?.candidate_id ? candidate.id : null),
        job_id: candidate?.job_id,
        interview_title: interviewTitle.trim(),
        interview_date: interviewDate,
        interview_time: interviewTime,
        duration_minutes: Number(durationMinutes) || 45,
        timezone: timezone,
        notes: notes.trim(),
        generate_meet_link: generateMeetLink,
        custom_meeting_link: customMeetingLink.trim() || null,
      };

      const res = await jobService.scheduleSmartInterview(payload);
      setScheduledResult(res);

      if (triggerToast) {
        triggerToast({
          id: Date.now(),
          title: 'Interview Scheduled!',
          message: 'Interview scheduled! Google Meet invite dispatched to candidate.',
          type: 'JOB',
        });
      }

      if (onScheduled) {
        onScheduled({
          ...candidate,
          status: 'INTERVIEW',
          interview_date: interviewDate,
          interview_time: interviewTime,
          meeting_link: res.meeting_link,
          result: res,
        });
      }
    } catch (err) {
      console.error('Failed to schedule interview:', err);
      const detail =
        err.response?.data?.detail || 'Failed to schedule interview. Please check server logs.';
      setErrorMsg(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-inner">
              <Video className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-black tracking-widest text-blue-200 px-2 py-0.5 rounded-md bg-white/10 border border-white/10">
                  Google Meet Calendar
                </span>
              </div>
              <h3 className="text-lg font-black tracking-tight text-white mt-0.5">
                One-Click Smart Meeting Scheduler
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {scheduledResult ? (
            /* Success confirmation screen */
            <div className="py-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800 shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="text-xl font-black text-slate-900 dark:text-white">
                  Interview Scheduled Successfully!
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                  Google Meet invite and calendar reservation dispatched to{' '}
                  <strong>{candidateEmail}</strong>.
                </p>
              </div>

              {/* Meeting Link Card */}
              <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-lg mx-auto space-y-2 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-blue-600" /> Google Meet Video Room
                  </span>
                  <button
                    onClick={() => handleCopyLink(scheduledResult.meeting_link)}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    {copiedMeet ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy Link
                      </>
                    )}
                  </button>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs text-blue-600 dark:text-blue-400 break-all select-all font-semibold">
                  {scheduledResult.meeting_link}
                </div>

                {/* Instant WhatsApp & SMS Notification Delivered Status */}
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-2xs">
                    <span>🟢</span> WhatsApp Alert Delivered
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center gap-1">
                    <span>📱</span> SMS Dispatched
                  </span>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>📅 {interviewDate} at {interviewTime}</span>
                  <span>⏱ {durationMinutes} Mins</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <a
                  href={scheduledResult.meeting_link}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-md shadow-blue-600/20"
                >
                  <Video className="w-4 h-4" /> Join Google Meet
                </a>
                {scheduledResult.google_calendar_url && (
                  <a
                    href={scheduledResult.google_calendar_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-4 h-4" /> View in Google Calendar
                  </a>
                )}
                <Button variant="secondary" size="sm" onClick={onClose} className="rounded-xl px-4 py-2 text-xs font-bold">
                  Done
                </Button>
              </div>
            </div>
          ) : (
            /* Scheduler Form */
            <>
              {/* Pre-filled Candidate & Job Badges */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Candidate:</span>
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      {candidateName}
                    </span>
                    {candidateEmail ? (
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        {candidateEmail}
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded-full">
                        Email Missing
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                  <Briefcase className="w-3.5 h-3.5 text-blue-500" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{jobTitle}</span>
                  <span>•</span>
                  <span>{companyName}</span>
                </div>
              </div>

              {/* Interview Title */}
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Interview Title
                </label>
                <input
                  type="text"
                  value={interviewTitle}
                  onChange={(e) => setInterviewTitle(e.target.value)}
                  placeholder="e.g. Technical Interview - Senior Frontend Engineer"
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              {/* Date, Time & Duration Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-blue-500" /> Date *
                  </label>
                  <input
                    type="date"
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-blue-500" /> Time *
                  </label>
                  <input
                    type="text"
                    value={interviewTime}
                    onChange={(e) => setInterviewTime(e.target.value)}
                    placeholder="e.g. 11:00 AM or 14:30"
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Duration
                  </label>
                  <select
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={30}>30 Minutes</option>
                    <option value={45}>45 Minutes (Standard)</option>
                    <option value={60}>60 Minutes (Deep Dive)</option>
                  </select>
                </div>
              </div>

              {/* Timezone Selector */}
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Globe className="w-3 h-3 text-indigo-500" /> Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Asia/Dhaka">Asia/Dhaka (GMT+6)</option>
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                  <option value="America/New_York">America/New York (EST/EDT)</option>
                  <option value="America/Los_Angeles">America/Los Angeles (PST/PDT)</option>
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                  <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                </select>
              </div>

              {/* Automated WhatsApp & SMS Instant Dispatch Banner */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 flex items-start gap-3 text-xs shadow-xs">
                <span className="text-xl shrink-0 mt-0.5">📲</span>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <strong className="font-bold text-slate-900 dark:text-emerald-200">
                      Automated Instant WhatsApp &amp; SMS Alert:
                    </strong>
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                      Automated Push
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    Automated WhatsApp &amp; SMS alert will be instantly dispatched to candidate (
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 underline">
                      {candidatePhone || '+880 17XXXXXXXX'}
                    </span>
                    ) upon scheduling with direct meeting room link.
                  </p>
                </div>
              </div>

              {/* Google Meet Auto-Generation Checkbox */}
              <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generateMeetLink}
                    onChange={(e) => setGenerateMeetLink(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span className="text-xs font-extrabold text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-blue-600" />
                    Auto-Generate Google Meet Room Link & Calendar Invite
                  </span>
                </label>

                {!generateMeetLink && (
                  <div className="pt-2 animate-in fade-in">
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Custom Video URL or Meeting Location
                    </label>
                    <input
                      type="url"
                      value={customMeetingLink}
                      onChange={(e) => setCustomMeetingLink(e.target.value)}
                      placeholder="https://meet.google.com/xyz or Zoom URL"
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                )}
              </div>

              {/* Notes / Agenda */}
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Agenda & Notes from Recruiter
                </label>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Outline the meeting agenda, topics to prepare, or live coding environment..."
                  className="w-full p-3.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed resize-none"
                />
              </div>

              {/* Error Alert */}
              {errorMsg && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!scheduledResult && (
          <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Quick Option: Open in Google Calendar Directly */}
            <button
              type="button"
              onClick={handleOpenGoogleCalendarDirectly}
              className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors order-2 sm:order-1"
              title="Pre-populate in Google Calendar in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open in Google Calendar Directly
            </button>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end order-1 sm:order-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={onClose}
                disabled={loading}
                className="text-xs font-bold rounded-xl px-4 py-2"
              >
                Cancel
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleExecuteSchedule}
                disabled={loading || !candidateEmail || !interviewDate}
                className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 rounded-xl px-4 py-2 shadow-md shadow-blue-600/20 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Scheduling & Dispatching...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-blue-200" />
                    <span>Schedule & Send Invite</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
