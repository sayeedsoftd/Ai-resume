import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { Clock, Send, Eye, ArrowRight } from 'lucide-react';

const RecentActivity = ({ applications = [] }) => {
  const statusBadges = {
    APPLIED: 'primary',
    SCREENING: 'warning',
    INTERVIEW: 'verified',
    ACCEPTED: 'success',
    REJECTED: 'danger',
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-base font-bold text-slate-900 dark:text-white">Recent Applications</h4>
        {applications.length > 0 ? (
          <Link
            to="/candidate/applications"
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
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
          applications.slice(0, 5).map((app) => (
            <div
              key={app.id}
              className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Application #{app.id}
                  </h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Job #{app.job_id} &bull; {new Date(app.applied_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
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
                <Badge variant={statusBadges[app.status] || 'default'}>
                  {app.status}
                </Badge>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};

export default RecentActivity;
