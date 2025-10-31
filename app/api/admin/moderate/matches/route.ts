import { initFirebaseAdmin } from '@/lib/firebase';
import { translateMatches } from '@/lib/translate';
import { promises as fs } from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

export const revalidate = 0;

function auth(req: NextRequest): boolean {
  const token = req.headers.get('x-internal-token');
  const expected = process.env.NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN;
  return !!expected && token === expected;
}

function isDateMatch(match: any, targetDate: Date): boolean {
  if (!targetDate) return false;
  
  const targetDateOnly = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  
  // Primary check: Match by createdAt date (when the match was actually created/scheduled)
  // This is the most reliable indicator of which date the match belongs to
  if (match.createdAt) {
    const created = new Date(match.createdAt);
    if (!isNaN(created.getTime())) {
      const createdDate = new Date(created.getFullYear(), created.getMonth(), created.getDate());
      if (createdDate.getTime() === targetDateOnly.getTime()) {
        return true;
      }
    }
  }
  
  // Fallback: Check updatedAt if createdAt is not available
  if (match.updatedAt && !match.createdAt) {
    const updated = new Date(match.updatedAt);
    if (!isNaN(updated.getTime())) {
      const updatedDate = new Date(updated.getFullYear(), updated.getMonth(), updated.getDate());
      if (updatedDate.getTime() === targetDateOnly.getTime()) {
        return true;
      }
    }
  }
  
  // Also check startTime if it's an ISO date
  if (match.startTime) {
    const startDate = new Date(match.startTime);
    if (!isNaN(startDate.getTime())) {
      const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      if (startDateOnly.getTime() === targetDateOnly.getTime()) {
        return true;
      }
    }
  }
  
  return false;
}

function withAutoEndedStatus(rows: any[]): any[] {
  try {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return (rows || []).map((m: any) => {
      const tl: string = (m?.timeLabel || '').trim();
      const status: string = m?.status || '';
      if (!tl || status === 'ended') return m;
      const match = tl.match(/^(\d{1,2}):(\d{2})$/);
      if (!match) return m;
      const hh = Math.min(23, Math.max(0, parseInt(match[1], 10)));
      const mm = Math.min(59, Math.max(0, parseInt(match[2], 10)));
      const kickoffMinutes = hh * 60 + mm;
      const diffMinutes = nowMinutes - kickoffMinutes;
      if (diffMinutes >= 120) {
        return { ...m, status: 'ended' };
      }
      return m;
    });
  } catch {
    return rows;
  }
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  // Check if a specific date filter is requested
  const url = new URL(req.url);
  const requestedDate = url.searchParams.get('date'); // Format: YYYY-MM-DD
  
  const admin = initFirebaseAdmin();
  
  // If a date is requested, get matches from daily_matches collection
  if (requestedDate) {
    const dailyCol = admin.firestore().collection(process.env.DAILY_MATCHES_COLLECTION || process.env.NEXT_PUBLIC_DAILY_MATCHES_COLLECTION || 'daily_matches');
    const docRef = dailyCol.doc(requestedDate);
    const docSnap = await docRef.get();
    
    if (docSnap.exists) {
      const data = docSnap.data();
      const matches = Array.isArray(data?.matches) ? data.matches : [];
      const rows = withAutoEndedStatus(matches);
      return NextResponse.json({ total: rows.length, rows });
    } else {
      // No document found for that date
      return NextResponse.json({ total: 0, rows: [] });
    }
  }
  
  // If no date specified, get today's matches or fall back to all matches from main collection
  const now = new Date();
  const todayId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  const dailyCol = admin.firestore().collection(process.env.DAILY_MATCHES_COLLECTION || process.env.NEXT_PUBLIC_DAILY_MATCHES_COLLECTION || 'daily_matches');
  const docRef = dailyCol.doc(todayId);
  const docSnap = await docRef.get();
  
  if (docSnap.exists) {
    const data = docSnap.data();
    const matches = Array.isArray(data?.matches) ? data.matches : [];
    const rows = withAutoEndedStatus(matches);
    return NextResponse.json({ total: rows.length, rows });
  }
  
  // No fallback - return empty if daily_matches doesn't have today's data
  return NextResponse.json({ total: 0, rows: [] });
}

// POST: import matches either from body { items: [...] } or from data/unified_matches.json
export async function POST(req: NextRequest) {
  try {
    if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    let items: any[] | null = null;
    try {
      const body = await req.json().catch(() => null as any);
      if (body && Array.isArray(body.items)) items = body.items;
    } catch {}
    
    if (!items) {
      try {
        const file = path.join(process.cwd(), 'data', 'unified_matches.json');
        const raw = await fs.readFile(file, 'utf-8');
        items = JSON.parse(raw || '[]');
      } catch (err: any) {
        console.error('Failed to read unified_matches.json:', err);
        items = [];
      }
    }
    
    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'No items to import' }, { status: 400 });
    }
    
    // Translate matches from Turkish to English before saving
    console.log(`🌐 Translating ${items.length} match(es) from Turkish to English...`);
    const translatedItems = await translateMatches(items);
    console.log(`✓ Translation completed`);
    
    const admin = initFirebaseAdmin();
    const dailyCol = admin.firestore().collection(
      process.env.DAILY_MATCHES_COLLECTION || process.env.NEXT_PUBLIC_DAILY_MATCHES_COLLECTION || 'daily_matches'
    );
    
    const now = new Date().toISOString();
    // Use GMT+3 date for Firestore document ID when saving/updating
    const today = new Date();
    const gmtPlus3 = new Date(today.getTime() + 3 * 60 * 60 * 1000);
    const dateId = `${gmtPlus3.getFullYear()}-${String(gmtPlus3.getMonth() + 1).padStart(2, '0')}-${String(gmtPlus3.getDate()).padStart(2, '0')}`;
    
    // Get existing matches for today
    const dateRef = dailyCol.doc(dateId);
    const dateDoc = await dateRef.get();
    const existing = dateDoc.exists ? (dateDoc.data() || {}) : {};
    const existingMatches: any[] = Array.isArray(existing.matches) ? existing.matches : [];
    
    // Create map of existing matches
    const existingMap = new Map<string, any>();
    existingMatches.forEach(m => {
      if (m && m.id) existingMap.set(m.id, m);
    });
    
    // Add/update imported matches
    let count = 0;
    for (const m of translatedItems) {
      const id = String(m.id || '');
      if (!id) continue;
      
      const existingMatch = existingMap.get(id);
      if (existingMatch) {
        // Update existing match, preserve approved/trending flags
        const idx = existingMatches.findIndex((match: any) => match?.id === id);
        if (idx >= 0) {
          existingMatches[idx] = {
            ...m,
            approved: existingMatch.approved !== undefined ? existingMatch.approved : false,
            isTrending: existingMatch.isTrending !== undefined ? existingMatch.isTrending : false,
            updatedAt: now,
            createdAt: existingMatch.createdAt || now,
          };
        }
      } else {
        // New match
        existingMatches.push({
          ...m,
          approved: false,
          updatedAt: now,
          createdAt: now,
        });
      }
      count++;
    }
    
    if (count === 0) {
      return NextResponse.json({ error: 'No valid items to import (all items missing id)' }, { status: 400 });
    }
    
    // Save to daily_matches
    await dateRef.set({
      id: dateId,
      matches: existingMatches,
      updatedAt: now,
    }, { merge: true });
    
    return NextResponse.json({ ok: true, imported: count });
  } catch (err: any) {
    console.error('Error importing matches:', err);
    return NextResponse.json({ 
      error: 'Failed to import matches', 
      message: err?.message || String(err) 
    }, { status: 500 });
  }
}


