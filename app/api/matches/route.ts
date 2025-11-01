import { initFirebaseAdmin } from '@/lib/firebase';
import { statusFromLiveWindow } from '@/lib/utils';
import { promises as fs } from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';

export const revalidate = 0; // always fresh

function withAutoEndedStatus(rows: any[]): any[] {
  try {
    return (rows || []).map((m: any) => {
      const tl: string = (m?.timeLabel || '').trim();
      const status: string = m?.status || '';
      
      // If no timeLabel, return as-is
      if (!tl) return m;
      
      // Use longer window (180 minutes) for live status calculation
      // Only mark as 'ended' if it's been a very long time (6+ hours)
      const calculatedStatusNormal = statusFromLiveWindow(tl, 180);
      const calculatedStatusExtended = statusFromLiveWindow(tl, 360); // 6 hour window
      
      // If status is already 'ended', check if it should actually be live/upcoming
      // This allows us to "fix" incorrectly marked ended matches
      if (status === 'ended') {
        // Only keep 'ended' if it's been 6+ hours, otherwise override to live
        if (calculatedStatusExtended !== 'ended') {
          // Match shouldn't be ended yet, override to calculated status
          return { ...m, status: calculatedStatusNormal };
        }
        // Keep as ended if it's really been 6+ hours
        return m;
      }
      
      // No explicit 'ended' status - use calculated status
      let finalStatus = status;
      if (calculatedStatusExtended === 'ended' && status !== 'ended') {
        finalStatus = 'ended';
      } else if (calculatedStatusNormal === 'live' && status !== 'ended') {
        finalStatus = 'live';
      } else if (calculatedStatusNormal === 'upcoming' && status !== 'ended' && status !== 'live') {
        finalStatus = 'upcoming';
      }
      
      return { ...m, status: finalStatus };
    });
  } catch {
    return rows;
  }
}

function todayId(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export async function GET() {
  const useFirestore = (process.env.MATCHES_STORAGE || process.env.NEXT_PUBLIC_MATCHES_STORAGE) === 'firestore';
  if (useFirestore) {
    try {
      const admin = initFirebaseAdmin();
      const dailyCol = admin.firestore().collection(
        process.env.DAILY_MATCHES_COLLECTION || process.env.NEXT_PUBLIC_DAILY_MATCHES_COLLECTION || 'daily_matches'
      );
      
      // Get today's matches
      const today = todayId();
      const todayDoc = await dailyCol.doc(today).get();
      
      if (todayDoc.exists) {
        const data = todayDoc.data();
        const matches = Array.isArray(data?.matches) ? data.matches : [];
        // Filter approved matches only
        const approved = matches.filter((m: any) => m?.approved === true);
        return NextResponse.json(withAutoEndedStatus(approved));
      }
      
      // If today doesn't exist, return empty array
      return NextResponse.json([]);
    } catch (err: any) {
      return NextResponse.json({ error: 'Failed to read matches (firestore)' }, { status: 500 });
    }
  } else {
    try {
      const filePath = path.join(process.cwd(), 'data', 'unified_matches.json');
      const raw = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(raw || '[]');
      return NextResponse.json(withAutoEndedStatus(data));
    } catch (err: any) {
      return NextResponse.json({ error: 'Failed to read matches' }, { status: 500 });
    }
  }
}


