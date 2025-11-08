// Server-only Firebase Admin initialization helper
// Loads credentials from FIREBASE_SERVICE_ACCOUNT_JSON (preferred),
// FIREBASE_SERVICE_ACCOUNT_FILE/GOOGLE_APPLICATION_CREDENTIALS (file path), or ADC.

let initialized = false;

export function initFirebaseAdmin(): typeof import('firebase-admin') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const admin = require('firebase-admin') as typeof import('firebase-admin');
  
  if (!initialized) {
    if (!admin.apps || admin.apps.length === 0) {
      let cred: ReturnType<typeof admin.credential.cert> | ReturnType<typeof admin.credential.applicationDefault>;
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.NEXT_PUBLIC_FIREBASE_SERVICE_ACCOUNT_JSON;
      const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_FILE || process.env.GOOGLE_APPLICATION_CREDENTIALS;
      
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Record<string, unknown>;
          cred = admin.credential.cert(parsed);
        } catch (parseError: unknown) {
          const errorMessage = parseError instanceof Error ? parseError.message : 'JSON parse error';
          throw new Error(`Invalid FIREBASE_SERVICE_ACCOUNT_JSON: ${errorMessage}`);
        }
      } else if (filePath) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const fs = require('fs') as typeof import('fs');
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>;
          cred = admin.credential.cert(data);
        } catch (fileError: unknown) {
          const errorMessage = fileError instanceof Error ? fileError.message : 'File read error';
          throw new Error(`Cannot read Firebase credentials file: ${errorMessage}`);
        }
      } else {
        cred = admin.credential.applicationDefault();
      }
      
      try {
        admin.initializeApp({
          credential: cred,
          projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
      } catch (initError: unknown) {
        const errorMessage = initError instanceof Error ? initError.message : 'Unknown error';
        throw new Error(`Firebase initialization failed: ${errorMessage}`);
      }
    }
    initialized = true;
  }
  return admin;
}


