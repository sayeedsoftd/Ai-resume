import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Kanban,
  Table as TableIcon,
  Building,
  Calendar,
  CheckCircle,
  Clock,
  FileCheck,
  XCircle,
  Eye,
  Sparkles,
  Award,
  ArrowRight,
  Video,
  ExternalLink,
  MessageSquare,
  Milestone,
  MapPin,
  DollarSign,
  ChevronRight,
  Briefcase,
  FileText,
} from 'lucide-react';
import { jobService } from '../../services/jobService';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import SubmissionReviewModal from '../../components/assessment/SubmissionReviewModal';
import Stage2AssessmentModal from '../../components/assessment/Stage2AssessmentModal';
import ApplicationJourneyStepper from '../../components/candidate/ApplicationJourneyStepper';
import OfferViewModal from '../../components/candidate/OfferViewModal';
import ErrorBoundary from '../../components/ui/ErrorBoundary';

const STATUS_COLUMNS = [
  { id: 'APPLIED', label: 'Applied', color: 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300' },
  { id: 'SCREENING', label: 'Screening', color: 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300' },
  { id: 'SHORTLISTED', label: 'Shortlisted / Stage 2', color: 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300' },
  { id: 'INTERVIEW', label: 'Interview Scheduled', color: 'border-purple-500 bg-purple-50/40 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300' },
  { id: 'OFFER', label: 'Offer Received / Accepted', color: 'border-teal-500 bg-teal-50/40 dark:bg-teal-950/20 text-teal-700 dark:text-teal-300' },
  { id: 'REJECTED', label: 'Not Selected / Declined', color: 'border-rose-500 bg-rose-50/40 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300' },
];

export default function ApplicationTracker() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewStyle, setViewStyle] = useState('stepper'); // 'stepper' | 'kanban' | 'table'
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);
  const [stage2ModalData, setStage2ModalData] = useState(null);
  const [viewingOfferAppId, setViewingOfferAppId] = useState(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const data = await jobService.getMyApplications();
      if (Array.isArray(data)) {
        setApplications(data);
      } else {
        setApplications([]);
      }
    } catch (err) {
      console.error('Failed to load applications', err);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'OFFER_EXTENDED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-emerald-500 to-teal-500 text-white border border-emerald-400 shadow-xs animate-pulse">
            🎉 Offer Extended
          </span>
        );
      case 'ACCEPTED':
        return <Badge variant="success">Offer Accepted</Badge>;
      case 'DECLINED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            Offer Declined
          </span>
        );
      case 'STAGE1_PASSED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
            Passed (Screening)
          </span>
        );
      case 'STAGE1_FAILED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
            Failed (Screening)
          </span>
        );
      case 'STAGE2_INVITED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-700 animate-pulse">
            Stage-2 Invited
          </span>
        );
      case 'STAGE2_SUBMITTED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700">
            Stage-2 Submitted / Under Review
          </span>
        );
      case 'SHORTLISTED':
        return <Badge variant="success">Shortlisted</Badge>;
      case 'INTERVIEW':
        return <Badge variant="purple">Interview Scheduled</Badge>;
      case 'SCREENING':
        return <Badge variant="warning">Under Screening</Badge>;
      case 'JOB_CLOSED':
      case 'CLOSED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            Job Closed by Recruiter
          </span>
        );
      case 'REJECTED':
        return <Badge variant="danger">Not Selected</Badge>;
      default:
        return <Badge variant="info">Applied</Badge>;
    }
  };

  const mapAppToColumn = (status) => {
    if (status === 'OFFER_EXTENDED' || status === 'ACCEPTED') return 'OFFER';
    if (status === 'STAGE1_PASSED' || status === 'SCREENING') return 'SCREENING';
    if (status === 'STAGE1_FAILED' || status === 'REJECTED' || status === 'DECLINED' || status === 'JOB_CLOSED' || status === 'CLOSED') return 'REJECTED';
    if (status === 'STAGE2_INVITED' || status === 'STAGE2_SUBMITTED' || status === 'SHORTLISTED') return 'SHORTLISTED';
    if (status === 'INTERVIEW') return 'INTERVIEW';
    return 'APPLIED';
  };

  const safeApplications = Array.isArray(applications) ? applications : [];

  return (
    <ErrorBoundary title="Failed to load Application Tracker">
      <div className="space-y-6">
        {/* Tracker Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Application Journey Stepper & Screening Tracker
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Follow your verified 5-stage recruitment journey in real time with recruiter view notifications.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setViewStyle('stepper')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewStyle === 'stepper'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Milestone className="w-3.5 h-3.5" />
              Journey Stepper
            </button>
            <button
              onClick={() => setViewStyle('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewStyle === 'kanban'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              Kanban Board
            </button>
            <button
              onClick={() => setViewStyle('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewStyle === 'table'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              Table View
            </button>
          </div>
        </div>

        {/* Celebratory Offer Letter Banner(s) */}
        {!loading && safeApplications.filter(app => app.status === 'OFFER_EXTENDED').map(offerApp => (
          <div
            key={`banner-offer-${offerApp.id}`}
            className="p-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-emerald-400/40 animate-in fade-in"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
                <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-white/20 rounded-md">
                    Official Job Offer Received 🎉
                  </span>
                  <span className="text-xs text-white/80 font-medium">Application #{offerApp.id}</span>
                </div>
                <h3 className="text-base font-extrabold text-white">
                  Congratulations! You received an official offer from {offerApp.job?.company_name || 'the hiring team'} for {offerApp.job?.title || 'the position'}!
                </h3>
                <p className="text-xs text-emerald-100">
                  Review compensation details, joining timeline, perks, and digitally accept or decline your employment offer.
                </p>
              </div>
            </div>
            <button
              onClick={() => setViewingOfferAppId(offerApp.id)}
              className="px-4 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-black rounded-xl shadow-md transition-all shrink-0 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
            >
              <FileText className="w-4 h-4 text-emerald-600" />
              Review & Respond to Offer
            </button>
          </div>
        ))}

        {loading ? (
          <div className="text-center py-16 text-xs text-slate-500">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading your application and screening test history...
          </div>
        ) : safeApplications.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
            <Clock className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No Applications Submitted Yet
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Find openings matching your skills on the Job Board and complete the screening exam to trigger recruiter reviews!
            </p>
            <Link to="/jobs" className="mt-4 inline-block">
              <Button size="sm" variant="primary">
                Explore Job Board
              </Button>
            </Link>
          </div>
        ) : viewStyle === 'stepper' ? (
          /* ================= JOURNEY STEPPER VIEW ================= */
          <div className="space-y-5">
            {safeApplications.map((app) => (
              <div
                key={app.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md transition-all space-y-4"
              >
                {/* Application Header Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link to={`/jobs/${app.job_id}`}>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                          {app.job?.title || `Position #${app.job_id}`}
                        </h3>
                      </Link>
                      <span className="text-xs text-slate-400 font-semibold">
                        (App #{app.id})
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1 font-medium">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        {app.job?.company_name || 'Hiring Organization'}
                      </span>
                      {app.job?.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {app.job.location}
                        </span>
                      )}
                      {app.job?.job_type && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                          {app.job.job_type.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {app.match_score && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                        ATS: {Math.round(app.match_score)}%
                      </span>
                    )}
                    {getStatusBadge(app.status)}
                  </div>
                </div>

                {/* Live Journey Stepper Component */}
                <ApplicationJourneyStepper
                  application={app}
                  onViewOffer={() => setViewingOfferAppId(app.id)}
                  onTakeStage2={() =>
                    setStage2ModalData({
                      jobId: app.job_id,
                      applicationId: app.id,
                      jobTitle: app.job?.title || 'Job Assessment',
                      companyName: app.job?.company_name || 'Hiring Team',
                    })
                  }
                />

                {/* Quick Action Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs flex-wrap gap-2">
                  <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-[11px]">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Applied on {new Date(app.applied_at).toLocaleDateString()}
                    </span>
                    {app.job?.salary_range && (
                      <span className="flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300">
                        <span>Salary:</span> {app.job.salary_range}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {(app.status === 'OFFER_EXTENDED' || app.status === 'ACCEPTED') && (
                      <Button
                        size="sm"
                        onClick={() => setViewingOfferAppId(app.id)}
                        className={`text-xs font-bold text-white shadow-xs ${
                          app.status === 'OFFER_EXTENDED'
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 animate-pulse'
                            : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5 mr-1" />
                        {app.status === 'ACCEPTED' ? 'View Signed Offer' : 'Review & Sign Offer'}
                      </Button>
                    )}

                    {app.candidate_test_submission_id ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedSubmissionId(app.candidate_test_submission_id)}
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                      >
                        <Award className="w-3.5 h-3.5 mr-1" />
                        View Assessment Submission
                      </Button>
                    ) : (
                      <Link to={`/jobs/${app.job_id}`}>
                        <Button
                          size="sm"
                          variant="primary"
                          className="text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          <Sparkles className="w-3.5 h-3.5 mr-1" />
                          Take Screening Test
                        </Button>
                      </Link>
                    )}

                    <Link to={`/jobs/${app.job_id}`}>
                      <Button size="sm" variant="ghost" className="text-xs text-slate-500 dark:text-slate-400">
                        View Circular <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : viewStyle === 'kanban' ? (
          /* ================= KANBAN BOARD VIEW ================= */
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
            {STATUS_COLUMNS.map((col) => {
              const colApps = safeApplications.filter(
                (app) => mapAppToColumn(app.status || 'APPLIED') === col.id
              );

              return (
                <div
                  key={col.id}
                  className="bg-slate-50/70 dark:bg-slate-900/40 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800 flex flex-col min-h-[380px]"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      {col.label}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {colApps.length}
                    </span>
                  </div>

                  {/* Cards Container */}
                  <div className="space-y-3 flex-1 overflow-y-auto">
                    {colApps.length === 0 ? (
                      <div className="text-center py-8 text-[11px] text-slate-400">
                        Empty
                      </div>
                    ) : (
                      colApps.map((app) => (
                        <div
                          key={app.id}
                          className="bg-white dark:bg-slate-800/90 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700/80 shadow-xs hover:shadow-md transition-all space-y-2.5"
                        >
                          <div className="flex items-center justify-between gap-1 flex-wrap">
                            <span className="text-[10px] font-bold text-slate-400">
                              App #{app.id}
                            </span>
                            <div className="flex items-center gap-1">
                              {app.match_score && (
                                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                                  ATS: {Math.round(app.match_score)}%
                                </span>
                              )}
                              {app.test_score !== null && app.test_score !== undefined ? (
                                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                  Test: {Math.round(app.test_score)}%
                                </span>
                              ) : (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                                  Test: Pending
                                </span>
                              )}
                            </div>
                          </div>

                          <Link to={`/jobs/${app.job_id}`}>
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white hover:text-indigo-600 transition-colors leading-snug">
                              {app.job?.title || `Position #${app.job_id}`}
                            </h4>
                          </Link>

                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Building className="w-3 h-3 text-slate-400" />
                            {app.job?.company_name || 'Hiring Organization'}
                          </div>

                          {/* Live Journey Progress Stepper (Compact Mode) */}
                          <div className="pt-1">
                            <ApplicationJourneyStepper
                              application={app}
                              compact={true}
                              onViewOffer={() => setViewingOfferAppId(app.id)}
                              onTakeStage2={() =>
                                setStage2ModalData({
                                  jobId: app.job_id,
                                  applicationId: app.id,
                                  jobTitle: app.job?.title || 'Job Assessment',
                                  companyName: app.job?.company_name || 'Hiring Team',
                                })
                              }
                            />
                          </div>

                          {/* Action Button for Assessment Review */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex flex-col gap-1.5">
                            {(app.status === 'OFFER_EXTENDED' || app.status === 'ACCEPTED') && (
                              <button
                                onClick={() => setViewingOfferAppId(app.id)}
                                className={`w-full py-1.5 px-2 text-[10px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1 shadow-xs ${
                                  app.status === 'OFFER_EXTENDED'
                                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700'
                                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                }`}
                              >
                                <FileText className="w-3 h-3" />
                                {app.status === 'ACCEPTED' ? 'View Signed Offer' : '🎉 Review & Sign Offer'}
                              </button>
                            )}

                            {app.candidate_test_submission_id ? (
                              <button
                                onClick={() => setSelectedSubmissionId(app.candidate_test_submission_id)}
                                className="w-full mt-1 py-1.5 px-2 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors flex items-center justify-center gap-1 border border-indigo-200 dark:border-indigo-800/60"
                              >
                                <Award className="w-3 h-3" /> View My Assessment Submission
                              </button>
                            ) : (
                              <Link
                                to={`/jobs/${app.job_id}`}
                                className="w-full mt-1 py-1 px-2 text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors flex items-center justify-center gap-1 border border-amber-200 dark:border-amber-800/60"
                              >
                                <Sparkles className="w-3 h-3" /> Take Screening Test
                              </Link>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ================= TABLE VIEW ================= */
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5">ID</th>
                    <th className="px-5 py-3.5">Job Title & Company</th>
                    <th className="px-5 py-3.5">ATS Match</th>
                    <th className="px-5 py-3.5">Screening Exam</th>
                    <th className="px-5 py-3.5">Recruiter Review</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Applied Date</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {safeApplications.map((app) => (
                    <tr
                      key={app.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-slate-100">
                        #{app.id}
                      </td>
                      <td className="px-5 py-3.5">
                        <Link to={`/jobs/${app.job_id}`} className="hover:underline">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {app.job?.title || `Job #${app.job_id}`}
                          </div>
                        </Link>
                        <div className="text-[11px] text-slate-500">
                          {app.job?.company_name || 'Organization'}
                        </div>
                        {app.interview_date && (
                          <div className="text-[10px] text-purple-600 dark:text-purple-400 font-bold flex items-center gap-1 mt-1">
                            <Calendar className="w-3 h-3" />
                            <span>Interview: {app.interview_date}</span>
                            {app.meeting_link && (
                              <a
                                href={app.meeting_link.startsWith('http') ? app.meeting_link : `https://${app.meeting_link}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 dark:text-indigo-400 underline font-semibold ml-1 flex items-center gap-0.5"
                              >
                                <Video className="w-2.5 h-2.5" /> Meeting
                              </a>
                            )}
                          </div>
                        )}
                        {app.status === 'REJECTED' && app.rejection_reason && (
                          <div className="text-[10px] text-rose-500 italic mt-0.5">
                            Feedback: "{app.rejection_reason}"
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {app.match_score ? (
                          <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                            {Math.round(app.match_score)}%
                          </span>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {app.test_score !== null && app.test_score !== undefined ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px]">
                              <Award className="w-3 h-3 text-indigo-500" /> {Math.round(app.test_score)}%
                            </span>
                            {app.mcq_score != null && app.written_score != null && (
                              <p className="text-[10px] text-slate-400">
                                MCQ: {Math.round(app.mcq_score)}/50 | Written: {Math.round(app.written_score)}/50
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-amber-600 dark:text-amber-400">
                            Pending Test
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {app.viewed_by_recruiter ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                            <Eye className="w-3 h-3 text-emerald-600" /> Viewed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            <Clock className="w-3 h-3 text-slate-400" /> In Queue
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">{getStatusBadge(app.status)}</td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {new Date(app.applied_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-1.5">
                        {(app.status === 'OFFER_EXTENDED' || app.status === 'ACCEPTED') && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setViewingOfferAppId(app.id)}
                            className={`text-[11px] py-1 px-2.5 font-bold text-white ${
                              app.status === 'OFFER_EXTENDED'
                                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
                                : 'bg-emerald-600 hover:bg-emerald-700'
                            }`}
                          >
                            <FileText className="w-3 h-3 mr-1" />
                            {app.status === 'ACCEPTED' ? 'Signed Offer' : 'Review Offer'}
                          </Button>
                        )}
                        {app.status === 'STAGE2_INVITED' ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() =>
                              setStage2ModalData({
                                jobId: app.job_id,
                                applicationId: app.id,
                                jobTitle: app.job?.title || 'Job Assessment',
                                companyName: app.job?.company_name || 'Hiring Team',
                              })
                            }
                            className="text-[11px] py-1 px-2.5 font-bold bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            <Sparkles className="w-3 h-3 mr-1" /> Take Stage-2
                          </Button>
                        ) : app.candidate_test_submission_id ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedSubmissionId(app.candidate_test_submission_id)}
                            className="text-[11px] py-1 px-2.5 font-bold text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800"
                          >
                            <Eye className="w-3 h-3 mr-1" /> View Submission
                          </Button>
                        ) : (
                          <Link to={`/jobs/${app.job_id}`}>
                            <Button size="sm" variant="secondary" className="text-[11px] py-1 px-2">
                              Take Test
                            </Button>
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal for Submission Review */}
        {selectedSubmissionId && (
          <SubmissionReviewModal
            isOpen={!!selectedSubmissionId}
            onClose={() => setSelectedSubmissionId(null)}
            submissionId={selectedSubmissionId}
          />
        )}

        {/* Modal for Stage-2 Custom Assessment */}
        {stage2ModalData && (
          <Stage2AssessmentModal
            isOpen={!!stage2ModalData}
            onClose={() => setStage2ModalData(null)}
            jobId={stage2ModalData.jobId}
            applicationId={stage2ModalData.applicationId}
            jobTitle={stage2ModalData.jobTitle}
            companyName={stage2ModalData.companyName}
            onSubmitted={() => {
              fetchApplications();
              setStage2ModalData(null);
            }}
          />
        )}

        {/* Modal for Candidate Offer Letter Viewing & Signing */}
        {viewingOfferAppId && (
          <OfferViewModal
            isOpen={!!viewingOfferAppId}
            onClose={() => setViewingOfferAppId(null)}
            applicationId={viewingOfferAppId}
            onResponseRecorded={fetchApplications}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
