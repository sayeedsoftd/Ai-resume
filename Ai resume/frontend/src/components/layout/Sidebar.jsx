import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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
} from 'lucide-react';

const Sidebar = () => {
  const { user, isSuperAdmin, isSubscriber, isVerified, viewMode } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  // 1. Super Admin View Navigation
  const adminNav = [
    { name: 'Admin Overview', path: '/admin', icon: LayoutDashboard },
    { name: 'KYC Moderation', path: '/admin', icon: UserCheck },
    { name: 'Job Requisitions', path: '/jobs', icon: Briefcase },
    { name: 'System Resumes', path: '/resumes', icon: FileText },
  ];

  // 2. Recruiter View Navigation (for SUBSCRIBERS)
  const recruiterNav = [
    { name: 'Recruiter Command Board', path: '/recruiter', icon: Briefcase },
    { name: 'Public Job Board', path: '/jobs', icon: Users },
    { name: 'Candidate Tracker', path: '/dashboard', icon: Send },
    { name: 'My Profile', path: '/profile', icon: User },
  ];

  // 3. Standard Candidate View Navigation
  const candidateNav = [
    { name: 'Candidate Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Live Resume Builder', path: '/resume-builder', icon: Sparkles },
    { name: 'My Resumes & ATS', path: '/resumes', icon: FileText },
    { name: 'Find Job Matches', path: '/jobs', icon: Briefcase },
    { name: 'KYC Verification', path: '/kyc', icon: UserCheck },
    { name: 'Formal CV Profile', path: '/profile', icon: User },
  ];

  // Pick navigation based on viewMode
  let navItems = candidateNav;
  let panelTitle = 'Candidate Cockpit';
  let badgeColor = 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300';

  if (isSuperAdmin && viewMode === 'admin') {
    navItems = adminNav;
    panelTitle = 'Super Admin Console';
    badgeColor = 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300';
  } else if ((isSubscriber || viewMode === 'recruiter') && viewMode !== 'admin') {
    navItems = recruiterNav;
    panelTitle = 'Recruiter Portal';
    badgeColor = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
  }

  return (
    <aside
      className={`bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between transition-all duration-300 relative ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white shadow-sm transition-colors z-10"
        title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      <div className="space-y-4">
        {/* Workspace Mode Badge */}
        {!collapsed && (
          <div className="px-2">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-md inline-block ${badgeColor}`}>
              {panelTitle}
            </span>
          </div>
        )}

        {/* Navigation Links */}
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                  } ${collapsed ? 'justify-center px-0' : ''}`
                }
                title={collapsed ? item.name : undefined}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Account Tier Footer Widget */}
      {!collapsed && (
        <div className="p-3.5 bg-gradient-to-br from-slate-50 to-indigo-50/50 dark:from-slate-800/60 dark:to-indigo-950/20 rounded-xl border border-indigo-100/60 dark:border-indigo-900/40">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {user?.full_name?.split(' ')[0] || 'User'}
            </span>
            {isVerified ? (
              <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-1.5 py-0.5 rounded-full font-bold">
                VERIFIED
              </span>
            ) : (
              <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 px-1.5 py-0.5 rounded-full font-bold">
                UNVERIFIED
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
            AI Resume Analyzer & Job Matcher active.
          </p>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
