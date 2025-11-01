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
        try {
          const parsed = JSON.parse(raw);
          cred = admin.credential.cert(parsed);
        } catch (parseError: any) {
          console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', parseError?.message);
          throw new Error(`Invalid FIREBASE_SERVICE_ACCOUNT_JSON: ${parseError?.message || 'JSON parse error'}`);
        }
      } else if (filePath) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const fs = require('fs');
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          cred = admin.credential.cert(data);
        } catch (fileError: any) {
          console.error(`❌ Failed to read Firebase credentials from ${filePath}:`, fileError?.message);
          throw new Error(`Cannot read Firebase credentials file: ${fileError?.message || 'File read error'}`);
        }
      } else {
        cred = admin.credential.applicationDefault();
      }
      
      try {
        admin.initializeApp({
          credential: cred,
          projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
      } catch (initError: any) {
        console.error('❌ Failed to initialize Firebase Admin app:', initError?.message);
        throw new Error(`Firebase initialization failed: ${initError?.message || 'Unknown error'}`);
      }
    }
    initialized = true;
  }
  return admin as typeof import('firebase-admin');
}


