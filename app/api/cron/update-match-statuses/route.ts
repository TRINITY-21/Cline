import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 0;

// Cron endpoint to update match statuses
// Can be called by Vercel Cron, GitHub Actions, external cron services, or manually
export async function GET(req: NextRequest) {
  try {
    // Vercel Cron automatically provides a secret header - check it if available
    const cronSecret = req.headers.get('authorization');
    const expectedCronSecret = process.env.NEXT_PUBLIC_CRON_SECRET;
    
    // If CRON_SECRET is set, verify it (for Vercel Cron or manual calls)
    if (expectedCronSecret && cronSecret !== `Bearer ${expectedCronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Call the batch update endpoint directly (no need for separate HTTP call)
    // Import the function logic or call it directly
    const token = process.env.NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN || '';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    
    const updateUrl = `${baseUrl}/api/admin/matches/update-status-batch`;
    const response = await fetch(updateUrl, {
      method: 'POST',
      headers: {
        'x-internal-token': token,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Update failed: ${error}`);
    }

    const data = await response.json();
    return NextResponse.json({ 
      ok: true, 
      message: 'Match statuses updated',
      ...data 
    });
  } catch (err: any) {
    console.error('Cron job error:', err);
    return NextResponse.json({ 
      error: 'Failed to update match statuses', 
      message: err?.message || String(err) 
    }, { status: 500 });
  }
}

