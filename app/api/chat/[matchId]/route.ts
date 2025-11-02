import { initFirebaseAdmin } from '@/lib/firebase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { matchId: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const matchId = params.matchId;

    if (!matchId) {
      return NextResponse.json({ error: 'Match ID required' }, { status: 400 });
    }

    const admin = initFirebaseAdmin();
    const db = admin.firestore();

    // Get messages for this match, ordered by timestamp descending, limited
    const messagesRef = db
      .collection('match_chats')
      .doc(matchId)
      .collection('messages')
      .orderBy('timestamp', 'desc')
      .limit(limit);

    const snapshot = await messagesRef.get();
    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Reverse to show oldest first
    messages.reverse();

    return NextResponse.json({ messages });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { matchId: string } }
) {
  try {
    const matchId = params.matchId;
    const body = await req.json();
    const { text, author } = body;

    if (!matchId) {
      return NextResponse.json({ error: 'Match ID required' }, { status: 400 });
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Message text required' }, { status: 400 });
    }

    if (text.length > 500) {
      return NextResponse.json(
        { error: 'Message too long (max 500 characters)' },
        { status: 400 }
      );
    }

    if (!author || typeof author !== 'string' || author.trim().length === 0) {
      return NextResponse.json({ error: 'Author name required' }, { status: 400 });
    }

    const admin = initFirebaseAdmin();
    const db = admin.firestore();

    // Create message document
    const messageRef = db
      .collection('match_chats')
      .doc(matchId)
      .collection('messages')
      .doc();

    const timestamp = Date.now();
    const messageData = {
      matchId,
      text: text.trim(),
      author: author.trim().substring(0, 20), // Limit author name length
      timestamp,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await messageRef.set(messageData);

    // Also update the match chat document's lastActivity timestamp
    await db.collection('match_chats').doc(matchId).set(
      {
        matchId,
        lastActivity: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      message: {
        id: messageRef.id,
        ...messageData,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}

