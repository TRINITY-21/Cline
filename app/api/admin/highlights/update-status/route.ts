import { initFirebaseAdmin } from '@/lib/firebase';
import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 0;

function auth(req: NextRequest): boolean {
  const token = req.headers.get('x-internal-token');
  const expected = process.env.NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN || process.env.INTERNAL_UPDATE_TOKEN;
  return !!expected && token === expected;
}

// PATCH: Update approve status for highlights in highlights collection
export async function PATCH(req: NextRequest) {
  try {
    if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const body = await req.json().catch(() => ({}));
    const { highlightIds, approved, date } = body;
    
    if (!Array.isArray(highlightIds) || highlightIds.length === 0) {
      return NextResponse.json({ error: 'highlightIds must be a non-empty array' }, { status: 400 });
    }

    if (approved === undefined) {
      return NextResponse.json({ error: 'Must provide approved boolean' }, { status: 400 });
    }

    if (!date) {
      return NextResponse.json({ error: 'Must provide date (YYYY-MM-DD format)' }, { status: 400 });
    }

    const admin = initFirebaseAdmin();
    const highlightsCol = admin.firestore().collection('highlights');
    const dateDoc = await highlightsCol.doc(date).get();
    
    if (!dateDoc.exists) {
      return NextResponse.json({ error: `No highlights found for date: ${date}` }, { status: 404 });
    }
    
    const data = dateDoc.data();
    const matches = Array.isArray(data?.matches) ? data.matches : [];
    
    let updated = 0;
    const now = new Date().toISOString();
    
    // Update highlights
    for (let i = 0; i < matches.length; i++) {
      if (highlightIds.includes(matches[i]?.id)) {
        matches[i].approved = approved;
        matches[i].updatedAt = now;
        updated++;
      }
    }

    // Save back to Firestore
    await highlightsCol.doc(date).set({
      ...data,
      matches,
      count: matches.length,
      updatedAt: now,
    }, { merge: true });
    
    return NextResponse.json({ ok: true, updated });
  } catch (err: any) {
    return NextResponse.json({ 
      error: 'Failed to update highlight status', 
      message: err?.message || String(err) 
    }, { status: 500 });
  }
}

