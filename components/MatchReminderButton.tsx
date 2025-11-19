"use client";

import { subscribeToMatchReminders, unsubscribeFromMatchReminders } from '@/lib/push-notifications';
import { useEffect, useState } from 'react';

interface MatchReminderButtonProps {
  matchId: string;
  matchTime: string;
  homeTeam: string;
  awayTeam: string;
  league?: string;
}

export default function MatchReminderButton({
  matchId,
  matchTime,
  homeTeam,
  awayTeam,
  league,
}: MatchReminderButtonProps) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    // Check notification permission
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setHasPermission(Notification.permission === 'granted');
      
      // Check if already subscribed (from localStorage)
      const subscriptions = JSON.parse(localStorage.getItem('match-reminders') || '{}');
      setIsSubscribed(subscriptions[matchId] === true);
    }
  }, [matchId]);

  const handleToggle = async () => {
    if (!hasPermission) {
      // Request permission first
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Please enable notifications in your browser settings to get match reminders.');
        return;
      }
      setHasPermission(true);
    }

    setIsLoading(true);
    try {
      if (isSubscribed) {
        // Unsubscribe
        const success = await unsubscribeFromMatchReminders(matchId);
        if (success) {
          setIsSubscribed(false);
          const subscriptions = JSON.parse(localStorage.getItem('match-reminders') || '{}');
          delete subscriptions[matchId];
          localStorage.setItem('match-reminders', JSON.stringify(subscriptions));
        }
      } else {
        // Subscribe
        const success = await subscribeToMatchReminders(matchId, matchTime);
        if (success) {
          setIsSubscribed(true);
          const subscriptions = JSON.parse(localStorage.getItem('match-reminders') || '{}');
          subscriptions[matchId] = true;
          localStorage.setItem('match-reminders', JSON.stringify(subscriptions));
        }
      }
    } catch (error) {
      console.error('Error toggling match reminder:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`px-2 py-1 rounded-lg text-[9px] font-medium transition-all ${
        isSubscribed
          ? 'bg-[rgb(var(--brand-yellow))] text-black hover:bg-[rgb(var(--brand-yellow))]/90'
          : 'bg-white/10 text-white/80 hover:bg-white/20 border border-white/20'
      } disabled:opacity-50`}
      title={isSubscribed ? 'Unsubscribe from match reminder' : 'Get reminder for this match'}
    >
      {isLoading ? (
        <span className="flex items-center gap-1">
          <svg className="w-2.5 h-2.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          {isSubscribed ? 'Unsubscribing...' : 'Subscribing...'}
        </span>
      ) : (
        <span className="flex items-center gap-1">
          {isSubscribed ? (
            <>
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Reminder Set
            </>
          ) : (
            <>
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Set Reminder
            </>
          )}
        </span>
      )}
    </button>
  );
}

