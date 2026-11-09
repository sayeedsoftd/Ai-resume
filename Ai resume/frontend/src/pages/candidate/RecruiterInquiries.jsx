import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Inbox,
  Mail,
  Clock,
  Briefcase,
  Building2,
  CheckCircle2,
  RotateCcw,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  User,
  Send,
  Calendar,
  Video,
  AlertCircle,
  CalendarCheck,
  CalendarX,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { jobService } from '../../services/jobService';
import { useNotifications } from '../../context/NotificationContext';

export default function RecruiterInquiries() {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'INVITES' | 'UNREAD'
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  // Reply inline box state
  const [replyingInquiryId, setReplyingInquiryId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);

  // Reschedule box state
  const [reschedulingInquiryId, setReschedulingInquiryId] = useState(null);
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const { triggerToast, refreshNotifications } = useNotifications();

  useEffect(() => {
    loadInquiries();
  }, []);

  const loadInquiries = async () => {
    setLoading(true);
    try {
      const data = await jobService.getCandidateInquiries();
      setInquiries(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load candidate inquiries:', err);
      if (triggerToast) {
        triggerToast('Failed to load recruiter inquiries.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (inquiryId) => {
    if (!inquiryId) return;
    setInquiries((prev) =>
      prev.map((item) => (item.id === inquiryId ? { ...item, is_read: true } : item))
    );
    try {
      await jobService.markCandidateInquiryRead(inquiryId);
      if (refreshNotifications) refreshNotifications();
    } catch (err) {
      console.error('Failed to mark inquiry read:', err);
    }
  };

  const handleToggleExpand = (item) => {
    if (!item.is_read) {
      handleMarkAsRead(item.id);
    }
    setExpandedId((prev) => (prev === item.id ? null : item.id));
  };

  const handleOpenReply = (e, item) => {
    e.stopPropagation();
    if (!item.is_read) {
      handleMarkAsRead(item.id);
    }
    setExpandedId(item.id);
    setReplyingInquiryId(item.id);
    setReschedulingInquiryId(null);
  };

  const handleSubmitReply = async (inquiryId, originalSubject) => {
    if (!replyText.trim()) {
      if (triggerToast) triggerToast('Please enter your reply message.', 'error');
      return;
    }

    setReplySubmitting(true);
    try {
      const subject = originalSubject?.toLowerCase().startsWith('re:')
        ? originalSubject
        : `Re: ${originalSubject || 'Inquiry'}`;

      await jobService.replyToCandidateInquiry(inquiryId, {
        message: replyText.trim(),
        subject,
      });

      if (triggerToast) {
        triggerToast('Your reply has been sent directly to the recruiter!', 'success');
      }

      setReplyText('');
      setReplyingInquiryId(null);
      if (refreshNotifications) refreshNotifications();
      loadInquiries();
    } catch (err) {
      console.error('Failed to send reply to recruiter:', err);
      if (triggerToast) {
        triggerToast(err.response?.data?.detail || 'Failed to deliver reply.', 'error');
      }
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleInterviewAction = async (inquiryId, action, reason = '') => {
    setActionSubmitting(true);
    try {
      const res = await jobService.actOnCandidateInquiry(inquiryId, {
        action,
        reschedule_reason: reason,
      });

      if (triggerToast) {
        triggerToast(res.detail || 'Interview status updated successfully.', 'success');
      }

      setReschedulingInquiryId(null);
      setRescheduleReason('');

      // Update item status locally
      setInquiries((prev) =>
        prev.map((item) => {
          if (item.id === inquiryId && item.interview_details) {
            return {
              ...item,
              interview_details: {
                ...item.interview_details,
                status: res.new_status || (action === 'ACCEPT' ? 'ACCEPTED' : 'RESCHEDULE_REQUESTED'),
              },
            };
          }
          return item;
        })
      );

      if (refreshNotifications) refreshNotifications();
    } catch (err) {
      console.error(`Failed to execute interview ${action}:`, err);
      if (triggerToast) {
        triggerToast(err.response?.data?.detail || `Failed to ${action.toLowerCase()} interview.`, 'error');
      }
    } finally {
      setActionSubmitting(false);
    }
  };

  // Filter calculations
  const totalCount = inquiries.length;
  const unreadCount = inquiries.filter((i) => !i.is_read).length;
  const invitesCount = inquiries.filter((i) => i.type === 'INTERVIEW_INVITE').length;

  const filteredInquiries = inquiries.filter((item) => {
    if (filterMode === 'UNREAD' && item.is_read) return false;
    if (filterMode === 'INVITES' && item.type !== 'INTERVIEW_INVITE') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRecruiter = item.recruiter_name?.toLowerCase().includes(q);
      const matchCompany = item.company_name?.toLowerCase().includes(q);
      const matchJob = item.job_title?.toLowerCase().includes(q);
      const matchSubject = item.subject?.toLowerCase().includes(q);
      const matchBody = item.message_body?.toLowerCase().includes(q);
      return matchRecruiter || matchCompany || matchJob || matchSubject || matchBody;
    }
    return true;
  });

  const formatScheduledDate = (isoStr) => {
    if (!isoStr) return 'TBD';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 border border-emerald-800/40 p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold tracking-wide uppercase">
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Official Candidate Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            📥 Recruiter Inquiries & Interview Schedules
          </h1>
          <p className="text-xs sm:text-sm text-emerald-200/90 max-w-2xl">
            Official communications, scheduled interview rounds, Google Meet invitations, and direct recruiter messages.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10 shrink-0">
          <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 flex items-center gap-4">
            <div className="text-center">
              <span className="block text-[10px] uppercase font-bold text-emerald-200">Total</span>
              <span className="text-lg font-black text-white">{totalCount}</span>
            </div>
            <div className="w-px h-6 bg-white/20" />
            <div className="text-center">
              <span className="block text-[10px] uppercase font-bold text-cyan-300">Invites</span>
              <span className="text-lg font-black text-cyan-400">{invitesCount}</span>
            </div>
            <div className="w-px h-6 bg-white/20" />
            <div className="text-center">
              <span className="block text-[10px] uppercase font-bold text-amber-300">Unread</span>
              <span className="text-lg font-black text-amber-400 flex items-center justify-center gap-1">
                {unreadCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                {unreadCount}
              </span>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={loadInquiries}
            disabled={loading}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold rounded-xl py-2"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterMode('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterMode === 'ALL'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Inquiries ({totalCount})
          </button>
          <button
            onClick={() => setFilterMode('INVITES')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              filterMode === 'INVITES'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>Interview Invites</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                filterMode === 'INVITES'
                  ? 'bg-white text-cyan-800'
                  : 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300'
              }`}
            >
              {invitesCount}
            </span>
          </button>
          <button
            onClick={() => setFilterMode('UNREAD')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              filterMode === 'UNREAD'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>Unread Only</span>
            {unreadCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  filterMode === 'UNREAD'
                    ? 'bg-white text-amber-700'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                }`}
              >
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search company, job, subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          />
        </div>
      </div>

      {/* Inquiries Feed List */}
      {loading ? (
        <div className="p-16 text-center space-y-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Fetching inquiries & interview schedules...
          </p>
        </div>
      ) : filteredInquiries.length === 0 ? (
        <div className="p-16 text-center space-y-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800">
            <CalendarCheck className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {filterMode === 'UNREAD'
                ? 'No unread inquiries'
                : filterMode === 'INVITES'
                ? 'No interview invitations yet'
                : 'No recruiter inquiries yet'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {filterMode === 'UNREAD'
                ? 'You have reviewed all official messages and interview invitations!'
                : 'When recruiters schedule interviews or reach out regarding your applications, they will appear here.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInquiries.map((item) => {
            const isExpanded = expandedId === item.id;
            const isReplying = replyingInquiryId === item.id;
            const isRescheduling = reschedulingInquiryId === item.id;
            const isInvite = item.type === 'INTERVIEW_INVITE';
            const interview = item.interview_details;

            return (
              <div
                key={item.id}
                onClick={() => handleToggleExpand(item)}
                className={`group rounded-2xl border transition-all duration-200 overflow-hidden cursor-pointer ${
                  !item.is_read
                    ? 'bg-amber-500/5 dark:bg-amber-500/5 border-amber-500/30 shadow-sm'
                    : isInvite
                    ? 'bg-white dark:bg-slate-900 border-cyan-500/30 hover:border-cyan-500/50'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Header Bar */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-black text-sm border shadow-xs ${
                        isInvite
                          ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 border-cyan-200 dark:border-cyan-800'
                          : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border-emerald-200 dark:border-emerald-800'
                      }`}
                    >
                      {isInvite ? (
                        <Calendar className="w-5 h-5" />
                      ) : (
                        <Building2 className="w-5 h-5" />
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight">
                          {item.company_name}
                        </span>
                        <span className="text-slate-400 text-xs">•</span>
                        <span className="text-xs text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          {item.recruiter_name}
                        </span>

                        {isInvite ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-700 dark:bg-cyan-950/80 dark:text-cyan-300 border border-cyan-500/30">
                            🎯 Interview Invite
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-500/30">
                            ✉️ Formal Message
                          </span>
                        )}

                        {!item.is_read && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 animate-pulse">
                            NEW
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
                          {item.job_title}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 self-start sm:self-center shrink-0">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      {item.sent_at}
                    </span>

                    <button
                      type="button"
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Subject Preview */}
                <div className="px-4 sm:px-5 pb-3">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {item.subject}
                  </h4>
                  {!isExpanded && item.message_body && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                      {item.message_body}
                    </p>
                  )}
                </div>

                {/* Expanded Content View */}
                {isExpanded && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="px-4 sm:px-5 pb-5 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-4"
                  >
                    {/* Official Interview Highlight Box */}
                    {isInvite && interview && (
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 to-slate-900 border border-cyan-500/40 shadow-inner space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-cyan-500/20">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-cyan-400" />
                            <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                              {interview.interview_title || 'Technical Round Schedule'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-cyan-400/80 font-mono">
                              Status:
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                interview.status === 'ACCEPTED'
                                  ? 'bg-emerald-500 text-slate-950'
                                  : interview.status === 'RESCHEDULE_REQUESTED'
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              }`}
                            >
                              {interview.status || 'SCHEDULED'}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="space-y-1">
                            <span className="text-[11px] text-slate-400 block">
                              📅 Date & Time ({interview.timezone || 'Asia/Dhaka'}):
                            </span>
                            <span className="font-bold text-white text-sm">
                              {formatScheduledDate(interview.scheduled_at)}
                            </span>
                            <span className="text-[11px] text-cyan-300 block">
                              Duration: {interview.duration_minutes || 45} mins
                            </span>
                          </div>

                          <div className="space-y-2 flex flex-col justify-center">
                            {interview.meeting_url ? (
                              <a
                                href={interview.meeting_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition-all"
                              >
                                <Video className="w-4 h-4" />
                                <span>Join Google Meet Call</span>
                                <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
                              </a>
                            ) : (
                              <div className="text-[11px] text-slate-400 italic">
                                Meeting link will be shared prior to session.
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Quick Actions for Candidate */}
                        <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-cyan-500/20">
                          {interview.status !== 'ACCEPTED' && (
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={actionSubmitting}
                              onClick={() => handleInterviewAction(item.id, 'ACCEPT')}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl py-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                              Accept Schedule
                            </Button>
                          )}

                          {interview.status !== 'RESCHEDULE_REQUESTED' && (
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={actionSubmitting}
                              onClick={() => {
                                setReschedulingInquiryId((prev) => (prev === item.id ? null : item.id));
                                setReplyingInquiryId(null);
                              }}
                              className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 font-bold text-xs rounded-xl py-1.5"
                            >
                              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                              Request Reschedule
                            </Button>
                          )}

                          {interview.status === 'ACCEPTED' && (
                            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 py-1">
                              <CheckCircle2 className="w-4 h-4" />
                              You have confirmed this schedule.
                            </span>
                          )}
                        </div>

                        {/* Inline Reschedule Box */}
                        {isRescheduling && (
                          <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-2.5 animate-in fade-in duration-150">
                            <label className="text-xs font-bold text-amber-300 block">
                              Reason & Preferred Alternative Slots:
                            </label>
                            <textarea
                              rows={3}
                              placeholder="e.g., I have a university exam on this date. Would it be possible to schedule on Thursday after 3 PM?"
                              value={rescheduleReason}
                              onChange={(e) => setRescheduleReason(e.target.value)}
                              className="w-full p-2.5 text-xs rounded-xl border border-amber-500/40 bg-slate-900 text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setReschedulingInquiryId(null)}
                                className="text-xs py-1 text-slate-400"
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="primary"
                                size="sm"
                                disabled={actionSubmitting}
                                onClick={() => handleInterviewAction(item.id, 'RESCHEDULE', rescheduleReason)}
                                className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs py-1"
                              >
                                Submit Reschedule Request
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Message Body Content */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">
                      {item.message_body || 'No message content provided.'}
                    </div>

                    {/* Action Footer */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            item.is_read
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {item.is_read ? 'Viewed' : 'Unread'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.recruiter_id && (
                          <Link
                            to={`/messages?user=${item.recruiter_id}`}
                            className="px-3 py-1.5 rounded-xl border border-indigo-500/30 hover:bg-indigo-500/10 text-indigo-400 font-bold text-xs flex items-center gap-1.5 transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Direct Chat</span>
                          </Link>
                        )}

                        <Button
                          variant="primary"
                          size="sm"
                          onClick={(e) => handleOpenReply(e, item)}
                          className="bg-emerald-600 hover:bg-emerald-700 font-bold text-xs rounded-xl py-1.5 flex items-center gap-1.5"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>Reply to Recruiter</span>
                        </Button>
                      </div>
                    </div>

                    {/* Inline Reply Box */}
                    {isReplying && (
                      <div className="mt-4 p-4 rounded-2xl bg-slate-900 border border-emerald-500/30 space-y-3 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                            <Send className="w-3.5 h-3.5" />
                            <span>Your Response to {item.recruiter_name} ({item.company_name})</span>
                          </label>
                          <span className="text-[10px] text-slate-400">
                            Sent directly to recruiter's inquiry board & email
                          </span>
                        </div>

                        <textarea
                          rows={4}
                          placeholder="Type your formal response here. Mention your availability, thank the hiring team, or provide any requested links..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="w-full p-3 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed font-sans"
                        />

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setReplyingInquiryId(null);
                              setReplyText('');
                            }}
                            className="text-xs py-1.5"
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={replySubmitting || !replyText.trim()}
                            onClick={() => handleSubmitReply(item.id, item.subject)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-1.5 flex items-center gap-1.5"
                          >
                            <Send className={`w-3.5 h-3.5 ${replySubmitting ? 'animate-spin' : ''}`} />
                            <span>{replySubmitting ? 'Delivering...' : 'Send Formal Reply'}</span>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
