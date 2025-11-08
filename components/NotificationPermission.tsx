"use client";

import { getFCMToken, requestNotificationPermission } from '@/lib/push-notifications';
import { useEffect, useState } from 'react';

export default function NotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
      
      // Show prompt if permission is default and user hasn't dismissed it
      const hasSeenPrompt = localStorage.getItem('notification-prompt-seen');
      if (Notification.permission === 'default' && !hasSeenPrompt) {
        // Show after a delay
        setTimeout(() => {
          setShowPrompt(true);
        }, 5000);
      }
    }
  }, []);

  const handleRequestPermission = async () => {
    setIsLoading(true);
    try {
      const result = await requestNotificationPermission();
      setPermission(result);
      
      if (result === 'granted') {
        // Get FCM token
        await getFCMToken();
        setShowPrompt(false);
        localStorage.setItem('notification-prompt-seen', 'true');
      } else if (result === 'denied') {
        setShowPrompt(false);
        localStorage.setItem('notification-prompt-seen', 'true');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('notification-prompt-seen', 'true');
  };

  // Don't show if permission is already granted or denied
  if (permission !== 'default' || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 lg:left-auto lg:right-4 lg:max-w-md animate-slide-up">
      <div className="bg-gradient-to-r from-[rgb(var(--brand-yellow))] to-[#FFE066] rounded-xl shadow-2xl p-4 border border-[rgb(var(--brand-yellow))]/30">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-black/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-black font-bold text-sm mb-1">Get Match Reminders</h3>
            <p className="text-black/80 text-xs mb-3">
              Never miss a match! Get notified when your favorite teams play
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleRequestPermission}
                disabled={isLoading}
                className="px-4 py-2 bg-black text-white rounded-lg text-xs font-semibold hover:bg-black/90 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Enabling...' : 'Enable Notifications'}
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 bg-black/10 text-black rounded-lg text-xs font-medium hover:bg-black/20 transition-colors"
              >
                Later
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-black/60 hover:text-black transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

