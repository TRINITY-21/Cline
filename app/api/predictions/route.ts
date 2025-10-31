import { initFirebaseAdmin } from '@/lib/firebase';
import { promises as fs } from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';

export const revalidate = 0;

/**
 * Get today's date in YYYY-MM-DD format using GMT+3 timezone
 * This matches how predictions are stored in Firestore
 */
function getTodayDateIdGMT3(): string {
  const now = new Date();
  // Add 3 hours to get GMT+3 date
  const gmtPlus3 = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const yyyy = gmtPlus3.getFullYear();
  const mm = String(gmtPlus3.getMonth() + 1).padStart(2, '0');
  const dd = String(gmtPlus3.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export async function GET() {
  const useFirestore = process.env.NEXT_PUBLIC_PREDICTIONS_STORAGE === 'firestore';
  if (useFirestore) {
    try {
      const admin = initFirebaseAdmin();
      const dailyCol = admin.firestore().collection(
        process.env.DAILY_PREDICTIONS_COLLECTION || process.env.NEXT_PUBLIC_DAILY_PREDICTIONS_COLLECTION || 'daily_predictions'
      );
      
      // Get today's predictions using GMT+3 date (matches how they're stored)
      const today = getTodayDateIdGMT3();
      const todayDoc = await dailyCol.doc(today).get();
      
      let allPredictions: any[] = [];
      
      if (todayDoc.exists) {
        const data = todayDoc.data();
        allPredictions = Array.isArray(data?.predictions) ? data.predictions : [];
      }
      
      // Also check yesterday and tomorrow (GMT+3) to catch predictions near day boundary
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const gmtPlus3Yesterday = new Date(yesterday.getTime() + 3 * 60 * 60 * 1000);
      const yesterdayId = `${gmtPlus3Yesterday.getFullYear()}-${String(gmtPlus3Yesterday.getMonth() + 1).padStart(2, '0')}-${String(gmtPlus3Yesterday.getDate()).padStart(2, '0')}`;
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const gmtPlus3Tomorrow = new Date(tomorrow.getTime() + 3 * 60 * 60 * 1000);
      const tomorrowId = `${gmtPlus3Tomorrow.getFullYear()}-${String(gmtPlus3Tomorrow.getMonth() + 1).padStart(2, '0')}-${String(gmtPlus3Tomorrow.getDate()).padStart(2, '0')}`;
      
      // Get predictions from adjacent days
      const [yesterdayDoc, tomorrowDoc] = await Promise.all([
        dailyCol.doc(yesterdayId).get(),
        dailyCol.doc(tomorrowId).get(),
      ]);
      
      if (yesterdayDoc.exists) {
        const data = yesterdayDoc.data();
        const predictions = Array.isArray(data?.predictions) ? data.predictions : [];
        allPredictions = [...allPredictions, ...predictions];
      }
      
      if (tomorrowDoc.exists) {
        const data = tomorrowDoc.data();
        const predictions = Array.isArray(data?.predictions) ? data.predictions : [];
        allPredictions = [...allPredictions, ...predictions];
      }
      
      // Filter approved predictions only
      const approved = allPredictions.filter((p: any) => p?.approved === true);
      return NextResponse.json(approved);
    } catch (err: any) {
      return NextResponse.json({ error: 'Failed to read predictions (firestore)' }, { status: 500 });
    }
  } else {
    try {
      const filePath = path.join(process.cwd(), 'data', 'predictions.json');
      const raw = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(raw || '[]');
      return NextResponse.json(data);
    } catch (err: any) {
      return NextResponse.json({ error: 'Failed to read predictions' }, { status: 500 });
    }
  }
}



