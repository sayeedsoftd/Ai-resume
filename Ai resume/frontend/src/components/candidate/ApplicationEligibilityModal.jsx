import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Briefcase,
  Sparkles,
  ArrowRight,
  Award,
  Layers,
} from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';

export default function ApplicationEligibilityModal({
  isOpen,
  onClose,
  job,
  resume,
  onConfirm,
  isSubmitting = false,
  actionType = 'screening', // 'screening' | 'apply'
}) {
  const [expectedSalary, setExpectedSalary] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Pre-fill or reset salary when modal opens
  useEffect(() => {
    if (isOpen && job) {
      if (job.min_salary && job.max_salary) {
        setExpectedSalary(String(job.min_salary));
      } else if (job.min_salary) {
        setExpectedSalary(String(job.min_salary));
      } else {
        setExpectedSalary('');
      }
      setErrorMsg('');
    }
  }, [isOpen, job]);

  if (!isOpen || !job) return null;

  // Calculate candidate parsed experience
  const rawExp =
    resume?.parsed_data?.experience_years ??
    (Array.isArray(resume?.parsed_data?.experience)
      ? resume.parsed_data.experience.length
      : 0);
  const candidateExp = Math.round(Number(rawExp) * 10) / 10;
  const requiredExp = Number(job.experience_years_required || 0);
  const isExpBelow = requiredExp > 0 && candidateExp < requiredExp;

  // Company budget display string
  let budgetHelper = 'Salary is negotiable / performance-driven.';
  if (job.min_salary && job.max_salary) {
    budgetHelper = `Company Budget: ৳${Number(job.min_salary).toLocaleString()} - ৳${Number(job.max_salary).toLocaleString()} / month`;
  } else if (job.min_salary) {
    budgetHelper = `Company Budget: From ৳${Number(job.min_salary).toLocaleString()} / month`;
  } else if (job.salary_range) {
    budgetHelper = `Company Budget: ${job.salary_range}`;
  }

  const handleConfirm = (e) => {
    e.preventDefault();
    if (!expectedSalary || Number(expectedSalary) <= 0) {
      setErrorMsg('Please specify your expected monthly salary in BDT.');
      return;
    }
    setErrorMsg('');
    onConfirm(Number(expectedSalary));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Application Pre-Flight Check
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {job.title} &bull; {job.company_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleConfirm} className="p-6 space-y-5">
          {/* 1. Experience Gatekeeper Alert */}
          {isExpBelow ? (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 space-y-1.5 shadow-xs">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <h4 className="text-xs font-bold uppercase tracking-wide">
                  Experience Requirement Alert
                </h4>
              </div>
              <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                This role requires at least <strong>{requiredExp} years</strong> of experience.
                Your parsed resume indicates <strong>{candidateExp} {candidateExp === 1 ? 'year' : 'years'}</strong>.
              </p>
              <p className="text-[11px] text-amber-700/90 dark:text-amber-400/90 font-medium pt-1 border-t border-amber-200/80 dark:border-amber-800/60">
                You can still proceed with the technical screening test! High test and ATS scores can qualify candidates with strong technical proficiency.
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="block font-bold">Experience Criteria Satisfied</strong>
                <span className="text-emerald-700 dark:text-emerald-300 text-[11px]">
                  You have {candidateExp} years of parsed experience ({requiredExp > 0 ? `${requiredExp} years required` : 'Fresher welcome'}).
                </span>
              </div>
            </div>
          )}

          {/* 2. Expected Salary Input */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              Expected Monthly Salary (BDT) <span className="text-rose-500">*</span>
            </label>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                ৳
              </span>
              <input
                type="number"
                min="0"
                step="500"
                value={expectedSalary}
                onChange={(e) => setExpectedSalary(e.target.value)}
                placeholder="e.g. 50000"
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                required
              />
            </div>

            {/* Helper Text: Disclosed Company Budget */}
            <div className="flex items-center gap-1.5 text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
              <DollarSign className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span className="font-semibold">{budgetHelper}</span>
            </div>

            {/* Quick Preset Buttons */}
            {job.min_salary && job.max_salary && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] text-slate-400">Quick Fill:</span>
                <button
                  type="button"
                  onClick={() => setExpectedSalary(String(job.min_salary))}
                  className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  Min (৳{Number(job.min_salary).toLocaleString()})
                </button>
                <button
                  type="button"
                  onClick={() => setExpectedSalary(String(job.max_salary))}
                  className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  Max (৳{Number(job.max_salary).toLocaleString()})
                </button>
              </div>
            )}

            {errorMsg && (
              <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
                {errorMsg}
              </p>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm px-4"
            >
              {isSubmitting ? (
                'Processing...'
              ) : actionType === 'screening' ? (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Proceed to Technical Screening
                </>
              ) : (
                <>
                  <ArrowRight className="w-3.5 h-3.5" />
                  Confirm & Submit Application
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
