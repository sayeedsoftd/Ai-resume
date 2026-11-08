import React, { useState, useEffect } from 'react';
import {
  Mail,
  X,
  Send,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Briefcase,
  Building2,
  User,
} from 'lucide-react';
import Button from '../ui/Button';
import { jobService } from '../../services/jobService';

export default function CandidateReplyModal({
  isOpen,
  onClose,
  message,
  onReplySuccess = null,
  triggerToast = null,
}) {
  const [subject, setSubject] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Extract recipient metadata with defensive fallbacks
  const recruiterName =
    message?.recruiter_name ||
    message?.sender_name ||
    'Hiring Recruiter';

  const recruiterEmail =
    message?.recruiter_email ||
    message?.sender_email ||
    '';

  const recruiterCompany =
    message?.recruiter_company ||
    'Hiring Organization';

  const jobTitle =
    message?.job_title ||
    'Applied Position';

  useEffect(() => {
    if (isOpen && message) {
      setSentSuccess(false);
      setSending(false);
      setErrorMsg('');
      
      const rawSubject = message.subject || 'Application Inquiry';
      const cleanSubject = rawSubject.toLowerCase().startsWith('re:')
        ? rawSubject
        : `Re: ${rawSubject}`;
      setSubject(cleanSubject);

      setReplyBody(
        `Dear ${recruiterName},\n\nThank you for reaching out regarding the ${jobTitle} position at ${recruiterCompany}.\n\n`
      );
    }
  }, [isOpen, message, recruiterName, jobTitle, recruiterCompany]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !message) return null;

  // Option B: Instant Mailto Fallback
  const handleMailto = () => {
    if (!recruiterEmail) {
      alert('Recruiter contact email unavailable. Contact platform support.');
      return;
    }

    const recipient = recruiterEmail;
    const mailSubject = encodeURIComponent(
      subject.toLowerCase().startsWith('re:') ? subject : `Re: ${subject}`
    );
    const originalSnippet = message?.body ? `\n\n--- In response to message regarding ${jobTitle} ---\n${message.body}` : '';
    const mailBody = encodeURIComponent(`${replyBody}${originalSnippet}`);
    
    window.location.href = `mailto:${recipient}?subject=${mailSubject}&body=${mailBody}`;

    if (triggerToast) {
      triggerToast({
        id: Date.now(),
        title: 'System Mail Client Launched',
        message: `Drafting reply to ${recruiterName} (${recruiterEmail}) in external mailer.`,
        type: 'JOB',
      });
    }
  };

  // Option A: In-App Fast Modal Submission
  const handleSendReply = async () => {
    if (!recruiterEmail) {
      setErrorMsg('Recruiter contact email unavailable. Contact platform support.');
      if (triggerToast) {
        triggerToast({
          id: Date.now(),
          title: 'Recipient Missing',
          message: 'Recruiter contact email unavailable. Contact platform support.',
          type: 'SYSTEM',
        });
      }
      return;
    }

    if (!replyBody.trim()) {
      setErrorMsg('Please enter a message body before sending.');
      return;
    }

    setSending(true);
    setErrorMsg('');

    try {
      const payload = {
        message_id: message.message_id,
        recruiter_email: recruiterEmail,
        recruiter_name: recruiterName,
        job_title: jobTitle,
        subject: subject.trim(),
        message: replyBody.trim(),
      };

      const res = await jobService.replyToRecruiterMessage(payload);

      setSentSuccess(true);

      if (triggerToast) {
        triggerToast({
          id: Date.now(),
          title: 'Reply Dispatched!',
          message: "Reply successfully dispatched to recruiter's email!",
          type: 'JOB',
        });
      }

      if (onReplySuccess) {
        onReplySuccess(message.message_id, res);
      }

      setTimeout(() => {
        onClose();
      }, 1300);
    } catch (err) {
      console.error('Failed to dispatch candidate reply email:', err);
      const detail =
        err.response?.data?.detail ||
        'Failed to dispatch reply email to recruiter. Please try again or use the Mailto option.';
      setErrorMsg(detail);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                Reply via Email
              </h3>
              <p className="text-xs text-emerald-100/90 font-medium">
                Send a direct email response and in-app message to {recruiterName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {sentSuccess ? (
            <div className="py-8 text-center space-y-3 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Reply Successfully Dispatched!
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
                Your email reply has been delivered to <strong>{recruiterEmail}</strong> and logged in the recruiter's inquiry thread.
              </p>
            </div>
          ) : (
            <>
              {/* Recipient & Job Card */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Recipient:</span>
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      {recruiterName}
                    </span>
                    {recruiterEmail ? (
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        &lt;{recruiterEmail}&gt;
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-rose-500 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                        Email Unavailable
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 flex-wrap">
                  <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    {recruiterCompany}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-medium text-indigo-600 dark:text-indigo-400">
                    <Briefcase className="w-3.5 h-3.5" />
                    {jobTitle}
                  </span>
                </div>
              </div>

              {/* Email Availability Warning */}
              {!recruiterEmail && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>
                    Recruiter contact email unavailable. Contact platform support.
                  </span>
                </div>
              )}

              {/* Subject Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Re: Application Inquiry"
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Reply Body Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Your Reply Message
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {replyBody.length} chars
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="Write your reply to the recruiter here... (e.g. confirming availability, answering questions, or providing links)"
                  className="w-full p-3.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed resize-none"
                />
              </div>

              {/* Error Message Alert */}
              {errorMsg && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Actions Footer */}
        {!sentSuccess && (
          <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Option B: Fallback Mailto Trigger */}
            <button
              type="button"
              onClick={handleMailto}
              className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors order-2 sm:order-1"
              title="Open default email application"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open in Mail App (Mailto)
            </button>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end order-1 sm:order-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={onClose}
                disabled={sending}
                className="text-xs font-bold rounded-xl px-4 py-2"
              >
                Cancel
              </Button>

              {/* Option A: Fast In-App Send */}
              <Button
                variant="primary"
                size="sm"
                onClick={handleSendReply}
                disabled={sending || !recruiterEmail}
                className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 rounded-xl px-4 py-2 shadow-md shadow-emerald-600/20 disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sending Dispatch...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Reply via Email</span>
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
