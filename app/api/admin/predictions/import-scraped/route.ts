import { initFirebaseAdmin } from '@/lib/firebase';
import { NextRequest, NextResponse } from 'next/server';

function auth(req: NextRequest): boolean {
  const token = req.headers.get('x-internal-token');
  const expected = process.env.NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN;
  return !!expected && token === expected;
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
 * Generate prediction ID from home, away, and time
 */
function generatePredictionId(home: string, away: string, timeLabel: string): string {
  const h_norm = home.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const a_norm = away.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const time_norm = (timeLabel || '00:00').replace(':', '-');
  return `${h_norm}-vs-${a_norm}-${time_norm}`;
}

/**
 * GET /api/admin/predictions/import-scraped
 * Debug endpoint to verify route is accessible
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({ 
    ok: true, 
    message: 'Import-scraped endpoint is accessible',
    method: 'POST required',
    endpoint: '/api/admin/predictions/import-scraped'
  });
}

/**
 * POST /api/admin/predictions/import-scraped
 * 
 * Import scraped predictions from betistuta (Over 3.5 only).
 * Note: Predictions are Over 3.5 (MSBS sum >= 4), but status is determined by Over 1.5 logic (actual score >= 2 goals = won).
 * Body: { predictions: [...] } where each prediction has:
 *   - home, away, league, timeLabel, matchDate, predictedScoreDisplay, msbs
 * 
 * Saves to: over_predictions/{weekId}/{dayOfWeek}/{dateId}
 */
export async function POST(req: NextRequest) {
  if (!auth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const admin = initFirebaseAdmin();
    const body = await req.json().catch(() => ({}));
    
    const { predictions } = body;
    
    if (!Array.isArray(predictions)) {
      return NextResponse.json({ 
        error: 'Invalid request body. Expected { predictions: [...] }' 
      }, { status: 400 });
    }
    
    if (predictions.length === 0) {
      return NextResponse.json({ 
        ok: true, 
        imported: 0, 
        message: 'No predictions to import' 
      });
    }
    
    const now = new Date().toISOString();
    let totalImported = 0;
    let totalSkipped = 0;
    const errors: string[] = [];
    
    // Group predictions by date for efficient batching
    const predictionsByDate = new Map<string, any[]>();
    
    for (const pred of predictions) {
      // Validate required fields
      if (!pred.home || !pred.away || !pred.league || !pred.timeLabel || !pred.matchDate) {
        errors.push(`Missing required fields: ${JSON.stringify(pred)}`);
        continue;
      }
      
      // Ensure msbs is Over 3.5 (scrape Over 3.5 predictions only)
      if (pred.msbs !== 'Over 3.5') {
        totalSkipped++;
        continue; // Skip non-Over 3.5 predictions
      }
      
      const dateId = getDateId(pred.matchDate);
      
      if (!predictionsByDate.has(dateId)) {
        predictionsByDate.set(dateId, []);
      }
      
      predictionsByDate.get(dateId)!.push(pred);
    }
    
    // Process each date's predictions
    for (const [dateId, datePredictions] of predictionsByDate.entries()) {
      try {
        // Get first prediction to determine week/day
        const firstPred = datePredictions[0];
        const weekId = getWeekId(firstPred.matchDate);
        const dayOfWeek = getDayOfWeek(firstPred.matchDate);
        
        // Get or create date document
        const weekDoc = admin.firestore().collection('over_predictions').doc(weekId);
        const dayCol = weekDoc.collection(dayOfWeek);
        const dateDoc = dayCol.doc(dateId);
        const dateDocSnap = await dateDoc.get();
        
        const existingData = dateDocSnap.exists ? dateDocSnap.data() : {};
        const existingPredictions = Array.isArray(existingData?.predictions) ? existingData.predictions : [];
        
        // Create a map for quick lookup
        const existingMap = new Map<string, number>();
        existingPredictions.forEach((p: any, idx: number) => {
          const id = p.id || generatePredictionId(p.home || '', p.away || '', p.timeLabel || '');
          existingMap.set(id, idx);
        });
        
        // Add or update predictions
        let dateImported = 0;
        
        for (const pred of datePredictions) {
          const predictionId = generatePredictionId(pred.home, pred.away, pred.timeLabel);
          
          const predictionData = {
            id: predictionId,
            home: pred.home.trim(),
            away: pred.away.trim(),
            league: pred.league.trim(),
            timeLabel: pred.timeLabel.trim(),
            matchDate: dateId,
            matchDateISO: new Date(parseDate(pred.matchDate)).toISOString(),
            dayOfWeek: dayOfWeek,
            predictedScoreDisplay: pred.predictedScoreDisplay || null,
            msbs: pred.msbs || 'Over 3.5',
            actualScore: null,
            status: null,
            sport: pred.sport || 'Football',
            approved: true, // Auto-approve all scraped predictions so they appear on website immediately
            createdAt: now,
            updatedAt: now,
          };
          
          const existingIdx = existingMap.get(predictionId);
          
          if (existingIdx !== undefined) {
            // Update existing prediction - preserve approved status if already set, otherwise auto-approve
            existingPredictions[existingIdx] = {
              ...predictionData,
              approved: existingPredictions[existingIdx].approved !== undefined 
                ? existingPredictions[existingIdx].approved 
                : true, // Auto-approve if not set
              createdAt: existingPredictions[existingIdx].createdAt || now,
            };
          } else {
            // Add new prediction - auto-approve
            existingPredictions.push(predictionData);
          }
          
          dateImported++;
        }
        
        // Save date document
        await dateDoc.set({
          id: dateId,
          date: dateId,
          weekId: weekId,
          dayOfWeek: dayOfWeek,
          predictions: existingPredictions,
          updatedAt: now,
          createdAt: existingData?.createdAt || now,
        }, { merge: true });
        
        // Ensure week document exists
        await weekDoc.set({ id: weekId, createdAt: existingData?.createdAt || now }, { merge: true });
        
        totalImported += dateImported;
        
      } catch (dateErr: any) {
        const errorMsg = `Error processing date ${dateId}: ${dateErr?.message || String(dateErr)}`;
        errors.push(errorMsg);
      }
    }
    
    return NextResponse.json({
      ok: true,
      imported: totalImported,
      skipped: totalSkipped,
      errors: errors.length > 0 ? errors : undefined,
      message: `Imported ${totalImported} Over 3.5 predictions${totalSkipped > 0 ? `, skipped ${totalSkipped} non-Over 3.5 predictions` : ''}`
    });
    
  } catch (err: any) {
    return NextResponse.json({ 
      error: 'Failed to import predictions', 
      details: err?.message || String(err) 
    }, { status: 500 });
  }
}

