import { initFirebaseAdmin } from '@/lib/firebase';
import { NextRequest, NextResponse } from 'next/server';

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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  // Handle Next.js 15+ where params is a Promise
  const resolvedParams = await (Promise.resolve(params));
  const predictionId = resolvedParams.id;
  
  const admin = initFirebaseAdmin();
  const dailyCol = admin.firestore().collection(
    process.env.DAILY_PREDICTIONS_COLLECTION || process.env.NEXT_PUBLIC_DAILY_PREDICTIONS_COLLECTION || 'daily_predictions'
  );
  const body = await req.json().catch(() => ({}));
  const { approved, override } = body || {};
  const now = new Date().toISOString();
  
  // Handle override.status for won/failed status
  const statusUpdate = override?.status !== undefined ? { status: override.status } : {};
  
  // Search for the prediction across multiple dates (last 14 days to be safe)
  let found = false;
  let foundDateId = '';
  let foundPredictions: any[] = [];
  
  try {
    // Search today and last 14 days using server's local date
    for (let daysBack = 0; daysBack <= 14; daysBack++) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - daysBack);
      const dateId = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
      
      const dateRef = dailyCol.doc(dateId);
      const dateDoc = await dateRef.get();
      
      if (dateDoc.exists) {
        const data = dateDoc.data();
        const predictions = Array.isArray(data?.predictions) ? data.predictions : [];
        
        for (let i = 0; i < predictions.length; i++) {
          const pred = predictions[i];
          // Try multiple ID formats for matching
          const predId = String(pred.id || pred.gameId || '').trim();
          const predIdLower = predId.toLowerCase();
          const predictionIdLower = predictionId.toLowerCase().trim();
          
          // Exact match or case-insensitive match
          const idMatches = predId === predictionId || predIdLower === predictionIdLower;
          
          if (idMatches) {
            // Found the prediction - only update approval and status fields
            // Preserve all original scraped data (timeLabel, home, away, msbs, etc.)
            const originalPred = { ...predictions[i] }; // Preserve all original fields
            
            // Only update specific fields, don't overwrite scraped data
            if (approved !== undefined) {
              originalPred.approved = !!approved;
            }
            if (override) {
              // Merge override fields but don't overwrite scraped data like timeLabel
              Object.keys(override).forEach(key => {
                // Only allow overriding status/result fields, not scraped data
                if (['status', 'result', 'actualWinner', 'resultUpdatedAt'].includes(key)) {
                  originalPred[key] = override[key];
                }
              });
            }
            if (statusUpdate.status !== undefined) {
              originalPred.status = statusUpdate.status;
            }
            originalPred.updatedAt = now;
            
            // Replace the prediction in the array with the updated version
            predictions[i] = originalPred;
            
            found = true;
            foundDateId = dateId;
            foundPredictions = predictions;
            break;
          }
        }
        
        if (found) break;
      }
    }
    
    // If found, save the updated predictions
    if (found) {
      const dateRef = dailyCol.doc(foundDateId);
      await dateRef.set({
        id: foundDateId,
        predictions: foundPredictions,
        updatedAt: now,
      }, { merge: true });
      
      return NextResponse.json({ ok: true, date: foundDateId });
    }
    
    // If not found after searching 14 days, return 404 with helpful error
    if (!found) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }).join(', ')}`);
      return NextResponse.json({ 
        error: 'Prediction not found',
        searchedId: predictionId,
        message: `Could not find prediction with ID "${predictionId}" in the last 14 days`
      }, { status: 404 });
    }
    
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to update prediction' }, { status: 500 });
  }
}


