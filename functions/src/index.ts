import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

// Initialize Firebase Admin
admin.initializeApp();

// Helper function to get today's date ID using local timezone
function todayId(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Helper function to calculate status from time window
function statusFromLiveWindow(timeLabel: string, windowMinutes: number = 120): 'live' | 'upcoming' | 'ended' {
  if (!timeLabel) return 'upcoming';
  
  const match = timeLabel.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return 'upcoming';
  
  const hh = parseInt(match[1], 10);
  const mm = parseInt(match[2], 10);
  if (Number.isNaN(hh) || Number.isNaN(mm) || hh >= 24 || mm >= 60) return 'upcoming';
  
  const now = new Date();
  const kickoff = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
  const end = new Date(kickoff.getTime() + Math.max(0, windowMinutes) * 60 * 1000);
  
  if (now.getTime() < kickoff.getTime()) return 'upcoming';
  if (now.getTime() < end.getTime()) return 'live';
  return 'ended';
}

/**
 * Scheduled function that updates match statuses every 5 minutes
 * Runs automatically to update matches from 'upcoming'/'live' to 'ended'
 */
export const updateMatchStatuses = functions
  .region('us-central1') // Change to your preferred region
  .pubsub
  .schedule('every 5 minutes')
  .timeZone('UTC')
  .onRun(async (context) => {
    try {
      const db = admin.firestore();
      const dateId = todayId();
      const COLLECTION = process.env.DAILY_MATCHES_COLLECTION || 'daily_matches';
      const ref = db.collection(COLLECTION).doc(dateId);
      
      // Get existing document
      const snap = await ref.get();
      if (!snap.exists) {
        return null;
      }

      const existing = snap.data() || {};
      const list: any[] = Array.isArray(existing.matches) ? existing.matches : [];
      
      let updated = 0;
      const now = new Date().toISOString();
      const batch = db.batch();
      const mainCol = db.collection(process.env.MATCHES_COLLECTION || 'matches');
      
      // Check and update each match
      for (let i = 0; i < list.length; i++) {
        const match = list[i];
        if (!match || !match.id || match.status === 'ended') continue;
        
        const timeLabel = match.timeLabel || '';
        if (!timeLabel) continue;
        
        // Determine status based on time (120 minutes window for live matches)
        const calculatedStatus = statusFromLiveWindow(timeLabel, 120);
        
        // If the match should be ended, update it
        if (calculatedStatus === 'ended' && match.status !== 'ended') {
          list[i].status = 'ended';
          list[i].updatedAt = now;
          updated++;
          
          // Also update in main matches collection
          const matchRef = mainCol.doc(match.id);
          batch.set(matchRef, { status: 'ended', updatedAt: now }, { merge: true });
        } else if (calculatedStatus === 'live' && match.status !== 'live' && match.status !== 'ended') {
          // Optionally update to 'live' if it's in the live window
          list[i].status = 'live';
          list[i].updatedAt = now;
          updated++;
          
          const matchRef = mainCol.doc(match.id);
          batch.set(matchRef, { status: 'live', updatedAt: now }, { merge: true });
        }
      }

      // Commit batch updates to main collection
      if (updated > 0) {
        try {
          await batch.commit();
        } catch (err) {
        }
      }

      // Save updated matches back to daily_matches
      if (updated > 0) {
        await ref.set({ id: dateId, matches: list, updatedAt: now }, { merge: true });
      } else {
      }
      
      return null;
    } catch (error) {
      throw error;
    }
  });

