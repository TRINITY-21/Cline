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

export async function GET() {
  const useFirestore = (process.env.MATCHES_STORAGE || process.env.NEXT_PUBLIC_MATCHES_STORAGE) === 'firestore';
  if (useFirestore) {
    try {
      const admin = initFirebaseAdmin();
      const colName = process.env.MATCHES_COLLECTION || process.env.NEXT_PUBLIC_MATCHES_COLLECTION || 'matches';
      // Avoid composite index by not ordering; add index if you need order.
      const qs = await admin.firestore().collection(colName).where('approved', '==', true).limit(1000).get();
      const rows = qs.docs.map(d => ({ id: d.id, ...(d.data() || {}) }));
      return NextResponse.json(withAutoEndedStatus(rows));
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


