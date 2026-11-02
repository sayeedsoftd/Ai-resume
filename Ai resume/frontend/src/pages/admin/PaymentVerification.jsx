import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  AlertTriangle,
  FileText,
  Search,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Copy,
  Check,
  RefreshCw,
  X,
} from 'lucide-react';
import { subscriptionService } from '../../services/subscriptionService';
import { useNotifications } from '../../context/NotificationContext';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';

export default function PaymentVerification() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('PENDING'); // 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedTrxId, setCopiedTrxId] = useState(null);

  // PDF Preview Modal
  const [previewDocUrl, setPreviewDocUrl] = useState(null);
  const [previewDocTitle, setPreviewDocTitle] = useState('');

  // Confirmation / Action Modals
  const [approvingPayment, setApprovingPayment] = useState(null);
  const [rejectingPayment, setRejectingPayment] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const { triggerToast } = useNotifications();

  useEffect(() => {
    loadPayments();
  }, [activeTab]);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const data = await subscriptionService.getAdminPayments(
        activeTab === 'ALL' ? '' : activeTab
      );
      setPayments(data || []);
    } catch (err) {
      console.error('Failed to load payment transactions', err);
      triggerToast({
        id: Date.now(),
        title: 'Error Loading Payments',
        message: 'Could not fetch payments. Please try again.',
        type: 'SYSTEM',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedTrxId(id);
    setTimeout(() => setCopiedTrxId(null), 2000);
  };

  const handleOpenDocPreview = (payment) => {
    let url = payment.kyc_document_url || '';
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      url = `http://127.0.0.1:8000/${url.replace(/^\/+/, '')}`;
    }
    setPreviewDocUrl(url);
    setPreviewDocTitle(`${payment.user?.full_name || 'User'} - KYC Document`);
  };

  const handleApprove = async () => {
    if (!approvingPayment) return;
    setActionLoading(true);
    try {
      await subscriptionService.approvePayment(approvingPayment.id);
      triggerToast({
        id: Date.now(),
        title: 'Recruiter Payment Approved!',
        message: `${approvingPayment.user?.full_name || 'User'} has been promoted to RECRUITER and their subscription is now ACTIVE.`,
        type: 'PAYMENT',
      });
      setApprovingPayment(null);
      loadPayments();
    } catch (err) {
      console.error('Approve failed', err);
      alert(err.response?.data?.detail || 'Failed to approve payment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectingPayment) return;
    if (!rejectionReason.trim()) {
      alert('Please specify a rejection reason for the candidate.');
      return;
    }
    setActionLoading(true);
    try {
      await subscriptionService.rejectPayment(rejectingPayment.id, rejectionReason.trim());
      triggerToast({
        id: Date.now(),
        title: 'Payment Verification Rejected',
        message: `Notification sent to candidate with specified rejection reason.`,
        type: 'PAYMENT',
      });
      setRejectingPayment(null);
      setRejectionReason('');
      loadPayments();
    } catch (err) {
      console.error('Reject failed', err);
      alert(err.response?.data?.detail || 'Failed to reject payment.');
    } finally {
      setActionLoading(false);
    }
  };

  const getMethodBadge = (method) => {
    switch (method) {
      case 'BKASH':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300 border border-pink-200 dark:border-pink-900">
            bKash
          </span>
        );
      case 'NAGAD':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border border-orange-200 dark:border-orange-900">
            Nagad
          </span>
        );
      case 'ROCKET':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-900">
            Rocket
          </span>
        );
      case 'BANK_TRANSFER':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
            Bank Transfer
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
            {method}
          </span>
        );
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-600" /> Rejected
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600 animate-pulse" /> Pending Review
          </span>
        );
    }
  };

  const filteredPayments = payments.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.user?.full_name || '').toLowerCase().includes(q) ||
      (p.user?.email || '').toLowerCase().includes(q) ||
      (p.transaction_id || '').toLowerCase().includes(q) ||
      (p.sender_account || '').toLowerCase().includes(q) ||
      (p.plan_name_snapshot || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2">
          {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map((tabKey) => {
            const labels = {
              PENDING: 'Pending Verification',
              APPROVED: 'Approved History',
              REJECTED: 'Rejected History',
              ALL: 'All Submissions',
            };
            const isCurrent = activeTab === tabKey;
            return (
              <button
                key={tabKey}
                onClick={() => setActiveTab(tabKey)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isCurrent
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {labels[tabKey]}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search user, TrxID, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 w-64"
            />
          </div>

          <button
            onClick={loadPayments}
            className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-xs text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-500" />
            Loading payment verification queue...
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No transactions in this queue
            </h4>
            <p className="text-xs text-slate-500">
              {activeTab === 'PENDING'
                ? 'All recruiter manual payment submissions have been reviewed.'
                : 'No matching payment records found.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Applicant & Email</th>
                  <th className="py-3 px-4">Selected Plan</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Sender Account</th>
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4">Submitted</th>
                  <th className="py-3 px-4">KYC Document</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredPayments.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* User info */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {p.user?.full_name || `User #${p.user_id}`}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {p.user?.email || 'N/A'}
                      </div>
                    </td>

                    {/* Plan */}
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {p.plan_name_snapshot}
                      </span>
                      <div className="text-[10px] text-slate-400">
                        {p.duration_days_snapshot} Days Pass
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 font-black text-slate-900 dark:text-white whitespace-nowrap">
                      {p.paid_amount?.toLocaleString()} BDT
                    </td>

                    {/* Method */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getMethodBadge(p.payment_method)}
                    </td>

                    {/* Sender Account */}
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {p.sender_account}
                    </td>

                    {/* TrxID with copy */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 w-fit">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {p.transaction_id}
                        </span>
                        <button
                          onClick={() => handleCopy(p.transaction_id, p.id)}
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                          title="Copy TrxID"
                        >
                          {copiedTrxId === p.id ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Submitted At */}
                    <td className="py-3.5 px-4 text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(p.created_at).toLocaleDateString()}
                      <div className="text-[10px] text-slate-400">
                        {new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    {/* KYC Document */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {p.kyc_document_url ? (
                        <button
                          onClick={() => handleOpenDocPreview(p)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline bg-indigo-50 dark:bg-indigo-950/60 px-2 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800"
                        >
                          <FileText className="w-3 h-3" />
                          View Document
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">No file</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(p.status)}
                      {p.status === 'REJECTED' && p.rejection_reason && (
                        <div
                          className="text-[10px] text-rose-600 dark:text-rose-400 max-w-[150px] truncate mt-0.5"
                          title={p.rejection_reason}
                        >
                          Note: {p.rejection_reason}
                        </div>
                      )}
                    </td>

                    {/* Moderation Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {p.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setApprovingPayment(p)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Approve
                          </button>
                          <button
                            onClick={() => {
                              setRejectingPayment(p);
                              setRejectionReason('');
                            }}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950 dark:text-rose-300 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-800 transition-colors flex items-center gap-1"
                          >
                            <XCircle className="w-3 h-3" /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          Processed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PDF KYC Document Embedded Preview Modal */}
      {previewDocUrl && (
        <Modal
          isOpen={!!previewDocUrl}
          onClose={() => setPreviewDocUrl(null)}
          title={previewDocTitle || 'KYC Trade License Document'}
          size="xl"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 pb-1 border-b border-slate-100 dark:border-slate-800">
              <span>PDF Inspection Viewer (Trade License / Registration)</span>
              <a
                href={previewDocUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
              >
                Open in new tab <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="w-full h-[600px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
              <iframe
                src={previewDocUrl}
                title="KYC Document Preview"
                className="w-full h-full"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Approve Confirmation Modal */}
      {approvingPayment && (
        <Modal
          isOpen={!!approvingPayment}
          onClose={() => !actionLoading && setApprovingPayment(null)}
          title="Approve Recruiter Payment & Upgrade Role"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-300">
              Are you sure you want to approve this transaction?
            </p>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl space-y-1.5 border border-slate-200 dark:border-slate-700">
              <div>
                <strong>Applicant:</strong> {approvingPayment.user?.full_name} ({approvingPayment.user?.email})
              </div>
              <div>
                <strong>Plan:</strong> {approvingPayment.plan_name_snapshot} ({approvingPayment.duration_days_snapshot} Days)
              </div>
              <div>
                <strong>Amount:</strong> {approvingPayment.paid_amount} BDT via {approvingPayment.payment_method}
              </div>
              <div>
                <strong>Transaction ID:</strong> <span className="font-mono">{approvingPayment.transaction_id}</span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 space-y-1">
              <div className="font-bold">System Actions upon Approval:</div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                <li>Promotes user to <strong>RECRUITER</strong> role.</li>
                <li>Sets subscription status to <strong>ACTIVE</strong> for {approvingPayment.duration_days_snapshot} days.</li>
                <li>Unfreezes any previously frozen job postings.</li>
                <li>Dispatches instant in-app approval notification to the applicant.</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => setApprovingPayment(null)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleApprove}
                disabled={actionLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {actionLoading ? 'Approving...' : 'Confirm Approval & Promote'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Reason Modal */}
      {rejectingPayment && (
        <Modal
          isOpen={!!rejectingPayment}
          onClose={() => !actionLoading && setRejectingPayment(null)}
          title="Reject Payment Verification"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-300">
              Provide a clear reason for rejecting the payment submission for{' '}
              <strong>{rejectingPayment.user?.full_name}</strong>. The applicant will receive this exact explanation in their dashboard and notification center.
            </p>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Rejection Reason (Required)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Invalid Transaction ID, Unmatched sender account number, or illegible trade license document..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => setRejectingPayment(null)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleReject}
                disabled={actionLoading}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
