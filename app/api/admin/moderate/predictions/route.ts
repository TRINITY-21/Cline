import { initFirebaseAdmin } from '@/lib/firebase';
import { translateToEnglish } from '@/lib/translate';
import { promises as fs } from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

export const revalidate = 0;

function auth(req: NextRequest): boolean {
  const token = req.headers.get('x-internal-token');
  const expected = process.env.NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN;
  return !!expected && token === expected;
}

function todayId(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Determine which date document a prediction belongs to
 * Uses matchDate, or tries to link to match via matchId/id, or defaults to today
 */
async function getPredictionDate(prediction: any, admin: any): Promise<string> {
  // Try to extract date from matchDate if it exists
  if (prediction.matchDate) {
    try {
      const date = new Date(prediction.matchDate);
      if (!isNaN(date.getTime())) {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
    } catch {}
  }

  // Try to find the associated match to get its date
  const matchId = String(prediction.id || prediction.gameId || '');
  if (matchId) {
    try {
      // Search in recent date documents for the match
      const dailyMatchesCol = admin.firestore().collection(
        process.env.DAILY_MATCHES_COLLECTION || process.env.NEXT_PUBLIC_DAILY_MATCHES_COLLECTION || 'daily_matches'
      );
      
      // Check today and last 7 days
      for (let daysOffset = 0; daysOffset < 7; daysOffset++) {
        const checkDate = new Date();
        checkDate.setDate(checkDate.getDate() - daysOffset);
        const dateId = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
        
        const dateDoc = await dailyMatchesCol.doc(dateId).get();
        if (dateDoc.exists) {
          const data = dateDoc.data();
          const matches = Array.isArray(data?.matches) ? data.matches : [];
          const found = matches.find((m: any) => m?.id === matchId);
          if (found) {
            return dateId;
          }
        }
      }
    } catch {}
  }

  // Fallback: check if createdAt exists
  if (prediction.createdAt) {
    try {
      const date = new Date(prediction.createdAt);
      if (!isNaN(date.getTime())) {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
    } catch {}
  }

  // Default to today
  return todayId();
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  // Check if a specific date filter is requested
  const url = new URL(req.url);
  const requestedDate = url.searchParams.get('date'); // Format: YYYY-MM-DD
  
  const admin = initFirebaseAdmin();
  const dailyCol = admin.firestore().collection(
    process.env.DAILY_PREDICTIONS_COLLECTION || process.env.NEXT_PUBLIC_DAILY_PREDICTIONS_COLLECTION || 'daily_predictions'
  );
  
  // If a date is requested, get predictions from that date document
  if (requestedDate) {
    const dateDoc = await dailyCol.doc(requestedDate).get();
    if (dateDoc.exists) {
      const data = dateDoc.data();
      const predictions = Array.isArray(data?.predictions) ? data.predictions : [];
      return NextResponse.json({ total: predictions.length, rows: predictions });
    }
    return NextResponse.json({ total: 0, rows: [] });
  }
  
  // If no date specified, get today's predictions
  const today = todayId();
  const todayDoc = await dailyCol.doc(today).get();
  
  if (todayDoc.exists) {
    const data = todayDoc.data();
    const predictions = Array.isArray(data?.predictions) ? data.predictions : [];
    return NextResponse.json({ total: predictions.length, rows: predictions });
  }
  
  return NextResponse.json({ total: 0, rows: [] });
}

// POST: import predictions from body { items: [...] } or data/predictions.json
// Imports into daily_predictions collection grouped by date
export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  try {
    const admin = initFirebaseAdmin();
    const collectionName = process.env.DAILY_PREDICTIONS_COLLECTION || process.env.NEXT_PUBLIC_DAILY_PREDICTIONS_COLLECTION || 'daily_predictions';
    const dailyCol = admin.firestore().collection(collectionName);
    
    console.log(`🔧 Using Firestore collection: ${collectionName}`);
    console.log(`🔧 Firebase Admin initialized: ${!!admin}`);
    console.log(`🔧 Firestore instance: ${!!admin.firestore()}`);
    
    // Test Firestore connection by reading a test document
    try {
      const testDoc = await dailyCol.doc('_test').get();
      console.log(`✓ Firestore connection test successful`);
    } catch (testErr: any) {
      console.error(`✗ Firestore connection test failed:`, testErr?.message || String(testErr));
      return NextResponse.json({ 
        error: 'Firestore connection failed', 
        details: testErr?.message || String(testErr) 
      }, { status: 500 });
    }
    
    let items: any[] | null = null;
    try {
      const body = await req.json().catch(() => null as any);
      // If body is an array directly, use it; if it has items array, use that
      if (body && Array.isArray(body)) {
        items = body;
      } else if (body && Array.isArray(body.items)) {
        items = body.items;
      }
    } catch {}
    if (!items) {
      try {
        const file = path.join(process.cwd(), 'data', 'predictions.json');
        const raw = await fs.readFile(file, 'utf-8');
        items = JSON.parse(raw || '[]');
      } catch {
        items = [];
      }
    }
    const itemsArray = items || [];
    
    if (itemsArray.length === 0) {
      return NextResponse.json({ error: 'No items to import' }, { status: 400 });
    }
    
    console.log(`📥 Starting import of ${itemsArray.length} prediction(s)`);
    
    // Translate predictions from Turkish to English
    console.log(`🌐 Translating ${itemsArray.length} prediction(s) from Turkish to English...`);
    const translatedPredictions = await Promise.all(
      itemsArray.map(async (pred: any) => {
        const translated: any = { ...pred };
        if (pred.home) translated.home = await translateToEnglish(pred.home);
        if (pred.away) translated.away = await translateToEnglish(pred.away);
        if (pred.league) translated.league = await translateToEnglish(pred.league);
        if (pred.msbsWinner) translated.msbsWinner = await translateToEnglish(pred.msbsWinner);
        return translated;
      })
    );
    console.log(`✓ Translation completed`);
    
    const now = new Date().toISOString();
    
    // Group predictions by date
    const predictionsByDate: Record<string, any[]> = {};
    
    for (const prediction of translatedPredictions) {
      const date = await getPredictionDate(prediction, admin);
      if (!predictionsByDate[date]) {
        predictionsByDate[date] = [];
      }
      predictionsByDate[date].push(prediction);
    }
    
    console.log(`📅 Grouped predictions into ${Object.keys(predictionsByDate).length} date(s):`, Object.keys(predictionsByDate));
    
    // Update each date document
    let totalImported = 0;
    const errors: string[] = [];
    
    for (const [date, predictions] of Object.entries(predictionsByDate)) {
      try {
        const dateRef = dailyCol.doc(date);
        const dateDoc = await dateRef.get();
        const existing = dateDoc.exists ? (dateDoc.data() || {}) : {};
        const existingPredictions: any[] = Array.isArray(existing.predictions) ? existing.predictions : [];
        
        // Create map of existing predictions by ID
        const existingMap = new Map<string, any>();
        existingPredictions.forEach(p => {
          const id = String(p.id || p.gameId || '');
          if (id) existingMap.set(id, p);
        });
        
        // Merge imported predictions with existing
        let dateImported = 0;
        for (const prediction of predictions) {
          const id = String(prediction.id || prediction.gameId || '');
          if (!id) continue;
          
          const existingPred = existingMap.get(id);
          if (existingPred) {
            // Update existing, preserve approved flag
            const idx = existingPredictions.findIndex((p: any) => String(p.id || p.gameId || '') === id);
            if (idx >= 0) {
              existingPredictions[idx] = {
                ...prediction,
                approved: existingPred.approved !== undefined ? existingPred.approved : false,
                updatedAt: now,
                createdAt: existingPred.createdAt || now,
              };
            }
          } else {
            // New prediction
            existingPredictions.push({
              ...prediction,
              approved: false,
              updatedAt: now,
              createdAt: now,
            });
          }
          dateImported++;
        }
        
        // Save to daily_predictions - only increment if write succeeds
        await dateRef.set({
          id: date,
          predictions: existingPredictions,
          updatedAt: now,
        }, { merge: true });
        
        totalImported += dateImported;
        console.log(`✓ Successfully imported ${dateImported} prediction(s) for date ${date}`);
      } catch (err: any) {
        const errorMsg = `Error updating daily_predictions for date ${date}: ${err?.message || String(err)}`;
        console.error(errorMsg, err);
        errors.push(errorMsg);
      }
    }
    
    if (errors.length > 0) {
      console.error(`Import completed with ${errors.length} error(s):`, errors);
      return NextResponse.json({ 
        ok: false, 
        imported: totalImported, 
        errors: errors,
        message: `Imported ${totalImported} predictions but ${errors.length} error(s) occurred`
      }, { status: 207 }); // 207 Multi-Status
    }
    
    return NextResponse.json({ ok: true, imported: totalImported });
  } catch (initErr: any) {
    console.error('✗ Failed to initialize Firebase Admin:', initErr?.message || String(initErr));
    return NextResponse.json({ 
      error: 'Failed to initialize Firebase Admin', 
      details: initErr?.message || String(initErr) 
    }, { status: 500 });
  }
}


