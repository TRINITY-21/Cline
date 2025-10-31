import { initFirebaseAdmin } from '@/lib/firebase';
import { promises as fs } from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';

export const revalidate = 0;

export async function GET() {
  const useFirestore = process.env.NEXT_PUBLIC_PREDICTIONS_STORAGE === 'firestore';
  if (useFirestore) {
    try {
      const admin = initFirebaseAdmin();
      const colName = process.env.NEXT_PUBLIC_PREDICTIONS_COLLECTION || 'predictions';
      const qs = await admin.firestore().collection(colName).where('approved', '==', true).orderBy('updatedAt', 'desc').limit(1000).get();
      const rows = qs.docs.map(d => ({ id: d.id, ...(d.data() || {}) }));
      return NextResponse.json(rows);
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



