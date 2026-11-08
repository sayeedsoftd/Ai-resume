import React, { useState, useEffect } from 'react';
import {
  Star,
  MessageSquare,
  Users,
  Award,
  Trash2,
  Edit3,
  ShieldAlert,
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  XCircle,
  TrendingUp,
} from 'lucide-react';
import { jobService } from '../../services/jobService';

const RECOMMENDATIONS = [
  {
    value: 'STRONG_HIRE',
    label: 'Strong Hire ⭐',
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    icon: CheckCircle2,
  },
  {
    value: 'HIRE',
    label: 'Hire 👍',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    icon: CheckCircle2,
  },
  {
    value: 'NEUTRAL',
    label: 'Neutral / Needs Discussion 💬',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    icon: HelpCircle,
  },
  {
    value: 'REJECT',
    label: 'Reject ✕',
    color: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800',
    icon: XCircle,
  },
];

export default function TeamEvaluationsPanel({ applicationId, initialSummary = null, onSummaryChange = null }) {
  const [summary, setSummary] = useState(initialSummary);
  const [loading, setLoading] = useState(!initialSummary);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [recommendation, setRecommendation] = useState('HIRE');
  const [recruiterRole, setRecruiterRole] = useState('Technical Interviewer');
  const [noteText, setNoteText] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);

  useEffect(() => {
    if (applicationId) {
      loadEvaluations();
    }
  }, [applicationId]);

  const loadEvaluations = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const data = await jobService.getApplicationEvaluations(applicationId);
      setSummary(data);
      if (onSummaryChange) onSummaryChange(data);

      // Check if current user already submitted a note
      const existingUserNote = data?.notes?.find((n) => n.can_edit);
      if (existingUserNote && !editingNoteId) {
        setRating(existingUserNote.rating);
        setRecommendation(existingUserNote.recommendation || 'HIRE');
        setRecruiterRole(existingUserNote.recruiter_role || 'Technical Interviewer');
        setNoteText(existingUserNote.note_text);
        setEditingNoteId(existingUserNote.id);
      }
    } catch (err) {
      console.error('Failed to load team evaluations:', err);
      setErrorMsg(err.response?.data?.detail || 'Could not load team evaluations.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitEvaluation = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) {
      alert('Please write an evaluation comment or note.');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const payload = {
        rating: Number(rating),
        recommendation,
        recruiter_role: recruiterRole.trim() || 'Hiring Team Member',
        note_text: noteText.trim(),
      };
      const updated = await jobService.submitApplicationEvaluation(applicationId, payload);
      setSummary(updated);
      if (onSummaryChange) onSummaryChange(updated);
      setSuccessMsg(editingNoteId ? 'Your evaluation note has been updated.' : 'Evaluation submitted successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);

      const myNote = updated?.notes?.find((n) => n.can_edit);
      if (myNote) {
        setEditingNoteId(myNote.id);
      }
    } catch (err) {
      console.error('Failed to submit evaluation:', err);
      setErrorMsg(err.response?.data?.detail || 'Failed to submit evaluation note.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Are you sure you want to remove this internal evaluation note?')) {
      return;
    }
    setDeletingId(noteId);
    try {
      await jobService.deleteApplicationEvaluation(applicationId, noteId);
      if (editingNoteId === noteId) {
        setEditingNoteId(null);
        setNoteText('');
        setRating(5);
        setRecommendation('HIRE');
      }
      await loadEvaluations();
    } catch (err) {
      console.error('Failed to delete note:', err);
      alert(err.response?.data?.detail || 'Could not remove evaluation note.');
    } finally {
      setDeletingId(null);
    }
  };

  const getConsensusBadge = (consensus, total) => {
    if (!total || total === 0 || consensus === 'NO_REVIEWS') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
          <HelpCircle className="w-3.5 h-3.5" /> No Committee Reviews Yet
        </span>
      );
    }
    switch (consensus) {
      case 'STRONG_HIRE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Strong Hire Consensus ({total}{' '}
            {total === 1 ? 'Review' : 'Reviews'})
          </span>
        );
      case 'HIRE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> Hire Recommended ({total}{' '}
            {total === 1 ? 'Review' : 'Reviews'})
          </span>
        );
      case 'NEUTRAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
            <HelpCircle className="w-3.5 h-3.5 text-amber-600" /> Needs Discussion / Neutral ({total}{' '}
            {total === 1 ? 'Review' : 'Reviews'})
          </span>
        );
      case 'REJECT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5 text-rose-600" /> Reject Recommended ({total}{' '}
            {total === 1 ? 'Review' : 'Reviews'})
          </span>
        );
      default:
        return null;
    }
  };

  const avgRating = summary?.average_rating ?? 0.0;
  const totalReviews = summary?.total_evaluators ?? 0;
  const consensus = summary?.hiring_consensus ?? 'NO_REVIEWS';
  const breakdown = summary?.recommendation_breakdown || {
    STRONG_HIRE: 0,
    HIRE: 0,
    NEUTRAL: 0,
    REJECT: 0,
  };
  const notes = summary?.notes || [];

  return (
    <div className="space-y-6">
      {/* Confidentiality Notice Banner */}
      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Strictly Confidential:</strong> Internal notes, ratings, and committee consensus are private to
            the hiring team and are strictly hidden from candidate accounts.
          </span>
        </div>
        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 shrink-0">
          Internal Only
        </span>
      </div>

      {/* Header Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Consensus & Average Rating */}
        <div className="md:col-span-2 p-5 rounded-2xl bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 dark:from-slate-800/80 dark:via-slate-850 dark:to-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-600" /> Hiring Committee Evaluation
              </span>
              {getConsensusBadge(consensus, totalReviews)}
            </div>

            <div className="flex items-baseline gap-3 my-2">
              <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                {totalReviews > 0 ? avgRating.toFixed(1) : '—'}
              </span>
              <span className="text-slate-400 text-sm font-semibold">/ 5.0</span>

              {/* Render Gold Stars */}
              <div className="flex items-center gap-1 ml-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-5 h-5 ${
                      s <= Math.round(avgRating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-300 dark:text-slate-600'
                    }`}
                  />
                ))}
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Aggregated from <strong>{totalReviews}</strong> team {totalReviews === 1 ? 'member' : 'members'}{' '}
              across technical viva, live coding, and profile review rounds.
            </p>
          </div>

          {/* Breakdown Mini Bar */}
          <div className="grid grid-cols-4 gap-2 pt-4 border-t border-slate-200/60 dark:border-slate-700/60 mt-3">
            <div className="text-center">
              <span className="text-[10px] font-bold text-emerald-600 block">Strong Hire</span>
              <span className="text-sm font-black text-slate-900 dark:text-white">{breakdown.STRONG_HIRE || 0}</span>
            </div>
            <div className="text-center">
              <span className="text-[10px] font-bold text-blue-600 block">Hire</span>
              <span className="text-sm font-black text-slate-900 dark:text-white">{breakdown.HIRE || 0}</span>
            </div>
            <div className="text-center">
              <span className="text-[10px] font-bold text-amber-600 block">Neutral</span>
              <span className="text-sm font-black text-slate-900 dark:text-white">{breakdown.NEUTRAL || 0}</span>
            </div>
            <div className="text-center">
              <span className="text-[10px] font-bold text-rose-600 block">Reject</span>
              <span className="text-sm font-black text-slate-900 dark:text-white">{breakdown.REJECT || 0}</span>
            </div>
          </div>
        </div>

        {/* Quick Quick Guide / Help */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700/80 shadow-xs flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-2">
              <Award className="w-4 h-4 text-purple-600" />
              Rating Rubric
            </h4>
            <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5 leading-relaxed">
              <li>
                <strong className="text-emerald-600 dark:text-emerald-400">5 ⭐:</strong> Top 5% candidate, exceeds all requirements.
              </li>
              <li>
                <strong className="text-blue-600 dark:text-blue-400">4 ⭐:</strong> Strong technical match, solid viva and coding.
              </li>
              <li>
                <strong className="text-amber-600 dark:text-amber-400">3 ⭐:</strong> Meets baseline, minor concerns or skill gaps.
              </li>
              <li>
                <strong className="text-rose-600 dark:text-rose-400">1-2 ⭐:</strong> Substandard test marks or cultural mismatch.
              </li>
            </ul>
          </div>
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
            Each reviewer submits an independent rating and rationale.
          </div>
        </div>
      </div>

      {/* Add / Edit Evaluation Form */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700/80 shadow-xs">
        <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {editingNoteId ? 'Edit Your Internal Evaluation Note' : 'Add Your Evaluation Note & Rating'}
            </h3>
          </div>
          {editingNoteId && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              Editing Submitted Note
            </span>
          )}
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmitEvaluation} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1-5 Star Interactive Picker */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Your Score ({rating}/5 Stars)
              </label>
              <div className="flex items-center gap-1.5 py-1">
                {[1, 2, 3, 4, 5].map((starVal) => {
                  const active = hoverRating ? starVal <= hoverRating : starVal <= rating;
                  return (
                    <button
                      key={starVal}
                      type="button"
                      onMouseEnter={() => setHoverRating(starVal)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(starVal)}
                      className="p-1 rounded-lg hover:scale-110 transition-transform focus:outline-none"
                    >
                      <Star
                        className={`w-6 h-6 transition-colors ${
                          active
                            ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                            : 'text-slate-300 dark:text-slate-600'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recommendation Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Recommendation Vote
              </label>
              <select
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {RECOMMENDATIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Reviewer Role Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Your Reviewer Role
              </label>
              <input
                type="text"
                placeholder="e.g. Frontend Lead, HR Manager"
                value={recruiterRole}
                onChange={(e) => setRecruiterRole(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Note Textarea */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Private Feedback & Rationale
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Strong system design and clean code sandbox solution. Viva responses were articulate and demonstrated solid mastery of concurrency. Would recommend hiring for Senior Engineer..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-[11px] text-slate-400">
              Visible to hiring managers and recruiters only.
            </span>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center gap-2 disabled:opacity-60"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting
                ? 'Saving Note...'
                : editingNoteId
                ? 'Update Evaluation Note'
                : 'Submit Evaluation Note'}
            </button>
          </div>
        </form>
      </div>

      {/* Internal Notes Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
            Internal Feedback Timeline ({notes.length})
          </h4>
          <span className="text-[11px] text-slate-400">Sorted newest first</span>
        </div>

        {notes.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700/80">
            <MessageSquare className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              No internal evaluation notes recorded yet.
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Be the first interviewer to leave a review and score using the form above.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => {
              const recMeta = RECOMMENDATIONS.find((r) => r.value === note.recommendation) || RECOMMENDATIONS[1];
              const RecIcon = recMeta.icon;

              return (
                <div
                  key={note.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:border-indigo-200 dark:hover:border-slate-600 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Reviewer Info */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                        {(note.recruiter_name || 'R').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {note.recruiter_name}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {note.recruiter_role || 'Interviewer'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {note.created_at
                            ? new Date(note.created_at).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Just now'}
                        </span>
                      </div>
                    </div>

                    {/* Score & Recommendation Pill */}
                    <div className="flex items-center gap-2">
                      {/* Stars */}
                      <div className="flex items-center gap-0.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 px-2 py-0.8 rounded-lg text-xs font-bold text-amber-700 dark:text-amber-300">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{note.rating}.0</span>
                      </div>

                      {/* Pill */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.8 rounded-full text-[11px] font-bold border ${recMeta.color}`}
                      >
                        <RecIcon className="w-3 h-3" />
                        {recMeta.label}
                      </span>

                      {/* Delete action if allowed */}
                      {note.can_delete && (
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(note.id)}
                          disabled={deletingId === note.id}
                          className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                          title="Remove your note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Note Body */}
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap pl-11">
                    {note.note_text}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
