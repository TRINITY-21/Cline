import { fetchTrendingMatches } from '@/lib/streamed';
import { NextResponse } from 'next/server';

export const revalidate = 300; // Cache for 5 minutes

export async function GET() {
  try {
    const matches = await fetchTrendingMatches();
    return NextResponse.json(matches);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch trending matches from Streamed API' },
      { status: 500 }
    );
  }
}

