// Server-only Firebase Admin initialization helper
// Loads credentials from FIREBASE_SERVICE_ACCOUNT_JSON (preferred),
// FIREBASE_SERVICE_ACCOUNT_FILE/GOOGLE_APPLICATION_CREDENTIALS (file path), or ADC.

let initialized = false as boolean;

export function initFirebaseAdmin() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const admin = require('firebase-admin');
  if (!initialized) {
    if (!admin.apps || admin.apps.length === 0) {
      let cred: any;
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.NEXT_PUBLIC_FIREBASE_SERVICE_ACCOUNT_JSON;
      const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_FILE || process.env.GOOGLE_APPLICATION_CREDENTIALS;
      if (raw) {
        const parsed = JSON.parse(raw);
        cred = admin.credential.cert(parsed);
      } else if (filePath) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const fs = require('fs');
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        cred = admin.credential.cert(data);
      } else {
        cred = admin.credential.applicationDefault();
      }
      admin.initializeApp({
        credential: cred,
        projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    }
    initialized = true;
  }
  return admin as typeof import('firebase-admin');
}


