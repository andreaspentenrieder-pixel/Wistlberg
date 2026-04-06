import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { OperationType, FirestoreErrorInfo } from './types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  // Provide a more user-friendly message for common errors
  let userMessage = "Ein Datenbankfehler ist aufgetreten.";
  if (errInfo.error.includes("permission-denied")) {
    userMessage = "Zugriff verweigert. Bitte prüfen Sie Ihre Anmeldung.";
  } else if (errInfo.error.includes("offline")) {
    userMessage = "Keine Verbindung zum Server möglich.";
  }
  
  throw new Error(JSON.stringify({ ...errInfo, userMessage }));
}

// Connection test
async function testConnection() {
  try {
    // Try to fetch a non-existent doc just to test connectivity
    await getDocFromServer(doc(db, '_internal', 'connection-test'));
    console.log("Firebase connection successful");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("CRITICAL: Firebase is offline. Check configuration and authorized domains.");
    }
  }
}

testConnection();
