import React, { useState, useEffect } from 'react';
import { Mail, X, Send, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';
import Button from '../ui/Button';
import { jobService } from '../../services/jobService';

export default function SendMessageModal({
  isOpen,
  onClose,
  candidate,
  blindMode = false,
  onSent = null,
}) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Safe candidate metadata extraction with defensive fallbacks
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

  const jobTitle = candidate?.job_title || candidate?.title || 'the position';
  const companyName = candidate?.company_name || 'Hiring Team';

  useEffect(() => {
    if (isOpen && candidate) {
      setSentSuccess(false);
      setSending(false);
      setErrorMsg('');
      setSubject(`Next Steps: ${jobTitle} application at ${companyName}`);
      setMessage(
        `Hello ${candidateName},\n\nWe have reviewed your assessment and profile for the ${jobTitle} position and would like to move forward. Let us know your availability this week for a brief conversation.\n\nBest regards,\n${companyName} Recruiting Team`
      );
    }
  }, [isOpen, candidate, jobTitle, companyName, candidateName]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !candidate) return null;

  const handleSend = async () => {
    if (blindMode) {
      alert('Direct external email is disabled while Anti-Bias Mode is active to preserve candidate anonymity. Turn off Anti-Bias mode to view contact details.');
      return;
    }

    if (!subject.trim()) {
      alert('Please enter an email subject.');
      return;
    }

    if (!message.trim()) {
      alert('Please enter a message body.');
      return;
    }

    setSending(true);
    setErrorMsg('');

    try {
      const payload = {
        candidate_id: candidate?.candidate_id || candidate?.id || candidate?.user_id,
        application_id: candidate?.application_id,
        subject: subject.trim(),
        message: message.trim(),
      };

      const res = await jobService.sendCandidateMessage(payload);

      setSentSuccess(true);
      if (onSent) {
        onSent({ candidate, subject, message, result: res });
      }

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Failed to dispatch recruiter email message:', err);
      const detail =
        err.response?.data?.detail || 'Failed to dispatch email to candidate. Please check server logs.';
      setErrorMsg(detail);
      alert(detail);
    } finally {
      setSending(false);
    }
  };

  const handleLaunchMailClientFallback = () => {
    if (blindMode) return;
    const mailtoUrl = `mailto:${candidateEmail}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(message)}`;
    window.open(mailtoUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#131b2e] border border-slate-700 p-6 rounded-2xl w-full max-w-lg relative z-50 text-white shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Send Message / Email
              </h3>
              <p className="text-[11px] text-slate-400">
                To: <span className="font-semibold text-slate-200">{candidateName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Anti-Bias Warning if Active */}
        {blindMode && (
          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/80 text-xs text-amber-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Direct contact details are masked in <strong>Anti-Bias Mode</strong>. Please toggle off Anti-Bias mode in the top right to expose direct contact information.
            </span>
          </div>
        )}

        {/* Error notification banner if any */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/80 text-xs text-rose-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Fields */}
        <div className="space-y-3">
          {/* Recipient */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Recipient Email
            </label>
            <input
              type="text"
              disabled
              value={blindMode ? 'Hidden in Anti-Bias Mode' : (candidateEmail || 'No email provided')}
              className="w-full p-2.5 text-xs rounded-xl border border-slate-700 bg-slate-900/80 text-slate-400 font-mono focus:outline-none cursor-not-allowed"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Next Steps regarding your application"
              className="w-full p-2.5 text-xs rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Message Body
            </label>
            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your message or interview invitation here..."
              className="w-full p-2.5 text-xs rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <div className="text-[11px] text-slate-500">
            {sentSuccess ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Email delivered to candidate inbox!
              </span>
            ) : !blindMode && candidateEmail ? (
              <button
                type="button"
                onClick={handleLaunchMailClientFallback}
                className="hover:text-indigo-400 text-slate-400 underline transition-colors flex items-center gap-1"
                title="Launch local email application"
              >
                <ExternalLink className="w-3 h-3" />
                Or open in mail client
              </button>
            ) : (
              <span>In-app notification & SMTP delivery</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={sending}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSend}
              disabled={sending || blindMode}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5"
            >
              {sending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Sending Email & Message...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Send Email / Notification
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
