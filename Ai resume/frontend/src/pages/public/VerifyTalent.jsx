import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Award,
  CheckCircle2,
  Calendar,
  ExternalLink,
  Printer,
  Share2,
  Lock,
  Sparkles,
  Briefcase,
  AlertTriangle,
  Copy,
  Check,
  QrCode,
  Building2,
  BadgeCheck,
} from 'lucide-react';
import { badgeService } from '../../services/badgeService';
import Button from '../../components/ui/Button';

export default function VerifyTalent() {
  const { badgeId } = useParams();
  const [badgeData, setBadgeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function verifyCredential() {
      if (!badgeId) return;
      try {
        setLoading(true);
        setError(null);
        const data = await badgeService.getPublicBadgeVerification(badgeId);
        setBadgeData(data);
      } catch (err) {
        console.error('Verification error:', err);
        setError(
          err.response?.data?.detail ||
            'Credential verification failed. The requested badge ID does not exist, has expired, or was revoked.'
        );
      } finally {
        setLoading(false);
      }
    }
    verifyCredential();
  }, [badgeId]);

  const liveUrl = window.location.href;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(liveUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleLinkedInShare = () => {
    if (!badgeData) return;
    const certName = `${badgeData.assessment_track} - Top Performer`;
    const orgName = 'ResumeAI Match';
    const issueDate = new Date(badgeData.issued_at);
    const year = issueDate.getFullYear();
    const month = issueDate.getMonth() + 1;

    const linkedInUrl = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(
      certName
    )}&organizationName=${encodeURIComponent(
      orgName
    )}&issueYear=${year}&issueMonth=${month}&certUrl=${encodeURIComponent(
      liveUrl
    )}&certId=${encodeURIComponent(badgeData.badge_id)}`;

    window.open(linkedInUrl, '_blank', 'noopener,noreferrer');
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-center">
            <h2 className="text-lg font-bold">Verifying Credential with Cryptographic Authority...</h2>
            <p className="text-xs text-slate-400 mt-1">Inspecting HMAC-SHA256 signature for {badgeId}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !badgeData) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-rose-800/80 rounded-3xl p-8 text-center space-y-5 shadow-2xl shadow-rose-950/40">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Credential Verification Failed</h2>
            <p className="text-xs text-rose-300 mt-2 leading-relaxed">{error}</p>
          </div>
          <div className="pt-2">
            <Link to="/">
              <Button variant="outline" className="text-xs border-slate-700 text-slate-300 hover:bg-slate-800">
                Return to ResumeAI Match Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const issuedDateFormatted = new Date(badgeData.issued_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8 selection:bg-indigo-500 selection:text-white">
      {/* Print-specific style overrides */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print-certificate-container {
            border: 8px double #4338ca !important;
            padding: 2.5rem !important;
            background: white !important;
            color: #0f172a !important;
            box-shadow: none !important;
          }
          .print-text-dark { color: #0f172a !important; }
          .print-subtext { color: #475569 !important; }
        }
      `}</style>

      {/* Top Navigation Bar */}
      <div className="max-w-4xl mx-auto mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 no-print">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-white">ResumeAI Match</span>
            <span className="block text-[10px] text-indigo-400 font-semibold tracking-wider uppercase">
              Official Credential Registry
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopyLink}
            className="text-xs border-slate-800 hover:bg-slate-900 text-slate-300 flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Link Copied!' : 'Copy Verification Link'}
          </Button>

          <Button
            size="sm"
            onClick={handleLinkedInShare}
            className="text-xs bg-[#0A66C2] hover:bg-[#084e96] text-white flex items-center gap-1.5 font-semibold"
          >
            <Share2 className="w-3.5 h-3.5" />
            Add to LinkedIn
          </Button>

          <Button
            size="sm"
            onClick={handlePrint}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 font-semibold"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Certificate
          </Button>
        </div>
      </div>

      {/* Main Official Certificate Card */}
      <div className="max-w-4xl mx-auto bg-gradient-to-b from-slate-900 to-slate-950 border border-indigo-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-indigo-950/60 relative overflow-hidden print-certificate-container">
        {/* Decorative background glow */}
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Verification Status Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                  AUTHENTIC & VERIFIED
                </span>
                <span className="text-xs text-slate-400 font-mono">ID: {badgeData.badge_id}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-indigo-400" />
                Cryptographically authenticated by ResumeAI Match Verification Authority
              </p>
            </div>
          </div>

          <div className="text-right sm:border-l sm:border-slate-800 sm:pl-6">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Assessment Date</span>
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5 sm:justify-end mt-0.5 print-text-dark">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              {issuedDateFormatted}
            </span>
          </div>
        </div>

        {/* Certificate Core Content */}
        <div className="py-10 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
            <Award className="w-4 h-4 text-indigo-400" />
            Verified Talent Assessment Certificate
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-slate-400 print-subtext">This certifies that</p>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight print-text-dark">
              {badgeData.candidate_name}
            </h1>
            <p className="text-xs text-indigo-300 font-medium">{badgeData.candidate_headline}</p>
          </div>

          <p className="max-w-xl mx-auto text-xs sm:text-sm text-slate-300 leading-relaxed print-subtext">
            has demonstrated exceptional technical competence and problem-solving excellence in the proctored
            assessment track for:
          </p>

          <div className="inline-block p-4 sm:px-8 bg-slate-800/80 border border-indigo-500/40 rounded-2xl shadow-xl">
            <h2 className="text-xl sm:text-2xl font-bold text-white print-text-dark">
              {badgeData.assessment_track}
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-3 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/30">
                <CheckCircle2 className="w-4 h-4" />
                Score: {badgeData.score_achieved}%
              </div>
              <div className="flex items-center gap-1.5 font-bold text-indigo-300 bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/30">
                <Award className="w-4 h-4 text-amber-400" />
                Percentile: Top {Math.max(1, 100 - Math.round(badgeData.percentile_rank))}% Talent
              </div>
            </div>
          </div>
        </div>

        {/* Verified Technical Skills Breakdown */}
        <div className="py-6 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 print-text-dark">
              <BadgeCheck className="w-4 h-4 text-indigo-400" />
              Verified Competencies & Skills
            </h3>
            <span className="text-[11px] text-slate-500">Evaluated via Standardized Multi-Stage Testing</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(badgeData.verified_skills || []).map((skill, idx) => (
              <span
                key={idx}
                className="px-3 py-1 rounded-xl bg-slate-800/90 border border-slate-700/80 text-xs font-semibold text-slate-200 flex items-center gap-1.5 print-text-dark"
              >
                <Check className="w-3 h-3 text-emerald-400" />
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Footer: Cryptographic Signature & Dynamic QR Code */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Left: Cryptographic Checksum */}
          <div className="space-y-2 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-slate-400">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold text-slate-300 print-text-dark">Cryptographic Verification Signature:</span>
            </div>
            <p className="font-mono text-[10px] text-slate-400 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 break-all max-w-md">
              {badgeData.verification_token}
            </p>
            <p className="text-[10px] text-slate-500">
              Issuer: {badgeData.issuer} &bull; Tamper-Evident Hash Checksum
            </p>
          </div>

          {/* Right: Dynamic QR Code */}
          <div className="flex items-center gap-3.5 bg-slate-950/80 p-3 rounded-2xl border border-slate-800 shrink-0">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(liveUrl)}`}
              alt="Verification QR Code"
              className="w-20 h-20 rounded-xl bg-white p-1 border border-slate-700"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div className="text-left space-y-1">
              <span className="text-[10px] font-bold text-slate-300 block uppercase tracking-wider print-text-dark">
                Scan to Verify
              </span>
              <p className="text-[9px] text-slate-400 leading-tight max-w-[110px]">
                Instant real-time verification for printed CVs and portfolios.
              </p>
              <span className="text-[9px] font-mono text-indigo-400 block truncate max-w-[110px]">
                {badgeData.badge_id}
              </span>
            </div>
          </div>
        </div>

        {/* Recruiter Action Strip */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 no-print bg-indigo-950/30 -mx-6 sm:-mx-10 -mb-6 sm:-mb-10 p-6 sm:px-10 rounded-b-3xl">
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-indigo-400" />
              Are you a Recruiter or Hiring Manager?
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Connect with this pre-screened, verified top performer for technical vacancies.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/jobs">
              <Button size="sm" variant="outline" className="text-xs border-indigo-500/40 text-indigo-300 hover:bg-indigo-900/40">
                Explore Vacancies
              </Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Hire Verified Talent
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
