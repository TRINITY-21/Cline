import { initFirebaseAdmin } from '@/lib/firebase';
import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 0;

function auth(req: NextRequest): boolean {
  const token = req.headers.get('x-internal-token');
  const expected = process.env.NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN;
  return !!expected && token === expected;
}

const COLLECTION = process.env.DAILY_MATCHES_COLLECTION || process.env.NEXT_PUBLIC_DAILY_MATCHES_COLLECTION || 'daily_matches';

// GET returns { id, matches: [...] } for the given date; if missing, {} with matches: []
export async function GET(_req: NextRequest, { params }: { params: { date: string } }) {
  const admin = initFirebaseAdmin();
  const ref = admin.firestore().collection(COLLECTION).doc(params.date);
  const snap = await ref.get();
  const data = snap.exists ? (snap.data() || {}) : {};
  return NextResponse.json({ id: params.date, matches: data.matches || [] });
}

// POST replaces the entire matches array: { matches: UnifiedMatch[] }
export async function POST(req: NextRequest, { params }: { params: { date: string } }) {
  try {
    if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const items = Array.isArray(body.matches) ? body.matches : [];
    const admin = initFirebaseAdmin();
    const ref = admin.firestore().collection(COLLECTION).doc(params.date);
    const now = new Date().toISOString();
    await ref.set({ id: params.date, matches: items, updatedAt: now }, { merge: true });
    return NextResponse.json({ ok: true, count: items.length });
  } catch (err: any) {
    console.error(`Error saving matches for date ${params.date}:`, err);
    return NextResponse.json({ 
      error: 'Failed to save matches', 
      message: err?.message || String(err) 
    }, { status: 500 });
  }
}

// PATCH upserts a single match object by id inside the array
// Body: { match: UnifiedMatch }
export async function PATCH(req: NextRequest, { params }: { params: { date: string } }) {
  try {
    if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const match = body.match;
    if (!match || !match.id) return NextResponse.json({ error: 'Missing match.id' }, { status: 400 });
    const admin = initFirebaseAdmin();
    const ref = admin.firestore().collection(COLLECTION).doc(params.date);
    const snap = await ref.get();
    const existing = (snap.exists ? (snap.data() || {}) : {}) as any;
    const list: any[] = Array.isArray(existing.matches) ? existing.matches : [];
    const idx = list.findIndex((m: any) => m && m.id === match.id);
    if (idx >= 0) list[idx] = match; else list.push(match);
    const now = new Date().toISOString();
    await ref.set({ id: params.date, matches: list, updatedAt: now }, { merge: true });
    return NextResponse.json({ ok: true, count: list.length });
  } catch (err: any) {
    console.error(`Error upserting match for date ${params.date}:`, err);
    return NextResponse.json({ 
      error: 'Failed to save match', 
      message: err?.message || String(err) 
    }, { status: 500 });
  }
}


