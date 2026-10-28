import React, { useEffect, useState, useRef } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { Bell, Radio, CheckCircle, AlertCircle, X, ShieldAlert } from 'lucide-react';

export default function NotificationModal() {
  const { activeToast, dismissToast, markAsRead } = useNotifications();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);
  const [isClosing, setIsClosing] = useState(false);
  const closeTimeoutRef = useRef(null);

  useEffect(() => {
    if (activeToast) {
      setVisible(true);
      setIsClosing(false);
      setProgress(100);

      const startTime = Date.now();
      const duration = 5000;

      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
        setProgress(remaining);

        // Initiate smooth exit fade-out 400ms before auto-dismiss
        if (elapsed >= duration - 400) {
          setIsClosing(true);
        }
        if (elapsed >= duration) {
          clearInterval(interval);
        }
      }, 50);

      return () => {
        clearInterval(interval);
        if (closeTimeoutRef.current) {
          clearTimeout(closeTimeoutRef.current);
        }
      };
    } else {
      setVisible(false);
      setIsClosing(false);
    }
  }, [activeToast]);

  if (!activeToast || !visible) return null;

  const handleDismiss = () => {
    setIsClosing(true);
    closeTimeoutRef.current = setTimeout(() => {
      dismissToast(activeToast.id);
    }, 200);
  };

  const handleMarkAsRead = () => {
    setIsClosing(true);
    closeTimeoutRef.current = setTimeout(() => {
      markAsRead(activeToast.id);
    }, 200);
  };

  const getIcon = () => {
    switch (activeToast.type) {
      case 'BROADCAST':
        return <Radio className="w-5 h-5 text-indigo-400 animate-pulse" />;
      case 'KYC':
        return <ShieldAlert className="w-5 h-5 text-emerald-400" />;
      case 'JOB':
        return <CheckCircle className="w-5 h-5 text-sky-400" />;
      default:
        return <Bell className="w-5 h-5 text-amber-400" />;
    }
  };

  return (
    <div
      className={`fixed bottom-6 left-6 z-50 max-w-sm w-full transition-all duration-300 transform ${
        isClosing
          ? 'opacity-0 translate-y-4 scale-95 pointer-events-none'
          : 'opacity-100 translate-y-0 scale-100'
      }`}
      style={{
        animation: !isClosing ? 'slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards' : 'none',
      }}
    >
      <div className="relative bg-slate-900/95 dark:bg-slate-900/95 text-white p-4 rounded-xl shadow-2xl border border-indigo-500/30 backdrop-blur-md overflow-hidden">
        {/* Animated Progress Bar (5 seconds countdown) */}
        <div
          className="absolute top-0 left-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 transition-all duration-75 ease-linear"
          style={{ width: `${progress}%` }}
        />

        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-white/10 flex-shrink-0 mt-0.5">
            {getIcon()}
          </div>

          <div className="flex-1 pr-2 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 truncate">
                {activeToast.type || 'SYSTEM NOTICE'}
              </span>
              <span className="text-[10px] text-slate-400 flex-shrink-0">Just now</span>
            </div>

            <h4 className="text-sm font-semibold text-white mt-0.5 leading-snug break-words">
              {activeToast.title}
            </h4>

            <p className="text-xs text-slate-300 mt-1 line-clamp-3 leading-relaxed break-words">
              {activeToast.message}
            </p>

            <div className="mt-2.5 flex items-center gap-3">
              <button
                type="button"
                onClick={handleMarkAsRead}
                className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors focus:outline-none"
              >
                Mark as read
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors flex-shrink-0 focus:outline-none"
            aria-label="Dismiss alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
