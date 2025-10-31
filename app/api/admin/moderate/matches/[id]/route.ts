import { initFirebaseAdmin } from '@/lib/firebase';
import { NextRequest, NextResponse } from 'next/server';

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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = initFirebaseAdmin();
  const body = await req.json().catch(() => ({}));
  const { approved, override } = body || {};
  const now = new Date().toISOString();
  
  // Update in daily_matches
  try {
    const dateId = todayId();
    const COLLECTION = process.env.DAILY_MATCHES_COLLECTION || process.env.NEXT_PUBLIC_DAILY_MATCHES_COLLECTION || 'daily_matches';
    const dailyRef = admin.firestore().collection(COLLECTION).doc(dateId);
    const snap = await dailyRef.get();
    if (snap.exists) {
      const data = snap.data();
      const matches = Array.isArray(data?.matches) ? data.matches : [];
      let updated = false;
      for (let i = 0; i < matches.length; i++) {
        if (matches[i]?.id === params.id) {
          if (approved !== undefined) matches[i].approved = approved;
          if (override) Object.assign(matches[i], override);
          matches[i].updatedAt = now;
          updated = true;
          break;
        }
      }
      if (updated) {
        await dailyRef.set({ id: dateId, matches, updatedAt: now }, { merge: true });
      }
    }
  } catch (err) {
    console.error('Failed to update daily_matches:', err);
    return NextResponse.json({ error: 'Failed to update match' }, { status: 500 });
  }
  
  return NextResponse.json({ ok: true });
}


