import React, { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  BadgePercent,
  Briefcase,
  HelpCircle,
} from 'lucide-react';

export default function SalaryBenchmarkWidget({
  expectedSalary,
  jobMinSalary,
  jobMaxSalary,
  salaryFitStatus,
  benchmarkAnalysis,
  compact = false,
}) {
  const [isExpanded, setIsExpanded] = useState(!compact);

  if (expectedSalary == null) return null;

  const expSal = Number(expectedSalary);
  const maxSal = jobMaxSalary ? Number(jobMaxSalary) : null;
  const minSal = jobMinSalary ? Number(jobMinSalary) : null;

  const analysis = benchmarkAnalysis || {};
  const fitStatus = salaryFitStatus || analysis.fit_status || (
    maxSal && expSal <= maxSal ? 'WITHIN_BUDGET' : (maxSal && expSal > maxSal ? 'SLIGHTLY_ABOVE' : 'WITHIN_BUDGET')
  );

  const deltaPct = analysis.salary_delta_percentage != null
    ? analysis.salary_delta_percentage
    : maxSal && expSal > maxSal
    ? Math.round(((expSal - maxSal) / maxSal) * 100)
    : 0;

  const isJustified = analysis.is_justified_by_skills ?? (fitStatus === 'WITHIN_BUDGET');
  const marketRate = analysis.market_rate_estimation || (maxSal ? `৳${Math.round(maxSal * 0.8).toLocaleString()} - ৳${Math.round(maxSal * 1.15).toLocaleString()}` : 'Market Competitive');
  const counterOffer = analysis.recommended_counter_offer || (maxSal ? `৳${maxSal.toLocaleString()}` : null);
  const aiRationale = analysis.ai_rationale || (
    fitStatus === 'WITHIN_BUDGET'
      ? `Candidate asks for ৳${expSal.toLocaleString()}, which is within the employer's budget threshold.`
      : `Candidate asks for ৳${expSal.toLocaleString()} (+${deltaPct}% above cap). Counter-offer advised.`
  );

  const isWithin = fitStatus === 'WITHIN_BUDGET' || fitStatus === 'BELOW_BUDGET';
  const isSignificant = fitStatus === 'SIGNIFICANTLY_ABOVE' || deltaPct > 20;

  const formatK = (amount) => {
    if (!amount) return '0';
    if (amount >= 1000) {
      const k = amount / 1000;
      return `${Number.isInteger(k) ? k : k.toFixed(1)}k`;
    }
    return amount.toLocaleString();
  };

  return (
    <div className="rounded-2xl border transition-all overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs">
      {/* Top Banner / Badge Row */}
      <div className="p-3 sm:px-4 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          {isWithin ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              <span className="text-sm">💰</span>
              <span>
                Within Budget: ৳{formatK(expSal)} {maxSal ? `/ ৳${formatK(maxSal)} max` : ''}
              </span>
            </span>
          ) : (
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${
                isSignificant
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>
                +{deltaPct}% Above Budget: ৳{formatK(expSal)} {maxSal ? `(Max ৳${formatK(maxSal)})` : ''}
              </span>
            </span>
          )}

          {/* Justified by skills chip */}
          {isJustified && !isWithin && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              Justified by Skills
            </span>
          )}
        </div>

        {/* Expand / Collapse Button */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 transition-colors"
        >
          <span className="text-[11px]">{isExpanded ? 'Hide AI Fit' : 'AI Benchmark Advice'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expandable AI Analysis Card */}
      {isExpanded && (
        <div className="p-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-850/60 space-y-3 text-xs animate-in fade-in duration-150">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Market Standard Rate
              </span>
              <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                {marketRate}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Candidate Demand
              </span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                ৳{expSal.toLocaleString()} / mo
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                AI Recommendation
              </span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs truncate block">
                {counterOffer || 'Offer within budget'}
              </span>
            </div>
          </div>

          {/* AI Rationale & Evaluation Summary */}
          <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-900/40 space-y-1">
            <div className="flex items-center gap-1.5 text-indigo-900 dark:text-indigo-300 font-bold text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Gemini Pro Budget Fit & Justification Rationale</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 font-sans">
              {aiRationale}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
