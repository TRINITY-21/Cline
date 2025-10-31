import { initFirebaseAdmin } from '@/lib/firebase';
import { promises as fs } from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

export const revalidate = 0;

function auth(req: NextRequest): boolean {
  const token = req.headers.get('x-internal-token');
  const expected = process.env.NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN;
  return !!expected && token === expected;
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = initFirebaseAdmin();
  const col = admin.firestore().collection(process.env.PREDICTIONS_COLLECTION || 'predictions');
  const qs = await col.orderBy('updatedAt', 'desc').limit(2000).get();
  const rows = qs.docs.map(d => ({ id: d.id, ...(d.data() || {}) }));
  return NextResponse.json({ total: rows.length, rows });
}

// POST: import predictions from body { items: [...] } or data/predictions.json
export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = initFirebaseAdmin();
  const col = admin.firestore().collection(process.env.PREDICTIONS_COLLECTION || 'predictions');
  let items: any[] | null = null;
  try {
    const body = await req.json().catch(() => null as any);
    if (body && Array.isArray(body.items)) items = body.items;
  } catch {}
  if (!items) {
    try {
      const file = path.join(process.cwd(), 'data', 'predictions.json');
      const raw = await fs.readFile(file, 'utf-8');
      items = JSON.parse(raw || '[]');
    } catch {
      items = [];
    }
  }
  const itemsArray = items || [];
  const now = new Date().toISOString();
  const batch = admin.firestore().batch();
  for (const m of itemsArray) {
    const id = String(m.id || m.gameId || '');
    if (!id) continue;
    const ref = col.doc(id);
    batch.set(ref, { ...m, approved: false, updatedAt: now }, { merge: true });
  }
  await batch.commit();
  return NextResponse.json({ ok: true, imported: itemsArray.length });
}


