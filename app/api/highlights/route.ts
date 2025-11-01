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
    // Initialize Firebase Admin and verify it's working
    let admin;
    try {
      // Check if credentials are available
      const hasJsonCreds = !!(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.NEXT_PUBLIC_FIREBASE_SERVICE_ACCOUNT_JSON);
      const hasFileCreds = !!(process.env.FIREBASE_SERVICE_ACCOUNT_FILE || process.env.GOOGLE_APPLICATION_CREDENTIALS);
      
      if (!hasJsonCreds && !hasFileCreds) {
        console.error('❌ No Firebase credentials found in environment variables');
        console.error('   Checked: FIREBASE_SERVICE_ACCOUNT_JSON, NEXT_PUBLIC_FIREBASE_SERVICE_ACCOUNT_JSON, FIREBASE_SERVICE_ACCOUNT_FILE, GOOGLE_APPLICATION_CREDENTIALS');
        return NextResponse.json({ 
          matches: [], 
          error: 'Firebase credentials not configured. Please set FIREBASE_SERVICE_ACCOUNT_JSON environment variable.' 
        }, { status: 500 });
      }
      
      admin = initFirebaseAdmin();
      if (!admin || !admin.firestore) {
        console.error('❌ Firebase Admin not properly initialized');
        return NextResponse.json({ 
          matches: [], 
          error: 'Firebase initialization failed' 
        }, { status: 500 });
      }
      
      // Test Firestore connection
      try {
        const testCol = admin.firestore().collection('_diag');
        await testCol.limit(1).get();
        console.log('✅ Firebase Admin initialized and Firestore connection verified');
      } catch (testError: any) {
        console.error('❌ Firestore connection test failed:', testError?.message);
        return NextResponse.json({ 
          matches: [], 
          error: `Firestore connection failed: ${testError?.message}` 
        }, { status: 500 });
      }
    } catch (initError: any) {
      console.error('❌ Failed to initialize Firebase Admin:', initError?.message || String(initError));
      console.error('Error stack:', initError?.stack);
      return NextResponse.json({ 
        matches: [], 
        error: `Firebase init error: ${initError?.message || 'Unknown error'}` 
      }, { status: 500 });
    }

    const highlightsCol = admin.firestore().collection('highlights');
    console.log('📚 Querying highlights collection...');
    
    // Fetch ALL documents from highlights collection (no date filter - shows all dates)
    const snapshot = await highlightsCol.get();
    
    if (snapshot.empty) {
      console.log('ℹ️  No highlights documents found in Firestore (collection is empty)');
      return NextResponse.json({ matches: [] });
    }
    
    console.log(`📦 Found ${snapshot.size} document(s) in highlights collection`);
    
    // Combine all matches from ALL dates, filtering only approved ones
    // This returns highlights from any date in the collection (e.g., 2025-10-31, 2025-11-01, etc.)
    const allMatches: any[] = [];
    let totalMatchesBeforeFilter = 0;
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      const matches = Array.isArray(data?.matches) ? data.matches : [];
      totalMatchesBeforeFilter += matches.length;
      
      // Debug: Log each document's match count and sample approved status
      if (matches.length > 0) {
        const approvedCount = matches.filter((m: any) => m.approved === true).length;
        // Sample a few matches to check their approval status
        const sampleStatuses = matches.slice(0, 3).map((m: any) => ({ 
          id: m.id, 
          approved: m.approved, 
          approvedType: typeof m.approved 
        }));
        console.log(`  📄 Document ${doc.id}: ${matches.length} total matches, ${approvedCount} approved`, sampleStatuses);
      }
      
      // Only include approved highlights - check for strict true
      // Handle cases where approved might be string "true" or other truthy values
      const approvedMatches = matches.filter((m: any) => {
        const approved = m.approved;
        // Strict check: must be boolean true
        return approved === true;
      });
      allMatches.push(...approvedMatches);
    });
    
    console.log(`📖 Fetched ${allMatches.length} approved highlights from ${totalMatchesBeforeFilter} total matches across ${snapshot.size} document(s) in Firestore`);
    
    // Sort by date (newest first) - shows all highlights regardless of date, sorted by newest
    const sortedMatches = allMatches.sort((a: any, b: any) => {
      try {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (!isNaN(dateA) && !isNaN(dateB)) {
          return dateB - dateA; // Newest first
        }
        return (b.date || '').localeCompare(a.date || '');
      } catch {
        return 0;
      }
    });
    
    console.log(`✅ Returning ${sortedMatches.length} sorted highlights`);
    return NextResponse.json({ matches: sortedMatches });
  } catch (error: any) {
    console.error('❌ Error fetching highlights from Firestore:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });
    return NextResponse.json({ 
      matches: [], 
      error: error?.message || 'Unknown error',
      code: error?.code 
    }, { status: 500 });
  }
}
