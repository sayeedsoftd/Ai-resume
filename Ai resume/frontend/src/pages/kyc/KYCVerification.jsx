import React, { useState, useEffect } from 'react';
import { kycService } from '../../services/kycService';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import {
  ShieldCheck,
  Upload,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Camera,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

const KYCVerification = () => {
  const { user, isVerified, refreshUser } = useAuth();
  const [realName, setRealName] = useState(user?.full_name || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [nidFile, setNidFile] = useState(null);
  const [nidPreview, setNidPreview] = useState('');
  const [selfieFile, setSelfieFile] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [forceResubmit, setForceResubmit] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await kycService.getMyKYCHistory();
      setHistory(data);
    } catch (err) {
      console.error('Error fetching KYC history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleNidChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNidFile(file);
      if (file.type.startsWith('image/')) {
        setNidPreview(URL.createObjectURL(file));
      } else {
        setNidPreview('pdf');
      }
    }
  };

  const handleSelfieChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelfieFile(file);
      setSelfiePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nidFile || !selfieFile) {
      setMsg({ text: 'Please attach both your National ID and Selfie photo.', type: 'error' });
      return;
    }

    setSubmitting(true);
    setMsg({ text: '', type: '' });
    try {
      await kycService.submitKYC(realName, phoneNumber, nidFile, selfieFile);
      setMsg({
        text: 'KYC documents submitted successfully! Admin review is in progress.',
        type: 'success',
      });
      setNidFile(null);
      setNidPreview('');
      setSelfieFile(null);
      setSelfiePreview('');
      setForceResubmit(false);
      await loadHistory();
      refreshUser();
    } catch (err) {
      setMsg({
        text: err.response?.data?.detail || 'Failed to submit KYC verification.',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const latestKYC = history[0];
  const isApproved = isVerified || latestKYC?.status === 'APPROVED';
  const isPending = !isApproved && latestKYC?.status === 'PENDING';
  const isRejected = !isApproved && !isPending && latestKYC?.status === 'REJECTED';

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Page Title & Intro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Identity & KYC Verification Portal
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Verify candidate authenticity with Government NID and selfie biometrics to unlock the Verified Badge.
          </p>
        </div>

        {/* Dynamic Status Badge */}
        <div>
          {isApproved ? (
            <Badge variant="verified" size="md" className="gap-1.5 py-1 px-3">
              <ShieldCheck className="w-4 h-4 text-blue-500" /> Identity Verified
            </Badge>
          ) : isPending ? (
            <Badge variant="warning" size="md" className="gap-1.5 py-1 px-3">
              <Clock className="w-4 h-4 text-amber-500" /> Review Pending
            </Badge>
          ) : isRejected ? (
            <Badge variant="danger" size="md" className="gap-1.5 py-1 px-3">
              <XCircle className="w-4 h-4 text-rose-500" /> Verification Rejected
            </Badge>
          ) : (
            <Badge variant="default" size="md" className="gap-1.5 py-1 px-3">
              Unverified Candidate
            </Badge>
          )}
        </div>
      </div>

      {/* Upgrade Benefit Pitch */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/5 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/40 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-md">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Upgrade to Subscriber Tier with Verified Badge
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Verified candidates gain 3x higher recruiter visibility, priority job application reviews, and access to recruiter listing features.
            </p>
          </div>
        </div>
      </div>

      {msg.text && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold ${
            msg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* STATE 1: APPROVED STATUS */}
      {isApproved && (
        <Card className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 p-6 flex flex-col sm:flex-row items-center gap-4">
          <div className="p-3.5 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-2xl">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-emerald-950 dark:text-emerald-200 text-base">
              Account Successfully Verified
            </h3>
            <p className="text-xs text-emerald-800 dark:text-emerald-300">
              Your official identity documents have been approved by administration. Your profile is upgraded to <strong>SUBSCRIBER</strong> and proudly features the official Verified Badge.
            </p>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 pt-1">
              Reviewed on: {latestKYC?.reviewed_at ? new Date(latestKYC.reviewed_at).toLocaleDateString() : 'Active'}
            </p>
          </div>
        </Card>
      )}

      {/* STATE 2: PENDING REVIEW */}
      {isPending && !forceResubmit && (
        <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 p-6 flex flex-col sm:flex-row items-center gap-4">
          <div className="p-3.5 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 rounded-2xl">
            <Clock className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-amber-950 dark:text-amber-200 text-base">
              Verification Request Under Review
            </h3>
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Your documents submitted on {new Date(latestKYC.created_at).toLocaleDateString()} are currently being audited by our verification team. Reviews typically complete within 24 hours.
            </p>
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 inline-block pt-1">
              Submission ID: #{latestKYC.id} &bull; Legal Name: {latestKYC.real_name}
            </span>
          </div>
        </Card>
      )}

      {/* STATE 3: REJECTED NOTIFICATION */}
      {isRejected && !forceResubmit && (
        <Card className="bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 p-6 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300 rounded-xl">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-rose-950 dark:text-rose-200 text-base">
                Verification Request Was Rejected
              </h3>
              <p className="text-xs text-rose-800 dark:text-rose-300">
                Reason: {latestKYC.rejection_reason || 'Document resolution unclear or identity mismatch.'}
              </p>
            </div>
          </div>
          <div className="pt-2">
            <Button variant="primary" size="sm" onClick={() => setForceResubmit(true)}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Re-submit Verification Documents
            </Button>
          </div>
        </Card>
      )}

      {/* STATE 4: SUBMISSION FORM (When not approved and not pending, or when resubmitting) */}
      {(!isApproved && !isPending) || forceResubmit ? (
        <Card className="space-y-6">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Document Submission Form
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Please ensure your name matches your government ID exactly.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Legal Real Name"
                required
                value={realName}
                onChange={(e) => setRealName(e.target.value)}
                placeholder="Matches Government NID / Passport"
              />
              <Input
                label="WhatsApp / Phone Number"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+880 1712-345678"
              />
            </div>

            {/* Document Uploads Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              {/* 1. National ID Upload Box */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  1. Government NID / Passport (Image or PDF)
                </label>
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors bg-slate-50/50 dark:bg-slate-800/40">
                  {nidPreview && nidPreview !== 'pdf' ? (
                    <div className="relative mb-3">
                      <img
                        src={nidPreview}
                        alt="NID Preview"
                        className="w-full h-36 object-contain rounded-lg"
                      />
                    </div>
                  ) : nidPreview === 'pdf' ? (
                    <div className="py-6 text-indigo-600 dark:text-indigo-400">
                      <FileText className="w-12 h-12 mx-auto mb-1" />
                      <span className="text-xs font-bold">PDF Document Selected</span>
                    </div>
                  ) : (
                    <div className="py-6 text-slate-400">
                      <Upload className="w-10 h-10 mx-auto mb-2 opacity-60" />
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        Click to select NID front/back document
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">PNG, JPG, PDF up to 10MB</p>
                    </div>
                  )}

                  <input
                    type="file"
                    required
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleNidChange}
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-950 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100"
                  />
                </div>
              </div>

              {/* 2. Selfie Upload Box */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  2. Clear Selfie Portrait (Face Clearly Visible)
                </label>
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors bg-slate-50/50 dark:bg-slate-800/40">
                  {selfiePreview ? (
                    <div className="relative mb-3">
                      <img
                        src={selfiePreview}
                        alt="Selfie Preview"
                        className="w-full h-36 object-contain rounded-lg"
                      />
                    </div>
                  ) : (
                    <div className="py-6 text-slate-400">
                      <Camera className="w-10 h-10 mx-auto mb-2 opacity-60" />
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        Take or upload a real-time selfie
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">Portrait facing camera directly</p>
                    </div>
                  )}

                  <input
                    type="file"
                    required
                    accept="image/*"
                    onChange={handleSelfieChange}
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-950 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              {forceResubmit && (
                <Button variant="secondary" onClick={() => setForceResubmit(false)}>
                  Cancel
                </Button>
              )}
              <Button type="submit" variant="primary" loading={submitting} size="lg">
                <Upload className="w-4 h-4 mr-2" /> Submit for Verification
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {/* Verification History Section */}
      {history.length > 0 && (
        <Card className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Submission Audit Log ({history.length})
          </h3>
          <div className="space-y-2">
            {history.map((record) => (
              <div
                key={record.id}
                className="p-3.5 border border-slate-200/80 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs bg-slate-50/40 dark:bg-slate-800/40"
              >
                <div>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {record.real_name}
                  </span>
                  <span className="text-slate-400 mx-2">&bull;</span>
                  <span className="text-slate-500 dark:text-slate-400 font-mono">
                    {record.phone_number}
                  </span>
                  <span className="text-slate-400 mx-2">&bull;</span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {new Date(record.created_at).toLocaleDateString()}
                  </span>
                  {record.rejection_reason && (
                    <p className="text-rose-600 dark:text-rose-400 font-medium text-[11px] mt-1">
                      Rejection Note: {record.rejection_reason}
                    </p>
                  )}
                </div>

                <Badge
                  variant={
                    record.status === 'APPROVED'
                      ? 'success'
                      : record.status === 'REJECTED'
                      ? 'danger'
                      : 'warning'
                  }
                  size="sm"
                >
                  {record.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default KYCVerification;
