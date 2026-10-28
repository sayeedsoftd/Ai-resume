import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';
import {
  Sparkles,
  ShieldCheck,
  LogOut,
  User,
  Bell,
  Briefcase,
  FileText,
  Sun,
  Moon,
  ChevronDown,
  LayoutDashboard,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  Users,
  FileSpreadsheet,
  Check,
  Radio,
} from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

const Navbar = () => {
  const {
    user,
    isAuthenticated,
    logout,
    isSuperAdmin,
    isSubscriber,
    isVerified,
    viewMode,
    switchViewMode,
  } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const notifDropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-700 dark:from-white dark:via-indigo-200 dark:to-indigo-400 bg-clip-text text-transparent">
            ResumeAI Match
          </span>
        </Link>

        {/* Public Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link
            to="/jobs"
            className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1.5"
          >
            <Briefcase className="w-4 h-4" /> Find Jobs
          </Link>
          <Link
            to="/resumes"
            className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4" /> ATS Scanner
          </Link>
          <Link
            to="/resume-builder"
            className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-indigo-500" /> Resume Builder
          </Link>
          <Link
            to="/profile"
            className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1.5"
          >
            <User className="w-4 h-4" /> Profile & CV
          </Link>
        </nav>

        {/* Right Section: Theme Toggle & Profile Dropdown */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
          </button>

          {/* Notifications Bell Trigger & Dropdown */}
          {isAuthenticated && (
            <div className="relative" ref={notifDropdownRef}>
              <button
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-sm animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                        Notifications
                      </span>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markAsRead(n.id)}
                          className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer flex items-start gap-2.5 ${
                            !n.is_read ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                          }`}
                        >
                          <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5">
                            {n.type === 'BROADCAST' ? (
                              <Radio className="w-3.5 h-3.5" />
                            ) : (
                              <Bell className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline gap-1">
                              <h5 className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                {n.title}
                              </h5>
                              <span className="text-[10px] text-slate-400 shrink-0">
                                {n.type}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">
                              {n.message}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {isAuthenticated ? (
            <div className="relative" ref={dropdownRef}>
              {/* Profile Trigger */}
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 bg-white dark:bg-slate-800 transition-all focus:outline-none"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
                </div>
                <div className="hidden sm:flex flex-col text-left pr-1">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 max-w-[110px] truncate">
                      {user?.full_name}
                    </span>
                    {isVerified && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" title="Verified Badge" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 uppercase font-medium">
                    {user?.role?.replace('_', ' ')}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Profile Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl py-2 z-50 text-slate-800 dark:text-slate-200 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* User Profile Header */}
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                        {user?.full_name}
                      </p>
                      {isVerified ? (
                        <Badge variant="verified" size="xs">
                          <ShieldCheck className="w-3 h-3 mr-1 text-blue-500" /> Verified
                        </Badge>
                      ) : (
                        <Badge variant="warning" size="xs">
                          Unverified
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {user?.email}
                    </p>
                  </div>

                  {/* Super Admin & Recruiter View Mode Switchers */}
                  {isSuperAdmin && (
                    <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                      <p className="text-[10px] uppercase font-bold text-slate-400 px-2 mb-1.5">
                        Admin View Controls
                      </p>
                      {viewMode === 'admin' ? (
                        <button
                          onClick={() => {
                            switchViewMode('user');
                            setDropdownOpen(false);
                            navigate('/dashboard');
                          }}
                          className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 font-medium transition-colors"
                        >
                          <User className="w-3.5 h-3.5 text-indigo-500" /> View as Regular User
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            switchViewMode('admin');
                            setDropdownOpen(false);
                            navigate('/admin');
                          }}
                          className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold transition-colors"
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-500" /> Switch to Super Admin Panel
                        </button>
                      )}
                    </div>
                  )}

                  {isSubscriber && !isSuperAdmin && (
                    <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-indigo-50/40 dark:bg-indigo-950/20">
                      <button
                        onClick={() => {
                          const nextMode = viewMode === 'recruiter' ? 'user' : 'recruiter';
                          switchViewMode(nextMode);
                          setDropdownOpen(false);
                          navigate(nextMode === 'recruiter' ? '/recruiter' : '/dashboard');
                        }}
                        className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/40 font-semibold transition-colors"
                      >
                        <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                        {viewMode === 'recruiter' ? 'Switch to Candidate View' : 'Recruiter Management Dashboard'}
                      </button>
                    </div>
                  )}

                  {/* Standard Navigation Links */}
                  <div className="py-1 text-xs">
                    <Link
                      to="/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4 text-slate-400" /> Overview Dashboard
                    </Link>
                    <Link
                      to="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <User className="w-4 h-4 text-slate-400" /> Profile & CV Settings
                    </Link>
                    <Link
                      to="/resumes"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <FileText className="w-4 h-4 text-slate-400" /> My Resumes
                    </Link>
                    {!isVerified && (
                      <Link
                        to="/kyc"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-indigo-600 dark:text-indigo-400 font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                      >
                        <ShieldCheck className="w-4 h-4 text-indigo-500" /> KYC Verification & Upgrade
                      </Link>
                    )}
                  </div>

                  {/* Logout Button */}
                  <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm">Get Started</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
