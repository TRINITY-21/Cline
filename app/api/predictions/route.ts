import { initFirebaseAdmin } from '@/lib/firebase';
import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 0; // Always fetch fresh data from Firestore

// Helper functions
function parseDate(dateStr: string | Date): Date {
  if (dateStr instanceof Date) {
    return dateStr;
  }
  
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    
    // If YYYY-MM-DD format
    if (parts[0].length === 4) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    
    // If DD-MM-YYYY format
    if (parts[2] && parts[2].length === 4) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
  }
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return new Date();
  }
  return date;
}

function getDateId(dateStr: string | Date | undefined): string {
  try {
    if (!dateStr) {
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const yyyy = today.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    }
    
    const date = parseDate(dateStr);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  } catch {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }
}

function getWeekId(dateStr: string | Date | undefined): string {
  let date: Date;
  try {
    if (!dateStr) {
      date = new Date();
    } else {
      date = parseDate(dateStr);
    }
  } catch {
    date = new Date();
  }
  
  const dayOfWeek = date.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(date);
  monday.setDate(date.getDate() + mondayOffset);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const mondayDD = String(monday.getDate()).padStart(2, '0');
  const sundayDD = String(sunday.getDate()).padStart(2, '0');
  const mm = String(monday.getMonth() + 1).padStart(2, '0');
  const yyyy = monday.getFullYear();
  
  return `${mondayDD}-${sundayDD}-${mm}-${yyyy}`;
}

function getDayOfWeek(dateStr: string | Date | undefined): string {
  try {
    if (!dateStr) {
      const today = new Date();
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return days[today.getDay()];
    }
    
    const date = parseDate(dateStr);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  } catch {
    return 'Monday';
  }
}

function generatePredictionId(home: string, away: string, timeLabel: string): string {
  const h_norm = home.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const a_norm = away.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const time_norm = (timeLabel || '00:00').replace(':', '-');
  return `${h_norm}-vs-${a_norm}-${time_norm}`;
}

// Public route - no auth required for reading predictions
// Structure: over_predictions/{weekId}/{dayOfWeek}/{dateId} with predictions array
export async function GET(req: NextRequest) {
  try {
    const admin = initFirebaseAdmin();
    const url = new URL(req.url);
    
    // Optional date filter
    const requestedDate = url.searchParams.get('date');
    
    const allPredictions: any[] = [];
    const overPredictionsCol = admin.firestore().collection('over_predictions');
    
    if (requestedDate) {
      // Fetch predictions for a specific date
      const dateId = getDateId(requestedDate);
      const weekId = getWeekId(requestedDate);
      const dayOfWeek = getDayOfWeek(requestedDate);
      
      const weekDoc = overPredictionsCol.doc(weekId);
      const dayCol = weekDoc.collection(dayOfWeek);
      const dateDoc = dayCol.doc(dateId);
      const dateDocSnap = await dateDoc.get();
      
      if (dateDocSnap.exists) {
        const data = dateDocSnap.data();
        const predictions = Array.isArray(data?.predictions) ? data.predictions : [];
        
        predictions.forEach((pred: any) => {
          // Only include approved predictions (or all if approved field doesn't exist for backward compatibility)
          if (pred.approved !== false) {
            allPredictions.push({
              ...pred,
              id: pred.id || generatePredictionId(pred.home || '', pred.away || '', pred.timeLabel || ''),
              matchDate: dateId,
            });
          }
        });
      }
      
      // Sort by timeLabel
      allPredictions.sort((a, b) => (a.timeLabel || '').localeCompare(b.timeLabel || ''));
    } else {
      // Fetch predictions for the current week (Monday to Sunday)
      // This ensures we show all week's predictions even if today has no predictions
      const today = new Date();
      const currentWeekId = getWeekId(today);
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      const weekDoc = overPredictionsCol.doc(currentWeekId);
      
      for (const day of daysOfWeek) {
        const dayCol = weekDoc.collection(day);
        const datesSnapshot = await dayCol.get();
        
        for (const dateDoc of datesSnapshot.docs) {
          const dateId = dateDoc.id;
          const data = dateDoc.data();
          const predictions = Array.isArray(data?.predictions) ? data.predictions : [];
          
          predictions.forEach((pred: any) => {
            // Only include approved predictions (or all if approved field doesn't exist for backward compatibility)
            if (pred.approved !== false) {
              allPredictions.push({
                ...pred,
                id: pred.id || generatePredictionId(pred.home || '', pred.away || '', pred.timeLabel || ''),
                matchDate: dateId,
              });
            }
          });
        }
      }
      
      // Sort by matchDate (desc) then timeLabel (asc)
      allPredictions.sort((a, b) => {
        const dateCompare = (b.matchDate || '').localeCompare(a.matchDate || '');
        if (dateCompare !== 0) return dateCompare;
        return (a.timeLabel || '').localeCompare(b.timeLabel || '');
      });
    }
    
    return NextResponse.json(allPredictions);
    
  } catch (err: any) {
    return NextResponse.json({ 
      error: 'Failed to fetch predictions', 
      details: err?.message || String(err) 
    }, { status: 500 });
  }
}

