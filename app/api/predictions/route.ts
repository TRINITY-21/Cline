import { initFirebaseAdmin } from '@/lib/firebase';
import { promises as fs } from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';

export const revalidate = 0;

function todayId(): string {
  const d = new Date();
  // Use GMT+3 timezone (add 3 hours to UTC)
  const gmtPlus3 = new Date(d.getTime() + 3 * 60 * 60 * 1000);
  const yyyy = gmtPlus3.getUTCFullYear();
  const mm = String(gmtPlus3.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(gmtPlus3.getUTCDate()).padStart(2, '0');
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
      
      // Get today's predictions
      const today = todayId();
      const todayDoc = await dailyCol.doc(today).get();
      
      if (todayDoc.exists) {
        const data = todayDoc.data();
        const predictions = Array.isArray(data?.predictions) ? data.predictions : [];
        // Filter approved predictions only
        const approved = predictions.filter((p: any) => p?.approved === true);
        return NextResponse.json(approved);
      }
      
      // If today doesn't exist, return empty array
      return NextResponse.json([]);
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



