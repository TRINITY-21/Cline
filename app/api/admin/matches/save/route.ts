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

// POST: Save a single match to today's daily_matches document (add to array, don't overwrite)
export async function POST(req: NextRequest) {
  try {
    if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const body = await req.json().catch(() => ({}));
    const match = body.match;
    if (!match || !match.id) {
      return NextResponse.json({ error: 'Missing match.id' }, { status: 400 });
    }

    const admin = initFirebaseAdmin();
    const dateId = todayId();
    const COLLECTION = process.env.DAILY_MATCHES_COLLECTION || process.env.NEXT_PUBLIC_DAILY_MATCHES_COLLECTION || 'daily_matches';
    const ref = admin.firestore().collection(COLLECTION).doc(dateId);
    
    // Get existing document
    const snap = await ref.get();
    const existing = (snap.exists ? (snap.data() || {}) : {}) as any;
    const list: any[] = Array.isArray(existing.matches) ? existing.matches : [];
    
    // Check if match already exists
    const idx = list.findIndex((m: any) => m && m.id === match.id);
    
    // Prepare match with timestamps
    const now = new Date().toISOString();
    const matchToSave = {
      ...match,
      updatedAt: now,
      createdAt: match.createdAt || now,
    };

    if (idx >= 0) {
      // Update existing match
      list[idx] = matchToSave;
    } else {
      // Add new match
      list.push(matchToSave);
    }

    // Save back to Firestore (merge to preserve other fields)
    await ref.set({ id: dateId, matches: list, updatedAt: now }, { merge: true });
    
    return NextResponse.json({ ok: true, count: list.length, matchId: match.id });
  } catch (err: any) {
    console.error('Error saving match to daily_matches:', err);
    return NextResponse.json({ 
      error: 'Failed to save match', 
      message: err?.message || String(err) 
    }, { status: 500 });
  }
}

