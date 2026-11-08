import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { jobService } from '../../services/jobService';
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  UserCheck,
  User,
  ShieldAlert,
  Users,
  Radio,
  Send,
  PlusCircle,
  FileSearch,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CreditCard,
  Building2,
  Target,
  Award,
  Mail,
  Inbox,
  Kanban,
} from 'lucide-react';

const Sidebar = () => {
  const { user, isSuperAdmin, isSubscriber, isRecruiter, isVerified, viewMode } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get('tab');
  const { notifications } = useNotifications();

  const [candidateUnreadCount, setCandidateUnreadCount] = useState(0);
  const [recruiterUnreadCount, setRecruiterUnreadCount] = useState(0);
  const [candidateApplicationsCount, setCandidateApplicationsCount] = useState(null);

  const userRole = user?.role?.toUpperCase();
  const isRecruiterUser = userRole === 'RECRUITER' || userRole === 'SUBSCRIBER' || isSubscriber || isRecruiter || viewMode === 'recruiter';
  const isSuperAdminUser = userRole === 'SUPER_ADMIN' || isSuperAdmin;

  // Sync unread counts and applications count from API with exact database precision
  useEffect(() => {
    if (!user) return;
    if (isRecruiterUser) {
      jobService
        .getRecruiterUnreadInquiriesCount()
        .then((res) => setRecruiterUnreadCount(res?.unread_count ?? 0))
        .catch(() => {
          // Fallback to notification filtering
          if (Array.isArray(notifications)) {
            const count = notifications.filter(
              (n) => !n.is_read && n.title?.toLowerCase().startsWith('reply from ')
            ).length;
            setRecruiterUnreadCount(count);
          }
        });
    } else {
      jobService
        .getCandidateUnreadMessagesCount()
        .then((res) => setCandidateUnreadCount(res?.unread_count ?? 0))
        .catch(() => {
          // Fallback to strict candidate message filtering (never match general JOB type)
          if (Array.isArray(notifications)) {
            const count = notifications.filter(
              (n) => !n.is_read && n.title?.toLowerCase().startsWith('message from ')
            ).length;
            setCandidateUnreadCount(count);
          }
        });

      jobService
        .getMyApplications()
        .then((apps) => {
          if (Array.isArray(apps)) {
            setCandidateApplicationsCount(apps.length);
          }
        })
        .catch(() => setCandidateApplicationsCount(null));
    }
  }, [user, isRecruiterUser, location.pathname, notifications]);

  // 1. Super Admin View Navigation with distinct paths and explicit tabKey
  const adminNav = [
    { name: 'Admin Overview', path: '/admin', tabKey: 'overview', icon: LayoutDashboard },
    { name: 'KYC Moderation', path: '/admin/kyc', tabKey: 'kyc', icon: UserCheck },
    { name: 'Payment & Recruiter KYC', path: '/admin/payments', tabKey: 'payments', icon: ShieldAlert },
    { name: 'Recruiter Dashboard', path: '/recruiter', icon: Building2 },
    { name: 'Shortlisted Candidates', path: '/recruiter/shortlisted', icon: UserCheck },
    { name: 'Job Requisitions', path: '/jobs', icon: Briefcase },
    { name: 'System Resumes', path: '/resumes', icon: FileText },
  ];

  // 2. Recruiter View Navigation (for RECRUITERS & SUBSCRIBERS)
  const recruiterNav = [
    { name: 'Recruiter Dashboard', path: '/recruiter', icon: Building2 },
    {
      name: 'Candidate Inquiries',
      path: '/recruiter/inquiries',
      icon: Mail,
      badge: recruiterUnreadCount > 0 ? recruiterUnreadCount : null,
    },
    { name: 'Shortlisted Candidates', path: '/recruiter/shortlisted', icon: UserCheck },
    { name: 'My Posted Jobs', path: '/jobs', icon: Briefcase },
    { name: 'KYC Verification', path: '/kyc', icon: ShieldAlert },
    { name: 'Company Profile', path: '/recruiter/company-profile', icon: Building2 },
  ];

  // 3. Candidate View Navigation (strictly for CANDIDATES)
  const candidateNav = [
    { name: 'Candidate Dashboard', path: '/dashboard', icon: LayoutDashboard },
    {
      name: 'Application Tracker',
      path: '/candidate/applications',
      icon: Kanban,
      badge: candidateApplicationsCount > 0 ? candidateApplicationsCount : null,
      badgeColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
    },
    {
      name: 'Received Messages',
      path: '/candidate/messages',
      icon: Mail,
      badge: candidateUnreadCount > 0 ? candidateUnreadCount : null,
      badgeColor: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
    },
    { name: 'AI Resume Gap Analyzer', path: '/dashboard?tab=gap-analyzer', tabKey: 'gap-analyzer', icon: Target },
    { name: 'Live Resume Builder', path: '/resume-builder', icon: Sparkles },
    { name: 'My Resumes & ATS', path: '/resumes', icon: FileText },
    { name: 'Find Job Matches', path: '/candidate/jobs', icon: Briefcase },
    { name: 'KYC Verification', path: '/kyc', icon: UserCheck },
    { name: 'Formal CV Profile', path: '/profile', icon: User },
  ];

  // Pick navigation strictly by role separation
  let navItems = candidateNav;
  let panelTitle = 'Candidate Cockpit';
  let badgeColor = 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300';

  if (isSuperAdminUser && viewMode === 'admin') {
    navItems = adminNav;
    panelTitle = 'Super Admin Console';
    badgeColor = 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300';
  } else if (isRecruiterUser) {
    navItems = recruiterNav;
    panelTitle = 'Recruiter Portal';
    badgeColor = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
  }

  // Strict active matching to prevent simultaneous multi-item selection
  const isNavActive = (item) => {
    if (item.path === '/recruiter') {
      return location.pathname === '/recruiter';
    }
    if (item.path === '/recruiter/shortlisted') {
      return location.pathname === '/recruiter/shortlisted';
    }
    if (item.path === '/recruiter/inquiries') {
      return location.pathname === '/recruiter/inquiries';
    }
    if (item.path === '/recruiter/company-profile' || item.path === '/recruiter/company') {
      return (
        location.pathname === '/recruiter/company-profile' ||
        location.pathname === '/recruiter/company'
      );
    }
    if (item.path === '/candidate/messages') {
      return location.pathname === '/candidate/messages';
    }

    if (isSuperAdminUser && viewMode === 'admin') {
      if (item.tabKey === 'overview') {
        return (
          (location.pathname === '/admin' && (!currentTab || currentTab === 'overview')) ||
          location.pathname === '/admin/overview'
        );
      }
      if (item.tabKey === 'kyc') {
        return (
          location.pathname === '/admin/kyc' ||
          (location.pathname === '/admin' && currentTab === 'kyc')
        );
      }
      if (item.tabKey === 'payments') {
        return (
          location.pathname === '/admin/payments' ||
          (location.pathname === '/admin' && currentTab === 'payments')
        );
      }
      if (item.tabKey === 'payment-settings') {
        return (
          location.pathname === '/admin/settings/payment' ||
          (location.pathname === '/admin' && currentTab === 'payment-settings')
        );
      }
      if (item.tabKey === 'plans') {
        return (
          location.pathname === '/admin/plans' ||
          (location.pathname === '/admin' && currentTab === 'plans')
        );
      }
      if (item.path === '/jobs' || item.path === '/candidate/jobs') {
        return (
          location.pathname === '/jobs' ||
          location.pathname === '/candidate/jobs' ||
          location.pathname.startsWith('/jobs/') ||
          location.pathname.startsWith('/candidate/jobs/')
        );
      }
      if (item.path === '/resumes') {
        return location.pathname === '/resumes' || location.pathname.startsWith('/resumes/');
      }
      return location.pathname === item.path;
    }

    // Candidate and Recruiter paths
    if (item.path === '/candidate/applications' || item.path === '/candidate/tracker') {
      return (
        location.pathname === '/candidate/applications' ||
        location.pathname === '/candidate/tracker' ||
        (location.pathname === '/dashboard' && currentTab === 'tracker')
      );
    }
    if (item.path === '/dashboard') {
      return (
        location.pathname === '/dashboard' &&
        (!currentTab || (currentTab !== 'tracker' && currentTab !== 'gap-analyzer'))
      );
    }
    if (item.path === '/dashboard?tab=tracker') {
      return (
        (location.pathname === '/dashboard' && currentTab === 'tracker') ||
        location.pathname === '/candidate/applications' ||
        location.pathname === '/candidate/tracker'
      );
    }
    if (item.path === '/dashboard?tab=gap-analyzer') {
      return (
        (location.pathname === '/dashboard' && currentTab === 'gap-analyzer') ||
        location.pathname === '/gap-analyzer'
      );
    }
    if (item.path === '/candidate/messages') {
      return location.pathname === '/candidate/messages';
    }
    if (item.path === '/resume-builder' || item.path === '/live-resume-builder') {
      return (
        location.pathname === '/resume-builder' ||
        location.pathname === '/live-resume-builder' ||
        location.pathname.startsWith('/resume-builder/')
      );
    }
    if (item.path === '/jobs' || item.path === '/candidate/jobs') {
      return (
        location.pathname === '/jobs' ||
        location.pathname === '/candidate/jobs' ||
        location.pathname.startsWith('/jobs/') ||
        location.pathname.startsWith('/candidate/jobs/')
      );
    }
    return location.pathname === item.path;
  };

  const getActiveClass = (isActive) => {
    if (!isActive) {
      return 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/60 font-medium';
    }
    if (isSuperAdminUser && viewMode === 'admin') {
      return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-bold border-r-2 border-rose-500 shadow-sm';
    }
    if (isRecruiterUser) {
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold border-r-2 border-emerald-500 shadow-sm';
    }
    return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 font-bold border-r-2 border-indigo-500 shadow-sm';
  };

  return (
    <aside
      className={`fixed top-16 left-0 bottom-0 z-30 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 select-none ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Cockpit Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800/80">
        {!collapsed && (
          <div className="flex items-center space-x-2 overflow-hidden">
            <span
              className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full tracking-wider truncate ${badgeColor}`}
            >
              {panelTitle}
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors ${
            collapsed ? 'mx-auto' : ''
          }`}
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isNavActive(item);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={collapsed ? item.name : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all group relative ${getActiveClass(
                active
              )} ${collapsed ? 'justify-center' : ''}`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                  active
                    ? isSuperAdminUser && viewMode === 'admin'
                      ? 'text-rose-600 dark:text-rose-400'
                      : isRecruiterUser
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                }`}
              />

              {!collapsed && (
                <span className="truncate flex-1 tracking-tight">{item.name}</span>
              )}

              {/* Dynamic Badge for count or unread items */}
              {item.badge != null && item.badge > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                    collapsed
                      ? 'absolute top-1.5 right-1.5'
                      : ''
                  } ${
                    item.badgeColor
                      ? item.badgeColor
                      : isRecruiterUser
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}

              {/* Collapsed Tooltip */}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-medium rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-xl border border-slate-700">
                  {item.name}
                  {item.badge ? ` (${item.badge})` : ''}
                </div>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Footer / Account Mini-Card */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
        <div
          className={`flex items-center gap-3 p-2 rounded-2xl ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold shrink-0 text-slate-700 dark:text-slate-200">
            {user?.full_name?.[0]?.toUpperCase() || 'U'}
          </div>
          {!collapsed && (
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">
                {user?.full_name || 'Guest User'}
              </p>
              <p className="text-[10px] text-slate-400 truncate mt-0.5 font-medium">
                {user?.email || 'user@example.com'}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
