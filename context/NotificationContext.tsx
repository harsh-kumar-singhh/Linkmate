"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface PushSubscriptionJSON {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationContextType {
  notifications: any[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAsClicked: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  subscribeToPush: () => Promise<boolean>;
  isSubscribed: boolean;
  permissionStatus: NotificationPermission | 'unsupported';
  addToast: (toast: Toast) => void;
}

export interface Toast {
  id?: string;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// ─── Helpers ────────────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function saveSubscriptionToServer(subscription: PushSubscription): Promise<boolean> {
  try {
    const res = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription),
    });
    if (!res.ok) {
      console.error('[PUSH] Failed to save subscription to server:', res.status, await res.text());
      return false;
    }
    console.log('[PUSH] Subscription saved to server successfully.');
    return true;
  } catch (err) {
    console.error('[PUSH] Network error saving subscription:', err);
    return false;
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unsupported'>('default');
  const [toasts, setToasts] = useState<Toast[]>([]);

  // ─── Fetch in-app notifications ──────────────────────────────────────────

  const fetchNotifications = useCallback(async () => {
    if (!session?.user) return;
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter((n: any) => !n.read).length);
      }
    } catch (error) {
      console.error('[NOTIFICATIONS] Error fetching:', error);
    }
  }, [session]);

  useEffect(() => {
    if (session?.user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [session, fetchNotifications]);

  // ─── Service Worker + Auto Push Subscription ─────────────────────────────
  //
  // FIX: The old code only checked for an existing subscription but never
  // created one. subscribeToPush() was never called automatically.
  //
  // New behaviour:
  // 1. Register SW (always)
  // 2. Check if subscription already exists → if yes, re-sync it to the server
  //    (handles case where DB was wiped or user cleared site data)
  // 3. If permission is already 'granted' but no subscription exists → auto-subscribe
  // 4. If permission is 'default' → do NOT auto-prompt (bad UX, gets denied on mobile)
  //    Instead, set state so the UI can show a "Enable notifications" button
  //    that calls subscribeToPush() on user gesture.
  // 5. If permission is 'denied' → surface that state so UI can guide the user.

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) {
      setPermissionStatus('unsupported');
      return;
    }

    const currentPermission = Notification.permission;
    setPermissionStatus(currentPermission);
    console.log('[PUSH] Notification.permission on mount:', currentPermission);

    navigator.serviceWorker
      .register('/sw.js')
      .then(async (registration) => {
        console.log('[PUSH] Service worker registered:', registration.scope);

        // Wait for the SW to be fully active before doing push work
        await navigator.serviceWorker.ready;

        const existingSubscription = await registration.pushManager.getSubscription();

        if (existingSubscription) {
          // Subscription exists in browser — make sure it's also in the DB.
          // This handles: user re-installs PWA, DB was reset, server redeployed.
          console.log('[PUSH] Existing subscription found. Re-syncing to server.');
          setIsSubscribed(true);
          await saveSubscriptionToServer(existingSubscription);
          return;
        }

        // No subscription yet.
        if (currentPermission === 'granted') {
          // Permission already granted (e.g. returning user who cleared site data).
          // Safe to silently re-subscribe without prompting.
          console.log('[PUSH] Permission granted but no subscription. Auto-subscribing silently.');
          await createAndSaveSubscription(registration);
        } else if (currentPermission === 'default') {
          // Don't auto-prompt — that gets denied on mobile.
          // The UI should show an "Enable Notifications" button that calls subscribeToPush().
          console.log('[PUSH] Permission not yet requested. Waiting for user gesture.');
        } else {
          // 'denied' — user blocked notifications. Nothing we can do programmatically.
          console.warn('[PUSH] Notification permission is denied. User must enable manually in browser settings.');
          addToast({
            title: 'Notifications Blocked',
            message: 'Push notifications are blocked in your browser. You will not receive post publish alerts unless enabled in site settings.',
            type: 'warning',
            duration: 8000,
          });
        }
      })
      .catch((err) => {
        console.error('[PUSH] Service worker registration failed:', err);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]); // Re-run when user changes (login/logout)

  // ─── Create subscription and save ────────────────────────────────────────

  async function createAndSaveSubscription(registration: ServiceWorkerRegistration): Promise<boolean> {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      console.error('[PUSH] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set. Cannot subscribe.');
      return false;
    }

    try {
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      console.log('[PUSH] pushManager.subscribe() succeeded.');

      const saved = await saveSubscriptionToServer(subscription);
      if (saved) {
        setIsSubscribed(true);
        return true;
      }
      return false;
    } catch (err: any) {
      // Common causes:
      // - "Registration failed - permission denied" → user denied the prompt
      // - "Registration failed - push service error" → FCM/APNS issue
      console.error('[PUSH] pushManager.subscribe() failed:', err.message || err);
      return false;
    }
  }

  // ─── subscribeToPush — call this on user gesture (button click) ──────────

  const subscribeToPush = async (): Promise<boolean> => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

    try {
      const registration = await navigator.serviceWorker.ready;

      // Check if already subscribed
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        console.log('[PUSH] Already subscribed. Re-syncing.');
        const saved = await saveSubscriptionToServer(existing);
        if (saved) setIsSubscribed(true);
        return saved;
      }

      // Request permission — this must happen on a user gesture on mobile
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      console.log('[PUSH] Permission result:', permission);

      if (permission !== 'granted') {
        console.warn('[PUSH] Permission not granted:', permission);
        return false;
      }

      return await createAndSaveSubscription(registration);
    } catch (error: any) {
      console.error('[PUSH] subscribeToPush failed:', error.message || error);
      return false;
    }
  };

  // ─── Notification actions ─────────────────────────────────────────────────

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'read' }),
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('[NOTIFICATIONS] Error marking as read:', error);
    }
  };

  const markAsClicked = async (id: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'click' }),
      });
      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === id ? { ...n, read: true, clicked: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('[NOTIFICATIONS] Error marking as clicked:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readAll: true }),
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('[NOTIFICATIONS] Error marking all as read:', error);
    }
  };

  // ─── Toast ────────────────────────────────────────────────────────────────

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Toast) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };
    setToasts(prev => [...prev, newToast]);
    if (toast.duration !== 0) {
      setTimeout(() => removeToast(id), toast.duration || 5000);
    }
  }, [removeToast]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAsClicked,
        markAllAsRead,
        subscribeToPush,
        isSubscribed,
        permissionStatus,
        addToast,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// ─── Toast UI ─────────────────────────────────────────────────────────────────

import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

function ToastContainer({
  toasts,
  removeToast,
}: {
  toasts: Toast[];
  removeToast: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="pointer-events-auto"
          >
            <div
              className={`
                min-w-[320px] max-w-[400px] p-4 rounded-xl border shadow-2xl flex gap-3
                ${toast.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
                  : toast.type === 'error'
                  ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100'
                  : toast.type === 'warning'
                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100'}
              `}
            >
              <div className="mt-0.5">
                {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-500" />}
                {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-amber-500" />}
                {(!toast.type || toast.type === 'info') && <Info className="w-5 h-5 text-blue-500" />}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm">{toast.title}</h4>
                <p className="text-sm opacity-90 mt-1">{toast.message}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id!)}
                className="hover:opacity-70 transition-opacity self-start"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}