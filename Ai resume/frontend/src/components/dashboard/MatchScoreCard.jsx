import React from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { CheckCircle2, AlertCircle } from 'lucide-react';

const MatchScoreCard = ({ matchData }) => {
  if (!matchData) return null;

  const { match_score, matched_skills = [], missing_skills = [], summary_feedback } = matchData;

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800';
    if (score >= 50) return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800';
    return 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800';
  };

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-base font-bold text-slate-900 dark:text-white">AI Compatibility Score</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">Resume alignment with target position</p>
        </div>
        <div className={`px-4 py-2 rounded-2xl border font-black text-2xl ${getScoreColor(match_score)}`}>
          {match_score}%
        </div>
      </div>

      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-sm text-slate-700 dark:text-slate-300">
        {summary_feedback}
      </div>

      <div className="space-y-3">
        <div>
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Matched Skills ({matched_skills.length})
          </span>
          <div className="flex flex-wrap gap-1.5">
            {matched_skills.map((skill, i) => (
              <Badge key={i} variant="success">{skill}</Badge>
            ))}
            {matched_skills.length === 0 && (
              <span className="text-xs text-slate-400 italic">No exact skill matches</span>
            )}
          </div>
        </div>

        <div>
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" /> Missing / Recommended Skills ({missing_skills.length})
          </span>
          <div className="flex flex-wrap gap-1.5">
            {missing_skills.map((skill, i) => (
              <Badge key={i} variant="danger">{skill}</Badge>
            ))}
            {missing_skills.length === 0 && (
              <span className="text-xs text-slate-400 italic">No missing skills required</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default MatchScoreCard;
