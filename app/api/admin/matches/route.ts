import { getStorageAdapter, readUnifiedMatches, VideoSrcRecord } from '@/lib/storage';
import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 0;

export async function GET(_req: NextRequest) {
  const storage = getStorageAdapter();
  const [unified, stored] = await Promise.all([
    readUnifiedMatches(),
    storage.list().catch(() => [] as VideoSrcRecord[]),
  ]);

  const idToStore: Record<string, VideoSrcRecord> = {};
  for (const rec of stored) idToStore[rec.matchId] = rec;

  const rows = unified.map((m) => {
    const s = idToStore[m.id];
    const unifiedVideoSrc = m.videoSrc || '';
    const storeVideoSrc = s?.videoSrc || '';
    const storeStatus = s?.status || 'pending';
    const effectiveVideoSrc = storeStatus === 'ready' && storeVideoSrc ? storeVideoSrc : unifiedVideoSrc;
    // Handle league (always an object with optional name in UnifiedMatch type)
    const leagueName = (m.league as { name?: string } | undefined)?.name || '';
    return {
      id: m.id,
      sport: m.sport,
      league: leagueName,
      home: m.home?.name || '',
      away: m.away?.name || '',
      timeLabel: m.timeLabel || '',
      unifiedVideoSrc,
      storeVideoSrc,
      storeStatus,
      effectiveVideoSrc,
      onSite: !!unifiedVideoSrc,
    };
  });

  return NextResponse.json({
    total: rows.length,
    withUnified: rows.filter(r => r.unifiedVideoSrc).length,
    withStore: rows.filter(r => r.storeStatus === 'ready' && r.storeVideoSrc).length,
    rows,
  });
}


