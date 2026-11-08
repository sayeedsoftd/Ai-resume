import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FileText,
  CheckCircle2,
  XCircle,
  Download,
  Printer,
  Sparkles,
  Calendar,
  Building,
  DollarSign,
  Clock,
  ShieldCheck,
  AlertCircle,
  Briefcase,
  Check,
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { jobService } from '../../services/jobService';

export default function OfferViewModal({
  isOpen,
  onClose,
  applicationId,
  onResponseRecorded,
}) {
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmModal, setConfirmModal] = useState(null); // 'ACCEPT' | 'DECLINE' | null
  const [declineNotes, setDeclineNotes] = useState('');
  const [successBanner, setSuccessBanner] = useState('');
  const printAreaRef = useRef(null);

  useEffect(() => {
    if (isOpen && applicationId) {
      loadOfferLetter();
    }
  }, [isOpen, applicationId]);

  const loadOfferLetter = async () => {
    setLoading(true);
    setErrorMsg('');
    setSuccessBanner('');
    try {
      const data = await jobService.getOfferLetter(applicationId);
      setOffer(data);
    } catch (err) {
      console.error('Failed to load offer letter:', err);
      setErrorMsg(
        err.response?.data?.detail || 'Unable to retrieve offer letter. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleRespond = async (responseType) => {
    if (!offer?.id) return;
    setSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        response: responseType,
        notes: responseType === 'DECLINED' ? declineNotes : undefined,
      };

      const updated = await jobService.respondToOfferLetter(offer.id, payload);
      setOffer(updated);
      setConfirmModal(null);
      setSuccessBanner(
        responseType === 'ACCEPTED'
          ? '🎉 Congratulations! You have formally accepted the employment offer!'
          : 'You have formally declined this offer.'
      );

      if (onResponseRecorded) {
        onResponseRecorded(updated);
      }
    } catch (err) {
      console.error('Failed to respond to offer letter:', err);
      setErrorMsg(
        err.response?.data?.detail || 'Failed to submit response. Please check your connection.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    if (!printAreaRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const htmlContent = printAreaRef.current.innerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${offer?.job_title || 'Employment Offer'} - ${offer?.company_name || 'Offer Letter'}</title>
          <meta charset="utf-8" />
          <style>
            @page {
              size: A4;
              margin: 20mm;
            }
            body {
              font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
              color: #0f172a;
              background: #ffffff;
              margin: 0;
              padding: 0;
            }
          </style>
        </head>
        <body>
          ${htmlContent}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); }
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const isAccepted = offer?.status === 'ACCEPTED';
  const isDeclined = offer?.status === 'DECLINED';
  const isPending = offer?.status === 'SENT' || offer?.status === 'DRAFT';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-900 dark:text-slate-100">
        {/* Modal Header */}
        <div className="p-5 sm:px-7 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50 dark:bg-slate-850 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                {offer?.company_name || 'Official Employment Contract'}
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              {isAccepted ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                  ✔ Formally Accepted
                </span>
              ) : isDeclined ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300">
                  Declined
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300 animate-pulse">
                  ⚡ Official Offer Pending Response
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate mt-0.5">
              Appointment Offer: {offer?.job_title || 'Position'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {offer && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handlePrint}
                className="text-xs font-bold flex items-center gap-1.5"
                title="Print or Download as PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Print / Download PDF</span>
              </Button>
            )}

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-5 bg-slate-50/50 dark:bg-slate-900/50">
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successBanner && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successBanner}</span>
            </div>
          )}

          {loading ? (
            <div className="p-16 text-center space-y-3 my-auto">
              <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Retrieving formal appointment contract...</p>
            </div>
          ) : offer ? (
            <div className="space-y-5">
              {/* Offer Summary Highlights Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Monthly Salary
                  </span>
                  <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 block">
                    ৳{Number(offer.offered_salary).toLocaleString()}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Commencement Date
                  </span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 block">
                    {offer.joining_date}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Workplace Arrangement
                  </span>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-1 block">
                    {offer.workplace_type}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Probation Review
                  </span>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-1 block">
                    {offer.probation_period_months > 0 ? `${offer.probation_period_months} Months` : 'Immediate'}
                  </span>
                </div>
              </div>

              {/* Status Banner */}
              {isAccepted && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <strong className="text-emerald-950 dark:text-emerald-200 font-black block">
                        Employment Offer Accepted & Digitally Signed
                      </strong>
                      <span className="text-emerald-800 dark:text-emerald-300 text-[11px]">
                        Accepted on {offer.signed_at ? new Date(offer.signed_at).toLocaleString() : 'Record'}. Your onboarding team will contact you shortly.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Printable Document Container */}
              <div
                ref={printAreaRef}
                className="bg-white text-slate-900 rounded-2xl shadow-sm border border-slate-300 p-6 sm:p-10 max-h-[500px] overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: offer.letter_content_html }}
              />

              {/* Confirmation Action Dialogs */}
              {confirmModal === 'ACCEPT' && (
                <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 space-y-3 text-xs animate-fadeIn">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-black text-sm text-emerald-950 dark:text-emerald-100">
                        Confirm Digital Acceptance of Offer
                      </h4>
                      <p className="text-emerald-800 dark:text-emerald-300 mt-0.5 leading-relaxed">
                        By confirming, you formally accept the terms of employment for <strong>{offer.job_title}</strong> at <strong>{offer.company_name}</strong> with monthly gross remuneration of <strong>৳{Number(offer.offered_salary).toLocaleString()}</strong> commencing on <strong>{offer.joining_date}</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmModal(null)}
                      disabled={submitting}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleRespond('ACCEPTED')}
                      disabled={submitting}
                      className="font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                    >
                      {submitting ? 'Confirming Acceptance...' : 'Yes, Formally Accept Offer'}
                    </Button>
                  </div>
                </div>
              )}

              {confirmModal === 'DECLINE' && (
                <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 space-y-3 text-xs animate-fadeIn">
                  <div className="flex items-start gap-2.5">
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-black text-sm text-rose-950 dark:text-rose-100">
                        Decline Employment Offer
                      </h4>
                      <p className="text-rose-800 dark:text-rose-300 mt-0.5 leading-relaxed">
                        Please provide an optional note for the hiring team explaining your reason for declining (e.g. accepted another offer, timing, compensation):
                      </p>
                    </div>
                  </div>

                  <textarea
                    rows={2}
                    value={declineNotes}
                    onChange={(e) => setDeclineNotes(e.target.value)}
                    placeholder="Optional message to recruiter..."
                    className="w-full p-2.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-rose-500 outline-none resize-none"
                  />

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmModal(null)}
                      disabled={submitting}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleRespond('DECLINED')}
                      disabled={submitting}
                      className="font-bold text-xs shadow-sm"
                    >
                      {submitting ? 'Submitting...' : 'Confirm Decline'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-850 shrink-0">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>

          {isPending && !confirmModal && (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmModal('DECLINE')}
                className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-300 dark:border-rose-800"
              >
                <XCircle className="w-4 h-4 mr-1.5" />
                Decline Offer
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setConfirmModal('ACCEPT')}
                className="font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 px-5 py-2.5 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Accept Offer & Sign Digitally
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
