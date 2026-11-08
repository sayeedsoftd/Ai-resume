import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  MapPin,
  Globe,
  Users,
  ShieldCheck,
  Briefcase,
  ExternalLink,
  Calendar,
  Share2,
  Check,
  ArrowRight,
  Sparkles,
  Laptop,
  DollarSign,
  Award,
  Layers,
  HeartHandshake,
  TrendingUp,
  Coffee,
} from 'lucide-react';
import { companyService } from '../../services/companyService';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import ErrorBoundary from '../../components/ui/ErrorBoundary';

export default function CompanyProfile() {
  const { companyId } = useParams();
  const navigate = useNavigate();

  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadCompany() {
      if (!companyId) return;
      try {
        setLoading(true);
        setError(null);
        const data = await companyService.getPublicCompanyProfile(companyId);
        setCompany(data);
      } catch (err) {
        console.error('Failed to load company profile:', err);
        setError(
          err.response?.data?.detail ||
            'Company profile not found or is currently private.'
        );
      } finally {
        setLoading(false);
      }
    }
    loadCompany();
  }, [companyId]);

  const handleCopyShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
          Loading employer branding profile...
        </p>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4 shadow-sm">
          <Building2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Company Profile Not Found
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">
          {error || "The company you are looking for does not exist or hasn't created a public employer profile yet."}
        </p>
        <div className="flex gap-3">
          <Button onClick={() => navigate(-1)} variant="outline">
            Go Back
          </Button>
          <Link to="/jobs">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
              Browse All Jobs
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Filter company's active jobs
  const activeJobs = company.active_jobs || [];
  const filteredJobs = activeJobs.filter((job) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      job.title?.toLowerCase().includes(term) ||
      job.category?.toLowerCase().includes(term) ||
      job.location?.toLowerCase().includes(term) ||
      (Array.isArray(job.required_skills) &&
        job.required_skills.some((s) => s.toLowerCase().includes(term)))
    );
  });

  return (
    <ErrorBoundary title="Failed to render Company Profile">
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-16">
        {/* Hero Header Banner */}
        <div className="relative bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white pt-10 pb-20 px-4 sm:px-6 lg:px-8 border-b border-indigo-900/40 shadow-xl overflow-hidden">
          {/* Subtle geometric background accents */}
          <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#818cf8_1px,transparent_1px)] [background-size:20px_20px]" />
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-6xl mx-auto relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            {/* Left: Logo & Company Name */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Logo / Avatar */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white dark:bg-slate-850 p-2 shadow-2xl border-2 border-white/20 dark:border-slate-700/80 shrink-0 flex items-center justify-center overflow-hidden">
                {company.company_logo_url ? (
                  <img
                    src={company.company_logo_url}
                    alt={company.company_name}
                    className="w-full h-full object-contain rounded-xl"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center text-white text-3xl font-black shadow-inner">
                    {company.company_name?.[0]?.toUpperCase() || 'C'}
                  </div>
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {company.company_name}
                  </h1>

                  {/* Verified Employer Badge */}
                  {company.trade_license_verified && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 backdrop-blur-sm shadow-sm">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Verified Employer
                    </span>
                  )}
                </div>

                {/* Meta details strip */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm text-indigo-200/90 mt-2">
                  {company.company_location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                      {company.company_location}
                    </span>
                  )}

                  {company.company_website && (
                    <a
                      href={
                        company.company_website.startsWith('http')
                          ? company.company_website
                          : `https://${company.company_website}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-white underline decoration-indigo-400/60 transition-colors"
                    >
                      <Globe className="w-3.5 h-3.5 text-indigo-400" />
                      {company.company_website.replace(/^https?:\/\//, '')}
                      <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
                    </a>
                  )}

                  {company.company_size && (
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      {company.company_size}
                    </span>
                  )}

                  <span className="flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                    {activeJobs.length} Live Openings
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyShare}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs flex items-center gap-1.5 shadow-sm"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Link Copied!
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    Share Brand
                  </>
                )}
              </Button>

              <Link to="/jobs">
                <Button size="sm" variant="secondary" className="bg-white text-indigo-950 hover:bg-indigo-50 text-xs font-bold">
                  Browse All Jobs
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20 space-y-8">
          {/* About Company & Culture Perks Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Mission / About */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  About {company.company_name}
                </h2>

                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {company.company_description ||
                    `${company.company_name} is actively hiring talented professionals. Learn more about our technical vacancies below.`}
                </p>

                {/* Team Culture Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                    <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mb-1.5" />
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Fast-Paced Growth
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Clear pathways for merit-based career advancement.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                    <HeartHandshake className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mb-1.5" />
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Transparent Culture
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Collaborative engineering and engineering-first values.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
                    <Coffee className="w-4 h-4 text-amber-600 dark:text-amber-400 mb-1.5" />
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Competitive Perks
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Modern equipment, health coverage & festival bonuses.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 1 Col: Quick Employer Highlights */}
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Company Snapshot
                </h3>

                <div className="space-y-3.5 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Headquarters</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {company.company_location || 'Not specified'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Team Size</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {company.company_size || 'Startup / Growing'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Verification</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {company.trade_license_verified ? 'Trade License Verified' : 'Standard Recruiter'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Hiring Representative</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {company.recruiter_name}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Active Openings</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {activeJobs.length} Open Requisitions
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Active Openings Section */}
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-indigo-600" />
                  Active Vacancies at {company.company_name}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Explore current positions and apply with your verified AI ATS resume.
                </p>
              </div>

              {activeJobs.length > 3 && (
                <div className="w-full sm:w-64">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search openings..."
                    className="w-full text-xs px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200"
                  />
                </div>
              )}
            </div>

            {filteredJobs.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-10 border border-slate-200/80 dark:border-slate-800 text-center">
                <Briefcase className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {searchTerm ? 'No matching positions found' : 'No Active Job Openings Right Now'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  {searchTerm
                    ? 'Try adjusting your search terms to discover other opportunities.'
                    : `${company.company_name} has no open positions posted currently. Explore other companies on our platform.`}
                </p>
                <Link to="/jobs" className="inline-block mt-4">
                  <Button size="sm" variant="outline" className="text-xs">
                    Browse All Market Vacancies
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredJobs.map((job) => {
                  const salaryText =
                    job.min_salary && job.max_salary
                      ? `৳${job.min_salary.toLocaleString()} - ৳${job.max_salary.toLocaleString()}`
                      : job.salary_range || 'Negotiable';

                  const expText =
                    job.experience_years_required > 0
                      ? `${job.experience_years_required}+ Yrs Exp`
                      : 'Fresher / Any Exp';

                  return (
                    <Card key={job.id} hover className="flex flex-col justify-between space-y-4">
                      <div>
                        {/* Workplace Model & Category */}
                        <div className="flex items-start justify-between gap-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                            <Layers className="w-3 h-3 text-indigo-500" />
                            {job.category || 'Engineering'}
                          </span>

                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              job.workplace_type === 'REMOTE'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : job.workplace_type === 'HYBRID'
                                ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                                : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {job.workplace_type || 'ON_SITE'}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2">
                          {job.title}
                        </h3>

                        {/* Meta Tags */}
                        <div className="flex flex-wrap items-center gap-2 mt-2.5">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                            <DollarSign className="w-3 h-3" />
                            {salaryText}
                          </span>

                          <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded">
                            <Award className="w-3 h-3" />
                            {expText}
                          </span>

                          <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {job.location || 'Remote'}
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 line-clamp-2 leading-relaxed">
                          {job.description}
                        </p>

                        {/* Skills */}
                        {Array.isArray(job.required_skills) && job.required_skills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {job.required_skills.slice(0, 4).map((skill, i) => (
                              <Badge key={i} variant="default" size="xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Footer Apply CTA */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">
                          Job #{job.id} &bull; Active
                        </span>

                        <Link to={`/jobs/${job.id}`}>
                          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm flex items-center gap-1">
                            Apply Now
                            <ArrowRight className="w-3 h-3 ml-0.5" />
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
