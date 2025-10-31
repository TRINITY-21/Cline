import { initFirebaseAdmin } from '@/lib/firebase';
import { NextRequest, NextResponse } from 'next/server';

function auth(req: NextRequest): boolean {
  const token = req.headers.get('x-internal-token');
  const expected = process.env.NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN;
  return !!expected && token === expected;
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const admin = initFirebaseAdmin();
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || (admin.app().options?.projectId as string | undefined);
    // write/read a diag doc
    const col = admin.firestore().collection('_diag');
    const now = new Date().toISOString();
    const ref = col.doc('connectivity');
    await ref.set({ ok: true, at: now }, { merge: true });
    const snap = await ref.get();
    const data = snap.data() || {};
    return NextResponse.json({ ok: true, projectId, wroteAt: now, readBack: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}


