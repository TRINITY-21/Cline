import { initFirebaseAdmin } from '@/lib/firebase';
import { promises as fs } from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';

export const revalidate = 0;

function todayId(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
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
      
      // Get today's predictions using server's local date
      const today = todayId();
      const todayDoc = await dailyCol.doc(today).get();
      
      let allPredictions: any[] = [];
      
      if (todayDoc.exists) {
        const data = todayDoc.data();
        allPredictions = Array.isArray(data?.predictions) ? data.predictions : [];
      }
      
      // Also check yesterday and tomorrow to catch predictions near day boundary
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayId = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowId = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
      
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



