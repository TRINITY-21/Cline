import { initFirebaseAdmin } from '@/lib/firebase';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, matchId, matchTime } = body;

    if (!token || !matchId || !matchTime) {
      return NextResponse.json(
        { error: 'Missing required fields: token, matchId, matchTime' },
        { status: 400 }
      );
    }

    const admin = initFirebaseAdmin();
    const db = admin.firestore();

    // Save subscription to Firestore
    const subscriptionRef = db.collection('match_reminders').doc(matchId);
    
    await subscriptionRef.set({
      matchId,
      matchTime,
      tokens: admin.firestore.FieldValue.arrayUnion(token),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return NextResponse.json({ success: true, message: 'Subscribed to match reminder' });
  } catch (error: unknown) {
    console.error('Error subscribing to match reminder:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to subscribe', details: errorMessage },
      { status: 500 }
    );
  }
}

