"use client";

import {
    type NotificationSchedule,
    cancelNotification,
    getNotificationPermission,
    getScheduledNotifications,
    isNotificationScheduled,
    isNotificationSupported,
    parseMatchTime,
    reRegisterNotifications,
    requestNotificationPermission,
    scheduleNotification,
    setPermissionAsked,
} from '@/lib/notifications';
import { useEffect, useState } from 'react';

/**
 * React hook for managing match notifications
 */
export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [scheduledNotifications, setScheduledNotifications] = useState<NotificationSchedule[]>([]);
  const [isRequesting, setIsRequesting] = useState(false);

  // Load initial state
  useEffect(() => {
    if (!isNotificationSupported()) {
      setPermission(null);
      return;
    }

    const currentPermission = getNotificationPermission();
    setPermission(currentPermission);

    // Load scheduled notifications
    const notifications = getScheduledNotifications();
    setScheduledNotifications(notifications);

    // Re-register notifications on mount (for page reloads)
    if (currentPermission === 'granted') {
      reRegisterNotifications();
    }
  }, []);

  // Listen for notification updates
  useEffect(() => {
    const handleUpdate = () => {
      const notifications = getScheduledNotifications();
      setScheduledNotifications(notifications);
    };

    window.addEventListener('notificationsUpdated', handleUpdate);

    return () => {
      window.removeEventListener('notificationsUpdated', handleUpdate);
    };
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    if (!isNotificationSupported()) return false;
    
    setIsRequesting(true);
    try {
      const granted = await requestNotificationPermission();
      if (granted) {
        setPermissionAsked();
      }
      setPermission(getNotificationPermission());
      return granted;
    } catch (error) {
      console.error('Error requesting permission:', error);
      return false;
    } finally {
      setIsRequesting(false);
    }
  };

  const scheduleMatchNotification = (
    matchId: string,
    homeTeam: string,
    awayTeam: string,
    timeString: string,
    league?: string
  ): boolean => {
    if (permission !== 'granted') return false;

    const scheduledTime = parseMatchTime(timeString);
    if (!scheduledTime) return false;

    const notificationId = scheduleNotification({
      matchId,
      title: `${homeTeam} vs ${awayTeam}`,
      homeTeam,
      awayTeam,
      league,
      scheduledTime,
    });

    if (notificationId) {
      setScheduledNotifications(getScheduledNotifications());
      return true;
    }

    return false;
  };

  const cancelMatchNotification = (matchId: string): boolean => {
    const cancelled = cancelNotification(matchId);
    if (cancelled) {
      setScheduledNotifications(getScheduledNotifications());
    }
    return cancelled;
  };

  const checkIsScheduled = (matchId: string): boolean => {
    return isNotificationScheduled(matchId);
  };

  return {
    permission,
    isSupported: isNotificationSupported(),
    isRequesting,
    scheduledNotifications,
    requestPermission,
    scheduleMatchNotification,
    cancelMatchNotification,
    checkIsScheduled,
    isScheduled: checkIsScheduled,
  };
}

