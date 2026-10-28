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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Jobs = () => {
  const { isAuthenticated, isSubscriber, isSuperAdmin } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Job Form State
  const [newJob, setNewJob] = useState({
    title: '',
    company_name: '',
    description: '',
    required_skills: '',
    experience_level: 'MID',
    location: 'Remote',
    job_type: 'FULL_TIME',
    salary_range: '$80,000 - $110,000',
  });

  const loadJobs = async () => {
    setLoading(true);
    try {
      const data = await jobService.getJobs({ q: search ? search.trim() : undefined });
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
  }, [search]);

  const handleCreateJob = async (e) => {
    e.preventDefault();
    try {
      const skillsArray = (newJob.required_skills || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await jobService.createJob({
        ...newJob,
        required_skills: skillsArray,
      });

      setIsModalOpen(false);
      setNewJob({
        title: '',
        company_name: '',
        description: '',
        required_skills: '',
        experience_level: 'MID',
        location: 'Remote',
        job_type: 'FULL_TIME',
        salary_range: '$80,000 - $110,000',
      });
      loadJobs();
    } catch (err) {
      alert('Error creating job: ' + (err.response?.data?.detail || err.message));
    }
  };

  const canPostJob = isSubscriber || isSuperAdmin;
  const safeJobs = Array.isArray(jobs) ? jobs : [];

  return (
    <ErrorBoundary title="Failed to load Job Board">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Career Opportunities & Job Board</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Discover open positions and match with your primary resume.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/dashboard?tab=matches">
              <Button variant="secondary" className="text-xs border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40">
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

        {/* Search Bar */}
        <Card className="p-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by job title or company name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </Card>

        {/* Loading Spinner */}
        {loading ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Loading open job positions...</p>
          </div>
        ) : safeJobs.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Briefcase className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              {search ? `No jobs matching "${search}"` : 'No Open Jobs Available Yet'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {search
                ? 'Try searching with different keywords or clear your query.'
                : 'There are currently no active job circulars posted. Check back soon or post a new opening!'}
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              {search ? (
                <Button variant="secondary" size="sm" onClick={() => setSearch('')}>
                  <RotateCcw className="w-3.5 h-3.5 mr-1" /> Clear Search
                </Button>
              ) : (
                isAuthenticated && canPostJob && (
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

              return (
                <Card key={job.id} hover className="flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                          {job.company_name || 'Organization'}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                          {job.title}
                        </h3>
                      </div>
                      <Badge variant="primary">
                        {String(job.job_type || 'FULL_TIME').replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-3">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" /> {job.location || 'Remote'}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-slate-400" /> {job.salary_range || 'Competitive'}
                      </span>
                      <span className="flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400" /> {job.experience_level || 'Mid'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 line-clamp-2">
                      {job.description}
                    </p>

                    {/* Skills Tags */}
                    {skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {skills.map((skill, index) => (
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
                      <Button size="sm" variant="outline">
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
