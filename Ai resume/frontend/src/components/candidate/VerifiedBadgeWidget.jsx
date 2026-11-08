import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  ShieldCheck,
  CheckCircle2,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Printer,
  Sparkles,
  Lock,
  ChevronRight,
  RefreshCw,
  QrCode,
} from 'lucide-react';
import { badgeService } from '../../services/badgeService';
import Button from '../ui/Button';

export default function VerifiedBadgeWidget() {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [claiming, setClaiming] = useState(false);

  const fetchBadges = async () => {
    try {
      setLoading(true);
      const data = await badgeService.getCandidateBadges();
      setBadges(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Could not load candidate verified badges', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBadges();
  }, []);

  const handleCopy = (badgeId) => {
    const url = `${window.location.origin}/verify-talent/${badgeId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(badgeId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleLinkedInShare = (badge) => {
    const certName = `${badge.skill_domain} - Top Performer`;
    const orgName = 'ResumeAI Match';
    const issueDate = new Date(badge.issued_at);
    const year = issueDate.getFullYear();
    const month = issueDate.getMonth() + 1;
    const certUrl = `${window.location.origin}/verify-talent/${badge.badge_id}`;

    const linkedInUrl = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(
      certName
    )}&organizationName=${encodeURIComponent(
      orgName
    )}&issueYear=${year}&issueMonth=${month}&certUrl=${encodeURIComponent(
      certUrl
    )}&certId=${encodeURIComponent(badge.badge_id)}`;

    window.open(linkedInUrl, '_blank', 'noopener,noreferrer');
  };

  const handleClaimDemoBadge = async () => {
    try {
      setClaiming(true);
      const newBadge = await badgeService.claimSampleBadge();
      if (newBadge) {
        await fetchBadges();
      }
    } catch (err) {
      console.error('Failed to claim demo badge', err);
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 text-xs text-slate-400 flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
        Checking cryptographic verified badge registry...
      </div>
    );
  }

  // Case 1: No badges earned yet
  if (!badges || badges.length === 0) {
    return (
      <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 rounded-2xl border border-indigo-500/20 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Unlock Your Verified Talent Badge
              <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                Score &ge; 80%
              </span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Complete any technical pre-application screening or job assessment with 80%+ to generate an official cryptographically verified credential and shareable public portfolio seal.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link to="/jobs">
            <Button size="sm" variant="outline" className="text-xs border-indigo-500/40 text-indigo-300 hover:bg-indigo-900/40">
              Browse Jobs & Exams
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={handleClaimDemoBadge}
            disabled={claiming}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {claiming ? 'Issuing...' : 'Claim Demo Badge'}
          </Button>
        </div>
      </div>
    );
  }

  // Case 2: Candidate has earned one or more verified badges
  return (
    <div className="space-y-4">
      {badges.map((badge) => {
        const publicUrl = `${window.location.origin}/verify-talent/${badge.badge_id}`;
        const isCopied = copiedId === badge.badge_id;
        const issuedFormatted = new Date(badge.issued_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });

        return (
          <div
            key={badge.id}
            className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border-2 border-indigo-500/50 shadow-xl shadow-indigo-950/40"
          >
            {/* Ambient glowing orbs */}
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* Left Column: Badge Seal & Details */}
              <div className="flex items-start gap-4">
                <div className="relative shrink-0">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 p-0.5 shadow-lg shadow-indigo-500/25">
                    <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-amber-400">
                      <Award className="w-7 h-7" />
                    </div>
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center text-white">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-300 bg-emerald-500/15 border border-emerald-500/40 px-2.5 py-0.5 rounded-full shadow-sm">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Verified Talent Badge &bull; Top Performer
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">{badge.badge_id}</span>
                  </div>

                  <h3 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                    {badge.skill_domain}
                  </h3>

                  <p className="text-xs text-indigo-200 flex flex-wrap items-center gap-x-3 gap-y-1 font-medium">
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Score: {badge.score_achieved}%
                    </span>
                    <span className="text-slate-500">&bull;</span>
                    <span className="text-amber-300 font-semibold">
                      Percentile: Top {Math.max(1, 100 - Math.round(badge.percentile_rank))}%
                    </span>
                    <span className="text-slate-500">&bull;</span>
                    <span className="text-slate-400 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-indigo-400" />
                      Cryptographically Verified by ResumeAI Match
                    </span>
                    <span className="text-slate-500">&bull;</span>
                    <span className="text-slate-400">Issued {issuedFormatted}</span>
                  </p>

                  {/* Skills Pills */}
                  {badge.verified_skills && badge.verified_skills.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-1.5">
                      {badge.verified_skills.slice(0, 6).map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-0.5 text-[10px] font-semibold rounded-lg bg-slate-800/90 text-slate-300 border border-slate-700/80"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Actions */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy(badge.badge_id)}
                  className="text-xs border-slate-700 hover:bg-slate-800 text-slate-200 flex items-center gap-1.5 font-semibold"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {isCopied ? 'Link Copied!' : 'Copy Verification Link'}
                </Button>

                <Button
                  size="sm"
                  onClick={() => handleLinkedInShare(badge)}
                  className="text-xs bg-[#0A66C2] hover:bg-[#084e96] text-white flex items-center gap-1.5 font-semibold shadow-md"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Add to LinkedIn
                </Button>

                <Link to={`/verify-talent/${badge.badge_id}`} target="_blank" rel="noopener noreferrer">
                  <Button
                    size="sm"
                    className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Public Certificate
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
