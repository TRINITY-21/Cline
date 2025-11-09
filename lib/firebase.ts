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
      let filePath = process.env.FIREBASE_SERVICE_ACCOUNT_FILE || process.env.GOOGLE_APPLICATION_CREDENTIALS;
      
      // If no file path specified, try to find common service account file names
      if (!filePath) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const fs = require('fs') as typeof import('fs');
        const path = require('path') as typeof import('path');
        const possibleFiles = [
          'muvi-cc77e-firebase-adminsdk-fbsvc-b9bf571e13.json',
          'firebase-service-account.json',
          'service-account.json',
          path.join(process.cwd(), 'muvi-cc77e-firebase-adminsdk-fbsvc-b9bf571e13.json'),
          path.join(process.cwd(), 'firebase-service-account.json'),
          path.join(process.cwd(), 'service-account.json'),
        ];
        
        for (const possibleFile of possibleFiles) {
          if (fs.existsSync(possibleFile)) {
            filePath = possibleFile;
            break;
          }
        }
      }
      
      if (raw) {
        try {
          let jsonString = raw.trim();
          
          // If it looks like it might be double-encoded (starts and ends with quotes), try parsing once
          if (jsonString.startsWith('"') && jsonString.endsWith('"') && jsonString.length > 2) {
            try {
              jsonString = JSON.parse(jsonString) as string;
            } catch {
              // Not double-encoded, continue with original
            }
          }
          
          const parsed = JSON.parse(jsonString) as Record<string, unknown>;
          cred = admin.credential.cert(parsed);
        } catch (parseError: unknown) {
          const errorMessage = parseError instanceof Error ? parseError.message : 'JSON parse error';
          const preview = raw.length > 100 ? raw.substring(0, 100) + '...' : raw;
          console.error('[Firebase] JSON parse error. Preview:', preview);
          console.error('[Firebase] Error details:', errorMessage);
          throw new Error(`Invalid FIREBASE_SERVICE_ACCOUNT_JSON: ${errorMessage}. Make sure your JSON is properly formatted. If using an environment variable, ensure newlines are escaped as \\n or use FIREBASE_SERVICE_ACCOUNT_FILE instead.`);
        }
      } else if (filePath) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const fs = require('fs') as typeof import('fs');
          const path = require('path') as typeof import('path');
          const resolvedPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
          const data = JSON.parse(fs.readFileSync(resolvedPath, 'utf8')) as Record<string, unknown>;
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


