import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { resumeService } from '../services/resumeService';
import { jobService } from '../services/jobService';
import StatCard from '../components/dashboard/StatCard';
import RecentActivity from '../components/dashboard/RecentActivity';
import MatchScoreCard from '../components/dashboard/MatchScoreCard';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Briefcase,
  Award,
  Upload,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Kanban,
  LayoutDashboard,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { subscriptionService } from '../services/subscriptionService';
import JobMatchFinder from './dashboard/JobMatchFinder';
import ApplicationTracker from './dashboard/ApplicationTracker';

const Dashboard = ({ defaultTab }) => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTabParam = searchParams.get('tab');
  
  const [activeTab, setActiveTab] = useState(() => {
    if (defaultTab && ['overview', 'matches', 'tracker'].includes(defaultTab)) {
      return defaultTab;
    }
    if (currentTabParam && ['overview', 'matches', 'tracker'].includes(currentTabParam)) {
      return currentTabParam;
    }
    return 'overview';
  });

  const [resumes, setResumes] = useState([]);
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync tab with URL search parameter
  useEffect(() => {
    if (currentTabParam && ['overview', 'matches', 'tracker'].includes(currentTabParam)) {
      setActiveTab(currentTabParam);
    } else if (!currentTabParam && defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [currentTabParam, defaultTab]);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    if (tabKey === 'overview') {
      setSearchParams({}, { replace: false });
    } else {
      setSearchParams({ tab: tabKey }, { replace: false });
    }
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [resumesData, appsData, jobsData, subData] = await Promise.allSettled([
          resumeService.getResumes(),
          jobService.getMyApplications(),
          jobService.getJobs({ limit: 4 }),
          subscriptionService.getMySubscription(),
        ]);

        if (resumesData.status === 'fulfilled' && Array.isArray(resumesData.value)) {
          setResumes(resumesData.value);
        }
        if (appsData.status === 'fulfilled' && Array.isArray(appsData.value)) {
          setApplications(appsData.value);
        }
        if (jobsData.status === 'fulfilled' && Array.isArray(jobsData.value)) {
          setJobs(jobsData.value);
        }
        if (subData.status === 'fulfilled' && subData.value) {
          setSubscriptionInfo(subData.value);
        }
      } catch (err) {
        console.error('Error loading dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  const safeResumes = Array.isArray(resumes) ? resumes : [];
  const safeApplications = Array.isArray(applications) ? applications : [];
  const safeJobs = Array.isArray(jobs) ? jobs : [];

  const primaryResume = safeResumes.find((r) => r.is_primary) || safeResumes[0];
  const atsScore = primaryResume?.parsed_data?.ats_score || 0;
  const skillsCount = Array.isArray(primaryResume?.parsed_data?.skills)
    ? primaryResume.parsed_data.skills.length
    : 0;

  return (
    <ErrorBoundary title="Dashboard error">
      <div className="space-y-6">
        {/* Verification / Subscription Status Banner */}
        {subscriptionInfo?.subscription_status === 'PENDING' && (
          <div className="p-4 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-sky-950 dark:text-sky-200">
                  Your Recruiter Verification is Pending Review by Super Admin
                </h4>
                <p className="text-xs text-sky-800 dark:text-sky-300 mt-0.5">
                  Your payment details and KYC Trade License have been submitted. You will be notified once approved.
                </p>
              </div>
            </div>
            <Link to="/pricing">
              <Button size="sm" variant="secondary" className="border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300">
                View Submission
              </Button>
            </Link>
          </div>
        )}

        {subscriptionInfo?.subscription_status === 'REJECTED' && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-rose-950 dark:text-rose-200">
                  Recruiter Payment / Verification Rejected
                </h4>
                <p className="text-xs text-rose-800 dark:text-rose-300 mt-0.5">
                  Reason: <span className="font-semibold underline">{subscriptionInfo?.rejection_reason || 'Could not verify document or transaction.'}</span>
                </p>
              </div>
            </div>
            <Link to="/pricing">
              <Button size="sm" className="bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-md whitespace-nowrap">
                Re-submit Payment Details
              </Button>
            </Link>
          </div>
        )}

        {/* Top Banner */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 rounded-2xl p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-indigo-950/20">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Hello, {user?.full_name || 'Candidate'}!</h1>
              {user?.is_verified_badge && (
                <Badge variant="verified" className="bg-white/10 text-white border-white/20">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1 text-sky-300" /> Verified Candidate
                </Badge>
              )}
            </div>
            <p className="text-indigo-200 text-sm mt-1">
              Welcome to your career cockpit. AI analysis is active for your resumes.
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/resume-builder">
              <Button variant="secondary" size="sm" className="bg-white text-indigo-900 hover:bg-indigo-50 border-0">
                <Sparkles className="w-4 h-4 mr-1.5 text-indigo-600" /> Live Resume Builder
              </Button>
            </Link>
            <Link to="/resumes">
              <Button variant="secondary" size="sm" className="bg-white/10 text-white hover:bg-white/20 border-white/20">
                <Upload className="w-4 h-4 mr-1.5" /> Upload File
              </Button>
            </Link>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            onClick={() => handleTabChange('overview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'overview'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Overview
          </button>
          <button
            onClick={() => handleTabChange('matches')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'matches'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Find Perfect Job Matches
          </button>
          <button
            onClick={() => handleTabChange('tracker')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'tracker'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Kanban className="w-4 h-4" />
            Application Tracker ({safeApplications.length})
          </button>
        </div>

        {/* TAB CONTENT: Find Perfect Job Matches */}
        {activeTab === 'matches' && (
          <ErrorBoundary title="Failed to render Job Matches tab">
            <JobMatchFinder />
          </ErrorBoundary>
        )}

        {/* TAB CONTENT: Application Tracker */}
        {activeTab === 'tracker' && (
          <ErrorBoundary title="Failed to render Application Tracker">
            <ApplicationTracker />
          </ErrorBoundary>
        )}

        {/* TAB CONTENT: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Primary ATS Score"
                value={primaryResume ? `${atsScore}%` : 'N/A'}
                change={primaryResume ? 'Calculated via AI' : null}
                icon={Award}
                color="indigo"
              />
              <StatCard
                title="Skills Extracted"
                value={skillsCount}
                icon={FileText}
                color="purple"
              />
              <StatCard
                title="Jobs Applied"
                value={safeApplications.length}
                icon={Briefcase}
                color="emerald"
              />
              <StatCard
                title="Resumes Uploaded"
                value={safeResumes.length}
                icon={Upload}
                color="amber"
              />
            </div>

            {/* Main Grid: Activity & Featured Jobs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <RecentActivity applications={safeApplications} />

                {/* Featured Jobs */}
                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">Recommended Jobs</h4>
                    <Link to="/jobs" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                      View All <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                  {safeJobs.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">
                      No recommended jobs found. <Link to="/jobs" className="text-indigo-600 underline">Explore Job Board</Link>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-3">
                      {safeJobs.slice(0, 4).map((job) => (
                        <div key={job.id} className="p-3.5 border border-slate-200/80 dark:border-slate-800 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors bg-white dark:bg-slate-850">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate max-w-[140px]">{job.company_name}</span>
                            <Badge variant="primary" size="xs">{String(job.job_type || 'Full Time').replace('_', ' ')}</Badge>
                          </div>
                          <h5 className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-1 truncate">{job.title}</h5>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{job.location} &bull; {job.salary_range || 'Competitive'}</p>
                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-[11px] text-slate-400">{job.experience_level}</span>
                            <Link to={`/jobs/${job.id}`}>
                              <Button size="sm" variant="ghost" className="text-xs py-1 px-2">
                                Details
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>

              {/* Right Sidebar: Active Resume Snapshot */}
              <div className="space-y-6">
                <Card>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white mb-3">Primary Resume Snapshot</h4>
                  {primaryResume ? (
                    <div className="space-y-4">
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Version:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">v{primaryResume.version}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">File:</span>
                          <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{primaryResume.file_path}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Last Analyzed:</span>
                          <span className="text-slate-700 dark:text-slate-300">{primaryResume.created_at ? new Date(primaryResume.created_at).toLocaleDateString() : 'N/A'}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-2">Key Skills:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {(primaryResume.parsed_data?.skills || []).slice(0, 8).map((s, idx) => (
                            <Badge key={idx} variant="default" size="xs">{s}</Badge>
                          ))}
                        </div>
                      </div>

                      <Link to="/resumes" className="block">
                        <Button variant="outline" size="sm" className="w-full text-xs">
                          Inspect Full AI Analysis
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      <p>No primary resume found.</p>
                      <Link to="/resumes" className="mt-2 inline-block">
                        <Button size="sm" variant="primary">Upload Now</Button>
                      </Link>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default Dashboard;
