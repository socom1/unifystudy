import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence, Auth } from "firebase/auth";
import { getDatabase, Database } from "firebase/database";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getAnalytics, Analytics } from "firebase/analytics";

// ---------------------------------------------------------------------------
// Startup validation — fail loudly if any required env var is missing.
// This prevents Firebase from silently initialising with undefined values.
// ---------------------------------------------------------------------------
const REQUIRED_ENV_VARS: Record<string, string | undefined> = {
  VITE_FIREBASE_API_KEY:            import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_STORAGE_BUCKET:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  VITE_FIREBASE_MESSAGING_SENDER_ID:import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID:             import.meta.env.VITE_FIREBASE_APP_ID,
  VITE_FIREBASE_DATABASE_URL:       import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

const missing = Object.entries(REQUIRED_ENV_VARS)
  .filter(([, value]) => !value)
  .map(([key]) => `  • ${key}`);

if (missing.length > 0) {
  throw new Error(
    `[UnifyStudy] Missing required environment variables:\n${missing.join("\n")}\n` +
    "Copy .env.example to .env and fill in the values."
  );
}

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL,
  // Optional — analytics only; undefined is acceptable
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);

setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Auth persistence error:", error);
});

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export const db: Database = getDatabase(app);
export const storage: FirebaseStorage = getStorage(app);
export const analytics: Analytics = getAnalytics(app);

export default app;
