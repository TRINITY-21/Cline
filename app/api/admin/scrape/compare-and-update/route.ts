import { initFirebaseAdmin } from '@/lib/firebase';
import { translateMatches } from '@/lib/translate';
import type { UnifiedMatch } from '@/lib/types';
import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 0;

function auth(req: NextRequest): boolean {
  const token = req.headers.get('x-internal-token');
  const expected = process.env.NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN;
  return !!expected && token === expected;
}

/**
 * Get today's date in YYYY-MM-DD format using server's local time
 */
function todayId(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Determine which date document a match belongs to
 * For scraped matches, use server's local today's date
 */
function getMatchDate(match: UnifiedMatch): string {
  // Use server's local today's date for scraped matches
  return todayId();
}

/**
 * Compare two matches and return only the changed fields
 */
function getChangedFields(existing: any, newData: UnifiedMatch): Partial<UnifiedMatch> {
  const changes: Partial<UnifiedMatch> = {};
  const now = new Date().toISOString();

  // Compare videoSrc
  const existingVideoSrc = existing.videoSrc || '';
  const newVideoSrc = newData.videoSrc || '';
  if (existingVideoSrc !== newVideoSrc && newVideoSrc) {
    changes.videoSrc = newVideoSrc;
  }

  // Compare status
  if (existing.status !== newData.status) {
    changes.status = newData.status;
  }

  // Compare timeLabel
  if (existing.timeLabel !== newData.timeLabel) {
    changes.timeLabel = newData.timeLabel;
  }

  // Compare startTime
  if (existing.startTime !== newData.startTime) {
    changes.startTime = newData.startTime;
  }

  // Compare league name
  const existingLeagueName = existing.league?.name || '';
  const newLeagueName = newData.league?.name || '';
  if (existingLeagueName !== newLeagueName) {
    changes.league = newData.league;
  }

  // Compare home team name
  const existingHomeName = existing.home?.name || '';
  const newHomeName = newData.home?.name || '';
  if (existingHomeName !== newHomeName) {
    changes.home = newData.home;
  }

  // Compare away team name
  const existingAwayName = existing.away?.name || '';
  const newAwayName = newData.away?.name || '';
  if (existingAwayName !== newAwayName) {
    changes.away = newData.away;
  }

  // Add updatedAt if there are any changes
  if (Object.keys(changes).length > 0) {
    changes.updatedAt = now;
  }

  return changes;
}

/**
 * POST /api/admin/scrape/compare-and-update
 * 
 * Accepts scraped matches JSON and performs differential updates to Firestore.
 * Only updates fields that have changed.
 * 
 * Body: { matches: UnifiedMatch[] }
 */
export async function POST(req: NextRequest) {
  if (!auth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const scrapedMatches: UnifiedMatch[] = Array.isArray(body.matches) ? body.matches : [];

    if (scrapedMatches.length === 0) {
      return NextResponse.json({ 
        ok: true, 
        message: 'No matches provided',
        updated: 0,
        total: 0
      });
    }

    // Translate matches from Turkish to English before processing
    console.log(`🌐 Translating ${scrapedMatches.length} match(es) from Turkish to English...`);
    const translatedMatches = await translateMatches(scrapedMatches);
    console.log(`✓ Translation completed`);

    const admin = initFirebaseAdmin();
    const dailyMatchesCollection = admin.firestore().collection(
      process.env.DAILY_MATCHES_COLLECTION || process.env.NEXT_PUBLIC_DAILY_MATCHES_COLLECTION || 'daily_matches'
    );

    let updatedCount = 0;
    let skippedCount = 0;
    let newMatchesCount = 0;
    const updates: Array<{ id: string; changes: Partial<UnifiedMatch> }> = [];
    
    // Group matches by date for daily_matches updates
    const matchesByDate: Record<string, UnifiedMatch[]> = {};

    // Get server's local today's date - all scraped matches will go into today's document
    const today = todayId();
    console.log(`📅 Using server date: ${today} for all scraped matches`);
    
    // Group translated matches by date (all will go to today's date)
    for (const scrapedMatch of translatedMatches) {
      if (!scrapedMatch.id) {
        skippedCount++;
        continue;
      }
      const matchDate = getMatchDate(scrapedMatch);
      if (!matchesByDate[matchDate]) {
        matchesByDate[matchDate] = [];
      }
      matchesByDate[matchDate].push(scrapedMatch);
    }
    
    console.log(`📊 Grouped ${translatedMatches.length} match(es) into ${Object.keys(matchesByDate).length} date document(s):`, Object.keys(matchesByDate));

    // Update daily_matches collection by date
    const now = new Date().toISOString();
    const dailyUpdates: Record<string, number> = {};

    for (const [date, matches] of Object.entries(matchesByDate)) {
      try {
        const dateRef = dailyMatchesCollection.doc(date);
        const dateDoc = await dateRef.get();
        const existing = dateDoc.exists ? (dateDoc.data() || {}) : {};
        const existingMatches: UnifiedMatch[] = Array.isArray(existing.matches) ? existing.matches : [];
        
        // Create a map of existing matches by ID for quick lookup
        const existingMap = new Map<string, UnifiedMatch>();
        existingMatches.forEach(m => {
          if (m && m.id) existingMap.set(m.id, m);
        });

        // Merge scraped matches with existing matches
        const mergedMatches: UnifiedMatch[] = [];
        const processedIds = new Set<string>();

        // Add/update scraped matches
        for (const scrapedMatch of matches) {
          if (!scrapedMatch.id) continue;
          processedIds.add(scrapedMatch.id);
          
          const existingMatch = existingMap.get(scrapedMatch.id);
          if (existingMatch) {
            // Merge: keep existing fields (approved, isTrending, etc.), update changed ones
            const changes = getChangedFields(existingMatch, scrapedMatch);
            if (Object.keys(changes).length > 0) {
              mergedMatches.push({
                ...existingMatch,
                ...changes,
                updatedAt: now,
              });
              updatedCount++;
            } else {
              mergedMatches.push(existingMatch); // No changes, keep existing
              skippedCount++;
            }
          } else {
            // New match for this date - always use today's date as createdAt
            mergedMatches.push({
              ...scrapedMatch,
              createdAt: now, // Use current time (today) for newly scraped matches
              updatedAt: now,
            });
            updatedCount++;
            newMatchesCount++;
          }
        }

        // Keep existing matches that weren't in scraped data (for this date)
        existingMatches.forEach(m => {
          if (m && m.id && !processedIds.has(m.id)) {
            mergedMatches.push(m);
          }
        });

        // Update daily_matches document
        await dateRef.set({
          id: date,
          matches: mergedMatches,
          updatedAt: now,
        }, { merge: true });

        dailyUpdates[date] = mergedMatches.length;
      } catch (err: any) {
        console.error(`Error updating daily_matches for date ${date}:`, err);
      }
    }

    return NextResponse.json({
      ok: true,
      updated: updatedCount,
      new: newMatchesCount,
      skipped: skippedCount,
      total: translatedMatches.length,
      dailyUpdates, // Shows how many matches per date document
      updates: updates.slice(0, 10), // Return first 10 updates as sample
      message: `Updated ${updatedCount} match(es) (${newMatchesCount} new, ${updatedCount - newMatchesCount} changed), skipped ${skippedCount} unchanged. Updated ${Object.keys(dailyUpdates).length} date document(s) in daily_matches.`
    });
  } catch (err: any) {
    console.error('Error in compare-and-update:', err);
    return NextResponse.json({
      error: 'Failed to compare and update matches',
      message: err?.message || String(err)
    }, { status: 500 });
  }
}

