import { initFirebaseAdmin } from '@/lib/firebase';
import { statusFromLiveWindow } from '@/lib/utils';
import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 0;

function auth(req: NextRequest): boolean {
  const token = req.headers.get('x-internal-token');
  const expected = process.env.NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN;
  return !!expected && token === expected;
}

function todayId(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// POST: Batch update match statuses based on time
// This checks all matches and updates their status to 'ended' if they've passed their end time
export async function POST(req: NextRequest) {
  try {
    if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = initFirebaseAdmin();
    const dateId = todayId();
    const COLLECTION = process.env.DAILY_MATCHES_COLLECTION || process.env.NEXT_PUBLIC_DAILY_MATCHES_COLLECTION || 'daily_matches';
    const ref = admin.firestore().collection(COLLECTION).doc(dateId);
    
    // Get existing document
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ ok: true, updated: 0, message: 'No matches found for today' });
    }

    const existing = snap.data() || {};
    const list: any[] = Array.isArray(existing.matches) ? existing.matches : [];
    
    let updated = 0;
    const now = new Date().toISOString();
    const batch = admin.firestore().batch();
    const mainCol = admin.firestore().collection(process.env.NEXT_PUBLIC_MATCHES_COLLECTION || 'matches');
    
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
      } else if (calculatedStatus === 'live' && match.status !== 'live') {
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
        console.error('Failed to update main matches collection:', err);
      }
    }

    // Save updated matches back to daily_matches
    if (updated > 0) {
      await ref.set({ id: dateId, matches: list, updatedAt: now }, { merge: true });
    }
    
    return NextResponse.json({ ok: true, updated, total: list.length });
  } catch (err: any) {
    console.error('Error updating match statuses:', err);
    return NextResponse.json({ 
      error: 'Failed to update match statuses', 
      message: err?.message || String(err) 
    }, { status: 500 });
  }
}

