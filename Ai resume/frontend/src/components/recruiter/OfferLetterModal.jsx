import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Sparkles,
  Send,
  DollarSign,
  Calendar,
  Clock,
  Briefcase,
  Building,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Eye,
  Edit3,
  ShieldCheck,
  Check,
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { jobService } from '../../services/jobService';

export default function OfferLetterModal({
  isOpen,
  onClose,
  application,
  candidateName,
  candidateEmail,
  jobTitle,
  companyName,
  expectedSalary,
  onOfferSent,
}) {
  const [offeredSalary, setOfferedSalary] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [workplaceType, setWorkplaceType] = useState('Remote');
  const [probationMonths, setProbationMonths] = useState(3);
  const [department, setDepartment] = useState('Engineering & Technology');
  const [supervisorTitle, setSupervisorTitle] = useState('Director of Engineering');
  const [customPerks, setCustomPerks] = useState(
    'Performance bonus, dual festival allowances, comprehensive healthcare coverage, flexible hours, and professional learning budget.'
  );

  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [draftHtml, setDraftHtml] = useState('');
  const [activeTab, setActiveTab] = useState('preview'); // 'preview' | 'edit'
  const [successBanner, setSuccessBanner] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Default to candidate's expected salary or 55,000
      const defaultSal = expectedSalary || application?.expected_salary || 55000;
      setOfferedSalary(defaultSal);

      // Default joining date to 14 days from today
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 14);
      setJoiningDate(targetDate.toISOString().split('T')[0]);

      setErrorMsg('');
      setSuccessBanner('');
      setDraftHtml('');
      setActiveTab('preview');
    }
  }, [isOpen, application, expectedSalary]);

  if (!isOpen) return null;

  const rawAppId = application?.application_id || application?.id || application?.app_id;
  const appId = rawAppId ? Number(rawAppId) : null;
  const candDisplayName =
    candidateName ||
    application?.candidate_name ||
    application?.user?.full_name ||
    'Candidate';
  const roleTitle = jobTitle || application?.job_title || application?.job?.title || 'Selected Role';
  const hiringCompany =
    companyName || application?.company_name || application?.job?.company_name || 'Hiring Organization';

  const handleGenerateDraft = async () => {
    if (!appId || isNaN(appId)) {
      setErrorMsg('Missing valid application ID. Please reopen the candidate dossier and retry.');
      return;
    }
    if (!offeredSalary || Number(offeredSalary) <= 0) {
      setErrorMsg('Please specify a valid monthly remuneration amount.');
      return;
    }
    if (!joiningDate) {
      setErrorMsg('Please specify a valid target joining date.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessBanner('');

    try {
      const payload = {
        application_id: Number(appId),
        job_title: roleTitle,
        company_name: hiringCompany,
        offered_salary: Number(offeredSalary),
        joining_date: joiningDate,
        workplace_type: workplaceType,
        probation_period_months: Number(probationMonths),
        department: department || undefined,
        supervisor_title: supervisorTitle || undefined,
        custom_perks: customPerks || undefined,
      };

      const response = await jobService.generateOfferLetterDraft(payload);
      setDraftHtml(response.letter_content_html);
      setActiveTab('preview');
    } catch (err) {
      console.error('Failed to generate offer letter:', err);
      setErrorMsg(
        err.response?.data?.detail || 'Failed to generate AI offer letter. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSendOfficialOffer = async () => {
    if (!appId || isNaN(appId)) {
      setErrorMsg('Missing valid application ID. Cannot dispatch offer.');
      return;
    }
    if (!draftHtml || !draftHtml.trim()) {
      setErrorMsg('Cannot dispatch an empty offer letter. Please generate a draft first.');
      return;
    }

    setSending(true);
    setErrorMsg('');

    try {
      const payload = {
        application_id: Number(appId),
        offered_salary: Number(offeredSalary),
        joining_date: joiningDate,
        workplace_type: workplaceType,
        probation_period_months: Number(probationMonths),
        custom_perks: customPerks,
        letter_content_html: draftHtml,
      };

      const res = await jobService.sendOfficialOfferLetter(payload);
      setSuccessBanner('Official Offer Letter extended and dispatched to candidate dashboard!');

      if (onOfferSent) {
        onOfferSent(res);
      }

      setTimeout(() => {
        onClose();
      }, 1600);
    } catch (err) {
      console.error('Failed to send offer letter:', err);
      setErrorMsg(
        err.response?.data?.detail || 'Failed to dispatch offer letter. Please try again.'
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-900 dark:text-slate-100">
        {/* Modal Header */}
        <div className="p-5 sm:px-7 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50 dark:bg-slate-850 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                {hiringCompany}
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <Badge variant="primary" size="xs">
                AI Offer Letter Generator
              </Badge>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate mt-0.5">
              Draft Employment Contract for {candDisplayName}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successBanner && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successBanner}</span>
            </div>
          )}

          {/* Form Configuration Inputs Grid */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Agreed Employment Terms & Compensation
              </h3>
              <span className="text-[11px] text-slate-500">
                Target Role: <strong>{roleTitle}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {/* Monthly Salary Input */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  Offered Monthly Salary (BDT)*
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-slate-400">৳</span>
                  <input
                    type="number"
                    value={offeredSalary}
                    onChange={(e) => setOfferedSalary(e.target.value)}
                    placeholder="55000"
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                {expectedSalary ? (
                  <span className="text-[10px] text-slate-400">
                    Candidate expectation: ৳{Number(expectedSalary).toLocaleString()}
                  </span>
                ) : null}
              </div>

              {/* Joining Date */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  Joining / Commencement Date*
                </label>
                <input
                  type="date"
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-white font-semibold text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Workplace Arrangement */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-purple-600" />
                  Workplace Arrangement
                </label>
                <select
                  value={workplaceType}
                  onChange={(e) => setWorkplaceType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-white font-semibold text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="Remote">Fully Remote</option>
                  <option value="Hybrid">Hybrid (Flexible)</option>
                  <option value="On-site">On-site (Office)</option>
                </select>
              </div>

              {/* Probation Period */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Probation Period (Months)
                </label>
                <select
                  value={probationMonths}
                  onChange={(e) => setProbationMonths(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-white font-semibold text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value={0}>No Probation (Immediate Confirmation)</option>
                  <option value={1}>1 Month</option>
                  <option value={3}>3 Months (Standard)</option>
                  <option value={6}>6 Months</option>
                </select>
              </div>

              {/* Department */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Engineering & Technology"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-white font-medium text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Reporting Line / Supervisor */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Reporting Authority</label>
                <input
                  type="text"
                  value={supervisorTitle}
                  onChange={(e) => setSupervisorTitle(e.target.value)}
                  placeholder="Director of Engineering"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-white font-medium text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            {/* Custom Perks Input */}
            <div className="space-y-1 pt-1">
              <label className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                Perks, Allowances & Benefits Clauses
              </label>
              <textarea
                rows={2}
                value={customPerks}
                onChange={(e) => setCustomPerks(e.target.value)}
                placeholder="Performance bonus, festival allowances, medical coverage..."
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-white text-xs leading-relaxed focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              />
            </div>

            {/* Generate Trigger Button */}
            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                onClick={handleGenerateDraft}
                disabled={loading}
                className="font-bold text-xs px-6 py-2.5 flex items-center gap-2 shadow-md shadow-indigo-600/20"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Gemini AI Drafting Contract...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>{draftHtml ? 'Regenerate AI Offer Letter' : 'Generate with Gemini AI'}</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Draft Preview & In-Browser Editor */}
          {draftHtml ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('preview')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeTab === 'preview'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Visual Letter Preview
                  </button>
                  <button
                    onClick={() => setActiveTab('edit')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeTab === 'edit'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Direct HTML / Text Editor
                  </button>
                </div>

                <span className="text-[11px] text-slate-400 font-medium">
                  Review & edit terms before official dispatch
                </span>
              </div>

              {activeTab === 'preview' ? (
                <div className="p-4 sm:p-6 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-300 dark:border-slate-800 max-h-[450px] overflow-y-auto">
                  <div
                    className="bg-white text-slate-900 rounded-xl shadow-sm p-4 sm:p-6"
                    dangerouslySetInnerHTML={{ __html: draftHtml }}
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <textarea
                    rows={16}
                    value={draftHtml}
                    onChange={(e) => setDraftHtml(e.target.value)}
                    className="w-full p-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-900 text-emerald-400 font-mono text-xs leading-relaxed focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-400">
                    You can edit the HTML clauses directly. Any changes will be included in the official contract sent to the candidate.
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-850 shrink-0">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            {draftHtml && (
              <Button
                variant="primary"
                onClick={handleSendOfficialOffer}
                disabled={sending}
                className="font-bold text-xs px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                {sending ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Dispatching Official Offer...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Official Offer Letter</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
