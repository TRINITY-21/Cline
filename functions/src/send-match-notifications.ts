/**
 * Firebase Cloud Function to send match reminder notifications
 * 
 * This function should be scheduled to run every 15 minutes
 * It checks for matches starting in 15 minutes and sends notifications
 * 
 * Deploy with: firebase deploy --only functions:sendMatchNotifications
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

// Initialize Firebase Admin (already done in index.ts)
// admin.initializeApp();

/**
 * Send notifications for matches starting in 15 minutes
 */
export const sendMatchNotifications = functions.pubsub
  .schedule('every 15 minutes')
  .onRun(async (context) => {
    const db = admin.firestore();
    const messaging = admin.messaging();
    
    try {
      // Get current time and 15 minutes from now
      const now = new Date();
      const in15Minutes = new Date(now.getTime() + 15 * 60 * 1000);
      
      // Format times for matching (HH:MM format)
      const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const targetTimeStr = `${String(in15Minutes.getHours()).padStart(2, '0')}:${String(in15Minutes.getMinutes()).padStart(2, '0')}`;
      
      // Get all match reminders
      const remindersSnapshot = await db.collection('match_reminders').get();
      
      const notificationsToSend: Array<{
        tokens: string[];
        matchId: string;
        homeTeam: string;
        awayTeam: string;
        league?: string;
        matchTime: string;
      }> = [];
      
      for (const doc of remindersSnapshot.docs) {
        const data = doc.data();
        const matchTime = data.matchTime || '';
        
        // Check if match time matches target time (within 15-minute window)
        // Match time format: "HH:MM" or "Today • HH:MM"
        const timeMatch = matchTime.match(/(\d{1,2}):(\d{2})/);
        if (timeMatch) {
          const matchHour = parseInt(timeMatch[1], 10);
          const matchMinute = parseInt(timeMatch[2], 10);
          const matchTimeStr = `${String(matchHour).padStart(2, '0')}:${String(matchMinute).padStart(2, '0')}`;
          
          // Check if this match starts in ~15 minutes
          if (matchTimeStr === targetTimeStr || matchTimeStr === currentTimeStr) {
            const tokens = data.tokens || [];
            if (tokens.length > 0) {
              notificationsToSend.push({
                tokens,
                matchId: doc.id,
                homeTeam: data.homeTeam || 'Team 1',
                awayTeam: data.awayTeam || 'Team 2',
                league: data.league,
                matchTime: matchTimeStr,
              });
            }
          }
        }
      }
      
      // Send notifications
      let successCount = 0;
      let failureCount = 0;
      
      for (const notification of notificationsToSend) {
        try {
          const message = {
            notification: {
              title: `${notification.homeTeam} vs ${notification.awayTeam}`,
              body: `Match starts in 15 minutes! ${notification.league ? `(${notification.league})` : ''}`,
            },
            data: {
              matchId: notification.matchId,
              url: `/watch/${notification.matchId}`,
              type: 'match-reminder',
            },
            webpush: {
              notification: {
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-96x96.png',
                vibrate: [200, 100, 200],
              },
              fcmOptions: {
                link: `/watch/${notification.matchId}`,
              },
            },
            tokens: notification.tokens,
          };
          
          const response = await messaging.sendEachForMulticast(message);
          successCount += response.successCount;
          failureCount += response.failureCount;
          
          // Remove invalid tokens
          if (response.failureCount > 0) {
            const invalidTokens: string[] = [];
            response.responses.forEach((resp, idx) => {
              if (!resp.success && resp.error?.code === 'messaging/invalid-registration-token') {
                invalidTokens.push(notification.tokens[idx]);
              }
            });
            
            // Remove invalid tokens from Firestore
            if (invalidTokens.length > 0) {
              await db.collection('match_reminders').doc(notification.matchId).update({
                tokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens),
              });
            }
          }
        } catch (error) {
          console.error(`Error sending notification for match ${notification.matchId}:`, error);
          failureCount++;
        }
      }
      
      console.log(`Sent ${successCount} notifications, ${failureCount} failures`);
      return { success: successCount, failures: failureCount };
    } catch (error) {
      console.error('Error in sendMatchNotifications:', error);
      throw error;
    }
  });

/**
 * Send notification when match goes live
 * This can be triggered by your match scraping cron job
 */
export const sendLiveMatchNotification = functions.https.onCall(async (data, context) => {
  // Optional: Add auth check here
  // if (!context.auth) {
  //   throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  // }
  
  const { matchId, homeTeam, awayTeam, league } = data;
  
  if (!matchId) {
    throw new functions.https.HttpsError('invalid-argument', 'matchId is required');
  }
  
  const db = admin.firestore();
  const messaging = admin.messaging();
  
  try {
    const reminderDoc = await db.collection('match_reminders').doc(matchId).get();
    
    if (!reminderDoc.exists) {
      return { success: false, message: 'No reminders found for this match' };
    }
    
    const reminderData = reminderDoc.data();
    const tokens = reminderData?.tokens || [];
    
    if (tokens.length === 0) {
      return { success: false, message: 'No tokens found' };
    }
    
    const message = {
      notification: {
        title: `${homeTeam || 'Match'} vs ${awayTeam || 'Match'}`,
        body: `Match is now live! ${league ? `(${league})` : ''}`,
      },
      data: {
        matchId,
        url: `/watch/${matchId}`,
        type: 'match-live',
      },
      webpush: {
        notification: {
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-96x96.png',
          vibrate: [200, 100, 200],
        },
        fcmOptions: {
          link: `/watch/${matchId}`,
        },
      },
      tokens,
    };
    
    const response = await messaging.sendEachForMulticast(message);
    
    return {
      success: true,
      sent: response.successCount,
      failed: response.failureCount,
    };
  } catch (error) {
    console.error('Error sending live match notification:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send notification');
  }
});

