"use client";

import React, { useState, useEffect } from 'react';
import { useNotifications } from '@/context/NotificationContext';
import { Bell, X, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

export function PushPermissionPrompt() {
  const { permissionStatus, isSubscribed, subscribeToPush } = useNotifications();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show prompt after a short delay, but only if permission is default and not subscribed
    if (permissionStatus === 'default' && !isSubscribed) {
      const timer = setTimeout(() => {
        // Check local storage to see if user dismissed it recently
        const dismissed = localStorage.getItem('push_prompt_dismissed');
        if (!dismissed || Date.now() - parseInt(dismissed) > 7 * 24 * 60 * 60 * 1000) {
          setIsVisible(true);
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [permissionStatus, isSubscribed]);

  const handleEnable = async () => {
    const success = await subscribeToPush();
    if (success) {
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('push_prompt_dismissed', Date.now().toString());
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="relative group"
        >
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-primary rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000" />
          <div className="relative bg-white dark:bg-slate-900 border border-blue-500/20 rounded-2xl p-6 shadow-xl">
            <button 
              onClick={handleDismiss}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                <Bell className="w-6 h-6 text-blue-500" />
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Stay Updated
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Enable push notifications to get real-time updates when your posts are published or when you get new ideas.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={handleEnable}
                    className="rounded-xl h-10 px-6 font-bold bg-blue-600 hover:bg-blue-700 text-white border-none"
                  >
                    Enable Notifications
                  </Button>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium px-1">
                    <ShieldCheck className="w-3 h-3" />
                    Privacy first. No spam, ever.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
