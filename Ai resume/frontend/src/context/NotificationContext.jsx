import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { notificationService } from '../services/notificationService';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

const STORAGE_KEY = 'shown_notification_toast_ids';

const getInitialShownToastIds = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch (e) {
    return new Set();
  }
};

const persistShownToastId = (id) => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const set = raw ? new Set(JSON.parse(raw)) : new Set();
    set.add(id);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    // Ignore storage errors in restricted contexts
  }
};

const parseNotificationTime = (dateStr) => {
  if (!dateStr) return 0;
  let s = String(dateStr);
  if (!s.endsWith('Z') && !s.includes('+') && !s.includes('-', 10)) {
    s += 'Z';
  }
  const t = Date.parse(s);
  return isNaN(t) ? new Date(dateStr).getTime() || 0 : t;
};

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [activeToast, setActiveToast] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Set of already shown toast IDs backed by sessionStorage to prevent repetition across renders/routes
  const shownToastIdsRef = useRef(getInitialShownToastIds());
  // Tracks timestamp to filter out past history during polling
  const lastCheckedTimestampRef = useRef(null);
  const isFirstPollRef = useRef(true);
  const toastTimerRef = useRef(null);

  // Mark notification as read both locally and in backend
  const markAsRead = useCallback(async (id) => {
    if (!id) return;
    try {
      // Optimistic local state update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      // Dismiss active toast if it matches this notification
      setActiveToast((current) => (current?.id === id ? null : current));

      // Call backend API /api/v1/notifications/{id}/read
      await notificationService.markAsRead(id);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, []);

  // Dismiss toast and mark as read immediately on backend
  const dismissToast = useCallback((idToDismiss) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    const targetId = idToDismiss || activeToast?.id;
    setActiveToast(null);
    if (targetId) {
      markAsRead(targetId);
    }
  }, [activeToast, markAsRead]);

  // Show a 5-second floating toast modal at bottom-left exactly once per notification ID
  const triggerToast = useCallback((notif) => {
    if (!notif || !notif.id) return;

    // Single appearance check: prevent showing the same notification repeatedly
    if (shownToastIdsRef.current.has(notif.id)) {
      return;
    }

    // Record into local Set and sessionStorage
    shownToastIdsRef.current.add(notif.id);
    persistShownToastId(notif.id);

    // Clear any active dismiss timer
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    setActiveToast(notif);

    // Auto-dismiss smoothly after 5 seconds and call backend markAsRead
    toastTimerRef.current = setTimeout(() => {
      setActiveToast((current) => {
        if (current?.id === notif.id) {
          markAsRead(notif.id);
          return null;
        }
        return current;
      });
      toastTimerRef.current = null;
    }, 5000);
  }, [markAsRead]);

  // Poll notifications when user is authenticated
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await notificationService.getNotifications();
      if (!Array.isArray(data)) return;

      setNotifications(data);
      const unread = data.filter((n) => !n.is_read).length;
      setUnreadCount(unread);

      // On initial poll: capture existing notifications so history is not toasted
      if (isFirstPollRef.current || lastCheckedTimestampRef.current === null) {
        data.forEach((n) => {
          if (n?.id) {
            shownToastIdsRef.current.add(n.id);
            persistShownToastId(n.id);
          }
        });

        // Set baseline timestamp to max existing timestamp or now
        const maxExistingTime = data.reduce((max, n) => {
          const t = parseNotificationTime(n.created_at);
          return t > max ? t : max;
        }, Date.now());

        lastCheckedTimestampRef.current = maxExistingTime;
        isFirstPollRef.current = false;
        return;
      }

      // Subsequent polling: only trigger toast for newly arrived notifications (created_at > last_checked_timestamp)
      const lastChecked = lastCheckedTimestampRef.current;
      let maxTimeFound = lastChecked;

      const newlyArrived = data.filter((n) => {
        if (!n || n.is_read) return false;
        const notifTime = parseNotificationTime(n.created_at);
        if (notifTime > maxTimeFound) {
          maxTimeFound = notifTime;
        }
        return notifTime > lastChecked && !shownToastIdsRef.current.has(n.id);
      });

      lastCheckedTimestampRef.current = Math.max(lastChecked, maxTimeFound, Date.now() - 1000);

      if (newlyArrived.length > 0) {
        // Sort newest first to show the most recent incoming notification
        newlyArrived.sort(
          (a, b) => parseNotificationTime(b.created_at) - parseNotificationTime(a.created_at)
        );
        triggerToast(newlyArrived[0]);
      }
    } catch (err) {
      // Quiet fail on network polling
    }
  }, [isAuthenticated, triggerToast]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 10000); // Poll every 10s
      return () => {
        clearInterval(interval);
        if (toastTimerRef.current) {
          clearTimeout(toastTimerRef.current);
        }
      };
    }
  }, [isAuthenticated, fetchNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        activeToast,
        triggerToast,
        dismissToast,
        markAsRead,
        refreshNotifications: fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
