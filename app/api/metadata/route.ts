import { fetchPageMetadata } from '@/lib/metadata';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }
  try {
    const meta = await fetchPageMetadata(url);
    return NextResponse.json(meta, { status: 200, headers: { 'cache-control': 's-maxage=600, stale-while-revalidate=300' } });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch metadata' }, { status: 500 });
  }
}