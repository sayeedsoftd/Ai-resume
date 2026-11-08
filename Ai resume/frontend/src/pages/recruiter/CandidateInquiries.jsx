import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import Button from '../../components/ui/Button';
import SendMessageModal from '../../components/recruiter/SendMessageModal';
import { jobService } from '../../services/jobService';
import { useNotifications } from '../../context/NotificationContext';

export default function CandidateInquiries() {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'UNREAD'
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  
  // Follow-up Reply Modal state
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [selectedCandidateForMessage, setSelectedCandidateForMessage] = useState(null);

  const { triggerToast, refreshNotifications } = useNotifications();

  useEffect(() => {
    loadInquiries();
  }, []);

  const loadInquiries = async () => {
    setLoading(true);
    try {
      const data = await jobService.getRecruiterInquiries();
      setInquiries(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load recruiter inquiries:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (inquiryId) => {
    if (!inquiryId) return;
    setInquiries((prev) =>
      prev.map((item) => (item.inquiry_id === inquiryId ? { ...item, is_read: true } : item))
    );
    try {
      await jobService.markRecruiterInquiryRead(inquiryId);
      if (refreshNotifications) refreshNotifications();
    } catch (err) {
      console.error('Failed to mark inquiry as read:', err);
    }
  };

  const handleCardClick = (item) => {
    if (!item.is_read) {
      handleMarkAsRead(item.inquiry_id);
    }
    setExpandedId((prev) => (prev === item.inquiry_id ? null : item.inquiry_id));
  };

  const handleOpenReplyModal = (e, item) => {
    e.stopPropagation();
    if (!item.is_read) {
      handleMarkAsRead(item.inquiry_id);
    }
    setSelectedCandidateForMessage({
      candidate_id: item.candidate_id,
      name: item.candidate_name,
      candidate_name: item.candidate_name,
      email: item.candidate_email,
      candidate_email: item.candidate_email,
      job_title: item.job_title,
    });
    setMessageModalOpen(true);
  };

  const handleMailto = (e, item) => {
    e.stopPropagation();
    if (!item.is_read) {
      handleMarkAsRead(item.inquiry_id);
    }
    const recipient = item.candidate_email || '';
    if (!recipient) {
      alert('Candidate contact email unavailable.');
      return;
    }
    const subject = encodeURIComponent(
      item.subject.toLowerCase().startsWith('re:') ? item.subject : `Re: ${item.subject}`
    );
    const body = encodeURIComponent(
      `\n\n--- In response to candidate reply for ${item.job_title} ---\n${item.body}`
    );
    window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
  };

  const totalCount = inquiries.length;
  const unreadCount = inquiries.filter((i) => !i.is_read).length;

  const filteredInquiries = inquiries.filter((item) => {
    if (filterMode === 'UNREAD' && item.is_read) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.candidate_name?.toLowerCase().includes(q) ||
      item.candidate_email?.toLowerCase().includes(q) ||
      item.job_title?.toLowerCase().includes(q) ||
      item.subject?.toLowerCase().includes(q) ||
      item.body?.toLowerCase().includes(q)
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden border border-emerald-700/50">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              <Inbox className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              Recruiter Communication Hub
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Candidate Inquiries & Direct Responses
          </h1>
          <p className="text-xs sm:text-sm text-emerald-200/90 max-w-2xl">
            Review incoming responses from candidates regarding your interview invitations, outreach inquiries, and application updates.
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

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2">
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
            onClick={() => setFilterMode('UNREAD')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              filterMode === 'UNREAD'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                filterMode === 'UNREAD' ? 'bg-white text-amber-700' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
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
            placeholder="Search candidate, job, subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          />
        </div>
      </div>

      {/* Inquiries Feed */}
      {loading ? (
        <div className="p-16 text-center space-y-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Fetching candidate responses...
          </p>
        </div>
      ) : filteredInquiries.length === 0 ? (
        <div className="p-16 text-center space-y-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800">
            <Mail className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {filterMode === 'UNREAD' ? 'No unread inquiries' : 'No candidate responses yet'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {filterMode === 'UNREAD'
                ? "You have reviewed all incoming candidate replies!"
                : "When candidates reply to your messages and interview invitations, their responses will appear right here."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInquiries.map((item) => {
            const isUnread = !item.is_read;
            const isExpanded = expandedId === item.inquiry_id;

            return (
              <div
                key={item.inquiry_id}
                onClick={() => handleCardClick(item)}
                className={`group cursor-pointer rounded-3xl border p-5 sm:p-6 transition-all duration-200 relative overflow-hidden ${
                  isUnread
                    ? 'bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900 border-emerald-300 dark:border-emerald-800 shadow-md ring-1 ring-emerald-500/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md'
                }`}
              >
                {/* Unread Accent Bar */}
                {isUnread && (
                  <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b from-emerald-600 to-teal-600" />
                )}

                <div className="space-y-4">
                  {/* Meta Bar: Candidate, Job, Date */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                        isUnread
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}>
                        {item.candidate_name?.[0]?.toUpperCase() || 'C'}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                            {item.candidate_name}
                          </h4>
                          {isUnread && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              New Candidate Reply
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                          {item.candidate_email && (
                            <>
                              <span className="font-mono text-slate-600 dark:text-slate-300">
                                {item.candidate_email}
                              </span>
                              <span>•</span>
                            </>
                          )}
                          <span className="flex items-center gap-1 font-medium text-indigo-600 dark:text-indigo-400">
                            <Briefcase className="w-3 h-3" />
                            {item.job_title}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {formatDate(item.created_at)}
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
                    <h3 className={`text-base font-extrabold text-slate-900 dark:text-white ${isUnread ? 'text-emerald-950 dark:text-emerald-200' : ''}`}>
                      {item.subject}
                    </h3>
                  </div>

                  {/* Message Body Content */}
                  <div className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap transition-colors ${
                    isUnread
                      ? 'bg-white/80 dark:bg-slate-800/80 border border-emerald-100 dark:border-emerald-900/50 text-slate-800 dark:text-slate-200 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                    {item.body}
                  </div>

                  {/* Action Bar */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="text-[11px] text-slate-400">
                      {isUnread ? (
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          Clicking this inquiry marks it as read.
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
                        onClick={(e) => handleMailto(e, item)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Mailto Candidate"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>

                      <Button
                        variant="primary"
                        size="sm"
                        onClick={(e) => handleOpenReplyModal(e, item)}
                        className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 rounded-xl py-1.5 px-3.5 shadow-sm shadow-emerald-600/20"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Reply to Candidate
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recruiter Send Follow-Up Message Modal */}
      <SendMessageModal
        isOpen={messageModalOpen}
        onClose={() => setMessageModalOpen(false)}
        candidate={selectedCandidateForMessage}
        onSent={() => {
          if (triggerToast) {
            triggerToast({
              id: Date.now(),
              title: 'Message Sent',
              message: `Follow-up message dispatched to ${selectedCandidateForMessage?.name || 'candidate'}.`,
              type: 'JOB',
            });
          }
        }}
      />
    </div>
  );
}
