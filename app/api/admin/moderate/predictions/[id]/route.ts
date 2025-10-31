import { initFirebaseAdmin } from '@/lib/firebase';
import { NextRequest, NextResponse } from 'next/server';

function auth(req: NextRequest): boolean {
  const token = req.headers.get('x-internal-token');
  const expected = process.env.NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN;
  return !!expected && token === expected;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = initFirebaseAdmin();
  const col = admin.firestore().collection(process.env.PREDICTIONS_COLLECTION || 'predictions');
  const body = await req.json().catch(() => ({}));
  const { approved, override } = body || {};
  const now = new Date().toISOString();
  await col.doc(params.id).set({ ...(override || {}), approved: !!approved, updatedAt: now }, { merge: true });
  return NextResponse.json({ ok: true });
}


