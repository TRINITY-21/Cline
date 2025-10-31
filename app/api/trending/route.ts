import { initFirebaseAdmin } from '@/lib/firebase';
import { NextResponse } from 'next/server';

export const revalidate = 0;

export async function GET() {
  const useFirestore = (process.env.MATCHES_STORAGE || process.env.NEXT_PUBLIC_MATCHES_STORAGE) === 'firestore';
  if (!useFirestore) {
    // Trending flag exists only in Firestore flow; return empty when using JSON
    return NextResponse.json([]);
  }
  try {
    const admin = initFirebaseAdmin();
    const colName = process.env.MATCHES_COLLECTION || process.env.NEXT_PUBLIC_MATCHES_COLLECTION || 'matches';
    // Query only matches with isTrending == true and approved == true
    const qs = await admin.firestore().collection(colName)
      .where('approved', '==', true)
      .where('isTrending', '==', true)
      .limit(100)
      .get();
    
    const rows = qs.docs.map(d => ({ id: d.id, ...(d.data() || {}) }));
    return NextResponse.json(rows);
  } catch (_e: any) {
    return NextResponse.json({ error: 'Failed to read trending (firestore)' }, { status: 500 });
  }
}


