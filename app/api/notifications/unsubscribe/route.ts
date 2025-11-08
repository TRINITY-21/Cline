import { initFirebaseAdmin } from '@/lib/firebase';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, matchId } = body;

    if (!token || !matchId) {
      return NextResponse.json(
        { error: 'Missing required fields: token, matchId' },
        { status: 400 }
      );
    }

    const admin = initFirebaseAdmin();
    const db = admin.firestore();

    // Remove subscription from Firestore
    const subscriptionRef = db.collection('match_reminders').doc(matchId);
    const doc = await subscriptionRef.get();

    if (doc.exists) {
      await subscriptionRef.update({
        tokens: admin.firestore.FieldValue.arrayRemove(token),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({ success: true, message: 'Unsubscribed from match reminder' });
  } catch (error: unknown) {
    console.error('Error unsubscribing from match reminder:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to unsubscribe', details: errorMessage },
      { status: 500 }
    );
  }
}

