import { initFirebaseAdmin } from '@/lib/firebase';
import { NextRequest, NextResponse } from 'next/server';

function auth(req: NextRequest): boolean {
  const token = req.headers.get('x-internal-token');
  const expected = process.env.NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN || process.env.INTERNAL_UPDATE_TOKEN;
  return token === expected;
}

function todayId(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// GET: Fetch highlights (optionally filtered by date)
export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const url = new URL(req.url);
  const requestedDate = url.searchParams.get('date'); // Format: YYYY-MM-DD
  
  const admin = initFirebaseAdmin();
  const highlightsCol = admin.firestore().collection('highlights');
  
  try {
    if (requestedDate) {
      // Get highlights for specific date
      const dateDoc = await highlightsCol.doc(requestedDate).get();
      if (dateDoc.exists) {
        const data = dateDoc.data();
        const highlights = Array.isArray(data?.matches) ? data.matches : [];
        // Add document date to each highlight for editing purposes
        // Also ensure approved field defaults to false if not present
        const highlightsWithDate = highlights.map((h: any) => ({
          ...h,
          _documentDate: requestedDate, // Internal field to track which document this belongs to
          approved: h.approved !== undefined ? h.approved : false,
        }));
        return NextResponse.json({ total: highlightsWithDate.length, rows: highlightsWithDate });
      }
      return NextResponse.json({ total: 0, rows: [] });
    }
    
    // If no date specified, get all highlights from all documents
    const snapshot = await highlightsCol.get();
    const allHighlights: any[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      const highlights = Array.isArray(data?.matches) ? data.matches : [];
      // Add document date (document ID) to each highlight
      // Also ensure approved field defaults to false if not present
      const highlightsWithDate = highlights.map((h: any) => ({
        ...h,
        _documentDate: doc.id, // Internal field to track which document this belongs to
        approved: h.approved !== undefined ? h.approved : false,
      }));
      allHighlights.push(...highlightsWithDate);
    });
    
    return NextResponse.json({ total: allHighlights.length, rows: allHighlights });
  } catch (error: any) {
    console.error('Error fetching highlights:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch highlights', 
      message: error?.message || String(error) 
    }, { status: 500 });
  }
}

// PATCH: Update a single highlight's videoSrc
export async function PATCH(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  try {
    const body = await req.json().catch(() => ({}));
    const { highlightId, videoSrc, date } = body;
    
    if (!highlightId || !videoSrc || !date) {
      return NextResponse.json({ 
        error: 'Missing required fields: highlightId, videoSrc, date' 
      }, { status: 400 });
    }
    
    const admin = initFirebaseAdmin();
    const highlightsCol = admin.firestore().collection('highlights');
    const dateDoc = await highlightsCol.doc(date).get();
    
    if (!dateDoc.exists) {
      return NextResponse.json({ error: `No highlights found for date: ${date}` }, { status: 404 });
    }
    
    const data = dateDoc.data();
    const matches = Array.isArray(data?.matches) ? data.matches : [];
    
    // Find and update the highlight
    const highlightIndex = matches.findIndex((m: any) => m.id === highlightId);
    if (highlightIndex === -1) {
      return NextResponse.json({ error: `Highlight not found: ${highlightId}` }, { status: 404 });
    }
    
    // Update the videoSrc
    matches[highlightIndex].videoSrc = videoSrc;
    
    // Save back to Firestore
    await highlightsCol.doc(date).set({
      ...data,
      matches,
      count: matches.length,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Video source updated successfully',
      highlight: matches[highlightIndex]
    });
  } catch (error: any) {
    console.error('Error updating highlight:', error);
    return NextResponse.json({ 
      error: 'Failed to update highlight', 
      message: error?.message || String(error) 
    }, { status: 500 });
  }
}

