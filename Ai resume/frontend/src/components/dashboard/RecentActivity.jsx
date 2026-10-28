import React from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { Clock, Send } from 'lucide-react';

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
        <span className="text-xs text-slate-500 dark:text-slate-400">{applications.length} submitted</span>
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
              <div className="flex items-center gap-3">
                {app.match_score && (
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
                    {app.match_score}% Match
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
