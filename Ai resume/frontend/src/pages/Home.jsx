import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, FileSearch, CheckCircle2, ShieldCheck, ArrowRight, TrendingUp } from 'lucide-react';
import Button from '../components/ui/Button';

const Home = () => {
  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="text-center max-w-4xl mx-auto space-y-6 pt-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
          <Sparkles className="w-3.5 h-3.5" /> Next-Gen AI Resume & Job Matching Engine
        </div>
        
        <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
          Accelerate Your Career with <br />
          <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">
            Automated ATS Analysis
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Upload your resume, unlock deep parsing metrics, verify your identity with KYC badges, and discover perfect job alignments powered by AI.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link to="/register">
            <Button size="lg" className="shadow-lg shadow-indigo-500/20">
              Get Started Free <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Link to="/jobs">
            <Button variant="secondary" size="lg">
              Explore Job Board
            </Button>
          </Link>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="grid md:grid-cols-3 gap-8">
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
