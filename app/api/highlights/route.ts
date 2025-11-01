import { initFirebaseAdmin } from '@/lib/firebase';
import { NextResponse } from 'next/server';

function todayId(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export async function GET() {
  try {
    const admin = initFirebaseAdmin();
    const highlightsCol = admin.firestore().collection('highlights');
    
    // Fetch all documents from highlights collection
    const snapshot = await highlightsCol.get();
    
    if (snapshot.empty) {
      console.log('ℹ️  No highlights found in Firestore');
      return NextResponse.json({ matches: [] });
    }
    
    // Combine all matches from all documents, filtering only approved ones
    const allMatches: any[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const matches = Array.isArray(data?.matches) ? data.matches : [];
      // Only include approved highlights (default to false if not set)
      const approvedMatches = matches.filter((m: any) => m.approved === true);
      allMatches.push(...approvedMatches);
    });
    
    console.log(`📖 Fetched ${allMatches.length} approved highlights from ${snapshot.size} document(s) in Firestore`);
    
    // Sort by date (newest first)
    const sortedMatches = allMatches.sort((a: any, b: any) => {
      try {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (!isNaN(dateA) && !isNaN(dateB)) {
          return dateB - dateA;
        }
        return (b.date || '').localeCompare(a.date || '');
      } catch {
        return 0;
      }
    });
    
    return NextResponse.json({ matches: sortedMatches });
  } catch (error) {
    console.error('Error fetching highlights from Firestore:', error);
    return NextResponse.json({ matches: [] }, { status: 500 });
  }
}
