import { initFirebaseAdmin } from '@/lib/firebase';
import { NextRequest, NextResponse } from 'next/server';

function auth(req: NextRequest): boolean {
  const token = req.headers.get('x-internal-token');
  const expected = process.env.NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN;
  return !!expected && token === expected;
}

/**
 * Normalize team name for comparison
 */
function normTeamName(name: string): string {
  return name
    .toLowerCase()
    .replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/\(w\)$/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Get date ID from a date string or Date object (format: DD-MM-YYYY)
 */
function getDateId(dateStr: string | Date | undefined): string {
  try {
    if (!dateStr) {
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const yyyy = today.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    }
    
    const date = parseDate(dateStr);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  } catch {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }
}

/**
 * Get week ID from a date (format: DD-DD-MM-YYYY)
 */
function getWeekId(dateStr: string | Date | undefined): string {
  let date: Date;
  
  try {
    if (!dateStr) {
      date = new Date();
    } else {
      date = parseDate(dateStr);
    }
  } catch {
    date = new Date();
  }
  
  const dayOfWeek = date.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(date);
  monday.setDate(date.getDate() + mondayOffset);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const mondayDD = String(monday.getDate()).padStart(2, '0');
  const sundayDD = String(sunday.getDate()).padStart(2, '0');
  const mm = String(monday.getMonth() + 1).padStart(2, '0');
  const yyyy = monday.getFullYear();
  
  return `${mondayDD}-${sundayDD}-${mm}-${yyyy}`;
}

/**
 * Get day of week name
 */
function getDayOfWeek(dateStr: string | Date | undefined): string {
  try {
    if (!dateStr) {
      const today = new Date();
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return days[today.getDay()];
    }
    
    const date = parseDate(dateStr);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  } catch {
    return 'Monday';
  }
}

/**
 * Parse date string to Date object
 */
function parseDate(dateStr: string | Date): Date {
  if (dateStr instanceof Date) {
    return dateStr;
  }
  
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    
    // YYYY-MM-DD format
    if (parts[0].length === 4) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    
    // DD-MM-YYYY format
    if (parts[2] && parts[2].length === 4) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
  }
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return new Date();
  }
  return date;
}

/**
 * Calculate Over 1.5 status from actual score
 * Won if total goals >= 2 (Over 1.5 means more than 1.5, so 2 or more)
 */
function calculateOver15Status(actualScore: string | null): 'won' | 'failed' | null {
  if (!actualScore) return null;
  
  const match = actualScore.match(/(\d+)\s*[-:]\s*(\d+)/);
  if (!match) return null;
  
  const homeGoals = parseInt(match[1], 10);
  const awayGoals = parseInt(match[2], 10);
  const totalGoals = homeGoals + awayGoals;
  
  // For Over 1.5, we need >= 2 goals (more than 1.5, so 2 or more = won)
  return totalGoals >= 2 ? 'won' : 'failed';
}

/**
 * GET /api/admin/predictions/update-results-scraped
 * Debug endpoint to verify route is accessible
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({ 
    ok: true, 
    message: 'Update-results-scraped endpoint is accessible',
    method: 'POST required',
    endpoint: '/api/admin/predictions/update-results-scraped'
  });
}

/**
 * POST /api/admin/predictions/update-results-scraped
 * 
 * Update predictions with scraped actual results (MS column from betistuta).
 * 
 * IMPORTANT: This endpoint ONLY UPDATES existing predictions, it NEVER creates new ones.
 * If a matching prediction is not found in Firestore, it is skipped.
 * 
 * Body: { results: [...] } where each result has:
 *   - home, away, timeLabel, actualScore, status
 * 
 * Updates predictions in: over_predictions/{weekId}/{dayOfWeek}/{dateId}
 * 
 * Status is calculated based on Over 1.5 logic: actual score >= 2 goals = 'won', else 'failed'
 */
export async function POST(req: NextRequest) {
  if (!auth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const admin = initFirebaseAdmin();
    const body = await req.json().catch(() => ({}));
    
    const { results } = body;
    
    if (!Array.isArray(results)) {
      return NextResponse.json({ 
        error: 'Invalid request body. Expected { results: [...] }' 
      }, { status: 400 });
    }
    
    if (results.length === 0) {
      return NextResponse.json({ 
        ok: true, 
        updated: 0, 
        message: 'No results to update' 
      });
    }
    
    const now = new Date().toISOString();
    let totalUpdated = 0;
    const errors: string[] = [];
    
    // Group results by date if available, or search recent dates
    for (const result of results) {
      if (!result.home || !result.away || !result.actualScore || !result.timeLabel) {
        continue;
      }
      
      let found = false;
      
      // Determine which dates to check
      // If result has matchDate, check that date and nearby dates
      // Otherwise check last 7 days and next 2 days (for predictions imported today)
      const datesToCheck: Date[] = [];
      
      if (result.matchDate) {
        // If result has a date, check that date and nearby dates
        const resultDate = parseDate(result.matchDate);
        for (let offset = -1; offset <= 1; offset++) {
          const checkDate = new Date(resultDate);
          checkDate.setDate(checkDate.getDate() + offset);
          datesToCheck.push(checkDate);
        }
      } else {
        // No date in result - check last 7 days and next 2 days
        for (let daysOffset = -7; daysOffset <= 2; daysOffset++) {
          const checkDate = new Date();
          checkDate.setDate(checkDate.getDate() + daysOffset);
          datesToCheck.push(checkDate);
        }
      }
      
      // Try each date
      for (const targetDate of datesToCheck) {
        const dateId = getDateId(targetDate);
        const weekId = getWeekId(targetDate);
        const dayOfWeek = getDayOfWeek(targetDate);
        
        // Get predictions for this date
        const weekDoc = admin.firestore().collection('over_predictions').doc(weekId);
        const dayCol = weekDoc.collection(dayOfWeek);
        const dateDoc = dayCol.doc(dateId);
        const dateDocSnap = await dateDoc.get();
        
        if (!dateDocSnap.exists) {
          continue;
        }
        
        const existingData = dateDocSnap.data();
        const predictions = Array.isArray(existingData?.predictions) ? existingData.predictions : [];
        
        // Find matching prediction
        for (let i = 0; i < predictions.length; i++) {
          const pred = predictions[i];
          
          if (!pred.home || !pred.away) continue;
          
          // Normalize team names for comparison
          const predHomeNorm = normTeamName(pred.home);
          const predAwayNorm = normTeamName(pred.away);
          const resultHomeNorm = normTeamName(result.home);
          const resultAwayNorm = normTeamName(result.away);
          
          // Check if teams match (exact or swapped)
          const teamsMatch = (predHomeNorm === resultHomeNorm && predAwayNorm === resultAwayNorm) ||
                           (predHomeNorm === resultAwayNorm && predAwayNorm === resultHomeNorm);
          
          if (!teamsMatch) {
            continue;
          }
          
          // Also check timeLabel for better matching (allow up to 1 hour difference)
          const resultTime = result.timeLabel.replace(':', '');
          const predTime = pred.timeLabel.replace(':', '');
          const timeDiff = Math.abs(parseInt(resultTime) - parseInt(predTime));
          const timeMatch = !result.timeLabel || !pred.timeLabel || 
                          result.timeLabel === pred.timeLabel ||
                          timeDiff < 100; // Less than 1 hour difference (e.g., 00:00 vs 00:30)
          
          if (teamsMatch && timeMatch) {
            // Found matching prediction - update with result
            const actualScore = result.actualScore.replace(/\s/g, '').replace(':', '-');
            const status = result.status || calculateOver15Status(actualScore);
            
            // Only update if result changed or status is new
            const needsUpdate = pred.actualScore !== actualScore || 
                               (pred.status !== status && status !== null);
            
            if (needsUpdate) {
              // Update existing prediction with actual score and status
              predictions[i] = {
                ...pred,
                actualScore: actualScore,
                status: status, // Based on Over 1.5 logic (>= 2 goals = won)
                updatedAt: now,
              };
              
              totalUpdated++;
              found = true;
              
              // Save updated predictions for this date
              await dateDoc.set({
                ...existingData,
                predictions: predictions,
                updatedAt: now,
              }, { merge: true });
              
              break; // Found match, move to next result
            } else {
              found = true; // Already has this result, skip
              break;
            }
          }
        }
        
        if (found) {
          break; // Found and updated, move to next result
        }
      }
    }
    
    return NextResponse.json({
      ok: true,
      updated: totalUpdated,
      errors: errors.length > 0 ? errors : undefined,
      message: `Updated ${totalUpdated} predictions with actual results`
    });
    
  } catch (err: any) {
    return NextResponse.json({ 
      error: 'Failed to update results', 
      details: err?.message || String(err) 
    }, { status: 500 });
  }
}

