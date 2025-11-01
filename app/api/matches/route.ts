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
      // If status is already 'ended', keep it
      if (!tl || status === 'ended') return m;
      // Use the proper statusFromLiveWindow function that handles timezone conversion
      const calculatedStatus = statusFromLiveWindow(tl, 120);
      // Only override if the calculated status is different and more definitive
      if (calculatedStatus === 'ended' && status !== 'ended') {
        return { ...m, status: 'ended' };
      }
      // If calculated status is 'live' or 'upcoming', preserve existing status unless it conflicts
      if (calculatedStatus === 'live' && status !== 'ended') {
        return { ...m, status: 'live' };
      }
      if (calculatedStatus === 'upcoming' && status !== 'ended' && status !== 'live') {
        return { ...m, status: 'upcoming' };
      }
      return m;
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


