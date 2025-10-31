import { initFirebaseAdmin } from '@/lib/firebase';
import { NextResponse } from 'next/server';

export const revalidate = 0;

function todayId(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export async function GET() {
  const useFirestore = (process.env.MATCHES_STORAGE || process.env.NEXT_PUBLIC_MATCHES_STORAGE) === 'firestore';
  if (!useFirestore) {
    // Trending flag exists only in Firestore flow; return empty when using JSON
    return NextResponse.json([]);
  }
  try {
    const admin = initFirebaseAdmin();
    const dailyCol = admin.firestore().collection(
      process.env.DAILY_MATCHES_COLLECTION || process.env.NEXT_PUBLIC_DAILY_MATCHES_COLLECTION || 'daily_matches'
    );
    
    // Get today's matches and filter for trending
    const today = todayId();
    const todayDoc = await dailyCol.doc(today).get();
    
    if (todayDoc.exists) {
      const data = todayDoc.data();
      const matches = Array.isArray(data?.matches) ? data.matches : [];
      // Filter only matches with isTrending == true and approved == true
      const trending = matches.filter((m: any) => 
        m?.approved === true && (m?.isTrending === true || m?.trending === true)
      );
      return NextResponse.json(trending);
    }
    
    // If today doesn't exist, return empty array
    return NextResponse.json([]);
  } catch (_e: any) {
    return NextResponse.json({ error: 'Failed to read trending (firestore)' }, { status: 500 });
  }
}


