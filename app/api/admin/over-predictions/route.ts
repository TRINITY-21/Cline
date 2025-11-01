import { initFirebaseAdmin } from '@/lib/firebase';
import { NextRequest, NextResponse } from 'next/server';

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
 * Get week ID from a date (format: DD-DD-MM-YYYY where first DD is Monday, second is Sunday)
 * Example: "01-07-10-2025" means Monday 01 to Sunday 07 of October 2025
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
  
  // Get Monday of the week
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(date);
  monday.setDate(date.getDate() + mondayOffset);
  
  // Get Sunday of the week (6 days after Monday)
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const mondayDD = String(monday.getDate()).padStart(2, '0');
  const sundayDD = String(sunday.getDate()).padStart(2, '0');
  const mm = String(monday.getMonth() + 1).padStart(2, '0');
  const yyyy = monday.getFullYear();
  
  return `${mondayDD}-${sundayDD}-${mm}-${yyyy}`;
}

/**
 * Parse date string to Date object, handling timezone correctly
 * Supports formats: YYYY-MM-DD, DD-MM-YYYY, or Date object
 */
function parseDate(dateStr: string | Date): Date {
  if (dateStr instanceof Date) {
    return dateStr;
  }
  
  // Try parsing as YYYY-MM-DD (ISO format from date input)
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    
    // If YYYY-MM-DD format (e.g., "2025-11-02")
    if (parts[0].length === 4) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    
    // If DD-MM-YYYY format (e.g., "02-11-2025")
    if (parts[2] && parts[2].length === 4) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
  }
  
  // Fallback to standard Date parsing
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return new Date(); // Default to today if parsing fails
  }
  return date;
}

/**
 * Get day of week name from date string (Monday, Tuesday, etc.)
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
    return 'Monday'; // Default fallback
  }
}

/**
 * Generate a unique ID for a prediction
 */
function generatePredictionId(home: string, away: string, timeLabel: string): string {
  const h_norm = home.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const a_norm = away.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const time_norm = (timeLabel || '00:00').replace(':', '-');
  return `${h_norm}-vs-${a_norm}-${time_norm}`;
}

// GET: Fetch predictions from over_predictions collection
// Structure: over_predictions/{weekId}/{dayOfWeek}/{dateId}
// Example: over_predictions/01-07-10-2025/Monday/01-10-2025
export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  try {
    const admin = initFirebaseAdmin();
    const url = new URL(req.url);
    const requestedDate = url.searchParams.get('date'); // Format: YYYY-MM-DD or DD-MM-YYYY
    
    const allPredictions: any[] = [];
    const overPredictionsCol = admin.firestore().collection('over_predictions');
    
    if (requestedDate) {
      // Fetch predictions for a specific date
      const dateId = getDateId(requestedDate);
      const weekId = getWeekId(requestedDate);
      const dayOfWeek = getDayOfWeek(requestedDate);
      
      const weekDoc = overPredictionsCol.doc(weekId);
      const dayCol = weekDoc.collection(dayOfWeek);
      const dateDoc = dayCol.doc(dateId);
      const dateDocSnap = await dateDoc.get();
      
      if (dateDocSnap.exists) {
        const data = dateDocSnap.data();
        const predictions = Array.isArray(data?.predictions) ? data.predictions : [];
        
        // Add metadata to each prediction
        predictions.forEach((pred: any) => {
          allPredictions.push({
            ...pred,
            id: pred.id || generatePredictionId(pred.home || '', pred.away || '', pred.timeLabel || ''),
            matchDate: dateId,
            _path: `${weekId}/${dayOfWeek}/${dateId}`,
          });
        });
      }
      
      // Sort by timeLabel
      allPredictions.sort((a, b) => (a.timeLabel || '').localeCompare(b.timeLabel || ''));
    } else {
      // Fetch all predictions from all weeks
      const weeksSnapshot = await overPredictionsCol.get();
      
      for (const weekDoc of weeksSnapshot.docs) {
        const weekId = weekDoc.id;
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        for (const day of daysOfWeek) {
          const dayCol = weekDoc.ref.collection(day);
          const datesSnapshot = await dayCol.get();
          
          for (const dateDoc of datesSnapshot.docs) {
            const dateId = dateDoc.id;
            const data = dateDoc.data();
            const predictions = Array.isArray(data?.predictions) ? data.predictions : [];
            
            predictions.forEach((pred: any) => {
              allPredictions.push({
                ...pred,
                id: pred.id || generatePredictionId(pred.home || '', pred.away || '', pred.timeLabel || ''),
                matchDate: dateId,
                _path: `${weekId}/${day}/${dateId}`,
              });
            });
          }
        }
      }
      
      // Sort by matchDate (desc) then timeLabel (asc)
      allPredictions.sort((a, b) => {
        const dateCompare = (b.matchDate || '').localeCompare(a.matchDate || '');
        if (dateCompare !== 0) return dateCompare;
        return (a.timeLabel || '').localeCompare(b.timeLabel || '');
      });
    }
    
    return NextResponse.json({ 
      total: allPredictions.length, 
      rows: allPredictions 
    });
    
  } catch (err: any) {
    console.error('Failed to fetch over_predictions:', err);
    return NextResponse.json({ 
      error: 'Failed to fetch predictions', 
      details: err?.message || String(err) 
    }, { status: 500 });
  }
}

// POST: Create new prediction in over_predictions collection
// Structure: over_predictions/{weekId}/{dayOfWeek}/{dateId}
// Example: over_predictions/01-07-10-2025/Monday/01-10-2025
export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  try {
    const admin = initFirebaseAdmin();
    const body = await req.json().catch(() => ({}));
    
    const {
      home,
      away,
      league,
      timeLabel,
      matchDate,
      predictedScoreDisplay,
      msbs = 'Over 1.5',
      actualScore,
      status,
    } = body;
    
    // Validate required fields
    if (!home || !away || !league || !timeLabel || !matchDate) {
      return NextResponse.json({ 
        error: 'Missing required fields: home, away, league, timeLabel, matchDate' 
      }, { status: 400 });
    }
    
    const dateId = getDateId(matchDate);
    const weekId = getWeekId(matchDate);
    const dayOfWeek = getDayOfWeek(matchDate);
    const predictionId = generatePredictionId(home, away, timeLabel);
    
    const now = new Date().toISOString();
    
    const predictionData = {
      id: predictionId,
      home: home.trim(),
      away: away.trim(),
      league: league.trim(),
      timeLabel: timeLabel.trim(),
      matchDate: dateId,
      matchDateISO: new Date(matchDate).toISOString(),
      dayOfWeek: dayOfWeek,
      predictedScoreDisplay: predictedScoreDisplay || null,
      msbs: msbs.trim(),
      actualScore: actualScore || null,
      status: status || null, // 'won' | 'failed' | null
      sport: 'Football',
      createdAt: now,
      updatedAt: now,
    };
    
    // Structure: over_predictions/{weekId}/{dayOfWeek}/{dateId}
    const weekDoc = admin.firestore().collection('over_predictions').doc(weekId);
    const dayCol = weekDoc.collection(dayOfWeek);
    const dateDoc = dayCol.doc(dateId);
    
    // Get existing date document or create new
    const dateDocSnap = await dateDoc.get();
    const existingData = dateDocSnap.exists ? dateDocSnap.data() : {};
    const existingPredictions = Array.isArray(existingData?.predictions) ? existingData.predictions : [];
    
    // Check if prediction with same ID already exists
    const existingPredIndex = existingPredictions.findIndex((p: any) => 
      p.id === predictionId || 
      (p.home === predictionData.home && p.away === predictionData.away && p.timeLabel === predictionData.timeLabel)
    );
    
    if (existingPredIndex >= 0) {
      return NextResponse.json({ 
        error: 'Prediction with this match already exists for this date',
        id: predictionId,
        path: `${weekId}/${dayOfWeek}/${dateId}`
      }, { status: 409 });
    }
    
    // Add new prediction to array
    existingPredictions.push(predictionData);
    
    // Update date document with predictions array
    await dateDoc.set({
      id: dateId,
      date: dateId,
      weekId: weekId,
      dayOfWeek: dayOfWeek,
      predictions: existingPredictions,
      updatedAt: now,
      createdAt: existingData?.createdAt || now,
    }, { merge: true });
    
    // Create week document if it doesn't exist
    await weekDoc.set({ id: weekId, createdAt: now }, { merge: true });
    
    return NextResponse.json({ 
      ok: true, 
      id: predictionId,
      path: `${weekId}/${dayOfWeek}/${dateId}`,
      prediction: predictionData 
    });
    
  } catch (err: any) {
    console.error('Failed to create over_prediction:', err);
    return NextResponse.json({ 
      error: 'Failed to create prediction', 
      details: err?.message || String(err) 
    }, { status: 500 });
  }
}

