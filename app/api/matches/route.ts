import { initFirebaseAdmin } from '@/lib/firebase';
import { promises as fs } from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';

export const revalidate = 0; // always fresh

function withAutoEndedStatus(rows: any[]): any[] {
  try {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return (rows || []).map((m: any) => {
      const tl: string = (m?.timeLabel || '').trim();
      const status: string = m?.status || '';
      if (!tl || status === 'ended') return m;
      const match = tl.match(/^(\d{1,2}):(\d{2})$/);
      if (!match) return m;
      const hh = Math.min(23, Math.max(0, parseInt(match[1], 10)));
      const mm = Math.min(59, Math.max(0, parseInt(match[2], 10)));
      const kickoffMinutes = hh * 60 + mm;
      const diffMinutes = nowMinutes - kickoffMinutes;
      if (diffMinutes >= 120) {
        return { ...m, status: 'ended' };
      }
      return m;
    });
  } catch {
    return rows;
  }
}

function todayId(): string {
  const d = new Date();
  // Use GMT+3 timezone (add 3 hours to UTC)
  const gmtPlus3 = new Date(d.getTime() + 3 * 60 * 60 * 1000);
  const yyyy = gmtPlus3.getUTCFullYear();
  const mm = String(gmtPlus3.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(gmtPlus3.getUTCDate()).padStart(2, '0');
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


