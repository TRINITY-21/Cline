import { defaultTtlMsForSource, getStorageAdapter, isExpired, VideoSrcRecord } from '@/lib/storage';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/videosrc/[matchId]
export async function GET(_req: NextRequest, { params }: { params: { matchId: string } }) {
  const storage = getStorageAdapter();
  const matchId = params.matchId;

  const rec = await storage.get(matchId);
  if (!rec) {
    return NextResponse.json({ status: 'pending' }, { status: 200 });
  }

  if (rec.status === 'ready' && !isExpired(rec.expiresAt)) {
    return NextResponse.json({ status: rec.status, videoSrc: rec.videoSrc }, { status: 200 });
  }

  // If expired or not ready, signal pending
  return NextResponse.json({ status: 'pending' }, { status: 200 });
}

// POST /api/videosrc/[matchId]
// Body: { videoSrc?: string, source?: string, status: 'ready'|'pending'|'error', ttlMs?: number, errorMessage?: string }
// Protected by header `x-internal-token`
export async function POST(req: NextRequest, { params }: { params: { matchId: string } }) {
  try {
    const token = req.headers.get('x-internal-token');
    const expected = process.env.NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN;
    if (!expected || token !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const matchId = params.matchId;
    const storage = getStorageAdapter();

    const now = Date.now();
    const ttlMs: number = typeof body.ttlMs === 'number' ? body.ttlMs : defaultTtlMsForSource(body.source);
    const expiresAtIso = new Date(now + Math.max(0, ttlMs)).toISOString();

    // Build update and strip undefined fields to satisfy Firestore
    const update: Partial<VideoSrcRecord> & { matchId: string } = {
      matchId,
      videoSrc: body.videoSrc ?? undefined,
      source: body.source ?? undefined,
      status: body.status ?? 'pending',
      errorMessage: body.errorMessage ?? undefined,
      expiresAt: (body.status === 'ready') ? expiresAtIso : null,
    };
    Object.keys(update).forEach(k => (update as any)[k] === undefined && delete (update as any)[k]);

    await storage.upsert(matchId, update);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error('videosrc upsert failed:', err);
    return NextResponse.json({ error: 'Failed to save videoSrc', message: err?.message || String(err) }, { status: 500 });
  }
}


