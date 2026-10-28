import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Eye,
  Radio,
  Users,
  Briefcase,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  FileText,
  Send,
  AlertTriangle,
  FileCheck,
} from 'lucide-react';
import api from '../services/api';
import { kycService } from '../services/kycService';
import { jobService } from '../services/jobService';
import { notificationService } from '../services/notificationService';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { useNotifications } from '../context/NotificationContext';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('kyc'); // 'kyc' | 'jobs' | 'users' | 'broadcast'
  const [stats, setStats] = useState({
    total_users: 0,
    subscribers: 0,
    total_jobs: 0,
    active_jobs: 0,
    total_applications: 0,
    pending_kyc: 0,
    total_resumes: 0,
  });

  // KYC State
  const [kycList, setKycList] = useState([]);
  const [selectedKyc, setSelectedKyc] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);

  // Job Oversight State
  const [allJobs, setAllJobs] = useState([]);

  // User Oversight State
  const [allUsers, setAllUsers] = useState([]);

  // Broadcast State
  const [broadcastData, setBroadcastData] = useState({ title: '', message: '' });
  const [broadcasting, setBroadcasting] = useState(false);
  const { triggerToast } = useNotifications();

  useEffect(() => {
    loadStats();
    loadKYCs();
    loadAllJobs();
    loadAllUsers();
  }, []);

  const loadStats = async () => {
    try {
      const res = await api.get('/users/admin/stats');
      setStats(res.data);
    } catch (e) {
      console.error('Stats load error', e);
    }
  };

  const loadKYCs = async () => {
    try {
      const data = await kycService.adminListKYC();
      setKycList(data);
    } catch (err) {
      console.error('KYC list error', err);
    }
  };

  const loadAllJobs = async () => {
    try {
      const data = await jobService.getAllJobsAdmin();
      setAllJobs(data);
    } catch (e) {
      console.error('All jobs error', e);
    }
  };

  const loadAllUsers = async () => {
    try {
      const res = await api.get('/users/admin/all');
      setAllUsers(res.data);
    } catch (e) {
      console.error('All users error', e);
    }
  };

  const handleReviewKyc = async (kycId, status, reason = null) => {
    try {
      await kycService.adminReviewKYC(kycId, status, reason);
      setIsKycModalOpen(false);
      setRejectReason('');
      loadKYCs();
      loadStats();
      triggerToast({
        id: Date.now(),
        title: `KYC Submission ${status}`,
        message: `KYC #${kycId} marked as ${status}. Candidate role updated accordingly.`,
        type: 'KYC',
      });
    } catch (err) {
      alert('Error updating KYC: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleToggleJob = async (jobId) => {
    try {
      const res = await jobService.toggleJobStatus(jobId);
      setAllJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, is_active: res.is_active } : j))
      );
      loadStats();
    } catch (e) {
      console.error('Toggle error', e);
    }
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastData.title || !broadcastData.message) {
      alert('Please provide title and message.');
      return;
    }

    setBroadcasting(true);
    try {
      await notificationService.sendBroadcast(broadcastData);
      triggerToast({
        id: Date.now(),
        title: broadcastData.title,
        message: broadcastData.message,
        type: 'BROADCAST',
      });
      setBroadcastData({ title: '', message: '' });
      alert('Broadcast notification sent to all active users!');
    } catch (err) {
      alert('Failed to send broadcast: ' + (err.response?.data?.detail || err.message));
    } finally {
      setBroadcasting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 p-6 rounded-2xl text-white shadow-lg border border-rose-900/30">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Super Admin Command Center
            </h1>
            <p className="text-xs text-rose-200/80 mt-1">
              KYC moderation, platform user management, job listing oversight, and live broadcast center.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">
            System Status: Healthy
          </span>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400">Total Users</span>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
            {stats.total_users}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
          <span className="text-[10px] uppercase font-bold text-indigo-500">Subscribers</span>
          <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
            {stats.subscribers}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
          <span className="text-[10px] uppercase font-bold text-amber-500">Pending KYC</span>
          <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
            {stats.pending_kyc}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
          <span className="text-[10px] uppercase font-bold text-emerald-500">Active Jobs</span>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
            {stats.active_jobs}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
          <span className="text-[10px] uppercase font-bold text-purple-500">Applications</span>
          <p className="text-xl font-black text-purple-600 dark:text-purple-400 mt-0.5">
            {stats.total_applications}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
          <span className="text-[10px] uppercase font-bold text-sky-500">Total Resumes</span>
          <p className="text-xl font-black text-sky-600 dark:text-sky-400 mt-0.5">
            {stats.total_resumes}
          </p>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('kyc')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'kyc'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          KYC Verifications ({kycList.length})
        </button>

        <button
          onClick={() => setActiveTab('jobs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'jobs'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Job Listings ({allJobs.length})
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'users'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          User Management ({allUsers.length})
        </button>

        <button
          onClick={() => setActiveTab('broadcast')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'broadcast'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Radio className="w-4 h-4" />
          Live Broadcast Center
        </button>
      </div>

      {/* TAB 1: KYC Verifications */}
      {activeTab === 'kyc' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Legal Name</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Submitted</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {kycList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-4 font-mono text-slate-400">#{item.id}</td>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                      User #{item.user_id}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {item.real_name}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                      {item.phone_number}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          item.status === 'APPROVED'
                            ? 'success'
                            : item.status === 'REJECTED'
                            ? 'danger'
                            : 'warning'
                        }
                      >
                        {item.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setSelectedKyc(item);
                            setIsKycModalOpen(true);
                          }}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> Inspect
                        </Button>
                        {item.status === 'PENDING' && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleReviewKyc(item.id, 'APPROVED')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {kycList.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No KYC verification requests pending.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 2: Job Listings Oversight (Strict Data Anonymization & Metric Aggregates) */}
      {activeTab === 'jobs' && (
        <Card>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Requisitions Oversight (Data Anonymized)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Super Admin view contains aggregated engagement and scoring metrics only. Individual candidate dossiers, CVs, and answer sheets are strictly segregated for candidate privacy.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Job Title & Company</th>
                  <th className="py-3 px-4">Recruiter</th>
                  <th className="py-3 px-4">Total Views</th>
                  <th className="py-3 px-4">Total Applicants</th>
                  <th className="py-3 px-4">Avg Candidate Score</th>
                  <th className="py-3 px-4">Benchmark & Stage 2</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Admin Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {allJobs.map((j) => {
                  const jobId = j.job_id || j.id;
                  return (
                    <tr key={jobId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 font-mono text-slate-400">#{jobId}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{j.title}</div>
                        <div className="text-[11px] text-slate-500">{j.company_name}</div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                        {j.recruiter_name || 'Recruiter'}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-600 dark:text-slate-400">
                        {j.total_views || 0}
                      </td>
                      <td className="py-3 px-4 font-bold text-indigo-600 dark:text-indigo-400">
                        {j.total_applicants_count ?? j.applicant_count ?? 0}
                      </td>
                      <td className="py-3 px-4">
                        {j.average_candidate_score !== null && j.average_candidate_score !== undefined ? (
                          <span className="font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            {j.average_candidate_score}%
                          </span>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-600 dark:text-slate-400">
                        <span>{j.passing_score ?? 70}% target</span>
                        <span className="block text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                          {j.has_manual_stage ? 'Stage-2 Enabled' : 'No Stage-2'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            j.is_active
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {j.is_active ? 'Active' : 'Paused'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleJob(jobId)}
                          className="text-xs"
                        >
                          {j.is_active ? (
                            <>
                              <ToggleRight className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Pause
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-3.5 h-3.5 mr-1 text-slate-400" /> Activate
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {allJobs.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      No job requisitions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: User Management */}
      {activeTab === 'users' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">User ID</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Verified Badge</th>
                  <th className="py-3 px-4">Registered Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {allUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-4 font-mono text-slate-400">#{u.id}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {u.full_name}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-mono">
                      {u.email}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {u.is_verified_badge ? (
                        <span className="text-emerald-500 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                        </span>
                      ) : (
                        <span className="text-slate-400">Unverified</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 4: Live Message Broadcast Center */}
      {activeTab === 'broadcast' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Radio className="w-5 h-5 text-rose-500 animate-pulse" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Publish System-Wide Announcement
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Dispatches an instant broadcast notification to all active candidates and recruiters.
                This will trigger the floating 5-second popup modal on their dashboards.
              </p>

              <form onSubmit={handleSendBroadcast} className="space-y-4">
                <Input
                  label="Broadcast Headline *"
                  placeholder="e.g. Scheduled System Maintenance or New Feature Release"
                  value={broadcastData.title}
                  onChange={(e) =>
                    setBroadcastData({ ...broadcastData, title: e.target.value })
                  }
                  required
                />

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Announcement Message Content *
                  </label>
                  <textarea
                    rows={4}
                    value={broadcastData.message}
                    onChange={(e) =>
                      setBroadcastData({ ...broadcastData, message: e.target.value })
                    }
                    placeholder="We have deployed our new AI Resume Builder! Head over to your dashboard to experience real-time ATS optimization..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={broadcasting}
                  className="bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {broadcasting ? 'Publishing Broadcast...' : 'Dispatch Broadcast to All Users'}
                </Button>
              </form>
            </Card>
          </div>

          <div>
            <Card>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
                Live Broadcast Preview
              </h4>
              <div className="bg-slate-900 text-white p-4 rounded-xl border border-rose-500/30 shadow-lg space-y-2">
                <div className="flex items-center gap-2 text-rose-400 text-xs font-bold">
                  <Radio className="w-4 h-4 animate-pulse" />
                  BROADCAST ALERT
                </div>
                <h5 className="font-semibold text-sm">
                  {broadcastData.title || 'Sample Announcement Title'}
                </h5>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {broadcastData.message ||
                    'This is how the 5-second slide-up notification modal will appear across all user viewports.'}
                </p>
                <div className="text-[10px] text-slate-400 pt-1">
                  Floating modal at bottom-left • Auto-dismisses in 5s
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* KYC Inspection Modal with embedded document links */}
      <Modal
        isOpen={isKycModalOpen}
        onClose={() => setIsKycModalOpen(false)}
        title={`KYC Submission Review #${selectedKyc?.id}`}
      >
        {selectedKyc && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div>
                <span className="text-slate-500 block">Legal Full Name:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedKyc.real_name}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Contact Phone:</span>
                <span className="font-semibold text-slate-900 dark:text-white font-mono">
                  {selectedKyc.phone_number}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Candidate Account:</span>
                <span className="font-semibold">User #{selectedKyc.user_id}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Verification Status:</span>
                <span className="font-semibold text-indigo-600">
                  {selectedKyc.status}
                </span>
              </div>
            </div>

            {/* Embedded Documents Viewer */}
            <div className="space-y-3 pt-2">
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  National ID / Passport Document:
                </span>
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-between">
                  <span className="font-mono text-[11px] truncate max-w-[280px]">
                    {selectedKyc.nid_doc_path}
                  </span>
                  <a
                    href={`http://localhost:8000/${selectedKyc.nid_doc_path}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline shrink-0"
                  >
                    Open Document
                  </a>
                </div>
              </div>

              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Selfie Photo Document:
                </span>
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-between">
                  <span className="font-mono text-[11px] truncate max-w-[280px]">
                    {selectedKyc.selfie_path}
                  </span>
                  <a
                    href={`http://localhost:8000/${selectedKyc.selfie_path}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline shrink-0"
                  >
                    Open Selfie
                  </a>
                </div>
              </div>
            </div>

            {selectedKyc.status === 'PENDING' && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <input
                  type="text"
                  placeholder="Rejection reason if declining (e.g. Unclear NID scan)..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-xs"
                />

                <div className="flex justify-end gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() =>
                      handleReviewKyc(
                        selectedKyc.id,
                        'REJECTED',
                        rejectReason || 'Identification document not legible'
                      )
                    }
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" /> Reject Submission
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleReviewKyc(selectedKyc.id, 'APPROVED')}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve & Upgrade Role
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
