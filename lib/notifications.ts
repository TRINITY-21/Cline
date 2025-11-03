/**
 * Match Notifications System
 * Browser notification API for match reminders
 */

export interface NotificationSchedule {
  matchId: string;
  title: string;
  homeTeam: string;
  awayTeam: string;
  league?: string;
  scheduledTime: number; // Unix timestamp in milliseconds
  notificationId?: string; // Browser notification ID for cancellation
  createdAt: string; // ISO timestamp
}

const NOTIFICATIONS_STORAGE_KEY = 'match_notifications';
const NOTIFICATION_PERMISSION_KEY = 'notification_permission_asked';

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

/**
 * Check if notifications are supported
 */
export function isNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window;
}

/**
 * Check notification permission status
 */
export function getNotificationPermission(): NotificationPermission | null {
  if (!isNotificationSupported()) return null;
  return Notification.permission;
}

/**
 * Mark that we've asked for permission
 */
export function setPermissionAsked(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'true');
}

/**
 * Check if we've already asked for permission
 */
export function hasAskedPermission(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(NOTIFICATION_PERMISSION_KEY) === 'true';
}

/**
 * Get all scheduled notifications
 */
export function getScheduledNotifications(): NotificationSchedule[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Save scheduled notifications
 */
function saveScheduledNotifications(notifications: NotificationSchedule[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
    window.dispatchEvent(new CustomEvent('notificationsUpdated'));
  } catch (error) {
    console.error('Failed to save notifications:', error);
  }
}

/**
 * Schedule a notification for a match
 */
export function scheduleNotification(schedule: Omit<NotificationSchedule, 'createdAt' | 'notificationId'>): string | null {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return null;
  }

  const notifications = getScheduledNotifications();
  
  // Check if already scheduled
  const exists = notifications.some(n => n.matchId === schedule.matchId);
  if (exists) {
    return null; // Already scheduled
  }

  const now = Date.now();
  const timeUntilMatch = schedule.scheduledTime - now;

  // Only schedule if match is in the future
  if (timeUntilMatch <= 0) {
    return null;
  }

  const notificationSchedule: NotificationSchedule = {
    ...schedule,
    notificationId: `match-${schedule.matchId}-${schedule.scheduledTime}`,
    createdAt: new Date().toISOString(),
  };

  notifications.push(notificationSchedule);
  saveScheduledNotifications(notifications);

  // Schedule the browser notification
  const timeoutId = setTimeout(() => {
    showMatchNotification(notificationSchedule);
    // Remove after showing
    cancelNotification(schedule.matchId);
  }, timeUntilMatch);

  // Store timeout ID (we'll store it in the notification object)
  // Note: We can't persist timeout IDs across page reloads, so we'll recalculate on page load
  return notificationSchedule.notificationId;
}

/**
 * Cancel a scheduled notification
 */
export function cancelNotification(matchId: string): boolean {
  const notifications = getScheduledNotifications();
  const filtered = notifications.filter(n => n.matchId !== matchId);
  
  if (filtered.length === notifications.length) {
    return false; // Not found
  }

  saveScheduledNotifications(filtered);
  return true;
}

/**
 * Check if a match has a notification scheduled
 */
export function isNotificationScheduled(matchId: string): boolean {
  const notifications = getScheduledNotifications();
  return notifications.some(n => n.matchId === matchId);
}

/**
 * Show a match notification immediately (for testing or live matches)
 */
export function showMatchNotification(schedule: NotificationSchedule): void {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }

  const options: NotificationOptions = {
    body: `${schedule.homeTeam} vs ${schedule.awayTeam}${schedule.league ? ` • ${schedule.league}` : ''}`,
    icon: '/three-two-logo.svg', // Your app icon
    badge: '/three-two-logo.svg',
    tag: schedule.matchId,
    requireInteraction: false,
    silent: false,
    timestamp: schedule.scheduledTime,
    vibrate: [200, 100, 200], // Vibration pattern for mobile
    data: {
      matchId: schedule.matchId,
      url: typeof window !== 'undefined' ? window.location.origin : '',
    },
  };

  try {
    const notification = new Notification(schedule.title, options);
    
    // Handle notification click
    notification.onclick = () => {
      window.focus();
      if (typeof window !== 'undefined' && window.location) {
        window.location.href = '/';
      }
      notification.close();
    };
  } catch (error) {
    console.error('Error showing notification:', error);
  }
}

/**
 * Re-register all notifications (call on page load)
 * This recreates notifications that were scheduled before page reload
 */
export function reRegisterNotifications(): void {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }

  const notifications = getScheduledNotifications();
  const now = Date.now();
  
  // Filter out past notifications and re-register future ones
  const validNotifications = notifications.filter(n => n.scheduledTime > now);
  const expiredNotifications = notifications.filter(n => n.scheduledTime <= now);

  if (expiredNotifications.length > 0) {
    // Remove expired notifications
    saveScheduledNotifications(validNotifications);
  }

  // Re-register valid notifications
  validNotifications.forEach(schedule => {
    const timeUntilMatch = schedule.scheduledTime - now;
    if (timeUntilMatch > 0) {
      setTimeout(() => {
        showMatchNotification(schedule);
        cancelNotification(schedule.matchId);
      }, timeUntilMatch);
    }
  });
}

/**
 * Clear all notifications
 */
export function clearAllNotifications(): void {
  saveScheduledNotifications([]);
}

/**
 * Parse time string to get scheduled time
 * Handles formats like "Today • 19:45", "19:45", "Tomorrow • 15:00", etc.
 */
export function parseMatchTime(timeString: string): number | null {
  if (!timeString) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Try to extract time (HH:MM format)
  const timeMatch = timeString.match(/(\d{1,2}):(\d{2})/);
  if (!timeMatch) return null;

  const hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);

  let scheduledDate = new Date(today);
  scheduledDate.setHours(hours, minutes, 0, 0);

  // Check if time is in the past (if so, assume it's tomorrow)
  if (scheduledDate.getTime() <= now.getTime()) {
    scheduledDate.setDate(scheduledDate.getDate() + 1);
  }

  // Check for "Today" or "Tomorrow" keywords
  const lowerTime = timeString.toLowerCase();
  if (lowerTime.includes('tomorrow')) {
    scheduledDate.setDate(scheduledDate.getDate() + 1);
  }

  // Subtract 15 minutes for notification (notify 15 min before match)
  scheduledDate.setMinutes(scheduledDate.getMinutes() - 15);

  return scheduledDate.getTime();
}

