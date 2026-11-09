import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { Clock, Send, Eye, ArrowRight, Sprout, TrendingUp } from 'lucide-react';
import AIGrowthFeedbackModal from '../candidate/AIGrowthFeedbackModal';

const RecentActivity = ({ applications = [], onOpenTracker }) => {
  const [selectedFeedbackApp, setSelectedFeedbackApp] = useState(null);

  const getSlaInfo = (app) => {
    const activeStatuses = ['APPLIED', 'SCREENING', 'STAGE1_PASSED', 'STAGE2_SUBMITTED'];
    if (!activeStatuses.includes(app.status)) return null;

    let deadline = null;
    if (app.sla_deadline) {
      deadline = new Date(app.sla_deadline);
    } else if (app.applied_at) {
      const days = app.sla_review_days || app.job?.sla_review_days || 5;
      deadline = new Date(new Date(app.applied_at).getTime() + days * 24 * 60 * 60 * 1000);
    }
    if (!deadline || isNaN(deadline.getTime())) return null;

    const now = new Date();
    const diffMs = deadline - now;
    const isBreached = Boolean(app.sla_breached) || diffMs <= 0;

    if (isBreached) {
      return {
        isBreached: true,
        label: '⚠️ SLA Expired • Action Pending by Recruiter',
      };
    }

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffHours / 24);
    const hours = diffHours % 24;

    let remaining = '';
    if (days > 0) {
      remaining = `${days}d ${hours}h left`;
    } else if (hours > 0) {
      remaining = `${hours}h left`;
    } else {
      const mins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
      remaining = `${mins}m left`;
    }

    return {
      isBreached: false,
      label: `⏱️ Review Guaranteed: ${remaining}`,
    };
  };

  const statusBadges = {
    APPLIED: 'primary',
    SCREENING: 'warning',
    INTERVIEW: 'verified',
    ACCEPTED: 'success',
    OFFER_EXTENDED: 'success',
    REJECTED: 'danger',
    STAGE1_FAILED: 'danger',
    STAGE1_PASSED: 'success',
  };

  return (
    <>
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-base font-bold text-slate-900 dark:text-white">Recent Applications</h4>
          {applications.length > 0 ? (
            <Link
              to="/candidate/applications"
              onClick={(e) => {
                if (onOpenTracker) {
                  e.preventDefault();
                  onOpenTracker();
                }
              }}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              Open Tracker ({applications.length}) <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <span className="text-xs text-slate-500 dark:text-slate-400">0 submitted</span>
          )}
        </div>

        <div className="space-y-3">
          {applications.length === 0 ? (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No applications submitted yet.
            </div>
          ) : (
            applications.slice(0, 5).map((app) => {
              const isRejected = app.status === 'REJECTED' || app.status === 'STAGE1_FAILED';
              const slaInfo = getSlaInfo(app);

              return (
                <div
                  key={app.id}
                  onClick={() => {
                    if (isRejected) {
                      setSelectedFeedbackApp(app);
                    }
                  }}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-all gap-3 ${
                    isRejected
                      ? 'border-emerald-200/90 dark:border-emerald-900/50 bg-gradient-to-r from-white via-emerald-50/20 to-indigo-50/20 dark:from-slate-900 dark:via-emerald-950/20 dark:to-slate-850 hover:border-emerald-400 dark:hover:border-emerald-700 hover:shadow-sm cursor-pointer'
                      : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
                  }`}
                  title={isRejected ? 'Click to view your AI Career Growth Roadmap' : undefined}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        isRejected
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                          : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                      }`}
                    >
                      {isRejected ? <Sprout className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h5 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          Application #{app.id}
                        </h5>
                        {app.job?.title && (
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            • {app.job.title}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Job #{app.job_id} {app.job?.company_name ? `• ${app.job.company_name}` : ''} &bull; {new Date(app.applied_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap self-end sm:self-center">
                    {app.viewed_by_recruiter && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                        <Eye className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Viewed
                      </span>
                    )}

                    {app.match_score && (
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
                        {Math.round(app.match_score)}% Match
                      </span>
                    )}

                    {slaInfo && (
                      slaInfo.isBreached ? (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                          {slaInfo.label}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
                          {slaInfo.label}
                        </span>
                      )
                    )}

                    {isRejected ? (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFeedbackApp(app);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xs hover:shadow-sm transition-all cursor-pointer"
                        >
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-200" />
                          <span>📈 AI Growth Feedback</span>
                        </button>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFeedbackApp(app);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.stopPropagation();
                              setSelectedFeedbackApp(app);
                            }
                          }}
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          title="Click to view rejection details & growth feedback"
                        >
                          Review Completed
                        </span>
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-400">
                          REJECTED
                        </span>
                      </>
                    ) : (
                      <Badge variant={statusBadges[app.status] || 'default'}>
                        {app.status}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Aesthetic AI Growth Roadmap & Mentorship Modal */}
      {selectedFeedbackApp && (
        <AIGrowthFeedbackModal
          isOpen={Boolean(selectedFeedbackApp)}
          onClose={() => setSelectedFeedbackApp(null)}
          application={selectedFeedbackApp}
        />
      )}
    </>
  );
};

export default RecentActivity;
