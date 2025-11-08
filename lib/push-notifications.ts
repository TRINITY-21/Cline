/**
 * Push Notification utilities using Firebase Cloud Messaging (FCM)
 */

// Firebase config - you'll need to add this to your .env
function getFirebaseConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

function getVapidKey(): string | undefined {
  return process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
}

/**
 * Initialize Firebase Messaging (client-side only)
 */
export async function initializeFirebaseMessaging(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    const { initializeApp, getApps } = await import('firebase/app');
    const { isSupported } = await import('firebase/messaging');

    // Check if messaging is supported
    const supported = await isSupported();
    if (!supported) {
      console.warn('Firebase Messaging is not supported in this browser');
      return false;
    }

    // Initialize Firebase if not already initialized
    const config = getFirebaseConfig();
    if (getApps().length === 0 && config.apiKey) {
      initializeApp(config);
    }

    return true;
  } catch (error) {
    console.error('Error initializing Firebase Messaging:', error);
    return false;
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Get FCM token for push notifications
 */
export async function getFCMToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  try {
    const { getMessaging, getToken } = await import('firebase/messaging');
    const { getApps } = await import('firebase/app');
    
    // Ensure Firebase is initialized
    if (getApps().length === 0) {
      const initialized = await initializeFirebaseMessaging();
      if (!initialized) return null;
    }

    const messaging = getMessaging();
    const vapidKey = getVapidKey();

    if (!vapidKey) {
      console.warn('VAPID key not configured');
      return null;
    }

    // Get registration token
    const token = await getToken(messaging, {
      vapidKey,
    });

    if (token) {
      console.log('FCM Token obtained');
      return token;
    } else {
      console.warn('No registration token available');
      return null;
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

/**
 * Subscribe to match reminders
 */
export async function subscribeToMatchReminders(matchId: string, matchTime: string): Promise<boolean> {
  try {
    const token = await getFCMToken();
    if (!token) {
      console.error('No FCM token available');
      return false;
    }

    // Save subscription to your backend/Firestore
    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        matchId,
        matchTime,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error subscribing to match reminders:', error);
    return false;
  }
}

/**
 * Unsubscribe from match reminders
 */
export async function unsubscribeFromMatchReminders(matchId: string): Promise<boolean> {
  try {
    const token = await getFCMToken();
    if (!token) {
      return false;
    }

    const response = await fetch('/api/notifications/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        matchId,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error unsubscribing from match reminders:', error);
    return false;
  }
}

/**
 * Set up foreground message handler
 */
export async function setupForegroundMessageHandler(
  onMessageCallback: (payload: unknown) => void
): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const { getMessaging, onMessage } = await import('firebase/messaging');
    const { getApps } = await import('firebase/app');
    
    // Ensure Firebase is initialized
    if (getApps().length === 0) {
      const initialized = await initializeFirebaseMessaging();
      if (!initialized) return;
    }

    const messaging = getMessaging();

    onMessage(messaging, (payload) => {
      console.log('Message received in foreground:', payload);
      onMessageCallback(payload);
    });
  } catch (error) {
    console.error('Error setting up foreground message handler:', error);
  }
}

