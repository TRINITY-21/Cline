import { initFirebaseAdmin } from '@/lib/firebase';
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

// PATCH: Update approve/trending status for matches in daily_matches
export async function PATCH(req: NextRequest) {
  try {
    if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const body = await req.json().catch(() => ({}));
    const { matchIds, approved, trending, isTrending } = body;
    
    if (!Array.isArray(matchIds) || matchIds.length === 0) {
      return NextResponse.json({ error: 'matchIds must be a non-empty array' }, { status: 400 });
    }

    const trendingValue = (isTrending !== undefined) ? isTrending : trending;
    if (approved === undefined && trendingValue === undefined) {
      return NextResponse.json({ error: 'Must provide approved or trending' }, { status: 400 });
    }

    const admin = initFirebaseAdmin();
    const dateId = todayId();
    const COLLECTION = process.env.DAILY_MATCHES_COLLECTION || process.env.NEXT_PUBLIC_DAILY_MATCHES_COLLECTION || 'daily_matches';
    const ref = admin.firestore().collection(COLLECTION).doc(dateId);
    
    // Get existing document
    const snap = await ref.get();
    const existing = (snap.exists ? (snap.data() || {}) : {}) as any;
    const list: any[] = Array.isArray(existing.matches) ? existing.matches : [];
    
    let updated = 0;
    const now = new Date().toISOString();
    
    // Update matches
    for (let i = 0; i < list.length; i++) {
      if (matchIds.includes(list[i]?.id)) {
        if (approved !== undefined) {
          list[i].approved = approved;
        }
        if (trendingValue !== undefined) {
          list[i].isTrending = trendingValue;
        }
        list[i].updatedAt = now;
        updated++;
      }
    }


    // Save back to daily_matches
    await ref.set({ id: dateId, matches: list, updatedAt: now }, { merge: true });
    
    return NextResponse.json({ ok: true, updated });
  } catch (err: any) {
    return NextResponse.json({ 
      error: 'Failed to update match status', 
      message: err?.message || String(err) 
    }, { status: 500 });
  }
}

