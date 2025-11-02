import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 0;

// Cron endpoint to scrape and update results every 3 hours
// Can be called by Vercel Cron, GitHub Actions, external cron services, or manually
// 
// Note: In serverless environments (Vercel), Python scripts cannot run directly.
// This endpoint serves as a webhook that can trigger external services.
// For production, use GitHub Actions workflow (.github/workflows/update-results.yml)
// which runs every 3 hours and handles the actual scraping.
export async function GET(req: NextRequest) {
  try {
    // Vercel Cron automatically provides a secret header - check it if available
    const cronSecret = req.headers.get('authorization');
    const expectedCronSecret = process.env.NEXT_PUBLIC_CRON_SECRET;
    
    // If CRON_SECRET is set, verify it (for Vercel Cron or manual calls)
    if (expectedCronSecret && cronSecret !== `Bearer ${expectedCronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In serverless environments, we can't run Python scripts directly
    // This endpoint serves as a webhook that can trigger GitHub Actions or external services
    // The actual scraping and updating is handled by:
    // 1. GitHub Actions workflow (.github/workflows/update-results.yml) - runs every 3 hours
    // 2. External cron service calling scripts/scrape-and-update-results.sh
    // 3. Manual execution of the script
    
    return NextResponse.json({ 
      ok: true,
      message: 'Results update cron endpoint triggered',
      note: 'This endpoint is for cron/webhook integration. The actual scraping is done via GitHub Actions workflow (.github/workflows/update-results.yml) which runs every 3 hours.',
      workflow: 'See .github/workflows/update-results.yml for the actual scraping and update logic'
    });
  } catch (err: any) {
    return NextResponse.json({ 
      error: 'Failed to process request', 
      message: err?.message || String(err) 
    }, { status: 500 });
  }
}

