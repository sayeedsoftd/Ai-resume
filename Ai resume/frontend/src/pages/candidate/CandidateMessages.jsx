import React, { useState, useEffect } from 'react';
import {
  Mail,
  Inbox,
  Clock,
  Briefcase,
  Building2,
  CheckCircle2,
  Reply,
  RotateCcw,
  Search,
  Filter,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import CandidateReplyModal from '../../components/candidate/CandidateReplyModal';
import { jobService } from '../../services/jobService';
import { useNotifications } from '../../context/NotificationContext';

export default function CandidateMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'UNREAD'
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedMessageId, setExpandedMessageId] = useState(null);
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [messageToReply, setMessageToReply] = useState(null);
  const { markAsRead: markGlobalNotificationAsRead, triggerToast, refreshNotifications } = useNotifications();

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const data = await jobService.getCandidateMessages();
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load candidate messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (messageId) => {
    if (!messageId) return;
    // Optimistic update
    setMessages((prev) =>
      prev.map((m) => (m.message_id === messageId ? { ...m, is_read: true } : m))
    );

    // Sync with global notifications context
    if (markGlobalNotificationAsRead) {
      markGlobalNotificationAsRead(messageId);
    }

    try {
      await jobService.markCandidateMessageRead(messageId);
      if (refreshNotifications) refreshNotifications();
    } catch (err) {
      console.error('Failed to mark message as read on server:', err);
    }
  };

  const handleCardClick = (msg) => {
    if (!msg.is_read) {
      handleMarkAsRead(msg.message_id);
    }
    setExpandedMessageId((prev) => (prev === msg.message_id ? null : msg.message_id));
  };

  // Option A: In-App Fast Modal (Preferred)
  const handleReplyEmail = (e, msg) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!msg.is_read) {
      handleMarkAsRead(msg.message_id);
    }

    const email = msg.recruiter_email || msg.sender_email;
    if (!email) {
      if (triggerToast) {
        triggerToast({
          id: Date.now(),
          title: 'Recipient Missing',
          message: 'Recruiter contact email unavailable. Contact platform support.',
          type: 'SYSTEM',
        });
      }
    }

    setMessageToReply(msg);
    setReplyModalOpen(true);
  };

  // Option B: Instant Mailto Fallback
  const handleMailtoReply = (msg) => {
    if (!msg) return;
    if (!msg.is_read) {
      handleMarkAsRead(msg.message_id);
    }

    const recipient = msg.recruiter_email || msg.sender_email || '';
    if (!recipient) {
      if (triggerToast) {
        triggerToast({
          id: Date.now(),
          title: 'Recipient Missing',
          message: 'Recruiter contact email unavailable. Contact platform support.',
          type: 'SYSTEM',
        });
      } else {
        alert('Recruiter contact email unavailable. Contact platform support.');
      }
      return;
    }

    const rawSubject = msg.subject || 'Application Inquiry';
    const cleanSubject = rawSubject.toLowerCase().startsWith('re:') ? rawSubject : `Re: ${rawSubject}`;
    const subject = encodeURIComponent(cleanSubject);
    const body = encodeURIComponent(
      `\n\n--- In response to message regarding ${msg.job_title || 'Position'} ---\n${msg.body || ''}`
    );
    window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;

    if (triggerToast) {
      triggerToast({
        id: Date.now(),
        title: 'Email Client Opened',
        message: `Drafting reply to ${msg.recruiter_name} (${recipient}).`,
        type: 'JOB',
      });
    }
  };

  const totalCount = messages.length;
  const unreadCount = messages.filter((m) => !m.is_read).length;

  const filteredMessages = messages.filter((msg) => {
    if (filterMode === 'UNREAD' && msg.is_read) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      msg.subject?.toLowerCase().includes(q) ||
      msg.body?.toLowerCase().includes(q) ||
      msg.recruiter_name?.toLowerCase().includes(q) ||
      msg.recruiter_company?.toLowerCase().includes(q) ||
      msg.job_title?.toLowerCase().includes(q)
    );
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-6 py-6 animate-in fade-in duration-200">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden border border-indigo-700/50">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              <Inbox className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
              Candidate Communications
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Received Messages & Direct Inquiries
          </h1>
          <p className="text-xs sm:text-sm text-indigo-200/90 max-w-2xl">
            Review communications sent directly from recruiters regarding your job applications, pre-screening assessments, and next steps.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10 shrink-0">
          <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 flex items-center gap-4">
            <div className="text-center">
              <span className="block text-[10px] uppercase font-bold text-indigo-200">Total</span>
              <span className="text-lg font-black text-white">{totalCount}</span>
            </div>
            <div className="w-px h-6 bg-white/20" />
            <div className="text-center">
              <span className="block text-[10px] uppercase font-bold text-rose-300">Unread</span>
              <span className="text-lg font-black text-rose-400 flex items-center justify-center gap-1">
                {unreadCount > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
                {unreadCount}
              </span>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={loadMessages}
            disabled={loading}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold rounded-xl py-2"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterMode('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterMode === 'ALL'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Messages ({totalCount})
          </button>
          <button
            onClick={() => setFilterMode('UNREAD')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              filterMode === 'UNREAD'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                filterMode === 'UNREAD' ? 'bg-white text-rose-600' : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
              }`}>
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by recruiter, job, or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          />
        </div>
      </div>

      {/* Messages List / Feed */}
      {loading ? (
        <div className="p-16 text-center space-y-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Fetching direct recruiter inquiries...
          </p>
        </div>
      ) : filteredMessages.length === 0 ? (
        <div className="p-16 text-center space-y-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 flex items-center justify-center mx-auto border border-indigo-200 dark:border-indigo-800">
            <Mail className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {filterMode === 'UNREAD' ? 'No unread messages' : 'No messages received yet'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {filterMode === 'UNREAD'
                ? "You are all caught up! You don't have any unread inquiries from recruiters."
                : 'Once recruiters review your profile and reach out regarding job circulars, their direct inquiries will appear here.'}
            </p>
          </div>
          {filterMode === 'UNREAD' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setFilterMode('ALL')}
              className="text-xs font-bold"
            >
              View All Messages
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMessages.map((msg) => {
            const isUnread = !msg.is_read;
            const isExpanded = expandedMessageId === msg.message_id;

            return (
              <div
                key={msg.message_id}
                onClick={() => handleCardClick(msg)}
                className={`group cursor-pointer rounded-3xl border p-5 sm:p-6 transition-all duration-200 relative overflow-hidden ${
                  isUnread
                    ? 'bg-gradient-to-br from-indigo-50/70 via-white to-violet-50/40 dark:from-indigo-950/30 dark:via-slate-900 dark:to-slate-900 border-indigo-300 dark:border-indigo-800 shadow-md ring-1 ring-indigo-500/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md'
                }`}
              >
                {/* Unread Accent Bar */}
                {isUnread && (
                  <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b from-indigo-600 to-violet-600" />
                )}

                <div className="space-y-4">
                  {/* Meta Bar: Recruiter, Org, Job & Date */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                        isUnread
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}>
                        {msg.recruiter_name?.[0]?.toUpperCase() || 'R'}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                            {msg.recruiter_name}
                          </h4>
                          {isUnread && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                              New Inquiry
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                          <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            {msg.recruiter_company}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-medium">
                            <Briefcase className="w-3 h-3 text-indigo-500" />
                            {msg.job_title}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {formatDate(msg.created_at)}
                      </span>
                      <button
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                        title={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Subject Line */}
                  <div>
                    <h3 className={`text-base font-extrabold text-slate-900 dark:text-white ${isUnread ? 'text-indigo-950 dark:text-indigo-200' : ''}`}>
                      {msg.subject}
                    </h3>
                  </div>

                  {/* Message Body Content */}
                  <div className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap transition-colors ${
                    isUnread
                      ? 'bg-white/80 dark:bg-slate-800/80 border border-indigo-100 dark:border-indigo-900/50 text-slate-800 dark:text-slate-200 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                    {msg.body}
                  </div>

                  {/* Action Bar */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="text-[11px] text-slate-400">
                      {isUnread ? (
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          Clicking this message marks it as read.
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Read
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMailtoReply(msg);
                        }}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Instant Mailto (External App)"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>

                      <Button
                        variant="primary"
                        size="sm"
                        onClick={(e) => handleReplyEmail(e, msg)}
                        className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 rounded-xl py-1.5 px-3.5 shadow-sm shadow-indigo-600/20"
                      >
                        <Reply className="w-3.5 h-3.5" />
                        Reply via Email
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive Candidate Reply Modal */}
      <CandidateReplyModal
        isOpen={replyModalOpen}
        onClose={() => setReplyModalOpen(false)}
        message={messageToReply}
        onReplySuccess={(messageId) => {
          setMessages((prev) =>
            prev.map((m) => (m.message_id === messageId ? { ...m, is_read: true } : m))
          );
          if (markGlobalNotificationAsRead) {
            markGlobalNotificationAsRead(messageId);
          }
        }}
        triggerToast={triggerToast}
      />
    </div>
  );
}
