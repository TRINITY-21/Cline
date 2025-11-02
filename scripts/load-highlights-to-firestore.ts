import { readFileSync } from 'fs';
import * as path from 'path';

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
        try {
          cred = JSON.parse(raw);
        } catch {
          process.exit(1);
        }
      } else if (filePath) {
        try {
          const fileContent = readFileSync(filePath, 'utf-8');
          cred = JSON.parse(fileContent);
        } catch (error: any) {
          process.exit(1);
        }
      } else {
        // Try default location
        const defaultPath = path.join(process.cwd(), 'muvi-cc77e-firebase-adminsdk-fbsvc-b9bf571e13.json');
        try {
          const fileContent = readFileSync(defaultPath, 'utf-8');
          cred = JSON.parse(fileContent);
        } catch (error: any) {
          process.exit(1);
        }
      }

      admin.initializeApp({
        credential: admin.credential.cert(cred),
      });
    }
  }
  return admin;
}

async function main() {
  const documentId = '2025-10-31'; // YYYY-MM-DD format for Firestore
  const jsonFilePath = path.join(process.cwd(), 'data', 'scraped-highlights-enriched.json');


  try {
    // Read JSON file
    const jsonContent = readFileSync(jsonFilePath, 'utf-8');
    const highlights = JSON.parse(jsonContent);

    if (!Array.isArray(highlights)) {
      process.exit(1);
    }


    // Filter only highlights with CDN video sources (optional, but consistent with scraper)
    const validHighlights = highlights.filter((h: any) => 
      h.videoSrc && typeof h.videoSrc === 'string' && h.videoSrc.toLowerCase().includes('cdn')
    );


    if (validHighlights.length === 0) {
    }

    // Use valid highlights if available, otherwise use all
    const highlightsToSave = validHighlights.length > 0 ? validHighlights : highlights;

    // Initialize Firebase
    const admin = await initFirebase();
    const highlightsCol = admin.firestore().collection('highlights');

    // Prepare data for Firestore (remove undefined fields)
    const cleanedHighlights = highlightsToSave.map((match: any) => {
      const cleaned: any = {};
      Object.keys(match).forEach((key) => {
        if (match[key] !== undefined) {
          cleaned[key] = match[key];
        }
      });
      // Ensure approved field defaults to false
      if (cleaned.approved === undefined) {
        cleaned.approved = false;
      }
      return cleaned;
    });


    const now = new Date().toISOString();

    // Save to Firestore
    await highlightsCol.doc(documentId).set({
      date: documentId,
      matches: cleanedHighlights,
      count: cleanedHighlights.length,
      updatedAt: now,
      createdAt: now,
      source: 'scraped-highlights-enriched.json',
    }, { merge: true }); // Use merge to update, not overwrite


  } catch (error: any) {
    process.exit(1);
  }
}

main();

