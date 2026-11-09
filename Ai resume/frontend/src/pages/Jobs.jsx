import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { jobService } from '../services/jobService';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import CreateJobModal from '../components/jobs/CreateJobModal';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import {
  Search,
  Briefcase,
  MapPin,
  DollarSign,
  Plus,
  Filter,
  Sparkles,
  RotateCcw,
  Building,
  CheckCircle2,
  Laptop,
  Building2,
  Layers,
  Award,
  SlidersHorizontal,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const JOB_CATEGORIES = [
  'All Categories',
  'Software Engineering',
  'AI / Machine Learning',
  'Data Science & Analytics',
  'UI/UX & Product Design',
  'Quality Assurance & Testing',
  'DevOps & Cloud Engineering',
  'Mobile App Development',
  'Cybersecurity & Networking',
  'Product & Project Management',
  'Database Administration',
  'IT & Tech Support',
];

const WORKPLACE_OPTIONS = [
  { id: 'ALL', label: 'All Models' },
  { id: 'REMOTE', label: 'Remote', icon: Laptop },
  { id: 'HYBRID', label: 'Hybrid', icon: Building2 },
  { id: 'ON_SITE', label: 'On-site', icon: MapPin },
];

const SALARY_PRESETS = [
  { label: 'Any Salary', value: 'ALL' },
  { label: '৳25k+', value: '25000' },
  { label: '৳40k+', value: '40000' },
  { label: '৳60k+', value: '60000' },
  { label: '৳100k+', value: '100000' },
];

const Jobs = () => {
  const { isAuthenticated, isSubscriber, isSuperAdmin } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedWorkplace, setSelectedWorkplace] = useState('ALL');
  const [selectedSalaryPreset, setSelectedSalaryPreset] = useState('ALL');
  const [experienceLevel, setExperienceLevel] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.q = search.trim();
      if (selectedCategory && selectedCategory !== 'All Categories') {
        params.category = selectedCategory;
      }
      if (selectedWorkplace && selectedWorkplace !== 'ALL') {
        params.workplace_type = selectedWorkplace;
      }
      if (selectedSalaryPreset && selectedSalaryPreset !== 'ALL') {
        params.min_salary = parseFloat(selectedSalaryPreset);
      }
      if (experienceLevel && experienceLevel !== 'ALL') {
        params.experience_level = experienceLevel;
      }

      const data = await jobService.getJobs(params);
      if (Array.isArray(data)) {
        setJobs(data);
      } else {
        setJobs([]);
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, [search, selectedCategory, selectedWorkplace, selectedSalaryPreset, experienceLevel]);

  const handleResetFilters = () => {
    setSearch('');
    setSelectedCategory('All Categories');
    setSelectedWorkplace('ALL');
    setSelectedSalaryPreset('ALL');
    setExperienceLevel('ALL');
  };

  const canPostJob = isSubscriber || isSuperAdmin;
  const safeJobs = Array.isArray(jobs) ? jobs : [];
  const activeFilterCount =
    (search ? 1 : 0) +
    (selectedCategory !== 'All Categories' ? 1 : 0) +
    (selectedWorkplace !== 'ALL' ? 1 : 0) +
    (selectedSalaryPreset !== 'ALL' ? 1 : 0) +
    (experienceLevel !== 'ALL' ? 1 : 0);

  return (
    <ErrorBoundary title="Failed to load Job Board">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Career Opportunities & Job Board
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Explore open positions with industry categorization, workplace model, and salary filtering.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/dashboard?tab=matches">
              <Button
                variant="secondary"
                className="text-xs border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
              >
                <Sparkles className="w-4 h-4 mr-1.5" /> Find AI Job Matches
              </Button>
            </Link>
            {isAuthenticated && canPostJob && (
              <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Post New Job
              </Button>
            )}
          </div>
        </div>

        {/* BDjobs-Style Comprehensive Filter Bar */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          {/* Top Row: Search Input + Category Dropdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-6 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search by job title, company name, skill, or keywords..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div className="lg:col-span-4 relative">
              <Layers className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                {JOB_CATEGORIES.map((cat, idx) => (
                  <option key={idx} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2 flex items-center justify-end">
              {activeFilterCount > 0 ? (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="w-full py-2 px-3 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl hover:bg-rose-100 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset ({activeFilterCount})
                </button>
              ) : (
                <div className="w-full py-2 px-3 text-xs text-slate-400 dark:text-slate-500 text-center font-medium">
                  All Filters Active
                </div>
              )}
            </div>
          </div>

          {/* Bottom Row: Workplace Model Pills + Salary Quick Presets + Experience Dropdown */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            {/* Workplace Model Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1 flex items-center gap-1">
                <Laptop className="w-3 h-3 text-indigo-500" /> Workplace:
              </span>
              {WORKPLACE_OPTIONS.map((wp) => {
                const Icon = wp.icon;
                const active = selectedWorkplace === wp.id;
                return (
                  <button
                    key={wp.id}
                    type="button"
                    onClick={() => setSelectedWorkplace(wp.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      active
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {Icon && <Icon className="w-3 h-3" />}
                    {wp.label}
                  </button>
                );
              })}
            </div>

            {/* Salary Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1 flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-emerald-500" /> Salary (BDT):
              </span>
              {SALARY_PRESETS.map((preset, idx) => {
                const active = selectedSalaryPreset === preset.value;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedSalaryPreset(preset.value)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                      active
                        ? 'bg-emerald-600 text-white shadow-sm font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Applying filters and loading matching jobs...
            </p>
          </div>
        ) : safeJobs.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Briefcase className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No matching jobs found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {activeFilterCount > 0
                ? 'Try adjusting your workplace model, category, or salary filters to view more opportunities.'
                : 'There are currently no active job circulars posted. Check back soon or post a new opening!'}
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              {activeFilterCount > 0 ? (
                <Button variant="secondary" size="sm" onClick={handleResetFilters}>
                  <RotateCcw className="w-3.5 h-3.5 mr-1" /> Clear All Filters
                </Button>
              ) : (
                isAuthenticated &&
                canPostJob && (
                  <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-1.5" /> Post First Job
                  </Button>
                )
              )}
            </div>
          </div>
        ) : (
          /* Job Listings Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {safeJobs.map((job) => {
              const skills = Array.isArray(job.required_skills)
                ? job.required_skills
                : typeof job.required_skills === 'string'
                ? job.required_skills.split(',')
                : [];

              const workplaceLabel =
                job.workplace_type === 'REMOTE'
                  ? 'Remote'
                  : job.workplace_type === 'HYBRID'
                  ? 'Hybrid'
                  : 'On-site';

              const salaryBadgeText = job.is_salary_negotiable && !job.min_salary
                ? 'Negotiable'
                : job.min_salary && job.max_salary
                ? `৳${Number(job.min_salary).toLocaleString()} - ৳${Number(job.max_salary).toLocaleString()}`
                : job.salary_range || 'Negotiable';

              const expBadgeText = job.experience_years_required > 0
                ? `${job.experience_years_required}+ Yrs Exp`
                : 'Fresher / 0 Yrs';

              return (
                <Card key={job.id} hover className="flex flex-col justify-between space-y-4">
                  <div>
                    {/* Header: Company + Workplace Model Pill */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          to={`/company/${job.posted_by_user_id || encodeURIComponent(job.company_name)}`}
                          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline uppercase tracking-wider block"
                          onClick={(e) => e.stopPropagation()}
                          title="View verified company profile and employer branding"
                        >
                          {job.company_name || 'Organization'}
                        </Link>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                          {job.title}
                        </h3>
                      </div>

                      {/* Workplace Model Badge */}
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1 ${
                          job.workplace_type === 'REMOTE'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                            : job.workplace_type === 'HYBRID'
                            ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-300 dark:border-sky-700'
                            : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {job.workplace_type === 'REMOTE' ? (
                          <Laptop className="w-3 h-3" />
                        ) : job.workplace_type === 'HYBRID' ? (
                          <Building2 className="w-3 h-3" />
                        ) : (
                          <MapPin className="w-3 h-3" />
                        )}
                        {workplaceLabel}
                      </span>
                    </div>

                    {/* BDjobs Feature Badges Row */}
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      {/* Industry Category */}
                      {job.category && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                          <Layers className="w-3 h-3 text-indigo-500" />
                          {job.category}
                        </span>
                      )}

                      {/* Salary Badge */}
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                        <DollarSign className="w-3 h-3 text-emerald-500" />
                        {salaryBadgeText}
                      </span>

                      {/* Experience Badge */}
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                        <Award className="w-3 h-3 text-amber-500" />
                        {expBadgeText}
                      </span>

                      {/* Anti-Ghosting SLA Guarantee */}
                      {job.sla_guarantee_enabled !== false && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-cyan-50 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60">
                          <span>🛡️</span>
                          {job.sla_review_days || 5}d Review SLA
                        </span>
                      )}

                      {/* Location */}
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <MapPin className="w-3 h-3 text-slate-400" /> {job.location || 'Remote'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 line-clamp-2 leading-relaxed">
                      {job.description}
                    </p>

                    {/* Skills Tags */}
                    {skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {skills.slice(0, 5).map((skill, index) => (
                          <Badge key={index} variant="default" size="xs">
                            {skill.trim()}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Posted {job.created_at ? new Date(job.created_at).toLocaleDateString() : 'recently'}
                    </span>
                    <Link to={`/jobs/${job.id}`}>
                      <Button size="sm" variant="outline" className="text-xs font-semibold">
                        Match & Apply
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Create/Edit Job Modal with Screening Benchmark and Stage-2 Assessment Builder */}
        <CreateJobModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onJobCreated={() => {
            loadJobs();
            setIsModalOpen(false);
          }}
        />
      </div>
    </ErrorBoundary>
  );
};

export default Jobs;

