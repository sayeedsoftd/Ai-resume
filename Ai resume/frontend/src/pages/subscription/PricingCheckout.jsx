import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  CheckCircle2,
  Copy,
  Check,
  Upload,
  AlertCircle,
  Clock,
  Sparkles,
  ShieldCheck,
  CreditCard,
  Building,
  ArrowRight,
  FileText,
  Lock,
} from 'lucide-react';
import { subscriptionService } from '../../services/subscriptionService';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

export default function PricingCheckout() {
  const { user, isAuthenticated } = useAuth();
  const { triggerToast } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  // State
  const [plans, setPlans] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState(null);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState('BKASH'); // 'BKASH' | 'NAGAD' | 'ROCKET' | 'BANK_TRANSFER'
  const [copiedField, setCopiedField] = useState('');
  const [senderAccount, setSenderAccount] = useState('');
  const [trxId, setTrxId] = useState('');
  const [kycFile, setKycFile] = useState(null);
  const [kycFileName, setKycFileName] = useState('');
  const [fileError, setFileError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mySubscription, setMySubscription] = useState(null);

  useEffect(() => {
    loadData();
  }, [isAuthenticated]);

  // Extract query param ?plan=
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const planParam = params.get('plan');
    if (planParam && plans.length > 0) {
      const match = plans.find((p) => String(p.id) === String(planParam));
      if (match) setSelectedPlanId(match.id);
    }
  }, [location.search, plans]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [plansData, methodsData] = await Promise.all([
        subscriptionService.getPlans(),
        subscriptionService.getPaymentMethods(),
      ]);
      setPlans(plansData);
      if (plansData.length > 0 && !selectedPlanId) {
        setSelectedPlanId(plansData[0].id);
      }
      setPaymentMethods(methodsData);

      if (isAuthenticated) {
        try {
          const subData = await subscriptionService.getMySubscription();
          setMySubscription(subData);
        } catch (e) {
          console.error('Failed to fetch user subscription', e);
        }
      }
    } catch (err) {
      console.error('Failed to load pricing data', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[0];

  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(''), 2500);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFileError('');
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setFileError('Invalid file format. Please upload a PDF document (.pdf).');
      setKycFile(null);
      setKycFileName('');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFileError('File size exceeds the 10MB limit.');
      setKycFile(null);
      setKycFileName('');
      return;
    }

    setKycFile(file);
    setKycFileName(file.name);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate(`/login?redirect=/pricing&plan=${selectedPlanId}`);
      return;
    }

    if (!senderAccount.trim()) {
      alert('Please provide your sender account / phone number.');
      return;
    }
    if (!trxId.trim()) {
      alert('Please provide the Transaction ID (TrxID).');
      return;
    }
    if (!kycFile) {
      alert('Please upload your business legal verification document (PDF trade license / company registration).');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('plan_id', selectedPlan.id);
      formData.append('payment_method', selectedMethod);
      formData.append('sender_account', senderAccount.trim());
      formData.append('trx_id', trxId.trim());
      formData.append('paid_amount', selectedPlan.price_bdt);
      formData.append('kyc_document', kycFile);

      const res = await subscriptionService.submitPayment(formData);

      triggerToast({
        id: Date.now(),
        title: 'Payment Submitted!',
        message: 'Your payment verification and business KYC have been routed to the Super Admin.',
        type: 'PAYMENT',
      });

      // Reload subscription status
      const subData = await subscriptionService.getMySubscription();
      setMySubscription(subData);

      // Clear form inputs
      setSenderAccount('');
      setTrxId('');
      setKycFile(null);
      setKycFileName('');
    } catch (err) {
      console.error('Submit payment error', err);
      const detail = err.response?.data?.detail || 'Failed to submit payment verification.';
      alert(detail);
    } finally {
      setSubmitting(false);
    }
  };

  const getReceiverDetails = () => {
    if (!paymentMethods) return null;
    switch (selectedMethod) {
      case 'BKASH':
        return {
          title: 'bKash Merchant / Personal Account',
          number: paymentMethods.bkash_number,
          type: 'Personal / Send Money',
          instructions: 'Send Money to the bKash number below using the reference "RecruiterPlan", then copy the TrxID.',
        };
      case 'NAGAD':
        return {
          title: 'Nagad Personal Account',
          number: paymentMethods.nagad_number,
          type: 'Personal / Send Money',
          instructions: 'Send Money to the Nagad number below, then copy the 8-digit transaction identifier.',
        };
      case 'ROCKET':
        return {
          title: 'DBBL Rocket Account',
          number: paymentMethods.rocket_number,
          type: 'Personal / Pay Bill',
          instructions: 'Send Money / Pay Bill to the Rocket wallet address below, then record the TrxID.',
        };
      case 'BANK_TRANSFER':
        return {
          title: 'Direct Bank Electronic Transfer',
          isBank: true,
          bankName: paymentMethods.bank_name,
          accountName: paymentMethods.bank_account_name,
          accountNumber: paymentMethods.bank_account_number,
          routingNumber: paymentMethods.bank_routing,
          instructions: 'Deposit or BEFTN/NPSB transfer to the corporate bank credentials below. Include your company name in the deposit remark.',
        };
      default:
        return null;
    }
  };

  const receiver = getReceiverDetails();

  return (
    <div className="max-w-6xl mx-auto space-y-10 py-6 px-4 sm:px-6">
      {/* Header Section */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-indigo-700 dark:text-indigo-300">
          <Sparkles className="w-3.5 h-3.5" /> Recruiter Tier & Job Publishing Passes
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Flexible Pricing for <br />
          <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">
            High-Performance Hiring
          </span>
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
          Unlock automated ATS scoring, publish unlimited job requisitions, design custom Stage-2 assessments,
          and conduct seamless candidate interviews.
        </p>
      </div>

      {/* User Current Subscription Status Banner */}
      {mySubscription && mySubscription.subscription_status === 'PENDING' && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 animate-spin" />
          <div className="space-y-1 text-xs text-amber-900 dark:text-amber-200">
            <h4 className="font-bold text-sm">Your Recruiter Verification is Pending Review</h4>
            <p>
              Our Super Admin moderation team is validating your submitted transaction details and business KYC document.
              You will receive an instant in-app notification once your Recruiter badge is activated.
            </p>
          </div>
        </div>
      )}

      {mySubscription && mySubscription.subscription_status === 'ACTIVE' && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs text-emerald-900 dark:text-emerald-200">
              <h4 className="font-bold text-sm">
                Active Recruiter Tier: {mySubscription.active_plan_name || 'Standard Pass'}
              </h4>
              <p>
                Your subscription is active with <strong>{mySubscription.days_left ?? 0} days remaining</strong> (expires{' '}
                {mySubscription.subscription_expires_at ? new Date(mySubscription.subscription_expires_at).toLocaleDateString() : 'N/A'}).
              </p>
            </div>
          </div>
          <Link to="/recruiter">
            <Button size="sm" variant="primary" className="text-xs">
              Open Recruiter Dashboard
            </Button>
          </Link>
        </div>
      )}

      {mySubscription && mySubscription.rejection_reason && mySubscription.subscription_status === 'REJECTED' && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs text-rose-900 dark:text-rose-200">
            <h4 className="font-bold text-sm">Previous Verification Rejected</h4>
            <p>
              <strong>Reason from Super Admin:</strong> {mySubscription.rejection_reason}
            </p>
            <p className="text-[11px] text-rose-700 dark:text-rose-300">
              Please review the credentials below and resubmit your payment transaction with valid trade license documents.
            </p>
          </div>
        </div>
      )}

      {/* Plan Cards Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 text-center py-12 text-sm text-slate-500">
            Loading active recruiter plans...
          </div>
        ) : plans.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-sm text-slate-500">
            No active subscription plans available at this time.
          </div>
        ) : (
          plans.map((plan, index) => {
            const isSelected = selectedPlan?.id === plan.id;
            const isPopular = index === 1; // Highlight middle plan

            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                className={`cursor-pointer relative rounded-2xl p-6 transition-all duration-200 flex flex-col justify-between ${
                  isSelected
                    ? 'bg-white dark:bg-slate-900 border-2 border-indigo-600 shadow-xl ring-2 ring-indigo-500/20'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                }`}
              >
                {isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm">
                    Most Popular
                  </span>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {plan.name}
                    </h3>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 min-h-[36px]">
                    {plan.description || 'Full recruiter hiring capabilities with Stage-2 assessments.'}
                  </p>

                  <div className="pt-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-slate-900 dark:text-white">
                        {plan.price_bdt.toLocaleString()}
                      </span>
                      <span className="text-sm font-bold text-slate-500">BDT</span>
                      <span className="text-xs text-slate-400">/ {plan.duration_days} Days</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{plan.duration_days} Days Full Recruiter Tier</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>AI Candidate Screening Benchmark</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Stage-2 Custom Tests (10 MCQs + 5 Written)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Direct Formal Interview Scheduler</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <Button
                    variant={isSelected ? 'primary' : 'outline'}
                    size="sm"
                    className="w-full text-xs font-bold"
                  >
                    {isSelected ? 'Plan Selected' : 'Choose This Plan'}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Checkout & Verification Form Section */}
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left: Payment Guide & Credentials (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="p-6 space-y-5 border-indigo-100 dark:border-indigo-950">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" /> Payment Instructions
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Select your preferred transfer channel and send exact amount.
              </p>
            </div>

            {/* Payment Method Tabs */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'BKASH', label: 'bKash', color: 'text-pink-600' },
                { id: 'NAGAD', label: 'Nagad', color: 'text-orange-600' },
                { id: 'ROCKET', label: 'Rocket', color: 'text-purple-600' },
                { id: 'BANK_TRANSFER', label: 'Bank Transfer', color: 'text-blue-600' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMethod(m.id)}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                    selectedMethod === m.id
                      ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <span className={m.color}>•</span> {m.label}
                </button>
              ))}
            </div>

            {/* Receiver Credentials Guide Box */}
            {receiver && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  {receiver.title}
                </span>

                {!receiver.isBank ? (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <span className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                      {receiver.number}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(receiver.number, 'receiver_number')}
                      className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      title="Copy Number"
                    >
                      {copiedField === 'receiver_number' ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-slate-400">Bank:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{receiver.bankName}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-slate-400">Account Name:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{receiver.accountName}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-slate-400">Account No:</span>
                      <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900 dark:text-white">
                        <span>{receiver.accountNumber}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(receiver.accountNumber, 'acc_num')}
                          className="text-slate-400 hover:text-indigo-600"
                        >
                          {copiedField === 'acc_num' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-400">Routing No:</span>
                      <span className="font-mono text-slate-900 dark:text-white">{receiver.routingNumber}</span>
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {receiver.instructions}
                </p>
              </div>
            )}

            <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-[11px] text-indigo-900 dark:text-indigo-300 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <span>
                Super Admin reviews every transaction within 1-2 hours during business hours. Your company trade license
                is kept confidential and strictly used for compliance.
              </span>
            </div>
          </Card>
        </div>

        {/* Right: Submission Form (7 cols) */}
        <div className="lg:col-span-7">
          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building className="w-5 h-5 text-indigo-600" /> Payment & KYC Submission
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Enter your payment transaction receipt details and company verification document.
                </p>
              </div>

              {/* Selected Plan Summary Banner */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Target Plan</span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {selectedPlan?.name || 'Recruiter Plan'} ({selectedPlan?.duration_days} Days)
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Due</span>
                  <p className="text-base font-black text-indigo-600 dark:text-indigo-400">
                    {selectedPlan?.price_bdt.toLocaleString()} BDT
                  </p>
                </div>
              </div>

              {/* Plan Selector Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Change Plan Tier:
                </label>
                <select
                  value={selectedPlanId || ''}
                  onChange={(e) => setSelectedPlanId(Number(e.target.value))}
                  className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.price_bdt.toLocaleString()} BDT ({p.duration_days} Days)
                    </option>
                  ))}
                </select>
              </div>

              {/* Sender Account Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Sender Mobile Wallet / Bank Account Number: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 017XXXXXXXX or Account Name"
                  value={senderAccount}
                  onChange={(e) => setSenderAccount(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  The account number or phone number you transferred the payment from.
                </span>
              </div>

              {/* Transaction ID Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Transaction ID (TrxID) / Deposit Reference: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9K34M781OP"
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value)}
                  className="w-full text-xs font-mono font-bold p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none uppercase"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Copy the exact TrxID received from bKash, Nagad, Rocket, or your bank confirmation slip.
                </span>
              </div>

              {/* Company Verification Document Upload (Strictly PDF) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Upload Company Legal Verification Document (Trade License / Tax PDF): <span className="text-rose-500">*</span>
                </label>

                <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-5 text-center hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors bg-slate-50/50 dark:bg-slate-850/50">
                  <input
                    type="file"
                    required
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="space-y-2 pointer-events-none">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    {kycFileName ? (
                      <div>
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> {kycFileName}
                        </p>
                        <p className="text-[10px] text-slate-400">Click to change document</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                          Click or drag and drop Trade License PDF
                        </p>
                        <p className="text-[10px] text-slate-400">PDF files only (maximum 10MB)</p>
                      </div>
                    )}
                  </div>
                </div>

                {fileError && (
                  <p className="text-xs text-rose-500 font-semibold mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {fileError}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                {!isAuthenticated ? (
                  <Link to={`/login?redirect=/pricing&plan=${selectedPlanId}`}>
                    <Button variant="primary" size="lg" className="w-full text-xs font-bold shadow-md shadow-indigo-500/20">
                      Sign In to Submit Verification <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </Link>
                ) : (
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={submitting}
                    className="w-full text-xs font-bold shadow-md shadow-indigo-500/20"
                  >
                    {submitting ? (
                      <>
                        <Clock className="w-4 h-4 animate-spin mr-2" />
                        Submitting for Super Admin Review...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 mr-1.5" />
                        Submit for Super Admin Verification
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
