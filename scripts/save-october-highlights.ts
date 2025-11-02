import { readFileSync } from 'fs';
import path from 'path';

// Initialize Firebase Admin with dynamic import for ESM compatibility
let admin: any;

async function initFirebase() {
  if (!admin) {
    const firebaseAdmin = await import('firebase-admin');
    admin = firebaseAdmin.default;
    
    if (!admin.apps || admin.apps.length === 0) {
      let cred: any;
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.NEXT_PUBLIC_FIREBASE_SERVICE_ACCOUNT_JSON;
      const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_FILE || process.env.GOOGLE_APPLICATION_CREDENTIALS;
      
      if (raw) {
        const parsed = JSON.parse(raw);
        cred = admin.credential.cert(parsed);
      } else if (filePath) {
        const fileData = readFileSync(filePath, 'utf8');
        const data = JSON.parse(fileData);
        cred = admin.credential.cert(data);
      } else {
        cred = admin.credential.applicationDefault();
      }
      
      admin.initializeApp({
        credential: cred,
        projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    }
  }
  return admin;
}

function todayId(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function yesterdayId(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1); // Go back one day
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Check if a date string is in October
 */
function isOctoberDate(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.getMonth() === 9; // October is month 9 (0-indexed)
    }
    
    const lowerDate = dateStr.toLowerCase();
    if (lowerDate.includes('october') || lowerDate.includes('oct')) {
      return true;
    }
    
    const parts = dateStr.split(/[-/\s]/);
    if (parts.length >= 2) {
      let monthStr = parts[1];
      if (parts[0].length === 4) {
        monthStr = parts[1];
      } else {
        monthStr = parts[1];
      }
      
      const month = parseInt(monthStr, 10);
      if (!isNaN(month) && month === 10) {
        return true;
      }
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Filter highlights that have valid videoSrc containing "cdn" AND are from October
 */
function filterValidHighlights(matches: any[]): any[] {
  return matches.filter((match: any) => {
    const videoSrc = match.videoSrc || '';
    const hasValidVideoSrc = videoSrc && typeof videoSrc === 'string' && videoSrc.toLowerCase().includes('cdn');
    const isOctober = isOctoberDate(match.date);
    return hasValidVideoSrc && isOctober;
  });
}

async function saveToFirestore(matches: any[]): Promise<void> {
  if (matches.length === 0) {
    return;
  }

  try {
    const admin = await initFirebase();
    const highlightsCol = admin.firestore().collection('highlights');
    const today = yesterdayId(); // Use yesterday's date instead of today

    // Prepare data for Firestore (remove undefined fields)
    const cleanedMatches = matches.map((match: any) => {
      const cleaned: any = {};
      Object.keys(match).forEach((key) => {
        if (match[key] !== undefined) {
          cleaned[key] = match[key];
        }
      });
      return cleaned;
    });


    await highlightsCol.doc(today).set({
      date: today,
      matches: cleanedMatches,
      count: cleanedMatches.length,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

  } catch (error: any) {
    throw error;
  }
}

async function main() {

  try {
    // Try enriched file first
    const enrichedPath = path.join(process.cwd(), 'data', 'scraped-highlights-enriched.json');
    let allMatches: any[] = [];
    
    try {
      const fileContent = readFileSync(enrichedPath, 'utf-8');
      allMatches = JSON.parse(fileContent);
    } catch (enrichedError) {
      // Fallback to basic file
      const basicPath = path.join(process.cwd(), 'data', 'scraped-highlights.json');
      try {
        const fileContent = readFileSync(basicPath, 'utf-8');
        allMatches = JSON.parse(fileContent);
      } catch (basicError) {
        process.exit(1);
      }
    }

    // Filter for October matches with CDN video sources
    const validHighlights = filterValidHighlights(allMatches);
    

    if (validHighlights.length === 0) {
      return;
    }

    // Save to Firestore
    await saveToFirestore(validHighlights);

  } catch (error) {
    process.exit(1);
  }
}

main();

