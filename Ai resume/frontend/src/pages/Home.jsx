import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  FileSearch,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  Briefcase,
  Users,
  GraduationCap,
  Building,
  Check,
  CreditCard,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';

const Home = () => {
  const { isAuthenticated, user, isSubscriber } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-16 py-8">
      {/* Hero Header */}
      <section className="text-center max-w-4xl mx-auto space-y-6 pt-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" /> Next-Gen AI Resume & Dual-Stage Hiring Platform
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
          Supercharge Hiring & Careers with <br />
          <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
            AI Screening & Verified Talent
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Whether you're looking for your dream job or hiring top talent with automated ATS benchmarks and customized multi-stage assessments — we've got you covered.
        </p>

        {isAuthenticated && (
          <div className="p-4 bg-indigo-50/80 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800/80 inline-flex items-center gap-3">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Welcome back, <strong className="text-indigo-600 dark:text-indigo-400">{user?.full_name || 'Member'}</strong>!
            </span>
            <Link to={user?.role === 'RECRUITER' || isSubscriber ? '/recruiter' : '/dashboard'}>
              <Button size="sm" variant="primary">
                Open Workspace <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        )}
      </section>

      {/* Prominent Dual-Path Hero Section */}
      <section className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Choose Your Destination
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Tailored workflows for ambitious job seekers and forward-thinking recruiters
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Card 1: Job Seeker / Candidate */}
          <div className="relative group bg-white dark:bg-slate-900 rounded-3xl p-8 border-2 border-slate-200/80 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all duration-300 shadow-xl shadow-slate-100 dark:shadow-none flex flex-col justify-between overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all" />

            <div className="space-y-6 relative">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shadow-md shadow-indigo-500/10">
                  <GraduationCap className="w-7 h-7" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  For Candidates
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  I am a Job Seeker / Candidate
                </h3>
                <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mt-1">
                  Find Jobs & ATS Match
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  Discover matching jobs, optimize your resume against automated ATS screeners, and showcase your skills through interactive assessments.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Instant AI resume analysis and ATS score diagnostics</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Interactive Stage-1 AI screening tests & Stage-2 custom recruiter exams</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Built-in professional Resume Builder with live preview</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Verified KYC badges to stand out to top recruiters</span>
                </div>
              </div>
            </div>

            <div className="pt-8 space-y-3 relative">
              <div className="grid grid-cols-2 gap-3">
                <Link to="/jobs" className="w-full">
                  <Button variant="secondary" className="w-full text-xs font-semibold py-2.5 justify-center">
                    Explore Jobs
                  </Button>
                </Link>
                <Link to={isAuthenticated ? "/dashboard" : "/register"} className="w-full">
                  <Button variant="primary" className="w-full text-xs font-semibold py-2.5 justify-center shadow-lg shadow-indigo-500/20">
                    {isAuthenticated ? "My Candidate Cockpit" : "Sign Up Free"} <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Card 2: Employer / Recruiter */}
          <div className="relative group bg-white dark:bg-slate-900 rounded-3xl p-8 border-2 border-slate-200/80 dark:border-slate-800 hover:border-purple-500 dark:hover:border-purple-500 transition-all duration-300 shadow-xl shadow-slate-100 dark:shadow-none flex flex-col justify-between overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all" />

            <div className="space-y-6 relative">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shadow-md shadow-purple-500/10">
                  <Building className="w-7 h-7" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" /> Employer Pro
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  I am an Employer / Recruiter
                </h3>
                <p className="text-sm font-semibold text-purple-600 dark:text-purple-400 mt-1">
                  Hire & Build Assessments
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  Post high-priority openings, screen candidates via custom automated benchmarks, and craft custom Stage-2 MCQ & written evaluations.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                  <Check className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                  <span>Post verified job listings with target skill sets & passing benchmarks</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                  <Check className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                  <span>Custom Stage-2 Question Builder: Up to 10 MCQs + 5 Written prompts</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                  <Check className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                  <span>Applicant Dossiers with auto-calculated marks & direct action tools</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                  <Check className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                  <span>Manual Payment Verification via bKash, Nagad, Rocket & Bank Transfer</span>
                </div>
              </div>
            </div>

            <div className="pt-8 space-y-3 relative">
              <div className="grid grid-cols-2 gap-3">
                <Link to="/pricing" className="w-full">
                  <Button variant="secondary" className="w-full text-xs font-semibold py-2.5 justify-center border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40">
                    <CreditCard className="w-3.5 h-3.5 mr-1 text-purple-500" /> View Plans & Pricing
                  </Button>
                </Link>
                <Link
                  to={
                    isAuthenticated
                      ? (isSubscriber || user?.role === 'RECRUITER' ? "/recruiter" : "/pricing")
                      : "/login?redirect=/pricing"
                  }
                  className="w-full"
                >
                  <Button
                    variant="primary"
                    className="w-full text-xs font-semibold py-2.5 justify-center bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-500/20 text-white"
                  >
                    Post a Job Now <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="grid md:grid-cols-3 gap-8 pt-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <FileSearch className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Instant ATS Parsing</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Extract skills, education, and work experience from PDF resumes instantly with automated scoring heuristics.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <TrendingUp className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Intelligent Job Match</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Compare candidate skill profiles against employer job requisitions to pinpoint missing competencies and compatibility scores.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">KYC Verified Badges</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Build authentic trust between candidates and recruiters with formal National ID and biometric selfie verification pipelines.
          </p>
        </div>
      </section>
    </div>
  );
};

export default Home;