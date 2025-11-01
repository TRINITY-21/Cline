import { initFirebaseAdmin } from '@/lib/firebase';
import { NextRequest, NextResponse } from 'next/server';

function auth(req: NextRequest): boolean {
  const token = req.headers.get('x-internal-token');
  const expected = process.env.NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN;
  return !!expected && token === expected;
}

/**
 * Parse date string to Date object, handling timezone correctly
 */
function parseDate(dateStr: string | Date): Date {
  if (dateStr instanceof Date) {
    return dateStr;
  }
  
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
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return new Date();
  }
  return date;
}

/**
 * Get day of week name from date string
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
 * Get date ID from date string (format: DD-MM-YYYY)
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
 * Generate prediction ID
 */
function generatePredictionId(home: string, away: string, timeLabel: string): string {
  const h_norm = home.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const a_norm = away.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const time_norm = (timeLabel || '00:00').replace(':', '-');
  return `${h_norm}-vs-${a_norm}-${time_norm}`;
}

// PATCH: Update existing prediction
// Structure: over_predictions/{weekId}/{dayOfWeek}/{dateId} with predictions array
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  try {
    const admin = initFirebaseAdmin();
    const resolvedParams = await Promise.resolve(params);
    const predictionId = resolvedParams.id;
    
    const body = await req.json().catch(() => ({}));
    const {
      home,
      away,
      league,
      timeLabel,
      matchDate,
      predictedScoreDisplay,
      msbs,
      actualScore,
      status,
      _path, // Path from frontend: weekId/dayOfWeek/dateId
    } = body;
    
    // Determine the path to the prediction
    let weekId: string;
    let dayOfWeek: string;
    let dateId: string;
    
    if (_path && _path.includes('/')) {
      // Path provided: weekId/dayOfWeek/dateId
      const parts = _path.split('/');
      weekId = parts[0];
      dayOfWeek = parts[1];
      dateId = parts[2];
    } else if (matchDate) {
      dateId = getDateId(matchDate);
      weekId = getWeekId(matchDate);
      dayOfWeek = getDayOfWeek(matchDate);
    } else {
      return NextResponse.json({ error: 'matchDate or _path required to locate prediction' }, { status: 400 });
    }
    
    // Get the date document containing predictions array
    const weekDoc = admin.firestore().collection('over_predictions').doc(weekId);
    const dayCol = weekDoc.collection(dayOfWeek);
    const dateDoc = dayCol.doc(dateId);
    const dateDocSnap = await dateDoc.get();
    
    if (!dateDocSnap.exists) {
      return NextResponse.json({ error: 'Prediction date document not found' }, { status: 404 });
    }
    
    const existingData = dateDocSnap.data() || {};
    const predictions = Array.isArray(existingData?.predictions) ? [...existingData.predictions] : [];
    
    // Find the prediction in the array
    const predIndex = predictions.findIndex((p: any) => 
      p.id === predictionId ||
      (p.home === body.home && p.away === body.away && p.timeLabel === body.timeLabel)
    );
    
    if (predIndex < 0) {
      return NextResponse.json({ error: 'Prediction not found' }, { status: 404 });
    }
    
    const now = new Date().toISOString();
    const existingPred = predictions[predIndex];
    
    // Build updated prediction
    const updatedPred: any = {
      ...existingPred,
      updatedAt: now,
    };
    
    if (home !== undefined) updatedPred.home = home.trim();
    if (away !== undefined) updatedPred.away = away.trim();
    if (league !== undefined) updatedPred.league = league.trim();
    if (timeLabel !== undefined) updatedPred.timeLabel = timeLabel.trim();
    if (predictedScoreDisplay !== undefined) updatedPred.predictedScoreDisplay = predictedScoreDisplay?.trim() || null;
    if (msbs !== undefined) updatedPred.msbs = msbs.trim();
    if (actualScore !== undefined) updatedPred.actualScore = actualScore?.trim() || null;
    if (status !== undefined) updatedPred.status = status || null;
    
    // If matchDate changed, might need to move to different week/day
    if (matchDate !== undefined) {
      const newDateId = getDateId(matchDate);
      const newWeekId = getWeekId(matchDate);
      const newDayOfWeek = getDayOfWeek(matchDate);
      
      updatedPred.matchDate = newDateId;
      updatedPred.matchDateISO = new Date(matchDate).toISOString();
      updatedPred.dayOfWeek = newDayOfWeek;
      
      if (newWeekId !== weekId || newDayOfWeek !== dayOfWeek || newDateId !== dateId) {
        // Move to new location
        const newWeekDoc = admin.firestore().collection('over_predictions').doc(newWeekId);
        const newDayCol = newWeekDoc.collection(newDayOfWeek);
        const newDateDoc = newDayCol.doc(newDateId);
        
        // Remove from old location
        predictions.splice(predIndex, 1);
        await dateDoc.set({
          ...existingData,
          predictions: predictions,
          updatedAt: now,
        }, { merge: true });
        
        // Add to new location
        const newDateDocSnap = await newDateDoc.get();
        const newExistingData = newDateDocSnap.exists ? newDateDocSnap.data() : {};
        const newPredictions = Array.isArray(newExistingData?.predictions) ? newExistingData.predictions : [];
        newPredictions.push(updatedPred);
        
        await newDateDoc.set({
          id: newDateId,
          date: newDateId,
          weekId: newWeekId,
          dayOfWeek: newDayOfWeek,
          predictions: newPredictions,
          updatedAt: now,
          createdAt: newExistingData?.createdAt || now,
        }, { merge: true });
        
        await newWeekDoc.set({ id: newWeekId, createdAt: now }, { merge: true });
        
        return NextResponse.json({ 
          ok: true, 
          id: predictionId,
          path: `${newWeekId}/${newDayOfWeek}/${newDateId}`,
          prediction: updatedPred 
        });
      }
    }
    
    // Update in place
    predictions[predIndex] = updatedPred;
    
    await dateDoc.set({
      ...existingData,
      predictions: predictions,
      updatedAt: now,
    }, { merge: true });
    
    return NextResponse.json({ 
      ok: true, 
      id: predictionId,
      path: `${weekId}/${dayOfWeek}/${dateId}`,
      prediction: updatedPred 
    });
    
  } catch (err: any) {
    console.error('Failed to update over_prediction:', err);
    return NextResponse.json({ 
      error: 'Failed to update prediction', 
      details: err?.message || String(err) 
    }, { status: 500 });
  }
}

// DELETE: Delete prediction
// Structure: over_predictions/{weekId}/{dayOfWeek}/{dateId} with predictions array
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  try {
    const admin = initFirebaseAdmin();
    const resolvedParams = await Promise.resolve(params);
    const predictionId = resolvedParams.id;
    
    // Get path from request body
    let weekId: string;
    let dayOfWeek: string;
    let dateId: string;
    
    try {
      const body = await req.json().catch(() => ({}));
      if (body._path && body._path.includes('/')) {
        const parts = body._path.split('/');
        weekId = parts[0];
        dayOfWeek = parts[1];
        dateId = parts[2];
      } else if (body.matchDate) {
        dateId = getDateId(body.matchDate);
        weekId = getWeekId(body.matchDate);
        dayOfWeek = getDayOfWeek(body.matchDate);
      } else {
        return NextResponse.json({ error: 'Path information required. Include _path or matchDate in request body.' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'Path information required. Include _path or matchDate in request body.' }, { status: 400 });
    }
    
    // Get the date document
    const weekDoc = admin.firestore().collection('over_predictions').doc(weekId);
    const dayCol = weekDoc.collection(dayOfWeek);
    const dateDoc = dayCol.doc(dateId);
    const dateDocSnap = await dateDoc.get();
    
    if (!dateDocSnap.exists) {
      return NextResponse.json({ error: 'Prediction date document not found' }, { status: 404 });
    }
    
    const existingData = dateDocSnap.data() || {};
    const predictions = Array.isArray(existingData?.predictions) ? [...existingData.predictions] : [];
    
    // Find and remove the prediction
    const predIndex = predictions.findIndex((p: any) => p.id === predictionId);
    
    if (predIndex < 0) {
      return NextResponse.json({ error: 'Prediction not found' }, { status: 404 });
    }
    
    predictions.splice(predIndex, 1);
    
    const now = new Date().toISOString();
    
    // Update document with remaining predictions
    await dateDoc.set({
      ...existingData,
      predictions: predictions,
      updatedAt: now,
    }, { merge: true });
    
    return NextResponse.json({ 
      ok: true, 
      id: predictionId,
      path: `${weekId}/${dayOfWeek}/${dateId}`,
      message: 'Prediction deleted successfully' 
    });
    
  } catch (err: any) {
    console.error('Failed to delete over_prediction:', err);
    return NextResponse.json({ 
      error: 'Failed to delete prediction', 
      details: err?.message || String(err) 
    }, { status: 500 });
  }
}
