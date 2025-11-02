import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 0;

// Cron endpoint to scrape and import predictions daily
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

    // Get base URL and token
    const token = process.env.NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN || '';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    
    // Call the import endpoint which will handle scraping internally
    // Note: This requires the scraping to be done separately, or we could call an external scraper
    // For now, we'll expect the scraping to be done by GitHub Actions or a local cron job
    // This endpoint mainly serves as a webhook that can trigger the import if data is already scraped
    
    return NextResponse.json({ 
      ok: true, 
      message: 'Predictions scraping endpoint. Use GitHub Actions workflow or run the script directly.',
      note: 'This endpoint is for webhook/cron integration. The actual scraping is done via scripts/scrape_betistuta_over35.py'
    });
  } catch (err: any) {
    return NextResponse.json({ 
      error: 'Failed to process request', 
      message: err?.message || String(err) 
    }, { status: 500 });
  }
}

