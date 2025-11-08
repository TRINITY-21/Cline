import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 0;

// Cron endpoint to scrape and update results (subtle patterns with results) every 3 hours
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

    // Get today's date in DD-MM-YYYY format
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const dateStr = `${dd}-${mm}-${yyyy}`;

    // Get base URL and token
    const token = process.env.NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN || '';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3001');
    
    // Call the import-subtle-patterns endpoint with type "results"
    const importUrl = `${baseUrl}/api/admin/over-predictions/import-subtle-patterns`;
    
    try {
      const response = await fetch(importUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': token,
        },
        body: JSON.stringify({
          date: dateStr,
          type: 'results',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return NextResponse.json({ 
          error: 'Failed to import results',
          details: result 
        }, { status: response.status });
      }

      return NextResponse.json({ 
        ok: true,
        message: 'Successfully imported subtle patterns (results)',
        date: dateStr,
        result: result
      });
    } catch (fetchError: any) {
      return NextResponse.json({ 
        error: 'Failed to call import endpoint',
        details: fetchError?.message || String(fetchError)
      }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ 
      error: 'Failed to process request', 
      message: err?.message || String(err) 
    }, { status: 500 });
  }
}

