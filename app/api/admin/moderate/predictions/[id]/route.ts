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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = initFirebaseAdmin();
  const dailyCol = admin.firestore().collection(
    process.env.DAILY_PREDICTIONS_COLLECTION || process.env.NEXT_PUBLIC_DAILY_PREDICTIONS_COLLECTION || 'daily_predictions'
  );
  const body = await req.json().catch(() => ({}));
  const { approved, override } = body || {};
  const now = new Date().toISOString();
  
  // Handle override.status for won/failed status
  const statusUpdate = override?.status !== undefined ? { status: override.status } : {};
  
  // Try to find the prediction in today's document first
  const today = todayId();
  let found = false;
  
  try {
    const dateRef = dailyCol.doc(today);
    const dateDoc = await dateRef.get();
    
    if (dateDoc.exists) {
      const data = dateDoc.data();
      const predictions = Array.isArray(data?.predictions) ? data.predictions : [];
      
      for (let i = 0; i < predictions.length; i++) {
        const pred = predictions[i];
        const predId = String(pred.id || pred.gameId || '');
        if (predId === params.id) {
          if (approved !== undefined) predictions[i].approved = !!approved;
          if (override) {
            Object.assign(predictions[i], override);
          }
          if (statusUpdate.status !== undefined) {
            predictions[i].status = statusUpdate.status;
          }
          predictions[i].updatedAt = now;
          found = true;
          break;
        }
      }
      
      if (found) {
        await dateRef.set({
          id: today,
          predictions,
          updatedAt: now,
        }, { merge: true });
        return NextResponse.json({ ok: true });
      }
    }
    
    // If not found in today, search recent dates (last 7 days)
    if (!found) {
      for (let daysBack = 1; daysBack <= 7; daysBack++) {
        const date = new Date();
        date.setDate(date.getDate() - daysBack);
        const dateId = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        
        const dateRef = dailyCol.doc(dateId);
        const dateDoc = await dateRef.get();
        
        if (dateDoc.exists) {
          const data = dateDoc.data();
          const predictions = Array.isArray(data?.predictions) ? data.predictions : [];
          
          for (let i = 0; i < predictions.length; i++) {
            const pred = predictions[i];
            const predId = String(pred.id || pred.gameId || '');
            if (predId === params.id) {
              if (approved !== undefined) predictions[i].approved = !!approved;
              if (override) {
                Object.assign(predictions[i], override);
              }
              if (statusUpdate.status !== undefined) {
                predictions[i].status = statusUpdate.status;
              }
              predictions[i].updatedAt = now;
              found = true;
              
              await dateRef.set({
                id: dateId,
                predictions,
                updatedAt: now,
              }, { merge: true });
              
              return NextResponse.json({ ok: true });
            }
          }
        }
      }
    }
    
    if (!found) {
      return NextResponse.json({ error: 'Prediction not found' }, { status: 404 });
    }
    
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Failed to update daily_predictions:', err);
    return NextResponse.json({ error: 'Failed to update prediction' }, { status: 500 });
  }
}


